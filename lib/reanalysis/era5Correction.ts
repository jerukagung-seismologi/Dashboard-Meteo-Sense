// lib/reanalysis/era5Correction.ts
import { WeatherRecord } from "@/lib/weatherUtils";

export interface BiasMetric {
  mbe: number;             // Mean Bias Error (AWS - ERA5/IFS)
  mae: number;             // Mean Absolute Error
  rmse: number;            // Root Mean Square Error
  pearsonR: number;        // Pearson Correlation Coefficient (r)
  rSquared: number;        // Coefficient of Determination (R²)
  stdDevResidual: number;  // Standard Deviation of Residuals (σ)
  awsMean: number;
  awsMin: number;
  awsMax: number;
  era5Mean: number;
  era5Min: number;
  era5Max: number;
  p10: number;             // 10th Percentile
  p50: number;             // 50th Percentile (Median)
  p90: number;             // 90th Percentile
  count: number;
  suggestedOffset: number; // Recommended offset = -MBE
  outliers: { date: string; awsVal: number; era5Val: number; diff: number }[];
}

export interface Era5CorrectionMetrics {
  temperature: BiasMetric;
  humidity: BiasMetric;
  pressure: BiasMetric;
  hasEra5Data: boolean;
}

export interface Era5DailyComparisonPoint {
  date: string; // YYYY-MM-DD
  // AWS Observed
  awsTempAvg?: number | null;
  awsTempMin?: number | null;
  awsTempMax?: number | null;
  awsHumAvg?: number | null;
  awsPressAvg?: number | null;
  awsRainTot?: number | null;
  // ERA5 / ECMWF IFS Reanalysis
  era5TempAvg?: number | null;
  era5TempMin?: number | null;
  era5TempMax?: number | null;
  era5HumAvg?: number | null;
  era5PressAvg?: number | null;
  era5RainTot?: number | null;
  // Corrected AWS
  correctedTempAvg?: number | null;
  correctedHumAvg?: number | null;
  correctedPressAvg?: number | null;
}

export interface CorrectionOffsets {
  tempOffset: number;    // e.g. -0.8 °C
  humOffset: number;     // e.g. +2.0 %
  pressOffset: number;   // e.g. -1.2 hPa
  enabled: boolean;
}

/**
 * Calculate statistical bias metrics between AWS observed and ERA5/IFS model
 */
