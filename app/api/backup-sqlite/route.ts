// app/api/backup-sqlite/route.ts
import { NextResponse } from "next/server";
import { DatabaseSync } from "node:sqlite";
import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";

const DB_DIR = "d:/Github/Firebase_Database_Administrator/databases";
const RAW_DB_PATH = path.join(DB_DIR, "meteo_local_cache.db");
const CLEAN_DB_PATH = path.join(DB_DIR, "meteo_clean_data.db");
const ERA5_DB_PATH = path.join(DB_DIR, "era5_data.db");
const SNAPSHOTS_DIR = path.join(DB_DIR, "backups", "snapshots");
const TABLE_HISTORY_DIR = path.join(DB_DIR, "backups", "table_history");
const VALID_STATIONS = ["id-01", "id-02", "id-03", "id-04", "id-05", "id-11"];

async function getFirebaseOAuthToken(): Promise<string> {
  const clientEmail = process.env.NEXT_PUBLIC_FIREBASE_CLIENT_EMAIL;
  let privateKey = process.env.NEXT_PUBLIC_FIREBASE_PRIVATE_KEY;
  if (!clientEmail || !privateKey) {
    throw new Error("Kredensial Firebase Service Account tidak ditemukan di environment (.env.local)");
  }
  privateKey = privateKey.replace(/\\"/g, "").replace(/\\n/g, "\n").replace(/"/g, "").trim();

  const now = Math.floor(Date.now() / 1000);
  const header = { alg: "RS256", typ: "JWT" };
  const payload = {
    iss: clientEmail,
    sub: clientEmail,
    aud: "https://oauth2.googleapis.com/token",
    iat: now,
    exp: now + 3600,
    scope: "https://www.googleapis.com/auth/userinfo.email https://www.googleapis.com/auth/firebase.database"
  };

  const encode = (obj: any) => Buffer.from(JSON.stringify(obj)).toString("base64url");
  const unsignedToken = `${encode(header)}.${encode(payload)}`;

  const signer = crypto.createSign("RSA-SHA256");
  signer.update(unsignedToken);
  const signature = signer.sign(privateKey, "base64url");
  const jwt = `${unsignedToken}.${signature}`;

  const res = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer",
      assertion: jwt
    })
  });

  const data = await res.json();
  if (!res.ok) throw new Error(`Gagal otentikasi Google Cloud: ${JSON.stringify(data)}`);
  return data.access_token;
}

function createBackupSnapshot(note: string = "Snapshot Manual Web Dashboard") {
  if (!fs.existsSync(SNAPSHOTS_DIR)) {
    fs.mkdirSync(SNAPSHOTS_DIR, { recursive: true });
  }

  const now = new Date();
  const pad = (n: number) => String(n).padStart(2, "0");
  const tsStr = `${now.getFullYear()}${pad(now.getMonth() + 1)}${pad(now.getDate())}_${pad(now.getHours())}${pad(now.getMinutes())}${pad(now.getSeconds())}_${String(now.getMilliseconds()).padStart(3, "0")}`;
  const snapName = `snapshot_${tsStr}`;
  const snapDir = path.join(SNAPSHOTS_DIR, snapName);
  fs.mkdirSync(snapDir, { recursive: true });

  const filesMeta: any = {};
  let totalBytes = 0;

  if (fs.existsSync(RAW_DB_PATH)) {
    const dest = path.join(snapDir, "meteo_local_cache.db");
    fs.copyFileSync(RAW_DB_PATH, dest);
    const sz = fs.statSync(dest).size;
    totalBytes += sz;
    filesMeta.raw = {
      filename: "meteo_local_cache.db",
      size_bytes: sz,
      size_mb: Number((sz / (1024 * 1024)).toFixed(2))
    };
  }

  if (fs.existsSync(CLEAN_DB_PATH)) {
    const dest = path.join(snapDir, "meteo_clean_data.db");
    fs.copyFileSync(CLEAN_DB_PATH, dest);
    const sz = fs.statSync(dest).size;
    totalBytes += sz;
    filesMeta.clean = {
      filename: "meteo_clean_data.db",
      size_bytes: sz,
      size_mb: Number((sz / (1024 * 1024)).toFixed(2))
    };
  }

  const metadata = {
    snapshot_name: snapName,
    created_at: now.toISOString().replace("T", " ").substring(0, 19),
    timestamp: tsStr,
    note,
    total_size_bytes: totalBytes,
    total_size_mb: Number((totalBytes / (1024 * 1024)).toFixed(2)),
    files: filesMeta
  };

  fs.writeFileSync(path.join(snapDir, "metadata.json"), JSON.stringify(metadata, null, 2), "utf8");
  return metadata;
}

export const dynamic = "force-dynamic";

function formatWibDate(unixTs: number | null): string {
  if (!unixTs) return "-";
  try {
    const d = new Date((unixTs + 7 * 3600) * 1000);
    return d.toISOString().replace("T", " ").replace(/\.\d+Z$/, "");
  } catch {
    return "-";
  }
}

