/**
 * Universal Meteorological Imputation Engine
 * ============================================
 * Based on the Two-Phase Hybrid Meteorological Imputation Framework:
 * 1. Continuous 1-Minute Grid Snapping & Multi-Scale Gap Detection
 * 2. Phase 1: Micro-Gap Spline / Time-Weighted Interpolation (<= 15 minutes)
 * 3. Phase 2: Macro-Gap Reconstruction:
 *    - Phase 2A: Companion Cross-Node Spatial Ridge Transfer (with diurnal harmonic encodings)
 *    - Phase 2B: Atmospheric Model Guided Transfer (ECMWF IFS 9km / ERA5)
 *    - Phase 2C: Monotonic Cubic PCHIP Spline (WMO No. 8 Standard)
 * 4. Phase 2.5: Boundary-Conditioned Residual Bridging (Dirichlet-Neumann Cosine S-Curve, zero step-jump)
 * 5. Phase 3: Physics-Informed Post-Processing (August-Roche-Magnus consistency, WMO limits, Savitzky-Golay de-jittering)
 */

import {
  computePchipSlopes,
  interpolateCubicHermite,
  recalculateRHMagnus,
} from "./meteorologicalInterpolation";

const WIB_OFFSET_MS = 7 * 3600 * 1000;
const DAY_MS = 86400 * 1000;

export const DEFAULT_BASELINE_BY_VAR: Record<string, number> = {
  temperature: 27.0,
  humidity: 80.0,
  pressure: 1010.0,
  dew: 23.0,
  dewpoint: 23.0,
  rainfall: 0.0,
  rainrate: 0.0,
  lux: 0.0,
  soil_temp: 27.0,
  windSpeed: 1.5,
  wind_speed: 1.5,
  volt: 12.0,
};

function pad2(n: number): string {
  return n < 10 ? `0${n}` : `${n}`;
}

/**
 * Ekstraksi komponen waktu Asia/Jakarta (+07:00 WIB) yang deterministik
 * tanpa bergantung pada zona waktu lokal browser/sistem operasi.
 */
export function getWibTimeComponents(tsMs: number): {
  timeFormatted: string;
  dateFormatted: string;
  hourFrac: number;
} {
  const wibDate = new Date(tsMs + WIB_OFFSET_MS);
  const hh = wibDate.getUTCHours();
  const mm = wibDate.getUTCMinutes();
  const ss = wibDate.getUTCSeconds();
  const dd = wibDate.getUTCDate();
  const mo = wibDate.getUTCMonth() + 1;
  const yyyy = wibDate.getUTCFullYear();
  return {
    timeFormatted: `${pad2(hh)}:${pad2(mm)}:00`,
    dateFormatted: `${pad2(dd)}/${pad2(mo)}/${yyyy} ${pad2(hh)}:${pad2(mm)}`,
    hourFrac: hh + mm / 60.0 + ss / 3600.0,
  };
}

interface SortedSample {
  ts: number;
  val: number;
}

function readVarNumber(record: Record<string, any>, varKey: string): number {
  let raw = record[varKey];
  if ((raw === undefined || raw === null) && (varKey === "dew" || varKey === "dewpoint")) {
    raw = varKey === "dew" ? record.dewpoint : record.dew;
  }
  if ((raw === undefined || raw === null) && (varKey === "windSpeed" || varKey === "wind_speed")) {
    raw = varKey === "windSpeed" ? record.wind_speed : record.windSpeed;
  }
  if (raw === undefined || raw === null || raw === "") return NaN;
  const n = Number(raw);
  return Number.isFinite(n) ? n : NaN;
}

function buildSortedSamples(
  records: Array<{ timestamp: number; [key: string]: any }>,
  varKey: string
): SortedSample[] {
  const map = new Map<number, number>();
  for (let i = 0; i < records.length; i++) {
    const r = records[i];
    if (!Number.isFinite(r.timestamp)) continue;
    const v = readVarNumber(r, varKey);
    if (Number.isFinite(v)) {
      map.set(Math.round(r.timestamp / 60000) * 60000, v);
    }
  }
  return Array.from(map.entries())
    .map(([ts, val]) => ({ ts, val }))
    .sort((a, b) => a.ts - b.ts);
}

/**
 * Mencari nilai kontinu pada timestamp ts lewat interpolasi linier pencarian biner.
 * Menghilangkan pola gigi gergaji (sawtooth) saat mencocokkan data model per 1 jam
 * atau stasiun pembanding yang memiliki sedikit jitter waktu ke grid per 1 menit.
 */
function interpolateSortedAt(
  samples: SortedSample[],
  ts: number,
  maxGapMs: number
): number | null {
  const n = samples.length;
  if (n === 0) return null;
  if (ts <= samples[0].ts) {
    return samples[0].ts - ts <= maxGapMs ? samples[0].val : null;
  }
  if (ts >= samples[n - 1].ts) {
    return ts - samples[n - 1].ts <= maxGapMs ? samples[n - 1].val : null;
  }
  let lo = 0;
  let hi = n - 1;
  while (lo <= hi) {
    const mid = (lo + hi) >> 1;
    if (samples[mid].ts === ts) return samples[mid].val;
    if (samples[mid].ts < ts) lo = mid + 1;
    else hi = mid - 1;
  }
  const left = samples[hi];
  const right = samples[lo];
  const span = right.ts - left.ts;
  if (span <= 0) return left.val;
  if (span > maxGapMs) {
    if (ts - left.ts <= maxGapMs * 0.5) return left.val;
    if (right.ts - ts <= maxGapMs * 0.5) return right.val;
    return null;
  }
  const alpha = (ts - left.ts) / span;
  return left.val + alpha * (right.val - left.val);
}

export interface GapSegment {
  id: string;
  startIndex: number;
  endIndex: number;
  startTs: number; // ms
  endTs: number;   // ms
  durationMinutes: number;
  type: "micro" | "macro";
  valBefore: number | null;
  valAfter: number | null;
}

export interface ImputedGridPoint {
  timestamp: number; // ms
  timestampInSeconds: number; // s
  timeFormatted: string; // HH:mm:ss
  dateFormatted: string; // dd/MM/yyyy HH:mm
  rawVal: number | null;
  imputedVal: number;
  isOriginal: boolean;
  isImputed: boolean;
  imputationPhase:
    | "original"
    | "micro_spline"
    | "self_history"
    | "companion_ridge"
    | "model_guided"
    | "pchip_spline";
  gapType: "micro" | "macro" | null;
  // Multi-variable support
  temperature?: number;
  humidity?: number;
  pressure?: number;
  dew?: number;
  dewpoint?: number;
  rainfall?: number;
  rainrate?: number;
  lux?: number;
  soil_temp?: number;
  windSpeed?: number;
  volt?: number;
}

export interface ImputationConfig {
  microGapLimitMinutes?: number; // default: 15
  companionStationId?: string;
  enableSpatialTransfer?: boolean;
  enableModelGuided?: boolean;
  enableSelfHistory?: boolean; // default: true
  preferSelfHistory?: boolean; // default: false
  enableBoundaryBridging?: boolean; // default: true
  enablePhysicsPostProcessing?: boolean; // default: true
  savgolWindow?: number; // default: 15
  savgolPoly?: number; // default: 2
  ridgeAlpha?: number; // default: 1.0
}

