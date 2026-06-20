// lib/climatology/aggregateHourly.ts
import { SensorDate } from "@/lib/FetchingSensorData";
import { AggregatedPoint } from "./climatologyTypes";
import { getJakartaDateParts, getWind, getCardinalDirection } from "./calculateStatistics";

// Get epoch timestamp in Asia/Jakarta (UTC+7) timezone
export function getJakartaEpoch(year: string, month: string, day: string, hour: string = "00"): number {
  return Date.parse(`${year}-${month}-${day}T${hour}:00:00+07:00`);
}

export function aggregateHourly(rawPoints: SensorDate[]): AggregatedPoint[] {
  const groups = new Map<string, SensorDate[]>();

  for (const r of rawPoints) {
    const parts = getJakartaDateParts(r.timestamp);
    const key = parts.ymdh;
    if (!groups.has(key)) {
      groups.set(key, []);
    }
    groups.get(key)!.push(r);
  }

  const result: AggregatedPoint[] = [];

  for (const [ymdh, items] of groups) {
    const count = items.length;
    if (count === 0) continue;

    // Sort items chronologically to compute rainfall and wind speed correctly
    items.sort((a, b) => a.timestamp - b.timestamp);

    let tempSum = 0;
    let tempMin = Infinity;
    let tempMax = -Infinity;

    let humSum = 0;
    let humMin = Infinity;
    let humMax = -Infinity;

    let pressSum = 0;
    let pressMin = Infinity;
    let pressMax = -Infinity;

    let windSpeedSum = 0;
    let windSpeedMax = -Infinity;
    const windDist: Record<string, number> = {};

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

      // Wind
      const w = getWind(item);
      windSpeedSum += w.speed;
      if (w.speed > windSpeedMax) windSpeedMax = w.speed;
      const card = getCardinalDirection(w.direction);
      windDist[card] = (windDist[card] || 0) + 1;
    }

    const tempMean = tempSum / count;

    // Std Dev
    let tempVarSum = 0;
    for (const item of items) {
      tempVarSum += Math.pow(item.temperature - tempMean, 2);
    }
    const tempStdDev = Math.sqrt(tempVarSum / count);

    // Dominant wind direction in this hour
    let dominantWindDir = "U";
    let maxCount = -1;
    for (const [dir, count] of Object.entries(windDist)) {
      if (count > maxCount) {
        maxCount = count;
        dominantWindDir = dir;
      }
    }

    // Rainfall hourly accumulation (positive delta method)
    let rainAccum = 0;
    for (let i = 1; i < items.length; i++) {
      const diff = items[i].rainfall - items[i - 1].rainfall;
      if (diff >= 0) {
        rainAccum += diff;
      } else {
        rainAccum += items[i].rainfall;
      }
    }

    // Extract year, month, day, hour from key: YYYY-MM-DDTHH
    const [ymd, hour] = ymdh.split("T");
    const [yyyy, mm, dd] = ymd.split("-");
    const epoch = getJakartaEpoch(yyyy, mm, dd, hour);

    result.push({
      timeKey: ymdh,
      timestamp: epoch,
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
      windSpeedMean: Math.round((windSpeedSum / count) * 100) / 100,
      windSpeedMax: Math.round(windSpeedMax * 100) / 100,
      windDirectionDominant: dominantWindDir,
      rainfallAccumulation: Math.round(rainAccum * 100) / 100,
    });
  }

  return result.sort((a, b) => a.timeKey.localeCompare(b.timeKey));
}
