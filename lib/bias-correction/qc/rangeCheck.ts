// lib/bias-correction/qc/rangeCheck.ts

import { QCFlag } from "../types";

export interface RangeCheckResult {
  passed: boolean;
  flag: QCFlag;
  reason?: string;
}

/**
 * Validates whether an observation falls strictly within plausible physical ranges.
 */
export function checkPhysicalRange(
  value: number | null | undefined,
  min: number,
  max: number,
  variableName: string
): RangeCheckResult {
  if (value === null || value === undefined || isNaN(value)) {
    return {
      passed: false,
      flag: "MISSING",
      reason: `${variableName} bernilai kosong (missing).`,
    };
  }

  if (value < min || value > max) {
    return {
      passed: false,
      flag: "INVALID",
      reason: `${variableName} (${value}) berada di luar batas fisik yang diizinkan [${min} s/d ${max}].`,
    };
  }

  return {
    passed: true,
    flag: "GOOD",
  };
}