export function calculateVariableBias(
  pairs: { date: string; aws: number; era5: number }[],
  outlierThreshold: number
): BiasMetric {
  const valid = pairs.filter(
    (p) =>
      typeof p.aws === "number" &&
      !isNaN(p.aws) &&
      typeof p.era5 === "number" &&
      !isNaN(p.era5)
  );

  if (valid.length === 0) {
    return {
      mbe: 0,
      mae: 0,
      rmse: 0,
      pearsonR: 1,
      rSquared: 1,
      stdDevResidual: 0,
      awsMean: 0,
      awsMin: 0,
      awsMax: 0,
      era5Mean: 0,
      era5Min: 0,
      era5Max: 0,
      p10: 0,
      p50: 0,
      p90: 0,
      count: 0,
      suggestedOffset: 0,
      outliers: [],
    };
  }

  const n = valid.length;
  let sumDiff = 0;
  let sumAbsDiff = 0;
  let sumSqDiff = 0;
  let sumAws = 0;
  let sumEra5 = 0;
  let sumAwsEra5 = 0;
  let sumAwsSq = 0;
  let sumEra5Sq = 0;
  const awsValues: number[] = [];
  const era5Values: number[] = [];
  const diffValues: number[] = [];
  const outliers: { date: string; awsVal: number; era5Val: number; diff: number }[] = [];

  valid.forEach((p) => {
    const diff = p.aws - p.era5;
    sumDiff += diff;
    sumAbsDiff += Math.abs(diff);
    sumSqDiff += diff * diff;
    diffValues.push(diff);

    sumAws += p.aws;
    sumEra5 += p.era5;
    sumAwsEra5 += p.aws * p.era5;
    sumAwsSq += p.aws * p.aws;
    sumEra5Sq += p.era5 * p.era5;

    awsValues.push(p.aws);
    era5Values.push(p.era5);

    if (Math.abs(diff) >= outlierThreshold) {
      outliers.push({
        date: p.date,
        awsVal: Number(p.aws.toFixed(2)),
        era5Val: Number(p.era5.toFixed(2)),
        diff: Number(diff.toFixed(2)),
      });
    }
  });

  const mbe = sumDiff / n;
  const mae = sumAbsDiff / n;
  const rmse = Math.sqrt(sumSqDiff / n);

  // Standard Deviation of Residuals
  const varianceRes = diffValues.reduce((acc, d) => acc + Math.pow(d - mbe, 2), 0) / (n > 1 ? n - 1 : 1);
  const stdDevResidual = Math.sqrt(varianceRes);

  // Pearson Correlation Coefficient & R²
  const numerator = n * sumAwsEra5 - sumAws * sumEra5;
  const denominator = Math.sqrt(
    (n * sumAwsSq - sumAws * sumAws) * (n * sumEra5Sq - sumEra5 * sumEra5)
  );
  const pearsonR = denominator !== 0 ? Math.max(-1, Math.min(1, numerator / denominator)) : 1;
  const rSquared = Math.max(0, Math.min(1, Math.pow(pearsonR, 2)));

  // Percentiles for AWS Values
  awsValues.sort((a, b) => a - b);
  const getPercentile = (arr: number[], p: number) => {
    const idx = (p / 100) * (arr.length - 1);
    const low = Math.floor(idx);
    const high = Math.ceil(idx);
    const weight = idx - low;
    return Number((arr[low] * (1 - weight) + arr[high] * weight).toFixed(2));
  };

  const p10 = getPercentile(awsValues, 10);
  const p50 = getPercentile(awsValues, 50);
  const p90 = getPercentile(awsValues, 90);

  const awsMin = Math.min(...awsValues);
  const awsMax = Math.max(...awsValues);
  const awsMean = sumAws / n;

  const era5Min = Math.min(...era5Values);
  const era5Max = Math.max(...era5Values);
  const era5Mean = sumEra5 / n;

  // Suggested offset cancels the MBE
  const suggestedOffset = Number((-mbe).toFixed(2));

  return {
    mbe: Number(mbe.toFixed(2)),
    mae: Number(mae.toFixed(2)),
    rmse: Number(rmse.toFixed(2)),
    pearsonR: Number(pearsonR.toFixed(3)),
    rSquared: Number(rSquared.toFixed(3)),
    stdDevResidual: Number(stdDevResidual.toFixed(2)),
    awsMean: Number(awsMean.toFixed(2)),
    awsMin: Number(awsMin.toFixed(2)),
    awsMax: Number(awsMax.toFixed(2)),
    era5Mean: Number(era5Mean.toFixed(2)),
    era5Min: Number(era5Min.toFixed(2)),
    era5Max: Number(era5Max.toFixed(2)),
    p10,
    p50,
    p90,
    count: n,
    suggestedOffset,
    outliers,
  };
}

/**
 * Apply calibration / correction offsets to WeatherRecord array
 */
