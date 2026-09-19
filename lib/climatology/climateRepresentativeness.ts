// lib/climatology/climateRepresentativeness.ts
/**
 * Utilitas Analisis Keterwakilan Iklim (Climatological Representativeness)
 * Mengacu pada standar BMKG (Badan Meteorologi, Klimatologi, dan Geofisika)
 * dan WMO (World Meteorological Organization) No. 100.
 */

export interface ClimateRegimeInfo {
  regime: IndonesiaClimateZoneCode;
  /** Klasifikasi i-TMY BMKG; berbeda dari rezim pola hujan/ZOM di atas. */
  climateZone: IndonesiaClimateZoneInfo;
  title: string;
  description: string;
  peakRainfallMonths: string;
  drySeasonMonths: string;
  currentSeasonPhase: string;
  iconName: "monsoon" | "equatorial" | "local";
}

export type IndonesiaClimateZoneCode = "1A" | "1B" | "2A" | "2B" | "3A" | "3B" | "4A" | "4B";

export interface IndonesiaClimateZoneInfo {
  code: IndonesiaClimateZoneCode;
  title: string;
  description: string;
  /** Penetapan otomatis bersifat indikatif; batas resmi memerlukan layer spasial i-TMY BMKG. */
  isIndicative: boolean;
}

/** Delapan zona i-TMY BMKG; ini berbeda dari tiga pola hujan/ZOM. */
export const INDONESIA_TMY_CLIMATE_ZONES: Record<IndonesiaClimateZoneCode, Pick<IndonesiaClimateZoneInfo, "title" | "description">> = {
  "1A": { title: "Khatulistiwa", description: "Wilayah hangat di pulau besar sekitar khatulistiwa dengan tutupan awan dan curah hujan relatif tinggi sepanjang tahun." },
  "1B": { title: "Sub-Khatulistiwa", description: "Pulau kecil di sekitar khatulistiwa yang sedikit dipengaruhi monsun, dengan angin rata-rata lebih kuat." },
  "2A": { title: "Dataran Tinggi Tropis", description: "Wilayah pada ketinggian 500–1.500 m dengan suhu lebih dingin, lembap, dan hujan orografis tinggi." },
  "2B": { title: "Dataran Sangat Tinggi Tropis", description: "Wilayah di atas 1.500 m dengan suhu sangat rendah serta kelembapan, angin, dan curah hujan tinggi." },
  "3A": { title: "Monsunal", description: "Wilayah dengan siklus musim yang jelas; kelembapan dan tutupan awan tinggi saat hujan, lalu lebih rendah saat kemarau." },
  "3B": { title: "Sub-Monsunal", description: "Varian monsunal dengan angin lebih lemah dan variasi suhu diurnal lebih rendah dibanding Zona 3A." },
  "4A": { title: "Sabana", description: "Wilayah Nusa Tenggara dengan kemarau panjang, angin kencang, intensitas matahari tinggi, dan malam relatif dingin pada Juni–September." },
  "4B": { title: "Sub-Sabana", description: "Wilayah sub-sabana seperti Madura dengan variasi suhu tahunan dan diurnal lebih kecil daripada Zona 4A." },
};

/**
 * Estimasi zona i-TMY dari koordinat dan elevasi ERA5. Hasil ini tidak
 * menggantikan penetapan resmi BMKG karena batas poligon i-TMY belum tersedia
 * pada repositori ini.
 */
