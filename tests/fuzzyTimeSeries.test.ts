// tests/fuzzyTimeSeries.test.ts
import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  computeChenFTS,
  determineOptimalIntervalsCount,
  FTSDataPoint,
} from "../lib/forecasting/fuzzyTimeSeries";

describe("Fuzzy Time Series (FTS) Chen Forecasting Engine", () => {
  const sampleRainfall: FTSDataPoint[] = [
    { period: "2023-01", actual: 320 },
    { period: "2023-02", actual: 280 },
    { period: "2023-03", actual: 210 },
    { period: "2023-04", actual: 160 },
    { period: "2023-05", actual: 95 },
    { period: "2023-06", actual: 45 },
    { period: "2023-07", actual: 20 },
    { period: "2023-08", actual: 15 },
    { period: "2023-09", actual: 35 },
    { period: "2023-10", actual: 120 },
    { period: "2023-11", actual: 250 },
    { period: "2023-12", actual: 340 },
  ];

  describe("Optimal Intervals & Universe of Discourse", () => {
    it("determines optimal interval counts using Sturges or custom constraints", () => {
      const kAuto = determineOptimalIntervalsCount(sampleRainfall.length);
      assert.ok(kAuto >= 5 && kAuto <= 12);

      const kCustom = determineOptimalIntervalsCount(sampleRainfall.length, 7);
      assert.equal(kCustom, 7);
    });

    it("constructs universe of discourse U = [uMin, uMax] containing all historical points", () => {
      const res = computeChenFTS(sampleRainfall, { intervalsCount: 6 });
      assert.equal(res.universeOfDiscourse.min, 15);
      assert.equal(res.universeOfDiscourse.max, 340);
      assert.ok(res.universeOfDiscourse.uMin <= 15);
      assert.ok(res.universeOfDiscourse.uMax >= 340);
      assert.equal(res.intervals.length, 6);
      assert.equal(res.intervals[0].fuzzySet, "A1");
      assert.equal(res.intervals[5].fuzzySet, "A6");
    });
  });

  describe("FLR, FLRG, & In-Sample Fitting", () => {
    it("builds Fuzzy Logical Relationships (FLR) and groups (FLRG)", () => {
      const res = computeChenFTS(sampleRainfall, { intervalsCount: 6 });

      // FLR list should have n - 1 items
      assert.equal(res.flrList.length, sampleRainfall.length - 1);
      assert.ok(res.flrList[0].from.startsWith("A"));
      assert.ok(res.flrList[0].to.startsWith("A"));

      // FLRG table should have an entry for each fuzzy set A1..Ak
      assert.equal(res.flrgTable.length, 6);
      for (const grp of res.flrgTable) {
        assert.ok(grp.antecedent.startsWith("A"));
        assert.ok(grp.forecastValue > 0);
      }
    });

    it("evaluates fitted series with non-null predictions after first step", () => {
      const res = computeChenFTS(sampleRainfall, { intervalsCount: 6 });
      assert.equal(res.fittedSeries.length, sampleRainfall.length);

      // First step t=0 has no previous antecedent
      assert.equal(res.fittedSeries[0].forecast, null);

      // Remaining steps have forecasts and residuals
      for (let i = 1; i < res.fittedSeries.length; i++) {
        const item = res.fittedSeries[i];
        assert.notEqual(item.forecast, null);
        assert.notEqual(item.residual, null);
        assert.notEqual(item.percentageError, null);
      }
    });
  });

  describe("Error Metrics & Multi-Step Future Forecasting", () => {
    it("computes MAPE (%), RMSE (mm), and MAE (mm)", () => {
      const res = computeChenFTS(sampleRainfall, { intervalsCount: 6 });
      assert.ok(res.metrics.rmse > 0);
      assert.ok(res.metrics.mape > 0);
      assert.ok(res.metrics.mae > 0);
      assert.equal(res.metrics.sampleCount, sampleRainfall.length - 1);
    });

    it("generates multi-step ahead future forecast steps", () => {
      const res = computeChenFTS(sampleRainfall, { intervalsCount: 6, futureSteps: 3 });
      assert.equal(res.futureForecasts.length, 3);
      assert.equal(res.futureForecasts[0].step, 1);
      assert.ok(res.futureForecasts[0].predictedValue > 0);
      assert.ok(res.futureForecasts[0].fuzzySet.startsWith("A"));
      assert.ok(res.futureForecasts[0].basedOnFLRG.includes("->"));
    });

    it("throws clear error on insufficient time series length (< 3 points)", () => {
      assert.throws(() => {
        computeChenFTS([{ period: "2023-01", actual: 100 }], { intervalsCount: 5 });
      }, /minimal harus memiliki 3 titik observasi/);
    });
  });
});
