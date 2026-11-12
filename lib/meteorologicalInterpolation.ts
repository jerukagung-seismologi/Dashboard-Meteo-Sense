/**
 * lib/meteorologicalInterpolation.ts
 *
 * Pustaka algoritma interpolasi dan rekonstruksi deret waktu meteorologi:
 * 1. Time-Weighted Linear Interpolation (Berdasarkan Waktu Nyata)
 * 2. Monotone Cubic Hermite / PCHIP (Kubik Halus Bebas Overshoot)
 * 3. Akima Sub-Spline Interpolation (Stabil terhadap Perubahan Gradien Tajam)
 * 4. Model-Guided Diurnal Interpolation (Penuntun Model ECMWF IFS / ERA5)
 */

export interface InterpolationAnchor {
  timestamp: number;
  value: number;
  slope?: number;
}

/**
 * 1. Interpolasi Linier Berbobot Waktu (Time-Weighted Linear)
 * Memperhitungkan delta waktu fisik (ms) antar titik observasi.
 */
export function interpolateTimeLinear(
  t: number,
  t0: number,
  y0: number,
  t1: number,
  y1: number
): number {
  if (t1 === t0) return y0;
  const alpha = Math.min(1, Math.max(0, (t - t0) / (t1 - t0)));
  return y0 + alpha * (y1 - y0);
}

/**
 * Evaluasi polinomial kubik Hermite terfaktorisasi pada u in [0, 1].
 */
function evaluateCubicHermite(
  u: number,
  h: number,
  y0: number,
  y1: number,
  d0: number,
  d1: number
): number {
  const u2 = u * u;
  const u3 = u2 * u;
  const h00 = 2 * u3 - 3 * u2 + 1;
  const h10 = u3 - 2 * u2 + u;
  const h01 = -2 * u3 + 3 * u2;
  const h11 = u3 - u2;
  return h00 * y0 + h10 * h * d0 + h01 * y1 + h11 * h * d1;
}

function clampPchipEndpointSlope(
  dEndpoint: number,
  secantEdge: number
): number {
  if (secantEdge === 0) return 0;
  if (dEndpoint * secantEdge <= 0) return 0;
  if (Math.abs(dEndpoint) > Math.abs(3 * secantEdge)) {
    return 3 * secantEdge;
  }
  return dEndpoint;
}

/**
 * Menghitung array kemiringan PCHIP (d_k = dy/dt) untuk deret titik berjarak waktu tidak seragam.
 */
export function computePchipSlopes(
  points: ReadonlyArray<{ timestamp: number; value: number }>
): number[] {
  const n = points.length;
  if (n === 0) return [];
  if (n === 1) return [0];

  const h: number[] = [];
  const delta: number[] = [];
  for (let i = 0; i < n - 1; i++) {
    const dt = points[i + 1].timestamp - points[i].timestamp;
    const safeDt = dt > 0 ? dt : 1;
    h.push(safeDt);
    delta.push((points[i + 1].value - points[i].value) / safeDt);
  }

  const slopes = new Array<number>(n).fill(0);
  if (n === 2) {
    slopes[0] = delta[0];
    slopes[1] = delta[0];
    return slopes;
  }

  for (let i = 1; i < n - 1; i++) {
    const dPrev = delta[i - 1];
    const dCurr = delta[i];
    if (dPrev === 0 || dCurr === 0 || dPrev * dCurr <= 0) {
      slopes[i] = 0;
    } else {
      const w1 = 2 * h[i] + h[i - 1];
      const w2 = h[i] + 2 * h[i - 1];
      slopes[i] = (w1 + w2) / (w1 / dPrev + w2 / dCurr);
    }
  }

  const d0Raw = ((2 * h[0] + h[1]) * delta[0] - h[0] * delta[1]) / (h[0] + h[1]);
  slopes[0] = clampPchipEndpointSlope(d0Raw, delta[0]);

  const last = n - 1;
  const dEndRaw =
    ((2 * h[last - 1] + h[last - 2]) * delta[last - 1] - h[last - 1] * delta[last - 2]) /
    (h[last - 1] + h[last - 2]);
  slopes[last] = clampPchipEndpointSlope(dEndRaw, delta[last - 1]);

  return slopes;
}

