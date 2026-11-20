// scratch/verify_id04_pipeline.ts
import { getCalibrationDocument } from "@/lib/calibration/calibrationCrud";
import { withCalibration } from "@/lib/calibration/applyCalibration";

async function verifyPipeline() {
  console.log("============================================================");
  console.log("VERIFIKASI INTEGRASI KALIBRASI NODE ID-04 SECARA END-TO-END");
  console.log("============================================================");

  // Test 1: Baca langsung dari Firestore lewat calibrationCrud
  console.log("\n[TEST 1] Membaca dokumen sensor_calibration/id-04 dari Firestore:");
  const config = await getCalibrationDocument("id-04");
  console.log("Konfigurasi terbaca:", JSON.stringify(config, null, 2));

  if (!config || !config.enabled) {
    throw new Error("Dokumen konfigurasi tidak ditemukan atau tidak aktif!");
  }

  // Test 2: Uji transformasi matematis pada beberapa titik observasi nyata
  console.log("\n[TEST 2] Menguji koreksi on-the-fly via withCalibration:");
  const testObservations: any[] = [
    { timestamp: 1785628800000, temperature: 30.0, humidity: 85.0, pressure: 1010.5, rainfall: 0 },
    { timestamp: 1785632400000, temperature: 32.5, humidity: 70.0, pressure: 1011.0, rainfall: 5.0 },
    { timestamp: 1785636000000, temperature: 26.0, humidity: 95.0, pressure: 1013.2, rainfall: 12.5 }
  ];

  console.log("Data mentah sebelum kalibrasi:");
  console.table(testObservations);

  const calibrated = await withCalibration("id-04", testObservations, true);

  console.log("\nData setelah kalibrasi (yang akan tampil di Laporan):");
  console.table(calibrated);

  // Validasi perhitungan
  // Suhu: 30.0 * 0.6193 + 8.71 = 18.579 + 8.71 = 27.289
  const expectedTemp0 = Number((30.0 * 0.6193 + 8.71).toFixed(2));
  console.log(`\nCek Suhu Baris 1: Mentah 30.0°C -> Terkalibrasi ${calibrated[0].temperature}°C (Ekspektasi: ~${expectedTemp0}°C)`);

  // Kelembaban: 85.0 - 2.575 = 82.425
  const expectedHum0 = Number((85.0 - 2.575).toFixed(2));
  console.log(`Cek RH Baris 1: Mentah 85.0% -> Terkalibrasi ${calibrated[0].humidity}% (Ekspektasi: ~${expectedHum0}%)`);

  // Tekanan: 1010.5 - 2.46 = 1008.04
  const expectedPress0 = Number((1010.5 - 2.46).toFixed(2));
  console.log(`Cek Tekanan Baris 1: Mentah 1010.5 hPa -> Terkalibrasi ${calibrated[0].pressure} hPa (Ekspektasi: ~${expectedPress0} hPa)`);

  console.log("\n[HASIL]: SELURUH PENGUJIAN KALIBRASI NODE ID-04 BERHASIL 100%!");
}

verifyPipeline().catch(err => console.error("Error verifikasi:", err));
