// lib/climatology/aggregateHourly.ts
import { SensorDate } from "@/lib/FetchingSensorData";
import { AggregatedPoint } from "./climatologyTypes";

export function computeRainDeltas(rawPoints: SensorDate[]): (SensorDate & { rainDelta: number })[] {
  const sorted = [...rawPoints].sort((a, b) => a.timestamp - b.timestamp);
  return sorted.map((p, index) => {
    if (index === 0) {
      return { ...p, rainDelta: 0 };
    }
    // Handle resets: if current cumulative value is less than previous, it was a reset, so delta is current value
    const diff = p.rainfall - sorted[index - 1].rainfall;
    const rainDelta = diff >= 0 ? diff : p.rainfall;
    return { ...p, rainDelta };
  });
}

export function aggregateHourly(rawPoints: SensorDate[]): AggregatedPoint[] {
  if (rawPoints.length === 0) return [];

  // Compute rain deltas on the sorted time series first
  const pointsWithDelta = computeRainDeltas(rawPoints);

  const groups = new Map<string, typeof pointsWithDelta>();

  for (const p of pointsWithDelta) {
    // Round down to the UTC hour
    const hourStart = new Date(Math.floor(p.timestamp / (3600 * 1000)) * (3600 * 1000));
    const timeKey = hourStart.toISOString().substring(0, 13); // e.g. "2026-06-20T18"
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

    // Start of the UTC hour epoch milliseconds
    const [ymd, hour] = timeKey.split("T");
    const [yyyy, mm, dd] = ymd.split("-");
    const timestamp = Date.UTC(Number(yyyy), Number(mm) - 1, Number(dd), Number(hour), 0, 0, 0);

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
