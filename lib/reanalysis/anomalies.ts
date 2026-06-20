// lib/reanalysis/anomalies.ts
import { getWibTimeParts } from "../climatology/aggregateAnalysis";

export interface MonthlyBaseline {
  month: number; // 1 to 12
  mean: number;
  stdDev: number;
}

export interface AnomalyPoint {
  timestamp: number;
  value: number;
  anomaly: number;
  standardizedAnomaly: number;
}

/**
 * Calculates baseline mean and standard deviation for each of the 12 calendar months (WIB timezone).
 */
export function calculateMonthlyBaselines(
  points: { timestamp: number; value: number }[]
): Record<number, MonthlyBaseline> {
  const monthGroups: Record<number, number[]> = {};
  for (let m = 1; m <= 12; m++) {
    monthGroups[m] = [];
  }

  for (const p of points) {
    if (!Number.isFinite(p.value)) continue;
    const wib = getWibTimeParts(p.timestamp);
    const month = Number(wib.month); // 01-12
    if (month >= 1 && month <= 12) {
      monthGroups[month].push(p.value);
    }
  }

  const baselines: Record<number, MonthlyBaseline> = {};

  for (let m = 1; m <= 12; m++) {
    const vals = monthGroups[m];
    if (vals.length === 0) {
      baselines[m] = { month: m, mean: 0, stdDev: 1 };
      continue;
    }

    const sum = vals.reduce((acc, v) => acc + v, 0);
    const mean = sum / vals.length;
    const sqDiffSum = vals.reduce((acc, v) => acc + Math.pow(v - mean, 2), 0);
    const variance = sqDiffSum / vals.length;
    const stdDev = Math.sqrt(variance);

    baselines[m] = {
      month: m,
      mean,
      stdDev: stdDev > 0 ? stdDev : 1 // Avoid division by zero
    };
  }

  return baselines;
}

/**
 * Computes anomaly and standardized anomaly metrics for each point against the monthly baselines.
 */
export function computeAnomalies(
  points: { timestamp: number; value: number }[],
  baselines: Record<number, MonthlyBaseline>
): AnomalyPoint[] {
  return points.map((p) => {
    if (!Number.isFinite(p.value)) {
      return { timestamp: p.timestamp, value: 0, anomaly: 0, standardizedAnomaly: 0 };
    }

    const wib = getWibTimeParts(p.timestamp);
    const month = Number(wib.month);
    const baseline = baselines[month] || { mean: 0, stdDev: 1 };

    const anomaly = p.value - baseline.mean;
    const standardizedAnomaly = anomaly / baseline.stdDev;

    return {
      timestamp: p.timestamp,
      value: Math.round(p.value * 100) / 100,
      anomaly: Math.round(anomaly * 100) / 100,
      standardizedAnomaly: Math.round(standardizedAnomaly * 100) / 100,
    };
  });
}
