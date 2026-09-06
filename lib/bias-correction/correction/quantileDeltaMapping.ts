// lib/bias-correction/correction/quantileDeltaMapping.ts

/**
 * Quantile Delta Mapping (QDM) Bias Correction Algorithm (Cannon et al., 2015).
 * Preserves relative and additive trends in quantiles while correcting systematic bias
 * to ground truth observations.
 */
export interface QDMFitResult {
  quantiles: number[]; // e.g. [0.01, 0.02, ..., 0.99]
  obsQuantiles: number[]; // F_obs^-1(tau)
  modelQuantiles: number[]; // F_model^-1(tau)
  isRatio: boolean; // True for positive variables like rainfall, wind speed, solar lux
  sampleCount: number;
}

/**
 * Linear interpolation helper for empirical quantile functions.
 */
function interpolateQuantile(qArr: number[], vArr: number[], q: number): number {
  if (q <= qArr[0]) return vArr[0];
  if (q >= qArr[qArr.length - 1]) return vArr[vArr.length - 1];

  let low = 0;
  let high = qArr.length - 1;
  while (high - low > 1) {
    const mid = Math.floor((low + high) / 2);
    if (qArr[mid] <= q) low = mid;
    else high = mid;
  }

  const fraction = (q - qArr[low]) / (qArr[high] - qArr[low]);
  return vArr[low] + fraction * (vArr[high] - vArr[low]);
}

/**
 * Empirical CDF value estimation (returns quantile probability tau in [0, 1]).
 */
function empiricalCdf(sortedValues: number[], x: number): number {
  const n = sortedValues.length;
  if (n === 0) return 0.5;
  if (x <= sortedValues[0]) return 0.001;
  if (x >= sortedValues[n - 1]) return 0.999;

  let low = 0;
  let high = n - 1;
  while (high - low > 1) {
    const mid = Math.floor((low + high) / 2);
    if (sortedValues[mid] <= x) low = mid;
    else high = mid;
  }

  const fraction = (x - sortedValues[low]) / Math.max(1e-10, sortedValues[high] - sortedValues[low]);
  const rank = low + fraction;
  return Math.max(0.001, Math.min(0.999, (rank + 0.5) / n));
}

/**
 * Fits Quantile Delta Mapping on calibration pairs.
 */
export function fitQuantileDeltaMapping(
  calibrationPairs: { aws: number; era5: number }[],
  numQuantiles: number = 100,
  isRatio: boolean = false
): QDMFitResult {
  const valid = calibrationPairs.filter(
    p => typeof p.aws === "number" && !isNaN(p.aws) && typeof p.era5 === "number" && !isNaN(p.era5)
  );

  const n = valid.length;
  if (n < 5) {
    return {
      quantiles: [0, 1],
      obsQuantiles: [0, 1],
      modelQuantiles: [0, 1],
      isRatio,
      sampleCount: n,
    };
  }

  const sortedAws = valid.map(p => p.aws).sort((a, b) => a - b);
  const sortedEra5 = valid.map(p => p.era5).sort((a, b) => a - b);

  const quantiles: number[] = [];
  const obsQuantiles: number[] = [];
  const modelQuantiles: number[] = [];

  for (let i = 0; i <= numQuantiles; i++) {
    const tau = i / numQuantiles;
    quantiles.push(tau);

    const idx = tau * (n - 1);
    const low = Math.floor(idx);
    const high = Math.ceil(idx);
    const fraction = idx - low;

    const obsVal = sortedAws[low] + fraction * (sortedAws[high] - sortedAws[low]);
    const modelVal = sortedEra5[low] + fraction * (sortedEra5[high] - sortedEra5[low]);

    obsQuantiles.push(Number(obsVal.toFixed(4)));
    modelQuantiles.push(Number(modelVal.toFixed(4)));
  }

  return {
    quantiles,
    obsQuantiles,
    modelQuantiles,
    isRatio,
    sampleCount: n,
  };
}

/**
 * Transforms an array of model values using QDM:
 * 1. Find quantile tau_t = F_m,cal(x_t)
 * 2. Lookup reference obs: x_obs = F_o,cal^-1(tau_t)
 * 3. Lookup model historical: x_mod_hist = F_m,cal^-1(tau_t)
 * 4. Apply delta:
 *    Additive: y_t = x_obs + (x_t - x_mod_hist)
 *    Ratio:    y_t = x_obs * (x_t / x_mod_hist)
 */
export function transformQuantileDeltaMapping(
  era5Values: (number | null | undefined)[],
  params: QDMFitResult
): (number | null)[] {
  const { quantiles, obsQuantiles, modelQuantiles, isRatio } = params;

  return era5Values.map(v => {
    if (v === null || v === undefined || isNaN(v)) return null;

    // Find tau
    const tau = empiricalCdf(modelQuantiles, v);

    // Invert CDFs
    const obsVal = interpolateQuantile(quantiles, obsQuantiles, tau);
    const modelHistVal = interpolateQuantile(quantiles, modelQuantiles, tau);

    let corrected: number;
    if (isRatio) {
      if (Math.abs(modelHistVal) < 1e-4) {
        corrected = obsVal;
      } else {
        const ratio = Math.max(0.1, Math.min(10, v / modelHistVal));
        corrected = obsVal * ratio;
      }
    } else {
      const delta = v - modelHistVal;
      corrected = obsVal + delta;
    }

    return Number(corrected.toFixed(3));
  });
}
