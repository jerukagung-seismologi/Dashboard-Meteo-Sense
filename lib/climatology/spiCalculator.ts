// lib/climatology/spiCalculator.ts
/**
 * Kalkulator Standardized Precipitation Index (SPI)
 * Standar Rujukan: McKee et al. (1993) & WMO-No. 1090
 * Mendukung timescale: SPI-1, SPI-3, SPI-6, SPI-12
 */

export interface SpiCategory {
  category: "Extremely Wet" | "Severely Wet" | "Moderately Wet" | "Near Normal" | "Moderately Dry" | "Severely Dry" | "Extremely Dry";
  labelId: string; // Bahasa Indonesia
  color: string;
  badgeBg: string;
  description: string;
}

export interface SpiPoint {
  dateStr: string; // "YYYY-MM" atau "NamaBulan YYYY"
  rainSum: number; // Akumulasi curah hujan periode (mm)
  spiValue: number; // Nilai z-score SPI (misal: +1.34, -1.82)
  category: SpiCategory;
}

export interface SpiSeriesResult {
  timescale: 1 | 3 | 6 | 12; // Skala waktu dalam bulan
  title: string;
  description: string;
  application: string;
  points: SpiPoint[];
  currentSpi: SpiPoint | null;
}

/**
 * Mendapatkan kategori WMO resmi untuk suatu nilai SPI
 */
export function getSpiCategory(spi: number): SpiCategory {
  if (spi >= 2.0) {
    return {
      category: "Extremely Wet",
      labelId: "Amat Sangat Basah",
      color: "#1e40af", // blue-800
      badgeBg: "bg-blue-100 text-blue-900 dark:bg-blue-950 dark:text-blue-200 border-blue-300",
      description: "Kelembapan ekstrem, potensi surplus air tinggi dan banjir limpasan.",
    };
  }
  if (spi >= 1.5) {
    return {
      category: "Severely Wet",
      labelId: "Sangat Basah",
      color: "#0284c7", // sky-600
      badgeBg: "bg-sky-100 text-sky-800 dark:bg-sky-950 dark:text-sky-300 border-sky-300",
      description: "Kondisi sangat basah jauh di atas kebiasaan normal.",
    };
  }
  if (spi >= 1.0) {
    return {
      category: "Moderately Wet",
      labelId: "Cukup Basah",
      color: "#06b6d4", // cyan-500
      badgeBg: "bg-cyan-100 text-cyan-800 dark:bg-cyan-950 dark:text-cyan-300 border-cyan-300",
      description: "Kondisi agak basah, kelembapan tanah mencukupi kebutuhan tanaman.",
    };
  }
  if (spi > -1.0) {
    return {
      category: "Near Normal",
      labelId: "Normal / Mendekati Normal",
      color: "#10b981", // emerald-500
      badgeBg: "bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 border-emerald-300",
      description: "Curah hujan berada dalam rentang fluktuasi iklim wajar (±1.0 deviasi).",
    };
  }
  if (spi > -1.5) {
    return {
      category: "Moderately Dry",
      labelId: "Agak Kering (Waspada)",
      color: "#f59e0b", // amber-500
      badgeBg: "bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300 border-amber-300",
      description: "Defisit hujan mulai terjadi. Peringatan dini waspada kekeringan.",
    };
  }
  if (spi > -2.0) {
    return {
      category: "Severely Dry",
      labelId: "Sangat Kering (Siaga)",
      color: "#f97316", // orange-500
      badgeBg: "bg-orange-100 text-orange-900 dark:bg-orange-950 dark:text-orange-200 border-orange-400",
      description: "Defisit air parah. Cadangan air tanah menurun drastis.",
    };
  }
  return {
    category: "Extremely Dry",
    labelId: "Amat Sangat Kering (Awas)",
    color: "#ef4444", // red-500
    badgeBg: "bg-red-100 text-red-950 dark:bg-red-950 dark:text-red-200 border-red-500 animate-pulse",
    description: "Kekeringan meteorologis ekstrem. Ancaman kegagalan panen dan krisis air bersih.",
  };
}

/**
 * Menghitung estimasi Gamma Thom & Transformasi Abramowitz-Stegun
 * untuk merubah akumulasi hujan ke Z-score SPI
 */