export interface SelfHistoryDiurnalProfile {
  varKey: string;
  slots: number[]; // panjang 1440 (menit 00:00..23:59 WIB)
  populatedSlots: number;
  sourceRecordCount: number;
}

const NON_DIURNAL_VARS = new Set(["rainfall", "rainrate"]);

const NON_NEGATIVE_VARS = new Set([
  "rainfall",
  "rainrate",
  "windSpeed",
  "wind_speed",
  "lux",
  "solar_radiation",
  "battery",
  "volt",
]);

const HISTORY_SANITY_BOUNDS: Record<string, [number, number]> = {
  temperature: [-10, 55],
  humidity: [0, 100],
  pressure: [850, 1080],
  dew: [-10, 45],
  dewpoint: [-10, 45],
  windSpeed: [0, 75],
  wind_speed: [0, 75],
  lux: [0, 200000],
  soil_temp: [-10, 65],
  volt: [0, 30],
};

export function clampPhysicsBounds(varKey: string, val: number): number {
  if (!Number.isFinite(val)) return val;
  if (varKey === "humidity") return Math.min(100.0, Math.max(0.0, val));
  if (varKey === "pressure") return Math.min(1080.0, Math.max(850.0, val));
  if (NON_NEGATIVE_VARS.has(varKey)) return Math.max(0.0, val);
  return val;
}

/**
 * Membangun profil diurnal median per-menit (1440 slot WIB) dari riwayat bersih node target sendiri (H-1..H-N).
 * Menolak variabel presipitasi (rainfall/rainrate) karena tidak bersifat siklik diurnal.
 */
export function buildSelfHistoryDiurnalProfile(
  historyRecords: Array<{ timestamp: number; [key: string]: any }>,
  varKey: string,
  smoothRadius: number = 7
): SelfHistoryDiurnalProfile | null {
  if (NON_DIURNAL_VARS.has(varKey) || !historyRecords || historyRecords.length === 0) {
    return null;
  }

  const sanity = HISTORY_SANITY_BOUNDS[varKey];
  const buckets: number[][] = Array.from({ length: 1440 }, () => []);
  let validCount = 0;

  for (let i = 0; i < historyRecords.length; i++) {
    const r = historyRecords[i];
    if (!Number.isFinite(r.timestamp)) continue;
    const v = readVarNumber(r, varKey);
    if (!Number.isFinite(v)) continue;
    if (sanity && (v < sanity[0] || v > sanity[1])) continue;

    const { hourFrac } = getWibTimeComponents(r.timestamp);
    const slot = Math.min(1439, Math.max(0, Math.floor(hourFrac * 60)));
    buckets[slot].push(v);
    validCount++;
  }

  if (validCount === 0) return null;

  const rawSlots: Array<number | null> = new Array(1440).fill(null);
  const populatedIndices: number[] = [];
  for (let m = 0; m < 1440; m++) {
    if (buckets[m].length > 0) {
      rawSlots[m] = computeMedian(buckets[m]);
      populatedIndices.push(m);
    }
  }

  if (populatedIndices.length === 0) return null;

  // Interpolasi melingkar (wrapping 23:59 -> 00:00 WIB) untuk slot kosong
  const filled = new Array<number>(1440);
  if (populatedIndices.length === 1) {
    const onlyVal = rawSlots[populatedIndices[0]]!;
    filled.fill(onlyVal);
  } else {
    for (let p = 0; p < populatedIndices.length; p++) {
      const i0 = populatedIndices[p];
      const i1 = populatedIndices[(p + 1) % populatedIndices.length];
      const v0 = rawSlots[i0]!;
      const v1 = rawSlots[i1]!;
      filled[i0] = v0;

      const stepSpan = i1 > i0 ? i1 - i0 : 1440 - i0 + i1;
      for (let k = 1; k < stepSpan; k++) {
        const targetIdx = (i0 + k) % 1440;
        const frac = k / stepSpan;
        filled[targetIdx] = v0 + frac * (v1 - v0);
      }
    }
  }

  // Penghalusan melingkar berbobot segitiga (±smoothRadius menit) agar ritme diurnal mulus tanpa meratakan puncak
  const r = Math.max(0, Math.min(30, Math.floor(smoothRadius)));
  const smoothed = new Array<number>(1440);
  for (let m = 0; m < 1440; m++) {
    if (r === 0) {
      smoothed[m] = clampPhysicsBounds(varKey, filled[m]);
      continue;
    }
    let wSum = 0;
    let vSum = 0;
    for (let d = -r; d <= r; d++) {
      const idx = ((m + d) % 1440 + 1440) % 1440;
      const w = r + 1 - Math.abs(d);
      vSum += filled[idx] * w;
      wSum += w;
    }
    smoothed[m] = clampPhysicsBounds(varKey, vSum / wSum);
  }

  return {
    varKey,
    slots: smoothed,
    populatedSlots: populatedIndices.length,
    sourceRecordCount: validCount,
  };
}

/**
 * Mengambil nilai acuan profil diurnal historis pada timestamp tsMs (WIB +07:00)
 * menggunakan interpolasi linier sub-menit antarslot.
 */
export function lookupSelfHistoryProfileAt(
  profile: SelfHistoryDiurnalProfile | null | undefined,
  tsMs: number
): number | null {
  if (!profile || profile.slots.length !== 1440 || !Number.isFinite(tsMs)) return null;
  const { hourFrac } = getWibTimeComponents(tsMs);
  const minutePos = (((hourFrac * 60) % 1440) + 1440) % 1440;
  const m0 = Math.floor(minutePos) % 1440;
  const m1 = (m0 + 1) % 1440;
  const frac = minutePos - Math.floor(minutePos);
  const y0 = profile.slots[m0];
  const y1 = profile.slots[m1];
  if (!Number.isFinite(y0) || !Number.isFinite(y1)) return null;
  return y0 * (1 - frac) + y1 * frac;
}

export interface ImputationSummary {
  totalExpectedMinutes: number;
  originalAvailableCount: number;
  originalMissingCount: number;
  microGapsCount: number;
  microGapsMinutes: number;
  macroGapsCount: number;
  macroGapsMinutes: number;
  filledMicroCount: number;
  filledMacroCount: number;
  completenessPercent: number;
  segments: GapSegment[];
}

/**
 * 1. Inversi Matriks 4x4 Analitik dengan Eliminasi Gauss-Jordan
 * Digunakan untuk menyelesaikan Persamaan Normal Regresi Ridge: (X^T * X + alpha * I)^-1
 */
