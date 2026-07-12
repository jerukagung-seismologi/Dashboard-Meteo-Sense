import { SensorDate, SensorValue } from "@/lib/FetchingSensorData";
import { StationCalibrationDocument, SensorVariableCalibration } from "./calibrationTypes";
import { applyMathCorrection, enforceBoundaries } from "./calibrationRules";

/**
 * Validates if an object is likely a SensorDate or SensorValue.
 */
function isDataRecord(obj: any): boolean {
  return obj && typeof obj === "object" && ("temperature" in obj || "humidity" in obj);
}

/**
 * Applies calibration config to a single data record (SensorValue or SensorDate)
 * without modifying the original object (pure function).
 */
export function applyCalibrationToRecord<T extends SensorValue | SensorDate>(
  record: T,
  config: StationCalibrationDocument
): T {
  if (!config.enabled) return record;

  const correctedRecord = { ...record } as Record<string, any>;

  for (const [key, value] of Object.entries(record)) {
    // Only process numerical values that have a corresponding config entry
    if (typeof value === "number") {
      const varConfig = (config as any)[key] as SensorVariableCalibration | undefined;
      
      if (varConfig && varConfig.enabled) {
        let correctedValue = applyMathCorrection(value, varConfig);
        correctedValue = enforceBoundaries(key, correctedValue);
        
        // Optional Configurable Logging (only log in dev or if explicit logging flag is true, omitted for perf)
        // console.log(`[Calibration] ${config.stationId} | ${key}: ${value} -> ${correctedValue} (${varConfig.method})`);
        
        correctedRecord[key] = correctedValue;
      }
    }
  }

  return correctedRecord as T;
}

/**
 * Applies calibration to an array of data records.
 */
export function applyCalibrationToSeries<T extends SensorValue | SensorDate>(
  series: T[],
  config: StationCalibrationDocument
): T[] {
  if (!config.enabled || series.length === 0) return series;
  return series.map(record => applyCalibrationToRecord(record, config));
}
