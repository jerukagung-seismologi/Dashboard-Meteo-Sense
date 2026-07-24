// lib/climatology/aggregateHourly.ts
import { SensorDate } from "@/lib/FetchingSensorData";
import { AggregatedPoint } from "@/lib/climatology/climatologyTypes";

/**
 * Computes rainfall contribution per reading using rainrate × Δt integration.
 *
 * WHY rainrate, not rainfall counter:
 *  - `rainfall` is a cumulative counter that resets at unpredictable times (not guaranteed at hour
 *    boundaries), making delta-diff unreliable. A reset mid-hour produces a large spurious spike.
 *  - `rainrate` (mm/hr) is an instantaneous measurement. Multiplying by the time interval since
 *    the previous reading gives the actual rainfall accumulated during that interval.
 *
 * Formula: contribution_i = rainrate_i × (Δt_i / 3600)
 * Guards:
 *  - rainrate capped at 300 mm/hr (physically plausible maximum)
 *  - interval capped at 1800 s (30 min) — long data gaps should not produce artificial rain
 */
export function computeRainDeltas(rawPoints: SensorDate[]): (SensorDate & { rainDelta: number })[] {
  const sorted = [...rawPoints].sort((a, b) => a.timestamp - b.timestamp);
  const MAX_RAINRATE_MM_HR = 300;   // World-record-level cap
  const MAX_INTERVAL_SEC   = 1800;  // 30-minute gap cap — ignore large data gaps

  return sorted.map((p, index) => {
    const rr = Number(p.rainrate);
    const validRR = Number.isFinite(rr) && rr >= 0 ? Math.min(rr, MAX_RAINRATE_MM_HR) : 0;

    if (index === 0) {
      // First reading: no previous point, contribution = 0
      return { ...p, rainDelta: 0 };
    }

    const deltaSeconds = (p.timestamp - sorted[index - 1].timestamp) / 1000;
    // Only integrate over a reasonable interval; treat long gaps as dry
    const contribution = (deltaSeconds > 0 && deltaSeconds <= MAX_INTERVAL_SEC)
      ? validRR * (deltaSeconds / 3600)
      : 0;

    return { ...p, rainDelta: contribution };
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
      if (Number.isFinite(t)) {
        tempSum += t;
        tempCount++;
        if (t < tempMin) tempMin = t;
        if (t > tempMax) tempMax = t;
      }

      // Humidity
      const h = Number(item.humidity);
      if (Number.isFinite(h)) {
        humSum += h;
        humCount++;
        if (h < humMin) humMin = h;
        if (h > humMax) humMax = h;
      }

      // Pressure
      const p = Number(item.pressure);
      if (Number.isFinite(p)) {
        pressSum += p;
        pressCount++;
        if (p < pressMin) pressMin = p;
        if (p > pressMax) pressMax = p;
      }

      // Dew Point
      const d = Number(item.dew);
      if (Number.isFinite(d)) {
        dewSum += d;
        dewCount++;
        if (d < dewMin) dewMin = d;
        if (d > dewMax) dewMax = d;
      }

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

    // Start of the UTC hour epoch milliseconds
    const [ymd, hour] = timeKey.split("T");
    const [yyyy, mm, dd] = ymd.split("-");
    const timestamp = Date.UTC(Number(yyyy), Number(mm) - 1, Number(dd), Number(hour), 0, 0, 0);

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
