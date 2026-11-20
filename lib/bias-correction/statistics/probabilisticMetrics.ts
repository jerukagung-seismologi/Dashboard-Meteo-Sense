// lib/bias-correction/statistics/probabilisticMetrics.ts

/**
 * Standard Meteorological Probabilistic Verification Metrics:
 * 1. CRPS (Continuous Ranked Probability Score) for ensemble forecasts vs observation
 * 2. Brier Score (BS) & Brier Skill Score (BSS) for threshold precipitation / weather events
 * 3. Reliability Diagram Data Generator & Murphy (1973) Brier Score Decomposition (Reliability, Resolution, Uncertainty)
 */

export interface CRPSResult {
  sampleCount: number;
  /** Mean Continuous Ranked Probability Score across all pairs (lower is better, 0 = perfect) */
  meanCRPS: number;
  /** Minimum and maximum individual CRPS */
  minCRPS: number;
  maxCRPS: number;
  /** Median CRPS */
  medianCRPS: number;
}

export interface BrierScoreResult {
  sampleCount: number;
  /** Brier Score (BS) = (1/N) * sum((p_i - o_i)^2) [0 to 1, optimal: 0] */
  brierScore: number;
  /** Reference Brier Score using sample climatology BS_ref = o_bar * (1 - o_bar) */
  brierScoreRef: number;
  /** Brier Skill Score (BSS) = 1 - (BS / BS_ref) [-Infinity to 1, optimal: 1] */
  brierSkillScore: number;
  /** Observed event frequency (sample climatology base rate) [0 to 1] */
  climatologyBaseRate: number;
  /** Total events observed */
  eventCount: number;
  /** Event threshold description (e.g. ">= 0.1 mm") */
  thresholdLabel?: string;
}

export interface ReliabilityBin {
  binIndex: number;
  binRange: [number, number]; // [min, max]
  nominalProb: number; // Midpoint of bin (e.g. 0.05, 0.15, ...)
  sampleCount: number; // N_k
  sharpness: number; // N_k / N (fraction of total forecasts in this bin)
  meanForecastProb: number; // p_bar_k
  observedFrequency: number | null; // o_bar_k (null if Nk === 0)
  calibrationError: number | null; // |p_bar_k - o_bar_k| (null if Nk === 0)
}

export interface ReliabilityDiagramData {
  sampleCount: number;
  bins: ReliabilityBin[];
  /** Overall Brier Score */
  brierScore: number;
  /** Reliability Loss (REL): weighted mean squared calibration error [optimal: 0] */
  reliability: number;
  /** Resolution (RES): ability to resolve distinct outcome frequencies [higher is better] */
  resolution: number;
  /** Uncertainty (UNC): o_bar * (1 - o_bar) inherent difficulty */
  uncertainty: number;
  /** Climatological sample base rate o_bar */
  climatology: number;
  /** Perfect calibration diagonal line coordinates */
  perfectDiagonal: { x: number; y: number }[];
  /** Brier Skill Score */
  brierSkillScore: number;
}

/**
 * 1. Calculates CRPS for a single ensemble forecast against a scalar observation.
 * Uses exact Gneiting & Raftery (2007) / Hersbach (2000) O(M log M) formulation:
 * CRPS(x, y) = (1/M) * sum(|x_m - y|) - (1 / (2 * M^2)) * sum_i sum_j |x_i - x_j|
 *
 * Special cases:
 * - If M = 1 (single deterministic forecast), CRPS equals MAE: |x_1 - y|
 * - If all members equal y, CRPS equals 0.
 *
 * @param ensemble Array of predictions from ensemble members
 * @param observed Actual ground truth observation
 */
export function calculateCRPS(
  ensemble: (number | null | undefined)[],
  observed: number | null | undefined
): number {
  if (observed === null || observed === undefined || isNaN(observed)) {
    return NaN;
  }

  const validMembers = ensemble.filter(
    (x): x is number => x !== null && x !== undefined && !isNaN(x)
  );

  const M = validMembers.length;
  if (M === 0) {
    return NaN;
  }

  // Single deterministic member: CRPS = |x - y|
  if (M === 1) {
    return Number(Math.abs(validMembers[0] - observed).toFixed(4));
  }

  // Term 1: Mean absolute distance to observation: (1/M) * sum(|x_m - y|)
  let sumAbsDiffObs = 0;
  for (let m = 0; m < M; m++) {
    sumAbsDiffObs += Math.abs(validMembers[m] - observed);
  }
  const term1 = sumAbsDiffObs / M;

  // Term 2: Half mean pairwise distance between members: (1 / (2 * M^2)) * sum_i sum_j |x_i - x_j|
  // Using sorted array: sum_i sum_j |x_i - x_j| = 2 * sum_{i=1}^M (2i - M - 1) * x_{(i)}
  const sorted = [...validMembers].sort((a, b) => a - b);
  let pairwiseSum = 0;
  for (let i = 0; i < M; i++) {
    const rankWeight = 2 * (i + 1) - M - 1;
    pairwiseSum += rankWeight * sorted[i];
  }
  const term2 = pairwiseSum / (M * M);

  const crps = Math.max(0, term1 - term2);
  return Number(crps.toFixed(4));
}

