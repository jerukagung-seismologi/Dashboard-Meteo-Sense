// tests/designRainfall.test.ts
import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  computeHydrologicalSampleStats,
  standardNormalCDF,
  standardNormalQuantile,
  calculateLP3FrequencyFactor,
  getGumbelParams,
  getChiSquareCritical,
  getKolmogorovSmirnovCritical,
  analyzeDesignRainfall,
  KEBUMEN_PRESEEDED_HISTORICAL_HHMT,
} from "../lib/climatology/designRainfall";

describe("Design Rainfall & Statistical Hydrology Engine", () => {
  describe("Statistical Sample Parameters", () => {
    it("computes accurate sample stats on a known series", () => {
      // Sampel: [100, 120, 140, 160, 180]
      // Mean = 140
      // Variance = ((1600 + 400 + 0 + 400 + 1600) / 4) = 4000 / 4 = 1000
      // StdDev = sqrt(1000) ≈ 31.6228 -> 31.62
      // Skewness = 0 (simetris)
      const data = [100, 120, 140, 160, 180];
      const stats = computeHydrologicalSampleStats(data);

      assert.equal(stats.n, 5);
      assert.equal(stats.mean, 140);
      assert.equal(stats.variance, 1000);
      assert.equal(stats.stdDev, 31.62);
      assert.equal(stats.skewness, 0);
      assert.equal(stats.min, 100);
      assert.equal(stats.max, 180);
      assert.ok(stats.logMean > 0);
      assert.ok(stats.logStdDev > 0);
    });

    it("handles single-item and empty arrays gracefully without NaN", () => {
      const emptyStats = computeHydrologicalSampleStats([]);
      assert.equal(emptyStats.n, 0);
      assert.equal(emptyStats.mean, 0);
      assert.equal(emptyStats.stdDev, 0);

      const singleStats = computeHydrologicalSampleStats([150]);
      assert.equal(singleStats.n, 1);
      assert.equal(singleStats.mean, 150);
      assert.equal(singleStats.stdDev, 0);
    });
  });

  describe("Standard Normal CDF & Quantile Inverses", () => {
    it("computes standard normal CDF correctly at landmark points", () => {
      assert.equal(standardNormalCDF(0), 0.5);
      assert.ok(Math.abs(standardNormalCDF(1) - 0.8413) < 0.001);
      assert.ok(Math.abs(standardNormalCDF(-1) - 0.1587) < 0.001);
      assert.ok(Math.abs(standardNormalCDF(1.96) - 0.975) < 0.001);
      assert.ok(Math.abs(standardNormalCDF(2.576) - 0.995) < 0.001);
    });

    it("computes inverse standard normal quantiles correctly", () => {
      assert.equal(standardNormalQuantile(0.5), 0);
      assert.ok(Math.abs(standardNormalQuantile(0.8) - 0.8416) < 0.001); // T = 5
      assert.ok(Math.abs(standardNormalQuantile(0.9) - 1.2816) < 0.001); // T = 10
      assert.ok(Math.abs(standardNormalQuantile(0.95) - 1.6449) < 0.001); // T = 20
      assert.ok(Math.abs(standardNormalQuantile(0.98) - 2.0537) < 0.002); // T = 50
    });

    it("evaluates LP3 Wilson-Hilferty frequency factors correctly", () => {
      // Ketika Cs = 0, KT harus persis sama dengan z
      const ktCs0_T10 = calculateLP3FrequencyFactor(0, 10);
      const z_T10 = standardNormalQuantile(0.9);
      assert.ok(Math.abs(ktCs0_T10 - z_T10) < 0.001);

      // Ketika Cs > 0 (positif skew), KT pada periode ulang tinggi harus lebih besar daripada z
      const ktCs1_T50 = calculateLP3FrequencyFactor(1.0, 50);
      const z_T50 = standardNormalQuantile(0.98);
      assert.ok(ktCs1_T50 > z_T50);
    });
  });

  describe("Gumbel Parameters & Critical Value Lookups", () => {
    it("retrieves Gumbel Yn and Sn accurately for different sample sizes", () => {
      const gumbel10 = getGumbelParams(10);
      assert.equal(gumbel10.Yn, 0.4952);
      assert.equal(gumbel10.Sn, 0.9496);

      const gumbel25 = getGumbelParams(25);
      assert.equal(gumbel25.Yn, 0.5309);
      assert.equal(gumbel25.Sn, 1.0915);

      const gumbelLarge = getGumbelParams(120);
      assert.equal(gumbelLarge.Yn, 0.5772);
      assert.equal(gumbelLarge.Sn, 1.28255);
    });

    it("retrieves critical values for Chi-Square and Kolmogorov-Smirnov", () => {
      assert.equal(getChiSquareCritical(1), 3.841);
      assert.equal(getChiSquareCritical(2), 5.991);
      assert.equal(getChiSquareCritical(3), 7.815);

      const ksCrit25 = getKolmogorovSmirnovCritical(25);
      assert.equal(ksCrit25, 0.27);
    });
  });

  describe("Full Design Rainfall Analysis Execution", () => {
    it("successfully analyzes 25-year Kebumen Jerukagung dataset", () => {
      const series = KEBUMEN_PRESEEDED_HISTORICAL_HHMT["stasiun-jerukagung-klirong"];
      assert.equal(series.length, 25);

      const analysis = analyzeDesignRainfall(
        "stasiun-jerukagung-klirong",
        "Stasiun Riset Jerukagung (AWS Utama)",
        series,
        [2, 5, 10, 20, 50]
      );

      assert.equal(analysis.stationId, "stasiun-jerukagung-klirong");
      assert.equal(analysis.stats.n, 25);
      assert.ok(analysis.stats.mean > 100);
      assert.ok(analysis.stats.stdDev > 15);

      // Pastikan keempat distribusi terhitung
      const dists = ["Normal", "Log-Normal", "Log-Pearson III", "Gumbel I"] as const;
      for (const dist of dists) {
        const res = analysis.distributions[dist];
        assert.ok(res, `Distribusi ${dist} harus ada`);
        assert.ok(res.returnPeriods[2] > 0);
        assert.ok(res.returnPeriods[5] > res.returnPeriods[2]);
        assert.ok(res.returnPeriods[10] > res.returnPeriods[5]);
        assert.ok(res.returnPeriods[20] > res.returnPeriods[10]);
        assert.ok(res.returnPeriods[50] > res.returnPeriods[20]);

        // Verifikasi hasil uji statistik
        assert.ok(typeof res.chiSquareTest.chiSquare === "number");
        assert.ok(typeof res.ksTest.deltaPMax === "number");
      }

      // Pastikan ada satu distribusi terbaik yang direkomendasikan
      assert.ok(analysis.bestDistribution);
      assert.ok(analysis.distributions[analysis.bestDistribution].isRecommended);

      // Posisi plotting Weibull harus terurut naik
      assert.equal(analysis.weibullPlottingPositions.length, 25);
      for (let i = 0; i < analysis.weibullPlottingPositions.length - 1; i++) {
        assert.ok(
          analysis.weibullPlottingPositions[i].rainfall <=
            analysis.weibullPlottingPositions[i + 1].rainfall
        );
      }
    });

    it("triggers methodology warning when sample size is less than 10 years", () => {
      const shortSeries = [
        { year: 2020, rainfall: 120 },
        { year: 2021, rainfall: 140 },
        { year: 2022, rainfall: 160 },
        { year: 2023, rainfall: 130 },
      ];

      const analysis = analyzeDesignRainfall("test-short", "Short Station", shortSeries);
      assert.ok(analysis.methodologyWarnings.length > 0);
      assert.ok(analysis.methodologyWarnings[0].includes("< 10 tahun"));
    });
  });
});
