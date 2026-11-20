// lib/bias-correction/statistics/categoricalMetrics.ts

/**
 * Standard Meteorological Categorical Verification & 2x2 Contingency Table Metrics.
 * Compliant with World Meteorological Organization (WMO) verification standards
 * and BMKG (Badan Meteorologi, Klimatologi, dan Geofisika) rainfall intensity classifications.
 */

export interface ContingencyTable2x2 {
  /** a: Hits - Observed Yes, Forecast Yes */
  hits: number;
  /** b: False Alarms - Observed No, Forecast Yes */
  falseAlarms: number;
  /** c: Misses - Observed Yes, Forecast No */
  misses: number;
  /** d: Correct Negatives - Observed No, Forecast No */
  correctNegatives: number;
  /** Total sample size N = a + b + c + d */
  total: number;
}

export interface CategoricalMetrics {
  /** 2x2 Contingency Table */
  table: ContingencyTable2x2;
  /** Event Threshold (mm) */
  threshold: number;
  /** Probability of Detection (POD) / Hit Rate = a / (a + c) [0 to 1, optimal: 1] */
  pod: number;
  /** False Alarm Ratio (FAR) = b / (a + b) [0 to 1, optimal: 0] */
  far: number;
  /** Frequency of Hit (FOH) / Success Ratio = 1 - FAR = a / (a + b) [0 to 1, optimal: 1] */
  foh: number;
  /** Critical Success Index (CSI) / Threat Score (TS) = a / (a + b + c) [0 to 1, optimal: 1] */
  csi: number;
  /** Heidke Skill Score (HSS) [-1 to 1, optimal: 1, 0 = random chance] */
  hss: number;
  /** Frequency Bias Index (FBI) = (a + b) / (a + c) [optimal: 1, >1 overforecast, <1 underforecast] */
  bias: number;
  /** Proportion Correct / Accuracy = (a + d) / N [0 to 1, optimal: 1] */
  accuracy: number;
}

/**
 * Standard BMKG Rainfall Intensity Classifications (24-hour accumulation / daily standard)
 */
export type BMKGRainfallClass =
  | "BERAWAN" // < 0.1 mm (Berawan / Tidak Ada Hujan Signifikan)
  | "SANGAT_RINGAN" // 0.1 - 5.0 mm (Hujan Sangat Ringan)
  | "RINGAN" // > 5.0 - 20.0 mm (Hujan Ringan)
  | "SEDANG" // > 20.0 - 50.0 mm (Hujan Sedang)
  | "LEBAT" // > 50.0 - 100.0 mm (Hujan Lebat)
  | "SANGAT_LEBAT" // > 100.0 - 150.0 mm (Hujan Sangat Lebat)
  | "EKSTREM"; // > 150.0 mm (Hujan Ekstrem)

export interface BMKGThresholdConfig {
  id: string;
  label: string;
  threshold: number;
  description: string;
}

export const BMKG_RAINFALL_THRESHOLDS: BMKGThresholdConfig[] = [
  {
    id: "rain_occurrence",
    label: "Hujan (>= 0.1 mm)",
    threshold: 0.1,
    description: "Ambang batas deteksi presipitasi (Rain / No-Rain >= 0.1 mm)",
  },
  {
    id: "ringan",
    label: "Ringan (> 5 mm)",
    threshold: 5.0,
    description: "Hujan Ringan BMKG (> 5.0 mm/hari)",
  },
  {
    id: "sedang",
    label: "Sedang (> 20 mm)",
    threshold: 20.0,
    description: "Hujan Sedang BMKG (> 20.0 mm/hari)",
  },
  {
    id: "lebat",
    label: "Lebat (> 50 mm)",
    threshold: 50.0,
    description: "Hujan Lebat BMKG (> 50.0 mm/hari)",
  },
  {
    id: "sangat_lebat",
    label: "Sangat Lebat (> 100 mm)",
    threshold: 100.0,
    description: "Hujan Sangat Lebat BMKG (> 100.0 mm/hari)",
  },
];

export interface BMKGClassConfig {
  id: BMKGRainfallClass;
  label: string;
  min: number;
  max: number;
  description: string;
}

export const BMKG_INTENSITY_CLASSES: BMKGClassConfig[] = [
  {
    id: "BERAWAN",
    label: "Berawan / Tanpa Hujan (< 0.1 mm)",
    min: 0,
    max: 0.1,
    description: "Curah hujan harian < 0.1 mm",
  },
  {
    id: "SANGAT_RINGAN",
    label: "Sangat Ringan (<= 5 mm)",
    min: 0.1,
    max: 5.0,
    description: "Curah hujan harian 0.1 s/d 5.0 mm",
  },
  {
    id: "RINGAN",
    label: "Ringan (> 5 - 20 mm)",
    min: 5.0,
    max: 20.0,
    description: "Curah hujan harian > 5.0 s/d 20.0 mm",
  },
  {
    id: "SEDANG",
    label: "Sedang (> 20 - 50 mm)",
    min: 20.0,
    max: 50.0,
    description: "Curah hujan harian > 20.0 s/d 50.0 mm",
  },
  {
    id: "LEBAT",
    label: "Lebat (> 50 - 100 mm)",
    min: 50.0,
    max: 100.0,
    description: "Curah hujan harian > 50.0 s/d 100.0 mm",
  },
  {
    id: "SANGAT_LEBAT",
    label: "Sangat Lebat (> 100 - 150 mm)",
    min: 100.0,
    max: 150.0,
    description: "Curah hujan harian > 100.0 s/d 150.0 mm",
  },
  {
    id: "EKSTREM",
    label: "Ekstrem (> 150 mm)",
    min: 150.0,
    max: Infinity,
    description: "Curah hujan harian > 150.0 mm",
  },
];

