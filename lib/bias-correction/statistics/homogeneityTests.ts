// lib/bias-correction/statistics/homogeneityTests.ts

/**
 * Hydrometeorological Quality & Homogeneity Tests for AWS and ERA5 Data:
 * 1. RAPS (Rescaled Adjusted Partial Sums) - WMO Homogeneity & Change-Point Detection
 * 2. Double Mass Curve (Kurva Massa Ganda) - Cumulative Consistency Evaluation
 * 3. Spearman Rank Correlation Trend Test - Non-parametric Stationarity Test
 * 4. Sample Adequacy Validator - Evaluates minimum sample duration (504 hours / 3 weeks)
 */

export interface RAPSResult {
  sampleCount: number;
  /** Rescaled Adjusted Partial Sums array (S_k**) */
  skRescaled: number[];
  /** Maximum deviation Q = max |S_k**| */
  qStatistic: number;
  /** Range R = max(S_k**) - min(S_k**) */
  rStatistic: number;
  /** Rescaled Q = Q / sqrt(n) */
  qRescaled: number;
  /** Rescaled R = R / sqrt(n) */
  rRescaled: number;
  /** Critical value at 95% confidence level (~1.27) */
  qCritical95: number;
  /** Homogeneity status: true if Q / sqrt(n) <= 1.27 */
  isHomogeneous: boolean;
  /** Index of maximum shift / change-point (1-based index) */
  changePointIndex: number;
  /** Indonesian interpretation */
  interpretation: string;
}

export interface DoubleMassPoint {
  index: number;
  cumObserved: number;
  cumReference: number;
}

export interface DoubleMassCurveResult {
  sampleCount: number;
  points: DoubleMassPoint[];
  /** Overall linear regression slope (Observed / Reference) */
  overallSlope: number;
  /** Coefficient of determination R^2 of double mass line */
  rSquared: number;
  /** Detected potential break point index (if any) */
  breakPointIndex: number;
  /** Slope before break point */
  slopeBefore: number;
  /** Slope after break point */
  slopeAfter: number;
  /** Slope ratio = slopeAfter / slopeBefore */
  slopeRatio: number;
  /** Consistency flag: true if 0.90 <= slopeRatio <= 1.10 */
  isConsistent: boolean;
  /** Indonesian interpretation */
  interpretation: string;
}

export interface SpearmanTrendResult {
  sampleCount: number;
  /** Spearman rank correlation coefficient r_s [-1 to 1] */
  spearmanR: number;
  /** Student's t-statistic */
  tStatistic: number;
  /** Two-tailed p-value approximation */
  pValue: number;
  /** Trend classification */
  trend: "Meningkat" | "Menurun" | "Stasioner";
  /** Is trend statistically significant at alpha = 0.05 */
  isSignificant: boolean;
  /** Indonesian interpretation */
  interpretation: string;
}

export interface SampleAdequacyResult {
  sampleCount: number;
  minRequiredHours: number;
  coverageRatio: number; // sampleCount / minRequiredHours
  isAdequate: boolean;
  warningMessage?: string;
  recommendation: string;
}

/**
 * 1. RAPS (Rescaled Adjusted Partial Sums)
 * Tests homogeneity of a time series and locates potential change-points / instrument shifts.
 */
