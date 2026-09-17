const { DatabaseSync } = require('node:sqlite');

const meteoDb = new DatabaseSync('d:/Github/Firebase_Database_Administrator/databases/meteo_local_cache.db');
const era5Db = new DatabaseSync('d:/Github/Firebase_Database_Administrator/databases/era5_data.db');

// Check AWS data for id-03
const awsRows = meteoDb.prepare(`
  SELECT count(*) as count, min(unix_ts) as min_ts, max(unix_ts) as max_ts
  FROM aws_measurements
  WHERE station_id = 'id-03'
`).all();

console.log("AWS id-03 rows:", awsRows);

// Check hourly count
const hourly = meteoDb.prepare(`
  SELECT 
    (unix_ts / 3600) * 3600 as hour_ts,
    count(*) as count,
    avg(temperature) as avg_temp
  FROM aws_measurements 
  WHERE station_id = 'id-03'
  GROUP BY (unix_ts / 3600)
  ORDER BY hour_ts DESC
  LIMIT 5
`).all();
console.log("Hourly sample id-03:", hourly);
