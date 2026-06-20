// lib/climatology/aggregateDaily.ts
import { SensorDate } from "@/lib/FetchingSensorData";
import { AggregatedPoint } from "./climatologyTypes";
import { computeRainDeltas } from "./aggregateHourly";

export function aggregateDaily(rawPoints: SensorDate[]): AggregatedPoint[] {
  if (rawPoints.length === 0) return [];

  // Compute rain deltas on the sorted time series first
  const pointsWithDelta = computeRainDeltas(rawPoints);

  const groups = new Map<string, typeof pointsWithDelta>();

  for (const p of pointsWithDelta) {
    const d = new Date(p.timestamp);
    const yyyy = d.getUTCFullYear();
    const mm = String(d.getUTCMonth() + 1).padStart(2, "0");
    const dd = String(d.getUTCDate()).padStart(2, "0");
    const timeKey = `${yyyy}-${mm}-${dd}`; // e.g. "2026-06-20"
    if (!groups.has(timeKey)) {
      groups.set(timeKey, []);
    }
    groups.get(timeKey)!.push(p);
  }

  const result: AggregatedPoint[] = [];

  for (const [timeKey, items] of groups) {
    const count = items.length;
    if (count === 0) continue;

    let tempSum = 0;
    let tempMin = Infinity;
    let tempMax = -Infinity;

    let humSum = 0;
    let humMin = Infinity;
    let humMax = -Infinity;

    let pressSum = 0;
    let pressMin = Infinity;
    let pressMax = -Infinity;

    let rainAccum = 0;

    for (const item of items) {
      // Temperature
      tempSum += item.temperature;
      if (item.temperature < tempMin) tempMin = item.temperature;
      if (item.temperature > tempMax) tempMax = item.temperature;

      // Humidity
      humSum += item.humidity;
      if (item.humidity < humMin) humMin = item.humidity;
      if (item.humidity > humMax) humMax = item.humidity;

      // Pressure
      pressSum += item.pressure;
      if (item.pressure < pressMin) pressMin = item.pressure;
      if (item.pressure > pressMax) pressMax = item.pressure;

      // Rain
      rainAccum += item.rainDelta;
    }

    const tempMean = tempSum / count;

    // Standard deviation of Temperature
    let tempVarSum = 0;
    for (const item of items) {
      tempVarSum += Math.pow(item.temperature - tempMean, 2);
    }
    const tempStdDev = Math.sqrt(tempVarSum / count);

    // Start of UTC day epoch
    const [yyyy, mm, dd] = timeKey.split("-");
    const timestamp = Date.UTC(Number(yyyy), Number(mm) - 1, Number(dd), 0, 0, 0, 0);

    result.push({
      timeKey,
      timestamp,
      sampleCount: count,
      temperatureMean: Math.round(tempMean * 100) / 100,
      temperatureMax: Math.round(tempMax * 100) / 100,
      temperatureMin: Math.round(tempMin * 100) / 100,
      temperatureStdDev: Math.round(tempStdDev * 100) / 100,
      humidityMean: Math.round((humSum / count) * 100) / 100,
      humidityMax: Math.round(humMax * 100) / 100,
      humidityMin: Math.round(humMin * 100) / 100,
      pressureMean: Math.round((pressSum / count) * 100) / 100,
      pressureMax: Math.round(pressMax * 100) / 100,
      pressureMin: Math.round(pressMin * 100) / 100,
      rainfallAccumulation: Math.round(rainAccum * 100) / 100,
    });
  }

  return result.sort((a, b) => a.timeKey.localeCompare(b.timeKey));
}
