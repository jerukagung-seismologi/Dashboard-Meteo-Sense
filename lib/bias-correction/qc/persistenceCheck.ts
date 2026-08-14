// lib/bias-correction/qc/persistenceCheck.ts

import { QCFlag } from "../types";

export interface PersistenceCheckResult {
  passed: boolean;
  flag: QCFlag;
  repeatedCount: number;
  reason?: string;
}

/**
 * Checks if a sensor has produced invariant/identical values over an unnatural sequence of intervals.
 */
export function checkSensorPersistence(
  recentValues: (number | null | undefined)[],
  maxAllowedPersistence: number,
  variableName: string,
  tolerance: number = 0.0001
): PersistenceCheckResult {
  const validValues = recentValues.filter(
    (v): v is number => v !== null && v !== undefined && !isNaN(v)
  );

  if (validValues.length < maxAllowedPersistence) {
    return { passed: true, flag: "GOOD", repeatedCount: validValues.length };
  }

  const lastValue = validValues[validValues.length - 1];
  let consecutiveMatches = 0;

  for (let i = validValues.length - 1; i >= 0; i--) {
    if (Math.abs(validValues[i] - lastValue) <= tolerance) {
      consecutiveMatches++;
    } else {
      break;
    }
  }

  if (consecutiveMatches >= maxAllowedPersistence) {
    return {
      passed: false,
      flag: "SUSPECT",
      repeatedCount: consecutiveMatches,
      reason: `Sensor macet (persistence stuck): ${variableName} bernilai konstan (${lastValue}) selama ${consecutiveMatches} pembacaan berturut-turut.`,
    };
  }

  return {
    passed: true,
    flag: "GOOD",
    repeatedCount: consecutiveMatches,
  };
}
