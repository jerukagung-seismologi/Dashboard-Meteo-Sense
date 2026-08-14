// lib/bias-correction/qc/consistencyCheck.ts

import { QCFlag } from "../types";

export interface ConsistencyCheckResult {
  passed: boolean;
  flag: QCFlag;
  reason?: string;
}

/**
 * Checks thermodynamic consistency between Air Temperature and Dew Point.
 * Dew point temperature can physically never exceed dry-bulb air temperature (with a slight measurement tolerance).
 */
export function checkThermodynamicConsistency(
  airTemperature: number | null | undefined,
  dewPoint: number | null | undefined,
  toleranceDegC: number = 0.2
): ConsistencyCheckResult {
  if (
    airTemperature === null ||
    airTemperature === undefined ||
    isNaN(airTemperature) ||
    dewPoint === null ||
    dewPoint === undefined ||
    isNaN(dewPoint)
  ) {
    return { passed: true, flag: "GOOD" };
  }

  // Dew point exceeds air temperature beyond instrumental tolerance
  if (dewPoint > airTemperature + toleranceDegC) {
    const diff = (dewPoint - airTemperature).toFixed(2);
    return {
      passed: false,
      flag: "SUSPECT",
      reason: `Inkonsistensi termodinamika: Titik embun (${dewPoint.toFixed(
        1
      )}°C) lebih tinggi +${diff}°C dari suhu udara (${airTemperature.toFixed(
        1
      )}°C).`,
    };
  }

  return {
    passed: true,
    flag: "GOOD",
  };
}
