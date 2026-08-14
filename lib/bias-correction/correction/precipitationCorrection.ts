// lib/bias-correction/correction/precipitationCorrection.ts

import { QuantileMappingParams, fitQuantileMapping, transformQuantileMapping } from "./quantileMapping";

export interface ZeroAwarePrecipitationParams {
  wetDayThresholdMm: number; // e.g. 0.1 mm
  awsWetFraction: number;
  era5WetFraction: number;
  dryThresholdP0: number;
  wetDayEQMParams: QuantileMappingParams;
  sampleCount: number;
}

/**
 * Fits Zero-Aware Precipitation Bias Correction parameters.
 * Separates zero-rainfall occurrences and applies distribution mapping exclusively to wet events.
 */
export function fitZeroAwarePrecipitation(
  calibrationPairs: { aws: number; era5: number }[],
  wetDayThresholdMm: number = 0.1
): ZeroAwarePrecipitationParams {
  const valid = calibrationPairs.filter(
    p =>
      p.aws !== null &&
      p.era5 !== null &&
      !isNaN(p.aws) &&
      !isNaN(p.era5) &&
      p.aws >= 0 &&
      p.era5 >= 0
  );

  const n = valid.length;
  if (n === 0) {
    return {
      wetDayThresholdMm,
      awsWetFraction: 0,
      era5WetFraction: 0,
      dryThresholdP0: 0,
      wetDayEQMParams: fitQuantileMapping([], 50),
      sampleCount: 0,
    };
  }

  const awsWet = valid.filter(p => p.aws >= wetDayThresholdMm);
  const era5Wet = valid.filter(p => p.era5 >= wetDayThresholdMm);

  const awsWetFraction = awsWet.length / n;
  const era5WetFraction = era5Wet.length / n;

  // Fit EQM on wet days only
  const wetPairs = valid
    .filter(p => p.aws >= wetDayThresholdMm && p.era5 >= wetDayThresholdMm)
    .map(p => ({ aws: p.aws, era5: p.era5 }));

  // If paired wet days are too sparse, fallback to marginal wet-day distributions
  const wetDayPairsForEQM =
    wetPairs.length >= 5
      ? wetPairs
      : awsWet.map((w, idx) => ({
          aws: w.aws,
          era5: era5Wet[idx % Math.max(1, era5Wet.length)]?.era5 ?? w.aws,
        }));

  const wetDayEQMParams = fitQuantileMapping(wetDayPairsForEQM, 50);

  return {
    wetDayThresholdMm,
    awsWetFraction: Number(awsWetFraction.toFixed(4)),
    era5WetFraction: Number(era5WetFraction.toFixed(4)),
    dryThresholdP0: Number((1 - awsWetFraction).toFixed(4)),
    wetDayEQMParams,
    sampleCount: n,
  };
}

/**
 * Transforms ERA5 precipitation values:
 * 1. Preserves dry days strictly (rain = 0).
 * 2. Applies wet-day EQM to precipitation events.
 * 3. Enforces physical non-negativity constraint.
 */
export function transformZeroAwarePrecipitation(
  era5Values: (number | null | undefined)[],
  params: ZeroAwarePrecipitationParams
): (number | null)[] {
  const { wetDayThresholdMm, wetDayEQMParams } = params;

  return era5Values.map(v => {
    if (v === null || v === undefined || isNaN(v)) return null;

    // Zero-aware dry event handling
    if (v < wetDayThresholdMm) {
      return 0;
    }

    // Apply wet-day transfer function
    const correctedWet = transformQuantileMapping([v], wetDayEQMParams)[0];
    if (correctedWet === null) return 0;

    return Number(Math.max(0, correctedWet).toFixed(2));
  });
}
