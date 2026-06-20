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
  let tempCount = 0;
  let tempMin = Infinity;
  let tempMax = -Infinity;

  let humSum = 0;
  let humCount = 0;
  let humMin = Infinity;
  let humMax = -Infinity;

  let pressSum = 0;
  let pressCount = 0;
  let pressMin = Infinity;
  let pressMax = -Infinity;

  for (const r of rawPoints) {
    // Temperature
    const t = Number(r.temperature);
    if (Number.isFinite(t)) {
      tempSum += t;
      tempCount++;
      if (t < tempMin) tempMin = t;
      if (t > tempMax) tempMax = t;
    }

    // Humidity
    const h = Number(r.humidity);
    if (Number.isFinite(h)) {
      humSum += h;
      humCount++;
      if (h < humMin) humMin = h;
      if (h > humMax) humMax = h;
    }

    // Pressure
    const p = Number(r.pressure);
    if (Number.isFinite(p)) {
      pressSum += p;
      pressCount++;
      if (p < pressMin) pressMin = p;
      if (p > pressMax) pressMax = p;
    }
  }

  const tempMean = tempCount > 0 ? tempSum / tempCount : 0;
  const tempFinalMin = tempMin === Infinity ? 0 : tempMin;
  const tempFinalMax = tempMax === -Infinity ? 0 : tempMax;

  // Temperature Standard Deviation
  let tempVarSum = 0;
  let tempVarCount = 0;
  for (const r of rawPoints) {
    const t = Number(r.temperature);
    if (Number.isFinite(t)) {
      tempVarSum += Math.pow(t - tempMean, 2);
      tempVarCount++;
    }
  }
  const tempStdDev = tempVarCount > 0 ? Math.sqrt(tempVarSum / tempVarCount) : 0;

  // Rainfall Stats
  let totalRain = 0;
  let rainDaysCount = 0;
  let maxDailyRainfall = 0;

  if (isHourly) {
    totalRain = hourlyPoints.reduce((acc, p) => acc + (Number.isFinite(p.rainfallAccumulation) ? p.rainfallAccumulation : 0), 0);
    maxDailyRainfall = totalRain;
    rainDaysCount = totalRain > 0.2 ? 1 : 0;
  } else {
    totalRain = dailyPoints.reduce((acc, p) => acc + (Number.isFinite(p.rainfallAccumulation) ? p.rainfallAccumulation : 0), 0);
    maxDailyRainfall = dailyPoints.reduce((max, p) => {
      const r = Number(p.rainfallAccumulation);
      return Number.isFinite(r) && r > max ? r : max;
    }, 0);
    rainDaysCount = dailyPoints.filter((p) => Number.isFinite(p.rainfallAccumulation) && p.rainfallAccumulation > 0.2).length;
  }

  return {
    periodCount,
    totalRecordsCount: total,
    temperature: {
      mean: Math.round(tempMean * 100) / 100,
      max: Math.round(tempFinalMax * 100) / 100,
      min: Math.round(tempFinalMin * 100) / 100,
      stdDev: Math.round(tempStdDev * 100) / 100,
    },
    humidity: {
      mean: Math.round((humSum / (humCount || 1)) * 100) / 100,
      max: humMax === -Infinity ? 100 : Math.round(humMax * 100) / 100,
      min: humMin === Infinity ? 0 : Math.round(humMin * 100) / 100,
    },
    pressure: {
      mean: Math.round((pressSum / (pressCount || 1)) * 100) / 100,
      max: pressMax === -Infinity ? 0 : Math.round(pressMax * 100) / 100,
      min: pressMin === Infinity ? 0 : Math.round(pressMin * 100) / 100,
    },
    rainfall: {
      total: Math.round(totalRain * 100) / 100,
      rainDaysCount,
      maxDailyRainfall: Math.round(maxDailyRainfall * 100) / 100,
    },
  };
}
