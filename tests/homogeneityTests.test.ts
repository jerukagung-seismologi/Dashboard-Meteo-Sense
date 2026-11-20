// tests/homogeneityTests.test.ts
import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  calculateRAPS,
  calculateDoubleMassCurve,
  calculateSpearmanTrendTest,
  validateSampleAdequacy,
} from "../lib/bias-correction/statistics/homogeneityTests";

describe("Quality & Homogeneity Tests (RAPS, Double Mass, Spearman, Adequacy)", () => {
  describe("RAPS (Rescaled Adjusted Partial Sums)", () => {
    it("identifies a homogeneous stationary series", () => {
      // Gaussian-like stationary series centered at 25
      const series = [24, 25, 26, 25, 24, 25, 26, 25, 24, 25, 25, 26, 24, 25, 26, 25, 24, 25, 26, 25];
      const result = calculateRAPS(series);

      assert.equal(result.sampleCount, 20);
      assert.ok(result.isHomogeneous);
      assert.ok(result.qRescaled <= result.qCritical95);
      assert.ok(result.interpretation.includes("Data deret waktu homogen"));
    });

    it("detects a sudden structural shift / break in the series", () => {
      // Step jump from 20 to 40 halfway through (change-point at index ~15)
      const part1 = new Array(15).fill(20).map((v, i) => v + (i % 2 === 0 ? 1 : -1));
      const part2 = new Array(15).fill(40).map((v, i) => v + (i % 2 === 0 ? 1 : -1));
      const shiftedSeries = [...part1, ...part2];

      const result = calculateRAPS(shiftedSeries);
      assert.equal(result.sampleCount, 30);
      // Change point should be detected near index 15
      assert.ok(result.changePointIndex >= 14 && result.changePointIndex <= 16);
      assert.ok(result.qRescaled > result.qCritical95);
      assert.equal(result.isHomogeneous, false);
      assert.ok(result.interpretation.includes("pergeseran non-homogen"));
    });

    it("handles edge cases and constant data safely", () => {
      const constant = [10, 10, 10, 10, 10];
      const result = calculateRAPS(constant);
      assert.equal(result.isHomogeneous, true);
      assert.equal(result.qStatistic, 0);

      const empty = calculateRAPS([]);
      assert.equal(empty.sampleCount, 0);
    });
  });

  describe("Double Mass Curve", () => {
    it("reports consistent linear slope for proportional series", () => {
      const obs = [2, 4, 6, 8, 10, 12, 14, 16, 18, 20];
      const ref = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10]; // slope = 2.0 exactly

      const result = calculateDoubleMassCurve(obs, ref);
      assert.equal(result.sampleCount, 10);
      assert.equal(result.overallSlope, 2.0);
      assert.equal(result.rSquared, 1.0);
      assert.equal(result.isConsistent, true);
      assert.ok(result.slopeRatio >= 0.99 && result.slopeRatio <= 1.01);
    });

    it("detects a drift/break in double mass curve slope", () => {
      // First 10 steps: obs = 1.0 * ref
      // Next 10 steps: obs = 2.5 * ref (instrument drift / recalibration)
      const obs: number[] = [];
      const ref: number[] = [];
      for (let i = 1; i <= 10; i++) {
        ref.push(10);
        obs.push(10);
      }
      for (let i = 1; i <= 10; i++) {
        ref.push(10);
        obs.push(25);
      }

      const result = calculateDoubleMassCurve(obs, ref);
      assert.equal(result.sampleCount, 20);
      assert.equal(result.isConsistent, false);
      assert.ok(result.slopeRatio > 1.2);
    });
  });

  describe("Spearman Rank Correlation Trend Test", () => {
    it("identifies a strongly increasing trend", () => {
      const increasing = [1, 2, 4, 7, 9, 12, 15, 18, 22, 25, 30, 35];
      const result = calculateSpearmanTrendTest(increasing);

      assert.equal(result.sampleCount, 12);
      assert.equal(result.trend, "Meningkat");
      assert.equal(result.isSignificant, true);
      assert.ok(result.spearmanR > 0.9);
      assert.ok(result.pValue < 0.05);
    });

    it("identifies a strongly decreasing trend", () => {
      const decreasing = [50, 45, 42, 38, 30, 27, 20, 18, 12, 8, 5, 2];
      const result = calculateSpearmanTrendTest(decreasing);

      assert.equal(result.sampleCount, 12);
      assert.equal(result.trend, "Menurun");
      assert.equal(result.isSignificant, true);
      assert.ok(result.spearmanR < -0.9);
      assert.ok(result.pValue < 0.05);
    });

    it("identifies stationary data without monotonic trend", () => {
      // Oscillating stationary signal
      const stationary = [10, 12, 9, 11, 10, 12, 9, 11, 10, 12, 9, 11, 10, 12, 9, 11];
      const result = calculateSpearmanTrendTest(stationary);

      assert.equal(result.trend, "Stasioner");
      assert.equal(result.isSignificant, false);
      assert.ok(result.pValue >= 0.05);
    });
  });

  describe("Sample Adequacy Validation", () => {
    it("warns when sample count is less than 504 hours (3 weeks)", () => {
      // 168 hours = 1 week
      const result = validateSampleAdequacy(168, 504);

      assert.equal(result.isAdequate, false);
      assert.equal(result.sampleCount, 168);
      assert.equal(result.minRequiredHours, 504);
      assert.ok(result.warningMessage?.includes("di bawah ambang batas kecukupan ilmiah"));
      assert.ok(result.recommendation.includes("Perpanjang rentang tanggal observasi"));
    });

    it("confirms adequacy when sample count meets or exceeds 504 hours", () => {
      // 720 hours = 30 days
      const result = validateSampleAdequacy(720, 504);

      assert.equal(result.isAdequate, true);
      assert.equal(result.warningMessage, undefined);
      assert.ok(result.recommendation.includes("Kecukupan sampel terpenuhi"));
    });
  });
});
