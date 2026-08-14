// lib/bias-correction/matching/temporalMatch.ts

import {
  AWSQCObservation,
  ERA5RawObservation,
  MatchedObservationPair,
  MeteorologicalVariable,
  QCFlag,
} from "../types";

export interface TemporalMatchOptions {
  method: "exact" | "nearest_window";
  toleranceMinutes: number; // e.g. 30 minutes
  calibrationFrom: string; // YYYY-MM-DD
  calibrationTo: string;
  validationFrom: string;
  validationTo: string;
}

/**
 * Extracts a specific meteorological variable from AWS QC and ERA5 observation objects.
 */
export function extractVariableValue(
  variable: MeteorologicalVariable,
  awsQC?: AWSQCObservation,
  era5?: ERA5RawObservation
): { awsValue: number | null; awsRaw: number | null; awsFlag: QCFlag; era5Value: number | null } {
  let awsValue: number | null = null;
  let awsRaw: number | null = null;
  let awsFlag: QCFlag = "MISSING";
  let era5Value: number | null = null;

  if (awsQC) {
    switch (variable) {
      case "air_temperature":
        awsValue = awsQC.temperature_qc ?? null;
        awsFlag = awsQC.temperature_flag;
        break;
      case "relative_humidity":
        awsValue = awsQC.humidity_qc ?? null;
        awsFlag = awsQC.humidity_flag;
        break;
      case "dew_point_temperature":
        awsValue = awsQC.dew_point_qc ?? null;
        awsFlag = awsQC.dew_point_flag;
        break;
      case "surface_pressure":
        awsValue = awsQC.pressure_qc ?? null;
        awsFlag = awsQC.pressure_flag;
        break;
      case "wind_speed":
        awsValue = awsQC.wind_speed_qc ?? null;
        awsFlag = awsQC.wind_speed_flag;
        break;
      case "wind_direction":
        awsValue = awsQC.wind_direction_qc ?? null;
        awsFlag = awsQC.wind_direction_flag;
        break;
      case "precipitation":
        awsValue = awsQC.precipitation_qc ?? null;
        awsFlag = awsQC.precipitation_flag;
        break;
    }
  }

  if (era5) {
    switch (variable) {
      case "air_temperature":
        era5Value = era5.temperature_era5 ?? era5.temperature ?? null;
        break;
      case "relative_humidity":
        era5Value = era5.humidity_era5 ?? era5.humidity ?? null;
        break;
      case "dew_point_temperature":
        era5Value = era5.dew_point_era5 ?? era5.dew ?? null;
        break;
      case "surface_pressure":
        era5Value = era5.pressure_era5 ?? era5.pressure ?? null;
        break;
      case "wind_speed":
        era5Value = era5.wind_speed_era5 ?? era5.wind_speed ?? null;
        break;
      case "wind_direction":
        era5Value = era5.wind_direction_era5 ?? era5.wind_direction ?? null;
        break;
      case "precipitation":
        era5Value = era5.precipitation_era5 ?? era5.precipitation ?? null;
        break;
    }
  }

  return { awsValue, awsRaw, awsFlag, era5Value };
}

/**
 * Matches AWS QC observations and ERA5 model points temporally.
 * Preserves timestamps strictly without silent shifting.
 */
export function matchAWSEra5Series(
  awsQCObservations: AWSQCObservation[],
  era5Observations: ERA5RawObservation[],
  variable: MeteorologicalVariable,
  options: TemporalMatchOptions
): MatchedObservationPair[] {
  const toleranceMs = options.toleranceMinutes * 60 * 1000;
  const era5Sorted = [...era5Observations].sort((a, b) => a.timestamp - b.timestamp);

  const matchedPairs: MatchedObservationPair[] = [];

  for (const aws of awsQCObservations) {
    const awsTs = aws.timestamp;
    const dateStr = new Date(awsTs).toISOString().substring(0, 10);

    // Find closest ERA5 observation within window
    let bestEra5: ERA5RawObservation | null = null;
    let minDelta = Infinity;

    for (const era of era5Sorted) {
      const delta = Math.abs(era.timestamp - awsTs);
      if (delta <= toleranceMs && delta < minDelta) {
        minDelta = delta;
        bestEra5 = era;
      } else if (era.timestamp - awsTs > toleranceMs) {
        break; // Passed window
      }
    }

    if (bestEra5) {
      const extracted = extractVariableValue(variable, aws, bestEra5);

      // Determine Train/Test split assignment
      let split: "calibration" | "validation" | "unassigned" = "unassigned";
      if (dateStr >= options.calibrationFrom && dateStr <= options.calibrationTo) {
        split = "calibration";
      } else if (dateStr >= options.validationFrom && dateStr <= options.validationTo) {
        split = "validation";
      }

      matchedPairs.push({
        timestamp: awsTs,
        dateStr,
        aws_value: extracted.awsValue,
        aws_raw: extracted.awsRaw,
        aws_flag: extracted.awsFlag,
        era5_value: extracted.era5Value,
        split,
      });
    }
  }

  return matchedPairs;
}
