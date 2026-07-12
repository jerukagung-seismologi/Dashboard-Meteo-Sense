import { SensorDate, SensorValue } from "@/lib/FetchingSensorData";
import { getCalibrationDocument } from "./calibrationCrud";
import { applyCalibrationToSeries } from "./calibrationEngine";
import { StationCalibrationDocument } from "./calibrationTypes";

// Simple in-memory cache to prevent redundant Firestore reads within the same process/request
interface CacheEntry {
  config: StationCalibrationDocument | null;
  timestamp: number;
}
const calibrationCache = new Map<string, CacheEntry>();
const CACHE_TTL_MS = 60 * 1000; // 1 minute cache TTL

/**
 * Fetches config from cache or Firestore.
 */
async function getCachedCalibration(stationId: string): Promise<StationCalibrationDocument | null> {
  const now = Date.now();
  if (calibrationCache.has(stationId)) {
    const entry = calibrationCache.get(stationId)!;
    if (now - entry.timestamp < CACHE_TTL_MS) {
      return entry.config;
    }
  }

  const config = await getCalibrationDocument(stationId);
  calibrationCache.set(stationId, { config, timestamp: now });
  return config;
}

/**
 * Main entry point for Server Integration to apply calibration to an array of observations.
 * @param stationId The ID of the station/sensor
 * @param data Array of SensorDate or SensorValue objects (raw data)
 * @param useCalibration boolean toggle to enable or bypass calibration entirely
 * @returns Corrected array of data (or identical array if no calibration applied)
 */
export async function withCalibration<T extends SensorValue | SensorDate>(
  stationId: string,
  data: T[],
  useCalibration: boolean
): Promise<T[]> {
  if (!useCalibration || data.length === 0) {
    return data;
  }

  const config = await getCachedCalibration(stationId);
  
  if (!config || !config.enabled) {
    return data;
  }

  return applyCalibrationToSeries(data, config);
}
