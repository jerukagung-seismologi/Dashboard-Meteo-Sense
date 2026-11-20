// lib/forecasting/fuzzyTimeSeries.ts
/**
 * Implementasi Algoritma Fuzzy Time Series (FTS) Chen (1996) & Song-Chissom (1993)
 * murni dalam TypeScript untuk Peramalan Curah Hujan Lokal Kebumen.
 *
 * Tahapan Algoritma:
 * 1. Menentukan Universe of Discourse U = [Dmin - D1, Dmax + D2]
 * 2. Membagi U ke dalam k interval (u_1, u_2, ..., u_k) dengan nilai tengah m_i
 * 3. Mendefinisikan himpunan fuzzy A_1, A_2, ..., A_k
 * 4. Fuzzifikasi data historis deret waktu
 * 5. Membentuk Fuzzy Logical Relationships (FLR): A_i -> A_j
 * 6. Mengelompokkan FLR menjadi Fuzzy Logical Relationship Groups (FLRG): A_i -> A_j1, A_j2, ...
 * 7. Defuzzifikasi menggunakan Aturan Rata-rata Chen:
 *    - Jika A_i -> kosong : ramalan = m_i
 *    - Jika A_i -> A_j    : ramalan = m_j
 *    - Jika A_i -> A_j1, A_j2, ... : ramalan = (m_j1 + m_j2 + ... + m_jp) / p
 * 8. Evaluasi metrik akurasi: MAPE (%) dan RMSE (mm)
 * 9. Peramalan Multi-step ahead masa depan.
 */

export interface FTSDataPoint {
  period: string; // Misal "2023-01", "2023-D1", dll.
  actual: number; // Nilai observasi (mm)
}

export interface FuzzyInterval {
  id: string; // Misal "u1", "u2"
  fuzzySet: string; // Misal "A1", "A2"
  lower: number;
  upper: number;
  midpoint: number;
}

export interface FuzzyLogicalRelationship {
  from: string; // Misal "A1"
  to: string; // Misal "A2"
  timeIndex: number;
}

export interface FuzzyLogicalRelationshipGroup {
  antecedent: string; // Sisi kiri relasi (A_i)
  consequents: string[]; // Sisi kanan unik (A_j1, A_j2, ...)
  predictedMidpoints: number[];
  forecastValue: number; // Nilai defuzzifikasi rata-rata nilai tengah
}

export interface FTSFittedItem {
  period: string;
  actual: number;
  fuzzySet: string;
  previousFuzzySet: string | null;
  forecast: number | null;
  residual: number | null;
  percentageError: number | null; // Untuk MAPE
}

export interface FTSFutureForecastItem {
  step: number; // 1, 2, ..., h
  predictedValue: number;
  fuzzySet: string;
  basedOnFLRG: string;
}

export interface FTSMetrics {
  mape: number; // Mean Absolute Percentage Error (%)
  rmse: number; // Root Mean Square Error (mm)
  mae: number;  // Mean Absolute Error (mm)
  sampleCount: number;
}

export interface FTSForecastResult {
  universeOfDiscourse: {
    min: number;
    max: number;
    d1: number;
    d2: number;
    uMin: number;
    uMax: number;
    intervalLength: number;
    intervalsCount: number;
  };
  intervals: FuzzyInterval[];
  flrList: FuzzyLogicalRelationship[];
  flrgTable: FuzzyLogicalRelationshipGroup[];
  fittedSeries: FTSFittedItem[];
  futureForecasts: FTSFutureForecastItem[];
  metrics: FTSMetrics;
}

/**
 * Menentukan jumlah interval optimal berdasarkan Sturges Rule atau kustom
 */
export function determineOptimalIntervalsCount(dataLength: number, customK?: number): number {
  if (customK && customK >= 3 && customK <= 25) {
    return Math.round(customK);
  }
  // Sturges Rule: k = 1 + 3.322 * log10(n), minimal 5, maksimal 12
  const kSturges = Math.round(1 + 3.322 * Math.log10(Math.max(5, dataLength)));
  return Math.max(5, Math.min(12, kSturges));
}

/**
 * Melakukan peramalan Fuzzy Time Series Chen secara lengkap
 */