/**
 * Menghitung array kemiringan sub-spline Akima 5-titik yang mendukung interval waktu tak seragam.
 */
export function computeAkimaSlopes(
  points: ReadonlyArray<{ timestamp: number; value: number }>
): number[] {
  const n = points.length;
  if (n === 0) return [];
  if (n === 1) return [0];

  const m: number[] = [];
  for (let i = 0; i < n - 1; i++) {
    const dt = points[i + 1].timestamp - points[i].timestamp;
    m.push((points[i + 1].value - points[i].value) / (dt > 0 ? dt : 1));
  }

  if (n === 2) return [m[0], m[0]];

  const mMinus1 = 2 * m[0] - m[1];
  const mMinus2 = 2 * mMinus1 - m[0];
  const mN = 2 * m[n - 2] - m[n - 3];
  const mNPlus1 = 2 * mN - m[n - 2];

  const getSecant = (idx: number): number => {
    if (idx === -2) return mMinus2;
    if (idx === -1) return mMinus1;
    if (idx >= 0 && idx < m.length) return m[idx];
    if (idx === m.length) return mN;
    return mNPlus1;
  };

  const slopes = new Array<number>(n).fill(0);
  for (let i = 0; i < n; i++) {
    const mPrev2 = getSecant(i - 2);
    const mPrev1 = getSecant(i - 1);
    const mCurr = getSecant(i);
    const mNext1 = getSecant(i + 1);

    const w1 = Math.abs(mNext1 - mCurr);
    const w2 = Math.abs(mPrev1 - mPrev2);
    if (w1 + w2 > 0) {
      slopes[i] = (w1 * mPrev1 + w2 * mCurr) / (w1 + w2);
    } else {
      slopes[i] = 0.5 * (mPrev1 + mCurr);
    }
  }
  return slopes;
}

/**
 * Evaluasi kubik Hermite menggunakan kemiringan eksternal tanpa pemangkasan monoton PCHIP
 * (misalnya untuk sub-spline Akima yang telah dihitung gradien C1-nya).
 */
export function interpolateHermiteWithSlopes(
  t: number,
  t0: number,
  y0: number,
  t1: number,
  y1: number,
  m0: number,
  m1: number
): number {
  if (t1 === t0) return y0;
  const h = t1 - t0;
  const u = Math.min(1, Math.max(0, (t - t0) / h));
  const secant = (y1 - y0) / h;
  const d0 = Number.isFinite(m0) ? m0 : secant;
  const d1 = Number.isFinite(m1) ? m1 : secant;
  return evaluateCubicHermite(u, h, y0, y1, d0, d1);
}

/**
 * 2. Interpolasi Kubik Hermite Monoton (PCHIP - Piecewise Cubic Hermite)
 * Menerapkan kondisi Fritsch-Carlson penuh (alpha^2 + beta^2 <= 9) agar kurva bebas overshoot.
 */
export function interpolateCubicHermite(
  t: number,
  t0: number,
  y0: number,
  t1: number,
  y1: number,
  m0?: number,
  m1?: number
): number {
  if (t1 === t0) return y0;
  const h = t1 - t0;
  const u = Math.min(1, Math.max(0, (t - t0) / h));

  const secant = (y1 - y0) / h;
  let d0 = m0 != null && Number.isFinite(m0) ? m0 : secant;
  let d1 = m1 != null && Number.isFinite(m1) ? m1 : secant;

  if (secant === 0) {
    d0 = 0;
    d1 = 0;
  } else {
    let alpha = d0 / secant;
    let beta = d1 / secant;
    if (alpha <= 0) {
      alpha = 0;
      d0 = 0;
    }
    if (beta <= 0) {
      beta = 0;
      d1 = 0;
    }
    const r2 = alpha * alpha + beta * beta;
    if (r2 > 9) {
      const tau = 3 / Math.sqrt(r2);
      d0 = tau * alpha * secant;
      d1 = tau * beta * secant;
    }
  }

  return evaluateCubicHermite(u, h, y0, y1, d0, d1);
}

