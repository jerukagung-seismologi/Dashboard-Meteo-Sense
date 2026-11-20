// lib/bias-correction/statistics/hydrologicalMetrics.ts

/**
 * Continuous Hydrometeorological Evaluation Metrics:
 * - NSE (Nash-Sutcliffe Efficiency)
 * - RSR (RMSE-Observations Standard Deviation Ratio)
 * - NRMSE (Normalized Root Mean Square Error)
 * - KGE (Kling-Gupta Efficiency - Gupta et al., 2009 / Kling et al., 2012)
 *
 * Implements standard classification benchmarks (Moriasi et al., 2007; Knoben et al., 2019).
 */

export type HydrologicalPerformanceRating =
  | "Sangat Baik"
  | "Baik"
  | "Memuaskan"
  | "Tidak Memuaskan";

export interface HydrologicalMetricsResult {
  sampleCount: number;
  /** Nash-Sutcliffe Efficiency (-Infinity to 1.0, optimal: 1.0) */
  nse: number;
  nseRating: HydrologicalPerformanceRating;

  /** RMSE-Observations Standard Deviation Ratio (0 to +Infinity, optimal: 0.0) */
  rsr: number;
  rsrRating: HydrologicalPerformanceRating;

  /** Kling-Gupta Efficiency (-Infinity to 1.0, optimal: 1.0) */
  kge: number;
  kgeRating: HydrologicalPerformanceRating;
  /** KGE Components */
  kgeComponents: {
    r: number; // Pearson correlation coefficient
    alpha: number; // Relative variability ratio (sigma_sim / sigma_obs)
    beta: number; // Bias ratio (mu_sim / mu_obs)
    kgeModified?: number; // Modified KGE (Kling et al., 2012 using gamma)
  };

  /** Normalized RMSE by Range: RMSE / (max(obs) - min(obs)) [0 to 1, optimal: 0] */
  nrmseRange: number;
  /** Normalized RMSE by Mean: RMSE / mean(obs) [optimal: 0] */
  nrmseMean: number;
  nrmseRating: HydrologicalPerformanceRating;

  /** Intermediate Statistics */
  rmse: number;
  obsMean: number;
  simMean: number;
  obsStd: number;
  simStd: number;
}

/**
 * Categorizes Nash-Sutcliffe Efficiency according to Moriasi et al. (2007) guidelines.
 */
export function getNSECategory(nse: number): HydrologicalPerformanceRating {
  if (nse > 0.75) return "Sangat Baik";
  if (nse > 0.65) return "Baik";
  if (nse >= 0.5) return "Memuaskan";
  return "Tidak Memuaskan";
}

/**
 * Categorizes RSR according to Moriasi et al. (2007) guidelines.
 */
export function getRSRCategory(rsr: number): HydrologicalPerformanceRating {
  if (rsr <= 0.5) return "Sangat Baik";
  if (rsr <= 0.6) return "Baik";
  if (rsr <= 0.7) return "Memuaskan";
  return "Tidak Memuaskan";
}

/**
 * Categorizes Kling-Gupta Efficiency according to Knoben et al. (2019) benchmarks.
 */
export function getKGECategory(kge: number): HydrologicalPerformanceRating {
  if (kge >= 0.75) return "Sangat Baik";
  if (kge >= 0.5) return "Baik";
  if (kge >= 0.3) return "Memuaskan";
  return "Tidak Memuaskan";
}

/**
 * Categorizes NRMSE (Range-based percentage) into standard performance rating.
 */
export function getNRMSECategory(nrmseRatio: number): HydrologicalPerformanceRating {
  const pct = nrmseRatio * 100;
  if (pct <= 10) return "Sangat Baik";
  if (pct <= 20) return "Baik";
  if (pct <= 30) return "Memuaskan";
  return "Tidak Memuaskan";
}

/**
 * Calculates continuous hydrometeorological verification metrics (NSE, RSR, NRMSE, KGE).
 * Safely guards against division-by-zero, constant observation series, and missing values.
 *
 * @param pairs Matched observed (AWS ground truth) and simulated (ERA5 or model) values.
 */
