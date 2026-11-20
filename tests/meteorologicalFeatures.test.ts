// tests/meteorologicalFeatures.test.ts
import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  calculateDewPointCelsius,
  calculateVaporPressureDeficitKPa,
  calculateApparentTemperatureCelsius,
  getDefaultKebumenClimatologyLookup,
  engineerMeteorologicalFeatures,
  RawMeteorologicalRecord,
} from "../lib/forecasting/meteorologicalFeatures";

describe("Meteorological Feature Engineering Pipeline", () => {
  describe("Physical Derived Variables", () => {
    it("calculates Magnus-Tetens dew point with physical boundary (Td <= T)", () => {
      // Kondisi jenuh (RH = 100%) -> Td == T
      const tdSat = calculateDewPointCelsius(25.0, 100);
      assert.ok(Math.abs(tdSat - 25.0) < 0.2);

      // Kondisi lembap tropis normal (T = 30°C, RH = 80%)
      const tdNorm = calculateDewPointCelsius(30.0, 80);
      assert.ok(tdNorm < 30.0);
      assert.ok(tdNorm > 25.0); // ~26.2°C

      // Kondisi kering (T = 35°C, RH = 40%)
      const tdDry = calculateDewPointCelsius(35.0, 40);
      assert.ok(tdDry < 20.0);
    });

    it("calculates Vapor Pressure Deficit (VPD >= 0 kPa)", () => {
      // Saturation (RH = 100%) -> VPD = 0
      const vpdSat = calculateVaporPressureDeficitKPa(30.0, 100);
      assert.equal(vpdSat, 0);

      // T = 30°C, RH = 70% -> VPD ~ 1.28 kPa
      const vpd70 = calculateVaporPressureDeficitKPa(30.0, 70);
      assert.ok(vpd70 > 1.0 && vpd70 < 1.6);
    });

    it("calculates Apparent Temperature (Steadman) reflecting humidity & wind", () => {
      // Suhu terasa lebih tinggi saat kelembapan tinggi dan angin tenang
      const appWarm = calculateApparentTemperatureCelsius(31.0, 85, 1.0);
      assert.ok(appWarm > 35.0);

      // Suhu terasa lebih rendah saat ada angin kencang (wind chill effect)
      const appBreezy = calculateApparentTemperatureCelsius(25.0, 60, 8.0);
      assert.ok(appBreezy < 25.0);
    });
  });

  describe("Climatology Baseline Lookup", () => {
    it("provides 12-month x 24-hour diurnal climatological reference for Kebumen", () => {
      const lookup = getDefaultKebumenClimatologyLookup();
      // Total 12 * 24 = 288 key pairs
      const keys = Object.keys(lookup);
      assert.equal(keys.length, 288);

      const sample = lookup["6_13"]; // Juli pukul 13:00 WIB
      assert.ok(sample);
      assert.ok(sample.meanTemp > 28.0); // siang hari hangat
      assert.ok(sample.meanPres > 1005 && sample.meanPres < 1015);
    });
  });

  describe("End-to-End Feature Matrix Transformation", () => {
    it("transforms raw records into engineered features with cyclic encodings and rolling stats", () => {
      const rawData: RawMeteorologicalRecord[] = [];
      const baseTime = new Date("2024-03-01T00:00:00Z").getTime();

      for (let i = 0; i < 48; i++) {
        rawData.push({
          timestamp: new Date(baseTime + i * 3600000).toISOString(),
          temperature: 26.0 + Math.sin(i / 4) * 5.0,
          humidity: 80.0 - Math.sin(i / 4) * 20.0,
          pressure: 1012.0 - Math.cos(i / 6) * 3.0,
          windSpeed: 2.5 + (i % 5) * 0.5,
          windDirection: (120 + i * 5) % 360,
          rainfall: i % 8 === 0 ? 4.5 : 0.0,
        });
      }

      const engineered = engineerMeteorologicalFeatures(rawData);
      assert.equal(engineered.length, 48);

      for (const row of engineered) {
        assert.ok(!isNaN(row.temperature));
        assert.ok(!isNaN(row.dewPoint));
        assert.ok(!isNaN(row.vpd));
        assert.ok(!isNaN(row.apparentTemperature));
        // Sin/Cos dalam rentang [-1, 1]
        assert.ok(row.sinHour >= -1 && row.sinHour <= 1);
        assert.ok(row.cosHour >= -1 && row.cosHour <= 1);
        assert.ok(row.sinMonth >= -1 && row.sinMonth <= 1);
        assert.ok(row.cosMonth >= -1 && row.cosMonth <= 1);
        // Akumulasi hujan non-negatif
        assert.ok(row.rainfallAccum3h >= 0);
        assert.ok(row.rainfallAccum24h >= 0);
      }
    });

    it("handles missing values gracefully via LOCF forward-fill without throwing", () => {
      const rawWithGaps: RawMeteorologicalRecord[] = [
        { timestamp: "2024-01-01T00:00:00Z", temperature: 25.0, humidity: 85 },
        { timestamp: "2024-01-01T01:00:00Z", temperature: null, humidity: null }, // missing
        { timestamp: "2024-01-01T02:00:00Z", temperature: 26.5, humidity: 80 },
      ];

      const res = engineerMeteorologicalFeatures(rawWithGaps);
      assert.equal(res.length, 3);
      // Row 1 should have forward-filled values from row 0
      assert.equal(res[1].temperature, 25.0);
      assert.equal(res[1].humidity, 85);
    });
  });
});
