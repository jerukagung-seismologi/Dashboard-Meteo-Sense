// tests/probabilisticMetrics.test.ts
import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  calculateCRPS,
  calculateMeanCRPS,
  calculateBrierScore,
  generateReliabilityDiagram,
} from "../lib/bias-correction/statistics/probabilisticMetrics";

describe("Probabilistic Verification (CRPS, Brier Score, Reliability Diagram)", () => {
  describe("Continuous Ranked Probability Score (CRPS)", () => {
    it("reduces to MAE when ensemble consists of a single deterministic member", () => {
      // Gneiting & Raftery (2007) theorem: for M=1, CRPS(x, y) = |x - y|
      const ensemble = [24.5];
      const observed = 26.0;

      const crps = calculateCRPS(ensemble, observed);
      assert.equal(crps, 1.5);
    });

    it("evaluates to 0 when all ensemble members match the observation perfectly", () => {
      const ensemble = [28.0, 28.0, 28.0, 28.0];
      const observed = 28.0;

      const crps = calculateCRPS(ensemble, observed);
      assert.equal(crps, 0.0);
    });

    it("calculates known value for multi-member ensemble", () => {
      // Ensemble: [20, 24, 28] -> M = 3
      // Observation: 24
      // Term 1: (|20-24| + |24-24| + |28-24|) / 3 = (4 + 0 + 4) / 3 = 8 / 3 ≈ 2.6667
      // Term 2: pairwise differences:
      // |20-20|=0, |20-24|=4, |20-28|=8
      // |24-20|=4, |24-24|=0, |24-28|=4
      // |28-20|=8, |28-24|=4, |28-28|=0
      // Sum = 4 + 8 + 4 + 4 + 8 + 4 = 32
      // Term 2 = 32 / (2 * 9) = 32 / 18 = 16 / 9 ≈ 1.7778
      // CRPS = 8/3 - 16/9 = 8/9 ≈ 0.8889
      const ensemble = [20, 24, 28];
      const observed = 24;

      const crps = calculateCRPS(ensemble, observed);
      assert.equal(crps, 0.8889);
    });

    it("computes mean CRPS across a series of timesteps", () => {
      const series = [
        { ensemble: [20, 22], observed: 21 }, // CRPS = 0.5
        { ensemble: [25, 25], observed: 25 }, // CRPS = 0.0
      ];

      const result = calculateMeanCRPS(series);
      assert.equal(result.sampleCount, 2);
      assert.equal(result.meanCRPS, 0.25);
      assert.equal(result.minCRPS, 0.0);
      assert.equal(result.maxCRPS, 0.5);
    });

    it("handles empty or missing ensemble members safely without distorting mean error", () => {
      // Empty ensemble returns NaN for CRPS
      const emptyCRPS = calculateCRPS([], 25.0);
      assert.ok(isNaN(emptyCRPS));

      // In series evaluation, missing forecast steps must be skipped, NOT counted as 0 error
      const seriesWithGaps = [
        { ensemble: [20, 22], observed: 21 }, // Valid step: CRPS = 0.5
        { ensemble: [], observed: 25 },       // Missing forecast step (sensor/NWP outage)
      ];

      const result = calculateMeanCRPS(seriesWithGaps);
      assert.equal(result.sampleCount, 1);
      assert.equal(result.meanCRPS, 0.5); // Remains 0.5, not distorted down to 0.25
    });
  });

  describe("Brier Score (BS) & Brier Skill Score (BSS)", () => {
    it("yields BS = 0 and BSS = 1 for perfect probabilistic forecasts", () => {
      const forecastProbs = [1.0, 0.0, 1.0, 0.0];
      const observedOutcomes = [1, 0, 1, 0];

      const result = calculateBrierScore(forecastProbs, observedOutcomes);
      assert.equal(result.brierScore, 0.0);
      assert.equal(result.brierSkillScore, 1.0);
      assert.equal(result.climatologyBaseRate, 0.5);
      assert.equal(result.eventCount, 2);
    });

    it("yields BSS = 0 when forecast simply predicts sample climatological base rate", () => {
      // Climatology: 2 out of 4 events -> base rate = 0.5
      // Forecast always predicts 0.5
      const forecastProbs = [0.5, 0.5, 0.5, 0.5];
      const observedOutcomes = [1, 0, 1, 0];

      const result = calculateBrierScore(forecastProbs, observedOutcomes);
      // BS = ( (0.5-1)^2 + (0.5-0)^2 + (0.5-1)^2 + (0.5-0)^2 ) / 4 = (0.25*4)/4 = 0.25
      // BS_ref = 0.5 * 0.5 = 0.25
      // BSS = 1 - (0.25 / 0.25) = 0.0
      assert.equal(result.brierScore, 0.25);
      assert.equal(result.brierScoreRef, 0.25);
      assert.equal(result.brierSkillScore, 0.0);
    });

    it("handles boolean outcomes and probability boundary clamps", () => {
      const probs = [1.2, -0.3, 0.8]; // out-of-bound probs clamped to [0, 1]
      const outcomes = [true, false, true];

      const result = calculateBrierScore(probs, outcomes);
      assert.equal(result.sampleCount, 3);
      assert.ok(result.brierScore >= 0 && result.brierScore <= 1);
    });
  });

  describe("Reliability Diagram & Murphy Decomposition", () => {
    it("generates 10 calibration bins and verifies Murphy (1973) algebraic equality: BS = REL - RES + UNC", () => {
      const forecastProbs = [
        0.05, 0.12, 0.25, 0.35, 0.45, 0.55, 0.65, 0.75, 0.85, 0.95,
        0.02, 0.18, 0.22, 0.38, 0.42, 0.58, 0.62, 0.78, 0.82, 0.98,
      ];
      const observedOutcomes = [
        0, 0, 0, 0, 1, 0, 1, 1, 1, 1,
        0, 0, 1, 0, 0, 1, 1, 1, 1, 1,
      ];

      const diagram = generateReliabilityDiagram(forecastProbs, observedOutcomes, 10);

      assert.equal(diagram.sampleCount, 20);
      assert.equal(diagram.bins.length, 10);

      // Verify sharpness sum equals 1.0 (or within 0.001 floating tolerance)
      const totalSharpness = diagram.bins.reduce((acc, b) => acc + b.sharpness, 0);
      assert.ok(Math.abs(totalSharpness - 1.0) < 0.001);

      // Verify Murphy algebraic decomposition: BS = REL - RES + UNC
      const algebraicBS = diagram.reliability - diagram.resolution + diagram.uncertainty;
      assert.ok(
        Math.abs(diagram.brierScore - algebraicBS) < 0.005,
        `Expected BS ${diagram.brierScore} to match REL - RES + UNC (${algebraicBS})`
      );
    });

    it("provides perfect diagonal reference coordinates [0, 0] to [1, 1]", () => {
      const diagram = generateReliabilityDiagram([0.5], [1]);
      assert.deepEqual(diagram.perfectDiagonal, [
        { x: 0, y: 0 },
        { x: 1, y: 1 },
      ]);
    });

    it("handles empty dataset and sparse bins with null observed frequencies", () => {
      // 1. Empty dataset
      const emptyDiagram = generateReliabilityDiagram([], []);
      assert.equal(emptyDiagram.sampleCount, 0);
      assert.equal(emptyDiagram.bins.length, 0);
      assert.equal(emptyDiagram.brierScore, 0);
      assert.equal(emptyDiagram.brierSkillScore, 0);

      // 2. Sparse dataset: only 0.15 bin is populated (binIndex = 1)
      const sparseDiagram = generateReliabilityDiagram([0.15], [1], 10);
      assert.equal(sparseDiagram.sampleCount, 1);
      assert.equal(sparseDiagram.bins.length, 10);

      // Populated bin (index 1: [0.1, 0.2]): observed frequency is 1.0 (event occurred)
      const populatedBin = sparseDiagram.bins[1];
      assert.equal(populatedBin.sampleCount, 1);
      assert.equal(populatedBin.observedFrequency, 1.0);
      assert.equal(populatedBin.calibrationError, 0.85); // |0.15 - 1.0|

      // Unpopulated bins: observedFrequency must be null, not fake hits
      const emptyBin = sparseDiagram.bins[9]; // [0.9, 1.0]
      assert.equal(emptyBin.sampleCount, 0);
      assert.equal(emptyBin.observedFrequency, null);
      assert.equal(emptyBin.calibrationError, null);
    });
  });
});