/**
 * 3. Interpolasi Akima Sub-Spline
 * Menggunakan pembobotan gradien lokal Hiroshi Akima dengan dukungan interval waktu tak seragam.
 */
export function interpolateAkima(
  t: number,
  t0: number,
  y0: number,
  t1: number,
  y1: number,
  prevY?: number,
  nextY?: number,
  tPrev?: number,
  tNext?: number
): number {
  if (t1 === t0) return y0;
  const h = t1 - t0;
  const hPrev = tPrev != null && tPrev < t0 ? t0 - tPrev : h;
  const hNext = tNext != null && tNext > t1 ? tNext - t1 : h;

  const secant = (y1 - y0) / h;
  const sPrev = prevY != null && Number.isFinite(prevY) ? (y0 - prevY) / hPrev : secant;
  const sNext = nextY != null && Number.isFinite(nextY) ? (nextY - y1) / hNext : secant;

  const w0 = Math.abs(secant - sPrev);
  const w1 = Math.abs(sNext - secant);

  const m0 = w0 + w1 > 0 ? (w1 * sPrev + w0 * secant) / (w0 + w1) : 0.5 * (sPrev + secant);
  const m1 = w0 + w1 > 0 ? (w1 * secant + w0 * sNext) / (w0 + w1) : 0.5 * (secant + sNext);

  const u = Math.min(1, Math.max(0, (t - t0) / h));
  return evaluateCubicHermite(u, h, y0, y1, m0, m1);
}

/**
 * 4. Model-Guided Diurnal Interpolation (Penuntun Model ECMWF IFS / ERA5)
 * Rekonstruksi anomali paparan panas matahari (solar radiation overheating)
 * dengan mentransformasikan gradien model cuaca atmosfer ke jangkar sensor valid.
 *
 * @param t Timestamp target
 * @param t0 Timestamp jangkar awal
 * @param y0 Nilai sensor awal
 * @param t1 Timestamp jangkar akhir
 * @param y1 Nilai sensor akhir
 * @param getModelVal Fungsi pembaca nilai model penuntun pada timestamp t
 */
export function interpolateModelGuided(
  t: number,
  t0: number,
  y0: number,
  t1: number,
  y1: number,
  getModelVal: (ts: number) => number | null,
  m0Slope?: number,
  m1Slope?: number
): number {
  if (t1 === t0) return y0;

  const m0 = getModelVal(t0);
  const m1 = getModelVal(t1);
  const mt = getModelVal(t);

  // Jika model tidak tersedia pada titik ini, fallback ke Cubic Hermite (PCHIP)
  if (
    m0 === null ||
    m1 === null ||
    mt === null ||
    !Number.isFinite(m0) ||
    !Number.isFinite(m1) ||
    !Number.isFinite(mt)
  ) {
    return interpolateCubicHermite(t, t0, y0, t1, y1, m0Slope, m1Slope);
  }

  // Hitung baseline bias sensor terhadap model pada titik jangkar awal dan akhir
  const bias0 = y0 - m0;
  const bias1 = y1 - m1;

  // Interpolasikan bias secara kontinu sepanjang rentang waktu
  const alpha = Math.min(1, Math.max(0, (t - t0) / (t1 - t0)));
  const currentBias = bias0 + alpha * (bias1 - bias0);

  // Rekonstruksi data = Nilai fisik Model + Bias terkoreksi
  return mt + currentBias;
}

