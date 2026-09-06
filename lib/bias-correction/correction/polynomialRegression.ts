// lib/bias-correction/correction/polynomialRegression.ts

/**
 * Fit a 2nd degree polynomial regression (quadratic curve):
 * y = a * x^2 + b * x + c
 * where x is the uncalibrated model/sensor value and y is the ground truth reference.
 */
export interface PolynomialFitResult {
  a: number; // Coefficient for x^2
  b: number; // Coefficient for x
  c: number; // Constant / Intercept
  rSquared: number;
  sampleCount: number;
}

/**
 * Solves a 3x3 linear system A * w = B using Gaussian elimination with partial pivoting.
 */
function solve3x3(A: number[][], B: number[]): [number, number, number] | null {
  const n = 3;
  const M: number[][] = A.map((row, i) => [...row, B[i]]);

  for (let i = 0; i < n; i++) {
    // Find pivot
    let maxRow = i;
    for (let k = i + 1; k < n; k++) {
      if (Math.abs(M[k][i]) > Math.abs(M[maxRow][i])) {
        maxRow = k;
      }
    }
    // Swap rows
    const temp = M[i];
    M[i] = M[maxRow];
    M[maxRow] = temp;

    if (Math.abs(M[i][i]) < 1e-12) {
      return null; // Singular or degenerate matrix
    }

    // Eliminate below
    for (let k = i + 1; k < n; k++) {
      const factor = M[k][i] / M[i][i];
      for (let j = i; j <= n; j++) {
        M[k][j] -= factor * M[i][j];
      }
    }
  }

  // Back substitution
  const x = [0, 0, 0];
  for (let i = n - 1; i >= 0; i--) {
    let sum = M[i][n];
    for (let j = i + 1; j < n; j++) {
      sum -= M[i][j] * x[j];
    }
    x[i] = sum / M[i][i];
  }

  return [x[0], x[1], x[2]];
}

/**
 * Fits a 2nd-degree polynomial curve on calibration pairs (aws = ground truth y, era5 = model x).
 */
export function fitPolynomialRegression(
  calibrationPairs: { aws: number; era5: number }[]
): PolynomialFitResult {
  const validPairs = calibrationPairs.filter(
    p => typeof p.aws === "number" && !isNaN(p.aws) && typeof p.era5 === "number" && !isNaN(p.era5)
  );

  const n = validPairs.length;
  if (n < 4) {
    return { a: 0, b: 1, c: 0, rSquared: 0, sampleCount: n };
  }

  let sumX = 0;
  let sumX2 = 0;
  let sumX3 = 0;
  let sumX4 = 0;
  let sumY = 0;
  let sumXY = 0;
  let sumX2Y = 0;

  for (let i = 0; i < n; i++) {
    const x = validPairs[i].era5;
    const y = validPairs[i].aws;
    const x2 = x * x;

    sumX += x;
    sumX2 += x2;
    sumX3 += x2 * x;
    sumX4 += x2 * x2;

    sumY += y;
    sumXY += x * y;
    sumX2Y += x2 * y;
  }

  const A = [
    [sumX4, sumX3, sumX2],
    [sumX3, sumX2, sumX],
    [sumX2, sumX, n],
  ];
  const B = [sumX2Y, sumXY, sumY];

  const solution = solve3x3(A, B);
  if (!solution) {
    // Fallback to simple identity / mean offset if non-invertible
    const meanBias = (sumY - sumX) / n;
    return { a: 0, b: 1, c: meanBias, rSquared: 0, sampleCount: n };
  }

  const [a, b, c] = solution;

  // Calculate R^2
  const meanY = sumY / n;
  let ssTot = 0;
  let ssRes = 0;

  for (let i = 0; i < n; i++) {
    const x = validPairs[i].era5;
    const y = validPairs[i].aws;
    const yPred = a * x * x + b * x + c;

    ssTot += (y - meanY) ** 2;
    ssRes += (y - yPred) ** 2;
  }

  const rSquared = ssTot > 1e-10 ? Math.max(0, Math.min(1, 1 - ssRes / ssTot)) : 0;

  return {
    a: Number(a.toFixed(6)),
    b: Number(b.toFixed(4)),
    c: Number(c.toFixed(4)),
    rSquared: Number(rSquared.toFixed(4)),
    sampleCount: n,
  };
}

/**
 * Transforms an array of model values using the fitted polynomial coefficients:
 * y = a * x^2 + b * x + c
 */
export function transformPolynomialRegression(
  era5Values: (number | null | undefined)[],
  params: PolynomialFitResult
): (number | null)[] {
  const { a, b, c } = params;

  return era5Values.map(v => {
    if (v === null || v === undefined || isNaN(v)) return null;
    const corrected = a * v * v + b * v + c;
    return Number(corrected.toFixed(3));
  });
}