export function detectIndonesiaTmyClimateZone(
  lat: number,
  lng: number,
  elevationMeters?: number,
): IndonesiaClimateZoneInfo {
  const zone = (code: IndonesiaClimateZoneCode): IndonesiaClimateZoneInfo => ({
    code,
    ...INDONESIA_TMY_CLIMATE_ZONES[code],
    isIndicative: true,
  });

  if (Number.isFinite(elevationMeters) && elevationMeters! > 1500) return zone("2B");
  if (Number.isFinite(elevationMeters) && elevationMeters! >= 500) return zone("2A");

  if (lat >= -7.5 && lat <= -6.5 && lng >= 112.5 && lng <= 114.5) return zone("4B");
  if (lat >= -11.8 && lat <= -7.3 && lng >= 115 && lng <= 125.5) return zone("4A");

  // Estimasi sub-monsunal untuk bagian selatan Kalimantan, Sulawesi, dan
  // Maluku utara yang tidak termasuk pola lokal di bawah.
  const subMonsunalRegion =
    (lat >= -4.5 && lat < -1.5 && lng >= 108 && lng <= 119.5) ||
    (lat >= -3.5 && lat <= 2.5 && lng >= 120 && lng <= 125) ||
    (lat >= -2.5 && lat <= 2.5 && lng > 125 && lng <= 130);
  if (subMonsunalRegion) return zone("3B");

  const nearEquator = lat >= -3.5 && lat <= 4.5;
  if (nearEquator) {
    const onLargeIsland =
      (lng >= 95 && lng <= 106) || // Sumatera
      (lng >= 108 && lng <= 119.5) || // Kalimantan
      (lng >= 119 && lng <= 125.5) || // Sulawesi
      (lng >= 130 && lng <= 141.5); // Papua
    return zone(onLargeIsland ? "1A" : "1B");
  }

  // Tanpa layer poligon i-TMY, area monsunal menjadi estimasi aman.
  return zone("3A");
}

export interface BmkgRainCharacter {
  category: "AN" | "N" | "BN" | "Belum Cukup Data";
  label: string;
  ratioPercent: number | null;
  description: string;
  colorClass: string;
  badgeBg: string;
}

export interface BmkgHthClassification {
  days: number;
  category: "Nihil" | "Sangat Pendek" | "Pendek" | "Menengah" | "Panjang" | "Sangat Panjang" | "Kekeringan Ekstrem";
  status: "Aman" | "Waspada" | "Siaga" | "Awas";
  description: string;
  colorClass: string;
  badgeBg: string;
}

export interface DataCompletenessInfo {
  actualPoints: number;
  expectedPoints: number;
  percentage: number;
  qualityLevel: "Tinggi (Representatif WMO)" | "Sedang (Cukup Representatif)" | "Rendah (Indikatif)";
  badgeColor: string;
}

export interface TemperatureAnomalyInfo {
  deltaT: number;
  status: "Lebih Hangat (Anomali Positif)" | "Normal" | "Lebih Sejuk (Anomali Negatif)";
  description: string;
  colorClass: string;
  badgeBg: string;
}

/**
 * Mendeteksi Rezim Pola Hujan Utama Indonesia berdasarkan koordinat geografis.
 * Mengacu pada 3 Pola Curah Hujan BMKG:
 * 1. Monsunal: 1 puncak hujan (DJF), 1 kemarau tegas (JJA). Jawa, Bali, NTB, NTT, Lampung, dsb.
 * 2. Ekuatorial: 2 puncak hujan (MAM & SON) saat ekuinoks. Sumatera tengah/utara, Kalimantan, Sulawesi utara.
 * 3. Lokal: Pola terbalik, puncak hujan pertengahan tahun (JJA). Maluku, Ambon, Seram, Papua Barat.
 */
