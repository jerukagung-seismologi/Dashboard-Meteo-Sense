// lib/bias-correction/correction/robustHuberRegression.ts

/**
 * Robust Linear Regression using Huber Loss and Iteratively Reweighted Least Squares (IRLS).
 * Highly resistant to sensor spikes, transient communication errors, and extreme anomalies.
 */
export interface HuberFitResult {
  slope: number;
  intercept: number;
  rSquared: number;
  delta: number;
  iterations: number;
  sampleCount: number;
  outlierCount: number;
}

/**
 * Calculates median of an array of numbers.
 */
function median(values: number[]): number {
  if (values.length === 0) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 !== 0 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
}

/**
 * Fits a robust linear model: aws = slope * era5 + intercept using Huber Loss (IRLS).
 */
export function fitRobustHuberRegression(
  calibrationPairs: { aws: number; era5: number }[],
  maxIterations: number = 10,
  tolerance: number = 1e-4
): HuberFitResult {
  const valid = calibrationPairs.filter(
    p => typeof p.aws === "number" && !isNaN(p.aws) && typeof p.era5 === "number" && !isNaN(p.era5)
  );

  const n = valid.length;
  if (n < 2) {
    return {
      slope: 1,
      intercept: 0,
      rSquared: 0,
      delta: 1.345,
      iterations: 0,
      sampleCount: n,
      outlierCount: 0,
    };
  }

  // Initial OLS Estimate
  let sumX = 0, sumY = 0, sumXY = 0, sumXX = 0;
  for (let i = 0; i < n; i++) {
    const x = valid[i].era5;
    const y = valid[i].aws;
    sumX += x;
    sumY += y;
    sumXY += x * y;
    sumXX += x * x;
  }

  let slope = (n * sumXY - sumX * sumY) / Math.max(1e-10, n * sumXX - sumX * sumX);
  let intercept = (sumY - slope * sumX) / n;

  let delta = 1.345;
  let iter = 0;
  let outlierCount = 0;

  // IRLS Loop
  for (iter = 0; iter < maxIterations; iter++) {
    // Compute residuals
    const residuals = valid.map(p => p.aws - (slope * p.era5 + intercept));
    const absResiduals = residuals.map(Math.abs);

    // Compute Median Absolute Deviation (MAD) of residuals
    const medRes = median(residuals);
    const mad = Math.max(1e-4, median(residuals.map(r => Math.abs(r - medRes))) * 1.4826);
    delta = 1.345 * mad;

    // Weights calculation based on Huber criterion
    const weights: number[] = [];
    outlierCount = 0;
    for (let i = 0; i < n; i++) {
      const e = absResiduals[i];
      if (e <= delta) {
        weights.push(1.0);
      } else {
        weights.push(delta / e);
        outlierCount++;
      }
    }

    // Weighted Least Squares update
    let wSumX = 0, wSumY = 0, wSumXY = 0, wSumXX = 0, wSum = 0;
    for (let i = 0; i < n; i++) {
      const w = weights[i];
      const x = valid[i].era5;
      const y = valid[i].aws;
      wSum += w;
      wSumX += w * x;
      wSumY += w * y;
      wSumXY += w * x * y;
      wSumXX += w * x * x;
    }

    const denom = wSum * wSumXX - wSumX * wSumX;
    if (Math.abs(denom) < 1e-10) break;

    const newSlope = (wSum * wSumXY - wSumX * wSumY) / denom;
    const newIntercept = (wSumY - newSlope * wSumX) / wSum;

    const diff = Math.abs(newSlope - slope) + Math.abs(newIntercept - intercept);
    slope = newSlope;
    intercept = newIntercept;

    if (diff < tolerance) {
      iter++;
      break;
    }
  }

  // Calculate R^2
  const meanY = sumY / n;
  let ssTot = 0, ssRes = 0;
  for (let i = 0; i < n; i++) {
    const x = valid[i].era5;
    const y = valid[i].aws;
    const pred = slope * x + intercept;
    ssTot += (y - meanY) ** 2;
    ssRes += (y - pred) ** 2;
  }
  const rSquared = ssTot > 1e-10 ? Math.max(0, Math.min(1, 1 - ssRes / ssTot)) : 0;

  return {
    slope: Number(slope.toFixed(4)),
    intercept: Number(intercept.toFixed(4)),
    rSquared: Number(rSquared.toFixed(4)),
    delta: Number(delta.toFixed(4)),
    iterations: iter,
    sampleCount: n,
    outlierCount,
  };
}

/**
 * Transforms an array of values using fitted Huber parameters:
 * Corrected = slope * era5 + intercept
 */
export function transformRobustHuberRegression(
  era5Values: (number | null | undefined)[],
  params: HuberFitResult
): (number | null)[] {
  const { slope, intercept } = params;

  return era5Values.map(v => {
    if (v === null || v === undefined || isNaN(v)) return null;
    const corrected = slope * v + intercept;
    return Number(corrected.toFixed(3));
  });
}