export function calculateRAPS(values: (number | null | undefined)[]): RAPSResult {
  const clean = values.filter((v): v is number => v !== null && v !== undefined && !isNaN(v));
  const n = clean.length;

  if (n < 5) {
    return {
      sampleCount: n,
      skRescaled: [],
      qStatistic: 0,
      rStatistic: 0,
      qRescaled: 0,
      rRescaled: 0,
      qCritical95: 1.27,
      isHomogeneous: true,
      changePointIndex: 0,
      interpretation: "Jumlah sampel tidak mencukupi untuk uji RAPS (minimal 5 sampel).",
    };
  }

  // Mean & Standard deviation (sample standard deviation D_y)
  const mean = clean.reduce((a, b) => a + b, 0) / n;
  const variance = clean.reduce((acc, v) => acc + Math.pow(v - mean, 2), 0) / n;
  const dy = Math.sqrt(variance);

  // If standard deviation is 0, all values are identical
  if (dy === 0) {
    return {
      sampleCount: n,
      skRescaled: new Array(n).fill(0),
      qStatistic: 0,
      rStatistic: 0,
      qRescaled: 0,
      rRescaled: 0,
      qCritical95: 1.27,
      isHomogeneous: true,
      changePointIndex: 0,
      interpretation: "Data homogen sempurna (nilai konstan tanpa variasi).",
    };
  }

  const skRescaled: number[] = [];
  let cumSum = 0;
  let maxAbsSk = 0;
  let maxSk = -Infinity;
  let minSk = Infinity;
  let changePointIndex = 0;

  for (let i = 0; i < n; i++) {
    cumSum += clean[i] - mean;
    const skStar = cumSum / dy;
    skRescaled.push(Number(skStar.toFixed(3)));

    const absSk = Math.abs(skStar);
    if (absSk > maxAbsSk) {
      maxAbsSk = absSk;
      changePointIndex = i + 1; // 1-based index
    }
    if (skStar > maxSk) maxSk = skStar;
    if (skStar < minSk) minSk = skStar;
  }

  const qStat = maxAbsSk;
  const rStat = maxSk - minSk;
  const sqrtN = Math.sqrt(n);
  const qRescaled = qStat / sqrtN;
  const rRescaled = rStat / sqrtN;

  // WMO Buishand critical value at alpha = 0.05
  // For n=20: ~1.10, n=50: ~1.22, n>=100: ~1.27 to 1.35
  const qCrit = n < 30 ? 1.15 : n < 70 ? 1.22 : 1.27;
  const isHomogeneous = qRescaled <= qCrit;

  let interpretation = "";
  if (isHomogeneous) {
    interpretation = `Data deret waktu homogen (Q/√n = ${qRescaled.toFixed(2)} <= batas kritis ${qCrit.toFixed(2)}). Tidak terdeteksi lonjakan struktural / pergeseran sensor signifikan.`;
  } else {
    interpretation = `Terdeteksi pergeseran non-homogen struktural (Q/√n = ${qRescaled.toFixed(2)} > batas kritis ${qCrit.toFixed(2)}) pada titik ke-${changePointIndex}. Periksa kemungkinan kalibrasi sensor atau perpindahan stasiun.`;
  }

  return {
    sampleCount: n,
    skRescaled,
    qStatistic: Number(qStat.toFixed(3)),
    rStatistic: Number(rStat.toFixed(3)),
    qRescaled: Number(qRescaled.toFixed(3)),
    rRescaled: Number(rRescaled.toFixed(3)),
    qCritical95: qCrit,
    isHomogeneous,
    changePointIndex,
    interpretation,
  };
}

/**
 * 2. Double Mass Curve (Kurva Massa Ganda)
 * Evaluates consistency of observed station data against reference (ERA5 / neighboring station).
 */
