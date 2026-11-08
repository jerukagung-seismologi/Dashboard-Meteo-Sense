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
 * 2. Interpolasi Kubik Hermite Monoton (PCHIP - Piecewise Cubic Hermite)
 * Menghasilkan kurva transisi mulus berkontur diurnal alami tanpa osilasi buatan (Runge's overshoot).
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

  // Secant slope
  const secant = (y1 - y0) / h;

  // Tentukan slope batas jika tidak disediakan
  let d0 = m0 != null ? m0 : secant;
  let d1 = m1 != null ? m1 : secant;

  // Fritsch-Carlson condition untuk mencegah overshoot
  if (secant === 0) {
    d0 = 0;
    d1 = 0;
  } else if ((d0 * secant < 0) || (d1 * secant < 0)) {
    // Tanda berlawanan, set ke 0 agar kurva monoton
    if (d0 * secant < 0) d0 = 0;
    if (d1 * secant < 0) d1 = 0;
  }

  // Hermite Basis Functions
  const h00 = 2 * Math.pow(u, 3) - 3 * Math.pow(u, 2) + 1;
  const h10 = Math.pow(u, 3) - 2 * Math.pow(u, 2) + u;
  const h01 = -2 * Math.pow(u, 3) + 3 * Math.pow(u, 2);
  const h11 = Math.pow(u, 3) - Math.pow(u, 2);

  return h00 * y0 + h10 * h * d0 + h01 * y1 + h11 * h * d1;
}

/**
 * 3. Interpolasi Akima Sub-Spline
 * Menggunakan pembobotan gradien 5-titik lokal Hiroshi Akima.
 * Sangat cocok untuk meteorologi saat terjadi front dingin mendadak atau hembusan angin badai.
 */
export function interpolateAkima(
  t: number,
  t0: number,
  y0: number,
  t1: number,
  y1: number,
  prevY?: number,
  nextY?: number
): number {
  if (t1 === t0) return y0;
  const h = t1 - t0;
  const secant = (y1 - y0) / h;

  // Estimasi kemiringan Akima sederhana dari titik tetangga
  const sPrev = prevY != null ? (y0 - prevY) / h : secant;
  const sNext = nextY != null ? (nextY - y1) / h : secant;

  const w0 = Math.abs(secant - sPrev);
  const w1 = Math.abs(sNext - secant);

  const m0 = w0 + w1 > 0 ? (w1 * sPrev + w0 * secant) / (w0 + w1) : secant;
  const m1 = w0 + w1 > 0 ? (w1 * secant + w0 * sNext) / (w0 + w1) : secant;

  return interpolateCubicHermite(t, t0, y0, t1, y1, m0, m1);
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
  getModelVal: (ts: number) => number | null
): number {
  if (t1 === t0) return y0;

  const m0 = getModelVal(t0);
  const m1 = getModelVal(t1);
  const mt = getModelVal(t);

  // Jika model tidak tersedia pada titik ini, fallback ke Cubic Hermite
  if (m0 === null || m1 === null || mt === null) {
    return interpolateCubicHermite(t, t0, y0, t1, y1);
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
  if (tB <= tA) return yStart;
  const tau = Math.min(1, Math.max(0, (t - tA) / (tB - tA)));
  // Bobot Cosine-Hermite S-Curve: w(0)=0, w(1)=1, w'(0)=0, w'(1)=0
  const w = (1.0 - Math.cos(Math.PI * tau)) / 2.0;

  const tNominalT = refValAtT + baselineNightOffset;
  const tNominalA = refValAtA + baselineNightOffset;
  const tNominalB = refValAtB + baselineNightOffset;

  const deltaA = yStart - tNominalA;
  const deltaB = yEnd - tNominalB;

  return tNominalT + ((1.0 - w) * deltaA + w * deltaB);
}

