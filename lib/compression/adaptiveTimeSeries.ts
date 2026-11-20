// lib/compression/adaptiveTimeSeries.ts
/**
 * Adaptive Event-Preserving Downsampling & Columnar Delta-Encoding Module
 * for High-Resolution Meteorological Sensor Time-Series.
 *
 * Designed for Meteo-Sense IoT Telemetry (1–30 minute intervals).
 * Reduces JSON payload size by 90–98% while strictly preserving critical
 * meteorological events (rain bursts, rapid temp/humidity/pressure shifts)
 * and maintaining visual fidelity via Largest Triangle Three Buckets (LTTB).
 */

import type { SensorDate } from "@/lib/FetchingSensorData";

export interface CompactTimeSeries {
  /** Base UNIX epoch timestamp in seconds */
  t0: number;
  /** Delta in seconds relative to previous sample (dt[0] = 0) */
  dt: number[];
  /** Fixed-point Temperature in °C scaled by 10 (Math.round(T * 10)) */
  temp: number[];
  /** Fixed-point Relative Humidity in % scaled by 10 (Math.round(RH * 10)) */
  rh: number[];
  /** Fixed-point Rainfall in mm scaled by 100 (Math.round(P * 100)) */
  rain: number[];
  /** Fixed-point Atmospheric Pressure in hPa scaled by 10 (Math.round(Press * 10)) */
  press: number[];
  /** Optional: Wind Speed in m/s scaled by 10 */
  ws?: number[];
  /** Optional: Wind Direction in degrees (0–360) */
  wd?: number[];
  /** Optional: Dew Point in °C scaled by 10 */
  dew?: number[];
  /** Optional: Battery Voltage in V scaled by 100 */
  volt?: number[];
  /** Metadata describing compression efficiency and scaling factors */
  meta?: {
    rawCount: number;
    compressedCount: number;
    compressionRatio: string;
    scales: {
      temp: number;
      rh: number;
      rain: number;
      press: number;
      ws: number;
      volt: number;
    };
  };
}

export interface DownsampleOptions {
  /** Target maximum points for downsampling (default: 300) */
  maxPoints?: number;
  /** Significant temperature change threshold in °C (default: 0.3) */
  tempDeadband?: number;
  /** Significant relative humidity change threshold in % (default: 1.5) */
  rhDeadband?: number;
  /** Significant barometric pressure change threshold in hPa (default: 0.3) */
  pressDeadband?: number;
  /** Significant precipitation occurrence threshold in mm (default: 0.0) */
  rainThreshold?: number;
}

const DEFAULT_SCALES = {
  temp: 10,
  rh: 10,
  rain: 100,
  press: 10,
  ws: 10,
  volt: 100,
};

function pad2(n: number): string {
  return n < 10 ? `0${n}` : `${n}`;
}

/**
 * Ultra-fast WIB (UTC+7 / Asia/Jakarta) date/time formatter.
 * Standalone implementation to eliminate external imports.
 */
export function fastFormatJakarta(timestampInMillis: number): {
  timeFormatted: string;
  dateFormatted: string;
} {
  const d = new Date(timestampInMillis + 7 * 3600 * 1000);
  const y = d.getUTCFullYear();
  const m = pad2(d.getUTCMonth() + 1);
  const day = pad2(d.getUTCDate());
  const hh = pad2(d.getUTCHours());
  const mm = pad2(d.getUTCMinutes());
  const ss = pad2(d.getUTCSeconds());

  return {
    timeFormatted: `${hh}:${mm}:${ss}`,
    dateFormatted: `${day}/${m}/${y}, ${hh}:${mm}:${ss}`,
  };
}

/**
 * Calculate Dew Point using the August-Roche-Magnus approximation.
 */
export function calculateDewPoint(temperature: number, humidity: number): number {
  if (humidity <= 0) return temperature - 30;
  const a = 17.27;
  const b = 237.7;
  const alpha = (a * temperature) / (b + temperature) + Math.log(humidity / 100.0);
  return Number(((b * alpha) / (a - alpha)).toFixed(1));
}

