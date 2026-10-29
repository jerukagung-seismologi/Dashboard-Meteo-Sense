// lib/climatology/aggregateHourly.ts
import { SensorDate } from "@/lib/FetchingSensorData";
import { AggregatedPoint } from "@/lib/climatology/climatologyTypes";

/**
 * Computes rainfall contribution (rainDelta in mm) for each reading in the time series.
 *
 * SENSOR REALITY & WMO METEOROLOGICAL STANDARDS:
 *  - Physical AWS stations report running cumulative daily rainfall (`rainfall`), reset at 00:00 UTC (07:00 WIB).
 *  - Primary accumulation is computed via positive incremental deltas between consecutive readings:
 *      ΔR = R_t - R_{t-1} (for 0 <= ΔR <= 50 mm/interval)
 *    When counter reset occurs (ΔR < 0, e.g. at 00:00 UTC or reboot):
 *      ΔR = R_t (if R_t >= 0 and R_t <= 50 mm)
 *  - Pre-aggregated hourly inputs (marked by tempMax) already represent hourly totals, so rainDelta = p.rainfall.
 *  - Secondary fallback: when cumulative `rainfall` is missing or NaN, integrate instantaneous `rainrate` (mm/hr) over Δt.
 */
export function computeRainDeltas(rawPoints: SensorDate[]): (SensorDate & { rainDelta: number })[] {
  if (rawPoints.length === 0) return [];

  const sorted = [...rawPoints].sort((a, b) => a.timestamp - b.timestamp);
  const MAX_RAINRATE_MM_HR = 300;   // World-record-level cap
  const MAX_INTERVAL_SEC   = 1800;  // 30-minute gap cap — ignore large data gaps
  const MAX_DELTA_PER_INTERVAL = 50; // Plausible physical rain increment limit per reading (mm)

  let prevValidRainfall: number | null = null;

  return sorted.map((p, index) => {
    // 0. Pre-aggregated hourly record: rainfall is already the accumulated delta for this hour
    if ((p as any).tempMax != null) {
      const r = Number(p.rainfall);
      return { ...p, rainDelta: Number.isFinite(r) && r >= 0 ? r : 0 };
    }

    let rainDelta = 0;

    if (index > 0) {
      const prev = sorted[index - 1];
      const deltaSeconds = (p.timestamp - prev.timestamp) / 1000;

      // 1. Primary: Cumulative rainfall counter delta
      if (
        p.rainfall != null &&
        Number.isFinite(Number(p.rainfall)) &&
        prevValidRainfall !== null
      ) {
        const curRf = Number(p.rainfall);
        const prevRf = prevValidRainfall;
        const diff = curRf - prevRf;

        if (diff >= 0 && diff <= MAX_DELTA_PER_INTERVAL) {
          // Normal physical accumulation between readings
          rainDelta = diff;
          prevValidRainfall = curRf;
        } else if (diff < 0 && curRf >= 0 && curRf <= MAX_DELTA_PER_INTERVAL) {
          // Counter reset (e.g. at 00:00 UTC / 07:00 WIB daily boundary or station reboot)
          rainDelta = curRf;
          prevValidRainfall = curRf;
        } else if (diff > MAX_DELTA_PER_INTERVAL) {
          // Spurious spike / sensor glitch (> 50 mm in single reading): do not accumulate and keep prevValidRainfall
          rainDelta = 0;
        }
      } else if (p.rainfall != null && Number.isFinite(Number(p.rainfall))) {
        prevValidRainfall = Number(p.rainfall);
      }

      // 2. Secondary fallback: When rainfall counter is unavailable/NaN, integrate instantaneous rainrate
      if (
        (p.rainfall == null || !Number.isFinite(Number(p.rainfall))) &&
        deltaSeconds > 0 &&
        deltaSeconds <= MAX_INTERVAL_SEC
      ) {
        const rr = Number(p.rainrate);
        if (Number.isFinite(rr) && rr > 0) {
          const validRR = Math.min(rr, MAX_RAINRATE_MM_HR);
          rainDelta = validRR * (deltaSeconds / 3600);
        }
      }
    } else {
      // First reading (index === 0):
      if (p.rainfall != null && Number.isFinite(Number(p.rainfall))) {
        const r0 = Number(p.rainfall);
        if (r0 >= 0 && r0 <= MAX_DELTA_PER_INTERVAL) {
          prevValidRainfall = r0;
          // If first reading is right around start of day with small value (<= 5 mm), count it; else 0
          rainDelta = r0 <= 5 ? r0 : 0;
        }
      }
    }

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
      if (Number.isFinite(t) && t > 0) {
        tempSum += t;
        tempCount++;
        if (t < tempMin) tempMin = t;
        if (t > tempMax) tempMax = t;
      }

      // Humidity
      const h = Number(item.humidity);
      if (Number.isFinite(h) && h > 0) {
        humSum += h;
        humCount++;
        if (h < humMin) humMin = h;
        if (h > humMax) humMax = h;
      }

      // Pressure
      const p = Number(item.pressure);
      if (Number.isFinite(p) && p > 800) {
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
        if (d > -20 && d < dewMin) dewMin = d;
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
      rainfallTotal: Math.round(rainAccum * 100) / 100,
    });
  }

  return result.sort((a, b) => a.timeKey.localeCompare(b.timeKey));
}
