// lib/climatology/climateClassification.ts

/**
 * Klasifikasi Iklim Tropis Indonesia & Global
 * Standar: Oldeman (1975), Schmidt-Ferguson (1951), dan Köppen-Geiger
 */

export interface OldemanResult {
  zone: "A" | "B" | "C" | "D" | "E";
  subtype: 1 | 2 | 3 | 4;
  code: string; // misal "C2"
  wetMonths: number; // BB > 200 mm
  humidMonths: number; // BL 100 - 200 mm
  dryMonths: number; // BK < 100 mm
  maxConsecutiveWet: number;
  maxConsecutiveDry: number;
  title: string;
  description: string;
  farmingRecommendation: string;
}

export interface SchmidtFergusonResult {
  qValue: number; // Nilai Q (%)
  qRatio: number; // Nilai Q desimal
  type: "A" | "B" | "C" | "D" | "E" | "F" | "G" | "H";
  title: string;
  description: string;
  vegetationType: string;
  dryMonthsMohr: number; // BK < 60 mm
  wetMonthsMohr: number; // BB > 100 mm
  humidMonthsMohr: number; // BL 60 - 100 mm
}

export interface KoppenGeigerResult {
  code: "Af" | "Am" | "Aw" | "As" | "Cwa" | "Cfa";
  name: string;
  description: string;
}

export interface ComprehensiveClimateClassification {
  oldeman: OldemanResult;
  schmidtFerguson: SchmidtFergusonResult;
  koppen: KoppenGeigerResult;
  monthlyRainfall: number[]; // 12 bulan (Jan - Des)
  annualRainfall: number;
  driestMonthRain: number;
}

/**
 * Menghitung Klasifikasi Iklim Oldeman (1975)
 * Kriteria bulanan rata-rata:
 * - Bulan Basah (BB): P > 200 mm
 * - Bulan Lembap (BL): 100 <= P <= 200 mm
 * - Bulan Kering (BK): P < 100 mm
 */
