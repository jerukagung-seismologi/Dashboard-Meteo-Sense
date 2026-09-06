// lib/bias-correction/correction/powerLawScaling.ts

/**
 * Power Law Non-Linear Scaling:
 * y = a * (x ^ b)
 * Linearized via logarithmic transformation: ln(y) = ln(a) + b * ln(x)
 * Optimal for non-linear power sensors (wind speed, solar radiation flux, high rainfall rates).
 */
export interface PowerLawFitResult {
  a: number; // Multiplicative factor
  b: number; // Exponent power
  rSquared: number;
  sampleCount: number;
}

/**
 * Fits a power-law relationship y = a * x^b on strictly positive calibration pairs.
 */
export function fitPowerLawScaling(
  calibrationPairs: { aws: number; era5: number }[],
  minThreshold: number = 0.05
): PowerLawFitResult {
  // Filter for positive values where log is defined
  const valid = calibrationPairs.filter(
    p =>
      typeof p.aws === "number" &&
      !isNaN(p.aws) &&
      p.aws > minThreshold &&
      typeof p.era5 === "number" &&
      !isNaN(p.era5) &&
      p.era5 > minThreshold
  );

  const n = valid.length;
  if (n < 3) {
    return { a: 1, b: 1, rSquared: 0, sampleCount: n };
  }

  let sumX = 0;
  let sumY = 0;
  let sumXY = 0;
  let sumXX = 0;

  for (let i = 0; i < n; i++) {
    const logX = Math.log(valid[i].era5);
    const logY = Math.log(valid[i].aws);

    sumX += logX;
    sumY += logY;
    sumXY += logX * logY;
    sumXX += logX * logX;
  }

  const denom = n * sumXX - sumX * sumX;
  if (Math.abs(denom) < 1e-10) {
    return { a: 1, b: 1, rSquared: 0, sampleCount: n };
  }

  const b = (n * sumXY - sumX * sumY) / denom;
  const logA = (sumY - b * sumX) / n;
  const a = Math.exp(logA);

  // Calculate R^2 in original space
  const meanY = valid.reduce((acc, p) => acc + p.aws, 0) / n;
  let ssTot = 0;
  let ssRes = 0;

  for (let i = 0; i < n; i++) {
    const x = valid[i].era5;
    const y = valid[i].aws;
    const yPred = a * Math.pow(x, b);

    ssTot += (y - meanY) ** 2;
    ssRes += (y - yPred) ** 2;
  }

  const rSquared = ssTot > 1e-10 ? Math.max(0, Math.min(1, 1 - ssRes / ssTot)) : 0;

  // Bound extreme unrealistic parameter divergence
  const safeA = Math.max(0.01, Math.min(100, a));
  const safeB = Math.max(0.1, Math.min(5.0, b));

  return {
    a: Number(safeA.toFixed(4)),
    b: Number(safeB.toFixed(4)),
    rSquared: Number(rSquared.toFixed(4)),
    sampleCount: n,
  };
}

/**
 * Transforms an array of model/sensor values using power-law parameters:
 * Corrected = a * (v ^ b) (for v > 0, 0 otherwise)
 */
export function transformPowerLawScaling(
  era5Values: (number | null | undefined)[],
  params: PowerLawFitResult
): (number | null)[] {
  const { a, b } = params;

  return era5Values.map(v => {
    if (v === null || v === undefined || isNaN(v)) return null;
    if (v <= 0) return 0;

    const corrected = a * Math.pow(v, b);
    return Number(corrected.toFixed(3));
  });
}