function getSummaryData() {
  const result: any = {
    databasesDir: DB_DIR,
    raw: null,
    clean: null,
    era5: null,
    snapshots: [],
    tableHistory: {
      count: 0,
      files: []
    }
  };

  // 1. Raw DB
  if (fs.existsSync(RAW_DB_PATH)) {
    try {
      const rawStat = fs.statSync(RAW_DB_PATH);
      const db = new DatabaseSync(RAW_DB_PATH, { readOnly: true });
      const rowCount = db.prepare("SELECT count(*) as total, min(unix_ts) as min_ts, max(unix_ts) as max_ts FROM aws_measurements").get() as any;
      const stations = db.prepare(`
        SELECT 
          station_id, 
          count(*) as count, 
          min(unix_ts) as min_ts, 
          max(unix_ts) as max_ts
        FROM aws_measurements 
        GROUP BY station_id 
        ORDER BY station_id
      `).all() as any[];
      const pragmaCheck = db.prepare("PRAGMA quick_check(1)").get() as any;
      db.close();

      const enrichedStations = stations.map(s => {
        const days = s.min_ts && s.max_ts ? Math.max(1, Math.round((s.max_ts - s.min_ts) / 86400)) : 1;
        const avgPerDay = Math.round(s.count / days);
        const integrityPct = Math.min(100, Number(((avgPerDay / 1440) * 100).toFixed(1)));
        return {
          station_id: s.station_id,
          count: s.count,
          min_ts: s.min_ts,
          max_ts: s.max_ts,
          min_date_wib: formatWibDate(s.min_ts),
          max_date_wib: formatWibDate(s.max_ts),
          days,
          avgPerDay,
          integrityPct,
          status: integrityPct >= 90 ? "Sangat Lengkap" : integrityPct >= 60 ? "Cukup" : "Parsial"
        };
      });

      result.raw = {
        name: "meteo_local_cache.db",
        path: RAW_DB_PATH,
        sizeBytes: rawStat.size,
        sizeMB: Number((rawStat.size / (1024 * 1024)).toFixed(1)),
        totalRows: rowCount?.total || 0,
        minTs: rowCount?.min_ts,
        maxTs: rowCount?.max_ts,
        minDateWib: formatWibDate(rowCount?.min_ts),
        maxDateWib: formatWibDate(rowCount?.max_ts),
        integrity: pragmaCheck?.quick_check || "ok",
        stations: enrichedStations
      };
    } catch (e: any) {
      result.raw = { error: e.message };
    }
  }

  // 2. Clean DB
  if (fs.existsSync(CLEAN_DB_PATH)) {
    try {
      const cleanStat = fs.statSync(CLEAN_DB_PATH);
      const db = new DatabaseSync(CLEAN_DB_PATH, { readOnly: true });
      const rowCount = db.prepare("SELECT count(*) as total, min(unix_ts) as min_ts, max(unix_ts) as max_ts FROM aws_clean_measurements").get() as any;
      const statusCounts = db.prepare(`
        SELECT status, count(*) as count 
        FROM aws_clean_measurements 
        GROUP BY status
      `).all() as any[];
      const stations = db.prepare(`
        SELECT 
          station_id, 
          count(*) as count, 
          sum(case when status = 'OK' then 1 else 0 end) as count_ok,
          sum(case when status LIKE '%IMPUTED%' then 1 else 0 end) as count_imputed,
          sum(case when status LIKE '%EDITED%' then 1 else 0 end) as count_edited,
          min(unix_ts) as min_ts, 
          max(unix_ts) as max_ts
        FROM aws_clean_measurements 
        GROUP BY station_id 
        ORDER BY station_id
      `).all() as any[];
      const pragmaCheck = db.prepare("PRAGMA quick_check(1)").get() as any;
      db.close();

      const enrichedStations = stations.map(s => {
        const imputed = s.count_imputed || 0;
        const imputedPct = s.count > 0 ? Number(((imputed / s.count) * 100).toFixed(1)) : 0;
        return {
          station_id: s.station_id,
          count: s.count,
          count_ok: s.count_ok || 0,
          count_imputed: imputed,
          count_edited: s.count_edited || 0,
          imputedPct,
          min_ts: s.min_ts,
          max_ts: s.max_ts,
          min_date_wib: formatWibDate(s.min_ts),
          max_date_wib: formatWibDate(s.max_ts),
          qcStatus: imputedPct < 5 ? "Tinggi (High Quality)" : imputedPct < 15 ? "Baik (Imputed Terkontrol)" : "Imputasi Intensif"
        };
      });

      result.clean = {
        name: "meteo_clean_data.db",
        path: CLEAN_DB_PATH,
        sizeBytes: cleanStat.size,
        sizeMB: Number((cleanStat.size / (1024 * 1024)).toFixed(1)),
        totalRows: rowCount?.total || 0,
        minTs: rowCount?.min_ts,
        maxTs: rowCount?.max_ts,
        minDateWib: formatWibDate(rowCount?.min_ts),
        maxDateWib: formatWibDate(rowCount?.max_ts),
        statusCounts,
        integrity: pragmaCheck?.quick_check || "ok",
        stations: enrichedStations
      };
    } catch (e: any) {
      result.clean = { error: e.message };
    }
  }

  // 3. ERA5 DB
  if (fs.existsSync(ERA5_DB_PATH)) {
    try {
      const era5Stat = fs.statSync(ERA5_DB_PATH);
      const db = new DatabaseSync(ERA5_DB_PATH, { readOnly: true });
      const rowCount = db.prepare("SELECT count(*) as total, min(unixtime) as min_ts, max(unixtime) as max_ts FROM era5_hourly").get() as any;
      const pragmaCheck = db.prepare("PRAGMA quick_check(1)").get() as any;
      db.close();

      result.era5 = {
        name: "era5_data.db",
        path: ERA5_DB_PATH,
        sizeBytes: era5Stat.size,
        sizeMB: Number((era5Stat.size / (1024 * 1024)).toFixed(1)),
        totalRows: rowCount?.total || 0,
        minTs: rowCount?.min_ts,
        maxTs: rowCount?.max_ts,
        minDateWib: formatWibDate(rowCount?.min_ts),
        maxDateWib: formatWibDate(rowCount?.max_ts),
        integrity: pragmaCheck?.quick_check || "ok",
        parametersCount: 32
      };
    } catch (e: any) {
      result.era5 = { error: e.message };
    }
  }

  // 4. Snapshots
  if (fs.existsSync(SNAPSHOTS_DIR)) {
    try {
      const items = fs.readdirSync(SNAPSHOTS_DIR);
      for (const item of items) {
        const metaPath = path.join(SNAPSHOTS_DIR, item, "metadata.json");
        if (fs.existsSync(metaPath)) {
          try {
            const meta = JSON.parse(fs.readFileSync(metaPath, "utf8"));
            result.snapshots.push(meta);
          } catch {}
        }
      }
    } catch {}
  }

  // 5. Table History
  if (fs.existsSync(TABLE_HISTORY_DIR)) {
    try {
      const files = fs.readdirSync(TABLE_HISTORY_DIR).filter(f => f.endsWith(".json"));
      result.tableHistory.count = files.length;
      result.tableHistory.files = files.slice(0, 30).map(f => {
        const filePath = path.join(TABLE_HISTORY_DIR, f);
        const stat = fs.statSync(filePath);
        return {
          filename: f,
          sizeBytes: stat.size,
          updatedAt: stat.mtime.toISOString().replace("T", " ").substring(0, 19)
        };
      });
    } catch {}
  }

  return result;
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const action = searchParams.get("action") || "summary";

  try {
    if (action === "summary") {
      const summary = getSummaryData();
      return NextResponse.json(summary);
    }

    if (action === "query") {
      const dbType = searchParams.get("db") || "raw"; // raw | clean | era5
      const station = searchParams.get("station") || "all";
      const limit = Math.min(500, Math.max(1, parseInt(searchParams.get("limit") || "50", 10)));
      const page = Math.max(1, parseInt(searchParams.get("page") || "1", 10));
      const offset = (page - 1) * limit;
      const statusFilter = searchParams.get("status") || "ALL";

      if (dbType === "raw") {
        if (!fs.existsSync(RAW_DB_PATH)) {
          return NextResponse.json({ error: "meteo_local_cache.db tidak ditemukan" }, { status: 404 });
        }
        const db = new DatabaseSync(RAW_DB_PATH, { readOnly: true });
        
        let whereClauses: string[] = [];
        let params: any[] = [];

        if (station !== "all") {
          whereClauses.push("station_id = ?");
          params.push(station);
        }

        const whereSql = whereClauses.length > 0 ? `WHERE ${whereClauses.join(" AND ")}` : "";

        const countQuery = `SELECT count(*) as total FROM aws_measurements ${whereSql}`;
        const totalCount = (db.prepare(countQuery).get(...params) as any)?.total || 0;

        const dataQuery = `
          SELECT 
            station_id,
            unix_ts,
            COALESCE(NULLIF(local_time, ''), datetime(unix_ts, 'unixepoch', '+7 hours')) as local_time,
            temperature,
            humidity,
            pressure,
            wind_speed,
            wind_direction,
            solar_radiation,
            dew_point,
            battery,
            rainfall,
            rainrate,
            'RAW' as status
          FROM aws_measurements
          ${whereSql}
          ORDER BY unix_ts DESC
          LIMIT ? OFFSET ?
        `;

        const rows = db.prepare(dataQuery).all(...params, limit, offset);
        db.close();

        return NextResponse.json({
          dbType: "raw",
          station,
          page,
          limit,
          totalCount,
          totalPages: Math.ceil(totalCount / limit),
          rows
        });
      }

      if (dbType === "clean") {
        if (!fs.existsSync(CLEAN_DB_PATH)) {
          return NextResponse.json({ error: "meteo_clean_data.db tidak ditemukan" }, { status: 404 });
        }
        const db = new DatabaseSync(CLEAN_DB_PATH, { readOnly: true });

        let whereClauses: string[] = [];
        let params: any[] = [];

        if (station !== "all") {
          whereClauses.push("station_id = ?");
          params.push(station);
        }

        if (statusFilter !== "ALL") {
          whereClauses.push("status LIKE ?");
          params.push(`%${statusFilter}%`);
        }

        const whereSql = whereClauses.length > 0 ? `WHERE ${whereClauses.join(" AND ")}` : "";

        const countQuery = `SELECT count(*) as total FROM aws_clean_measurements ${whereSql}`;
        const totalCount = (db.prepare(countQuery).get(...params) as any)?.total || 0;

        const dataQuery = `
          SELECT 
            station_id,
            unix_ts,
            COALESCE(NULLIF(local_time, ''), datetime(unix_ts, 'unixepoch', '+7 hours')) as local_time,
            temperature,
            humidity,
            pressure,
            wind_speed,
            wind_direction,
            solar_radiation,
            dew_point,
            battery,
            rainfall,
            rainrate,
            status,
            correction_notes
          FROM aws_clean_measurements
          ${whereSql}
          ORDER BY unix_ts DESC
          LIMIT ? OFFSET ?
        `;

        const rows = db.prepare(dataQuery).all(...params, limit, offset);
        db.close();

        return NextResponse.json({
          dbType: "clean",
          station,
          statusFilter,
          page,
          limit,
          totalCount,
          totalPages: Math.ceil(totalCount / limit),
          rows
        });
      }

      if (dbType === "era5") {
        if (!fs.existsSync(ERA5_DB_PATH)) {
          return NextResponse.json({ error: "era5_data.db tidak ditemukan" }, { status: 404 });
        }
        const db = new DatabaseSync(ERA5_DB_PATH, { readOnly: true });

        const countQuery = `SELECT count(*) as total FROM era5_hourly`;
        const totalCount = (db.prepare(countQuery).get() as any)?.total || 0;

        const dataQuery = `
          SELECT 
            unixtime as unix_ts,
            datetime as local_time,
            latitude,
            longitude,
            temperature_2m as temperature,
            relative_humidity_2m as humidity,
            surface_pressure as pressure,
            dew_point_2m as dew_point,
            rain as rainfall,
            wind_speed_10m as wind_speed,
            wind_direction_10m as wind_direction,
            solar_radiation,
            'ERA5' as status
          FROM era5_hourly
          ORDER BY unixtime DESC
          LIMIT ? OFFSET ?
        `;

        const rows = db.prepare(dataQuery).all(limit, offset);
        db.close();

        return NextResponse.json({
          dbType: "era5",
          page,
          limit,
          totalCount,
          totalPages: Math.ceil(totalCount / limit),
          rows
        });
      }

      return NextResponse.json({ error: "dbType tidak dikenali" }, { status: 400 });
    }

    if (action === "integrity") {
      const integrityReport: any = {};
      
      const checkDb = (dbPath: string, name: string) => {
        if (!fs.existsSync(dbPath)) return { name, status: "NOT_FOUND" };
        try {
          const db = new DatabaseSync(dbPath, { readOnly: true });
          const quick = (db.prepare("PRAGMA quick_check(1)").get() as any)?.quick_check;
          const pageCount = (db.prepare("PRAGMA page_count").get() as any)?.page_count;
          const pageSize = (db.prepare("PRAGMA page_size").get() as any)?.page_size;
          db.close();
          return {
            name,
            status: quick === "ok" ? "HEALTHY" : "ERROR",
            quickCheck: quick,
            pageCount,
            pageSize,
            totalSizeBytes: pageCount * pageSize
          };
        } catch (err: any) {
          return { name, status: "ERROR", error: err.message };
        }
      };

      integrityReport.raw = checkDb(RAW_DB_PATH, "meteo_local_cache.db");
      integrityReport.clean = checkDb(CLEAN_DB_PATH, "meteo_clean_data.db");
      integrityReport.era5 = checkDb(ERA5_DB_PATH, "era5_data.db");
      integrityReport.checkedAt = new Date().toISOString();

      return NextResponse.json(integrityReport);
    }

    return NextResponse.json({ error: "Aksi tidak dikenali" }, { status: 400 });
  } catch (error: any) {
    console.error("API Error in /api/backup-sqlite (GET):", error);
    return NextResponse.json({ error: error.message || "Internal server error" }, { status: 500 });
  }
}

