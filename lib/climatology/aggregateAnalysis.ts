// lib/climatology/aggregateAnalysis.ts
import { SensorDate } from "@/lib/FetchingSensorData";
import {
  AnalysisPoint,
  ParameterStats,
  AnalysisStats,
  HistogramBin,
  HeatmapData
} from "./analysisTypes";

// Bulletproof WIB timezone component extractor
export function getWibTimeParts(timestamp: number) {
  const formatter = new Intl.DateTimeFormat("en-US", {
    timeZone: "Asia/Jakarta",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
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
    ymd: `${map.year}-${map.month}-${map.day}`,
    hm: `${hourStr}:${map.minute || "00"}`,
    hour: hourStr,
    dayLabel: `${map.day}/${map.month}`
  };
}

export function calculateParameterStats(values: number[]): ParameterStats {
  const valid = values.filter((v) => Number.isFinite(v));
  if (valid.length === 0) {
    return { min: 0, mean: 0, max: 0, stdDev: 0, median: 0 };
  }

  valid.sort((a, b) => a - b);
  const min = valid[0];
  const max = valid[valid.length - 1];
  const sum = valid.reduce((a, b) => a + b, 0);
  const mean = sum / valid.length;

  const variance = valid.reduce((acc, v) => acc + Math.pow(v - mean, 2), 0) / valid.length;
  const stdDev = Math.sqrt(variance);

  let median = 0;
  const mid = Math.floor(valid.length / 2);
  if (valid.length % 2 === 0) {
    median = (valid[mid - 1] + valid[mid]) / 2;
  } else {
    median = valid[mid];
  }

  return {
    min: Math.round(min * 100) / 100,
    mean: Math.round(mean * 100) / 100,
    max: Math.round(max * 100) / 100,
    stdDev: Math.round(stdDev * 100) / 100,
    median: Math.round(median * 100) / 100,
  };
}

export function calculateHistogramBins(values: number[], numBins: number = 10): HistogramBin[] {
  const valid = values.filter((v) => Number.isFinite(v));
  if (valid.length === 0) return [];

  valid.sort((a, b) => a - b);
  const min = valid[0];
  const max = valid[valid.length - 1];

  if (min === max) {
    return [{
      binLabel: `${min.toFixed(1)}`,
      count: valid.length,
      minVal: min,
      maxVal: max
    }];
  }

  const binWidth = (max - min) / numBins;
  const bins: HistogramBin[] = Array.from({ length: numBins }, (_, idx) => {
    const binMin = min + idx * binWidth;
    const binMax = binMin + binWidth;
    return {
      binLabel: `${binMin.toFixed(1)} - ${binMax.toFixed(1)}`,
      count: 0,
      minVal: binMin,
      maxVal: binMax
    };
  });

  for (const v of valid) {
    let binIdx = Math.floor((v - min) / binWidth);
    if (binIdx >= numBins) binIdx = numBins - 1;
    bins[binIdx].count++;
  }

  return bins;
}

export function generateHeatmapMatrix(
  rawPoints: SensorDate[],
  extractValue: (p: SensorDate) => number
): HeatmapData {
  const sortedPoints = [...rawPoints].sort((a, b) => a.timestamp - b.timestamp);

  const daysSet = new Set<string>();
  const slotsSet = new Set<string>();

  const mappedPoints = sortedPoints.map((p) => {
    const wib = getWibTimeParts(p.timestamp);
    daysSet.add(wib.ymd);
    slotsSet.add(wib.hm);
    return {
      day: wib.ymd,
      slot: wib.hm,
      val: extractValue(p)
    };
  });

  const days = Array.from(daysSet).sort();
  const slots = Array.from(slotsSet).sort();

  const dayMap = new Map(days.map((d, idx) => [d, idx]));
  const slotMap = new Map(slots.map((s, idx) => [s, idx]));

  const matrix: [number, number, number][] = [];

  for (const p of mappedPoints) {
    const dIdx = dayMap.get(p.day);
    const sIdx = slotMap.get(p.slot);
    if (dIdx !== undefined && sIdx !== undefined && Number.isFinite(p.val)) {
      matrix.push([dIdx, sIdx, Math.round(p.val * 100) / 100]);
    }
  }

  return { days, slots, matrix };
}

export function aggregateHourlyAnalysis(rawPoints: SensorDate[]): AnalysisPoint[] {
  if (rawPoints.length === 0) return [];

  const groups = new Map<string, SensorDate[]>();

  for (const p of rawPoints) {
    // Round to nearest hourly timestamp UTC
    const hourStart = new Date(Math.floor(p.timestamp / (3600 * 1000)) * (3600 * 1000));
    const timeKey = hourStart.toISOString().substring(0, 13); // e.g. "2026-06-20T18"
    if (!groups.has(timeKey)) {
      groups.set(timeKey, []);
    }
    groups.get(timeKey)!.push(p);
  }

  const result: AnalysisPoint[] = [];

  for (const [timeKey, items] of groups) {
    const count = items.length;
    if (count === 0) continue;

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

    for (const item of items) {
      const t = Number(item.temperature);
      if (Number.isFinite(t)) {
        tempSum += t;
        tempCount++;
        if (t < tempMin) tempMin = t;
        if (t > tempMax) tempMax = t;
      }

      const h = Number(item.humidity);
      if (Number.isFinite(h)) {
        humSum += h;
        humCount++;
        if (h < humMin) humMin = h;
        if (h > humMax) humMax = h;
      }

      const p = Number(item.pressure);
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

    const humidityMean = humCount > 0 ? humSum / humCount : 0;
    const humFinalMin = humMin === Infinity ? 0 : humMin;
    const humFinalMax = humMax === -Infinity ? 100 : humMax;

    const pressureMean = pressCount > 0 ? pressSum / pressCount : 0;
    const pressFinalMin = pressMin === Infinity ? 0 : pressMin;
    const pressFinalMax = pressMax === -Infinity ? 0 : pressMax;

    const [ymd, hour] = timeKey.split("T");
    const [yyyy, mm, dd] = ymd.split("-");
    const timestamp = Date.UTC(Number(yyyy), Number(mm) - 1, Number(dd), Number(hour), 0, 0, 0);
    const wib = getWibTimeParts(timestamp);

    result.push({
      hourUtc: Number(hour),
      timeKeyWib: wib.hm,
      timestamp,
      sampleCount: count,
      temperatureMean: Math.round(tempMean * 100) / 100,
      temperatureMax: Math.round(tempFinalMax * 100) / 100,
      temperatureMin: Math.round(tempFinalMin * 100) / 100,
      humidityMean: Math.round(humidityMean * 100) / 100,
      humidityMax: Math.round(humFinalMax * 100) / 100,
      humidityMin: Math.round(humFinalMin * 100) / 100,
      pressureMean: Math.round(pressureMean * 100) / 100,
      pressureMax: Math.round(pressFinalMax * 100) / 100,
      pressureMin: Math.round(pressFinalMin * 100) / 100,
    });
  }

  return result.sort((a, b) => a.timestamp - b.timestamp);
}
