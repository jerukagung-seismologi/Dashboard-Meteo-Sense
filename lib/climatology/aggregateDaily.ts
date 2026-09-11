// lib/climatology/aggregateDaily.ts
import { SensorDate } from "@/lib/FetchingSensorData";
import { AggregatedPoint } from "@/lib/climatology/climatologyTypes";
import { computeRainDeltas } from "@/lib/climatology/aggregateHourly";

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

    let dewSum = 0;
    let dewCount = 0;
    let dewMin = Infinity;
    let dewMax = -Infinity;

    let rainAccum = 0;

    for (const item of items) {
      // Temperature
      const t = Number(item.temperature);
      const tMax = (item as any).tempMax != null && Number.isFinite((item as any).tempMax) ? (item as any).tempMax : t;
      const tMin = (item as any).tempMin != null && Number.isFinite((item as any).tempMin) ? (item as any).tempMin : t;
      if (Number.isFinite(t)) {
        tempSum += t;
        tempCount++;
      }
      if (Number.isFinite(tMin) && tMin < tempMin) tempMin = tMin;
      if (Number.isFinite(tMax) && tMax > tempMax) tempMax = tMax;

      // Humidity
      const h = Number(item.humidity);
      const hMax = (item as any).humMax != null && Number.isFinite((item as any).humMax) ? (item as any).humMax : h;
      const hMin = (item as any).humMin != null && Number.isFinite((item as any).humMin) ? (item as any).humMin : h;
      if (Number.isFinite(h)) {
        humSum += h;
        humCount++;
      }
      if (Number.isFinite(hMin) && hMin < humMin) humMin = hMin;
      if (Number.isFinite(hMax) && hMax > humMax) humMax = hMax;

      // Pressure
      const p = Number(item.pressure);
      const pMax = (item as any).pressMax != null && Number.isFinite((item as any).pressMax) ? (item as any).pressMax : p;
      const pMin = (item as any).pressMin != null && Number.isFinite((item as any).pressMin) ? (item as any).pressMin : p;
      if (Number.isFinite(p)) {
        pressSum += p;
        pressCount++;
      }
      if (Number.isFinite(pMin) && pMin < pressMin) pressMin = pMin;
      if (Number.isFinite(pMax) && pMax > pressMax) pressMax = pMax;

      // Dew Point
      const d = Number(item.dew);
      const dMax = (item as any).dewMax != null && Number.isFinite((item as any).dewMax) ? (item as any).dewMax : d;
      const dMin = (item as any).dewMin != null && Number.isFinite((item as any).dewMin) ? (item as any).dewMin : d;
      if (Number.isFinite(d)) {
        dewSum += d;
        dewCount++;
      }
      if (Number.isFinite(dMin) && dMin < dewMin) dewMin = dMin;
      if (Number.isFinite(dMax) && dMax > dewMax) dewMax = dMax;

      // Rain
      const r = Number(item.rainDelta);
      if (Number.isFinite(r)) {
        rainAccum += r;
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

    const dewMean = dewCount > 0 ? dewSum / dewCount : 0;
    const dewFinalMin = dewMin === Infinity ? 0 : dewMin;
    const dewFinalMax = dewMax === -Infinity ? 0 : dewMax;

    // Standard deviation of Temperature
    let tempVarSum = 0;
    let tempVarCount = 0;
    for (const item of items) {
      const t = Number(item.temperature);
      if (Number.isFinite(t)) {
        tempVarSum += Math.pow(t - tempMean, 2);
        tempVarCount++;
      }
    }
    const tempStdDev = tempVarCount > 0 ? Math.sqrt(tempVarSum / tempVarCount) : 0;

    // Start of UTC day epoch
    const [yyyy, mm, dd] = timeKey.split("-");
    const timestamp = Date.UTC(Number(yyyy), Number(mm) - 1, Number(dd), 0, 0, 0, 0);

    result.push({
      timeKey,
      timestamp,
      sampleCount: count,
      temperatureMean: Math.round(tempMean * 100) / 100,
      temperatureMax: Math.round(tempFinalMax * 100) / 100,
      temperatureMin: Math.round(tempFinalMin * 100) / 100,
      temperatureStdDev: Math.round(tempStdDev * 100) / 100,
      humidityMean: Math.round(humidityMean * 100) / 100,
      humidityMax: Math.round(humFinalMax * 100) / 100,
      humidityMin: Math.round(humFinalMin * 100) / 100,
      pressureMean: Math.round(pressureMean * 100) / 100,
      pressureMax: Math.round(pressFinalMax * 100) / 100,
      pressureMin: Math.round(pressFinalMin * 100) / 100,
      dewPointMean: Math.round(dewMean * 100) / 100,
      dewPointMax: Math.round(dewFinalMax * 100) / 100,
      dewPointMin: Math.round(dewFinalMin * 100) / 100,
      rainfallAccumulation: Math.round(rainAccum * 100) / 100,
    });
  }

  return result.sort((a, b) => a.timeKey.localeCompare(b.timeKey));
}