export function calculateDoubleMassCurve(
  observed: (number | null | undefined)[],
  reference: (number | null | undefined)[]
): DoubleMassCurveResult {
  const pairs: { obs: number; ref: number }[] = [];
  const len = Math.min(observed.length, reference.length);

  for (let i = 0; i < len; i++) {
    const o = observed[i];
    const r = reference[i];
    if (o !== null && o !== undefined && !isNaN(o) && r !== null && r !== undefined && !isNaN(r)) {
      pairs.push({ obs: o, ref: r });
    }
  }

  const n = pairs.length;
  if (n < 5) {
    return {
      sampleCount: n,
      points: [],
      overallSlope: 1,
      rSquared: 1,
      breakPointIndex: 0,
      slopeBefore: 1,
      slopeAfter: 1,
      slopeRatio: 1,
      isConsistent: true,
      interpretation: "Jumlah data tidak mencukupi untuk kurva massa ganda.",
    };
  }

  const points: DoubleMassPoint[] = [];
  let cumObs = 0;
  let cumRef = 0;

  for (let i = 0; i < n; i++) {
    cumObs += pairs[i].obs;
    cumRef += pairs[i].ref;
    points.push({
      index: i + 1,
      cumObserved: Number(cumObs.toFixed(2)),
      cumReference: Number(cumRef.toFixed(2)),
    });
  }

  // Linear regression on cumulative values: CumObs = m * CumRef + c
  const meanRef = points.reduce((acc, p) => acc + p.cumReference, 0) / n;
  const meanObs = points.reduce((acc, p) => acc + p.cumObserved, 0) / n;

  let sxy = 0;
  let sxx = 0;
  let syy = 0;

  for (const p of points) {
    const dx = p.cumReference - meanRef;
    const dy = p.cumObserved - meanObs;
    sxy += dx * dy;
    sxx += dx * dx;
    syy += dy * dy;
  }

  const overallSlope = sxx > 0 ? sxy / sxx : 1;
  const r2 = sxx > 0 && syy > 0 ? Math.pow(sxy, 2) / (sxx * syy) : 1;

  // Split at midpoint or detect maximum slope difference in the middle 60%
  const minIdx = Math.floor(n * 0.2);
  const maxIdx = Math.floor(n * 0.8);
  let bestBreak = Math.floor(n / 2);
  let maxSlopeDiff = 0;
  let slopeBefore = overallSlope;
  let slopeAfter = overallSlope;

  for (let k = minIdx; k <= maxIdx; k += Math.max(1, Math.floor(n / 50))) {
    const ref1 = points[k].cumReference;
    const obs1 = points[k].cumObserved;
    const ref2 = points[n - 1].cumReference - ref1;
    const obs2 = points[n - 1].cumObserved - obs1;

    const s1 = ref1 > 0 ? obs1 / ref1 : overallSlope;
    const s2 = ref2 > 0 ? obs2 / ref2 : overallSlope;

    const diff = Math.abs(s1 - s2);
    if (diff > maxSlopeDiff) {
      maxSlopeDiff = diff;
      bestBreak = k;
      slopeBefore = s1;
      slopeAfter = s2;
    }
  }

  const slopeRatio = slopeBefore > 0 ? slopeAfter / slopeBefore : 1;
  const isConsistent = slopeRatio >= 0.9 && slopeRatio <= 1.1;

  let interpretation = "";
  if (isConsistent) {
    interpretation = `Kurva massa ganda konsisten (Rasio lereng = ${slopeRatio.toFixed(2)}, R² = ${r2.toFixed(3)}). Korelasi akumulasi stasiun vs referensi linier dan stabil.`;
  } else {
    interpretation = `Terdeteksi deviasi lereng kurva massa ganda (Rasio lereng = ${slopeRatio.toFixed(2)}) pada titik ke-${bestBreak}. Terdapat indikasi drift sensor atau deviasi akumulasi.`;
  }

  return {
    sampleCount: n,
    points,
    overallSlope: Number(overallSlope.toFixed(3)),
    rSquared: Number(r2.toFixed(4)),
    breakPointIndex: bestBreak,
    slopeBefore: Number(slopeBefore.toFixed(3)),
    slopeAfter: Number(slopeAfter.toFixed(3)),
    slopeRatio: Number(slopeRatio.toFixed(3)),
    isConsistent,
    interpretation,
  };
}

/**
 * Helper to compute ranks of an array, averaging ties.
 */
function computeRanks(arr: number[]): number[] {
  const indexed = arr.map((val, idx) => ({ val, idx }));
  indexed.sort((a, b) => a.val - b.val);

  const ranks = new Array(arr.length).fill(0);
  let i = 0;
  while (i < indexed.length) {
    let j = i;
    while (j < indexed.length - 1 && indexed[j + 1].val === indexed[j].val) {
      j++;
    }
    const count = j - i + 1;
    const avgRank = (i + 1 + j + 1) / 2;
    for (let k = i; k <= j; k++) {
      ranks[indexed[k].idx] = avgRank;
    }
    i = j + 1;
  }
  return ranks;
}

/**
 * 3. Spearman Rank Correlation Trend Test
 * Non-parametric WMO stationarity test for monotonic upward or downward trend in time series.
 */
