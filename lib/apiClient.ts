import type { SensorDate, SensorValue, SensorMetaData } from "./FetchingSensorData";

export async function fetchSensorData(
  sensorId: string,
  limit: number,
  applyCalibration: boolean = true,
  forceRefresh: boolean = false
): Promise<SensorDate[]> {
  const url = `/api/sensors?action=latest&sensorId=${sensorId}&limit=${limit}&calibration=${applyCalibration}${forceRefresh ? `&refresh=true&_t=${Date.now()}` : ""}`;
  const res = await fetch(url, forceRefresh ? { cache: 'no-store' } : undefined);
  if (!res.ok) {
    const error = await res.json();
    throw new Error(error.error || "Failed to fetch sensor data");
  }
  return res.json();
}

export async function fetchSensorDataByDateRange(
  sensorId: string,
  startTimestamp: number,
  endTimestamp: number,
  applyCalibration: boolean = true,
  forceRefresh: boolean = false
): Promise<SensorDate[]> {
  const url = `/api/sensors?action=range&sensorId=${sensorId}&start=${startTimestamp}&end=${endTimestamp}&calibration=${applyCalibration}${forceRefresh ? `&refresh=true&_t=${Date.now()}` : ""}`;
  const res = await fetch(url, forceRefresh ? { cache: 'no-store' } : undefined);
  if (!res.ok) {
    const error = await res.json();
    throw new Error(error.error || "Failed to fetch sensor data by date range");
  }
  return res.json();
}

export async function fetchSensorDataByValue(
  sensorId: string,
  field: string,
  value: number,
  applyCalibration: boolean = true,
  forceRefresh: boolean = false
): Promise<SensorDate[]> {
  const url = `/api/sensors?action=value&sensorId=${sensorId}&field=${field}&value=${value}&calibration=${applyCalibration}${forceRefresh ? `&refresh=true&_t=${Date.now()}` : ""}`;
  const res = await fetch(url, forceRefresh ? { cache: 'no-store' } : undefined);
  if (!res.ok) {
    const error = await res.json();
    throw new Error(error.error || "Failed to fetch sensor data by value");
  }
  return res.json();
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