export function detectIndonesianClimateRegime(
  lat: number,
  lng: number,
  currentMonth?: number,
  elevationMeters?: number,
): ClimateRegimeInfo {
  const m = currentMonth ?? (new Date().getUTCMonth() + 1);
  const climateZone = detectIndonesiaTmyClimateZone(lat, lng, elevationMeters);

  // 1. Deteksi Pola Lokal (Maluku, Seram, Ambon, sekitarnya: bujur > 125 E, lintang antara -6 s.d. +2)
  if (lng >= 125 && lng <= 135 && lat >= -6.0 && lat <= 2.5) {
    let currentSeasonPhase = "Musim Hujan Lokal";
    if (m >= 5 && m <= 8) currentSeasonPhase = "Puncak Musim Hujan Lokal (Orografis)";
    else if (m >= 11 || m <= 2) currentSeasonPhase = "Periode Relatif Kering Lokal";
    else currentSeasonPhase = "Peralihan Musim Lokal";

    return {
      regime: climateZone.code,
      climateZone,
      title: "Pola Hujan Lokal (Unimodal Terbalik)",
      description: "Dicirikan oleh puncak curah hujan di pertengahan tahun (Mei–Agustus) akibat pengaruh sirkulasi angin timur dan topografi pulau.",
      peakRainfallMonths: "Mei – Agustus",
      drySeasonMonths: "November – Februari",
      currentSeasonPhase,
      iconName: "local",
    };
  }

  // 2. Deteksi Pola Ekuatorial (Dekat khatulistiwa: Lintang -2.5 s.d. +6, Bujur < 125 E)
  if (lat >= -2.5 && lat <= 6.0 && lng < 125) {
    let currentSeasonPhase = "Pola Hujan Bimodal";
    if ((m >= 3 && m <= 5) || (m >= 10 && m <= 12)) currentSeasonPhase = "Puncak Ekuinoks (Curah Hujan Tinggi)";
    else currentSeasonPhase = "Periode Penurunan Hujan Antara";

    return {
      regime: climateZone.code,
      climateZone,
      title: "Pola Hujan Ekuatorial (Bimodal)",
      description: "Memiliki dua puncak curah hujan dalam setahun seiring pergerakan semu matahari melintasi garis khatulistiwa tanpa musim kemarau panjang.",
      peakRainfallMonths: "Maret–Mei & Oktober–Desember",
      drySeasonMonths: "Februari & Juli–Agustus (Kering Singkat)",
      currentSeasonPhase,
      iconName: "equatorial",
    };
  }

  // 3. Pola Monsunal (Default untuk mayoritas wilayah selatan khatulistiwa: Jawa, Bali, Nusa Tenggara, dsb.)
  let currentSeasonPhase = "Musim Monsun";
  if (m >= 11 || m <= 3) {
    currentSeasonPhase = "Musim Hujan (Monsun Asia / Barat)";
  } else if (m >= 6 && m <= 8) {
    currentSeasonPhase = "Musim Kemarau (Monsun Australia / Timur)";
  } else {
    currentSeasonPhase = "Masa Pancaroba / Peralihan Musim";
  }

  return {
    regime: climateZone.code,
    climateZone,
    title: "Pola Hujan Monsunal (Unimodal)",
    description: "Dipengaruhi sirkulasi monsun Benua Asia–Australia dengan kontras tegas antara musim hujan (Des–Feb) dan musim kemarau (Jun–Agu).",
    peakRainfallMonths: "Desember – Februari",
    drySeasonMonths: "Juni – Agustus",
    currentSeasonPhase,
    iconName: "monsoon",
  };
}

/**
 * Klasifikasi Sifat Hujan Standar BMKG:
 * - Atas Normal (AN): > 115% dari Normal
 * - Normal (N): 85% – 115% dari Normal
 * - Bawah Normal (BN): < 85% dari Normal
 */
export function classifyBmkgRainCharacter(
  observedRain: number | null | undefined,
  normalRain: number | null | undefined
): BmkgRainCharacter {
  if (
    observedRain == null ||
    normalRain == null ||
    !Number.isFinite(observedRain) ||
    !Number.isFinite(normalRain) ||
    normalRain <= 0
  ) {
    return {
      category: "Belum Cukup Data",
      label: "Belum Tersedia",
      ratioPercent: null,
      description: "Memerlukan data curah hujan observasi dan acuan normal ERA5 yang valid.",
      colorClass: "text-slate-500",
      badgeBg: "bg-slate-100 text-slate-700 border-slate-300 dark:bg-slate-800 dark:text-slate-300",
    };
  }

  const ratio = (observedRain / normalRain) * 100;

  if (ratio > 115) {
    return {
      category: "AN",
      label: "Atas Normal (AN)",
      ratioPercent: Number(ratio.toFixed(1)),
      description: `Curah hujan tercatat ${ratio.toFixed(0)}% dari normal (>115%), kategori basah di atas kebiasaan klimatologis.`,
      colorClass: "text-emerald-600 dark:text-emerald-400",
      badgeBg: "bg-emerald-50 text-emerald-800 border-emerald-300 dark:bg-emerald-950/60 dark:text-emerald-300 dark:border-emerald-800",
    };
  }

  if (ratio >= 85) {
    return {
      category: "N",
      label: "Normal (N)",
      ratioPercent: Number(ratio.toFixed(1)),
      description: `Curah hujan berada pada rentang wajar ${ratio.toFixed(0)}% (85%–115%) dari rata-rata normal historis.`,
      colorClass: "text-blue-600 dark:text-blue-400",
      badgeBg: "bg-blue-50 text-blue-800 border-blue-300 dark:bg-blue-950/60 dark:text-blue-300 dark:border-blue-800",
    };
  }

  return {
    category: "BN",
    label: "Bawah Normal (BN)",
    ratioPercent: Number(ratio.toFixed(1)),
    description: `Curah hujan tercatat hanya ${ratio.toFixed(0)}% dari normal (<85%), kategori kering di bawah kebiasaan iklim.`,
    colorClass: "text-amber-600 dark:text-amber-400",
    badgeBg: "bg-amber-50 text-amber-800 border-amber-300 dark:bg-amber-950/60 dark:text-amber-300 dark:border-amber-800",
  };
}