function invertMatrix4x4(A: number[][]): number[][] | null {
  const n = 4;
  const M: number[][] = A.map((row, i) => [
    ...row,
    i === 0 ? 1 : 0,
    i === 1 ? 1 : 0,
    i === 2 ? 1 : 0,
    i === 3 ? 1 : 0,
  ]);

  for (let i = 0; i < n; i++) {
    // Cari baris pivot terbesar
    let maxRow = i;
    for (let k = i + 1; k < n; k++) {
      if (Math.abs(M[k][i]) > Math.abs(M[maxRow][i])) {
        maxRow = k;
      }
    }
    if (Math.abs(M[maxRow][i]) < 1e-12) return null; // Matriks singular

    // Tukar baris
    const tmp = M[i];
    M[i] = M[maxRow];
    M[maxRow] = tmp;

    // Normalisasi baris pivot
    const pivot = M[i][i];
    for (let j = 0; j < 2 * n; j++) {
      M[i][j] /= pivot;
    }

    // Eliminasi baris lain
    for (let k = 0; k < n; k++) {
      if (k !== i) {
        const factor = M[k][i];
        for (let j = 0; j < 2 * n; j++) {
          M[k][j] -= factor * M[i][j];
        }
      }
    }
  }

  return M.map((row) => row.slice(n, 2 * n));
}

/**
 * 2. Companion Spatial Ridge Regression Solver
 * Melatih model regresi Ridge dengan fitur:
 * [ X_companion, sin(2*pi*t/24), cos(2*pi*t/24), 1 (intercept) ] -> Y_target
 */
export interface NodeSignatureTransferModel {
  predict: (refVal: number, timestamp: number) => number;
  mode: "spatial_ridge" | "scalar_bias";
  sampleCount: number;
  distinctHours: number;
  bias: number;
  slope: number;
}

function fitSpatialRidgeWithCoeffs(
  commonSamples: Array<{ targetVal: number; companionVal: number; timestamp: number }>,
  alpha: number = 1.0
): {
  beta: [number, number, number, number];
  predict: (companionVal: number, timestamp: number) => number;
} | null {
  if (commonSamples.length < 15) return null; // Kurang data latih

  // Bangun matriks X^T * X (4x4) dan vektor X^T * y (4x1)
  const XtX: number[][] = [
    [0, 0, 0, 0],
    [0, 0, 0, 0],
    [0, 0, 0, 0],
    [0, 0, 0, 0],
  ];
  const Xty: number[] = [0, 0, 0, 0];

  for (let s = 0; s < commonSamples.length; s++) {
    const item = commonSamples[s];
    const { hourFrac } = getWibTimeComponents(item.timestamp);
    const sinT = Math.sin((2 * Math.PI * hourFrac) / 24.0);
    const cosT = Math.cos((2 * Math.PI * hourFrac) / 24.0);
    const f = [item.companionVal, sinT, cosT, 1.0];

    for (let i = 0; i < 4; i++) {
      for (let j = 0; j < 4; j++) {
        XtX[i][j] += f[i] * f[j];
      }
      Xty[i] += f[i] * item.targetVal;
    }
  }

  // Terapkan penalti L2 Ridge: XtX + alpha * I (regulasi ringan untuk intercept di indeks 3)
  for (let i = 0; i < 3; i++) {
    XtX[i][i] += alpha;
  }
  XtX[3][3] += alpha * 0.01;

  // Inversi XtX
  const inv = invertMatrix4x4(XtX);
  if (!inv) return null;

  // Hitung koefisien beta = inv * Xty
  const beta: [number, number, number, number] = [0, 0, 0, 0];
  for (let i = 0; i < 4; i++) {
    for (let j = 0; j < 4; j++) {
      beta[i] += inv[i][j] * Xty[j];
    }
  }

  if (!beta.every((v) => Number.isFinite(v))) return null;

  return {
    beta,
    predict: (companionVal: number, timestamp: number) => {
      const { hourFrac } = getWibTimeComponents(timestamp);
      const sinT = Math.sin((2 * Math.PI * hourFrac) / 24.0);
      const cosT = Math.cos((2 * Math.PI * hourFrac) / 24.0);
      return beta[0] * companionVal + beta[1] * sinT + beta[2] * cosT + beta[3];
    },
  };
}

export function fitSpatialRidgeModel(
  commonSamples: Array<{ targetVal: number; companionVal: number; timestamp: number }>,
  alpha: number = 1.0
): ((companionVal: number, timestamp: number) => number) | null {
  return fitSpatialRidgeWithCoeffs(commonSamples, alpha)?.predict ?? null;
}

/**
 * Melatih adaptor tanda mikroklimat node (Node Signature Transfer):
 * - Menggunakan 4-fitur Spatial Ridge (slope + fase sin/cos 24h WIB + intercept) bila sampel
 *   bersih mencukupi cakupan diurnal (>=24 sampel, >=6 jam berbeda, >=2 kuadran 6-jam) dan slope wajar.
 * - Fallback aman ke bias median skalar agar tidak terjadi ekstrapolasi liar saat data latih hanya malam hari.
 */
export function fitNodeSignatureTransferModel(
  commonSamples: Array<{ targetVal: number; companionVal: number; timestamp: number }>,
  varKey: string,
  alpha: number = 1.0
): NodeSignatureTransferModel | null {
  if (NON_DIURNAL_VARS.has(varKey) || !commonSamples || commonSamples.length === 0) {
    return null;
  }

  const sanity = HISTORY_SANITY_BOUNDS[varKey];
  const valid: Array<{ targetVal: number; companionVal: number; timestamp: number }> = [];
  const hourSet = new Set<number>();
  const quadrantSet = new Set<number>();

  for (let i = 0; i < commonSamples.length; i++) {
    const item = commonSamples[i];
    if (
      !Number.isFinite(item.targetVal) ||
      !Number.isFinite(item.companionVal) ||
      !Number.isFinite(item.timestamp)
    ) {
      continue;
    }
    if (
      sanity &&
      (item.targetVal < sanity[0] ||
        item.targetVal > sanity[1] ||
        item.companionVal < sanity[0] ||
        item.companionVal > sanity[1])
    ) {
      continue;
    }
    valid.push(item);
    const { hourFrac } = getWibTimeComponents(item.timestamp);
    const hourInt = Math.min(23, Math.max(0, Math.floor(hourFrac)));
    hourSet.add(hourInt);
    quadrantSet.add(Math.floor(hourInt / 6));
  }

  if (valid.length === 0) return null;

  const bias = computeMedian(valid.map((s) => s.targetVal - s.companionVal)) ?? 0;

  if (valid.length >= 24 && hourSet.size >= 6 && quadrantSet.size >= 2) {
    const fitted = fitSpatialRidgeWithCoeffs(valid, alpha);
    if (fitted && fitted.beta[0] >= 0.05 && fitted.beta[0] <= 2.5) {
      let sqRidge = 0;
      let sqBias = 0;
      for (let i = 0; i < valid.length; i++) {
        const s = valid[i];
        const rPred = clampPhysicsBounds(varKey, fitted.predict(s.companionVal, s.timestamp));
        const bPred = clampPhysicsBounds(varKey, s.companionVal + bias);
        sqRidge += (rPred - s.targetVal) ** 2;
        sqBias += (bPred - s.targetVal) ** 2;
      }
      const ridgeRmse = Math.sqrt(sqRidge / valid.length);
      const biasRmse = Math.sqrt(sqBias / valid.length);

      if (ridgeRmse <= Math.max(biasRmse * 1.15, biasRmse + 0.5)) {
        return {
          mode: "spatial_ridge",
          sampleCount: valid.length,
          distinctHours: hourSet.size,
          bias,
          slope: fitted.beta[0],
          predict: (refVal: number, timestamp: number) =>
            clampPhysicsBounds(varKey, fitted.predict(refVal, timestamp)),
        };
      }
    }
  }

  return {
    mode: "scalar_bias",
    sampleCount: valid.length,
    distinctHours: hourSet.size,
    bias,
    slope: 1.0,
    predict: (refVal: number) => clampPhysicsBounds(varKey, refVal + bias),
  };
}