export function applyCorrectionToDailyRecords(
  records: WeatherRecord[],
  offsets: CorrectionOffsets
): WeatherRecord[] {
  if (!offsets.enabled) return records;

  return records.map((r) => {
    const copy = { ...r };

    if (offsets.tempOffset !== 0) {
      if (copy.temperatureAvg !== undefined && copy.temperatureAvg !== null) {
        copy.temperatureAvg = Number((copy.temperatureAvg + offsets.tempOffset).toFixed(2));
      }
      if (copy.temperatureMin !== undefined && copy.temperatureMin !== null) {
        copy.temperatureMin = Number((copy.temperatureMin + offsets.tempOffset).toFixed(2));
      }
      if (copy.temperatureMax !== undefined && copy.temperatureMax !== null) {
        copy.temperatureMax = Number((copy.temperatureMax + offsets.tempOffset).toFixed(2));
      }
    }

    if (offsets.humOffset !== 0) {
      if (copy.humidityAvg !== undefined && copy.humidityAvg !== null) {
        copy.humidityAvg = Math.min(100, Math.max(0, Number((copy.humidityAvg + offsets.humOffset).toFixed(1))));
      }
      if (copy.humidityMin !== undefined && copy.humidityMin !== null) {
        copy.humidityMin = Math.min(100, Math.max(0, Number((copy.humidityMin + offsets.humOffset).toFixed(1))));
      }
      if (copy.humidityMax !== undefined && copy.humidityMax !== null) {
        copy.humidityMax = Math.min(100, Math.max(0, Number((copy.humidityMax + offsets.humOffset).toFixed(1))));
      }
    }

    if (offsets.pressOffset !== 0) {
      if (copy.pressureAvg !== undefined && copy.pressureAvg !== null) {
        copy.pressureAvg = Number((copy.pressureAvg + offsets.pressOffset).toFixed(2));
      }
      if (copy.pressureMin !== undefined && copy.pressureMin !== null) {
        copy.pressureMin = Number((copy.pressureMin + offsets.pressOffset).toFixed(2));
      }
      if (copy.pressureMax !== undefined && copy.pressureMax !== null) {
        copy.pressureMax = Number((copy.pressureMax + offsets.pressOffset).toFixed(2));
      }
    }

    return copy;
  });
}

/**
 * Extract daily WeatherRecord objects from ERA5 / ECMWF IFS response
 */