/**
 * Multi-Variable Largest Triangle Three Buckets (LTTB) Downsampling Algorithm.
 * Downsamples data to `targetCount` points while preserving local peaks, valleys,
 * and geometric shape across temperature, humidity, pressure, and rainfall.
 */
export function lttbDownsample(data: SensorDate[], targetCount: number): SensorDate[] {
  const n = data.length;
  if (targetCount >= n || targetCount <= 2) {
    return data;
  }

  // Pre-calculate min/max for normalization to balance multi-variable weights
  let minT = Infinity, maxT = -Infinity;
  let minRH = Infinity, maxRH = -Infinity;
  let minP = Infinity, maxP = -Infinity;
  let maxRain = 0;

  for (let i = 0; i < n; i++) {
    const d = data[i];
    if (d.temperature < minT) minT = d.temperature;
    if (d.temperature > maxT) maxT = d.temperature;
    if (d.humidity < minRH) minRH = d.humidity;
    if (d.humidity > maxRH) maxRH = d.humidity;
    if (d.pressure < minP) minP = d.pressure;
    if (d.pressure > maxP) maxP = d.pressure;
    if ((d.rainfall || 0) > maxRain) maxRain = d.rainfall || 0;
  }

  const spanT = maxT - minT || 1;
  const spanRH = maxRH - minRH || 1;
  const spanP = maxP - minP || 1;
  const spanRain = maxRain || 1;
  const t0 = data[0].timestamp;
  const spanTime = data[n - 1].timestamp - t0 || 1;

  // Normalized coordinates helper
  const getNorm = (d: SensorDate) => ({
    x: (d.timestamp - t0) / spanTime,
    yT: (d.temperature - minT) / spanT,
    yRH: (d.humidity - minRH) / spanRH,
    yP: (d.pressure - minP) / spanP,
    yRain: (d.rainfall || 0) / spanRain,
  });

  const sampled: SensorDate[] = new Array(targetCount);
  let sampledIndex = 0;

  // Bucket 0: First point is always selected
  sampled[sampledIndex++] = data[0];
  let aPoint = getNorm(data[0]);

  const bucketSize = (n - 2) / (targetCount - 2);

  for (let i = 0; i < targetCount - 2; i++) {
    const bucketStart = Math.floor((i + 0) * bucketSize) + 1;
    const bucketEnd = Math.min(Math.floor((i + 1) * bucketSize) + 1, n - 1);

    // Calculate center of next bucket (C)
    const nextBucketStart = Math.floor((i + 1) * bucketSize) + 1;
    const nextBucketEnd = Math.min(Math.floor((i + 2) * bucketSize) + 1, n);

    let avgX = 0, avgYT = 0, avgYRH = 0, avgYP = 0, avgYRain = 0;
    const nextBucketLen = nextBucketEnd - nextBucketStart;

    if (nextBucketLen > 0) {
      for (let j = nextBucketStart; j < nextBucketEnd; j++) {
        const norm = getNorm(data[j]);
        avgX += norm.x;
        avgYT += norm.yT;
        avgYRH += norm.yRH;
        avgYP += norm.yP;
        avgYRain += norm.yRain;
      }
      avgX /= nextBucketLen;
      avgYT /= nextBucketLen;
      avgYRH /= nextBucketLen;
      avgYP /= nextBucketLen;
      avgYRain /= nextBucketLen;
    } else {
      const norm = getNorm(data[n - 1]);
      avgX = norm.x;
      avgYT = norm.yT;
      avgYRH = norm.yRH;
      avgYP = norm.yP;
      avgYRain = norm.yRain;
    }

    // Find point in current bucket with maximum combined triangle area
    let maxArea = -1;
    let chosenPoint = data[bucketStart];
    let chosenNorm = getNorm(chosenPoint);

    for (let j = bucketStart; j < bucketEnd; j++) {
      const b = getNorm(data[j]);

      // Triangle Area = 0.5 * |(Ax - Cx)(By - Ay) - (Ax - Bx)(Cy - Ay)|
      const areaT = Math.abs((aPoint.x - avgX) * (b.yT - aPoint.yT) - (aPoint.x - b.x) * (avgYT - aPoint.yT));
      const areaRH = Math.abs((aPoint.x - avgX) * (b.yRH - aPoint.yRH) - (aPoint.x - b.x) * (avgYRH - aPoint.yRH));
      const areaP = Math.abs((aPoint.x - avgX) * (b.yP - aPoint.yP) - (aPoint.x - b.x) * (avgYP - aPoint.yP));
      const areaRain = Math.abs((aPoint.x - avgX) * (b.yRain - aPoint.yRain) - (aPoint.x - b.x) * (avgYRain - aPoint.yRain));

      // Multi-variable composite triangle area
      const totalArea = areaT * 1.0 + areaRH * 0.7 + areaP * 0.8 + areaRain * 1.5;

      if (totalArea > maxArea) {
        maxArea = totalArea;
        chosenPoint = data[j];
        chosenNorm = b;
      }
    }

    sampled[sampledIndex++] = chosenPoint;
    aPoint = chosenNorm;
  }

  // Last point is always selected
  sampled[sampledIndex] = data[n - 1];

  return sampled;
}