/**
 * Klasifikasi Hari Tanpa Hujan (HTH) Standar BMKG:
 * Memetakan durasi hari kering berurutan ke dalam indeks kewaspadaan kekeringan meteorologis.
 */
export function classifyBmkgDryDays(cdd: number): BmkgHthClassification {
  if (cdd <= 0) {
    return {
      days: 0,
      category: "Nihil",
      status: "Aman",
      description: "Ada curah hujan terukur baru-baru ini.",
      colorClass: "text-cyan-600 dark:text-cyan-400",
      badgeBg: "bg-cyan-50 text-cyan-800 border-cyan-300 dark:bg-cyan-950/50 dark:text-cyan-300",
    };
  }

  if (cdd <= 5) {
    return {
      days: cdd,
      category: "Sangat Pendek",
      status: "Aman",
      description: `${cdd} hari tanpa hujan. Kondisi tanah dan air permukaan masih sangat stabil.`,
      colorClass: "text-emerald-600 dark:text-emerald-400",
      badgeBg: "bg-emerald-50 text-emerald-800 border-emerald-300 dark:bg-emerald-950/50 dark:text-emerald-300",
    };
  }

  if (cdd <= 10) {
    return {
      days: cdd,
      category: "Pendek",
      status: "Aman",
      description: `${cdd} hari tanpa hujan. Tergolong wajar pada siklus dasarian normal.`,
      colorClass: "text-teal-600 dark:text-teal-400",
      badgeBg: "bg-teal-50 text-teal-800 border-teal-300 dark:bg-teal-950/50 dark:text-teal-300",
    };
  }

  if (cdd <= 20) {
    return {
      days: cdd,
      category: "Menengah",
      status: "Waspada",
      description: `${cdd} hari tanpa hujan. Peringatan dini waspada defisit air perakaran tanaman semusim.`,
      colorClass: "text-amber-600 dark:text-amber-400",
      badgeBg: "bg-amber-50 text-amber-800 border-amber-300 dark:bg-amber-950/50 dark:text-amber-300",
    };
  }

  if (cdd <= 30) {
    return {
      days: cdd,
      category: "Panjang",
      status: "Waspada",
      description: `${cdd} hari tanpa hujan. Mengindikasikan fase kering signifikan, irigasi berkala dianjurkan.`,
      colorClass: "text-orange-600 dark:text-orange-400",
      badgeBg: "bg-orange-50 text-orange-800 border-orange-300 dark:bg-orange-950/50 dark:text-orange-300",
    };
  }

  if (cdd <= 60) {
    return {
      days: cdd,
      category: "Sangat Panjang",
      status: "Siaga",
      description: `${cdd} hari tanpa hujan. Status Siaga Kekeringan Meteorologis BMKG, cadangan air tanah menipis.`,
      colorClass: "text-rose-600 dark:text-rose-400",
      badgeBg: "bg-rose-50 text-rose-800 border-rose-300 dark:bg-rose-950/50 dark:text-rose-300",
    };
  }

  return {
    days: cdd,
    category: "Kekeringan Ekstrem",
    status: "Awas",
    description: `${cdd} hari tanpa hujan (>60 hari). Status Awas Kekeringan Ekstrem, risiko kegagalan panen tinggi.`,
    colorClass: "text-red-700 dark:text-red-400 font-black",
    badgeBg: "bg-red-100 text-red-900 border-red-400 dark:bg-red-950 dark:text-red-200 dark:border-red-700 animate-pulse",
  };
}

