// lib/bias-correction/correction/windCorrection.ts

import { QuantileMappingParams, fitQuantileMapping, transformQuantileMapping } from "./quantileMapping";
import { normalizeAngle360, circularAngularDifference } from "../statistics/circularStatistics";

export interface WindSpeedCorrectionParams {
  eqmParams: QuantileMappingParams;
  minSpeed: number; // 0 m/s
  sampleCount: number;
}

export interface WindDirectionEvaluationParams {
  circularMeanBiasDeg: number;
  sampleCount: number;
}

/**
 * Fits positive-bounded EQM for wind speed.
 */
export function fitWindSpeedCorrection(
  calibrationPairs: { aws: number; era5: number }[]
): WindSpeedCorrectionParams {
  const valid = calibrationPairs.filter(
    p => p.aws !== null && p.era5 !== null && !isNaN(p.aws) && !isNaN(p.era5) && p.aws >= 0 && p.era5 >= 0
  );

  const eqmParams = fitQuantileMapping(valid, 50);

  return {
    eqmParams,
    minSpeed: 0,
    sampleCount: valid.length,
  };
}

/**
 * Transforms wind speed ensuring strict non-negativity constraint.
 */
export function transformWindSpeedCorrection(
  era5Values: (number | null | undefined)[],
  params: WindSpeedCorrectionParams
): (number | null)[] {
  const rawCorrected = transformQuantileMapping(era5Values, params.eqmParams);
  return rawCorrected.map(v => {
    if (v === null || v === undefined || isNaN(v)) return null;
    return Number(Math.max(0, v).toFixed(2));
  });
}

/**
 * Evaluates wind direction bias without unphysical scalar distortion.
 */
export function fitWindDirectionEvaluation(
  calibrationPairs: { aws: number; era5: number }[]
): WindDirectionEvaluationParams {
  const valid = calibrationPairs.filter(
    p => p.aws !== null && p.era5 !== null && !isNaN(p.aws) && !isNaN(p.era5)
  );

  let sumSin = 0;
  let sumCos = 0;

  for (const p of valid) {
    const diff = circularAngularDifference(p.aws, p.era5);
    const rad = (diff * Math.PI) / 180;
    sumSin += Math.sin(rad);
    sumCos += Math.cos(rad);
  }

  const meanBiasRad = Math.atan2(sumSin / Math.max(1, valid.length), sumCos / Math.max(1, valid.length));
  const circularMeanBiasDeg = (meanBiasRad * 180) / Math.PI;

  return {
    circularMeanBiasDeg: Number(circularMeanBiasDeg.toFixed(1)),
    sampleCount: valid.length,
  };
}

/**
 * Applies circular angle offset to wind direction.
 */
export function transformWindDirectionOffset(
  era5Values: (number | null | undefined)[],
  params: WindDirectionEvaluationParams
): (number | null)[] {
  return era5Values.map(v => {
    if (v === null || v === undefined || isNaN(v)) return null;
    return Number(normalizeAngle360(v + params.circularMeanBiasDeg).toFixed(1));
  });
}
