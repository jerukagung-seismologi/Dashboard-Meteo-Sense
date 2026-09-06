// lib/bias-correction/correction/twoPointCalibration.ts

/**
 * Two-Point Linear Interpolation Calibration:
 * Matches two designated operating points (Low reference point 1, High reference point 2):
 * (x1, y1) and (x2, y2)
 * Slope m = (y2 - y1) / (x2 - x1)
 * Offset c = y1 - m * x1
 * Reflects physical two-point laboratory chamber sensor calibration.
 */
export interface TwoPointFitResult {
  x1: number; // Raw low reference point
  y1: number; // Ground truth low reference point
  x2: number; // Raw high reference point
  y2: number; // Ground truth high reference point
  slope: number;
  offset: number;
  rSquared: number;
  sampleCount: number;
}

/**
 * Helper to get percentile from sorted values.
 */
function getPercentile(sorted: number[], p: number): number {
  if (sorted.length === 0) return 0;
  const idx = p * (sorted.length - 1);
  const low = Math.floor(idx);
  const high = Math.ceil(idx);
  return sorted[low] + (idx - low) * (sorted[high] - sorted[low]);
}

/**
 * Fits two-point calibration using 10th (low) and 90th (high) operating percentiles.
 */
export function fitTwoPointCalibration(
  calibrationPairs: { aws: number; era5: number }[],
  lowPercentile: number = 0.1,
  highPercentile: number = 0.9
): TwoPointFitResult {
  const valid = calibrationPairs.filter(
    p => typeof p.aws === "number" && !isNaN(p.aws) && typeof p.era5 === "number" && !isNaN(p.era5)
  );

  const n = valid.length;
  if (n < 4) {
    return { x1: 0, y1: 0, x2: 100, y2: 100, slope: 1, offset: 0, rSquared: 0, sampleCount: n };
  }

  const sortedAws = valid.map(p => p.aws).sort((a, b) => a - b);
  const sortedEra5 = valid.map(p => p.era5).sort((a, b) => a - b);

  const x1 = getPercentile(sortedEra5, lowPercentile);
  const y1 = getPercentile(sortedAws, lowPercentile);
  const x2 = getPercentile(sortedEra5, highPercentile);
  const y2 = getPercentile(sortedAws, highPercentile);

  let slope = 1;
  let offset = 0;

  if (Math.abs(x2 - x1) > 1e-6) {
    slope = (y2 - y1) / (x2 - x1);
    offset = y1 - slope * x1;
  } else {
    // Degenerate points, fallback to mean offset
    offset = y1 - x1;
  }

  // Calculate R^2
  const meanY = valid.reduce((acc, p) => acc + p.aws, 0) / n;
  let ssTot = 0;
  let ssRes = 0;

  for (let i = 0; i < n; i++) {
    const x = valid[i].era5;
    const y = valid[i].aws;
    const yPred = slope * x + offset;

    ssTot += (y - meanY) ** 2;
    ssRes += (y - yPred) ** 2;
  }

  const rSquared = ssTot > 1e-10 ? Math.max(0, Math.min(1, 1 - ssRes / ssTot)) : 0;

  return {
    x1: Number(x1.toFixed(3)),
    y1: Number(y1.toFixed(3)),
    x2: Number(x2.toFixed(3)),
    y2: Number(y2.toFixed(3)),
    slope: Number(slope.toFixed(4)),
    offset: Number(offset.toFixed(4)),
    rSquared: Number(rSquared.toFixed(4)),
    sampleCount: n,
  };
}

/**
 * Transforms an array of model/sensor values using the two-point calibration parameters:
 * Corrected = slope * x + offset
 */
export function transformTwoPointCalibration(
  era5Values: (number | null | undefined)[],
  params: TwoPointFitResult
): (number | null)[] {
  const { slope, offset } = params;

  return era5Values.map(v => {
    if (v === null || v === undefined || isNaN(v)) return null;
    const corrected = slope * v + offset;
    return Number(corrected.toFixed(3));
  });
}