/**
 * Menghitung anomali suhu termal rata-rata observasi terhadap baseline ERA5.
 */
export function calculateTemperatureAnomaly(
  observedMean: number | null | undefined,
  normalMean: number | null | undefined
): TemperatureAnomalyInfo {
  if (observedMean == null || normalMean == null || !Number.isFinite(observedMean) || !Number.isFinite(normalMean)) {
    return {
      deltaT: 0,
      status: "Normal",
      description: "Data komparasi suhu belum lengkap.",
      colorClass: "text-slate-500",
      badgeBg: "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300",
    };
  }

  const delta = Number((observedMean - normalMean).toFixed(2));

  if (delta > 0.5) {
    return {
      deltaT: delta,
      status: "Lebih Hangat (Anomali Positif)",
      description: `Suhu observasi +${delta}°C lebih panas dibandingkan acuan normal klimatologis.`,
      colorClass: "text-rose-600 dark:text-rose-400",
      badgeBg: "bg-rose-50 text-rose-800 border-rose-300 dark:bg-rose-950/50 dark:text-rose-300",
    };
  }

  if (delta < -0.5) {
    return {
      deltaT: delta,
      status: "Lebih Sejuk (Anomali Negatif)",
      description: `Suhu observasi ${delta}°C lebih sejuk dibandingkan acuan normal klimatologis.`,
      colorClass: "text-sky-600 dark:text-sky-400",
      badgeBg: "bg-sky-50 text-sky-800 border-sky-300 dark:bg-sky-950/50 dark:text-sky-300",
    };
  }

  return {
    deltaT: delta,
    status: "Normal",
    description: `Deviasi suhu ${delta > 0 ? `+${delta}` : delta}°C mendekati rata-rata normal (±0.5°C).`,
    colorClass: "text-emerald-600 dark:text-emerald-400",
    badgeBg: "bg-emerald-50 text-emerald-800 border-emerald-300 dark:bg-emerald-950/50 dark:text-emerald-300",
  };
}

/**
 * Menghitung tingkat kelengkapan rekaman stasiun (WMO completeness ratio).
 * WMO merekomendasikan >80% kelengkapan data untuk agregasi iklim representatif.
 */
export function calculateDataCompleteness(
  actualPoints: number,
  preset: string,
  daysInMonth = 30
): DataCompletenessInfo {
  let expected = 30;
  if (preset === "dasarian") expected = 10;
  else if (preset === "monthly") expected = daysInMonth;
  else if (preset === "weekly") expected = 7;
  else if (preset === "yearly") expected = 12;

  const pct = Math.min(100, Math.round((actualPoints / Math.max(1, expected)) * 100));

  if (pct >= 80) {
    return {
      actualPoints,
      expectedPoints: expected,
      percentage: pct,
      qualityLevel: "Tinggi (Representatif WMO)",
      badgeColor: "bg-emerald-100 text-emerald-800 border-emerald-300 dark:bg-emerald-950/50 dark:text-emerald-300",
    };
  }

  if (pct >= 50) {
    return {
      actualPoints,
      expectedPoints: expected,
      percentage: pct,
      qualityLevel: "Sedang (Cukup Representatif)",
      badgeColor: "bg-amber-100 text-amber-800 border-amber-300 dark:bg-amber-950/50 dark:text-amber-300",
    };
  }

  return {
    actualPoints,
    expectedPoints: expected,
    percentage: pct,
    qualityLevel: "Rendah (Indikatif)",
    badgeColor: "bg-rose-100 text-rose-800 border-rose-300 dark:bg-rose-950/50 dark:text-rose-300",
  };
}
