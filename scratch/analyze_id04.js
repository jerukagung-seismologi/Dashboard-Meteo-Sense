// scratch/analyze_id04.js
const { DatabaseSync } = require('node:sqlite');
const path = require('path');

const meteoDbPath = 'd:/Github/Firebase_Database_Administrator/databases/meteo_local_cache.db';
const era5DbPath = 'd:/Github/Firebase_Database_Administrator/databases/era5_data.db';

const meteoDb = new DatabaseSync(meteoDbPath);
const era5Db = new DatabaseSync(era5DbPath);

console.log("1. Checking date range and record count for id-04 in meteo_local_cache.db:");
const id04Stats = meteoDb.prepare(`
  SELECT 
    count(*) as total_records,
    min(unix_ts) as min_ts,
    max(unix_ts) as max_ts,
    avg(temperature) as avg_temp,
    min(temperature) as min_temp,
    max(temperature) as max_temp,
    avg(humidity) as avg_hum,
    min(humidity) as min_hum,
    max(humidity) as max_hum,
    avg(pressure) as avg_press,
    min(pressure) as min_press,
    max(pressure) as max_press,
    sum(rainfall) as total_rain,
    avg(wind_speed) as avg_ws
  FROM aws_measurements 
  WHERE station_id = 'id-04' AND temperature IS NOT NULL AND temperature > 0
`).get();

console.log("ID-04 Stats:", JSON.stringify(id04Stats, null, 2));

console.log("\n2. Checking sample hourly records for id-04 in August 2026 (unix_ts >= 1785628800):");
const sampleRows = meteoDb.prepare(`
  SELECT 
    (unix_ts / 3600) * 3600 as hour_ts,
    count(*) as sample_count,
    avg(temperature) as avg_temp,
    avg(humidity) as avg_hum,
    avg(pressure) as avg_press,
    sum(rainfall) as hourly_rain,
    avg(wind_speed) as avg_ws
  FROM aws_measurements 
  WHERE station_id = 'id-04' AND unix_ts >= 1785628800 AND unix_ts <= 1788220800
  GROUP BY (unix_ts / 3600)
  ORDER BY hour_ts ASC
  LIMIT 5
`).all();

console.log("Hourly sample (first 5 hours):", JSON.stringify(sampleRows, null, 2));

console.log("\n3. Checking matching ERA5 hourly records for the same timestamps:");
if (sampleRows.length > 0) {
  const t0 = sampleRows[0].hour_ts;
  const era5Sample = era5Db.prepare(`
    SELECT 
      unixtime, datetime, temperature_2m, relative_humidity_2m, surface_pressure, rain, wind_speed_10m
    FROM era5_hourly 
    WHERE unixtime >= ?
    ORDER BY unixtime ASC
    LIMIT 5
  `).all(t0);
  console.log("ERA5 sample matching t0:", JSON.stringify(era5Sample, null, 2));
}
