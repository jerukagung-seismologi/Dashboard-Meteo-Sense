// lib/bias-correction/preprocessing/hourlyAggregation.ts
import type { SensorDate } from "@/lib/FetchingSensorData";
import type { AWSRawObservation } from "@/lib/bias-correction/types";

/**
 * Aggregates high-frequency sub-minute station sensor data into hourly bins.
 * Uses meteorological standards:
 * - Scalar means for temperature, humidity, pressure, dew point, voltage, lux, soil temp.
 * - Circular vector decomposition (sin/cos) for wind direction.
 * - Cumulative sum for rainfall.
 * - Max value for rain rate.
 */
export function aggregateSensorToHourly(records: SensorDate[]): SensorDate[] {
  if (!records || records.length === 0) return [];

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

  for (let i = 0; i < records.length; i++) {
    const r = records[i];
    if (!r || !r.timestamp) continue;
    // Floor to nearest hour (3600 * 1000 ms)
    const hourTs = Math.floor(r.timestamp / 3600000) * 3600000;
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

    if (r.temperature != null && Number.isFinite(Number(r.temperature))) {
      b.tempSum += Number(r.temperature);
      b.tempCount++;
    }
    if (r.humidity != null && Number.isFinite(Number(r.humidity))) {
      b.humSum += Number(r.humidity);
      b.humCount++;
    }
    if (r.pressure != null && Number.isFinite(Number(r.pressure))) {
      b.pressSum += Number(r.pressure);
      b.pressCount++;
    }
    const dew = r.dew ?? (r.temperature != null && r.humidity != null ? r.temperature - ((100 - r.humidity) / 5) : null);
    if (dew != null && Number.isFinite(Number(dew))) {
      b.dewSum += Number(dew);
      b.dewCount++;
    }
    if (r.volt != null && Number.isFinite(Number(r.volt))) {
      b.voltSum += Number(r.volt);
      b.voltCount++;
    }
    if (r.rainfall != null && Number.isFinite(Number(r.rainfall))) {
      b.rainTotal += Number(r.rainfall);
    }
    if (r.rainrate != null && Number.isFinite(Number(r.rainrate))) {
      if (Number(r.rainrate) > b.rainRateMax) b.rainRateMax = Number(r.rainrate);
    }
    if (r.lux != null && Number.isFinite(Number(r.lux))) {
      b.luxSum += Number(r.lux);
      b.luxCount++;
    }
    if (r.soil_temp != null && Number.isFinite(Number(r.soil_temp))) {
      b.soilTempSum += Number(r.soil_temp);
      b.soilTempCount++;
    }
    const ws = (r as any).wind_speed ?? (r as any).windSpeed;
    if (ws != null && Number.isFinite(Number(ws))) {
      b.windSpeedSum += Number(ws);
      b.windSpeedCount++;
    }
    const wd = (r as any).wind_dir ?? (r as any).windDirection;
    if (wd != null && Number.isFinite(Number(wd))) {
      const rad = (Number(wd) * Math.PI) / 180;
      b.windSinSum += Math.sin(rad);
      b.windCosSum += Math.cos(rad);
      b.windDirCount++;
    }
  }

  const sortedHours = Array.from(buckets.keys()).sort((a, b) => a - b);
  return sortedHours.map(ts => {
    const b = buckets.get(ts)!;
    let windDir = 0;
    if (b.windDirCount > 0) {
      const avgSin = b.windSinSum / b.windDirCount;
      const avgCos = b.windCosSum / b.windDirCount;
      let deg = (Math.atan2(avgSin, avgCos) * 180) / Math.PI;
      if (deg < 0) deg += 360;
      windDir = Math.round(deg);
    }

    const d = new Date(ts);
    const dateFormatted = d.toLocaleString("id-ID", {
      timeZone: "Asia/Jakarta",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    }).replace(/\./g, ":");

    const timeFormatted = d.toLocaleString("id-ID", {
      timeZone: "Asia/Jakarta",
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    }).replace(/\./g, ":");

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
}

/**
 * Converts SensorDate[] directly to AWSRawObservation[] format used by the bias correction pipeline.
 */
export function mapSensorToAWSRawObservations(sensorRecords: SensorDate[]): AWSRawObservation[] {
  return sensorRecords.map(r => ({
    timestamp: r.timestamp,
    temperature_raw: r.temperature ?? null,
    humidity_raw: r.humidity ?? null,
    dew_point_raw: r.dew ?? (r.temperature != null && r.humidity != null ? r.temperature - ((100 - r.humidity) / 5) : null),
    pressure_raw: r.pressure ?? null,
    wind_speed_raw: (r as any).windSpeed ?? (r as any).wind_speed ?? 0,
    wind_direction_raw: (r as any).windDirection ?? (r as any).wind_dir ?? 0,
    precipitation_raw: r.rainfall ?? 0,
  }));
}