function approximateGammaSpi(value: number, history: number[]): number {
  const validHistory = history.filter((v) => Number.isFinite(v) && v >= 0);
  if (validHistory.length < 5) {
    // Fallback normal standar z = (x - mean) / std jika sampel historis sedikit
    const mean = validHistory.reduce((a, b) => a + b, 0) / (validHistory.length || 1);
    const variance = validHistory.reduce((s, v) => s + Math.pow(v - mean, 2), 0) / (validHistory.length || 1);
    const std = Math.sqrt(variance) || 1;
    const z = (value - mean) / std;
    return Math.max(-3.5, Math.min(3.5, Number(z.toFixed(2))));
  }

  const n = validHistory.length;
  const nonZeros = validHistory.filter((v) => v > 0);
  const m = n - nonZeros.length; // Jumlah kejadian 0 mm
  const q = m / n; // Probabilitas 0 mm

  if (nonZeros.length < 3) {
    return 0.0;
  }

  const mean = nonZeros.reduce((a, b) => a + b, 0) / nonZeros.length;
  const sumLn = nonZeros.reduce((a, b) => a + Math.log(b), 0);
  const lnMean = Math.log(mean);
  const A = lnMean - sumLn / nonZeros.length;

  if (A <= 0) {
    const std = Math.sqrt(validHistory.reduce((s, v) => s + Math.pow(v - mean, 2), 0) / n) || 1;
    return Math.max(-3.5, Math.min(3.5, Number(((value - mean) / std).toFixed(2))));
  }

  // Estimator Thom untuk parameter Alpha dan Beta
  const alpha = (1 + Math.sqrt(1 + (4 * A) / 3)) / (4 * A);
  const beta = mean / alpha;

  // Fungsi Kumulatif Gamma terapproksimasi (Incomplete Gamma)
  let G = 0;
  if (value > 0) {
    G = incompleteGammaApproximation(alpha, value / beta);
  }

  // Probabilitas Kumulatif Gabungan H(x) = q + (1 - q)*G(x)
  let H = q + (1 - q) * G;
  H = Math.max(0.0001, Math.min(0.9999, H));

  // Transformasi Abramowitz dan Stegun (1965)
  const c0 = 2.515517;
  const c1 = 0.802853;
  const c2 = 0.010328;
  const d1 = 1.432788;
  const d2 = 0.189269;
  const d3 = 0.001308;

  let Z = 0;
  if (H <= 0.5) {
    const t = Math.sqrt(Math.log(1 / Math.pow(H, 2)));
    const numerator = c0 + c1 * t + c2 * Math.pow(t, 2);
    const denominator = 1 + d1 * t + d2 * Math.pow(t, 2) + d3 * Math.pow(t, 3);
    Z = -(t - numerator / denominator);
  } else {
    const t = Math.sqrt(Math.log(1 / Math.pow(1 - H, 2)));
    const numerator = c0 + c1 * t + c2 * Math.pow(t, 2);
    const denominator = 1 + d1 * t + d2 * Math.pow(t, 2) + d3 * Math.pow(t, 3);
    Z = +(t - numerator / denominator);
  }

  return Math.max(-3.5, Math.min(3.5, Number(Z.toFixed(2))));
}

/**
 * Regularized Incomplete Gamma function approximation P(a, x)
 */
function incompleteGammaApproximation(a: number, x: number): number {
  if (x <= 0) return 0;
  if (x >= a + 1) {
    // Continued fraction approximation untuk x besar
    return 1 - gammaContinuedFraction(a, x);
  }
  // Series approximation untuk x kecil
  return gammaSeries(a, x);
}

function gammaSeries(a: number, x: number): number {
  let sum = 1 / a;
  let term = 1 / a;
  for (let n = 1; n < 100; n++) {
    term *= x / (a + n);
    sum += term;
    if (Math.abs(term) < Math.abs(sum) * 1e-7) break;
  }
  return Math.exp(-x + a * Math.log(x) - logGamma(a)) * sum;
}

function gammaContinuedFraction(a: number, x: number): number {
  let b = x + 1 - a;
  let c = 1e30;
  let d = 1 / b;
  let h = d;
  for (let i = 1; i < 100; i++) {
    const an = -i * (i - a);
    b += 2;
    d = an * d + b;
    if (Math.abs(d) < 1e-30) d = 1e-30;
    c = b + an / c;
    if (Math.abs(c) < 1e-30) c = 1e-30;
    d = 1 / d;
    const del = d * c;
    h *= del;
    if (Math.abs(del - 1) < 1e-7) break;
  }
  return Math.exp(-x + a * Math.log(x) - logGamma(a)) * h;
}

