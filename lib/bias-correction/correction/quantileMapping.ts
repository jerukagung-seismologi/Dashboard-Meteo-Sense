// lib/bias-correction/correction/quantileMapping.ts

export interface QuantileMappingParams {
  quantiles: number[]; // e.g. [0.01, 0.02, ..., 0.99]
  era5Quantiles: number[]; // Values of ERA5 at each quantile
  awsQuantiles: number[]; // Values of AWS at each quantile
  era5Min: number;
  era5Max: number;
  awsMin: number;
  awsMax: number;
  lowerOffset: number; // For extrapolation below calibration min
  upperOffset: number; // For extrapolation above calibration max
  sampleCount: number;
}

/**
 * Calculates empirical quantiles of an array.
 */
export function calculateEmpiricalQuantiles(
  sortedValues: number[],
  probs: number[]
): number[] {
  const n = sortedValues.length;
  if (n === 0) return probs.map(() => 0);
  if (n === 1) return probs.map(() => sortedValues[0]);

  return probs.map(p => {
    const index = p * (n - 1);
    const lower = Math.floor(index);
    const upper = Math.ceil(index);
    const weight = index - lower;

    if (lower === upper) return sortedValues[lower];
    return sortedValues[lower] * (1 - weight) + sortedValues[upper] * weight;
  });
}

/**
 * Fits Empirical Quantile Mapping (EQM) transfer function on calibration pairs.
 */
export function fitQuantileMapping(
  calibrationPairs: { aws: number; era5: number }[],
  numQuantiles: number = 100
): QuantileMappingParams {
  const validAWS = calibrationPairs
    .map(p => p.aws)
    .filter((v): v is number => v !== null && v !== undefined && !isNaN(v))
    .sort((a, b) => a - b);

  const validERA5 = calibrationPairs
    .map(p => p.era5)
    .filter((v): v is number => v !== null && v !== undefined && !isNaN(v))
    .sort((a, b) => a - b);

  const n = Math.min(validAWS.length, validERA5.length);
  if (n < 5) {
    // Fallback if insufficient data
    return {
      quantiles: [0, 0.5, 1],
      era5Quantiles: [0, 0, 0],
      awsQuantiles: [0, 0, 0],
      era5Min: 0,
      era5Max: 0,
      awsMin: 0,
      awsMax: 0,
      lowerOffset: 0,
      upperOffset: 0,
      sampleCount: n,
    };
  }

  // Generate evenly spaced probability intervals (e.g. 0.01 to 0.99)
  const step = 1 / (numQuantiles + 1);
  const probs: number[] = [];
  for (let i = 1; i <= numQuantiles; i++) {
    probs.push(i * step);
  }

  const awsQuantiles = calculateEmpiricalQuantiles(validAWS, probs);
  const era5Quantiles = calculateEmpiricalQuantiles(validERA5, probs);

  const era5Min = validERA5[0];
  const era5Max = validERA5[validERA5.length - 1];
  const awsMin = validAWS[0];
  const awsMax = validAWS[validAWS.length - 1];

  // Extrapolation offsets for tails (preserves anomaly outside calibration range)
  const lowerOffset = awsQuantiles[0] - era5Quantiles[0];
  const upperOffset = awsQuantiles[awsQuantiles.length - 1] - era5Quantiles[era5Quantiles.length - 1];

  return {
    quantiles: probs,
    era5Quantiles,
    awsQuantiles,
    era5Min,
    era5Max,
    awsMin,
    awsMax,
    lowerOffset,
    upperOffset,
    sampleCount: n,
  };
}

/**
 * Transforms ERA5 values using fitted Empirical Quantile Mapping transfer function.
 */
export function transformQuantileMapping(
  era5Values: (number | null | undefined)[],
  params: QuantileMappingParams
): (number | null)[] {
  const { era5Quantiles, awsQuantiles, lowerOffset, upperOffset } = params;
  const k = era5Quantiles.length;

  if (k === 0) return era5Values.map(v => v ?? null);

  return era5Values.map(x => {
    if (x === null || x === undefined || isNaN(x)) return null;

    // Extrapolation below minimum quantile
    if (x <= era5Quantiles[0]) {
      return Number((x + lowerOffset).toFixed(3));
    }

    // Extrapolation above maximum quantile
    if (x >= era5Quantiles[k - 1]) {
      return Number((x + upperOffset).toFixed(3));
    }

    // Binary search / linear search for quantile interval
    let low = 0;
    let high = k - 1;

    while (high - low > 1) {
      const mid = Math.floor((low + high) / 2);
      if (era5Quantiles[mid] <= x) {
        low = mid;
      } else {
        high = mid;
      }
    }

    // Linear interpolation between quantiles
    const x0 = era5Quantiles[low];
    const x1 = era5Quantiles[high];
    const y0 = awsQuantiles[low];
    const y1 = awsQuantiles[high];

    if (Math.abs(x1 - x0) < 1e-9) {
      return Number(y0.toFixed(3));
    }

    const t = (x - x0) / (x1 - x0);
    const y = y0 + t * (y1 - y0);

    return Number(y.toFixed(3));
  });
}