/**
 * Classifies rainfall value into official BMKG category.
 */
export function classifyBMKGRainfall(rainMm: number): BMKGRainfallClass {
  const r = Math.max(0, Number(rainMm) || 0);
  if (r < 0.1) return "BERAWAN";
  if (r <= 5.0) return "SANGAT_RINGAN";
  if (r <= 20.0) return "RINGAN";
  if (r <= 50.0) return "SEDANG";
  if (r <= 100.0) return "LEBAT";
  if (r <= 150.0) return "SANGAT_LEBAT";
  return "EKSTREM";
}

/**
 * Human-readable Indonesian label for BMKG classification.
 */
export function getBMKGRainfallLabel(rainMm: number): string {
  const cls = classifyBMKGRainfall(rainMm);
  switch (cls) {
    case "BERAWAN":
      return "Berawan / Tidak Hujan (< 0.1 mm)";
    case "SANGAT_RINGAN":
      return "Hujan Sangat Ringan (0.1 - 5.0 mm)";
    case "RINGAN":
      return "Hujan Ringan (5.1 - 20.0 mm)";
    case "SEDANG":
      return "Hujan Sedang (20.1 - 50.0 mm)";
    case "LEBAT":
      return "Hujan Lebat (50.1 - 100.0 mm)";
    case "SANGAT_LEBAT":
      return "Hujan Sangat Lebat (100.1 - 150.0 mm)";
    case "EKSTREM":
      return "Hujan Ekstrem (> 150.0 mm)";
  }
}

/**
 * Computes 2x2 contingency table for a given rain/no-rain threshold.
 * Pairs with null/undefined/NaN are automatically filtered.
 *
 * @param pairs Matched observed (AWS) and forecast/model (ERA5) values
 * @param threshold Event threshold (default: 0.1 mm)
 */
export function calculateContingencyTable(
  pairs: { observed: number | null | undefined; forecast: number | null | undefined }[],
  threshold = 0.1
): ContingencyTable2x2 {
  let hits = 0;
  let falseAlarms = 0;
  let misses = 0;
  let correctNegatives = 0;

  for (const p of pairs) {
    if (
      p.observed === null ||
      p.observed === undefined ||
      isNaN(p.observed) ||
      p.forecast === null ||
      p.forecast === undefined ||
      isNaN(p.forecast)
    ) {
      continue;
    }

    const obsEvent = p.observed >= threshold;
    const fcstEvent = p.forecast >= threshold;

    if (obsEvent && fcstEvent) {
      hits++;
    } else if (!obsEvent && fcstEvent) {
      falseAlarms++;
    } else if (obsEvent && !fcstEvent) {
      misses++;
    } else {
      correctNegatives++;
    }
  }

  const total = hits + falseAlarms + misses + correctNegatives;
  return { hits, falseAlarms, misses, correctNegatives, total };
}

/**
 * Computes standard categorical verification metrics from a 2x2 contingency table.
 * Fully guards against division-by-zero, NaN, and Infinity.
 */
