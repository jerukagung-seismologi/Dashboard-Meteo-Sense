// lib/reanalysis/era5SqliteSource.ts
import path from "path";
import fs from "fs";
import { createRequire } from "module";

export interface ERA5SqliteRecord {
  unixtime: number;
  datetime: string;
  latitude: number;
  longitude: number;
  temperature_2m: number | null;
  relative_humidity_2m: number | null;
  dew_point_2m: number | null;
  surface_pressure: number | null;
  pressure_msl: number | null;
  rain: number | null;
  wind_speed_10m: number | null;
  wind_gusts_10m: number | null;
  wind_direction_10m: number | null;
  solar_radiation: number | null;
  cloud_cover: number | null;
  soil_temperature_0_to_7cm: number | null;
  soil_moisture_0_to_7cm: number | null;
}

export interface ERA5SqliteResponse {
  latitude: number;
  longitude: number;
  elevation: number;
  timezone: string;
  sourceModel: string;
  isLocalSqlite: boolean;
  totalRecords: number;
  hourly: {
    time: string[];
    temperature_2m: (number | null)[];
    relative_humidity_2m: (number | null)[];
    dew_point_2m: (number | null)[];
    surface_pressure: (number | null)[];
    pressure_msl: (number | null)[];
    rain: (number | null)[];
    precipitation: (number | null)[];
    wind_speed_10m: (number | null)[];
    wind_gusts_10m: (number | null)[];
    wind_direction_10m: (number | null)[];
    shortwave_radiation: (number | null)[];
    cloud_cover: (number | null)[];
    soil_temperature_0_to_7cm: (number | null)[];
    soil_moisture_0_to_7cm: (number | null)[];
  };
}

/**
 * Mendeteksi lokasi path database SQLite era5_data.db dari Firebase_Database_Administrator
 */
export function getEra5DatabasePath(): string | null {
  const candidatePaths = [
    process.env.ERA5_DB_PATH,
    path.resolve(process.cwd(), "../Firebase_Database_Administrator/databases/era5_data.db"),
    "D:/Github/Firebase_Database_Administrator/databases/era5_data.db",
    "d:/Github/Firebase_Database_Administrator/databases/era5_data.db",
    path.resolve(process.cwd(), "./databases/era5_data.db"),
  ].filter(Boolean) as string[];

  for (const candidate of candidatePaths) {
    if (fs.existsSync(candidate)) {
      return candidate;
    }
  }
  return null;
}

/**
 * Membaca data ERA5 langsung dari SQLite database era5_data.db tanpa unduh internet
 */