/**
 * 3. Boundary-Conditioned Residual Bridging Engine
 * Mengeliminasi vertical jump discontinuity (patahan vertikal) di kedua batas gap
 * menggunakan bobot transisi Cosine-Hermite S-Curve w(tau) = (1 - cos(pi * tau)) / 2
 * dengan penomoran interior tau = (i + 1) / (n + 1) agar titik tepi celah tidak terduplikasi.
 */
export function applyBoundaryBridging(
  rawImputedSeries: number[],
  valBefore: number | null,
  valAfter: number | null,
  predAtBefore?: number | null,
  predAtAfter?: number | null
): number[] {
  const n = rawImputedSeries.length;
  if (n === 0) return [];
  const bridged = [...rawImputedSeries];

  // Kasus 1: Kedua batas diketahui (Standard Two-Sided Gap)
  if (valBefore !== null && valAfter !== null) {
    const refStart = predAtBefore != null && Number.isFinite(predAtBefore) ? predAtBefore : rawImputedSeries[0];
    const refEnd = predAtAfter != null && Number.isFinite(predAtAfter) ? predAtAfter : rawImputedSeries[n - 1];
    const deltaStart = valBefore - refStart;
    const deltaEnd = valAfter - refEnd;

    if (n === 1) {
      bridged[0] = rawImputedSeries[0] + (deltaStart + deltaEnd) / 2.0;
      return bridged;
    }

    for (let i = 0; i < n; i++) {
      const tau = (i + 1) / (n + 1);
      const w = (1.0 - Math.cos(Math.PI * tau)) / 2.0;
      const correction = (1.0 - w) * deltaStart + w * deltaEnd;
      bridged[i] = rawImputedSeries[i] + correction;
    }
    return bridged;
  }

  // Kasus 2: Hanya batas awal diketahui (Leading-anchored / Trailing gap)
  if (valBefore !== null && valAfter === null) {
    const refStart = predAtBefore != null && Number.isFinite(predAtBefore) ? predAtBefore : rawImputedSeries[0];
    const deltaStart = valBefore - refStart;
    const tauDecay = 120.0;
    for (let i = 0; i < n; i++) {
      bridged[i] = rawImputedSeries[i] + deltaStart * Math.exp(-(i + 1) / tauDecay);
    }
    return bridged;
  }

  // Kasus 3: Hanya batas akhir diketahui (Trailing-anchored / Leading gap)
  if (valBefore === null && valAfter !== null) {
    const refEnd = predAtAfter != null && Number.isFinite(predAtAfter) ? predAtAfter : rawImputedSeries[n - 1];
    const deltaEnd = valAfter - refEnd;
    const tauDecay = 120.0;
    for (let i = 0; i < n; i++) {
      const distFromEnd = n - i;
      bridged[i] = rawImputedSeries[i] + deltaEnd * Math.exp(-distFromEnd / tauDecay);
    }
    return bridged;
  }

  // Kasus 4: Kedua batas tidak diketahui
  return bridged;
}

/**
 * 4. Savitzky-Golay Zero-Phase Convolution Filter (polinomial kuadratik orde p=2)
 * Mendukung panjang jendela ganjil dinamis (default W=15) untuk menghilangkan noise kuantisasi ADC
 * tanpa distorsi fase atau redaman diurnal.
 */
export function applySavitzkyGolayFilter(values: number[], windowSize: number = 15): number[] {
  const n = values.length;
  const oddWindow = Math.max(5, windowSize % 2 === 0 ? windowSize + 1 : windowSize);
  if (n < oddWindow) return values;

  const m = Math.floor(oddWindow / 2);
  const denom = ((2 * m - 1) * (2 * m + 1) * (2 * m + 3)) / 3.0;
  const weights: number[] = [];
  const baseCoeff = 3 * m * m + 3 * m - 1;
  for (let i = -m; i <= m; i++) {
    weights.push((baseCoeff - 5.0 * i * i) / denom);
  }

  const smoothed = new Float64Array(n);

  for (let i = 0; i < n; i++) {
    let sum = 0.0;
    let weightSum = 0.0;

    for (let j = -m; j <= m; j++) {
      const idx = i + j;
      if (idx >= 0 && idx < n && Number.isFinite(values[idx])) {
        sum += values[idx] * weights[j + m];
        weightSum += weights[j + m];
      }
    }

    if (weightSum > 0.01) {
      smoothed[i] = sum / weightSum;
    } else {
      smoothed[i] = values[i];
    }
  }

  return Array.from(smoothed);
}

function toOptionalFinite(val: unknown): number | undefined {
  if (val === null || val === undefined || val === "") return undefined;
  const n = Number(val);
  return Number.isFinite(n) ? n : undefined;
}

function computeMedian(values: number[]): number | null {
  if (values.length === 0) return null;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 1 ? sorted[mid] : 0.5 * (sorted[mid - 1] + sorted[mid]);
}

function interpolateGapLinear(
  y0: number,
  y1: number,
  k: number,
  segLen: number
): number {
  const frac = (k + 1) / (segLen + 1);
  return y0 + frac * (y1 - y0);
}

function interpolateRainfallGapPoint(
  ts: number,
  tBefore: number | null,
  tAfter: number | null,
  yBefore: number | null,
  yAfter: number | null,
  k: number,
  segLen: number
): number {
  if (yBefore !== null && yAfter !== null && tBefore !== null && tAfter !== null) {
    const dayBefore = Math.floor(tBefore / DAY_MS);
    const dayAfter = Math.floor(tAfter / DAY_MS);

    if (dayBefore === dayAfter) {
      // Hari UTC sama: counter kumulatif non-menurun jika yAfter >= yBefore
      if (yAfter >= yBefore) {
        return Math.max(0, interpolateGapLinear(yBefore, yAfter, k, segLen));
      }
      // Jika reset terjadi di tengah hari (logger restart), tahan nilai sebelum reset hingga akhir celah
      return Math.max(0, yBefore);
    }

    // Celah melintasi 00:00 UTC (07:00 WIB): pertahankan nilai kemarin sebelum 00:00 UTC, reset ke 0 sesudahnya
    const utcResetTs = (dayBefore + 1) * DAY_MS;
    if (ts < utcResetTs) {
      return Math.max(0, yBefore);
    }
    const postResetSpan = Math.max(60000, tAfter - utcResetTs);
    const alpha = Math.min(1, Math.max(0, (ts - utcResetTs) / postResetSpan));
    return Math.max(0, alpha * yAfter);
  }

  return Math.max(0, yBefore ?? yAfter ?? 0);
}