export function calculateOldeman(monthlyRain: number[]): OldemanResult {
  let wetMonths = 0;
  let humidMonths = 0;
  let dryMonths = 0;

  let maxConsecutiveWet = 0;
  let currentConsecutiveWet = 0;

  let maxConsecutiveDry = 0;
  let currentConsecutiveDry = 0;

  monthlyRain.forEach((rain) => {
    if (rain > 200) {
      wetMonths++;
      currentConsecutiveWet++;
      maxConsecutiveWet = Math.max(maxConsecutiveWet, currentConsecutiveWet);
      currentConsecutiveDry = 0;
    } else if (rain >= 100) {
      humidMonths++;
      currentConsecutiveWet = 0;
      currentConsecutiveDry = 0;
    } else {
      dryMonths++;
      currentConsecutiveDry++;
      maxConsecutiveDry = Math.max(maxConsecutiveDry, currentConsecutiveDry);
      currentConsecutiveWet = 0;
    }
  });

  // Penentuan Zona Utama berdasarkan jumlah bulan basah berurutan
  let zone: "A" | "B" | "C" | "D" | "E" = "C";
  if (maxConsecutiveWet > 9) zone = "A";
  else if (maxConsecutiveWet >= 7) zone = "B";
  else if (maxConsecutiveWet >= 5) zone = "C";
  else if (maxConsecutiveWet >= 3) zone = "D";
  else zone = "E";

  // Penentuan Sub-zona berdasarkan jumlah bulan kering berurutan
  let subtype: 1 | 2 | 3 | 4 = 1;
  if (maxConsecutiveDry <= 1) subtype = 1;
  else if (maxConsecutiveDry <= 3) subtype = 2;
  else if (maxConsecutiveDry <= 6) subtype = 3;
  else subtype = 4;

  const code = `${zone}${subtype}`;

  const zoneTitles: Record<string, string> = {
    A: "Zona Sangat Basah (> 9 Bulan Basah berurutan)",
    B: "Zona Basah (7–9 Bulan Basah berurutan)",
    C: "Zona Agak Basah (5–6 Bulan Basah berurutan)",
    D: "Zona Sedang / Agak Kering (3–4 Bulan Basah berurutan)",
    E: "Zona Kering (< 3 Bulan Basah berurutan)",
  };

  const farmingRecs: Record<string, string> = {
    A1: "Sangat sesuai untuk padi terus menerus sepanjang tahun (Padi–Padi–Padi). Risiko kekeringan hampir nihil.",
    A2: "Sangat baik untuk padi 2-3 kali setahun, diselingi 1 kali palawija saat periode kering singkat.",
    B1: "Padi dapat ditanam 2 kali setahun, dilanjutkan dengan 1 kali palawija.",
    B2: "Padi dapat ditanam 2 kali setahun, dengan perencanaan tanam palawija yang cermat pada musim kering.",
    C1: "Padi 1–2 kali setahun dengan palawija 1–2 kali setahun. Memerlukan tata kelola air irigasi yang stabil.",
    C2: "Pola tanam optimal: Padi 1 kali disusul 2 kali palawija. Bulan kering 2–3 bulan cukup nyata.",
    C3: "Padi 1 kali dengan palawija 1 kali. Bulan kering mencapai 4–6 bulan, perlu antisipasi cekaman kekeringan.",
    D1: "Hanya memungkinkan padi 1 kali (gogo rancah / tadah hujan), selebihnya palawija atau hortikultura tahan kering.",
    D2: "Padi sawah berisiko tinggi tanpa irigasi teknis permanen. Sangat disarankan fokus pada komoditas palawija / tebu / jagung.",
    D3: "Pertanian tanaman pangan sangat terbatas, didominasi oleh tanaman semusim tahan kering dan perkebunan.",
    E1: "Daerah kering dengan bulan basah sangat singkat. Pertanian membutuhkan pasokan air irigasi bendungan/pompanisasi.",
    E2: "Umumnya padang penggembalaan, peternakan, atau tanaman lahan kering (sorgum, singkong, kacang hijau).",
    E3: "Kawasan semi-arid tropis. Pertanian intensif memerlukan embung konservasi air dan varietas toleran kekeringan ekstrem.",
    E4: "Sangat kering, vegetasi sabana atau hutan musim gugur daun.",
  };

  return {
    zone,
    subtype,
    code,
    wetMonths,
    humidMonths,
    dryMonths,
    maxConsecutiveWet,
    maxConsecutiveDry,
    title: `Tipe Iklim Oldeman ${code} - ${zoneTitles[zone]}`,
    description: `Memiliki ${wetMonths} bulan basah (>200mm) dengan ${maxConsecutiveWet} bulan basah berturut-turut, dan ${dryMonths} bulan kering (<100mm).`,
    farmingRecommendation: farmingRecs[code] || "Sesuaikan jadwal tanam dengan ketersediaan air irigasi setempat.",
  };
}

/**
 * Menghitung Klasifikasi Iklim Schmidt-Ferguson (1951)
 * Menggunakan kriteria Mohr:
 * - Bulan Kering (BK): P < 60 mm
 * - Bulan Lembap (BL): 60 <= P <= 100 mm
 * - Bulan Basah (BB): P > 100 mm
 * Nilai Q = (Jumlah BK / Jumlah BB) * 100%
 */
