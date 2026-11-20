// tests/weatherNext3Adapter.test.ts
import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  kelvinToCelsius,
  uvToWindSpeedAndDirection,
  metersToMillimeters,
  pascalsToHectopascals,
  estimateWmoCode,
  normalizeWeatherNext3Record,
  generateSyntheticWeatherNext3Forecast,
  weatherNext3ToConsensusPrediction,
} from "../lib/weather-models/weatherNext3Adapter";

describe("WeatherNext 3 AI NWP Model Adapter", () => {
  describe("Physical Unit Conversions", () => {
    it("converts temperature from Kelvin to Celsius", () => {
      // 273.15 K = 0.0 °C
      assert.equal(kelvinToCelsius(273.15), 0.0);
      // 300.15 K = 27.0 °C
      assert.equal(kelvinToCelsius(300.15), 27.0);
      // 303.65 K = 30.5 °C
      assert.equal(kelvinToCelsius(303.65), 30.5);
    });

    it("converts u and v wind vectors to speed and meteorological direction", () => {
      // u = 0, v = -5 (angin dari arah Utara / North -> 0 / 360°)
      const northWind = uvToWindSpeedAndDirection(0, -5);
      assert.equal(northWind.speedMs, 5.0);
      assert.equal(northWind.speedKmh, 18.0);
      assert.equal(northWind.directionDeg, 0);

      // u = -5, v = 0 (angin dari arah Timur / East -> 90°)
      const eastWind = uvToWindSpeedAndDirection(-5, 0);
      assert.equal(eastWind.speedMs, 5.0);
      assert.equal(eastWind.directionDeg, 90);

      // u = 0, v = 5 (angin dari arah Selatan / South -> 180°)
      const southWind = uvToWindSpeedAndDirection(0, 5);
      assert.equal(southWind.speedMs, 5.0);
      assert.equal(southWind.directionDeg, 180);

      // u = 5, v = 0 (angin dari arah Barat / West -> 270°)
      const westWind = uvToWindSpeedAndDirection(5, 0);
      assert.equal(westWind.speedMs, 5.0);
      assert.equal(westWind.directionDeg, 270);
    });

    it("converts total precipitation from meters to millimeters", () => {
      // 0.005 meters = 5.0 mm
      assert.equal(metersToMillimeters(0.005), 5.0);
      // 0 meters = 0 mm
      assert.equal(metersToMillimeters(0), 0.0);
      // negative clamped to 0
      assert.equal(metersToMillimeters(-0.001), 0.0);
    });

    it("converts surface pressure from Pascals to Hectopascals", () => {
      // 101325 Pa = 1013.25 hPa
      assert.equal(pascalsToHectopascals(101325), 1013.25);
      // 100800 Pa = 1008.0 hPa
      assert.equal(pascalsToHectopascals(100800), 1008.0);
    });
  });

  describe("Record Normalization & WMO Classification", () => {
    it("estimates appropriate WMO codes based on precipitation and humidity", () => {
      const heavy = estimateWmoCode(12.0, 95, 26);
      assert.equal(heavy.code, 65);
      assert.equal(heavy.label, "Hujan Lebat");

      const light = estimateWmoCode(0.8, 85, 27);
      assert.equal(light.code, 61);
      assert.equal(light.label, "Hujan Ringan");

      const clear = estimateWmoCode(0.0, 50, 31);
      assert.equal(clear.code, 0);
      assert.equal(clear.label, "Cerah");
    });

    it("normalizes a raw WeatherNext 3 record into standardized format", () => {
      const raw = {
        time: "2024-04-15T06:00:00Z",
        temperature_2m: 301.65, // 28.5 °C
        u_component_of_wind_10m: -3.0,
        v_component_of_wind_10m: -4.0, // speed = 5.0 m/s
        total_precipitation: 0.002, // 2.0 mm
        surface_pressure: 101150, // 1011.5 hPa
        relative_humidity_2m: 80,
      };

      const normalized = normalizeWeatherNext3Record(raw);
      assert.equal(normalized.time, raw.time);
      assert.equal(normalized.temperatureC, 28.5);
      assert.equal(normalized.windSpeedMs, 5.0);
      assert.equal(normalized.precipitationMm, 2.0);
      assert.equal(normalized.pressureHpa, 1011.5);
      assert.equal(normalized.humidityPercent, 80);
    });
  });

  describe("Forecast Generator & Consensus Prediction Integration", () => {
    it("generates 48-hour synthetic forecast at 0.05 degree grid resolution", () => {
      const res = generateSyntheticWeatherNext3Forecast(-7.7366, 109.6458, "2024-04-15", "hourly_48h");
      assert.equal(res.metadata.gridResolutionDeg, 0.05);
      assert.equal(res.metadata.modelCycle, "hourly_48h");
      assert.equal(res.hourly.length, 48);

      for (const h of res.hourly) {
        assert.ok(h.temperatureC > 20 && h.temperatureC < 40);
        assert.ok(h.humidityPercent >= 0 && h.humidityPercent <= 100);
        assert.ok(h.pressureHpa > 990 && h.pressureHpa < 1030);
      }
    });

    it("converts normalized hourly item into consensus prediction object", () => {
      const raw = {
        time: "2024-04-15T06:00:00Z",
        temperature_2m: 302.15,
        total_precipitation: 0.004,
        relative_humidity_2m: 85,
      };
      const normalized = normalizeWeatherNext3Record(raw);
      const consensusPred = weatherNext3ToConsensusPrediction(normalized);

      assert.ok(consensusPred);
      assert.equal(consensusPred?.modelId, "weathernext_3");
      assert.ok(consensusPred?.modelName.includes("WeatherNext 3 AI"));
      assert.equal(consensusPred?.temperature, 29);
      assert.equal(consensusPred?.precipitation, 4.0);
    });
  });
});
