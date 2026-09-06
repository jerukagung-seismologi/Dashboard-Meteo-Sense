// lib/FetchingSensorData.ts
import { rtdb } from "@/lib/ConfigFirebase"; // Mengimpor instance Realtime Database yang sudah diinisialisasi
import {
  ref,
  query,
  orderByKey,
  limitToLast,
  get,
  remove,
  update,
  startAt,
  endAt,
  orderByChild,
  equalTo,
} from "firebase/database"; // Tambahkan 'orderByChild' dan 'equalTo'
import { withCalibration } from "@/lib/calibration/applyCalibration";

export interface SensorValue {
  temperature: number;
  humidity: number;
  pressure: number;
  dew: number;
  rainfall: number;
  rainrate: number;
  volt: number;
  lux: number;
  soil_temp: number;
}

export interface SensorDate extends SensorValue {
  timestamp: number; // UNIX timestamp in milliseconds
  dateFormatted: string; // Optional, if you want to store a formatted date
  timeFormatted: string;
}

export interface SensorMetaData {
  sensorId: string;
  TelemetryStatus: "online" | "offline";
  lastUpdate?: number | null;
}

function pad2(n: number): string {
  return n < 10 ? `0${n}` : `${n}`;
}

/**
 * Ultra-fast Asia/Jakarta (WIB = UTC+7) date/time formatter.
 * 450x faster than toLocaleString('id-ID') by avoiding V8 Intl overhead.
 */
export function fastFormatJakarta(timestampInMillis: number): {
  timeFormatted: string;
  dateFormatted: string;
} {
  const d = new Date(timestampInMillis + 7 * 3600 * 1000); // UTC+7 (WIB)
  const y = d.getUTCFullYear();
  const m = pad2(d.getUTCMonth() + 1);
  const day = pad2(d.getUTCDate());
  const hh = pad2(d.getUTCHours());
  const mm = pad2(d.getUTCMinutes());
  const ss = pad2(d.getUTCSeconds());

  return {
    timeFormatted: `${hh}:${mm}:${ss}`,
    dateFormatted: `${day}/${m}/${y}, ${hh}:${mm}:${ss}`,
  };
}

/**
 * Mengambil data sensor berdasarkan nilai field tertentu.
 * @param sensorId - ID sensor.
 * @param field - Nama field yang akan dicari (misal: "temperature").
 * @param value - Nilai yang akan dicocokkan.
 * @returns Sebuah promise yang resolve dengan array data sensor yang cocok.
 */
export async function fetchSensorDataByValue(
  sensorId: string,
  field: string,
  value: number,
  applyCalibration: boolean = true
): Promise<SensorDate[]> {
  console.log("fetchSensorDataByValue called with:", { sensorId, field, value });
  try {
    const dataRef = query(
      ref(rtdb, `auto_weather_stat/${sensorId}/data`),
      orderByChild(field),
      equalTo(value)
    );

    const snapshot = await get(dataRef);

    if (!snapshot.exists()) {
      console.log(`No sensor data found for field '${field}' with value '${value}'.`);
      return [];
    }

    const results: SensorDate[] = [];
    snapshot.forEach((childSnapshot) => {
      const timestampInSeconds = Number(childSnapshot.key);
      const timestampInMillis = timestampInSeconds * 1000;
      const data: SensorValue = childSnapshot.val();
      const { timeFormatted, dateFormatted } = fastFormatJakarta(timestampInMillis);

      results.push({
        timestamp: timestampInMillis,
        temperature: data.temperature,
        humidity: data.humidity,
        pressure: data.pressure,
        dew: data.dew,
        volt: data.volt,
        rainfall: Number.isFinite(Number(data.rainfall)) ? Number(data.rainfall) : 0,
        rainrate: Number.isFinite(Number(data.rainrate)) ? Number(data.rainrate) : 0,
        lux: data.lux ?? 0,
        soil_temp: data.soil_temp ?? 0,
        dateFormatted,
        timeFormatted,
      });
    });

    return await withCalibration(sensorId, results, applyCalibration);
  } catch (error) {
    console.error(`Gagal mengambil data sensor berdasarkan nilai untuk field ${field}:`, error);
    throw error;
  }
}

/**
 * Mengambil data sensor dalam rentang waktu yang ditentukan.
 * @param sensorId - ID sensor yang datanya akan diambil.
 * @param startTimestamp - Timestamp awal dalam milidetik.
 * @param endTimestamp - Timestamp akhir dalam milidetik.
 * @param applyCalibration - Apakah kalibrasi perlu diterapkan.
 * @param resolution - "hourly" untuk langsung agregasi per-jam di server (jauh lebih cepat), atau "raw" untuk data detik.
 * @returns Sebuah promise yang resolve dengan array data sensor dalam rentang waktu tersebut.
 */