/**
 * 5. Perhitungan Tekanan Uap Air Jenuh (Saturation Vapor Pressure)
 * Menggunakan Formula August-Roche-Magnus (WMO-No. 8, CIMO Guide).
 *
 * @param tempC Suhu udara (°C)
 * @returns Tekanan uap jenuh (hPa / mbar)
 */
export function calculateSaturationVaporPressure(tempC: number): number {
  if (!Number.isFinite(tempC)) return NaN;
  return 6.112 * Math.exp((17.67 * tempC) / (tempC + 243.5));
}

/**
 * 6. Rekalkulasi Termodinamika Kelembapan Relatif (RH) via Magnus-Tetens
 * Menghitung ulang RH fisik berdasarkan Titik Embun (Tdew) dan Suhu Terkoreksi (Tclean).
 * Menjamin invarian termodinamika massa uap air di udara tetap terjaga.
 *
 * @param tempC Suhu udara terkoreksi (°C)
 * @param dewPointC Titik embun observasi (°C)
 * @returns Kelembapan relatif terkoreksi (%) [0.0 s/d 100.0%]
 */
export function recalculateRHMagnus(tempC: number, dewPointC: number): number {
  if (!Number.isFinite(tempC) || !Number.isFinite(dewPointC)) return NaN;
  const esT = calculateSaturationVaporPressure(tempC);
  const esTd = calculateSaturationVaporPressure(dewPointC);
  if (esT <= 0) return 100.0;
  const rh = (esTd / esT) * 100.0;
  return Math.min(100.0, Math.max(0.0, rh));
}

/**
 * 7. Rekonstruksi Suhu Radiasi Surya dengan Cosine-Hermite Residual Blending
 * Menerapkan transisi kurva-S berbobot cosinus (C0, C1 continuity, zero step-jump)
 * terhadap kurva acuan nominal (Stasiun AWS terdekat atau Model ECMWF IFS/ERA5).
 *
 * @param t Timestamp target observasi (ms)
 * @param tA Timestamp batas awal jendela anomali (ms)
 * @param tB Timestamp batas akhir jendela anomali (ms)
 * @param yStart Nilai sensor target tepat sebelum batas masuk jendela (tA - 1 step)
 * @param yEnd Nilai sensor target tepat sesudah batas keluar jendela (tB + 1 step)
 * @param refValAtT Nilai acuan baseline pada waktu t
 * @param refValAtA Nilai acuan baseline pada waktu tA
 * @param refValAtB Nilai acuan baseline pada waktu tB
 * @param baselineNightOffset Offset sensor terhadap acuan saat malam hari (delta T night)
 * @returns Suhu udara yang direkonstruksi mulus (°C)
 */
export function interpolateSolarCosineHermite(
  t: number,
  tA: number,
  tB: number,
  yStart: number,
  yEnd: number,
  refValAtT: number,
  refValAtA: number,
  refValAtB: number,
  baselineNightOffset: number = 0
): number {
  if (!Number.isFinite(refValAtT) || !Number.isFinite(refValAtA) || !Number.isFinite(refValAtB)) {
    return interpolateCubicHermite(t, tA, yStart, tB, yEnd);
  }
  const tNominalT = refValAtT + baselineNightOffset;
  if (tB <= tA) {
    const deltaA = yStart - (refValAtA + baselineNightOffset);
    return tNominalT + deltaA;
  }
  const tau = Math.min(1, Math.max(0, (t - tA) / (tB - tA)));
  // Bobot Cosine-Hermite S-Curve: w(0)=0, w(1)=1, w'(0)=0, w'(1)=0
  const w = (1.0 - Math.cos(Math.PI * tau)) / 2.0;

  const tNominalA = refValAtA + baselineNightOffset;
  const tNominalB = refValAtB + baselineNightOffset;

  const deltaA = yStart - tNominalA;
  const deltaB = yEnd - tNominalB;

  return tNominalT + ((1.0 - w) * deltaA + w * deltaB);
}