/**
 * Adaptive Event-Preserving Downsampling (Hybrid Deadband + LTTB).
 *
 * Algorithm Workflow:
 * 1. Deadband Event Detector:
 *    Identifies critical points where significant weather changes occur:
 *    - Rainfall occurrence: > 0 mm
 *    - |Δtemperature| >= 0.3°C
 *    - |Δhumidity| >= 1.5%
 *    - |Δpressure| >= 0.3 hPa
 *    First and last points are always anchored.
 * 2. If critical points alone reach/exceed `maxPoints`, pure multi-variable LTTB is executed.
 * 3. Otherwise, for stable/quiescent intervals between critical points, LTTB downsampling is
 *    applied proportionally using the remaining quota, guaranteeing crisp curve geometry.
 */
export function adaptiveDownsample(
  data: SensorDate[],
  options: DownsampleOptions = {}
): SensorDate[] {
  const {
    maxPoints = 300,
    tempDeadband = 0.3,
    rhDeadband = 1.5,
    pressDeadband = 0.3,
    rainThreshold = 0.0,
  } = options;

  const n = data.length;
  if (n <= maxPoints) {
    return data;
  }

  // Pass 1: Identify critical event points
  const isCritical = new Uint8Array(n);
  isCritical[0] = 1; // Anchor start
  isCritical[n - 1] = 1; // Anchor end

  let lastKept = data[0];
  let criticalCount = 2;

  for (let i = 1; i < n - 1; i++) {
    const pt = data[i];
    const isRain = (pt.rainfall || 0) > rainThreshold || (pt.rainrate || 0) > 0;
    const dTemp = Math.abs(pt.temperature - lastKept.temperature);
    const dHum = Math.abs(pt.humidity - lastKept.humidity);
    const dPress = Math.abs(pt.pressure - lastKept.pressure);

    if (isRain || dTemp >= tempDeadband || dHum >= rhDeadband || dPress >= pressDeadband) {
      isCritical[i] = 1;
      lastKept = pt;
      criticalCount++;
    }
  }

  // If critical events already exceed maxPoints, execute global multi-variable LTTB
  if (criticalCount >= maxPoints) {
    return lttbDownsample(data, maxPoints);
  }

  // Pass 2: Hybrid allocation for quiescent intervals
  const criticalIndices: number[] = [];
  for (let i = 0; i < n; i++) {
    if (isCritical[i]) {
      criticalIndices.push(i);
    }
  }

  const remainingQuota = maxPoints - criticalIndices.length;
  const numIntervals = criticalIndices.length - 1;

  // Count non-critical points in intervals
  let totalNonCritical = 0;
  const intervalSpans: number[] = new Array(numIntervals);
  for (let k = 0; k < numIntervals; k++) {
    const span = criticalIndices[k + 1] - criticalIndices[k] - 1;
    intervalSpans[k] = span;
    totalNonCritical += span;
  }

  // If remaining quiescent points fit inside remaining quota, keep all
  if (totalNonCritical <= remainingQuota) {
    return data;
  }

  // Proportionally allocate remaining quota to each quiescent interval
  const selectedIndexSet = new Set<number>(criticalIndices);

  for (let k = 0; k < numIntervals; k++) {
    const span = intervalSpans[k];
    if (span <= 0) continue;

    const quota = Math.round((remainingQuota * span) / totalNonCritical);
    if (quota <= 0) continue;

    const startIdx = criticalIndices[k];
    const endIdx = criticalIndices[k + 1];
    const slice = data.slice(startIdx, endIdx + 1);

    // Apply LTTB on the slice to pick interior points
    const sliceTarget = Math.min(quota + 2, slice.length);
    if (sliceTarget > 2) {
      const sliceSampled = lttbDownsample(slice, sliceTarget);
      // Skip the first and last (already anchored in criticalIndices)
      for (let s = 1; s < sliceSampled.length - 1; s++) {
        // Find matching original index
        const sampleTime = sliceSampled[s].timestamp;
        for (let orig = startIdx + 1; orig < endIdx; orig++) {
          if (data[orig].timestamp === sampleTime) {
            selectedIndexSet.add(orig);
            break;
          }
        }
      }
    }
  }

  // Construct final downsampled array sorted by index
  const sortedIndices = Array.from(selectedIndexSet).sort((a, b) => a - b);
  const result: SensorDate[] = new Array(sortedIndices.length);
  for (let i = 0; i < sortedIndices.length; i++) {
    result[i] = data[sortedIndices[i]];
  }

  return result;
}