/**
 * Mengisi sub-indeks yang kosong di dalam array rawPredicted (misal jeda sesaat companion/model)
 * secara linear antara titik prediksi tetangga dan/atau nilai jangkar luar celah.
 */
function fillSubGapsInPredicted(
  values: Array<number | null>,
  valBefore: number | null,
  valAfter: number | null,
  fallbackVal: number
): number[] {
  const n = values.length;
  const out = new Array<number>(n);

  let lastKnownIdx = -1;
  let lastKnownVal = valBefore ?? valAfter ?? fallbackVal;

  for (let i = 0; i < n; i++) {
    const v = values[i];
    if (v !== null && Number.isFinite(v)) {
      if (lastKnownIdx < i - 1) {
        const gapCount = i - 1 - lastKnownIdx;
        const startVal = lastKnownIdx === -1 ? (valBefore ?? v) : values[lastKnownIdx]!;
        for (let m = 1; m <= gapCount; m++) {
          const frac = m / (gapCount + 1);
          out[lastKnownIdx + m] = startVal + frac * (v - startVal);
        }
      }
      out[i] = v;
      lastKnownIdx = i;
      lastKnownVal = v;
    }
  }

  if (lastKnownIdx < n - 1) {
    const startVal = lastKnownIdx === -1 ? (valBefore ?? valAfter ?? fallbackVal) : lastKnownVal;
    const endVal = valAfter ?? startVal;
    const rem = n - 1 - lastKnownIdx;
    for (let m = 1; m <= rem; m++) {
      const frac = m / (rem + 1);
      out[lastKnownIdx + m] = startVal + frac * (endVal - startVal);
    }
  }

  return out;
}

const COMPANION_MAX_GAP_MS = 15 * 60 * 1000;
const MODEL_MAX_GAP_MS = 180 * 60 * 1000;

/**
 * 5. Mesin Imputasi Celah Terpadu (Universal Gap Imputer Orchestrator)
 */