export function extractEra5DailyRecords(era5Data: any): Map<string, WeatherRecord> {
  const result = new Map<string, WeatherRecord>();
  if (!era5Data) return result;

  const sourceName = era5Data.sourceModel || "ECMWF ERA5-Land (9 km)";

  // If hourly time-series is available, calculate exact daily aggregates (min, max, mean, sum)
  const hourly = era5Data.hourly;
  if (hourly && Array.isArray(hourly.times || hourly.time)) {
    const times: string[] = hourly.times || hourly.time;
    const temps: number[] = hourly.temperature || [];
    const hums: number[] = hourly.humidity || [];
    const presses: number[] = hourly.pressure || hourly.surfacePressure || [];
    const dews: number[] = hourly.dewPoint || [];
    const rains: number[] = hourly.rain || [];
    const windSpeeds: number[] = hourly.windSpeed || [];
    const windGusts: number[] = hourly.windGust || [];

    // Group by YYYY-MM-DD
    const byDay = new Map<string, {
      temps: number[];
      hums: number[];
      presses: number[];
      dews: number[];
      rains: number[];
      winds: number[];
      gusts: number[];
    }>();

    for (let i = 0; i < times.length; i++) {
      const tStr = times[i];
      if (!tStr) continue;
      const dayKey = tStr.slice(0, 10); // YYYY-MM-DD

      if (!byDay.has(dayKey)) {
        byDay.set(dayKey, {
          temps: [],
          hums: [],
          presses: [],
          dews: [],
          rains: [],
          winds: [],
          gusts: [],
        });
      }
      const day = byDay.get(dayKey)!;
      if (typeof temps[i] === "number" && !isNaN(temps[i])) day.temps.push(temps[i]);
      if (typeof hums[i] === "number" && !isNaN(hums[i])) day.hums.push(hums[i]);
      if (typeof presses[i] === "number" && !isNaN(presses[i])) day.presses.push(presses[i]);
      if (typeof dews[i] === "number" && !isNaN(dews[i])) day.dews.push(dews[i]);
      if (typeof rains[i] === "number" && !isNaN(rains[i])) day.rains.push(rains[i]);
      if (typeof windSpeeds[i] === "number" && !isNaN(windSpeeds[i])) day.winds.push(windSpeeds[i]);
      if (typeof windGusts[i] === "number" && !isNaN(windGusts[i])) day.gusts.push(windGusts[i]);
    }

    const avg = (arr: number[]) => (arr.length > 0 ? arr.reduce((a, b) => a + b, 0) / arr.length : 0);
    const min = (arr: number[]) => (arr.length > 0 ? Math.min(...arr) : 0);
    const max = (arr: number[]) => (arr.length > 0 ? Math.max(...arr) : 0);
    const sum = (arr: number[]) => arr.reduce((a, b) => a + b, 0);

    byDay.forEach((g, dayKey) => {
      result.set(dayKey, {
        date: dayKey,
        sampleCount: g.temps.length || 24,
        temperatureAvg: Number(avg(g.temps).toFixed(2)),
        temperatureMin: Number(min(g.temps).toFixed(2)),
        temperatureMax: Number(max(g.temps).toFixed(2)),
        humidityAvg: Number(avg(g.hums).toFixed(1)),
        humidityMin: Number(min(g.hums).toFixed(1)),
        humidityMax: Number(max(g.hums).toFixed(1)),
        pressureAvg: Number(avg(g.presses).toFixed(2)),
        pressureMin: Number(min(g.presses).toFixed(2)),
        pressureMax: Number(max(g.presses).toFixed(2)),
        dewPointAvg: Number(avg(g.dews).toFixed(2)),
        windSpeedAvg: Number(avg(g.winds).toFixed(2)),
        windSpeedMax: Number(max(g.gusts.length > 0 ? g.gusts : g.winds).toFixed(2)),
        rainfallTot: Number(sum(g.rains).toFixed(2)),
        isImputed: true,
        imputedSource: sourceName,
      });
    });

    if (result.size > 0) return result;
  }

  // Fallback: if only annual days summary is available
  if (era5Data.annual && Array.isArray(era5Data.annual.days)) {
    const days: string[] = era5Data.annual.days;
    const tMeans: number[] = era5Data.annual.temperatureMean || [];
    const hMeans: number[] = era5Data.annual.humidityMean || [];
    const pMeans: number[] = era5Data.annual.pressureMean || [];

    days.forEach((d, idx) => {
      const t = tMeans[idx] ?? 27.0;
      result.set(d, {
        date: d,
        sampleCount: 24,
        temperatureAvg: t,
        temperatureMin: Number((t - 3).toFixed(2)),
        temperatureMax: Number((t + 4).toFixed(2)),
        humidityAvg: hMeans[idx] ?? 80,
        humidityMin: Math.max(40, (hMeans[idx] ?? 80) - 15),
        humidityMax: Math.min(100, (hMeans[idx] ?? 80) + 15),
        pressureAvg: pMeans[idx] ?? 1010,
        pressureMin: (pMeans[idx] ?? 1010) - 2,
        pressureMax: (pMeans[idx] ?? 1010) + 2,
        dewPointAvg: Number((t - ((100 - (hMeans[idx] ?? 80)) / 5)).toFixed(2)),
        windSpeedAvg: 2.0,
        rainfallTot: 0,
        isImputed: true,
        imputedSource: sourceName,
      });
    });
  }

  return result;
}

export interface MonthlyImputationSummary {
  totalDays: number;
  observedDays: number;
  imputedDays: number;
  missingDays: number;
  imputedDates: string[];
  completenessRawPercent: number;
  completenessFinalPercent: number;
  sourceModel: string;
}

/**
 * Impute missing dates or low-sample days in a monthly weather record series using ERA5 reanalysis
 */