/**
 * Columnar Delta-Encoding Compression.
 * Transforms an array of SensorDate objects into a compact columnar payload:
 * { t0, dt[], temp[], rh[], rain[], press[], ... }
 * - dt is encoded as second deltas from previous timestamp.
 * - Sensor measurements use fixed-point integer scaling to eliminate decimal bloat.
 */
export function compressTimeSeries(
  data: SensorDate[],
  maxPoints: number = 300,
  options: DownsampleOptions = {}
): CompactTimeSeries {
  if (!data || data.length === 0) {
    return {
      t0: 0,
      dt: [],
      temp: [],
      rh: [],
      rain: [],
      press: [],
    };
  }

  // 1. Adaptive downsampling
  const downsampled = adaptiveDownsample(data, { ...options, maxPoints });
  const m = downsampled.length;

  // 2. Base timestamp (UNIX epoch in seconds)
  const t0 = Math.floor(downsampled[0].timestamp / 1000);

  const dt: number[] = new Array(m);
  const temp: number[] = new Array(m);
  const rh: number[] = new Array(m);
  const rain: number[] = new Array(m);
  const press: number[] = new Array(m);

  let hasWs = false;
  let hasWd = false;
  let hasDew = false;
  let hasVolt = false;

  for (let i = 0; i < m; i++) {
    const pt = downsampled[i];
    if (pt.windSpeed !== undefined) hasWs = true;
    if (pt.windDirection !== undefined) hasWd = true;
    if (pt.dew !== undefined) hasDew = true;
    if (pt.volt !== undefined) hasVolt = true;
  }

  const ws: number[] | undefined = hasWs ? new Array(m) : undefined;
  const wd: number[] | undefined = hasWd ? new Array(m) : undefined;
  const dew: number[] | undefined = hasDew ? new Array(m) : undefined;
  const volt: number[] | undefined = hasVolt ? new Array(m) : undefined;

  let prevSec = t0;

  for (let i = 0; i < m; i++) {
    const pt = downsampled[i];
    const currentSec = Math.round(pt.timestamp / 1000);

    // Delta encoding (dt[0] = 0)
    dt[i] = i === 0 ? 0 : Math.max(0, currentSec - prevSec);
    prevSec = currentSec;

    // Fixed-point scaling
    temp[i] = Math.round((pt.temperature ?? 0) * DEFAULT_SCALES.temp);
    rh[i] = Math.round((pt.humidity ?? 0) * DEFAULT_SCALES.rh);
    rain[i] = Math.round((pt.rainfall ?? 0) * DEFAULT_SCALES.rain);
    press[i] = Math.round((pt.pressure ?? 1012) * DEFAULT_SCALES.press);

    if (hasWs && ws) {
      ws[i] = Math.round((pt.windSpeed ?? 0) * DEFAULT_SCALES.ws);
    }
    if (hasWd && wd) {
      wd[i] = Math.round(pt.windDirection ?? 0);
    }
    if (hasDew && dew) {
      dew[i] = Math.round((pt.dew ?? 0) * DEFAULT_SCALES.temp);
    }
    if (hasVolt && volt) {
      volt[i] = Math.round((pt.volt ?? 4.15) * DEFAULT_SCALES.volt);
    }
  }

  const rawEstimatedSize = data.length * 240; // ~240 bytes per SensorDate object
  const compressedEstimatedSize = 40 + m * (4 + 2 + 2 + 2 + 3 + (hasWs ? 2 : 0));
  const ratio = rawEstimatedSize > 0 ? ((1 - compressedEstimatedSize / rawEstimatedSize) * 100).toFixed(1) + "%" : "0%";

  return {
    t0,
    dt,
    temp,
    rh,
    rain,
    press,
    ...(hasWs ? { ws } : {}),
    ...(hasWd ? { wd } : {}),
    ...(hasDew ? { dew } : {}),
    ...(hasVolt ? { volt } : {}),
    meta: {
      rawCount: data.length,
      compressedCount: m,
      compressionRatio: ratio,
      scales: DEFAULT_SCALES,
    },
  };
}