function logGamma(z: number): number {
  const p = [
    676.5203681218851, -1259.1392167224028, 771.32342877765313,
    -176.61502916214059, 12.507343278686905, -0.138571095836524,
    9.9843695780195716e-6, 1.5056327351493116e-7,
  ];
  if (z < 0.5) return Math.log(Math.PI / Math.sin(Math.PI * z)) - logGamma(1 - z);
  z -= 1;
  let x = 0.99999999999980993;
  for (let i = 0; i < p.length; i++) {
    x += p[i] / (z + i + 1);
  }
  const t = z + p.length - 0.5;
  return 0.5 * Math.log(2 * Math.PI) + (z + 0.5) * Math.log(t) - t + Math.log(x);
}

/**
 * Menghitung SPI untuk runtun waktu data bulanan
 * @param monthlyData Array data presipitasi bulanan { dateStr, rainSum } berurutan kronologis
 * @param timescale 1, 3, 6, atau 12 bulan
 * @param historicalNormalRain Array 12 nilai rata-rata bulanan WMO normal (Jan..Des)
 */
export function calculateSpiSeries(
  monthlyData: { dateStr: string; rainSum: number }[],
  timescale: 1 | 3 | 6 | 12,
  historicalNormalRain?: number[]
): SpiSeriesResult {
  const titles: Record<number, { title: string; desc: string; app: string }> = {
    1: {
      title: "SPI-1 (Kekeringan Meteorologis Jangka Sangat Pendek)",
      desc: "Mengukur anomali kelembapan atmosfer dan curah hujan dalam periode 30 hari terakhir.",
      app: "Sangat relevan untuk deteksi dini cekaman air tanaman semusim dan status kelembaban tanah permukaan.",
    },
    3: {
      title: "SPI-3 (Kekeringan Agrometeorologis Jangka Menengah)",
      desc: "Mengukur ketersediaan air kumulatif 3 bulan (satu musim tanam).",
      app: "Standar emas BMKG & FAO untuk evaluasi keberhasilan fase vegetatif hingga generatif tanaman pangan.",
    },
    6: {
      title: "SPI-6 (Kekeringan Hidrologis)",
      desc: "Mengukur anomali akumulasi hujan selama 6 bulan berturut-turut.",
      app: "Menilai ketersediaan cadangan air waduk, debit sungai, dan muka air tanah dangkal.",
    },
    12: {
      title: "SPI-12 (Kekeringan Sosio-Ekonomi & Siklus Tahunan)",
      desc: "Mengukur anomali akumulasi hujan sepanjang 12 bulan.",
      app: "Menilai dampak kekeringan makro terhadap ketahanan air daerah dan pengisian air tanah dalam.",
    },
  };

  const info = titles[timescale];
  const points: SpiPoint[] = [];

  if (!monthlyData || monthlyData.length === 0) {
    return {
      timescale,
      title: info.title,
      description: info.desc,
      application: info.app,
      points: [],
      currentSpi: null,
    };
  }

  // Hitung akumulasi rolling sum untuk skala waktu k
  for (let i = 0; i < monthlyData.length; i++) {
    if (i < timescale - 1) {
      // Belum cukup bulan untuk timescale ini
      continue;
    }

    let rollingSum = 0;
    for (let k = 0; k < timescale; k++) {
      rollingSum += monthlyData[i - k].rainSum;
    }
    rollingSum = Number(rollingSum.toFixed(1));

    // Siapkan baseline history pembanding
    let history: number[] = [];
    if (historicalNormalRain && historicalNormalRain.length === 12) {
      // Bangun ekspektasi akumulasi normal untuk bulan-bulan terkait
      // Simulasikan variabilitas historis berdasarkan normal
      let baselineSum = 0;
      for (let k = 0; k < timescale; k++) {
        // Asumsi data bulanan memiliki format nama/urutan
        baselineSum += historicalNormalRain[(i - k) % 12];
      }
      // Buat distribusi acuan sintetis terkalibrasi normal WMO
      const factors = [0.55, 0.70, 0.85, 0.95, 1.0, 1.05, 1.15, 1.30, 1.50];
      history = factors.map((f) => baselineSum * f);
    } else {
      // Kumpulkan rolling sum dari seluruh riwayat yang ada
      history = monthlyData.slice(0, i + 1).map((d) => d.rainSum * timescale);
    }

    const spiValue = approximateGammaSpi(rollingSum, history);
    const category = getSpiCategory(spiValue);

    points.push({
      dateStr: monthlyData[i].dateStr,
      rainSum: rollingSum,
      spiValue,
      category,
    });
  }

  const currentSpi = points.length > 0 ? points[points.length - 1] : null;

  return {
    timescale,
    title: info.title,
    description: info.desc,
    application: info.app,
    points,
    currentSpi,
  };
}
