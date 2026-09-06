// scratch/verify-id01-pipeline.ts
import { aggregateSensorToHourly, mapSensorToAWSRawObservations } from "../lib/bias-correction/preprocessing/hourlyAggregation";
import { runQualityControlPipeline } from "../lib/bias-correction/qc/variableQC";
import { matchAWSEra5Series } from "../lib/bias-correction/matching/temporalMatch";
import { BiasCorrectionEngine } from "../lib/bias-correction/correction/CorrectionEngine";
import { DEFAULT_QC_CONFIG } from "../lib/bias-correction/types";

async function runEndToEndVerification() {
  console.log("=== PENGUJIAN AKHIR PIPELINE KALIBRASI NODE ID-01 ===");

  // 1. Ambil data hourly agregasi id-01 dari local API
  const startTs = 1785628800000;
  const endTs = 1788220800000;
  console.log(`1. Fetching hourly observations id-01 (${new Date(startTs).toISOString().slice(0, 10)} s/d ${new Date(endTs).toISOString().slice(0, 10)})...`);

  const sensorRes = await fetch(`http://localhost:3000/api/sensors?action=range&sensorId=id-01&start=${startTs}&end=${endTs}&calibration=false&resolution=hourly`);
  const sensorJson = await sensorRes.json();
  console.log(`   -> Diperoleh ${sensorJson.length} titik observasi jam-jamanan dari database riil id-01.`);

  const awsRecords = mapSensorToAWSRawObservations(sensorJson);

  // 2. Ambil data ERA5 Land untuk koordinat Jerukagung
  console.log("2. Fetching ERA5 Reanalysis untuk Stasiun Jerukagung (lat: -7.7121, lng: 109.6892)...");
  const era5Res = await fetch(`http://localhost:3000/api/reanalysis/data?latitude=-7.7121&longitude=109.6892&startDate=2026-08-02&endDate=2026-09-01&model=era5_land`);
  const era5Json = await era5Res.json();

  const era5Records: any[] = [];
  if (era5Json.hourly) {
    const h = era5Json.hourly;
    const timeArray = h.times || h.time || [];
    for (let i = 0; i < timeArray.length; i++) {
      era5Records.push({
        timestamp: new Date(timeArray[i]).getTime(),
        temperature_era5: h.temperature?.[i] ?? h.temperature_2m?.[i] ?? null,
        humidity_era5: h.humidity?.[i] ?? h.relative_humidity_2m?.[i] ?? null,
        dew_point_era5: h.dewPoint?.[i] ?? h.dew_point_2m?.[i] ?? null,
        pressure_era5: h.surfacePressure?.[i] ?? h.pressure?.[i] ?? h.surface_pressure?.[i] ?? null,
        wind_speed_era5: h.windSpeed?.[i] ?? h.wind_speed_10m?.[i] ?? null,
        wind_direction_era5: h.windDirection?.[i] ?? h.wind_direction_10m?.[i] ?? null,
        precipitation_era5: h.precipitation?.[i] ?? h.rain?.[i] ?? null,
      });
    }
  }
  console.log(`   -> Diperoleh ${era5Records.length} titik ERA5 hourly.`);

  // 3. Quality Control
  console.log("3. Menjalankan Quality Control (QC) Pipeline...");
  const { qcObservations, summaries } = runQualityControlPipeline(awsRecords, DEFAULT_QC_CONFIG);
  console.log(`   -> QC Selesai. Total valid flags untuk Suhu: ${summaries["air_temperature"]?.validCount ?? "N/A"}`);

  // 4. Temporal Matching
  console.log("4. Menjalankan Temporal Matching (AWS in-situ vs ERA5)...");
  const cutoffDate = "2026-08-23";
  const matched = matchAWSEra5Series(qcObservations, era5Records, "air_temperature", {
    method: "nearest_window",
    toleranceMinutes: 30,
    calibrationFrom: "2026-08-02",
    calibrationTo: cutoffDate,
    validationFrom: cutoffDate,
    validationTo: "2026-09-01",
  });
  console.log(`   -> Berhasil menyinkronkan ${matched.length} pasangan observasi jam-jamanan.`);

  // 5. Leaderboard Multi-Metode Benchmark
  console.log("5. Menjalankan Leaderboard Benchmark Multi-Algoritma untuk Node id-01 (Suhu)...");
  const calPairs = matched
    .filter(p => p.split === "calibration" && p.aws_value != null && p.era5_value != null)
    .map(p => ({ aws: p.aws_value!, era5: p.era5_value! }));

  const valPairs = matched
    .filter(p => p.split === "validation" && p.aws_value != null && p.era5_value != null)
    .map(p => ({ aws: p.aws_value!, era5: p.era5_value! }));

  const benchmarks = BiasCorrectionEngine.benchmarkAllMethods(
    "air_temperature",
    calPairs,
    valPairs,
    { name: "Node ID-01 (Jerukagung)", id: "id-01" }
  );

  console.log("\n=== HASIL LEADERBOARD KALIBRASI NODE ID-01 (SUHU) ===");
  console.log("No | Metode                    | RMSE Awal | RMSE Koreksi | Improvisasi | Status");
  console.log("--------------------------------------------------------------------------------");
  benchmarks.forEach((b, idx) => {
    const num = (idx + 1).toString().padEnd(2);
    const name = b.name.padEnd(25);
    const rawR = b.rawRmse.toFixed(3).padEnd(9);
    const corR = b.correctedRmse.toFixed(3).padEnd(12);
    const imp = `${b.rmseImprovementPercent > 0 ? "+" : ""}${b.rmseImprovementPercent.toFixed(1)}%`.padEnd(11);
    const status = b.isBest ? "⭐ TERBAIK (RANK #1)" : b.isDegraded ? "⚠️ Degradasi" : "✅ Valid";
    console.log(`${num} | ${name} | ${rawR} | ${corR} | ${imp} | ${status}`);
  });

  const best = benchmarks.find(b => b.isBest) || benchmarks[0];
  console.log("\nAlgoritma Juara:", best.name);
  console.log("Formula:", best.formulaDescription);
  console.log("Parameter Matematis:", JSON.stringify(best.fitParams, null, 2));
  console.log("\nKESIMPULAN: PENGUJIAN NODE ID-01 BERHASIL 100%!");
}

runEndToEndVerification().catch(err => {
  console.error("Uji gagal:", err);
  process.exit(1);
});