const SENSOR_KEYS = [
  "rainfall", "rainrate", "temperature", "humidity", "pressure",
  "wind_speed", "wind_direction", "solar_radiation", "dew_point",
  "battery", "volt", "dew", "lux", "soil_temp", "tips"
];

const PHYSICAL_LIMITS: Record<string, [number, number]> = {
  temperature: [-10.0, 55.0],
  humidity: [5.0, 100.0],
  pressure: [850.0, 1100.0],
  wind_speed: [0.0, 75.0],
  wind_direction: [0.0, 360.0],
  rainfall: [0.0, 300.0],
  rainrate: [0.0, 300.0],
  solar_radiation: [0.0, 1500.0],
  battery: [2.5, 15.0],
  volt: [2.5, 15.0],
  dew_point: [-20.0, 45.0],
  dew: [-20.0, 45.0]
};

function ensureCleanDbSchema(db: DatabaseSync) {
  db.exec(`
    CREATE TABLE IF NOT EXISTS aws_clean_measurements (
      station_id TEXT NOT NULL,
      unix_ts INTEGER NOT NULL,
      local_time TEXT,
      rainfall REAL,
      rainrate REAL,
      temperature REAL,
      humidity REAL,
      pressure REAL,
      wind_speed REAL,
      wind_direction REAL,
      solar_radiation REAL,
      dew_point REAL,
      battery REAL,
      status TEXT DEFAULT 'OK',
      correction_notes TEXT,
      updated_at TEXT,
      volt REAL,
      dew REAL,
      lux REAL,
      soil_temp REAL,
      tips REAL,
      PRIMARY KEY (station_id, unix_ts)
    );
    CREATE INDEX IF NOT EXISTS idx_clean_station_ts ON aws_clean_measurements(station_id, unix_ts);
  `);
}