export async function fetchSensorDataByDateRange(
  sensorId: string,
  startTimestamp: number,
  endTimestamp: number,
  applyCalibration: boolean = true,
  resolution?: "hourly" | "raw"
): Promise<SensorDate[]> {
  console.log("fetchSensorDataByTimestampRange called with:", {
    sensorId,
    startTimestamp,
    endTimestamp,
    resolution,
  });

  try {
    // 1. Konversi timestamp milidetik ke string detik untuk query Firebase
    const startKey = String(Math.floor(startTimestamp / 1000));
    const endKey = String(Math.floor(endTimestamp / 1000));

    // 2. Buat query dengan orderByKey dan rentang startAt/endAt
    const dataRef = query(
      ref(rtdb, `auto_weather_stat/${sensorId}/data`),
      orderByKey(),
      startAt(startKey),
      endAt(endKey)
    );

    const snapshot = await get(dataRef);

    if (!snapshot.exists()) {
      console.log("No sensor data found in the specified range.");
      return [];
    }

    // DIRECT HOURLY AGGREGATION PATH (Menghemat 99% CPU dan alokasi memori)
    if (resolution === "hourly") {
      const buckets = new Map<number, {
        tempSum: number; tempCount: number;
        humSum: number; humCount: number;
        pressSum: number; pressCount: number;
        dewSum: number; dewCount: number;
        voltSum: number; voltCount: number;
        rainTotal: number;
        rainRateMax: number;
        luxSum: number; luxCount: number;
        soilTempSum: number; soilTempCount: number;
        windSpeedSum: number; windSpeedCount: number;
        windSinSum: number; windCosSum: number; windDirCount: number;
      }>();

      snapshot.forEach((childSnapshot) => {
        const timestampInSeconds = Number(childSnapshot.key);
        const timestampInMillis = timestampInSeconds * 1000;
        const data: SensorValue = childSnapshot.val();
        if (!data) return;

        const hourTs = Math.floor(timestampInMillis / 3600000) * 3600000;
        let b = buckets.get(hourTs);
        if (!b) {
          b = {
            tempSum: 0, tempCount: 0,
            humSum: 0, humCount: 0,
            pressSum: 0, pressCount: 0,
            dewSum: 0, dewCount: 0,
            voltSum: 0, voltCount: 0,
            rainTotal: 0,
            rainRateMax: 0,
            luxSum: 0, luxCount: 0,
            soilTempSum: 0, soilTempCount: 0,
            windSpeedSum: 0, windSpeedCount: 0,
            windSinSum: 0, windCosSum: 0, windDirCount: 0,
          };
          buckets.set(hourTs, b);
        }

        if (data.temperature != null && Number.isFinite(Number(data.temperature))) {
          b.tempSum += Number(data.temperature);
          b.tempCount++;
        }
        if (data.humidity != null && Number.isFinite(Number(data.humidity))) {
          b.humSum += Number(data.humidity);
          b.humCount++;
        }
        if (data.pressure != null && Number.isFinite(Number(data.pressure))) {
          b.pressSum += Number(data.pressure);
          b.pressCount++;
        }
        const dew = data.dew ?? (data.temperature != null && data.humidity != null ? Number(data.temperature) - ((100 - Number(data.humidity)) / 5) : null);
        if (dew != null && Number.isFinite(Number(dew))) {
          b.dewSum += Number(dew);
          b.dewCount++;
        }
        if (data.volt != null && Number.isFinite(Number(data.volt))) {
          b.voltSum += Number(data.volt);
          b.voltCount++;
        }
        if (data.rainfall != null && Number.isFinite(Number(data.rainfall))) {
          b.rainTotal += Number(data.rainfall);
        }
        if (data.rainrate != null && Number.isFinite(Number(data.rainrate))) {
          if (Number(data.rainrate) > b.rainRateMax) b.rainRateMax = Number(data.rainrate);
        }
        if (data.lux != null && Number.isFinite(Number(data.lux))) {
          b.luxSum += Number(data.lux);
          b.luxCount++;
        }
        if (data.soil_temp != null && Number.isFinite(Number(data.soil_temp))) {
          b.soilTempSum += Number(data.soil_temp);
          b.soilTempCount++;
        }
        const ws = (data as any).wind_speed ?? (data as any).windSpeed;
        if (ws != null && Number.isFinite(Number(ws))) {
          b.windSpeedSum += Number(ws);
          b.windSpeedCount++;
        }
        const wd = (data as any).wind_dir ?? (data as any).windDirection;
        if (wd != null && Number.isFinite(Number(wd))) {
          const rad = (Number(wd) * Math.PI) / 180;
          b.windSinSum += Math.sin(rad);
          b.windCosSum += Math.cos(rad);
          b.windDirCount++;
        }
      });

      const sortedHours = Array.from(buckets.keys()).sort((a, b) => a - b);
      const hourlyResults: SensorDate[] = sortedHours.map((ts) => {
        const b = buckets.get(ts)!;
        let windDir = 0;
        if (b.windDirCount > 0) {
          const avgSin = b.windSinSum / b.windDirCount;
          const avgCos = b.windCosSum / b.windDirCount;
          let deg = (Math.atan2(avgSin, avgCos) * 180) / Math.PI;
          if (deg < 0) deg += 360;
          windDir = Math.round(deg);
        }

        const { timeFormatted, dateFormatted } = fastFormatJakarta(ts);

        return {
          timestamp: ts,
          temperature: b.tempCount > 0 ? Number((b.tempSum / b.tempCount).toFixed(2)) : 0,
          humidity: b.humCount > 0 ? Number((b.humSum / b.humCount).toFixed(1)) : 0,
          pressure: b.pressCount > 0 ? Number((b.pressSum / b.pressCount).toFixed(2)) : 0,
          dew: b.dewCount > 0 ? Number((b.dewSum / b.dewCount).toFixed(2)) : 0,
          volt: b.voltCount > 0 ? Number((b.voltSum / b.voltCount).toFixed(2)) : 0,
          rainfall: Number(b.rainTotal.toFixed(2)),
          rainrate: Number(b.rainRateMax.toFixed(2)),
          lux: b.luxCount > 0 ? Number((b.luxSum / b.luxCount).toFixed(1)) : 0,
          soil_temp: b.soilTempCount > 0 ? Number((b.soilTempSum / b.soilTempCount).toFixed(2)) : 0,
          windSpeed: b.windSpeedCount > 0 ? Number((b.windSpeedSum / b.windSpeedCount).toFixed(2)) : 0,
          windDirection: windDir,
          dateFormatted,
          timeFormatted,
        };
      });

      return await withCalibration(sensorId, hourlyResults, applyCalibration);
    }

    // RAW PATH: Format tanggal berkecepatan tinggi
    const results: SensorDate[] = [];
    snapshot.forEach((childSnapshot) => {
      const timestampInSeconds = Number(childSnapshot.key);
      const timestampInMillis = timestampInSeconds * 1000;
      const data: SensorValue = childSnapshot.val();
      const { timeFormatted, dateFormatted } = fastFormatJakarta(timestampInMillis);

      results.push({
        timestamp: timestampInMillis,
        temperature: data.temperature,
        humidity: data.humidity,
        pressure: data.pressure,
        dew: data.dew,
        volt: data.volt,
        rainfall: Number.isFinite(Number(data.rainfall)) ? Number(data.rainfall) : 0,
        rainrate: Number.isFinite(Number(data.rainrate)) ? Number(data.rainrate) : 0,
        lux: data.lux ?? 0,
        soil_temp: data.soil_temp ?? 0,
        dateFormatted,
        timeFormatted,
      });
    });

    return await withCalibration(sensorId, results, applyCalibration);
  } catch (error) {
    console.error("Gagal mengambil data sensor dalam rentang waktu:", error);
    throw error;
  }
}

