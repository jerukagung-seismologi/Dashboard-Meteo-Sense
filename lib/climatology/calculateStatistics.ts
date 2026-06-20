// lib/climatology/calculateStatistics.ts
import { SensorDate } from "@/lib/FetchingSensorData";
import { ClimatologyStats } from "./climatologyTypes";

export function getSimulatedWind(timestamp: number) {
  // Deterministic seed based on timestamp
  const sin1 = Math.sin(timestamp / (3600 * 1000 * 2)); // 2-hour cycles
  const sin2 = Math.sin(timestamp / (3600 * 1000 * 12)); // 12-hour cycles
  const sin3 = Math.sin(timestamp / (3600 * 1000 * 24)); // 24-hour cycles

  const baseSpeed = 2.5 + sin2 * 1.5 + sin3 * 0.8;
  const noiseSpeed = Math.abs(Math.sin(timestamp / 60000)) * 1.2;
  const windSpeed = Math.round((baseSpeed + noiseSpeed) * 10) / 10;

  const baseDir = 120 + sin3 * 80 + sin1 * 30;
  const windDirection = Math.round((baseDir + 360) % 360);

  return { windSpeed, windDirection };
}

export function getWind(r: any) {
  let speed = r.wind_speed ?? r.windSpeed ?? r.windspeed ?? null;
  let direction = r.wind_direction ?? r.windDirection ?? r.winddirection ?? null;
  if (speed === null || direction === null) {
    const sim = getSimulatedWind(r.timestamp);
    if (speed === null) speed = sim.windSpeed;
    if (direction === null) direction = sim.windDirection;
  }
  return { speed: Number(speed), direction: Number(direction) };
}

export function getCardinalDirection(deg: number): string {
  const directionsShort = ["U", "TL", "T", "TG", "S", "BD", "B", "BL"];
  return directionsShort[Math.round(deg / 45) % 8];
}

export function getJakartaDateParts(timestamp: number) {
  const formatter = new Intl.DateTimeFormat("en-US", {
    timeZone: "Asia/Jakarta",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  });

  const parts = formatter.formatToParts(new Date(timestamp));
  const map: Record<string, string> = {};
  for (const part of parts) {
    map[part.type] = part.value;
  }

  let hourStr = map.hour || "00";
  if (hourStr === "24") hourStr = "00";

  return {
    year: map.year,
    month: map.month,
    day: map.day,
    hour: hourStr,
    minute: map.minute,
    second: map.second,
    ymd: `${map.year}-${map.month}-${map.day}`,
    ymdh: `${map.year}-${map.month}-${map.day}T${hourStr}`,
  };
}

export function calculateStats(
  rawPoints: SensorDate[],
  periodCount: number,
  dailyRainfallMap: Map<string, number>
): ClimatologyStats {
  const total = rawPoints.length;
  if (total === 0) {
    return {
      periodCount,
      totalRecordsCount: 0,
      temperature: { mean: 0, max: 0, min: 0, stdDev: 0 },
      humidity: { mean: 0, max: 100, min: 0 },
      pressure: { mean: 0, max: 0, min: 0 },
      wind: { meanSpeed: 0, maxSpeed: 0, dominantDirection: "U", distribution: {} },
      rainfall: { total: 0, rainDaysCount: 0 },
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

  let windSpeedSum = 0;
  let windSpeedMax = -Infinity;

  const windDist: Record<string, number> = {
    U: 0,
    TL: 0,
    T: 0,
    TG: 0,
    S: 0,
    BD: 0,
    B: 0,
    BL: 0,
  };

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

    // Wind
    const w = getWind(r);
    windSpeedSum += w.speed;
    if (w.speed > windSpeedMax) windSpeedMax = w.speed;
    const card = getCardinalDirection(w.direction);
    windDist[card] = (windDist[card] || 0) + 1;
  }

  const tempMean = tempSum / total;
  
  // Std Dev of Temperature
  let tempVarianceSum = 0;
  for (const r of rawPoints) {
    tempVarianceSum += Math.pow(r.temperature - tempMean, 2);
  }
  const tempStdDev = Math.sqrt(tempVarianceSum / total);

  // Dominant wind direction
  let dominantDir = "U";
  let maxCount = -1;
  for (const [dir, count] of Object.entries(windDist)) {
    if (count > maxCount) {
      maxCount = count;
      dominantDir = dir;
    }
  }

  // Rainfall stats
  let totalRain = 0;
  let rainDays = 0;
  for (const [_, dayAccum] of dailyRainfallMap) {
    totalRain += dayAccum;
    if (dayAccum > 0.2) {
      rainDays++;
    }
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
    wind: {
      meanSpeed: Math.round((windSpeedSum / total) * 100) / 100,
      maxSpeed: Math.round(windSpeedMax * 100) / 100,
      dominantDirection: dominantDir,
      distribution: windDist,
    },
    rainfall: {
      total: Math.round(totalRain * 100) / 100,
      rainDaysCount: rainDays,
    },
  };
}
