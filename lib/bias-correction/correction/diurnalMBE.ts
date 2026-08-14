// lib/bias-correction/correction/diurnalMBE.ts

export interface DiurnalMBEParams {
  hourlyMBE: Record<number, number>; // Hour (0-23) -> MBE in physical units
  hourlySampleCount: Record<number, number>;
  overallMBE: number;
  sampleCount: number;
}

/**
 * Fits 24-Hour Diurnal Hourly Mean Bias Error parameters from calibration pairs.
 * Sign convention: MBE = mean(AWS - ERA5)
 */
export function fitDiurnalMBE(
  calibrationPairs: { timestamp: number; aws: number; era5: number }[]
): DiurnalMBEParams {
  const valid = calibrationPairs.filter(
    p =>
      p.aws !== null &&
      p.era5 !== null &&
      !isNaN(p.aws) &&
      !isNaN(p.era5) &&
      p.timestamp != null
  );

  const hourlyDiffs: Record<number, number[]> = {};
  for (let h = 0; h < 24; h++) {
    hourlyDiffs[h] = [];
  }

  let totalDiff = 0;

  valid.forEach(p => {
    // Determine local hour (Asia/Jakarta UTC+7)
    const d = new Date(p.timestamp);
    const hour = (d.getUTCHours() + 7) % 24;
    const diff = p.aws - p.era5;
    hourlyDiffs[hour].push(diff);
    totalDiff += diff;
  });

  const overallMBE = valid.length > 0 ? totalDiff / valid.length : 0;

  const hourlyMBE: Record<number, number> = {};
  const hourlySampleCount: Record<number, number> = {};

  for (let h = 0; h < 24; h++) {
    const diffs = hourlyDiffs[h];
    hourlySampleCount[h] = diffs.length;
    if (diffs.length > 0) {
      const mean = diffs.reduce((a, b) => a + b, 0) / diffs.length;
      hourlyMBE[h] = Number(mean.toFixed(3));
    } else {
      hourlyMBE[h] = Number(overallMBE.toFixed(3)); // Fallback to overall mean bias
    }
  }

  return {
    hourlyMBE,
    hourlySampleCount,
    overallMBE: Number(overallMBE.toFixed(3)),
    sampleCount: valid.length,
  };
}

/**
 * Transforms ERA5 values using fitted Diurnal Hourly MBE transfer function.
 * Corrected = ERA5(t) + MBE_hour(t)
 */
export function transformDiurnalMBE(
  era5Items: { timestamp: number; value: number | null | undefined }[],
  params: DiurnalMBEParams
): (number | null)[] {
  return era5Items.map(item => {
    if (item.value === null || item.value === undefined || isNaN(item.value)) {
      return null;
    }

    const d = new Date(item.timestamp);
    const hour = (d.getUTCHours() + 7) % 24;
    const mbe = params.hourlyMBE[hour] ?? params.overallMBE;

    return Number((item.value + mbe).toFixed(3));
  });
}