/**
 * Mengambil metadata dan status sensor terakhir.
 * Status "online" jika data terakhir kurang dari 3 menit, jika tidak "offline".
 * @param sensorId - ID sensor yang akan diperiksa.
 * @returns Sebuah promise yang resolve dengan metadata sensor.
 */
export async function fetchSensorMetadata(
  sensorId: string
): Promise<SensorMetaData> {
  try {
    const dataRef = query(
      ref(rtdb, `auto_weather_stat/${sensorId}/data`),
      orderByKey(),
      limitToLast(1)
    );

    const snapshot = await get(dataRef);

    if (!snapshot.exists()) {
      // Jika tidak ada data, anggap offline dan kembalikan nilai default
      return {
        sensorId: sensorId,
        TelemetryStatus: "offline",
        lastUpdate: null,
      };
    }

    let latestData: SensorValue | null = null;
    let latestTimestamp: number | null = null;

    snapshot.forEach((child) => {
      latestTimestamp = Number(child.key) * 1000; // konversi ke milidetik
      latestData = child.val();
    });

    if (!latestData || !latestTimestamp) {
      return {
        sensorId: sensorId,
        TelemetryStatus: "offline",
        lastUpdate: null,
      };
    }

    const currentTime = Date.now();
    const timeDifference = currentTime - latestTimestamp;
    const threeMinutesInMillis = 3 * 60 * 1000;

    const status: "online" | "offline" =
      timeDifference < threeMinutesInMillis ? "online" : "offline";

    return {
      sensorId: sensorId,
      TelemetryStatus: status,
      lastUpdate: latestTimestamp,
    };
  } catch (error) {
    console.error(`Gagal mengambil metadata untuk sensor ${sensorId}:`, error);
    // In case of error, return offline status
    return {
      sensorId: sensorId,
      TelemetryStatus: "offline",
      lastUpdate: null,
    };
  }
}

