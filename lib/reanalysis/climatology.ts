// lib/reanalysis/climatology.ts
import { getWibTimeParts } from "../climatology/aggregateAnalysis";
import { calculateStats, ParameterStats } from "./statistics";
import { calculateMonthlyBaselines, computeAnomalies, AnomalyPoint } from "./anomalies";
import { calculateWindRose, WindRoseBin } from "./windRose";

export interface ReanalysisDataPoint {
  timestamp: number; // UTC ms
  temperature: number;
  humidity: number;
  dewPoint: number;
  surfacePressure: number;
  mslPressure: number;
  rain: number;
  windSpeed: number; // m/s
  windGust: number;
  windDirection: number;
  cloudCover: number;
  shortwaveRad: number;
  longwaveRad: number;
  soilTemp: number;
  soilMoisture: number;
  cape: number;
}

export interface DiurnalProfile {
  hour: string; // "00" to "23"
  temperature: number;
  humidity: number;
  pressure: number;
  windSpeed: number;
  rain: number;
}

export interface ClimatologySummary {
  latitude: number;
  longitude: number;
  elevation: number;
  timezone: string;
  startDate: string;
  endDate: string;
  current: {
    temperature: number;
    tempMax: number;
    tempMin: number;
    humidity: number;
    humMax: number;
    humMin: number;
    pressure: number;
    pressMax: number;
    pressMin: number;
    windSpeed: number;
    windGust: number;
    windDirection: number;
    rainHourly: number;
    rainAccumulated: number;
  };
  stats: {
    temperature: ParameterStats;
    humidity: ParameterStats;
    pressure: ParameterStats;
    windSpeed: ParameterStats;
    rain: ParameterStats;
  };
  diurnal: DiurnalProfile[];
  weekly: {
    days: string[]; // DD/MM labels
    temperature: { min: number[]; mean: number[]; max: number[] };
    humidity: { min: number[]; mean: number[]; max: number[] };
    pressure: { min: number[]; mean: number[]; max: number[] };
    windSpeed: { min: number[]; mean: number[]; max: number[] };
  };
  monthly: {
    months: string[]; // Month name labels
    temperature: { min: number[]; mean: number[]; max: number[] };
    humidity: { min: number[]; mean: number[]; max: number[] };
    pressure: { min: number[]; mean: number[]; max: number[] };
    rain: number[];
  };
  annual: {
    days: string[]; // YYYY-MM-DD
    temperatureMean: number[];
    humidityMean: number[];
    pressureMean: number[];
    rainAccumulated: number[];
  };
  anomalies: {
    temperature: AnomalyPoint[];
    pressure: AnomalyPoint[];
    rain: AnomalyPoint[];
  };
  hovmoller: {
    days: string[];
    hours: string[];
    temperature: (number | null)[][];
    humidity: (number | null)[][];
    pressure: (number | null)[][];
    rain: (number | null)[][];
  };
  windRose: WindRoseBin[];
  scatter: {
    pressureVsRainfall: [number, number][]; // [pressure, rain] daily averages
    tempVsHumidity: [number, number][]; // [temp, humidity] daily averages
  };
  radiation: {
    dailyTotal: number[]; // Shortwave daily sum
    diurnalCycle: number[]; // 24-hour mean profile
  };
  cape: {
    max: number;
    mean: number;
    series: number[]; // hourly convective potential
  };
  diagnostics: {
    meanDewPointDepression: number;
    maxDewPointDepression: number;
    diurnalDewPointDepression: number[];
    meanBarometricTendency3h: number;
    maxBarometricTendency3h: number;
  };
  hourly: {
    times: string[];
    temperature: number[];
    humidity: number[];
    pressure: number[];
    rain: number[];
    windSpeed: number[];
    windGust: number[];
    radiation: number[];
  };
}