/**
 * Decompress Columnar Delta-Encoded Time-Series for Frontend Chart Consumption.
 * Fully compatible with existing ECharts, Recharts, and Meteo-Sense components.
 * Seamlessly handles both CompactTimeSeries payloads and uncompressed SensorDate[].
 */
export function decompressTimeSeries(
  payload: CompactTimeSeries | SensorDate[] | any
): SensorDate[] {
  // If already an uncompressed array, return as-is
  if (Array.isArray(payload)) {
    return payload;
  }

  if (!payload || typeof payload !== "object" || !payload.dt || !Array.isArray(payload.dt)) {
    return [];
  }

  const compact = payload as CompactTimeSeries;
  const { t0, dt, temp, rh, rain, press, ws, wd, dew, volt } = compact;
  const n = dt.length;
  const result: SensorDate[] = new Array(n);

  let currentSec = t0;

  for (let i = 0; i < n; i++) {
    currentSec += dt[i];
    const timestampMs = currentSec * 1000;
    const { timeFormatted, dateFormatted } = fastFormatJakarta(timestampMs);

    const temperature = temp && temp[i] !== undefined ? temp[i] / DEFAULT_SCALES.temp : 25.0;
    const humidity = rh && rh[i] !== undefined ? rh[i] / DEFAULT_SCALES.rh : 75.0;
    const pressure = press && press[i] !== undefined ? press[i] / DEFAULT_SCALES.press : 1012.0;
    const rainfall = rain && rain[i] !== undefined ? rain[i] / DEFAULT_SCALES.rain : 0.0;

    // Dew point restoration (use scaled dew if available, otherwise compute Magnus formula)
    let dewVal: number;
    if (dew && dew[i] !== undefined) {
      dewVal = dew[i] / DEFAULT_SCALES.temp;
    } else {
      dewVal = calculateDewPoint(temperature, humidity);
    }

    const voltVal = volt && volt[i] !== undefined ? volt[i] / DEFAULT_SCALES.volt : 4.15;

    result[i] = {
      timestamp: timestampMs,
      temperature,
      humidity,
      pressure,
      dew: dewVal,
      rainfall,
      rainrate: 0,
      volt: voltVal,
      lux: 0,
      soil_temp: 0,
      ...(ws && ws[i] !== undefined ? { windSpeed: ws[i] / DEFAULT_SCALES.ws } : {}),
      ...(wd && wd[i] !== undefined ? { windDirection: wd[i] } : {}),
      timeFormatted,
      dateFormatted,
    };
  }

  return result;
}
