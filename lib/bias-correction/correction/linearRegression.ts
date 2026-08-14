// lib/bias-correction/correction/linearRegression.ts

export interface LinearRegressionParams {
  slope: number; // b
  intercept: number; // a
  rSquared: number;
  sampleCount: number;
}

/**
 * Fits Ordinary Least Squares (OLS) Linear Regression: AWS = a + b * ERA5
 */
export function fitLinearRegression(
  calibrationPairs: { aws: number; era5: number }[]
): LinearRegressionParams {
  const valid = calibrationPairs.filter(
    p => p.aws !== null && p.era5 !== null && !isNaN(p.aws) && !isNaN(p.era5)
  );

  const n = valid.length;
  if (n < 2) {
    return { slope: 1, intercept: 0, rSquared: 0, sampleCount: n };
  }

  let sumX = 0;
  let sumY = 0;
  let sumXY = 0;
  let sumX2 = 0;
  let sumY2 = 0;

  for (const p of valid) {
    const x = p.era5;
    const y = p.aws;
    sumX += x;
    sumY += y;
    sumXY += x * y;
    sumX2 += x * x;
    sumY2 += y * y;
  }

  const denominator = n * sumX2 - sumX * sumX;
  if (Math.abs(denominator) < 1e-9) {
    return { slope: 1, intercept: 0, rSquared: 0, sampleCount: n };
  }

  const slope = (n * sumXY - sumX * sumY) / denominator;
  const intercept = (sumY - slope * sumX) / n;

  // Compute R^2
  const meanY = sumY / n;
  let ssTot = 0;
  let ssRes = 0;

  for (const p of valid) {
    const pred = intercept + slope * p.era5;
    ssRes += Math.pow(p.aws - pred, 2);
    ssTot += Math.pow(p.aws - meanY, 2);
  }

  const rSquared = ssTot > 0 ? Math.max(0, 1 - ssRes / ssTot) : 0;

  return {
    slope: Number(slope.toFixed(4)),
    intercept: Number(intercept.toFixed(4)),
    rSquared: Number(rSquared.toFixed(4)),
    sampleCount: n,
  };
}

/**
 * Transforms ERA5 values using fitted linear regression equation: Corrected = intercept + slope * ERA5
 */
export function transformLinearRegression(
  era5Values: (number | null | undefined)[],
  params: LinearRegressionParams
): (number | null)[] {
  return era5Values.map(v => {
    if (v === null || v === undefined || isNaN(v)) return null;
    return Number((params.intercept + params.slope * v).toFixed(3));
  });
}
