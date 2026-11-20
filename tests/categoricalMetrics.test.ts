// tests/categoricalMetrics.test.ts
import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  calculateContingencyTable,
  calculateCategoricalMetrics,
  calculateCategoricalMetricsFromTable,
  calculateClassContingencyTable,
  calculateCategoricalMetricsForClass,
  classifyBMKGRainfall,
  getBMKGRainfallLabel,
  calculateBMKGIntensityVerification,
} from "../lib/bias-correction/statistics/categoricalMetrics";

describe("Categorical Verification & 2x2 Contingency Table", () => {
  it("correctly calculates 2x2 contingency table counts", () => {
    // Pairs: { observed, forecast } with threshold = 1.0 mm
    const pairs = [
      { observed: 5.0, forecast: 4.0 }, // Hit (a)
      { observed: 2.0, forecast: 3.0 }, // Hit (a)
      { observed: 0.0, forecast: 2.5 }, // False Alarm (b)
      { observed: 3.0, forecast: 0.2 }, // Miss (c)
      { observed: 0.0, forecast: 0.0 }, // Correct Negative (d)
      { observed: 0.5, forecast: 0.1 }, // Correct Negative (d)
    ];

    const table = calculateContingencyTable(pairs, 1.0);
    assert.equal(table.hits, 2);
    assert.equal(table.falseAlarms, 1);
    assert.equal(table.misses, 1);
    assert.equal(table.correctNegatives, 2);
    assert.equal(table.total, 6);
  });

  it("calculates POD, FAR, FOH, CSI, and HSS accurately", () => {
    // a = 20, b = 5, c = 5, d = 70, N = 100
    const table = {
      hits: 20,
      falseAlarms: 5,
      misses: 5,
      correctNegatives: 70,
      total: 100,
    };

    const metrics = calculateCategoricalMetricsFromTable(table, 0.1);

    // POD = a / (a + c) = 20 / 25 = 0.8
    assert.equal(metrics.pod, 0.8);
    // FAR = b / (a + b) = 5 / 25 = 0.2
    assert.equal(metrics.far, 0.2);
    // FOH = a / (a + b) = 20 / 25 = 0.8 (1 - FAR)
    assert.equal(metrics.foh, 0.8);
    assert.equal(metrics.foh + metrics.far, 1.0);
    // CSI = a / (a + b + c) = 20 / 30 = 0.6667
    assert.equal(metrics.csi, 0.6667);
    // Accuracy = (a + d) / N = 90 / 100 = 0.9
    assert.equal(metrics.accuracy, 0.9);
    // FBI (Frequency Bias) = (a + b) / (a + c) = 25 / 25 = 1.0
    assert.equal(metrics.bias, 1.0);
    // HSS:
    // 2(ad - bc) / [(a+c)(c+d) + (a+b)(b+d)]
    // ad - bc = 20*70 - 5*5 = 1400 - 25 = 1375. Numerator = 2750
    // (a+c)(c+d) = 25 * 75 = 1875
    // (a+b)(b+d) = 25 * 75 = 1875
    // Denominator = 3750
    // HSS = 2750 / 3750 = 0.7333
    assert.equal(metrics.hss, 0.7333);
  });

  it("handles zero division and edge cases safely without NaN or Infinity", () => {
    // Case 1: All correct negatives (no events occurred and no events forecast)
    const allNeg = { hits: 0, falseAlarms: 0, misses: 0, correctNegatives: 50, total: 50 };
    const mNeg = calculateCategoricalMetricsFromTable(allNeg, 0.1);
    assert.ok(!isNaN(mNeg.pod) && isFinite(mNeg.pod));
    assert.ok(!isNaN(mNeg.far) && isFinite(mNeg.far));
    assert.ok(!isNaN(mNeg.csi) && isFinite(mNeg.csi));
    assert.ok(!isNaN(mNeg.hss) && isFinite(mNeg.hss));
    assert.equal(mNeg.far, 0);
    assert.equal(mNeg.csi, 1); // Perfect negative forecast agreement

    // Case 2: All hits (event occurred every time and was forecast every time)
    const allHits = { hits: 50, falseAlarms: 0, misses: 0, correctNegatives: 0, total: 50 };
    const mHits = calculateCategoricalMetricsFromTable(allHits, 0.1);
    assert.equal(mHits.pod, 1.0);
    assert.equal(mHits.far, 0.0);
    assert.equal(mHits.csi, 1.0);
    assert.equal(mHits.hss, 1.0);

    // Case 3: Empty dataset
    const mEmpty = calculateCategoricalMetrics([], 0.1);
    assert.equal(mEmpty.table.total, 0);
    assert.equal(mEmpty.pod, 0);
    assert.equal(mEmpty.far, 0);
    assert.equal(mEmpty.hss, 0);

    // Case 4: Nulls and NaNs in pairs are safely ignored
    const messyPairs = [
      { observed: null, forecast: 5.0 },
      { observed: 2.0, forecast: NaN },
      { observed: undefined, forecast: undefined },
      { observed: 10.0, forecast: 12.0 }, // Valid hit
    ];
    const mMessy = calculateCategoricalMetrics(messyPairs, 5.0);
    assert.equal(mMessy.table.total, 1);
    assert.equal(mMessy.table.hits, 1);
  });

  it("classifies BMKG rainfall intensity correctly", () => {
    assert.equal(classifyBMKGRainfall(0.0), "BERAWAN");
    assert.equal(classifyBMKGRainfall(0.05), "BERAWAN");
    assert.equal(classifyBMKGRainfall(0.1), "SANGAT_RINGAN");
    assert.equal(classifyBMKGRainfall(4.5), "SANGAT_RINGAN");
    assert.equal(classifyBMKGRainfall(5.0), "SANGAT_RINGAN");
    assert.equal(classifyBMKGRainfall(5.1), "RINGAN");
    assert.equal(classifyBMKGRainfall(20.0), "RINGAN");
    assert.equal(classifyBMKGRainfall(20.5), "SEDANG");
    assert.equal(classifyBMKGRainfall(50.0), "SEDANG");
    assert.equal(classifyBMKGRainfall(75.0), "LEBAT");
    assert.equal(classifyBMKGRainfall(100.0), "LEBAT");
    assert.equal(classifyBMKGRainfall(120.0), "SANGAT_LEBAT");
    assert.equal(classifyBMKGRainfall(150.0), "SANGAT_LEBAT");
    assert.equal(classifyBMKGRainfall(160.0), "EKSTREM");

    assert.ok(getBMKGRainfallLabel(25.0).includes("Hujan Sedang"));
  });

  it("computes multi-threshold BMKG verification correctly", () => {
    const pairs = [
      { observed: 0.0, forecast: 0.0 },
      { observed: 2.0, forecast: 3.0 },
      { observed: 15.0, forecast: 18.0 },
      { observed: 35.0, forecast: 40.0 },
      { observed: 60.0, forecast: 55.0 },
      { observed: 120.0, forecast: 110.0 },
    ];

    const bmkgResults = calculateBMKGIntensityVerification(pairs);
    assert.ok(bmkgResults["rain_occurrence"]);
    assert.ok(bmkgResults["ringan"]);
    assert.ok(bmkgResults["sedang"]);
    assert.ok(bmkgResults["lebat"]);
    assert.ok(bmkgResults["sangat_lebat"]);

    // For lebat (threshold = 50 mm): observed 60, 120 (2 events), forecast 55, 110 (2 events) -> 2 hits
    assert.equal(bmkgResults["lebat"].table.hits, 2);

    // Verify per-class verification entries are also populated
    assert.ok(bmkgResults["class_sangat_ringan"]);
    assert.ok(bmkgResults["class_ringan"]);
    assert.ok(bmkgResults["class_sedang"]);
    assert.ok(bmkgResults["class_lebat"]);
    assert.ok(bmkgResults["class_sangat_lebat"]);
  });

  it("calculates BMKG class-interval 2x2 contingency tables and metrics accurately", () => {
    const pairs = [
      { observed: 2.5, forecast: 4.0 },   // Hit for SANGAT_RINGAN (both <= 5.0)
      { observed: 3.0, forecast: 12.0 },  // Miss for SANGAT_RINGAN (obs <= 5.0, fcst > 5)
      { observed: 15.0, forecast: 4.5 },  // False Alarm for SANGAT_RINGAN (obs > 5, fcst <= 5)
      { observed: 25.0, forecast: 45.0 }, // Correct Negative for SANGAT_RINGAN (both > 5)
      { observed: 0.0, forecast: 0.0 },   // Correct Negative for SANGAT_RINGAN (both BERAWAN < 0.1)
    ];

    const srTable = calculateClassContingencyTable(pairs, "SANGAT_RINGAN");
    assert.equal(srTable.hits, 1);
    assert.equal(srTable.falseAlarms, 1);
    assert.equal(srTable.misses, 1);
    assert.equal(srTable.correctNegatives, 2);
    assert.equal(srTable.total, 5);

    const srMetrics = calculateCategoricalMetricsForClass(pairs, "SANGAT_RINGAN");
    // POD = 1 / (1 + 1) = 0.5
    assert.equal(srMetrics.pod, 0.5);
    // FAR = 1 / (1 + 1) = 0.5
    assert.equal(srMetrics.far, 0.5);
    // CSI = 1 / (1 + 1 + 1) = 0.3333
    assert.equal(srMetrics.csi, 0.3333);
  });
});