function processStationClean(
  stationId: string,
  mode: string = "incremental",
  maxGapSeconds: number = 3600,
  cleanDb: DatabaseSync
) {
  const t0 = Date.now();
  if (!fs.existsSync(RAW_DB_PATH)) {
    return { stationId, status: "ERROR", message: "Raw DB tidak ada", cleanRows: 0 };
  }

  const rawDb = new DatabaseSync(RAW_DB_PATH, { readOnly: true });

  let unixStart = 0;
  if (mode === "incremental") {
    const row = cleanDb.prepare("SELECT max(unix_ts) as max_clean FROM aws_clean_measurements WHERE station_id = ?").get(stationId) as any;
    if (row && row.max_clean) {
      unixStart = row.max_clean - 3600; // 1-hour overlap stitch buffer
    }
  }

  const rawRows = rawDb.prepare(
    "SELECT * FROM aws_measurements WHERE station_id = ? AND unix_ts >= ? ORDER BY unix_ts ASC"
  ).all(stationId, unixStart) as any[];

  rawDb.close();

  if (!rawRows || rawRows.length === 0) {
    return { stationId, status: "NO_NEW_DATA", cleanRows: 0, okCount: 0, editedCount: 0, imputedCount: 0, outliersFixed: 0, durationMs: Date.now() - t0 };
  }

  // 1. Snapping to 60-second grid & grouping burst
  const buckets = new Map<number, any[]>();
  for (let i = 0; i < rawRows.length; i++) {
    const r = rawRows[i];
    const snapped = Math.round(r.unix_ts / 60) * 60;
    let list = buckets.get(snapped);
    if (!list) {
      list = [];
      buckets.set(snapped, list);
    }
    list.push(r);
  }

  // 2. Burst Aggregation & Physical QC per Snapped Minute
  const minuteMap = new Map<number, { node: Record<string, number | null>; status: string }>();
  let outliersFixed = 0;

  for (const [snappedTs, list] of buckets.entries()) {
    const aggNode: Record<string, number | null> = {};
    let status = "OK";

    if (list.length === 1) {
      const item = list[0];
      for (let kIdx = 0; kIdx < SENSOR_KEYS.length; kIdx++) {
        const k = SENSOR_KEYS[kIdx];
        let val = item[k];
        if (typeof val === "number" && !isNaN(val)) {
          const limits = PHYSICAL_LIMITS[k];
          if (limits && (val < limits[0] || val > limits[1])) {
            val = Math.max(limits[0], Math.min(limits[1], val));
            status = "EDITED";
            outliersFixed++;
          }
          aggNode[k] = val;
        } else {
          aggNode[k] = null;
        }
      }
    } else {
      status = "EDITED";
      for (let kIdx = 0; kIdx < SENSOR_KEYS.length; kIdx++) {
        const k = SENSOR_KEYS[kIdx];
        const validVals: number[] = [];
        for (let j = 0; j < list.length; j++) {
          const v = list[j][k];
          if (typeof v === "number" && !isNaN(v)) validVals.push(v);
        }

        if (validVals.length === 0) {
          aggNode[k] = null;
          continue;
        }

        if (k === "wind_direction") {
          let sumSin = 0;
          let sumCos = 0;
          for (let vIdx = 0; vIdx < validVals.length; vIdx++) {
            const rad = (validVals[vIdx] * Math.PI) / 180;
            sumSin += Math.sin(rad);
            sumCos += Math.cos(rad);
          }
          const meanRad = Math.atan2(sumSin / validVals.length, sumCos / validVals.length);
          const meanDeg = (((meanRad * 180) / Math.PI) + 360) % 360;
          aggNode[k] = Number(meanDeg.toFixed(1));
        } else if (k === "rainfall" || k === "rainrate") {
          aggNode[k] = Number(Math.max(...validVals).toFixed(2));
        } else {
          let sum = 0;
          for (let vIdx = 0; vIdx < validVals.length; vIdx++) sum += validVals[vIdx];
          let meanVal = sum / validVals.length;
          const limits = PHYSICAL_LIMITS[k];
          if (limits && (meanVal < limits[0] || meanVal > limits[1])) {
            meanVal = Math.max(limits[0], Math.min(limits[1], meanVal));
            outliersFixed++;
          }
          aggNode[k] = Number(meanVal.toFixed(2));
        }
      }
    }

    minuteMap.set(snappedTs, { node: aggNode, status });
  }

  // 3. Sensor Series for Linear Interpolation
  const sensorSeries: Record<string, { ts: number; val: number }[]> = {};
  const ptrs: Record<string, number> = {};
  for (let kIdx = 0; kIdx < SENSOR_KEYS.length; kIdx++) {
    const k = SENSOR_KEYS[kIdx];
    sensorSeries[k] = [];
    ptrs[k] = 0;
  }

  const sortedMinutes = Array.from(minuteMap.keys()).sort((a, b) => a - b);
  for (let i = 0; i < sortedMinutes.length; i++) {
    const ts = sortedMinutes[i];
    const { node } = minuteMap.get(ts)!;
    for (let kIdx = 0; kIdx < SENSOR_KEYS.length; kIdx++) {
      const k = SENSOR_KEYS[kIdx];
      if (typeof node[k] === "number" && node[k] !== null) {
        sensorSeries[k].push({ ts, val: node[k]! });
      }
    }
  }

  // 4. Ultra-Fast Two-Pointer Continuous 1-Minute Grid Generation
  const minTs = sortedMinutes[0];
  const nowTs = Math.floor(Date.now() / 1000);
  const maxTs = Math.min(sortedMinutes[sortedMinutes.length - 1], nowTs);

  const cleanRows: any[] = [];
  let okCount = 0;
  let editedCount = 0;
  let imputedCount = 0;
  let mIdx = 0;

  for (let ts = minTs; ts <= maxTs; ts += 60) {
    while (mIdx < sortedMinutes.length && sortedMinutes[mIdx] < ts) {
      mIdx++;
    }

    if (minuteMap.has(ts)) {
      const entry = minuteMap.get(ts)!;
      if (entry.status === "EDITED") editedCount++;
      else okCount++;

      cleanRows.push({
        station_id: stationId,
        unix_ts: ts,
        status: entry.status,
        node: entry.node
      });
    } else {
      // If gap to next available minute is > maxGapSeconds (e.g. multi-day/month gap), skip directly
      if (mIdx > 0 && mIdx < sortedMinutes.length) {
        const prevM = sortedMinutes[mIdx - 1];
        const nextM = sortedMinutes[mIdx];
        if (nextM - prevM > maxGapSeconds) {
          ts = nextM - 60; // Next step (+60) will land precisely on nextM
          continue;
        }
      }

      // Gap <= maxGapSeconds: Two-pointer physical linear interpolation
      let isAnyImputed = false;
      const node: Record<string, number | null> = {};

      for (let kIdx = 0; kIdx < SENSOR_KEYS.length; kIdx++) {
        const k = SENSOR_KEYS[kIdx];
        const series = sensorSeries[k];
        if (!series || series.length < 2) {
          node[k] = null;
          continue;
        }

        let ptr = ptrs[k];
        while (ptr < series.length && series[ptr].ts < ts) {
          ptr++;
        }
        ptrs[k] = ptr;

        if (ptr > 0 && ptr < series.length) {
          const prev = series[ptr - 1];
          const next = series[ptr];
          const dt = next.ts - prev.ts;

          if (dt > 0 && dt <= maxGapSeconds) {
            const frac = (ts - prev.ts) / dt;
            let interp = prev.val + frac * (next.val - prev.val);

            // Physical Bounds
            if (["rainfall", "rainrate", "wind_speed", "solar_radiation", "battery", "volt", "lux", "tips"].includes(k)) {
              interp = Math.max(0.0, interp);
            } else if (k === "humidity") {
              interp = Math.min(100.0, Math.max(5.0, interp));
            } else if (k === "wind_direction") {
              interp = ((interp % 360) + 360) % 360;
            }

            node[k] = Number(interp.toFixed(2));
            isAnyImputed = true;
          } else {
            node[k] = null;
          }
        } else {
          node[k] = null;
        }
      }

      if (isAnyImputed) {
        imputedCount++;
        cleanRows.push({
          station_id: stationId,
          unix_ts: ts,
          status: "IMPUTED",
          node
        });
      }
    }
  }

  // 5. Batch Insert into cleanDb in Transactions of 10,000
  const insertStmt = cleanDb.prepare(`
    INSERT OR REPLACE INTO aws_clean_measurements (
      station_id, unix_ts, local_time, rainfall, rainrate,
      temperature, humidity, pressure, wind_speed, wind_direction,
      solar_radiation, dew_point, battery, status, correction_notes,
      updated_at, volt, dew, lux, soil_temp, tips
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  const BATCH_SIZE = 10000;
  const nowStr = new Date().toISOString().replace("T", " ").substring(0, 19);

  for (let i = 0; i < cleanRows.length; i += BATCH_SIZE) {
    cleanDb.exec("BEGIN TRANSACTION");
    const end = Math.min(i + BATCH_SIZE, cleanRows.length);
    for (let j = i; j < end; j++) {
      const r = cleanRows[j];
      const n = r.node;
      insertStmt.run(
        r.station_id,
        r.unix_ts,
        formatWibDate(r.unix_ts),
        n.rainfall ?? null,
        n.rainrate ?? null,
        n.temperature ?? null,
        n.humidity ?? null,
        n.pressure ?? null,
        n.wind_speed ?? null,
        n.wind_direction ?? null,
        n.solar_radiation ?? null,
        n.dew_point ?? null,
        n.battery ?? null,
        r.status,
        r.status === "IMPUTED" ? "Interpolasi Linear Fisis (Gap <= 1 Jam)" : null,
        nowStr,
        n.volt ?? null,
        n.dew ?? null,
        n.lux ?? null,
        n.soil_temp ?? null,
        n.tips ?? null
      );
    }
    cleanDb.exec("COMMIT");
  }

  const durationMs = Date.now() - t0;
  return {
    stationId,
    status: "SUCCESS",
    cleanRows: cleanRows.length,
    okCount,
    editedCount,
    imputedCount,
    outliersFixed,
    durationMs
  };
}

export async function POST(request: Request) {
  const { searchParams } = new URL(request.url);
  const action = searchParams.get("action") || "sync";

  try {
    let body: any = {};
    try {
      body = await request.json();
    } catch {}

    if (action === "sync") {
      const station = body.station || "all";
      const limit = Math.min(2000, Math.max(10, parseInt(String(body.limit || 500), 10)));

      const targetStations = station === "all" ? VALID_STATIONS : [station];
      const token = await getFirebaseOAuthToken();

      if (!fs.existsSync(RAW_DB_PATH)) {
        return NextResponse.json({ error: "meteo_local_cache.db tidak ditemukan" }, { status: 404 });
      }

      const db = new DatabaseSync(RAW_DB_PATH);
      const insertStmt = db.prepare(`
        INSERT OR REPLACE INTO aws_measurements (
          station_id, unix_ts, local_time, rainfall, rainrate, temperature, humidity,
          pressure, wind_speed, wind_direction, solar_radiation, dew_point, battery,
          raw_json, updated_at, volt, dew, lux, soil_temp, tips
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `);

      let totalSynced = 0;
      const details: Record<string, number> = {};

      for (const stId of targetStations) {
        const maxRow = db.prepare("SELECT max(unix_ts) as max_ts FROM aws_measurements WHERE station_id = ?").get(stId) as any;
        const maxTs = maxRow?.max_ts || 0;
        const startKey = String(maxTs + 1);

        const url = `https://staklimjerukagung-default-rtdb.asia-southeast1.firebasedatabase.app/auto_weather_stat/${stId}/data.json?access_token=${token}&orderBy="$key"&startAt="${startKey}"&limitToFirst=${limit}`;
        
        try {
          const res = await fetch(url);
          const data = await res.json();

          if (data && typeof data === "object" && Object.keys(data).length > 0) {
            db.exec("BEGIN TRANSACTION");
            let countForStation = 0;

            for (const [key, val] of Object.entries(data as Record<string, any>)) {
              const unixTs = Number(key);
              if (!unixTs || unixTs <= maxTs) continue;

              const d = new Date((unixTs + 7 * 3600) * 1000);
              const localTime = d.toISOString().replace("T", " ").replace(/\.\d+Z$/, "");
              const nowStr = new Date().toISOString().replace("T", " ").replace(/\.\d+Z$/, "");

              insertStmt.run(
                stId,
                unixTs,
                localTime,
                val.rainfall ?? null,
                val.rainrate ?? null,
                val.temperature ?? null,
                val.humidity ?? null,
                val.pressure ?? null,
                val.wind_speed ?? val.windSpeed ?? null,
                val.wind_direction ?? val.windDirection ?? null,
                val.solar_radiation ?? val.solarRadiation ?? null,
                val.dew_point ?? val.dew ?? null,
                val.battery ?? val.volt ?? null,
                JSON.stringify(val),
                nowStr,
                val.volt ?? null,
                val.dew ?? null,
                val.lux ?? null,
                val.soil_temp ?? null,
                val.tips ?? null
              );
              countForStation++;
            }
            db.exec("COMMIT");
            details[stId] = countForStation;
            totalSynced += countForStation;
          } else {
            details[stId] = 0;
          }
        } catch (stErr: any) {
          console.error(`Error syncing station ${stId}:`, stErr);
          details[stId] = 0;
        }
      }

      db.close();

      return NextResponse.json({
        success: true,
        totalSynced,
        details,
        message: `Sinkronisasi berhasil! Total ${totalSynced} data baru dimasukkan ke basis data mentah SQLite.`
      });
    }

    if (action === "sync-era5") {
      const lat = typeof body.lat === "number" ? body.lat : -7.7121;
      const lon = typeof body.lon === "number" ? body.lon : 109.6892;

      if (!fs.existsSync(ERA5_DB_PATH)) {
        return NextResponse.json({ error: "era5_data.db tidak ditemukan" }, { status: 404 });
      }

      const db = new DatabaseSync(ERA5_DB_PATH);
      const maxRow = db.prepare("SELECT max(unixtime) as max_ts FROM era5_hourly").get() as any;
      const maxTs = maxRow?.max_ts || 0;

      const today = new Date();
      const dEnd = body.endDate || today.toISOString().substring(0, 10);
      
      let dStart = body.startDate;
      if (!dStart) {
        if (maxTs > 0) {
          const lastDate = new Date((maxTs - 24 * 3600) * 1000);
          dStart = lastDate.toISOString().substring(0, 10);
        } else {
          dStart = "2023-01-01";
        }
      }

      const hourlyParams = [
        "temperature_2m",
        "relative_humidity_2m",
        "dew_point_2m",
        "surface_pressure",
        "pressure_msl",
        "rain",
        "wind_speed_10m",
        "wind_direction_10m",
        "wind_gusts_10m",
        "direct_radiation",
        "diffuse_radiation",
        "direct_normal_irradiance",
        "shortwave_radiation_instant",
        "cloud_cover",
        "et0_fao_evapotranspiration"
      ].join(",");

      const url = `https://historical-forecast-api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&start_date=${dStart}&end_date=${dEnd}&hourly=${hourlyParams}&timezone=Asia%2FJakarta&models=ecmwf_ifs025`;

      const res = await fetch(url);
      const json = await res.json();

      if (!res.ok) {
        db.close();
        throw new Error(`Open-Meteo Error: ${JSON.stringify(json)}`);
      }

      const h = json.hourly || {};
      const timeList = h.time || [];

      if (timeList.length === 0) {
        db.close();
        return NextResponse.json({
          success: true,
          totalSynced: 0,
          message: "Data ERA5 sudah mutakhir, tidak ada jam baru yang perlu ditambahkan."
        });
      }

      const insertStmt = db.prepare(`
        INSERT OR REPLACE INTO era5_hourly (
          unixtime, datetime, latitude, longitude,
          temperature_2m, relative_humidity_2m, dew_point_2m,
          surface_pressure, pressure_msl, rain,
          wind_speed_10m, wind_direction_10m, wind_gusts_10m,
          solar_radiation, direct_radiation, diffuse_radiation,
          direct_normal_irradiance, cloud_cover, et0_fao_evapotranspiration,
          updated_at, model_source
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `);

      db.exec("BEGIN TRANSACTION");
      let inserted = 0;
      const nowStr = new Date().toISOString().replace("T", " ").substring(0, 19);

      for (let i = 0; i < timeList.length; i++) {
        const timeStr = timeList[i];
        const unixtime = Math.floor(Date.parse(`${timeStr}:00+07:00`) / 1000);
        if (!unixtime) continue;

        const formattedDatetime = timeStr.replace("T", " ") + ":00";

        insertStmt.run(
          unixtime,
          formattedDatetime,
          lat,
          lon,
          h.temperature_2m?.[i] ?? null,
          h.relative_humidity_2m?.[i] ?? null,
          h.dew_point_2m?.[i] ?? null,
          h.surface_pressure?.[i] ?? null,
          h.pressure_msl?.[i] ?? null,
          h.rain?.[i] ?? null,
          h.wind_speed_10m?.[i] ?? null,
          h.wind_direction_10m?.[i] ?? null,
          h.wind_gusts_10m?.[i] ?? null,
          h.shortwave_radiation_instant?.[i] ?? null,
          h.direct_radiation?.[i] ?? null,
          h.diffuse_radiation?.[i] ?? null,
          h.direct_normal_irradiance?.[i] ?? null,
          h.cloud_cover?.[i] ?? null,
          h.et0_fao_evapotranspiration?.[i] ?? null,
          nowStr,
          "ecmwf_ifs025_sync"
        );
        inserted++;
      }

      db.exec("COMMIT");
      const finalCount = (db.prepare("SELECT count(*) as total FROM era5_hourly").get() as any)?.total || 0;
      db.close();

      return NextResponse.json({
        success: true,
        totalSynced: inserted,
        totalRows: finalCount,
        message: `Sinkronisasi ERA5 berhasil! Menambahkan/memperbarui ${inserted} jam observasi ke era5_data.db (Total saat ini: ${finalCount.toLocaleString("id-ID")} jam).`
      });
    }

    if (action === "clean-resample") {
      const station = body.station || "all";
      const mode = body.mode === "full" ? "full" : "incremental";
      const autoSnapshot = body.autoSnapshot !== false;
      const maxGapSeconds = typeof body.maxGapSeconds === "number" ? body.maxGapSeconds : 3600;

      if (!fs.existsSync(RAW_DB_PATH)) {
        return NextResponse.json({ error: "meteo_local_cache.db tidak ditemukan" }, { status: 404 });
      }

      let snapshotMeta: any = null;
      if (autoSnapshot) {
        snapshotMeta = createBackupSnapshot(`Pre-Resampling Auto Backup (${station}, ${mode})`);
      }

      const stationsToProcess = station === "all" ? VALID_STATIONS : [station];
      const results: Record<string, any> = {};
      let totalCleaned = 0;
      let totalImputed = 0;
      let totalOk = 0;
      let totalEdited = 0;
      let totalOutliers = 0;

      const cleanDb = new DatabaseSync(CLEAN_DB_PATH);
      ensureCleanDbSchema(cleanDb);

      for (const stId of stationsToProcess) {
        const res = processStationClean(stId, mode, maxGapSeconds, cleanDb);
        results[stId] = res;
        totalCleaned += res.cleanRows || 0;
        totalImputed += res.imputedCount || 0;
        totalOk += res.okCount || 0;
        totalEdited += res.editedCount || 0;
        totalOutliers += res.outliersFixed || 0;
      }

      cleanDb.close();

      return NextResponse.json({
        success: true,
        station,
        mode,
        snapshot: snapshotMeta,
        totalCleaned,
        totalOk,
        totalEdited,
        totalImputed,
        totalOutliers,
        details: results,
        message: `Pembersihan & Resampling 1-Menit berhasil! ${totalCleaned.toLocaleString("id-ID")} baris data bersih tersimpan ke meteo_clean_data.db (Imputasi fisis: ${totalImputed.toLocaleString("id-ID")} titik, Outlier dikoreksi: ${totalOutliers.toLocaleString("id-ID")}).`
      });
    }

    return NextResponse.json({ error: "Aksi POST tidak dikenali" }, { status: 400 });
  } catch (error: any) {
    console.error("API Error in /api/backup-sqlite (POST):", error);
    return NextResponse.json({ error: error.message || "Internal server error" }, { status: 500 });
  }
}