export function calculateSchmidtFerguson(monthlyRain: number[]): SchmidtFergusonResult {
  let dryCount = 0;
  let wetCount = 0;
  let humidCount = 0;

  monthlyRain.forEach((rain) => {
    if (rain < 60) dryCount++;
    else if (rain > 100) wetCount++;
    else humidCount++;
  });

  // Hindari pembagian dengan 0
  const safeWet = wetCount > 0 ? wetCount : 0.5;
  const qRatio = dryCount / safeWet;
  const qValue = Number((qRatio * 100).toFixed(1));

  let type: "A" | "B" | "C" | "D" | "E" | "F" | "G" | "H" = "C";
  let title = "";
  let description = "";
  let vegetationType = "";

  if (qValue < 14.3) {
    type = "A";
    title = "Tipe A (Sangat Basah)";
    description = "Daerah sangat basah tanpa bulan kering yang nyata.";
    vegetationType = "Hutan hujan tropika lebat (Tropical rainforest) dengan keanekaragaman hayati sangat tinggi.";
  } else if (qValue < 33.3) {
    type = "B";
    title = "Tipe B (Basah)";
    description = "Daerah basah dengan bulan kering singkat.";
    vegetationType = "Hutan hujan tropika dan perkebunan basah (kelapa sawit, karet, kopi, teh).";
  } else if (qValue < 60.0) {
    type = "C";
    title = "Tipe C (Agak Basah)";
    description = "Daerah agak basah dengan musim kemarau yang terasa tetapi tidak berkepanjangan.";
    vegetationType = "Hutan rimba campuran, hutan musim daun lebar, dan persawahan intensif.";
  } else if (qValue < 100.0) {
    type = "D";
    title = "Tipe D (Sedang)";
    description = "Daerah sedang dengan jumlah bulan basah dan bulan kering yang seimbang.";
    vegetationType = "Hutan musim tropika (daun gugur pada musim kemarau) seperti pohon jati.";
  } else if (qValue < 167.0) {
    type = "E";
    title = "Tipe E (Agak Kering)";
    description = "Daerah agak kering di mana musim kemarau lebih dominan daripada musim hujan.";
    vegetationType = "Hutan sabana terbuka, semak belukar, dan pertanian palawija tadah hujan.";
  } else if (qValue < 300.0) {
    type = "F";
    title = "Tipe F (Kering)";
    description = "Daerah kering dengan musim kemarau panjang.";
    vegetationType = "Padang rumput sabana dan semak berduri.";
  } else if (qValue < 700.0) {
    type = "G";
    title = "Tipe G (Sangat Kering)";
    description = "Daerah sangat kering dengan hujan tahunan rendah.";
    vegetationType = "Padang rumput semi-arid dan ilalang.";
  } else {
    type = "H";
    title = "Tipe H (Luar Biasa Kering)";
    description = "Daerah luar biasa kering dengan hampir tidak ada bulan basah.";
    vegetationType = "Vegetasi kerdil, kaktus, dan tumbuhan xerofit.";
  }

  return {
    qValue,
    qRatio: Number(qRatio.toFixed(3)),
    type,
    title,
    description,
    vegetationType,
    dryMonthsMohr: dryCount,
    wetMonthsMohr: wetCount,
    humidMonthsMohr: humidCount,
  };
}

/**
 * Menghitung Klasifikasi Köppen-Geiger Tropis untuk Indonesia
 */
export function calculateKoppenGeiger(monthlyRain: number[], annualRain: number): KoppenGeigerResult {
  const driestMonth = Math.min(...monthlyRain);

  if (driestMonth >= 60) {
    return {
      code: "Af",
      name: "Iklim Hutan Hujan Tropis (Tropical Rainforest)",
      description: "Curah hujan bulan terkering >= 60 mm. Kelembapan tinggi sepanjang tahun tanpa musim kering nyata.",
    };
  }

  // Ambang batas antara Am dan Aw: 100 - (AnnualRainfall / 25)
  const amThreshold = 100 - annualRain / 25;

  if (driestMonth >= amThreshold) {
    return {
      code: "Am",
      name: "Iklim Monsunal Tropis (Tropical Monsoon)",
      description: "Memiliki musim kemarau singkat yang diimbangi dengan curah hujan sangat lebat pada musim monsun basah.",
    };
  }

  return {
    code: "Aw",
    name: "Iklim Sabana Tropis (Tropical Savanna)",
    description: "Musim kemarau panjang dan tegas dengan defisit air yang nyata pada bulan-bulan kering.",
  };
}

/**
 * Evaluasi Komprehensif Klasifikasi Iklim
 */
export function evaluateClimateClassification(monthlyRain: number[]): ComprehensiveClimateClassification {
  const safeMonthly = monthlyRain && monthlyRain.length === 12 ? monthlyRain : Array(12).fill(150);
  const annualRainfall = safeMonthly.reduce((a, b) => a + b, 0);
  const driestMonthRain = Math.min(...safeMonthly);

  return {
    oldeman: calculateOldeman(safeMonthly),
    schmidtFerguson: calculateSchmidtFerguson(safeMonthly),
    koppen: calculateKoppenGeiger(safeMonthly, annualRainfall),
    monthlyRainfall: safeMonthly,
    annualRainfall: Number(annualRainfall.toFixed(1)),
    driestMonthRain: Number(driestMonthRain.toFixed(1)),
  };
}