/**
 * Calculates mean CRPS across a series of forecast-observation pairs.
 */
export function calculateMeanCRPS(
  pairs: { ensemble: (number | null | undefined)[]; observed: number | null | undefined }[]
): CRPSResult {
  const scores: number[] = [];

  for (const p of pairs) {
    if (p.observed !== null && p.observed !== undefined && !isNaN(p.observed)) {
      const score = calculateCRPS(p.ensemble, p.observed);
      if (Number.isFinite(score)) {
        scores.push(score);
      }
    }
  }

  const n = scores.length;
  if (n === 0) {
    return {
      sampleCount: 0,
      meanCRPS: 0,
      minCRPS: 0,
      maxCRPS: 0,
      medianCRPS: 0,
    };
  }

  const sum = scores.reduce((a, b) => a + b, 0);
  const meanCRPS = sum / n;

  scores.sort((a, b) => a - b);
  const minCRPS = scores[0];
  const maxCRPS = scores[n - 1];
  const medianCRPS =
    n % 2 === 0 ? (scores[n / 2 - 1] + scores[n / 2]) / 2 : scores[Math.floor(n / 2)];

  return {
    sampleCount: n,
    meanCRPS: Number(meanCRPS.toFixed(4)),
    minCRPS: Number(minCRPS.toFixed(4)),
    maxCRPS: Number(maxCRPS.toFixed(4)),
    medianCRPS: Number(medianCRPS.toFixed(4)),
  };
}

/**
 * 2. Calculates Brier Score (BS) and Brier Skill Score (BSS) for probabilistic event forecasts.
 *
 * @param forecastProbs Array of forecast probabilities [0 to 1]
 * @param observedOutcomes Array of binary outcomes (true/1 for event occurred, false/0 for non-event)
 * @param thresholdLabel Optional label for the event
 */
export function calculateBrierScore(
  forecastProbs: (number | null | undefined)[],
  observedOutcomes: (number | boolean | null | undefined)[],
  thresholdLabel?: string
): BrierScoreResult {
  const len = Math.min(forecastProbs.length, observedOutcomes.length);
  const validPairs: { prob: number; outcome: number }[] = [];

  for (let i = 0; i < len; i++) {
    const p = forecastProbs[i];
    const o = observedOutcomes[i];

    if (p !== null && p !== undefined && !isNaN(p) && o !== null && o !== undefined) {
      // Clamp probability strictly between 0 and 1
      const prob = Math.max(0, Math.min(1, Number(p)));
      const outcome = typeof o === "boolean" ? (o ? 1 : 0) : Number(o) >= 1 ? 1 : 0;
      validPairs.push({ prob, outcome });
    }
  }

  const n = validPairs.length;
  if (n === 0) {
    return {
      sampleCount: 0,
      brierScore: 0,
      brierScoreRef: 0,
      brierSkillScore: 0,
      climatologyBaseRate: 0,
      eventCount: 0,
      thresholdLabel,
    };
  }

  let sumSqErr = 0;
  let eventCount = 0;

  for (const pair of validPairs) {
    const err = pair.prob - pair.outcome;
    sumSqErr += err * err;
    if (pair.outcome === 1) eventCount++;
  }

  const brierScore = sumSqErr / n;
  const oBar = eventCount / n; // Sample climatological base rate
  const brierScoreRef = oBar * (1 - oBar);

  let brierSkillScore = 0;
  if (brierScoreRef > 0) {
    brierSkillScore = 1 - brierScore / brierScoreRef;
  } else if (brierScore === 0) {
    brierSkillScore = 1;
  } else {
    brierSkillScore = 0;
  }

  return {
    sampleCount: n,
    brierScore: Number(brierScore.toFixed(4)),
    brierScoreRef: Number(brierScoreRef.toFixed(4)),
    brierSkillScore: Number(brierSkillScore.toFixed(4)),
    climatologyBaseRate: Number(oBar.toFixed(4)),
    eventCount,
    thresholdLabel,
  };
}

/**
 * 3. Generates Reliability Diagram data and Murphy (1973) Brier Score decomposition.
 *
 * @param forecastProbs Array of forecast probabilities [0 to 1]
 * @param observedOutcomes Array of binary outcomes (1/true or 0/false)
 * @param numBins Number of probability bins (default: 10, i.e. 0-10%, 10-20%, ..., 90-100%)
 */
