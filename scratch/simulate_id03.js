const { DatabaseSync } = require('node:sqlite');

const meteoDb = new DatabaseSync('d:/Github/Firebase_Database_Administrator/databases/meteo_local_cache.db');
const era5Db = new DatabaseSync('d:/Github/Firebase_Database_Administrator/databases/era5_data.db');

// 1. Fetch AWS for id-03
const awsHourly = meteoDb.prepare(`
  SELECT 
    (unix_ts / 3600) * 3600 as hour_ts,
    avg(temperature) as aws_temp
  FROM aws_measurements 
  WHERE station_id = 'id-03'
    AND temperature IS NOT NULL AND temperature >= 10 AND temperature <= 50
  GROUP BY (unix_ts / 3600)
  HAVING count(*) >= 5
  ORDER BY hour_ts DESC
  LIMIT 720
`).all();

// 2. Fetch ERA5
const era5Rows = era5Db.prepare(`
  SELECT 
    unixtime as hour_ts,
    temperature_2m as era5_temp
  FROM era5_hourly
  WHERE temperature_2m IS NOT NULL
`).all();

const era5Map = new Map();
for (const r of era5Rows) era5Map.set(r.hour_ts, r.era5_temp);

const pairs = [];
for (const a of awsHourly) {
  const e = era5Map.get(a.hour_ts);
  if (e !== undefined) {
    pairs.push({ timestamp: a.hour_ts * 1000, aws: a.aws_temp, era5: e });
  }
}

console.log("Matched pairs for id-03:", pairs.length);

if (pairs.length > 0) {
  const sumDiff = pairs.reduce((acc, p) => acc + (p.aws - p.era5), 0);
  const bias = sumDiff / pairs.length;
  console.log("MBE (AWS - ERA5):", bias.toFixed(4));
  console.log("Formula: y = x +", bias.toFixed(2));

  // Corrected ERA5
  const sample = pairs.slice(0, 5).map(p => ({
    aws: p.aws.toFixed(2),
    era5: p.era5.toFixed(2),
    era5_corrected: (p.era5 + bias).toFixed(2),
    shift: ((p.era5 + bias) - p.era5).toFixed(2)
  }));
  console.log("Sample transformed ERA5:", sample);
}
