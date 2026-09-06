// scratch/test_api_sqlite.js
const { DatabaseSync } = require('node:sqlite');
const fs = require('node:fs');
const path = require('node:path');

const DB_DIR = 'd:/Github/Firebase_Database_Administrator/databases';
const RAW_DB_PATH = path.join(DB_DIR, 'meteo_local_cache.db');
const CLEAN_DB_PATH = path.join(DB_DIR, 'meteo_clean_data.db');
const ERA5_DB_PATH = path.join(DB_DIR, 'era5_data.db');
const SNAPSHOTS_DIR = path.join(DB_DIR, 'backups', 'snapshots');
const TABLE_HISTORY_DIR = path.join(DB_DIR, 'backups', 'table_history');

function getDbStats() {
  const result = {};

  // 1. Raw DB
  if (fs.existsSync(RAW_DB_PATH)) {
    const rawStat = fs.statSync(RAW_DB_PATH);
    const db = new DatabaseSync(RAW_DB_PATH, { readOnly: true });
    const rowCount = db.prepare('SELECT count(*) as total, min(unix_ts) as min_ts, max(unix_ts) as max_ts FROM aws_measurements').get();
    const stations = db.prepare(`
      SELECT 
        station_id, 
        count(*) as count, 
        min(unix_ts) as min_ts, 
        max(unix_ts) as max_ts,
        min(local_time) as min_local,
        max(local_time) as max_local
      FROM aws_measurements 
      GROUP BY station_id 
      ORDER BY station_id
    `).all();
    const pragmaCheck = db.prepare('PRAGMA quick_check(1)').get();
    db.close();

    result.raw = {
      path: RAW_DB_PATH,
      sizeBytes: rawStat.size,
      sizeMB: (rawStat.size / (1024 * 1024)).toFixed(1),
      totalRows: rowCount.total,
      minTs: rowCount.min_ts,
      maxTs: rowCount.max_ts,
      integrity: pragmaCheck.quick_check,
      stations
    };
  }

  // 2. Clean DB
  if (fs.existsSync(CLEAN_DB_PATH)) {
    const cleanStat = fs.statSync(CLEAN_DB_PATH);
    const db = new DatabaseSync(CLEAN_DB_PATH, { readOnly: true });
    const rowCount = db.prepare('SELECT count(*) as total, min(unix_ts) as min_ts, max(unix_ts) as max_ts FROM aws_clean_measurements').get();
    const statusCounts = db.prepare(`
      SELECT status, count(*) as count 
      FROM aws_clean_measurements 
      GROUP BY status
    `).all();
    const stations = db.prepare(`
      SELECT 
        station_id, 
        count(*) as count, 
        sum(case when status = 'OK' then 1 else 0 end) as count_ok,
        sum(case when status = 'IMPUTED' then 1 else 0 end) as count_imputed,
        sum(case when status = 'EDITED' then 1 else 0 end) as count_edited,
        min(unix_ts) as min_ts, 
        max(unix_ts) as max_ts,
        min(local_time) as min_local,
        max(local_time) as max_local
      FROM aws_clean_measurements 
      GROUP BY station_id 
      ORDER BY station_id
    `).all();
    const pragmaCheck = db.prepare('PRAGMA quick_check(1)').get();
    db.close();

    result.clean = {
      path: CLEAN_DB_PATH,
      sizeBytes: cleanStat.size,
      sizeMB: (cleanStat.size / (1024 * 1024)).toFixed(1),
      totalRows: rowCount.total,
      minTs: rowCount.min_ts,
      maxTs: rowCount.max_ts,
      statusCounts,
      integrity: pragmaCheck.quick_check,
      stations
    };
  }

  // 3. ERA5 DB
  if (fs.existsSync(ERA5_DB_PATH)) {
    const era5Stat = fs.statSync(ERA5_DB_PATH);
    const db = new DatabaseSync(ERA5_DB_PATH, { readOnly: true });
    const rowCount = db.prepare('SELECT count(*) as total, min(unixtime) as min_ts, max(unixtime) as max_ts FROM era5_hourly').get();
    const pragmaCheck = db.prepare('PRAGMA quick_check(1)').get();
    db.close();

    result.era5 = {
      path: ERA5_DB_PATH,
      sizeBytes: era5Stat.size,
      sizeMB: (era5Stat.size / (1024 * 1024)).toFixed(1),
      totalRows: rowCount.total,
      minTs: rowCount.min_ts,
      maxTs: rowCount.max_ts,
      integrity: pragmaCheck.quick_check
    };
  }

  // 4. Snapshots & Table history
  result.snapshots = [];
  if (fs.existsSync(SNAPSHOTS_DIR)) {
    const items = fs.readdirSync(SNAPSHOTS_DIR);
    for (const item of items) {
      const metaPath = path.join(SNAPSHOTS_DIR, item, 'metadata.json');
      if (fs.existsSync(metaPath)) {
        try {
          const meta = JSON.parse(fs.readFileSync(metaPath, 'utf8'));
          result.snapshots.push(meta);
        } catch (e) {}
      }
    }
  }

  result.tableHistoryCount = 0;
  if (fs.existsSync(TABLE_HISTORY_DIR)) {
    const files = fs.readdirSync(TABLE_HISTORY_DIR).filter(f => f.endsWith('.json'));
    result.tableHistoryCount = files.length;
    result.tableHistorySample = files.slice(0, 10);
  }

  return result;
}

console.log(JSON.stringify(getDbStats(), null, 2));