export function calculateSpearmanTrendTest(
  values: (number | null | undefined)[]
): SpearmanTrendResult {
  const clean = values.filter((v): v is number => v !== null && v !== undefined && !isNaN(v));
  const n = clean.length;

  if (n < 5) {
    return {
      sampleCount: n,
      spearmanR: 0,
      tStatistic: 0,
      pValue: 1,
      trend: "Stasioner",
      isSignificant: false,
      interpretation: "Jumlah sampel tidak mencukupi untuk uji tren Spearman (minimal 5 sampel).",
    };
  }

  // Time ranks: 1, 2, ..., n
  const timeRanks = Array.from({ length: n }, (_, i) => i + 1);
  const valueRanks = computeRanks(clean);

  const meanRank = (n + 1) / 2;

  let num = 0;
  let denT = 0;
  let denV = 0;

  for (let i = 0; i < n; i++) {
    const dt = timeRanks[i] - meanRank;
    const dv = valueRanks[i] - meanRank;
    num += dt * dv;
    denT += dt * dt;
    denV += dv * dv;
  }

  const denom = Math.sqrt(denT * denV);
  const spearmanR = denom > 0 ? num / denom : 0;

  // Student's t-statistic: t = r_s * sqrt((n - 2) / (1 - r_s^2))
  let tStat = 0;
  if (Math.abs(spearmanR) < 1) {
    tStat = spearmanR * Math.sqrt((n - 2) / (1 - Math.pow(spearmanR, 2)));
  } else {
    tStat = spearmanR > 0 ? 999 : -999;
  }

  // Approximate p-value (two-tailed using standard normal / t approximation for n >= 10)
  // Standard normal CDF approximation (Abramowitz & Stegun formula 26.2.17)
  const z = Math.abs(tStat);
  const t = 1 / (1 + 0.2316419 * z);
  const d = 0.39894228 * Math.exp((-z * z) / 2);
  const pNorm = d * t * (0.3193815 + t * (-0.3565638 + t * (1.781478 + t * (-1.821256 + t * 1.330274))));
  const pValue = Math.min(1, Math.max(0, 2 * pNorm));

  const isSignificant = pValue < 0.05;
  let trend: "Meningkat" | "Menurun" | "Stasioner" = "Stasioner";

  if (isSignificant) {
    trend = spearmanR > 0 ? "Meningkat" : "Menurun";
  }

  let interpretation = "";
  if (isSignificant) {
    interpretation = `Terdeteksi tren ${trend.toLowerCase()} signifikan (r_s = ${spearmanR.toFixed(3)}, t = ${tStat.toFixed(2)}, p = ${pValue.toFixed(4)} < 0.05). Deret waktu tidak stasioner secara statistik.`;
  } else {
    interpretation = `Deret waktu stasioner (r_s = ${spearmanR.toFixed(3)}, p = ${pValue.toFixed(3)} >= 0.05). Tidak terdeteksi tren monotonik signifikan.`;
  }

  return {
    sampleCount: n,
    spearmanR: Number(spearmanR.toFixed(3)),
    tStatistic: Number(tStat.toFixed(3)),
    pValue: Number(pValue.toFixed(4)),
    trend,
    isSignificant,
    interpretation,
  };
}

/**
 * 4. Validasi Kecukupan Sampel AWS vs Referensi
 * WMO best-practice recommendation: at least 504 hours (3 weeks) of continuous hourly pairs
 * are required for statistically robust bias correction and validation.
 */
export function validateSampleAdequacy(
  sampleCount: number,
  minRequiredHours = 504
): SampleAdequacyResult {
  const count = Math.max(0, sampleCount || 0);
  const isAdequate = count >= minRequiredHours;
  const coverageRatio = Number((count / minRequiredHours).toFixed(3));

  let warningMessage: string | undefined;
  let recommendation = "";

  if (!isAdequate) {
    const deficitHours = minRequiredHours - count;
    const deficitDays = (deficitHours / 24).toFixed(1);
    warningMessage = `Perhatian: Jumlah sampel valid (${count} jam) berada di bawah ambang batas kecukupan ilmiah (${minRequiredHours} jam / 3 minggu). Kurang ${deficitHours} jam (~${deficitDays} hari).`;
    recommendation = `Perpanjang rentang tanggal observasi AWS minimal 3 minggu untuk mencegah overfitting dan distorsi pada penyesuaian bias model.`;
  } else {
    const weeks = (count / 168).toFixed(1);
    recommendation = `Kecukupan sampel terpenuhi (${count} jam / ~${weeks} minggu). Data memenuhi standar keterwakilan statistik untuk kalibrasi dan validasi.`;
  }

  return {
    sampleCount: count,
    minRequiredHours,
    coverageRatio,
    isAdequate,
    warningMessage,
    recommendation,
  };
}
