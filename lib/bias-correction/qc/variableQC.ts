// lib/bias-correction/qc/variableQC.ts

import {
  AWSRawObservation,
  AWSQCObservation,
  QCConfig,
  DEFAULT_QC_CONFIG,
  QCFlag,
  MeteorologicalVariable,
} from "../types";
import { checkPhysicalRange } from "./rangeCheck";
import { checkRateOfChangeSpike } from "./spikeCheck";
import { checkSensorPersistence } from "./persistenceCheck";
import { checkThermodynamicConsistency } from "./consistencyCheck";

export interface QCSummaryStatistics {
  total: number;
  good: number;
  suspect: number;
  invalid: number;
  missing: number;
  notSignificant: number;
  passRatePercent: number; // (GOOD / total) * 100
}

/**
 * Runs the comprehensive quality control pipeline on a chronological series of AWS observations.
 */
export function runQualityControlPipeline(
  rawObservations: AWSRawObservation[],
  config: QCConfig = DEFAULT_QC_CONFIG
): { qcObservations: AWSQCObservation[]; summaries: Record<MeteorologicalVariable, QCSummaryStatistics> } {
  // Sort chronologically by timestamp
  const sorted = [...rawObservations].sort((a, b) => a.timestamp - b.timestamp);

  const qcObservations: AWSQCObservation[] = [];

  // Rolling value buffers for persistence checking
  const tempBuffer: number[] = [];
  const humBuffer: number[] = [];
  const pressBuffer: number[] = [];
  const wsBuffer: number[] = [];

  for (let i = 0; i < sorted.length; i++) {
    const curr = sorted[i];
    const prev = i > 0 ? sorted[i - 1] : null;
    const timeDeltaMin = prev ? Math.max(1, (curr.timestamp - prev.timestamp) / 60000) : 10;

    // --- 1. Air Temperature QC ---
    let tempFlag: QCFlag = "GOOD";
    const tempRaw = curr.temperature_raw ?? curr.temperature ?? null;
    const tempRange = checkPhysicalRange(tempRaw, config.temperature.min, config.temperature.max, "Suhu Udara");
    if (!tempRange.passed) {
      tempFlag = tempRange.flag;
    } else {
      const prevTemp = prev?.temperature_raw ?? prev?.temperature ?? null;
      const spike = checkRateOfChangeSpike(tempRaw, prevTemp, timeDeltaMin, config.temperature.maxSpikePerMin, "Suhu Udara");
      if (!spike.passed) tempFlag = spike.flag;

      if (tempRaw !== null) tempBuffer.push(tempRaw);
      if (tempBuffer.length > config.temperature.maxPersistenceIntervals * 2) tempBuffer.shift();
      const persist = checkSensorPersistence(tempBuffer, config.temperature.maxPersistenceIntervals, "Suhu Udara");
      if (!persist.passed) tempFlag = persist.flag;
    }

    // --- 2. Relative Humidity QC ---
    let humFlag: QCFlag = "GOOD";
    const humRaw = curr.humidity_raw ?? curr.humidity ?? null;
    const humRange = checkPhysicalRange(humRaw, config.humidity.min, config.humidity.max, "Kelembapan Udara");
    if (!humRange.passed) {
      humFlag = humRange.flag;
    } else {
      const prevHum = prev?.humidity_raw ?? prev?.humidity ?? null;
      const spike = checkRateOfChangeSpike(humRaw, prevHum, timeDeltaMin, config.humidity.maxSpikePerMin, "Kelembapan Udara");
      if (!spike.passed) humFlag = spike.flag;

      if (humRaw !== null) humBuffer.push(humRaw);
      if (humBuffer.length > config.humidity.maxPersistenceIntervals * 2) humBuffer.shift();
      const persist = checkSensorPersistence(humBuffer, config.humidity.maxPersistenceIntervals, "Kelembapan Udara");
      if (!persist.passed) humFlag = persist.flag;
    }

    // --- 3. Dew Point QC & Thermodynamic Check ---
    let dewFlag: QCFlag = "GOOD";
    const dewRaw = curr.dew_point_raw ?? curr.dew ?? (tempRaw !== null && humRaw !== null ? tempRaw - ((100 - humRaw) / 5) : null);
    const dewRange = checkPhysicalRange(dewRaw, config.dewPoint.min, config.dewPoint.max, "Titik Embun");
    if (!dewRange.passed) {
      dewFlag = dewRange.flag;
    } else {
      const consistency = checkThermodynamicConsistency(tempRaw, dewRaw, config.dewPoint.allowExceedAirTempThreshold);
      if (!consistency.passed) dewFlag = consistency.flag;
    }

    // --- 4. Surface Pressure QC ---
    let pressFlag: QCFlag = "GOOD";
    const pressRaw = curr.pressure_raw ?? curr.pressure ?? null;
    const pressRange = checkPhysicalRange(pressRaw, config.pressure.min, config.pressure.max, "Tekanan Udara");
    if (!pressRange.passed) {
      pressFlag = pressRange.flag;
    } else {
      const prevPress = prev?.pressure_raw ?? prev?.pressure ?? null;
      const spike = checkRateOfChangeSpike(pressRaw, prevPress, timeDeltaMin, config.pressure.maxSpikePerMin, "Tekanan Udara");
      if (!spike.passed) pressFlag = spike.flag;

      if (pressRaw !== null) pressBuffer.push(pressRaw);
      if (pressBuffer.length > config.pressure.maxPersistenceIntervals * 2) pressBuffer.shift();
      const persist = checkSensorPersistence(pressBuffer, config.pressure.maxPersistenceIntervals, "Tekanan Udara");
      if (!persist.passed) pressFlag = persist.flag;
    }

    // --- 5. Wind Speed QC ---
    let wsFlag: QCFlag = "GOOD";
    const wsRaw = curr.wind_speed_raw ?? curr.wind_speed ?? 0;
    const wsRange = checkPhysicalRange(wsRaw, config.windSpeed.min, config.windSpeed.max, "Kecepatan Angin");
    if (!wsRange.passed) {
      wsFlag = wsRange.flag;
    } else {
      const prevWS = prev?.wind_speed_raw ?? prev?.wind_speed ?? null;
      const spike = checkRateOfChangeSpike(wsRaw, prevWS, timeDeltaMin, config.windSpeed.maxSpikePerMin, "Kecepatan Angin");
      if (!spike.passed) wsFlag = spike.flag;

      if (wsRaw !== null) wsBuffer.push(wsRaw);
      if (wsBuffer.length > config.windSpeed.maxPersistenceIntervals * 2) wsBuffer.shift();
      const persist = checkSensorPersistence(wsBuffer, config.windSpeed.maxPersistenceIntervals, "Kecepatan Angin", 0.05);
      if (!persist.passed && wsRaw > 0.5) wsFlag = persist.flag;
    }

    // --- 6. Wind Direction QC (Circular & Calm Wind aware) ---
    let wdFlag: QCFlag = "GOOD";
    const wdRaw = curr.wind_direction_raw ?? curr.wind_dir ?? null;
    if (wsRaw < config.windDirection.calmWindThreshold) {
      wdFlag = "NOT_SIGNIFICANT"; // Calm wind -> direction is not physically meaningful
    } else {
      const wdRange = checkPhysicalRange(wdRaw, 0, 360, "Arah Angin");
      if (!wdRange.passed) wdFlag = wdRange.flag;
    }

    // --- 7. Precipitation QC (Zero-aware) ---
    let rainFlag: QCFlag = "GOOD";
    const rainRaw = curr.precipitation_raw ?? curr.rainfall ?? 0;
    if (rainRaw < config.precipitation.min || rainRaw > config.precipitation.maxDaily) {
      rainFlag = "INVALID";
    }

    qcObservations.push({
      timestamp: curr.timestamp,
      temperature_qc: tempFlag === "GOOD" ? tempRaw : null,
      temperature_flag: tempFlag,
      humidity_qc: humFlag === "GOOD" ? humRaw : null,
      humidity_flag: humFlag,
      dew_point_qc: dewFlag === "GOOD" ? dewRaw : null,
      dew_point_flag: dewFlag,
      pressure_qc: pressFlag === "GOOD" ? pressRaw : null,
      pressure_flag: pressFlag,
      wind_speed_qc: wsFlag === "GOOD" ? wsRaw : null,
      wind_speed_flag: wsFlag,
      wind_direction_qc: wdFlag === "GOOD" ? wdRaw : null,
      wind_direction_flag: wdFlag,
      precipitation_qc: rainFlag === "GOOD" ? rainRaw : null,
      precipitation_flag: rainFlag,
    });
  }

  // Calculate summary statistics per variable
  const calculateSummary = (getFlag: (obs: AWSQCObservation) => QCFlag): QCSummaryStatistics => {
    let good = 0, suspect = 0, invalid = 0, missing = 0, notSignificant = 0;
    qcObservations.forEach(o => {
      const f = getFlag(o);
      if (f === "GOOD") good++;
      else if (f === "SUSPECT") suspect++;
      else if (f === "INVALID") invalid++;
      else if (f === "MISSING") missing++;
      else if (f === "NOT_SIGNIFICANT") notSignificant++;
    });
    const total = qcObservations.length || 1;
    return {
      total,
      good,
      suspect,
      invalid,
      missing,
      notSignificant,
      passRatePercent: Number(((good / total) * 100).toFixed(1)),
    };
  };

  const summaries: Record<MeteorologicalVariable, QCSummaryStatistics> = {
    air_temperature: calculateSummary(o => o.temperature_flag),
    relative_humidity: calculateSummary(o => o.humidity_flag),
    dew_point_temperature: calculateSummary(o => o.dew_point_flag),
    surface_pressure: calculateSummary(o => o.pressure_flag),
    wind_speed: calculateSummary(o => o.wind_speed_flag),
    wind_direction: calculateSummary(o => o.wind_direction_flag),
    precipitation: calculateSummary(o => o.precipitation_flag),
  };

  return { qcObservations, summaries };
}