export function calculateHydrologicalMetrics(
  pairs: { observed: number | null | undefined; simulated: number | null | undefined }[]
): HydrologicalMetricsResult {
  const valid = pairs.filter(
    (p): p is { observed: number; simulated: number } =>
      p.observed !== null &&
      p.observed !== undefined &&
      !isNaN(p.observed) &&
      p.simulated !== null &&
      p.simulated !== undefined &&
      !isNaN(p.simulated)
  );

  const n = valid.length;
  if (n === 0) {
    return {
      sampleCount: 0,
      nse: 0,
      nseRating: "Tidak Memuaskan",
      rsr: 0,
      rsrRating: "Tidak Memuaskan",
      kge: 0,
      kgeRating: "Tidak Memuaskan",
      kgeComponents: { r: 0, alpha: 0, beta: 0 },
      nrmseRange: 0,
      nrmseMean: 0,
      nrmseRating: "Tidak Memuaskan",
      rmse: 0,
      obsMean: 0,
      simMean: 0,
      obsStd: 0,
      simStd: 0,
    };
  }

  let sumObs = 0;
  let sumSim = 0;
  let minObs = Infinity;
  let maxObs = -Infinity;

  for (const p of valid) {
    sumObs += p.observed;
    sumSim += p.simulated;
    if (p.observed < minObs) minObs = p.observed;
    if (p.observed > maxObs) maxObs = p.observed;
  }

  const obsMean = sumObs / n;
  const simMean = sumSim / n;

  let sumSqErr = 0;
  let sumObsVar = 0;
  let sumSimVar = 0;
  let sumCovar = 0;

  for (const p of valid) {
    const err = p.observed - p.simulated;
    sumSqErr += err * err;

    const dObs = p.observed - obsMean;
    const dSim = p.simulated - simMean;

    sumObsVar += dObs * dObs;
    sumSimVar += dSim * dSim;
    sumCovar += dObs * dSim;
  }

  const rmse = Math.sqrt(sumSqErr / n);
  const obsStd = Math.sqrt(sumObsVar / n);
  const simStd = Math.sqrt(sumSimVar / n);

  // 1. Nash-Sutcliffe Efficiency (NSE) = 1 - (sum((obs - sim)^2) / sum((obs - meanObs)^2))
  let nse = 0;
  if (sumObsVar > 0) {
    nse = 1 - sumSqErr / sumObsVar;
  } else if (sumSqErr === 0) {
    // Both observation and simulation are identically constant
    nse = 1;
  } else {
    // Observation is constant, simulation has error
    nse = -999;
  }

  // 2. RSR = RMSE / SD_obs = sqrt(sum((obs - sim)^2)) / sqrt(sum((obs - meanObs)^2))
  let rsr = 0;
  if (obsStd > 0) {
    rsr = rmse / obsStd;
  } else if (rmse === 0) {
    rsr = 0;
  } else {
    rsr = 999;
  }

  // 3. Pearson correlation r
  let r = 0;
  const covarDenom = Math.sqrt(sumObsVar * sumSimVar);
  if (covarDenom > 0) {
    r = sumCovar / covarDenom;
    // Bound r to [-1, 1]
    r = Math.max(-1, Math.min(1, r));
  } else if (obsStd === 0 && simStd === 0) {
    r = 1;
  }

  // 4. Kling-Gupta Efficiency (KGE)
  // beta = simMean / obsMean
  let beta = 1;
  if (Math.abs(obsMean) > 1e-4) {
    const rawBeta = simMean / obsMean;
    beta = Math.max(-50, Math.min(50, rawBeta));
  } else if (Math.abs(simMean) <= 1e-4) {
    beta = 1;
  } else {
    beta = simMean > 0 ? 10 : -10;
  }

  // alpha = simStd / obsStd
  let alpha = 1;
  if (obsStd > 1e-4) {
    const rawAlpha = simStd / obsStd;
    alpha = Math.max(0, Math.min(50, rawAlpha));
  } else if (simStd <= 1e-4) {
    alpha = 1;
  } else {
    alpha = 10;
  }

  // KGE = 1 - sqrt((r - 1)^2 + (alpha - 1)^2 + (beta - 1)^2)
  const ed = Math.sqrt(Math.pow(r - 1, 2) + Math.pow(alpha - 1, 2) + Math.pow(beta - 1, 2));
  const rawKge = 1 - ed;
  const kge = Number.isFinite(rawKge) ? Math.max(-999, rawKge) : -999;

  // Modified KGE (2012) using gamma = (simStd / simMean) / (obsStd / obsMean)
  let kgeModified: number | undefined;
  if (Math.abs(obsMean) > 1e-4 && Math.abs(simMean) > 1e-4 && obsStd > 1e-4) {
    const cvSim = simStd / simMean;
    const cvObs = obsStd / obsMean;
    const gamma = Math.abs(cvObs) > 1e-4 ? Math.max(0, Math.min(50, cvSim / cvObs)) : 1;
    const edMod = Math.sqrt(Math.pow(r - 1, 2) + Math.pow(gamma - 1, 2) + Math.pow(beta - 1, 2));
    const rawKgeMod = 1 - edMod;
    if (Number.isFinite(rawKgeMod)) {
      kgeModified = Number(Math.max(-999, rawKgeMod).toFixed(4));
    }
  }

  // 5. Normalized RMSE (NRMSE)
  // by range: max - min
  const obsRange = maxObs - minObs;
  let nrmseRange = 0;
  if (obsRange > 0) {
    nrmseRange = rmse / obsRange;
  } else if (rmse === 0) {
    nrmseRange = 0;
  } else {
    nrmseRange = 1;
  }

  // by mean
  let nrmseMean = 0;
  if (Math.abs(obsMean) > 1e-7) {
    nrmseMean = rmse / Math.abs(obsMean);
  } else if (rmse === 0) {
    nrmseMean = 0;
  } else {
    nrmseMean = 1;
  }

  return {
    sampleCount: n,
    nse: Number(nse.toFixed(4)),
    nseRating: getNSECategory(nse),
    rsr: Number(rsr.toFixed(4)),
    rsrRating: getRSRCategory(rsr),
    kge: Number(kge.toFixed(4)),
    kgeRating: getKGECategory(kge),
    kgeComponents: {
      r: Number(r.toFixed(4)),
      alpha: Number(alpha.toFixed(4)),
      beta: Number(beta.toFixed(4)),
      kgeModified,
    },
    nrmseRange: Number(nrmseRange.toFixed(4)),
    nrmseMean: Number(nrmseMean.toFixed(4)),
    nrmseRating: getNRMSECategory(nrmseRange),
    rmse: Number(rmse.toFixed(3)),
    obsMean: Number(obsMean.toFixed(3)),
    simMean: Number(simMean.toFixed(3)),
    obsStd: Number(obsStd.toFixed(3)),
    simStd: Number(simStd.toFixed(3)),
  };
}