export function computeChenFTS(
  data: FTSDataPoint[],
  options?: {
    intervalsCount?: number;
    futureSteps?: number;
    d1Margin?: number;
    d2Margin?: number;
  }
): FTSForecastResult {
  if (!data || data.length < 3) {
    throw new Error("Data deret waktu minimal harus memiliki 3 titik observasi untuk FTS.");
  }

  // 1. Ekstrak nilai aktual dan cari Dmin, Dmax
  const values = data.map((d) => d.actual);
  let dMin = values[0];
  let dMax = values[0];

  for (const v of values) {
    if (v < dMin) dMin = v;
    if (v > dMax) dMax = v;
  }

  const range = dMax - dMin;
  // Margin penyangga U: default 5% dari rentang data atau minimal 1.0 mm
  const defaultD1 = options?.d1Margin ?? Math.max(1.0, Number((range * 0.05).toFixed(1)));
  const defaultD2 = options?.d2Margin ?? Math.max(1.0, Number((range * 0.05).toFixed(1)));

  // Universe of Discourse U = [uMin, uMax]
  const uMin = Math.max(0, Number((dMin - defaultD1).toFixed(1))); // Curah hujan tidak boleh negatif
  const uMax = Number((dMax + defaultD2).toFixed(1));

  // 2. Partisi U menjadi k interval
  const k = determineOptimalIntervalsCount(data.length, options?.intervalsCount);
  const intervalLength = Number(((uMax - uMin) / k).toFixed(2));

  const intervals: FuzzyInterval[] = [];
  for (let i = 0; i < k; i++) {
    const lower = Number((uMin + i * intervalLength).toFixed(2));
    const upper = Number((i === k - 1 ? uMax : uMin + (i + 1) * intervalLength).toFixed(2));
    const midpoint = Number(((lower + upper) / 2).toFixed(2));
    const idx = i + 1;
    intervals.push({
      id: `u${idx}`,
      fuzzySet: `A${idx}`,
      lower,
      upper,
      midpoint,
    });
  }

  // 3. Fuzzifikasi: memetakan setiap observasi ke himpunan fuzzy
  function getFuzzySetForValue(val: number): FuzzyInterval {
    // Jika lebih kecil dari batas bawah, tetapkan ke interval pertama
    if (val <= intervals[0].lower) return intervals[0];
    // Jika lebih besar dari batas atas, tetapkan ke interval terakhir
    if (val >= intervals[intervals.length - 1].upper) {
      return intervals[intervals.length - 1];
    }

    for (let i = 0; i < intervals.length; i++) {
      const itv = intervals[i];
      if (val >= itv.lower && val < itv.upper) {
        return itv;
      }
    }
    return intervals[intervals.length - 1];
  }

  const fuzzyAssignments: { period: string; actual: number; fuzzyInterval: FuzzyInterval }[] =
    data.map((d) => ({
      period: d.period,
      actual: d.actual,
      fuzzyInterval: getFuzzySetForValue(d.actual),
    }));

  // 4. Membentuk Fuzzy Logical Relationships (FLR): A_i -> A_j
  const flrList: FuzzyLogicalRelationship[] = [];
  for (let t = 1; t < fuzzyAssignments.length; t++) {
    const fromSet = fuzzyAssignments[t - 1].fuzzyInterval.fuzzySet;
    const toSet = fuzzyAssignments[t].fuzzyInterval.fuzzySet;
    flrList.push({
      from: fromSet,
      to: toSet,
      timeIndex: t,
    });
  }

  // 5. Mengelompokkan FLR menjadi Fuzzy Logical Relationship Groups (FLRG)
  const flrgMap = new Map<string, Set<string>>();
  // Inisialisasi setiap himpunan fuzzy A_1..A_k
  intervals.forEach((itv) => flrgMap.set(itv.fuzzySet, new Set<string>()));

  flrList.forEach((flr) => {
    flrgMap.get(flr.from)?.add(flr.to);
  });

  const flrgTable: FuzzyLogicalRelationshipGroup[] = [];
  const intervalLookup = new Map<string, FuzzyInterval>();
  intervals.forEach((itv) => intervalLookup.set(itv.fuzzySet, itv));

  intervals.forEach((itv) => {
    const consequentsSet = flrgMap.get(itv.fuzzySet) || new Set<string>();
    const consequents = Array.from(consequentsSet).sort();
    const predictedMidpoints: number[] = [];

    let forecastVal = itv.midpoint; // Default jika sisi kanan kosong (Kasus 1 Chen)

    if (consequents.length > 0) {
      let sumMid = 0;
      consequents.forEach((cSet) => {
        const mid = intervalLookup.get(cSet)?.midpoint ?? itv.midpoint;
        predictedMidpoints.push(mid);
        sumMid += mid;
      });
      // Kasus 2 & 3 Chen: rata-rata nilai tengah sisi kanan
      forecastVal = Number((sumMid / consequents.length).toFixed(2));
    }

    flrgTable.push({
      antecedent: itv.fuzzySet,
      consequents,
      predictedMidpoints,
      forecastValue: forecastVal,
    });
  });

  const flrgLookup = new Map<string, FuzzyLogicalRelationshipGroup>();
  flrgTable.forEach((grp) => flrgLookup.set(grp.antecedent, grp));

  // 6. Defuzzifikasi & Evaluasi In-Sample Fitting
  const fittedSeries: FTSFittedItem[] = [];
  let sumSqErr = 0;
  let sumAbsPctErr = 0;
  let validErrCount = 0;
  let sumAbsErr = 0;

  for (let t = 0; t < fuzzyAssignments.length; t++) {
    const item = fuzzyAssignments[t];
    if (t === 0) {
      // Titik data pertama belum memiliki antecedent masa lalu
      fittedSeries.push({
        period: item.period,
        actual: item.actual,
        fuzzySet: item.fuzzyInterval.fuzzySet,
        previousFuzzySet: null,
        forecast: null,
        residual: null,
        percentageError: null,
      });
      continue;
    }

    const prevFuzzySet = fuzzyAssignments[t - 1].fuzzyInterval.fuzzySet;
    const flrg = flrgLookup.get(prevFuzzySet);
    const forecast = flrg ? flrg.forecastValue : item.fuzzyInterval.midpoint;

    const residual = Number((item.actual - forecast).toFixed(2));
    const absResidual = Math.abs(residual);

    sumSqErr += residual * residual;
    sumAbsErr += absResidual;

    // Evaluasi persentase error (hindari pembagian nol)
    let pctErr = 0;
    if (item.actual > 0) {
      pctErr = (absResidual / item.actual) * 100;
      sumAbsPctErr += pctErr;
    }

    validErrCount++;

    fittedSeries.push({
      period: item.period,
      actual: item.actual,
      fuzzySet: item.fuzzyInterval.fuzzySet,
      previousFuzzySet: prevFuzzySet,
      forecast,
      residual,
      percentageError: Number(pctErr.toFixed(2)),
    });
  }

  const rmse = validErrCount > 0 ? Number(Math.sqrt(sumSqErr / validErrCount).toFixed(2)) : 0;
  const mape = validErrCount > 0 ? Number((sumAbsPctErr / validErrCount).toFixed(2)) : 0;
  const mae = validErrCount > 0 ? Number((sumAbsErr / validErrCount).toFixed(2)) : 0;

  // 7. Peramalan Masa Depan (Multi-step Ahead)
  const futureSteps = Math.max(1, Math.min(12, options?.futureSteps ?? 3));
  const futureForecasts: FTSFutureForecastItem[] = [];

  let currentFuzzySet = fuzzyAssignments[fuzzyAssignments.length - 1].fuzzyInterval.fuzzySet;

  for (let step = 1; step <= futureSteps; step++) {
    const flrg = flrgLookup.get(currentFuzzySet);
    const predictedVal = flrg ? flrg.forecastValue : (intervalLookup.get(currentFuzzySet)?.midpoint ?? 0);
    const nextFuzzyItv = getFuzzySetForValue(predictedVal);

    futureForecasts.push({
      step,
      predictedValue: Number(predictedVal.toFixed(2)),
      fuzzySet: nextFuzzyItv.fuzzySet,
      basedOnFLRG: `${currentFuzzySet} -> [${flrg?.consequents.join(", ") || "-"}]`,
    });

    currentFuzzySet = nextFuzzyItv.fuzzySet;
  }

  return {
    universeOfDiscourse: {
      min: dMin,
      max: dMax,
      d1: defaultD1,
      d2: defaultD2,
      uMin,
      uMax,
      intervalLength,
      intervalsCount: k,
    },
    intervals,
    flrList,
    flrgTable,
    fittedSeries,
    futureForecasts,
    metrics: {
      mape,
      rmse,
      mae,
      sampleCount: validErrCount,
    },
  };
}