export function runUniversalGapImputation(
  targetRecords: Array<{ timestamp: number; [key: string]: any }>,
  startTs: number, // ms
  endTs: number,   // ms
  targetVarKey: string,
  config: ImputationConfig = {},
  companionRecords: Array<{ timestamp: number; [key: string]: any }> = [],
  modelReferencePoints: Array<{ timestamp: number; [key: string]: any }> = [],
  selfHistoryRecords: Array<{ timestamp: number; [key: string]: any }> = []
): {
  grid: ImputedGridPoint[];
  summary: ImputationSummary;
} {
  const microLimitMinutes = config.microGapLimitMinutes ?? 15;
  const enableSpatial = config.enableSpatialTransfer ?? true;
  const enableModel = config.enableModelGuided ?? true;
  const enableSelfHistory = config.enableSelfHistory ?? true;
  const preferSelfHistory = config.preferSelfHistory ?? false;
  const enableBridge = config.enableBoundaryBridging ?? true;
  const enablePhysics = config.enablePhysicsPostProcessing ?? true;
  const isRainfallVar = targetVarKey === "rainfall";
  const isRainrateVar = targetVarKey === "rainrate";

  // 1. Snapping ke Grid Kontinu 1-Menit
  const startMinute = Math.floor(startTs / 60000) * 60000;
  const endMinute = Math.floor(endTs / 60000) * 60000;
  const totalMinutes = Math.max(1, Math.round((endMinute - startMinute) / 60000) + 1);

  // Map target records ke snapped minute
  const targetMap = new Map<number, { val: number; record: Record<string, any> }>();
  const targetValuesForStats: number[] = [];
  for (let i = 0; i < targetRecords.length; i++) {
    const r = targetRecords[i];
    if (!Number.isFinite(r.timestamp)) continue;
    const v = readVarNumber(r, targetVarKey);
    if (Number.isFinite(v)) {
      const snapped = Math.round(r.timestamp / 60000) * 60000;
      if (snapped >= startMinute && snapped <= endMinute) {
        targetMap.set(snapped, { val: v, record: r });
        targetValuesForStats.push(v);
      }
    }
  }

  const targetFallback =
    computeMedian(targetValuesForStats) ?? DEFAULT_BASELINE_BY_VAR[targetVarKey] ?? 0;

  // Bangun profil diurnal node target (H-1..H-N) dan deret pembanding untuk pencarian biner kontinu
  const selfProfile =
    enableSelfHistory && !isRainfallVar && selfHistoryRecords.length > 0
      ? buildSelfHistoryDiurnalProfile(selfHistoryRecords, targetVarKey)
      : null;
  const selfHistorySamples =
    !isRainfallVar && selfHistoryRecords.length > 0
      ? buildSortedSamples(selfHistoryRecords, targetVarKey)
      : [];
  const companionSamples = buildSortedSamples(companionRecords, targetVarKey);
  const modelSamples = buildSortedSamples(modelReferencePoints, targetVarKey);

  // 2. Latih Adaptor Tanda Mikroklimat Node (Spatial Ridge aman / bias skalar) dari target + H-1..H-N
  let spatialPredictor: ((compVal: number, ts: number) => number) | null = null;
  if (enableSpatial && companionSamples.length > 0) {
    const commonPairs: Array<{ targetVal: number; companionVal: number; timestamp: number }> = [];
    const seenTs = new Set<number>();
    for (const [ts, tItem] of targetMap.entries()) {
      const cVal = interpolateSortedAt(companionSamples, ts, 5 * 60000);
      if (cVal !== null && Number.isFinite(cVal)) {
        commonPairs.push({
          targetVal: tItem.val,
          companionVal: cVal,
          timestamp: ts,
        });
        seenTs.add(ts);
      }
    }
    for (let i = 0; i < selfHistorySamples.length; i++) {
      const h = selfHistorySamples[i];
      if (seenTs.has(h.ts)) continue;
      const cVal = interpolateSortedAt(companionSamples, h.ts, 5 * 60000);
      if (cVal !== null && Number.isFinite(cVal)) {
        commonPairs.push({
          targetVal: h.val,
          companionVal: cVal,
          timestamp: h.ts,
        });
      }
    }
    spatialPredictor =
      fitNodeSignatureTransferModel(commonPairs, targetVarKey, config.ridgeAlpha ?? 1.0)?.predict ??
      null;
  }

  let modelTransferPredictor: ((modelVal: number, ts: number) => number) | null = null;
  if (enableModel && modelSamples.length > 0 && !isRainfallVar) {
    const modelPairs: Array<{ targetVal: number; companionVal: number; timestamp: number }> = [];
    const seenTs = new Set<number>();
    for (const [ts, tItem] of targetMap.entries()) {
      const mVal = interpolateSortedAt(modelSamples, ts, MODEL_MAX_GAP_MS);
      if (mVal !== null && Number.isFinite(mVal)) {
        modelPairs.push({
          targetVal: tItem.val,
          companionVal: mVal,
          timestamp: ts,
        });
        seenTs.add(ts);
      }
    }
    for (let i = 0; i < selfHistorySamples.length; i++) {
      const h = selfHistorySamples[i];
      if (seenTs.has(h.ts)) continue;
      const mVal = interpolateSortedAt(modelSamples, h.ts, MODEL_MAX_GAP_MS);
      if (mVal !== null && Number.isFinite(mVal)) {
        modelPairs.push({
          targetVal: h.val,
          companionVal: mVal,
          timestamp: h.ts,
        });
      }
    }
    if (modelPairs.length >= 12) {
      modelTransferPredictor =
        fitNodeSignatureTransferModel(modelPairs, targetVarKey, config.ridgeAlpha ?? 1.0)?.predict ??
        null;
    }
  }

  // 3. Bangun Grid Kontinu Awal dengan format waktu Asia/Jakarta (+07:00 WIB)
  const grid: ImputedGridPoint[] = [];
  let availableCount = 0;

  for (let m = 0; m < totalMinutes; m++) {
    const ts = startMinute + m * 60000;
    const item = targetMap.get(ts);
    const { timeFormatted, dateFormatted } = getWibTimeComponents(ts);

    if (item) {
      availableCount++;
      const dewVal = toOptionalFinite(item.record.dew ?? item.record.dewpoint);
      const wsVal = toOptionalFinite(item.record.windSpeed ?? item.record.wind_speed);
      grid.push({
        timestamp: ts,
        timestampInSeconds: Math.floor(ts / 1000),
        timeFormatted,
        dateFormatted,
        rawVal: item.val,
        imputedVal: item.val,
        isOriginal: true,
        isImputed: false,
        imputationPhase: "original",
        gapType: null,
        temperature: toOptionalFinite(item.record.temperature),
        humidity: toOptionalFinite(item.record.humidity),
        pressure: toOptionalFinite(item.record.pressure),
        dew: dewVal,
        dewpoint: dewVal,
        rainfall: toOptionalFinite(item.record.rainfall),
        rainrate: toOptionalFinite(item.record.rainrate),
        lux: toOptionalFinite(item.record.lux),
        soil_temp: toOptionalFinite(item.record.soil_temp),
        windSpeed: wsVal,
        volt: toOptionalFinite(item.record.volt),
      });
    } else {
      grid.push({
        timestamp: ts,
        timestampInSeconds: Math.floor(ts / 1000),
        timeFormatted,
        dateFormatted,
        rawVal: null,
        imputedVal: 0,
        isOriginal: false,
        isImputed: true,
        imputationPhase: "micro_spline",
        gapType: null,
      });
    }
  }

  // Pra-hitung kemiringan PCHIP sejati pada seluruh titik observasi valid
  const anchorPoints: Array<{ timestamp: number; value: number }> = [];
  const gridIdxToAnchorIdx = new Map<number, number>();
  for (let i = 0; i < grid.length; i++) {
    if (grid[i].isOriginal && grid[i].rawVal !== null && Number.isFinite(grid[i].rawVal)) {
      gridIdxToAnchorIdx.set(i, anchorPoints.length);
      anchorPoints.push({ timestamp: grid[i].timestamp, value: grid[i].rawVal! });
    }
  }
  const pchipSlopes = computePchipSlopes(anchorPoints);

  // 4. Deteksi & Segmentasi Celah (Gap Detection & Segmentation)
  const segments: GapSegment[] = [];
  let inGap = false;
  let gapStartIdx = -1;

  for (let i = 0; i < grid.length; i++) {
    if (!grid[i].isOriginal && !inGap) {
      inGap = true;
      gapStartIdx = i;
    } else if (grid[i].isOriginal && inGap) {
      inGap = false;
      const gapEndIdx = i - 1;
      const duration = gapEndIdx - gapStartIdx + 1;
      const type = duration <= microLimitMinutes ? "micro" : "macro";
      const valBefore = gapStartIdx > 0 ? grid[gapStartIdx - 1].rawVal : null;
      const valAfter = gapEndIdx < grid.length - 1 ? grid[gapEndIdx + 1].rawVal : null;

      segments.push({
        id: `gap_${gapStartIdx}_${gapEndIdx}`,
        startIndex: gapStartIdx,
        endIndex: gapEndIdx,
        startTs: grid[gapStartIdx].timestamp,
        endTs: grid[gapEndIdx].timestamp,
        durationMinutes: duration,
        type,
        valBefore,
        valAfter,
      });
    }
  }

  // Handle trailing gap jika sampai akhir
  if (inGap) {
    const gapEndIdx = grid.length - 1;
    const duration = gapEndIdx - gapStartIdx + 1;
    const type = duration <= microLimitMinutes ? "micro" : "macro";
    const valBefore = gapStartIdx > 0 ? grid[gapStartIdx - 1].rawVal : null;

    segments.push({
      id: `gap_${gapStartIdx}_${gapEndIdx}`,
      startIndex: gapStartIdx,
      endIndex: gapEndIdx,
      startTs: grid[gapStartIdx].timestamp,
      endTs: grid[gapEndIdx].timestamp,
      durationMinutes: duration,
      type,
      valBefore,
      valAfter: null,
    });
  }

  // 5. Eksekusi 2-Fase Imputasi per Segmen Celah
  let filledMicro = 0;
  let filledMacro = 0;

  for (let sIdx = 0; sIdx < segments.length; sIdx++) {
    const seg = segments[sIdx];
    const segLen = seg.endIndex - seg.startIndex + 1;
    let rawPredicted: number[] = new Array(segLen);
    let chosenPhase:
      | "micro_spline"
      | "self_history"
      | "companion_ridge"
      | "model_guided"
      | "pchip_spline" = "micro_spline";
    let predAtBefore: number | null = null;
    let predAtAfter: number | null = null;

    const beforeIdx = seg.startIndex - 1;
    const afterIdx = seg.endIndex + 1;
    const tBefore = beforeIdx >= 0 ? grid[beforeIdx].timestamp : null;
    const tAfter = afterIdx < grid.length ? grid[afterIdx].timestamp : null;
    const anchorPosBefore = beforeIdx >= 0 ? gridIdxToAnchorIdx.get(beforeIdx) : undefined;
    const anchorPosAfter = afterIdx < grid.length ? gridIdxToAnchorIdx.get(afterIdx) : undefined;

    if (seg.type === "micro") {
      // Fase 1: Micro-Gap PCHIP / Cumulative Rainfall Safe Carry
      chosenPhase = "micro_spline";
      filledMicro += segLen;
      if (isRainfallVar) {
        for (let k = 0; k < segLen; k++) {
          rawPredicted[k] = interpolateRainfallGapPoint(
            grid[seg.startIndex + k].timestamp,
            tBefore,
            tAfter,
            seg.valBefore,
            seg.valAfter,
            k,
            segLen
          );
        }
      } else if (
        seg.valBefore !== null &&
        seg.valAfter !== null &&
        tBefore !== null &&
        tAfter !== null &&
        anchorPosBefore !== undefined &&
        anchorPosAfter !== undefined
      ) {
        const m0 = pchipSlopes[anchorPosBefore];
        const m1 = pchipSlopes[anchorPosAfter];
        for (let k = 0; k < segLen; k++) {
          rawPredicted[k] = interpolateCubicHermite(
            grid[seg.startIndex + k].timestamp,
            tBefore,
            seg.valBefore,
            tAfter,
            seg.valAfter,
            m0,
            m1
          );
        }
      } else {
        const edgeVal = seg.valBefore ?? seg.valAfter ?? targetFallback;
        for (let k = 0; k < segLen; k++) {
          rawPredicted[k] = edgeVal;
        }
      }
    } else {
      // Fase 2: Macro-Gap Reconstruction
      filledMacro += segLen;

      if (isRainfallVar) {
        // Akumulasi rainfall harian UTC dijaga agar tidak menciptakan sawtooth atau reset palsu
        chosenPhase = "pchip_spline";
        for (let k = 0; k < segLen; k++) {
          rawPredicted[k] = interpolateRainfallGapPoint(
            grid[seg.startIndex + k].timestamp,
            tBefore,
            tAfter,
            seg.valBefore,
            seg.valAfter,
            k,
            segLen
          );
        }
      } else {
        type MacroCandidateResult = {
          phase: "self_history" | "companion_ridge" | "model_guided";
          predicted: number[];
          edgeBefore: number | null;
          edgeAfter: number | null;
        };

        const trySelfHistory = (): MacroCandidateResult | null => {
          if (!enableSelfHistory || !selfProfile) return null;
          const histSeries: Array<number | null> = new Array(segLen);
          let validHistCount = 0;
          for (let k = 0; k < segLen; k++) {
            const ts = grid[seg.startIndex + k].timestamp;
            const hVal = lookupSelfHistoryProfileAt(selfProfile, ts);
            if (hVal !== null && Number.isFinite(hVal)) {
              histSeries[k] = hVal;
              validHistCount++;
            } else {
              histSeries[k] = null;
            }
          }
          if (validHistCount === 0) return null;
          return {
            phase: "self_history",
            predicted: fillSubGapsInPredicted(histSeries, seg.valBefore, seg.valAfter, targetFallback),
            edgeBefore: tBefore !== null ? lookupSelfHistoryProfileAt(selfProfile, tBefore) : null,
            edgeAfter: tAfter !== null ? lookupSelfHistoryProfileAt(selfProfile, tAfter) : null,
          };
        };

        const tryCompanion = (): MacroCandidateResult | null => {
          if (!enableSpatial || !spatialPredictor || companionSamples.length === 0) return null;
          const compSeries: Array<number | null> = new Array(segLen);
          let validCompCount = 0;
          for (let k = 0; k < segLen; k++) {
            const ts = grid[seg.startIndex + k].timestamp;
            const cVal = interpolateSortedAt(companionSamples, ts, COMPANION_MAX_GAP_MS);
            if (cVal !== null && Number.isFinite(cVal)) {
              compSeries[k] = spatialPredictor(cVal, ts);
              validCompCount++;
            } else {
              compSeries[k] = null;
            }
          }
          if (validCompCount <= segLen * 0.4) return null;
          const cb = tBefore !== null ? interpolateSortedAt(companionSamples, tBefore, COMPANION_MAX_GAP_MS) : null;
          const ca = tAfter !== null ? interpolateSortedAt(companionSamples, tAfter, COMPANION_MAX_GAP_MS) : null;
          return {
            phase: "companion_ridge",
            predicted: fillSubGapsInPredicted(compSeries, seg.valBefore, seg.valAfter, targetFallback),
            edgeBefore: cb !== null && Number.isFinite(cb) ? spatialPredictor(cb, tBefore!) : null,
            edgeAfter: ca !== null && Number.isFinite(ca) ? spatialPredictor(ca, tAfter!) : null,
          };
        };

        const tryModel = (): MacroCandidateResult | null => {
          if (!enableModel || modelSamples.length === 0) return null;
          const evalModel = (rawM: number, ts: number) =>
            modelTransferPredictor ? modelTransferPredictor(rawM, ts) : rawM;
          const modelSeries: Array<number | null> = new Array(segLen);
          let validModelCount = 0;
          for (let k = 0; k < segLen; k++) {
            const ts = grid[seg.startIndex + k].timestamp;
            const mVal = interpolateSortedAt(modelSamples, ts, MODEL_MAX_GAP_MS);
            if (mVal !== null && Number.isFinite(mVal)) {
              modelSeries[k] = evalModel(mVal, ts);
              validModelCount++;
            } else {
              modelSeries[k] = null;
            }
          }
          if (validModelCount === 0) return null;
          const mb = tBefore !== null ? interpolateSortedAt(modelSamples, tBefore, MODEL_MAX_GAP_MS) : null;
          const ma = tAfter !== null ? interpolateSortedAt(modelSamples, tAfter, MODEL_MAX_GAP_MS) : null;
          return {
            phase: "model_guided",
            predicted: fillSubGapsInPredicted(modelSeries, seg.valBefore, seg.valAfter, targetFallback),
            edgeBefore: mb !== null && Number.isFinite(mb) ? evalModel(mb, tBefore!) : null,
            edgeAfter: ma !== null && Number.isFinite(ma) ? evalModel(ma, tAfter!) : null,
          };
        };

        const macroResult = preferSelfHistory
          ? trySelfHistory() || tryCompanion() || tryModel()
          : tryCompanion() || tryModel() || trySelfHistory();

        if (macroResult) {
          chosenPhase = macroResult.phase;
          rawPredicted = macroResult.predicted;
          predAtBefore = macroResult.edgeBefore;
          predAtAfter = macroResult.edgeAfter;
        } else {
          // Fallback Fritsch-Carlson Monotone PCHIP Spline sejati
          chosenPhase = "pchip_spline";
          if (
            seg.valBefore !== null &&
            seg.valAfter !== null &&
            tBefore !== null &&
            tAfter !== null &&
            anchorPosBefore !== undefined &&
            anchorPosAfter !== undefined
          ) {
            const m0 = pchipSlopes[anchorPosBefore];
            const m1 = pchipSlopes[anchorPosAfter];
            for (let k = 0; k < segLen; k++) {
              rawPredicted[k] = interpolateCubicHermite(
                grid[seg.startIndex + k].timestamp,
                tBefore,
                seg.valBefore,
                tAfter,
                seg.valAfter,
                m0,
                m1
              );
            }
          } else {
            const edgeVal = seg.valBefore ?? seg.valAfter ?? targetFallback;
            for (let k = 0; k < segLen; k++) {
              rawPredicted[k] = edgeVal;
            }
          }
        }
      }
    }

    // Fase 2.5: Boundary-Conditioned Residual Bridging (lewati pada rainfall agar monotonicity terjaga)
    const shouldBridge =
      enableBridge &&
      !isRainfallVar &&
      (chosenPhase === "self_history" || chosenPhase === "companion_ridge" || chosenPhase === "model_guided");
    const bridged = shouldBridge
      ? applyBoundaryBridging(rawPredicted, seg.valBefore, seg.valAfter, predAtBefore, predAtAfter)
      : rawPredicted;

    // Tuliskan ke grid
    for (let k = 0; k < segLen; k++) {
      const idx = seg.startIndex + k;
      grid[idx].imputedVal = Number(bridged[k].toFixed(2));
      grid[idx].imputationPhase = chosenPhase;
      grid[idx].gapType = seg.type;
    }
  }

  // 6. Fase 3: Physics-Informed Post-Processing
  if (enablePhysics) {
    // Jangan jalankan Savitzky-Golay pada rainfall kumulatif atau rainrate impulsif (mencegah ringing negatif & reset hantu)
    const applySavgol = !isRainfallVar && !isRainrateVar;
    const allVals = grid.map((pt) => (pt.isOriginal ? pt.rawVal! : pt.imputedVal));
    const smoothedVals = applySavgol
      ? applySavitzkyGolayFilter(allVals, config.savgolWindow ?? 15)
      : allVals;

    for (let i = 0; i < grid.length; i++) {
      let finalVal = grid[i].isOriginal ? grid[i].rawVal! : smoothedVals[i];

      // Batasan Fisik WMO-No. 8 & Batas Mutlak RH [0%, 100%]
      finalVal = clampPhysicsBounds(targetVarKey, finalVal);

      grid[i].imputedVal = Number(finalVal.toFixed(2));

      // Penegakan Konsistensi Magnus-Tetens: T_dew <= T_ambient
      if (
        (targetVarKey === "dew" || targetVarKey === "dewpoint") &&
        grid[i].temperature !== undefined &&
        Number.isFinite(grid[i].temperature)
      ) {
        grid[i].imputedVal = Number(Math.min(grid[i].imputedVal, grid[i].temperature!).toFixed(2));
      }
    }
  }

  // Hitung ringkasan
  const microGaps = segments.filter((s) => s.type === "micro");
  const macroGaps = segments.filter((s) => s.type === "macro");
  const microMinutes = microGaps.reduce((acc, s) => acc + s.durationMinutes, 0);
  const macroMinutes = macroGaps.reduce((acc, s) => acc + s.durationMinutes, 0);

  const summary: ImputationSummary = {
    totalExpectedMinutes: totalMinutes,
    originalAvailableCount: availableCount,
    originalMissingCount: totalMinutes - availableCount,
    microGapsCount: microGaps.length,
    microGapsMinutes: microMinutes,
    macroGapsCount: macroGaps.length,
    macroGapsMinutes: macroMinutes,
    filledMicroCount: filledMicro,
    filledMacroCount: filledMacro,
    completenessPercent: Number(((availableCount + filledMicro + filledMacro) / totalMinutes * 100).toFixed(2)),
    segments,
  };

  return { grid, summary };
}