export function fetchERA5FromSqlite(
  startDate: string, // YYYY-MM-DD
  endDate: string,   // YYYY-MM-DD
  targetLat: number,
  targetLng: number
): ERA5SqliteResponse | null {
  const dbPath = getEra5DatabasePath();
  if (!dbPath) {
    console.warn("[ERA5 SQLite] Database path not found.");
    return null;
  }

  try {
    const pkgPath = path.resolve(process.cwd(), "package.json");
    const requireNode = createRequire(pkgPath);
    const { DatabaseSync } = requireNode("node:sqlite");
    if (!DatabaseSync) {
      console.warn("[ERA5 SQLite] DatabaseSync from node:sqlite not available.");
      return null;
    }

    const db = new DatabaseSync(dbPath, { readOnly: true });

    // Hitung rentang unixtime (UTC Epoch Seconds) berdasarkan waktu WIB (+07:00)
    const uStart = Math.floor(Date.parse(`${startDate}T00:00:00+07:00`) / 1000);
    const uEnd = Math.floor(Date.parse(`${endDate}T23:59:59+07:00`) / 1000);

    if (isNaN(uStart) || isNaN(uEnd)) {
      db.close();
      return null;
    }

    // Query data per jam terurut
    const query = `
      SELECT 
        unixtime, datetime, latitude, longitude,
        temperature_2m, relative_humidity_2m, dew_point_2m,
        surface_pressure, pressure_msl, rain,
        wind_speed_10m, wind_gusts_10m, wind_direction_10m,
        solar_radiation, cloud_cover,
        soil_temperature_0_to_7cm, soil_moisture_0_to_7cm
      FROM era5_hourly
      WHERE unixtime BETWEEN ? AND ?
      ORDER BY unixtime ASC
    `;

    const stmt = db.prepare(query);
    const rows = stmt.all(uStart, uEnd) as unknown as ERA5SqliteRecord[];
    db.close();

    if (!rows || rows.length === 0) {
      console.log(`[ERA5 SQLite] No rows for range ${startDate} to ${endDate} (${uStart} - ${uEnd})`);
      return null;
    }

    // Ekstraksi array sesuai format Open-Meteo hourly schema
    const times: string[] = [];
    const temp: (number | null)[] = [];
    const hum: (number | null)[] = [];
    const dew: (number | null)[] = [];
    const press: (number | null)[] = [];
    const pressMsl: (number | null)[] = [];
    const rainArr: (number | null)[] = [];
    const ws: (number | null)[] = [];
    const wg: (number | null)[] = [];
    const wd: (number | null)[] = [];
    const rad: (number | null)[] = [];
    const cloud: (number | null)[] = [];
    const soilT: (number | null)[] = [];
    const soilM: (number | null)[] = [];

    for (const r of rows) {
      // Format datetime standar "YYYY-MM-DDTHH:00"
      const timeClean = r.datetime.replace("+07:00", "").trim().replace(" ", "T");
      times.push(timeClean);
      temp.push(r.temperature_2m != null ? Number(r.temperature_2m.toFixed(2)) : null);
      hum.push(r.relative_humidity_2m != null ? Number(r.relative_humidity_2m.toFixed(1)) : null);
      dew.push(r.dew_point_2m != null ? Number(r.dew_point_2m.toFixed(2)) : null);
      press.push(r.surface_pressure != null ? Number(r.surface_pressure.toFixed(1)) : null);
      pressMsl.push(r.pressure_msl != null ? Number(r.pressure_msl.toFixed(1)) : null);
      rainArr.push(r.rain != null ? Number(r.rain.toFixed(2)) : 0);
      ws.push(r.wind_speed_10m != null ? Number(r.wind_speed_10m.toFixed(2)) : null);
      wg.push(r.wind_gusts_10m != null ? Number(r.wind_gusts_10m.toFixed(2)) : null);
      wd.push(r.wind_direction_10m != null ? Math.round(r.wind_direction_10m) : null);
      rad.push(r.solar_radiation != null ? Number(r.solar_radiation.toFixed(1)) : 0);
      cloud.push(r.cloud_cover != null ? Math.round(r.cloud_cover) : null);
      soilT.push(r.soil_temperature_0_to_7cm != null ? Number(r.soil_temperature_0_to_7cm.toFixed(1)) : null);
      soilM.push(r.soil_moisture_0_to_7cm != null ? Number(r.soil_moisture_0_to_7cm.toFixed(3)) : null);
    }

    console.log(`[ERA5 SQLite] Successfully retrieved ${rows.length} records from era5_data.db!`);

    return {
      latitude: targetLat,
      longitude: targetLng,
      elevation: 23,
      timezone: "Asia/Jakarta",
      sourceModel: "ECMWF ERA5-Land (SQLite Lokal: era5_data.db)",
      isLocalSqlite: true,
      totalRecords: rows.length,
      hourly: {
        time: times,
        temperature_2m: temp,
        relative_humidity_2m: hum,
        dew_point_2m: dew,
        surface_pressure: press,
        pressure_msl: pressMsl,
        rain: rainArr,
        precipitation: rainArr,
        wind_speed_10m: ws,
        wind_gusts_10m: wg,
        wind_direction_10m: wd,
        shortwave_radiation: rad,
        cloud_cover: cloud,
        soil_temperature_0_to_7cm: soilT,
        soil_moisture_0_to_7cm: soilM,
      },
    };
  } catch (err) {
    console.error("Gagal membaca era5_data.db dari SQLite:", err);
    return null;
  }
}
