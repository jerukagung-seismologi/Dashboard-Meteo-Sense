// lib/fetchSensorData.ts
import { rtdb } from "@/lib/ConfigFirebase"; // Mengimpor instance Realtime Database yang sudah diinisialisasi
import {
  ref,
  query,
  orderByKey,
  limitToLast,
  get,
  remove
} from "firebase/database"; // Ini adalah fungsi-fungsi dari Firebase Realtime Database SDK

export interface SensorValue {
  temperature: number;
  humidity: number;
  pressure: number;
  dew: number;
  volt: number;
}

export interface SensorDate extends SensorValue {
  timestamp: number; // UNIX timestamp in milliseconds
  dateFormatted: string; // Optional, if you want to store a formatted date
  timeFormatted: string;
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
): Promise<SensorDate[]> {
  console.log("fetchSensorData called with:", { sensorId, limit });
  try {
    const dataRef = query(
      ref(rtdb, `auto_weather_stat/${sensorId}/data`),
      orderByKey(),
      limitToLast(limit)
    );

    const snapshot = await get(dataRef);
    console.log("Firebase snapshot exists:", snapshot.exists());
    if (!snapshot.exists()) {
      console.log("No sensor data found.");
      return [];
    }

    const results: SensorDate[] = [];

    snapshot.forEach((child) => {
      // 1. Ambil timestamp dari KEY (detik), dan konversi ke milidetik untuk JS
      const timestampInSeconds = Number(child.key);
      const timestampInMillis = timestampInSeconds * 1000;
      console.log("Processing timestamp (ms):", timestampInMillis);
      const data: SensorValue = child.val();
      console.log("Sensor value from child:", data);

      // 2. Format waktu menggunakan timestamp yang benar
      const formattedTime = new Date(timestampInMillis).toLocaleString(
        'id-ID',
        {
          timeZone: "Asia/Jakarta", // Pastikan zona waktu sesuai
          hour: "2-digit",
          minute: "2-digit",
          second: "2-digit",
          hour12: false,
        }
      ).replace(/\./g, ':');  //replace untuk mengganti titik dengan titik dua
      console.log("Formatted time:", formattedTime);
      // 2.1 Format tanggal jika diperlukan
      const dateFormatted = new Date(timestampInMillis).toLocaleString(
        'id-ID',
        {
          timeZone: "Asia/Jakarta", // Pastikan zona waktu sesuai
          year: 'numeric',
          month: '2-digit',
          day: '2-digit',
          hour: "2-digit",
          minute: "2-digit",
          second: "2-digit",
          hour12: false,
        }
      ).replace(/\./g, ':');  //replace untuk mengganti titik dengan titik dua
      console.log("Formatted time:", formattedTime);
      // 3. Gabungkan semua data sesuai interface SensorData
      const resultItem = {
        timestamp: timestampInMillis, // Simpan dalam milidetik
        temperature: data.temperature,
        humidity: data.humidity,
        pressure: data.pressure,
        dew: data.dew,
        volt: data.volt,
        dateFormatted: dateFormatted,
        timeFormatted: formattedTime,
      };
      console.log("Pushing item to results:", resultItem);
      results.push(resultItem);
    });

    // 4. Balik urutan array agar data terbaru berada di indeks pertama
    const reversedResults = results;
    return reversedResults;

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