export function processERA5Hourly(rawJson: any): ClimatologySummary {
  const latitude = rawJson.latitude || 0;
  const longitude = rawJson.longitude || 0;
  const elevation = rawJson.elevation || 0;
  const timezone = rawJson.timezone || "GMT";

  const rawHourly = rawJson.hourly || {};
  const times: string[] = rawHourly.time || [];
  
  // Extract lists (with fallback array of same length)
  const len = times.length;
  const getArray = (key: string): number[] => rawHourly[key] || Array(len).fill(0);

  const rawTemp = getArray("temperature_2m");
  const rawHum = getArray("relative_humidity_2m");
  const rawDew = getArray("dew_point_2m");
  const rawSurfPress = getArray("surface_pressure");
  const rawMslPress = getArray("pressure_msl");
  const rawRain = getArray("rain");
  // Check if wind speed is in km/h or m/s. Open-Meteo returns km/h by default unless wind_speed_unit=ms is passed.
  // We will pass wind_speed_unit=ms to API, but let's make sure we handle values safely
  const rawWindSpeed = getArray("wind_speed_10m");
  const rawWindGust = getArray("wind_gusts_10m");
  const rawWindDir = getArray("wind_direction_10m");
  const rawCloud = getArray("cloud_cover");
  const rawShortwave = getArray("shortwave_radiation");
  const rawLongwave = Array(len).fill(0);
  const rawSoilTemp = getArray("soil_temperature_0_to_7cm");
  const rawSoilMoist = getArray("soil_moisture_0_to_7cm");
  const rawCape = rawHourly.cape || Array(len).fill(0); // Optional convective potential

  // 1. Map to structured timeline array
  const points: ReanalysisDataPoint[] = [];
  for (let i = 0; i < len; i++) {
    const timeStr = times[i];
    const timestamp = new Date(timeStr + "Z").getTime() - (7 * 3600 * 1000); // adjust since open-meteo response has local or UTC keys. Z appending treats it as UTC.
    
    points.push({
      timestamp: new Date(timeStr + ":00.000Z").getTime(), // Treat time key as UTC epoch source
      temperature: rawTemp[i],
      humidity: rawHum[i],
      dewPoint: rawDew[i],
      surfacePressure: rawSurfPress[i],
      mslPressure: rawMslPress[i],
      rain: rawRain[i],
      windSpeed: rawWindSpeed[i],
      windGust: rawWindGust[i],
      windDirection: rawWindDir[i],
      cloudCover: rawCloud[i],
      shortwaveRad: rawShortwave[i],
      longwaveRad: rawLongwave[i],
      soilTemp: rawSoilTemp[i],
      soilMoisture: rawSoilMoist[i],
      cape: rawCape[i]
    });
  }

  // Ensure points are sorted chronologically
  points.sort((a, b) => a.timestamp - b.timestamp);

  // 2. Statistics Panel calculations
  const stats = {
    temperature: calculateStats(points.map(p => p.temperature)),
    humidity: calculateStats(points.map(p => p.humidity)),
    pressure: calculateStats(points.map(p => p.mslPressure)),
    windSpeed: calculateStats(points.map(p => p.windSpeed)),
    rain: calculateStats(points.map(p => p.rain))
  };

  // 3. Current Conditions / Latest observation
  const latest = points[len - 1] || {
    temperature: 0, humidity: 0, mslPressure: 0, windSpeed: 0, windGust: 0, windDirection: 0, rain: 0
  };
  const todayStart = Date.now() - 24 * 3600 * 1000;
  const todayPoints = points.filter(p => p.timestamp >= todayStart);
  
  const current = {
    temperature: latest.temperature,
    tempMax: stats.temperature.max,
    tempMin: stats.temperature.min,
    humidity: latest.humidity,
    humMax: stats.humidity.max,
    humMin: stats.humidity.min,
    pressure: latest.mslPressure,
    pressMax: stats.pressure.max,
    pressMin: stats.pressure.min,
    windSpeed: latest.windSpeed,
    windGust: latest.windGust,
    windDirection: latest.windDirection,
    rainHourly: latest.rain,
    rainAccumulated: todayPoints.reduce((acc, p) => acc + p.rain, 0)
  };

  // 4. Diurnal Profiles (24 hours)
  const diurnalSum = Array(24).fill(0);
  const diurnalCount = Array(24).fill(0);
  const diurnalHumSum = Array(24).fill(0);
  const diurnalPressSum = Array(24).fill(0);
  const diurnalWindSum = Array(24).fill(0);
  const diurnalRainSum = Array(24).fill(0);

  for (const p of points) {
    const wib = getWibTimeParts(p.timestamp);
    const hIdx = Number(wib.hour);
    if (hIdx >= 0 && hIdx < 24) {
      diurnalSum[hIdx] += p.temperature;
      diurnalHumSum[hIdx] += p.humidity;
      diurnalPressSum[hIdx] += p.mslPressure;
      diurnalWindSum[hIdx] += p.windSpeed;
      diurnalRainSum[hIdx] += p.rain;
      diurnalCount[hIdx]++;
    }
  }

  const diurnal: DiurnalProfile[] = Array.from({ length: 24 }, (_, hIdx) => {
    const count = diurnalCount[hIdx] || 1;
    const hourLabel = String(hIdx).padStart(2, "0");
    return {
      hour: `${hourLabel}:00`,
      temperature: Math.round((diurnalSum[hIdx] / count) * 100) / 100,
      humidity: Math.round((diurnalHumSum[hIdx] / count) * 100) / 100,
      pressure: Math.round((diurnalPressSum[hIdx] / count) * 100) / 100,
      windSpeed: Math.round((diurnalWindSum[hIdx] / count) * 100) / 100,
      rain: Math.round((diurnalRainSum[hIdx] / count) * 100) / 100
    };
  });

  // 5. Weekly Trend (aggregated over latest 7 days in the dataset)
  const last7DaysStart = points.length > 168 ? points[points.length - 169].timestamp : points[0]?.timestamp || 0;
  const weeklyPoints = points.filter(p => p.timestamp >= last7DaysStart);
  
  const weeklyGroups = new Map<string, number[]>();
  const weeklyHumGroups = new Map<string, number[]>();
  const weeklyPressGroups = new Map<string, number[]>();
  const weeklyWindGroups = new Map<string, number[]>();

  for (const p of weeklyPoints) {
    const wib = getWibTimeParts(p.timestamp);
    const dayKey = wib.dayLabel; // e.g. "20/06"
    if (!weeklyGroups.has(dayKey)) {
      weeklyGroups.set(dayKey, []);
      weeklyHumGroups.set(dayKey, []);
      weeklyPressGroups.set(dayKey, []);
      weeklyWindGroups.set(dayKey, []);
    }
    weeklyGroups.get(dayKey)!.push(p.temperature);
    weeklyHumGroups.get(dayKey)!.push(p.humidity);
    weeklyPressGroups.get(dayKey)!.push(p.mslPressure);
    weeklyWindGroups.get(dayKey)!.push(p.windSpeed);
  }

  const weekly = {
    days: Array.from(weeklyGroups.keys()),
    temperature: { min: [] as number[], mean: [] as number[], max: [] as number[] },
    humidity: { min: [] as number[], mean: [] as number[], max: [] as number[] },
    pressure: { min: [] as number[], mean: [] as number[], max: [] as number[] },
    windSpeed: { min: [] as number[], mean: [] as number[], max: [] as number[] }
  };

  for (const day of weekly.days) {
    const temps = weeklyGroups.get(day) || [];
    const hums = weeklyHumGroups.get(day) || [];
    const press = weeklyPressGroups.get(day) || [];
    const winds = weeklyWindGroups.get(day) || [];

    const getAgg = (arr: number[]) => ({
      min: arr.length > 0 ? Math.min(...arr) : 0,
      max: arr.length > 0 ? Math.max(...arr) : 0,
      mean: arr.length > 0 ? arr.reduce((a, b) => a + b, 0) / arr.length : 0
    });

    const t = getAgg(temps);
    weekly.temperature.min.push(Math.round(t.min * 10) / 10);
    weekly.temperature.max.push(Math.round(t.max * 10) / 10);
    weekly.temperature.mean.push(Math.round(t.mean * 10) / 10);

    const h = getAgg(hums);
    weekly.humidity.min.push(Math.round(h.min * 10) / 10);
    weekly.humidity.max.push(Math.round(h.max * 10) / 10);
    weekly.humidity.mean.push(Math.round(h.mean * 10) / 10);

    const pr = getAgg(press);
    weekly.pressure.min.push(Math.round(pr.min * 10) / 10);
    weekly.pressure.max.push(Math.round(pr.max * 10) / 10);
    weekly.pressure.mean.push(Math.round(pr.mean * 10) / 10);

    const w = getAgg(winds);
    weekly.windSpeed.min.push(Math.round(w.min * 10) / 10);
    weekly.windSpeed.max.push(Math.round(w.max * 10) / 10);
    weekly.windSpeed.mean.push(Math.round(w.mean * 10) / 10);
  }

  // 6. Monthly Trend Analysis (group daily items by calendar month name)
  const monthLabels = ["Jan", "Feb", "Mar", "Apr", "Mei", "Jun", "Jul", "Agu", "Sep", "Okt", "Nov", "Des"];
  const monthlyGroups = Array.from({ length: 12 }, () => [] as number[]);
  const monthlyHumGroups = Array.from({ length: 12 }, () => [] as number[]);
  const monthlyPressGroups = Array.from({ length: 12 }, () => [] as number[]);
  const monthlyRainSums = Array(12).fill(0);

  for (const p of points) {
    const wib = getWibTimeParts(p.timestamp);
    const mIdx = Number(wib.month) - 1; // 0 to 11
    if (mIdx >= 0 && mIdx < 12) {
      monthlyGroups[mIdx].push(p.temperature);
      monthlyHumGroups[mIdx].push(p.humidity);
      monthlyPressGroups[mIdx].push(p.mslPressure);
      monthlyRainSums[mIdx] += p.rain;
    }
  }

  const monthly = {
    months: monthLabels,
    temperature: { min: [] as number[], mean: [] as number[], max: [] as number[] },
    humidity: { min: [] as number[], mean: [] as number[], max: [] as number[] },
    pressure: { min: [] as number[], mean: [] as number[], max: [] as number[] },
    rain: monthlyRainSums.map(v => Math.round(v * 10) / 10)
  };

  for (let i = 0; i < 12; i++) {
    const temps = monthlyGroups[i];
    const hums = monthlyHumGroups[i];
    const press = monthlyPressGroups[i];

    const getAgg = (arr: number[]) => ({
      min: arr.length > 0 ? Math.min(...arr) : 0,
      max: arr.length > 0 ? Math.max(...arr) : 0,
      mean: arr.length > 0 ? arr.reduce((a, b) => a + b, 0) / arr.length : 0
    });

    const t = getAgg(temps);
    monthly.temperature.min.push(Math.round(t.min * 10) / 10);
    monthly.temperature.max.push(Math.round(t.max * 10) / 10);
    monthly.temperature.mean.push(Math.round(t.mean * 10) / 10);

    const h = getAgg(hums);
    monthly.humidity.min.push(Math.round(h.min * 10) / 10);
    monthly.humidity.max.push(Math.round(h.max * 10) / 10);
    monthly.humidity.mean.push(Math.round(h.mean * 10) / 10);

    const pr = getAgg(press);
    monthly.pressure.min.push(Math.round(pr.min * 10) / 10);
    monthly.pressure.max.push(Math.round(pr.max * 10) / 10);
    monthly.pressure.mean.push(Math.round(pr.mean * 10) / 10);
  }

  // 7. Annual Trend (Daily average values)
  const dailyTemp: Record<string, number[]> = {};
  const dailyHum: Record<string, number[]> = {};
  const dailyPress: Record<string, number[]> = {};
  const dailyRain: Record<string, number> = {};

  for (const p of points) {
    const wib = getWibTimeParts(p.timestamp);
    const dayKey = wib.ymd;
    if (!dailyTemp[dayKey]) {
      dailyTemp[dayKey] = [];
      dailyHum[dayKey] = [];
      dailyPress[dayKey] = [];
      dailyRain[dayKey] = 0;
    }
    dailyTemp[dayKey].push(p.temperature);
    dailyHum[dayKey].push(p.humidity);
    dailyPress[dayKey].push(p.mslPressure);
    dailyRain[dayKey] += p.rain;
  }

  const annualDays = Object.keys(dailyTemp).sort();
  const annual = {
    days: annualDays,
    temperatureMean: annualDays.map(d => {
      const arr = dailyTemp[d];
      return Math.round((arr.reduce((a, b) => a + b, 0) / arr.length) * 10) / 10;
    }),
    humidityMean: annualDays.map(d => {
      const arr = dailyHum[d];
      return Math.round((arr.reduce((a, b) => a + b, 0) / arr.length) * 10) / 10;
    }),
    pressureMean: annualDays.map(d => {
      const arr = dailyPress[d];
      return Math.round((arr.reduce((a, b) => a + b, 0) / arr.length) * 10) / 10;
    }),
    rainAccumulated: [] as number[]
  };

  let cumulativeRain = 0;
  for (const d of annualDays) {
    cumulativeRain += dailyRain[d];
    annual.rainAccumulated.push(Math.round(cumulativeRain * 10) / 10);
  }

  // 8. Anomalies
  const tempBaselines = calculateMonthlyBaselines(points.map(p => ({ timestamp: p.timestamp, value: p.temperature })));
  const pressBaselines = calculateMonthlyBaselines(points.map(p => ({ timestamp: p.timestamp, value: p.mslPressure })));
  const rainBaselines = calculateMonthlyBaselines(points.map(p => ({ timestamp: p.timestamp, value: p.rain })));

  const anomalies = {
    temperature: computeAnomalies(points.map(p => ({ timestamp: p.timestamp, value: p.temperature })), tempBaselines),
    pressure: computeAnomalies(points.map(p => ({ timestamp: p.timestamp, value: p.mslPressure })), pressBaselines),
    rain: computeAnomalies(points.map(p => ({ timestamp: p.timestamp, value: p.rain })), rainBaselines)
  };

  // 9. Hovmöller Diagrams (Days on X-axis, Hours on Y-axis)
  const hovDaysSet = new Set<string>();
  for (const p of points) {
    const wib = getWibTimeParts(p.timestamp);
    hovDaysSet.add(wib.ymd);
  }
  const hovDays = Array.from(hovDaysSet).sort();
  const hovHours = Array.from({ length: 24 }, (_, i) => String(i).padStart(2, "0"));

  const hovTemp = Array.from({ length: 24 }, () => Array(hovDays.length).fill(null));
  const hovHum = Array.from({ length: 24 }, () => Array(hovDays.length).fill(null));
  const hovPress = Array.from({ length: 24 }, () => Array(hovDays.length).fill(null));
  const hovRain = Array.from({ length: 24 }, () => Array(hovDays.length).fill(null));

  for (const p of points) {
    const wib = getWibTimeParts(p.timestamp);
    const dayIdx = hovDays.indexOf(wib.ymd);
    const hourIdx = Number(wib.hour);

    if (dayIdx !== -1 && hourIdx >= 0 && hourIdx < 24) {
      hovTemp[hourIdx][dayIdx] = Math.round(p.temperature * 10) / 10;
      hovHum[hourIdx][dayIdx] = Math.round(p.humidity * 10) / 10;
      hovPress[hourIdx][dayIdx] = Math.round(p.mslPressure * 10) / 10;
      hovRain[hourIdx][dayIdx] = Math.round(p.rain * 100) / 100;
    }
  }

  const hovmoller = {
    days: hovDays,
    hours: hovHours,
    temperature: hovTemp,
    humidity: hovHum,
    pressure: hovPress,
    rain: hovRain
  };

  // 10. Wind Rose calculation
  const windRose = calculateWindRose(
    points.map(p => p.windSpeed),
    points.map(p => p.windDirection)
  );

  // 11. Scatter plot points (use Daily Averages to make it clean)
  const scatterTempHum: [number, number][] = [];
  const scatterPressRain: [number, number][] = [];
  for (const d of annualDays) {
    const temps = dailyTemp[d] || [];
    const hums = dailyHum[d] || [];
    const press = dailyPress[d] || [];
    const rain = dailyRain[d] || 0;

    if (temps.length > 0 && hums.length > 0 && press.length > 0) {
      const avgTemp = temps.reduce((a, b) => a + b, 0) / temps.length;
      const avgHum = hums.reduce((a, b) => a + b, 0) / hums.length;
      const avgPress = press.reduce((a, b) => a + b, 0) / press.length;

      scatterTempHum.push([
        Math.round(avgTemp * 100) / 100,
        Math.round(avgHum * 100) / 100
      ]);

      scatterPressRain.push([
        Math.round(avgPress * 100) / 100,
        Math.round(rain * 100) / 100
      ]);
    }
  }

  const scatter = {
    pressureVsRainfall: scatterPressRain,
    tempVsHumidity: scatterTempHum
  };

  // 12. Solar Radiation analysis
  const radSum = Array(24).fill(0);
  const radCount = Array(24).fill(0);
  const dailyRadAccum: Record<string, number> = {};

  for (const p of points) {
    const wib = getWibTimeParts(p.timestamp);
    const hIdx = Number(wib.hour);
    const dayKey = wib.ymd;

    if (hIdx >= 0 && hIdx < 24) {
      radSum[hIdx] += p.shortwaveRad;
      radCount[hIdx]++;
    }

    // Accumulate daily solar radiation (Wh/m² or MJ/m²)
    dailyRadAccum[dayKey] = (dailyRadAccum[dayKey] || 0) + p.shortwaveRad;
  }

  const radiation = {
    dailyTotal: annualDays.map(d => Math.round((dailyRadAccum[d] || 0) * 100) / 100),
    diurnalCycle: Array.from({ length: 24 }, (_, hIdx) => {
      const count = radCount[hIdx] || 1;
      return Math.round((radSum[hIdx] / count) * 100) / 100;
    })
  };

  // 13. Convective Potential (CAPE)
  const capeVals = points.map(p => p.cape).filter(Number.isFinite);
  const cape = {
    max: capeVals.length > 0 ? Math.max(...capeVals) : 0,
    mean: capeVals.length > 0 ? Math.round((capeVals.reduce((a, b) => a + b, 0) / capeVals.length) * 10) / 10 : 0,
    series: points.map(p => p.cape)
  };

  // 14. Scientific Diagnostics (Dew Point Depression & Barometric Tendency)
  const dpDepressions = points.map(p => p.temperature - p.dewPoint).filter(Number.isFinite);
  const meanDewPointDepression = dpDepressions.length > 0 ? dpDepressions.reduce((a, b) => a + b, 0) / dpDepressions.length : 0;
  const maxDewPointDepression = dpDepressions.length > 0 ? Math.max(...dpDepressions) : 0;

  const dpDepressionDiurnalSum = Array(24).fill(0);
  const dpDepressionDiurnalCount = Array(24).fill(0);
  for (const p of points) {
    const wib = getWibTimeParts(p.timestamp);
    const hIdx = Number(wib.hour);
    if (hIdx >= 0 && hIdx < 24 && Number.isFinite(p.temperature) && Number.isFinite(p.dewPoint)) {
      dpDepressionDiurnalSum[hIdx] += (p.temperature - p.dewPoint);
      dpDepressionDiurnalCount[hIdx]++;
    }
  }
  const diurnalDewPointDepression = Array.from({ length: 24 }, (_, hIdx) => {
    const count = dpDepressionDiurnalCount[hIdx] || 1;
    return Math.round((dpDepressionDiurnalSum[hIdx] / count) * 100) / 100;
  });

  const tendencies3h: number[] = [];
  for (let i = 3; i < points.length; i++) {
    const p1 = points[i];
    const p0 = points[i - 3];
    if (Number.isFinite(p1.mslPressure) && Number.isFinite(p0.mslPressure)) {
      tendencies3h.push(Math.abs(p1.mslPressure - p0.mslPressure));
    }
  }
  const meanBarometricTendency3h = tendencies3h.length > 0 ? tendencies3h.reduce((a, b) => a + b, 0) / tendencies3h.length : 0;
  const maxBarometricTendency3h = tendencies3h.length > 0 ? Math.max(...tendencies3h) : 0;

  const diagnostics = {
    meanDewPointDepression: Math.round(meanDewPointDepression * 100) / 100,
    maxDewPointDepression: Math.round(maxDewPointDepression * 100) / 100,
    diurnalDewPointDepression,
    meanBarometricTendency3h: Math.round(meanBarometricTendency3h * 100) / 100,
    maxBarometricTendency3h: Math.round(maxBarometricTendency3h * 100) / 100
  };

  const hourly = {
    times: rawJson.hourly?.time || [],
    temperature: rawTemp,
    humidity: rawHum,
    pressure: rawMslPress,
    rain: rawRain,
    windSpeed: rawWindSpeed,
    windGust: rawWindGust,
    radiation: rawShortwave
  };

  const startDate = times[0]?.substring(0, 10) || "";
  const endDate = times[len - 1]?.substring(0, 10) || "";

  return {
    latitude,
    longitude,
    elevation,
    timezone,
    startDate,
    endDate,
    current,
    stats,
    diurnal,
    weekly,
    monthly,
    annual,
    anomalies,
    hovmoller,
    windRose,
    scatter,
    radiation,
    cape,
    diagnostics,
    hourly
  };
}