export function imputeMonthlyWeatherRecords(
  awsRecords: WeatherRecord[],
  era5Data: any | null,
  year: number,
  month: number, // 1 - 12
  enabled: boolean = true,
  offsets?: CorrectionOffsets,
  minSampleCount: number = 6
): { records: WeatherRecord[]; summary: MonthlyImputationSummary } {
  // Generate all calendar dates in month: year-month-01 to year-month-lastDay
  const daysInMonth = new Date(year, month, 0).getDate();
  const monthStr = String(month).padStart(2, "0");
  const expectedDates: string[] = [];
  for (let d = 1; d <= daysInMonth; d++) {
    expectedDates.push(`${year}-${monthStr}-${String(d).padStart(2, "0")}`);
  }

  const awsMap = new Map<string, WeatherRecord>();
  awsRecords.forEach((r) => {
    if (r.date) awsMap.set(r.date, r);
  });

  const era5Map = extractEra5DailyRecords(era5Data);
  const sourceModel = era5Data?.sourceModel || "ECMWF ERA5-Land (9 km)";

  const mergedRecords: WeatherRecord[] = [];
  let observedDays = 0;
  let imputedDays = 0;
  let missingDays = 0;
  const imputedDates: string[] = [];

  for (const dateStr of expectedDates) {
    const awsRec = awsMap.get(dateStr);
    const hasAdequateAws = awsRec && awsRec.sampleCount >= minSampleCount;

    if (hasAdequateAws) {
      // Use AWS observed data
      observedDays++;
      mergedRecords.push({
        ...awsRec,
        isImputed: false,
      });
    } else if (enabled && era5Map.has(dateStr)) {
      // Impute using ERA5
      imputedDays++;
      imputedDates.push(dateStr);
      const era5Rec = era5Map.get(dateStr)!;

      // Create imputed record
      const imputedRec: WeatherRecord = {
        ...era5Rec,
        isImputed: true,
        imputedSource: sourceModel,
      };

      // If offsets are provided and enabled, apply them to the imputed record
      if (offsets && offsets.enabled) {
        if (offsets.tempOffset !== 0) {
          imputedRec.temperatureAvg = Number((imputedRec.temperatureAvg + offsets.tempOffset).toFixed(2));
          imputedRec.temperatureMin = Number((imputedRec.temperatureMin + offsets.tempOffset).toFixed(2));
          imputedRec.temperatureMax = Number((imputedRec.temperatureMax + offsets.tempOffset).toFixed(2));
        }
        if (offsets.humOffset !== 0) {
          imputedRec.humidityAvg = Math.min(100, Math.max(0, Number((imputedRec.humidityAvg + offsets.humOffset).toFixed(1))));
          imputedRec.humidityMin = Math.min(100, Math.max(0, Number((imputedRec.humidityMin + offsets.humOffset).toFixed(1))));
          imputedRec.humidityMax = Math.min(100, Math.max(0, Number((imputedRec.humidityMax + offsets.humOffset).toFixed(1))));
        }
        if (offsets.pressOffset !== 0) {
          imputedRec.pressureAvg = Number((imputedRec.pressureAvg + offsets.pressOffset).toFixed(2));
          imputedRec.pressureMin = Number((imputedRec.pressureMin + offsets.pressOffset).toFixed(2));
          imputedRec.pressureMax = Number((imputedRec.pressureMax + offsets.pressOffset).toFixed(2));
        }
      }

      mergedRecords.push(imputedRec);
    } else if (awsRec) {
      // Partial AWS record, but imputation disabled or ERA5 not available
      observedDays++;
      mergedRecords.push({
        ...awsRec,
        isImputed: false,
      });
    } else {
      // Missing completely
      missingDays++;
    }
  }

  mergedRecords.sort((a, b) => a.date.localeCompare(b.date));

  const completenessRawPercent = Number(((observedDays / daysInMonth) * 100).toFixed(1));
  const completenessFinalPercent = Number((((observedDays + imputedDays) / daysInMonth) * 100).toFixed(1));

  return {
    records: mergedRecords,
    summary: {
      totalDays: daysInMonth,
      observedDays,
      imputedDays,
      missingDays,
      imputedDates,
      completenessRawPercent,
      completenessFinalPercent,
      sourceModel,
    },
  };
}
