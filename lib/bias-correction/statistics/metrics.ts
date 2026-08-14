// lib/bias-correction/statistics/metrics.ts

import { EvaluationMetrics } from "../types";

/**
 * Calculates standard scientific meteorological verification metrics between reference (AWS) and model (ERA5).
 * Sign Convention: Bias = mean(AWS - ERA5)
 */
export function calculateEvaluationMetrics(
  pairs: { aws: number; era5: number }[]
): EvaluationMetrics {
  const validPairs = pairs.filter(
    p =>
      p.aws !== null &&
      p.aws !== undefined &&
      !isNaN(p.aws) &&
      p.era5 !== null &&
      p.era5 !== undefined &&
      !isNaN(p.era5)
  );

  const n = validPairs.length;
  if (n === 0) {
    return {
      sampleCount: 0,
      meanBias: 0,
      mae: 0,
      rmse: 0,
      stdResidual: 0,
      pearsonR: 0,
      rSquared: 0,
      p10: 0,
      p50: 0,
      p90: 0,
    };
  }

  let sumDiff = 0;
  let sumAbsDiff = 0;
  let sumSqDiff = 0;
  let sumAWS = 0;
  let sumERA5 = 0;

  const diffs: number[] = [];

  for (const p of validPairs) {
    const diff = p.aws - p.era5;
    diffs.push(diff);
    sumDiff += diff;
    sumAbsDiff += Math.abs(diff);
    sumSqDiff += diff * diff;
    sumAWS += p.aws;
    sumERA5 += p.era5;
  }

  const meanBias = sumDiff / n;
  const mae = sumAbsDiff / n;
  const rmse = Math.sqrt(sumSqDiff / n);

  const meanAWS = sumAWS / n;
  const meanERA5 = sumERA5 / n;

  // Standard Deviation of Residuals
  const varianceResidual =
    diffs.reduce((acc, d) => acc + Math.pow(d - meanBias, 2), 0) / Math.max(1, n - 1);
  const stdResidual = Math.sqrt(varianceResidual);

  // Pearson Correlation Coefficient (r)
  let numR = 0;
  let denR1 = 0;
  let denR2 = 0;

  for (const p of validPairs) {
    const dAWS = p.aws - meanAWS;
    const dERA = p.era5 - meanERA5;
    numR += dAWS * dERA;
    denR1 += dAWS * dAWS;
    denR2 += dERA * dERA;
  }

  const denom = Math.sqrt(denR1 * denR2);
  const pearsonR = denom > 0 ? numR / denom : 0;
  const rSquared = Math.max(0, Math.min(1, Math.pow(pearsonR, 2)));

  // Percentiles of residuals
  diffs.sort((a, b) => a - b);
  const p10 = diffs[Math.floor(n * 0.1)] ?? 0;
  const p50 = diffs[Math.floor(n * 0.5)] ?? 0;
  const p90 = diffs[Math.floor(n * 0.9)] ?? 0;

  return {
    sampleCount: n,
    meanBias: Number(meanBias.toFixed(3)),
    mae: Number(mae.toFixed(3)),
    rmse: Number(rmse.toFixed(3)),
    stdResidual: Number(stdResidual.toFixed(3)),
    pearsonR: Number(pearsonR.toFixed(3)),
    rSquared: Number(rSquared.toFixed(3)),
    p10: Number(p10.toFixed(2)),
    p50: Number(p50.toFixed(2)),
    p90: Number(p90.toFixed(2)),
  };
}
