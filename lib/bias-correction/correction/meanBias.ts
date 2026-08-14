// lib/bias-correction/correction/meanBias.ts

export interface MeanBiasParams {
  bias: number; // mean(AWS - ERA5)
  sampleCount: number;
}

/**
 * Fits Mean Bias additive parameter from calibration pairs.
 */
export function fitMeanBias(calibrationPairs: { aws: number; era5: number }[]): MeanBiasParams {
  const valid = calibrationPairs.filter(
    p => p.aws !== null && p.era5 !== null && !isNaN(p.aws) && !isNaN(p.era5)
  );

  if (valid.length === 0) {
    return { bias: 0, sampleCount: 0 };
  }

  const sumDiff = valid.reduce((acc, p) => acc + (p.aws - p.era5), 0);
  const bias = sumDiff / valid.length;

  return {
    bias: Number(bias.toFixed(4)),
    sampleCount: valid.length,
  };
}

/**
 * Transforms ERA5 values using fitted additive bias: Corrected ERA5 = ERA5 + Bias
 */
export function transformMeanBias(
  era5Values: (number | null | undefined)[],
  params: MeanBiasParams
): (number | null)[] {
  return era5Values.map(v => {
    if (v === null || v === undefined || isNaN(v)) return null;
    return Number((v + params.bias).toFixed(3));
  });
}