export function generateReliabilityDiagram(
  forecastProbs: (number | null | undefined)[],
  observedOutcomes: (number | boolean | null | undefined)[],
  numBins = 10
): ReliabilityDiagramData {
  const len = Math.min(forecastProbs.length, observedOutcomes.length);
  const validPairs: { prob: number; outcome: number }[] = [];

  for (let i = 0; i < len; i++) {
    const p = forecastProbs[i];
    const o = observedOutcomes[i];

    if (p !== null && p !== undefined && !isNaN(p) && o !== null && o !== undefined) {
      const prob = Math.max(0, Math.min(1, Number(p)));
      const outcome = typeof o === "boolean" ? (o ? 1 : 0) : Number(o) >= 1 ? 1 : 0;
      validPairs.push({ prob, outcome });
    }
  }

  const N = validPairs.length;
  if (N === 0) {
    return {
      sampleCount: 0,
      bins: [],
      brierScore: 0,
      reliability: 0,
      resolution: 0,
      uncertainty: 0,
      climatology: 0,
      brierSkillScore: 0,
      perfectDiagonal: [
        { x: 0, y: 0 },
        { x: 1, y: 1 },
      ],
    };
  }

  const binWidth = 1 / numBins;

  // Initialize bins
  const binPairs: { prob: number; outcome: number }[][] = Array.from({ length: numBins }, () => []);

  for (const pair of validPairs) {
    // Determine bin index [0, numBins - 1]
    let binIdx = Math.floor(pair.prob / binWidth);
    if (binIdx >= numBins) binIdx = numBins - 1; // Edge case for prob = 1.0
    binPairs[binIdx].push(pair);
  }

  let totalEvents = 0;
  for (const pair of validPairs) {
    if (pair.outcome === 1) totalEvents++;
  }
  const oBar = totalEvents / N;

  const bins: ReliabilityBin[] = [];
  let reliabilitySum = 0; // sum(N_k * (p_bar_k - o_bar_k)^2)
  let resolutionSum = 0; // sum(N_k * (o_bar_k - o_bar)^2)

  for (let k = 0; k < numBins; k++) {
    const minEdge = Number((k * binWidth).toFixed(2));
    const maxEdge = Number(((k + 1) * binWidth).toFixed(2));
    const nominalProb = Number(((minEdge + maxEdge) / 2).toFixed(3));

    const pairsInBin = binPairs[k];
    const Nk = pairsInBin.length;
    const sharpness = Nk / N;

    let pBarK = nominalProb;
    let oBarK: number | null = null;
    let calibrationError: number | null = null;

    if (Nk > 0) {
      const sumP = pairsInBin.reduce((acc, it) => acc + it.prob, 0);
      const sumO = pairsInBin.reduce((acc, it) => acc + it.outcome, 0);
      pBarK = sumP / Nk;
      oBarK = sumO / Nk;

      reliabilitySum += Nk * Math.pow(pBarK - oBarK, 2);
      resolutionSum += Nk * Math.pow(oBarK - oBar, 2);
      calibrationError = Math.abs(pBarK - oBarK);
    } else {
      // Empty bin: no samples fell in this forecast probability range
      pBarK = nominalProb;
      oBarK = null;
      calibrationError = null;
    }

    bins.push({
      binIndex: k,
      binRange: [minEdge, maxEdge],
      nominalProb,
      sampleCount: Nk,
      sharpness: Number(sharpness.toFixed(4)),
      meanForecastProb: Number(pBarK.toFixed(4)),
      observedFrequency: oBarK !== null ? Number(oBarK.toFixed(4)) : null,
      calibrationError: calibrationError !== null ? Number(calibrationError.toFixed(4)) : null,
    });
  }

  const reliability = N > 0 ? reliabilitySum / N : 0;
  const resolution = N > 0 ? resolutionSum / N : 0;
  const uncertainty = oBar * (1 - oBar);

  // Overall Brier Score = REL - RES + UNC
  const brierScore = Math.max(0, reliability - resolution + uncertainty);

  let brierSkillScore = 0;
  if (uncertainty > 0) {
    brierSkillScore = 1 - brierScore / uncertainty;
  } else if (brierScore === 0) {
    brierSkillScore = 1;
  }

  return {
    sampleCount: N,
    bins,
    brierScore: Number(brierScore.toFixed(4)),
    reliability: Number(reliability.toFixed(4)),
    resolution: Number(resolution.toFixed(4)),
    uncertainty: Number(uncertainty.toFixed(4)),
    climatology: Number(oBar.toFixed(4)),
    brierSkillScore: Number(brierSkillScore.toFixed(4)),
    perfectDiagonal: [
      { x: 0, y: 0 },
      { x: 1, y: 1 },
    ],
  };
}
