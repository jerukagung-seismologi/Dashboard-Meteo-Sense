// lib/bias-correction/qc/spikeCheck.ts

import { QCFlag } from "../types";

export interface SpikeCheckResult {
  passed: boolean;
  flag: QCFlag;
  rateOfChange?: number;
  reason?: string;
}

/**
 * Checks for unnatural spikes or extreme step changes between consecutive readings.
 * @param currentValue Current observation value
 * @param previousValue Previous valid observation value
 * @param timeDeltaMinutes Time elapsed in minutes between readings
 * @param maxAllowedDelta Maximum allowed change across the time window
 */
export function checkRateOfChangeSpike(
  currentValue: number | null | undefined,
  previousValue: number | null | undefined,
  timeDeltaMinutes: number,
  maxAllowedDelta: number,
  variableName: string
): SpikeCheckResult {
  if (
    currentValue === null ||
    currentValue === undefined ||
    isNaN(currentValue) ||
    previousValue === null ||
    previousValue === undefined ||
    isNaN(previousValue)
  ) {
    return { passed: true, flag: "GOOD" }; // Cannot perform delta check if either is missing
  }

  if (timeDeltaMinutes <= 0 || timeDeltaMinutes > 120) {
    // If gap is too large (> 2 hours), do not flag as spike
    return { passed: true, flag: "GOOD" };
  }

  const delta = Math.abs(currentValue - previousValue);
  // Scale threshold based on time step (e.g. baseline 10 min window)
  const normalizedMax = maxAllowedDelta * Math.max(1, timeDeltaMinutes / 10);

  if (delta > normalizedMax) {
    return {
      passed: false,
      flag: "SUSPECT",
      rateOfChange: delta,
      reason: `Lonjakan drastis pada ${variableName}: perubahan |Δ|=${delta.toFixed(
        2
      )} melebihi batas wajar (${normalizedMax.toFixed(2)}) dalam ${timeDeltaMinutes.toFixed(0)} menit.`,
    };
  }

  return {
    passed: true,
    flag: "GOOD",
    rateOfChange: delta,
  };
}
