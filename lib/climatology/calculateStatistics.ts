// lib/climatology/calculateStatistics.ts
import { SensorDate } from "@/lib/FetchingSensorData";
import { AggregatedPoint, ClimatologyStats } from "./climatologyTypes";

export function calculateStats(
  rawPoints: SensorDate[],
  dailyPoints: AggregatedPoint[],
  hourlyPoints: AggregatedPoint[],
  isHourly: boolean
): ClimatologyStats {
  const total = rawPoints.length;
  const periodCount = isHourly ? hourlyPoints.length : dailyPoints.length;

  if (total === 0) {
    return {
      periodCount,
      totalRecordsCount: 0,
      temperature: { mean: 0, max: 0, min: 0, stdDev: 0 },
      humidity: { mean: 0, max: 100, min: 0 },
      pressure: { mean: 0, max: 0, min: 0 },
      rainfall: { total: 0, rainDaysCount: 0, maxDailyRainfall: 0 },
    };
  }

  let tempSum = 0;
  let tempMin = Infinity;
  let tempMax = -Infinity;

  let humSum = 0;
  let humMin = Infinity;
  let humMax = -Infinity;

  let pressSum = 0;
  let pressMin = Infinity;
  let pressMax = -Infinity;

  for (const r of rawPoints) {
    // Temperature
    tempSum += r.temperature;
    if (r.temperature < tempMin) tempMin = r.temperature;
    if (r.temperature > tempMax) tempMax = r.temperature;

    // Humidity
    humSum += r.humidity;
    if (r.humidity < humMin) humMin = r.humidity;
    if (r.humidity > humMax) humMax = r.humidity;

    // Pressure
    pressSum += r.pressure;
    if (r.pressure < pressMin) pressMin = r.pressure;
    if (r.pressure > pressMax) pressMax = r.pressure;
  }

  const tempMean = tempSum / total;

  // Temperature Standard Deviation
  let tempVarSum = 0;
  for (const r of rawPoints) {
    tempVarSum += Math.pow(r.temperature - tempMean, 2);
  }
  const tempStdDev = Math.sqrt(tempVarSum / total);

  // Rainfall Stats
  let totalRain = 0;
  let rainDaysCount = 0;
  let maxDailyRainfall = 0;

  if (isHourly) {
    // Daily preset: aggregated hourly
    totalRain = hourlyPoints.reduce((acc, p) => acc + p.rainfallAccumulation, 0);
    maxDailyRainfall = totalRain;
    rainDaysCount = totalRain > 0.2 ? 1 : 0;
  } else {
    // Weekly, Monthly, Yearly preset: aggregated daily
    totalRain = dailyPoints.reduce((acc, p) => acc + p.rainfallAccumulation, 0);
    maxDailyRainfall = dailyPoints.reduce((max, p) => p.rainfallAccumulation > max ? p.rainfallAccumulation : max, 0);
    rainDaysCount = dailyPoints.filter((p) => p.rainfallAccumulation > 0.2).length;
  }

  return {
    periodCount,
    totalRecordsCount: total,
    temperature: {
      mean: Math.round(tempMean * 100) / 100,
      max: Math.round(tempMax * 100) / 100,
      min: Math.round(tempMin * 100) / 100,
      stdDev: Math.round(tempStdDev * 100) / 100,
    },
    humidity: {
      mean: Math.round((humSum / total) * 100) / 100,
      max: Math.round(humMax * 100) / 100,
      min: Math.round(humMin * 100) / 100,
    },
    pressure: {
      mean: Math.round((pressSum / total) * 100) / 100,
      max: Math.round(pressMax * 100) / 100,
      min: Math.round(pressMin * 100) / 100,
    },
    rainfall: {
      total: Math.round(totalRain * 100) / 100,
      rainDaysCount,
      maxDailyRainfall: Math.round(maxDailyRainfall * 100) / 100,
    },
  };
}
