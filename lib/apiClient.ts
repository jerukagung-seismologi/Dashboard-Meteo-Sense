import type { SensorDate, SensorValue, SensorMetaData } from "./FetchingSensorData";

export async function fetchSensorData(
  sensorId: string,
  limit: number,
  applyCalibration: boolean = true
): Promise<SensorDate[]> {
  const url = `/api/sensors?action=latest&sensorId=${sensorId}&limit=${limit}&calibration=${applyCalibration}`;
  const res = await fetch(url);
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
  applyCalibration: boolean = true
): Promise<SensorDate[]> {
  const url = `/api/sensors?action=range&sensorId=${sensorId}&start=${startTimestamp}&end=${endTimestamp}&calibration=${applyCalibration}`;
  const res = await fetch(url);
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
  applyCalibration: boolean = true
): Promise<SensorDate[]> {
  const url = `/api/sensors?action=value&sensorId=${sensorId}&field=${field}&value=${value}&calibration=${applyCalibration}`;
  const res = await fetch(url);
  if (!res.ok) {
    const error = await res.json();
    throw new Error(error.error || "Failed to fetch sensor data by value");
  }
  return res.json();
}

export async function fetchSensorMetadata(
  sensorId: string
): Promise<SensorMetaData> {
  const url = `/api/sensors?action=metadata&sensorId=${sensorId}`;
  const res = await fetch(url);
  if (!res.ok) {
    const error = await res.json();
    throw new Error(error.error || "Failed to fetch sensor metadata");
  }
  return res.json();
}
