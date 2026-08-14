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
