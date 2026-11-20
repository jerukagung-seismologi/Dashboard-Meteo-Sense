// tests/mslpConversion.test.ts
import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  convertStationPressureToMSLP,
  convertMSLPToStationPressure,
} from "../lib/weatherUtils";

describe("Barometric Pressure to Mean Sea Level Pressure (MSLP) Conversion", () => {
  it("leaves pressure unchanged when elevation is at sea level (0 meters)", () => {
    const pStation = 1013.25;
    const mslp = convertStationPressureToMSLP(pStation, 0, 15);
    assert.equal(mslp, 1013.25);

    const back = convertMSLPToStationPressure(mslp, 0, 15);
    assert.equal(back, 1013.25);
  });

  it("calculates expected atmospheric MSLP reduction for typical inland elevation", () => {
    // At 100 meters elevation and 15°C, MSLP should be higher than station pressure by approx 11-13 hPa
    const pStation = 1000.0;
    const elevation = 100.0; // 100 meters
    const mslp = convertStationPressureToMSLP(pStation, elevation, 15.0);

    // Using standard formula: factor = 1 + (0.0065 * 100) / (288.15 + 0.325) ≈ 1 + 0.65 / 288.475 ≈ 1.002253
    // 1.002253^5.25588 ≈ 1.01191 -> 1000 * 1.01191 ≈ 1011.91 hPa
    assert.ok(mslp > pStation);
    assert.ok(mslp >= 1011.0 && mslp <= 1013.0);
  });

  it("exhibits round-trip consistency between station pressure and MSLP", () => {
    const originalStationP = 985.4;
    const elevation = 250.0; // 250 m (e.g. foothill AWS station)
    const tempC = 27.5; // Tropical daytime temp

    const mslp = convertStationPressureToMSLP(originalStationP, elevation, tempC);
    const recoveredStationP = convertMSLPToStationPressure(mslp, elevation, tempC);

    // Should match within floating point rounding tolerance (<= 0.05 hPa)
    assert.ok(
      Math.abs(recoveredStationP - originalStationP) <= 0.05,
      `Expected ${originalStationP}, got ${recoveredStationP}`
    );
  });

  it("reflects temperature dependence of air column density", () => {
    const pStation = 950.0;
    const elevation = 500.0;

    // Colder air column is denser -> higher hydrostatic pressure difference
    const mslpCold = convertStationPressureToMSLP(pStation, elevation, 0.0);
    const mslpWarm = convertStationPressureToMSLP(pStation, elevation, 30.0);

    assert.ok(
      mslpCold > mslpWarm,
      `Cold air MSLP (${mslpCold}) must be greater than warm air MSLP (${mslpWarm})`
    );
  });

  it("handles non-positive pressure and edge cases safely", () => {
    assert.equal(convertStationPressureToMSLP(0, 100), 0);
    assert.equal(convertStationPressureToMSLP(-50, 100), 0);
    assert.equal(convertMSLPToStationPressure(0, 100), 0);
    assert.equal(convertMSLPToStationPressure(-100, 100), 0);

    // Extreme temperature clamped safely without crash
    const mslpClamped = convertStationPressureToMSLP(1000, 100, 150);
    assert.ok(mslpClamped > 1000);
  });
});
