// scratch/test_sync_era5.js
const { DatabaseSync } = require('node:sqlite');
const path = require('node:path');

const ERA5_DB_PATH = 'd:/Github/Firebase_Database_Administrator/databases/era5_data.db';

async function syncEra5(lat = -7.7121, lon = 109.6892) {
  const db = new DatabaseSync(ERA5_DB_PATH);
  const maxRow = db.prepare("SELECT max(unixtime) as max_ts FROM era5_hourly").get();
  const maxTs = maxRow?.max_ts || 0;
  console.log("Current max unixtime in era5_hourly:", maxTs, new Date(maxTs * 1000).toISOString());

  const today = new Date();
  const dEnd = today.toISOString().substring(0, 10);
  
  let dStart;
  if (maxTs > 0) {
    const lastDate = new Date((maxTs + 3600) * 1000);
    dStart = lastDate.toISOString().substring(0, 10);
  } else {
    dStart = "2023-01-01";
  }

  console.log(`Syncing ERA5 from ${dStart} to ${dEnd}...`);

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
    throw new Error(`Open-Meteo Error: ${JSON.stringify(json)}`);
  }

  const h = json.hourly || {};
  const timeList = h.time || [];
  console.log(`Diterima ${timeList.length} baris jam dari Open-Meteo.`);

  if (timeList.length === 0) {
    db.close();
    return 0;
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
  const nowStr = new Date().toISOString().replace('T', ' ').substring(0, 19);

  for (let i = 0; i < timeList.length; i++) {
    const timeStr = timeList[i]; // e.g. "2026-09-04T00:00"
    // Timezone is Asia/Jakarta (+07:00)
    const unixtime = Math.floor(Date.parse(`${timeStr}:00+07:00`) / 1000);
    if (!unixtime || unixtime <= maxTs) continue;

    const formattedDatetime = timeStr.replace('T', ' ') + ':00';

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
  db.close();

  console.log(`Sukses memasukkan ${inserted} jam data ERA5 baru ke era5_data.db!`);
  return inserted;
}

syncEra5().catch(console.error);