export function calculateCategoricalMetricsFromTable(
  table: ContingencyTable2x2,
  threshold = 0.1
): CategoricalMetrics {
  const { hits: a, falseAlarms: b, misses: c, correctNegatives: d, total: N } = table;

  if (N === 0) {
    return {
      table,
      threshold,
      pod: 0,
      far: 0,
      foh: 0,
      csi: 0,
      hss: 0,
      bias: 0,
      accuracy: 0,
    };
  }

  // 1. Probability of Detection (POD) = a / (a + c)
  // If no observed events occurred (a + c === 0):
  // - If model also predicted no events (b === 0), POD is 1.0 (no missed events)
  // - Otherwise 0.0
  let pod = 0;
  if (a + c > 0) {
    pod = a / (a + c);
  } else if (b === 0) {
    pod = 1;
  }

  // 2. False Alarm Ratio (FAR) = b / (a + b)
  // If no events were forecast (a + b === 0), FAR is 0.0
  const far = a + b > 0 ? b / (a + b) : 0;

  // 3. Frequency of Hit (FOH) / Success Ratio = 1 - FAR = a / (a + b)
  // If no events were forecast, default to 1.0 if no events observed, else 0.0
  let foh = 0;
  if (a + b > 0) {
    foh = a / (a + b);
  } else if (a + c === 0) {
    foh = 1;
  }

  // 4. Critical Success Index (CSI) / Threat Score = a / (a + b + c)
  // If a + b + c === 0 (all correct negatives), CSI is 1.0 (perfect negative agreement)
  let csi = 0;
  if (a + b + c > 0) {
    csi = a / (a + b + c);
  } else if (d === N) {
    csi = 1;
  }

  // 5. Heidke Skill Score (HSS)
  // Expected correct by chance: E = [(a + c)(a + b) + (b + d)(c + d)] / N
  // HSS = [(a + d) - E] / [N - E] = 2(ad - bc) / [(a + c)(c + d) + (a + b)(b + d)]
  const hssNumerator = 2 * (a * d - b * c);
  const hssDenominator = (a + c) * (c + d) + (a + b) * (b + d);
  let hss = 0;
  if (hssDenominator > 0) {
    hss = hssNumerator / hssDenominator;
  } else if (a + d === N) {
    // 100% correct forecasts (e.g. all hits or all correct negatives)
    hss = 1;
  }
  // Clamp HSS to [-1, 1] to guard against floating-point anomalies
  hss = Math.max(-1, Math.min(1, hss));

  // 6. Frequency Bias (BIAS) = (a + b) / (a + c)
  let bias = 1;
  if (a + c > 0) {
    bias = (a + b) / (a + c);
  } else if (a + b === 0) {
    bias = 1;
  } else {
    bias = a + b; // Overforecast when no actual events
  }

  // 7. Accuracy / Proportion Correct (PC) = (a + d) / N
  const accuracy = (a + d) / N;

  return {
    table,
    threshold,
    pod: Number(pod.toFixed(4)),
    far: Number(far.toFixed(4)),
    foh: Number(foh.toFixed(4)),
    csi: Number(csi.toFixed(4)),
    hss: Number(hss.toFixed(4)),
    bias: Number(bias.toFixed(3)),
    accuracy: Number(accuracy.toFixed(4)),
  };
}

/**
 * End-to-end evaluation of pairs against a specific rainfall threshold.
 */
export function calculateCategoricalMetrics(
  pairs: { observed: number | null | undefined; forecast: number | null | undefined }[],
  threshold = 0.1
): CategoricalMetrics {
  const table = calculateContingencyTable(pairs, threshold);
  return calculateCategoricalMetricsFromTable(table, threshold);
}

/**
 * Computes 2x2 contingency table for a specific BMKG intensity class.
 * - Hits (a): Both observed and forecast fall into the target class interval.
 * - False Alarms (b): Observed not in target class, but forecast is in target class.
 * - Misses (c): Observed in target class, but forecast is not in target class.
 * - Correct Negatives (d): Neither observed nor forecast are in target class.
 */
export function calculateClassContingencyTable(
  pairs: { observed: number | null | undefined; forecast: number | null | undefined }[],
  targetClass: BMKGRainfallClass
): ContingencyTable2x2 {
  let hits = 0;
  let falseAlarms = 0;
  let misses = 0;
  let correctNegatives = 0;

  for (const p of pairs) {
    if (
      p.observed === null ||
      p.observed === undefined ||
      isNaN(p.observed) ||
      p.forecast === null ||
      p.forecast === undefined ||
      isNaN(p.forecast)
    ) {
      continue;
    }

    const obsInClass = classifyBMKGRainfall(p.observed) === targetClass;
    const fcstInClass = classifyBMKGRainfall(p.forecast) === targetClass;

    if (obsInClass && fcstInClass) {
      hits++;
    } else if (!obsInClass && fcstInClass) {
      falseAlarms++;
    } else if (obsInClass && !fcstInClass) {
      misses++;
    } else {
      correctNegatives++;
    }
  }

  const total = hits + falseAlarms + misses + correctNegatives;
  return { hits, falseAlarms, misses, correctNegatives, total };
}

/**
 * End-to-end evaluation of pairs against a specific BMKG rainfall intensity class.
 */
export function calculateCategoricalMetricsForClass(
  pairs: { observed: number | null | undefined; forecast: number | null | undefined }[],
  targetClass: BMKGRainfallClass
): CategoricalMetrics {
  const table = calculateClassContingencyTable(pairs, targetClass);
  const cfg = BMKG_INTENSITY_CLASSES.find(c => c.id === targetClass);
  const nominalThreshold = cfg ? cfg.min : 0.1;
  return calculateCategoricalMetricsFromTable(table, nominalThreshold);
}

/**
 * Evaluates pairs across standard BMKG rainfall intensity thresholds and classes.
 */
export function calculateBMKGIntensityVerification(
  pairs: { observed: number | null | undefined; forecast: number | null | undefined }[]
): Record<string, CategoricalMetrics> {
  const results: Record<string, CategoricalMetrics> = {};

  // 1. Exceedance thresholds
  for (const cfg of BMKG_RAINFALL_THRESHOLDS) {
    results[cfg.id] = calculateCategoricalMetrics(pairs, cfg.threshold);
  }

  // 2. Per-class intensity evaluation
  for (const cls of BMKG_INTENSITY_CLASSES) {
    results[`class_${cls.id.toLowerCase()}`] = calculateCategoricalMetricsForClass(pairs, cls.id);
  }

  return results;
}
