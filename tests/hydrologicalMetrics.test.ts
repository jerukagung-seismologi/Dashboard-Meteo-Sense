// tests/hydrologicalMetrics.test.ts
import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  calculateHydrologicalMetrics,
  getNSECategory,
  getRSRCategory,
  getKGECategory,
  getNRMSECategory,
} from "../lib/bias-correction/statistics/hydrologicalMetrics";

describe("Hydrological Metrics (NSE, RSR, NRMSE, KGE)", () => {
  it("yields ideal scores for identical observed and simulated series", () => {
    const pairs = [
      { observed: 10, simulated: 10 },
      { observed: 20, simulated: 20 },
      { observed: 30, simulated: 30 },
      { observed: 40, simulated: 40 },
      { observed: 50, simulated: 50 },
    ];

    const result = calculateHydrologicalMetrics(pairs);

    assert.equal(result.sampleCount, 5);
    assert.equal(result.nse, 1.0);
    assert.equal(result.nseRating, "Sangat Baik");
    assert.equal(result.rsr, 0.0);
    assert.equal(result.rsrRating, "Sangat Baik");
    assert.equal(result.kge, 1.0);
    assert.equal(result.kgeRating, "Sangat Baik");
    assert.equal(result.kgeComponents.r, 1.0);
    assert.equal(result.kgeComponents.alpha, 1.0);
    assert.equal(result.kgeComponents.beta, 1.0);
    assert.equal(result.nrmseRange, 0.0);
    assert.equal(result.nrmseRating, "Sangat Baik");
    assert.equal(result.rmse, 0.0);
  });

  it("calculates known values accurately on synthetic test vector", () => {
    // Observed: [1, 2, 3, 4, 5] -> mean = 3, var = 2, std = sqrt(2) ≈ 1.4142
    // Simulated: [2, 3, 4, 5, 6] -> constant +1 bias, error diff = -1 each -> sumSqErr = 5
    // NSE = 1 - (5 / 10) = 0.5
    const pairs = [
      { observed: 1, simulated: 2 },
      { observed: 2, simulated: 3 },
      { observed: 3, simulated: 4 },
      { observed: 4, simulated: 5 },
      { observed: 5, simulated: 6 },
    ];

    const result = calculateHydrologicalMetrics(pairs);

    assert.equal(result.sampleCount, 5);
    assert.equal(result.nse, 0.5);
    assert.equal(result.nseRating, "Memuaskan");

    // RMSE = sqrt(5/5) = 1.0
    // RSR = RMSE / stdObs = 1.0 / sqrt(2) ≈ 0.7071
    assert.equal(result.rsr, 0.7071);

    // KGE: r = 1.0, alpha = 1.0, beta = 4 / 3 ≈ 1.3333
    // ED = sqrt((1-1)^2 + (1-1)^2 + (1.3333-1)^2) = 0.3333
    // KGE = 1 - 0.3333 = 0.6667
    assert.equal(result.kge, 0.6667);
    assert.equal(result.kgeRating, "Baik");

    // Range NRMSE = 1.0 / (5 - 1) = 0.25 (25%) -> Memuaskan
    assert.equal(result.nrmseRange, 0.25);
    assert.equal(result.nrmseRating, "Memuaskan");
  });

  it("handles negative NSE when model performs worse than the mean", () => {
    // Mean obs = 10. Model is completely wild
    const pairs = [
      { observed: 10, simulated: 100 },
      { observed: 10, simulated: -80 },
      { observed: 12, simulated: 50 },
      { observed: 8, simulated: -30 },
    ];

    const result = calculateHydrologicalMetrics(pairs);
    assert.ok(result.nse < 0);
    assert.equal(result.nseRating, "Tidak Memuaskan");
    assert.ok(result.rsr > 0.7);
    assert.equal(result.rsrRating, "Tidak Memuaskan");
  });

  it("handles constant observation series safely without NaN or division by zero", () => {
    // Constant observation: stdObs = 0
    const constantPairs = [
      { observed: 25.0, simulated: 25.0 },
      { observed: 25.0, simulated: 25.0 },
      { observed: 25.0, simulated: 25.0 },
    ];

    const result = calculateHydrologicalMetrics(constantPairs);
    assert.ok(!isNaN(result.nse) && isFinite(result.nse));
    assert.ok(!isNaN(result.rsr) && isFinite(result.rsr));
    assert.ok(!isNaN(result.kge) && isFinite(result.kge));
    assert.equal(result.nse, 1.0);
    assert.equal(result.rsr, 0.0);
  });

  it("handles empty or invalid inputs gracefully", () => {
    const emptyResult = calculateHydrologicalMetrics([]);
    assert.equal(emptyResult.sampleCount, 0);
    assert.equal(emptyResult.nse, 0);
    assert.equal(emptyResult.rsr, 0);
    assert.equal(emptyResult.kge, 0);

    const nullPairs = [
      { observed: null, simulated: 12 },
      { observed: 15, simulated: undefined },
      { observed: NaN, simulated: 10 },
    ];
    const nullResult = calculateHydrologicalMetrics(nullPairs);
    assert.equal(nullResult.sampleCount, 0);
  });

  it("verifies rating categorization helper functions", () => {
    assert.equal(getNSECategory(0.85), "Sangat Baik");
    assert.equal(getNSECategory(0.70), "Baik");
    assert.equal(getNSECategory(0.55), "Memuaskan");
    assert.equal(getNSECategory(0.40), "Tidak Memuaskan");

    assert.equal(getRSRCategory(0.3), "Sangat Baik");
    assert.equal(getRSRCategory(0.55), "Baik");
    assert.equal(getRSRCategory(0.65), "Memuaskan");
    assert.equal(getRSRCategory(0.85), "Tidak Memuaskan");

    assert.equal(getKGECategory(0.80), "Sangat Baik");
    assert.equal(getKGECategory(0.60), "Baik");
    assert.equal(getKGECategory(0.35), "Memuaskan");
    assert.equal(getKGECategory(0.10), "Tidak Memuaskan");

    assert.equal(getNRMSECategory(0.08), "Sangat Baik");
    assert.equal(getNRMSECategory(0.15), "Baik");
    assert.equal(getNRMSECategory(0.25), "Memuaskan");
    assert.equal(getNRMSECategory(0.40), "Tidak Memuaskan");
  });
});