export interface CompleteGapNodePayload {
  timestampInSeconds: number;
  fields: Record<string, number | string | undefined>;
}

const CORE_RTDB_VARS = [
  "temperature",
  "humidity",
  "pressure",
  "dew",
  "rainfall",
  "rainrate",
  "lux",
  "soil_temp",
  "volt",
] as const;

/**
 * Membangun payload multi-variabel lengkap untuk setiap titik celah yang diimputasi ke RTDB.
 * Menghindari penulisan node parsial (hanya 3 field) yang dapat memicu reset counter rainfall hantu
 * dan merusak rata-rata harian/klimatologi pada modul Laporan Harian & Curah Hujan.
 * Jika node pada timestamp eksisting sudah memiliki sebagian field valid, field saudara tersebut tetap dipertahankan.
 */
export function buildCompleteGapNodePayloads(
  primaryGrid: ImputedGridPoint[],
  targetRecords: Array<{ timestamp: number; [key: string]: any }>,
  startTs: number,
  endTs: number,
  primaryVarKey: string,
  config: ImputationConfig = {},
  companionRecords: Array<{ timestamp: number; [key: string]: any }> = [],
  modelReferencePoints: Array<{ timestamp: number; [key: string]: any }> = [],
  selfHistoryRecords: Array<{ timestamp: number; [key: string]: any }> = []
): CompleteGapNodePayload[] {
  const existingByMinute = new Map<number, Record<string, any>>();
  let hasWindSpeed = primaryVarKey === "windSpeed";

  for (let i = 0; i < targetRecords.length; i++) {
    const r = targetRecords[i];
    if (!Number.isFinite(r.timestamp)) continue;
    const snapped = Math.round(r.timestamp / 60000) * 60000;
    existingByMinute.set(snapped, r);
    if (toOptionalFinite(r.windSpeed ?? r.wind_speed) !== undefined) {
      hasWindSpeed = true;
    }
  }

  const auxVars: string[] = [...CORE_RTDB_VARS];
  if (hasWindSpeed) auxVars.push("windSpeed");

  const auxGrids = new Map<string, ImputedGridPoint[]>();
  for (const vKey of auxVars) {
    if (vKey === primaryVarKey) {
      auxGrids.set(vKey, primaryGrid);
    } else {
      const { grid } = runUniversalGapImputation(
        targetRecords,
        startTs,
        endTs,
        vKey,
        config,
        companionRecords,
        modelReferencePoints,
        selfHistoryRecords
      );
      auxGrids.set(vKey, grid);
    }
  }

  const payloads: CompleteGapNodePayload[] = [];
  for (let i = 0; i < primaryGrid.length; i++) {
    const pt = primaryGrid[i];
    if (!pt.isImputed) continue;

    const existing = existingByMinute.get(pt.timestamp);
    const fields: Record<string, number | string | undefined> = {
      status: `imputed_${pt.imputationPhase}`,
      timestamp: pt.timestampInSeconds,
    };

    for (const vKey of auxVars) {
      const existingVal = existing ? toOptionalFinite(existing[vKey] ?? (vKey === "windSpeed" ? existing.wind_speed : undefined)) : undefined;
      if (vKey === primaryVarKey) {
        fields[vKey] = Number(pt.imputedVal.toFixed(2));
      } else if (existingVal !== undefined) {
        // Biarkan nilai field saudara yang sudah valid apa adanya di node eksisting
        continue;
      } else {
        const auxGrid = auxGrids.get(vKey);
        const val = auxGrid?.[i]?.imputedVal;
        if (val !== undefined && Number.isFinite(val)) {
          fields[vKey] = Number(val.toFixed(2));
        }
      }
    }

    // Penegakan konsistensi termodinamika lintas-variabel pada field baru node celah
    const tEff = toOptionalFinite(
      fields.temperature ?? (existing ? existing.temperature : undefined)
    );
    const dEff = toOptionalFinite(
      fields.dew ?? (existing ? existing.dew ?? existing.dewpoint : undefined)
    );

    if (tEff !== undefined && dEff !== undefined && dEff > tEff) {
      if (primaryVarKey !== "dew" && fields.dew !== undefined) {
        fields.dew = Number(tEff.toFixed(2));
      }
    }

    const dClamped = toOptionalFinite(
      fields.dew ?? (existing ? existing.dew ?? existing.dewpoint : undefined)
    );
    if (
      tEff !== undefined &&
      dClamped !== undefined &&
      fields.humidity !== undefined &&
      primaryVarKey !== "humidity"
    ) {
      const rhMagnus = recalculateRHMagnus(tEff, Math.min(dClamped, tEff));
      if (Number.isFinite(rhMagnus)) {
        fields.humidity = Number(Math.min(100, Math.max(0, rhMagnus)).toFixed(1));
      }
    }

    payloads.push({
      timestampInSeconds: pt.timestampInSeconds,
      fields,
    });
  }

  return payloads;
}

