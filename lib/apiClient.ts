import type { SensorDate, SensorValue, SensorMetaData } from "@/lib/FetchingSensorData";
import {
  decompressTimeSeries,
  compressTimeSeries,
  type CompactTimeSeries,
  type DownsampleOptions,
} from "@/lib/compression/adaptiveTimeSeries";

export { decompressTimeSeries, compressTimeSeries };
export type { CompactTimeSeries, DownsampleOptions };

export async function fetchSensorData(
  sensorId: string,
  limit: number,
  applyCalibration: boolean = true,
  forceRefresh: boolean = false,
  compact: boolean = false,
  maxPoints: number = 300
): Promise<SensorDate[]> {
  const url = `/api/sensors?action=latest&sensorId=${sensorId}&limit=${limit}&calibration=${applyCalibration}${compact ? `&compact=true&maxPoints=${maxPoints}` : ""}${forceRefresh ? `&refresh=true&_t=${Date.now()}` : ""}`;
  const res = await fetch(url, forceRefresh ? { cache: 'no-store' } : undefined);
  if (!res.ok) {
    const error = await res.json();
    throw new Error(error.error || "Failed to fetch sensor data");
  }
  const payload = await res.json();
  return compact ? decompressTimeSeries(payload) : payload;
}

export async function fetchSensorDataByDateRange(
  sensorId: string,
  startTimestamp: number,
  endTimestamp: number,
  applyCalibration: boolean = true,
  forceRefresh: boolean = false,
  resolution?: "hourly" | "raw",
  compact: boolean = false,
  maxPoints: number = 300
): Promise<SensorDate[]> {
  const url = `/api/sensors?action=range&sensorId=${sensorId}&start=${startTimestamp}&end=${endTimestamp}&calibration=${applyCalibration}${resolution ? `&resolution=${resolution}` : ""}${compact ? `&compact=true&maxPoints=${maxPoints}` : ""}${forceRefresh ? `&refresh=true&_t=${Date.now()}` : ""}`;
  const res = await fetch(url, forceRefresh ? { cache: 'no-store' } : undefined);
  if (!res.ok) {
    const error = await res.json();
    throw new Error(error.error || "Failed to fetch sensor data by date range");
  }
  const payload = await res.json();
  return compact ? decompressTimeSeries(payload) : payload;
}

export async function fetchSensorDataByValue(
  sensorId: string,
  field: string,
  value: number,
  applyCalibration: boolean = true,
  forceRefresh: boolean = false,
  compact: boolean = false,
  maxPoints: number = 300
): Promise<SensorDate[]> {
  const url = `/api/sensors?action=value&sensorId=${sensorId}&field=${field}&value=${value}&calibration=${applyCalibration}${compact ? `&compact=true&maxPoints=${maxPoints}` : ""}${forceRefresh ? `&refresh=true&_t=${Date.now()}` : ""}`;
  const res = await fetch(url, forceRefresh ? { cache: 'no-store' } : undefined);
  if (!res.ok) {
    const error = await res.json();
    throw new Error(error.error || "Failed to fetch sensor data by value");
  }
  const payload = await res.json();
  return compact ? decompressTimeSeries(payload) : payload;
}

export async function fetchSensorMetadata(
  sensorId: string,
  forceRefresh: boolean = false
): Promise<SensorMetaData> {
  const url = `/api/sensors?action=metadata&sensorId=${sensorId}${forceRefresh ? `&refresh=true&_t=${Date.now()}` : ""}`;
  const res = await fetch(url, forceRefresh ? { cache: 'no-store' } : undefined);
  if (!res.ok) {
    const error = await res.json();
    throw new Error(error.error || "Failed to fetch sensor metadata");
  }
  return res.json();
}