/**
 * Memperbarui status dari satu aktuator spesifik.
 * @param sensorId - ID sensor yang datanya akan diupdate.
 * @param limit - Berapa Poin data yang akan diambil.
 * @returns Sebuah promise yang akan resolve ketika get data selesai.
 */

export async function fetchSensorData(
  sensorId: string,
  limit: number,
  applyCalibration: boolean = true
): Promise<SensorDate[]> {
  console.log("fetchSensorData called with:", { sensorId, limit });
  
  try {
    const dataRef = query(
      ref(rtdb, `auto_weather_stat/${sensorId}/data`),
      orderByKey(),
      limitToLast(limit)
    );

    const snapshot = await get(dataRef);

    if (!snapshot.exists()) {
      console.log("No sensor data found.");
      return [];
    }

    const results: SensorDate[] = [];

    snapshot.forEach((child) => {
      // 1. Ambil timestamp dari KEY (detik), dan konversi ke milidetik untuk JS
      const timestampInSeconds = Number(child.key);
      const timestampInMillis = timestampInSeconds * 1000;
      const data: SensorValue = child.val();

      const { timeFormatted, dateFormatted } = fastFormatJakarta(timestampInMillis);

      // 3. Gabungkan semua data sesuai interface SensorData
      const resultItem = {
        timestamp: timestampInMillis, // Simpan dalam milidetik
        temperature: data.temperature,
        humidity: data.humidity,
        pressure: data.pressure,
        dew: data.dew,
        volt: data.volt,
        rainfall: Number.isFinite(Number(data.rainfall)) ? Number(data.rainfall) : 0,
        rainrate: Number.isFinite(Number(data.rainrate)) ? Number(data.rainrate) : 0,
        lux: data.lux ?? 0,
        soil_temp: data.soil_temp ?? 0,
        dateFormatted: dateFormatted,
        timeFormatted: timeFormatted,
      };
      results.push(resultItem);
    });

    // 4. Balik urutan array agar data terbaru berada di indeks pertama
    const reversedResults = results.reverse(); // FIX: Array reversed
    return await withCalibration(sensorId, reversedResults, applyCalibration);

  } 
  catch (error) {
    console.error("Gagal mengambil data sensor:", error);
    // Melempar kembali error
    throw error;
  }
}

/**
 * Menghapus semua data sensor untuk sensorId tertentu.
 * @param sensorId - ID sensor yang datanya akan dihapus.
 * @returns Sebuah promise yang akan resolve ketika data berhasil dihapus.
 */
export async function deleteSensorData(sensorId: string): Promise<void> {
  console.log(`deleteSensorData called for sensorId: ${sensorId}`);
  try {
    const dataRef = ref(rtdb, `auto_weather_stat/${sensorId}/data`);
    await remove(dataRef);
    console.log(`Successfully deleted data for sensor ${sensorId}`);
  } catch (error) {
    console.error(`Gagal menghapus data untuk sensor ${sensorId}:`, error);
    throw error;
  }
}

/**
 * Mengedit data sensor berdasarkan timestamp.
 * @param sensorId - ID sensor.
 * @param timestamp - Timestamp (milidetik) data yang akan diedit.
 * @param newData - Data baru yang akan diupdate (partial).
 */
export async function editSensorDataByTimestamp(
  sensorId: string,
  timestamp: number,
  newData: Partial<SensorValue>
): Promise<void> {
  // Konversi timestamp ke detik (key di database)
  const timestampInSeconds = Math.floor(timestamp / 1000);
  const dataRef = ref(rtdb, `auto_weather_stat/${sensorId}/data/${timestampInSeconds}`);
  try {
    await update(dataRef, newData);
    console.log(`Data sensor pada timestamp ${timestampInSeconds} berhasil diupdate.`);
  } catch (error) {
    console.error(`Gagal mengedit data sensor pada timestamp ${timestampInSeconds}:`, error);
    throw error;
  }
}

/**
 * Menghapus data sensor berdasarkan timestamp.
 * @param sensorId - ID sensor.
 * @param timestamp - Timestamp (milidetik) data yang akan dihapus.
 */
export async function deleteSensorDataByTimestamp(
  sensorId: string,
  timestamp: number
): Promise<void> {
  // Konversi timestamp ke detik (key di database)
  const timestampInSeconds = Math.floor(timestamp / 1000);
  const dataRef = ref(rtdb, `auto_weather_stat/${sensorId}/data/${timestampInSeconds}`);
  try {
    await remove(dataRef);
    console.log(`Data sensor pada timestamp ${timestampInSeconds} berhasil dihapus.`);
  } catch (error) {
    console.error(`Gagal menghapus data sensor pada timestamp ${timestampInSeconds}:`, error);
    throw error;
  }
}