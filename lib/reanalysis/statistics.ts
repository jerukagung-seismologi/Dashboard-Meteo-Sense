// lib/reanalysis/statistics.ts

export interface ParameterStats {
  min: number;
  mean: number;
  max: number;
  median: number;
  mode: number;
  variance: number;
  stdDev: number;
  skewness: number;
  kurtosis: number;
}

export function calculateStats(values: number[]): ParameterStats {
  const valid = values.filter((v) => Number.isFinite(v));
  if (valid.length === 0) {
    return { min: 0, mean: 0, max: 0, median: 0, mode: 0, variance: 0, stdDev: 0, skewness: 0, kurtosis: 0 };
  }

  valid.sort((a, b) => a - b);
  const len = valid.length;
  const min = valid[0];
  const max = valid[len - 1];

  // Mean
  const sum = valid.reduce((acc, v) => acc + v, 0);
  const mean = sum / len;

  // Median
  let median = 0;
  const mid = Math.floor(len / 2);
  if (len % 2 === 0) {
    median = (valid[mid - 1] + valid[mid]) / 2;
  } else {
    median = valid[mid];
  }

  // Mode (binning by 1 decimal place)
  const frequencyMap: Record<string, number> = {};
  let maxFreq = 0;
  let mode = valid[0];
  for (const v of valid) {
    const key = v.toFixed(1);
    frequencyMap[key] = (frequencyMap[key] || 0) + 1;
    if (frequencyMap[key] > maxFreq) {
      maxFreq = frequencyMap[key];
      mode = Number(key);
    }
  }

  // Variance & Standard Deviation
  const sqDiffSum = valid.reduce((acc, v) => acc + Math.pow(v - mean, 2), 0);
  const variance = sqDiffSum / len;
  const stdDev = Math.sqrt(variance);

  // Skewness and Kurtosis
  let skewness = 0;
  let kurtosis = 0;
  if (stdDev > 0) {
    const cubeDiffSum = valid.reduce((acc, v) => acc + Math.pow(v - mean, 3), 0);
    const fourthDiffSum = valid.reduce((acc, v) => acc + Math.pow(v - mean, 4), 0);

    skewness = (cubeDiffSum / len) / Math.pow(stdDev, 3);
    kurtosis = ((fourthDiffSum / len) / Math.pow(stdDev, 4)) - 3; // Excess Kurtosis
  }

  // Rounding for UI display consistency
  const round = (val: number, decimals: number = 2) => {
    if (!Number.isFinite(val)) return 0;
    const factor = Math.pow(10, decimals);
    return Math.round(val * factor) / factor;
  };

  return {
    min: round(min),
    mean: round(mean),
    max: round(max),
    median: round(median),
    mode: round(mode),
    variance: round(variance),
    stdDev: round(stdDev),
    skewness: round(skewness),
    kurtosis: round(kurtosis),
  };
}
