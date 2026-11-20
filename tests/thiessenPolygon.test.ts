// tests/thiessenPolygon.test.ts
import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  calculatePolygonAreaKm2,
  computeThiessenArealRainfall,
  getDefaultKebumenThiessenInputs,
  KEBUMEN_TOTAL_AREA_KM2,
  ThiessenStationInput,
} from "../lib/climatology/thiessenPolygon";

describe("Thiessen Polygon & Areal Rainfall Computation", () => {
  describe("Polygon Area Calculation", () => {
    it("computes accurate area for a known coordinate square", () => {
      // 0.1 derajat x 0.1 derajat di sekitar Kebumen (-7.65 lat)
      // kmPerDegLat ≈ 110.574 -> 0.1 deg = 11.0574 km
      // kmPerDegLng ≈ 111.32 * cos(-7.65°) ≈ 110.327 -> 0.1 deg = 11.0327 km
      // Luas perkiraan ≈ 11.0574 * 11.0327 ≈ 121.99 km²
      const poly: [number, number][] = [
        [109.5, -7.6],
        [109.6, -7.6],
        [109.6, -7.7],
        [109.5, -7.7],
      ];

      const area = calculatePolygonAreaKm2(poly);
      assert.ok(area > 115 && area < 130, `Area was ${area}`);
    });

    it("returns zero for degenerate polygons", () => {
      assert.equal(calculatePolygonAreaKm2([]), 0);
      assert.equal(calculatePolygonAreaKm2([[109.5, -7.6]]), 0);
      assert.equal(calculatePolygonAreaKm2([[109.5, -7.6], [109.6, -7.6]]), 0);
    });
  });

  describe("Thiessen Voronoi & Weight Aggregation", () => {
    it("normalizes weights so that sum(w_i) = 1.0 (100%)", () => {
      const inputs = getDefaultKebumenThiessenInputs({
        "stasiun-jerukagung-klirong": 50,
        "stasiun-kebumen-kota": 40,
        "stasiun-sempor": 80,
      });

      const result = computeThiessenArealRainfall(inputs);

      assert.equal(result.activeStationsCount, 20);
      assert.equal(result.totalAreaKm2, KEBUMEN_TOTAL_AREA_KM2);

      // Pastikan total bobot persis bernilai 1.0 (dengan toleransi numerik float 0.001)
      const sumWeight = result.cells.reduce((acc, c) => acc + c.weight, 0);
      assert.ok(Math.abs(sumWeight - 1.0) < 0.002, `Sum weight was ${sumWeight}`);

      // Total persentase bobot
      const sumPercent = result.cells.reduce((acc, c) => acc + c.weightPercent, 0);
      assert.ok(Math.abs(sumPercent - 100.0) < 0.2, `Sum percent was ${sumPercent}`);

      // Seluruh stasiun harus memiliki area dan koordinat poligon tertutup
      for (const cell of result.cells) {
        assert.ok(cell.areaKm2 > 0);
        assert.ok(cell.polygonCoordinates.length >= 3);
        // Poligon tertutup: titik awal == titik akhir
        const first = cell.polygonCoordinates[0];
        const last = cell.polygonCoordinates[cell.polygonCoordinates.length - 1];
        assert.equal(first[0], last[0]);
        assert.equal(first[1], last[1]);
      }

      // GeoJSON Features harus valid
      assert.equal(result.geoJson.features.length, 20);
      assert.equal(result.geoJson.type, "FeatureCollection");
    });

    it("recalculates weights reactively when stations are toggled off", () => {
      const inputs = getDefaultKebumenThiessenInputs();

      // Nonaktifkan 5 stasiun
      inputs[0].active = false;
      inputs[1].active = false;
      inputs[2].active = false;
      inputs[3].active = false;
      inputs[4].active = false;

      const result = computeThiessenArealRainfall(inputs);

      assert.equal(result.activeStationsCount, 15);
      const sumWeight = result.cells.reduce((acc, c) => acc + c.weight, 0);
      assert.ok(Math.abs(sumWeight - 1.0) < 0.002);
      assert.equal(result.cells.length, 15);
    });

    it("accurately computes areal rainfall R_areal = sum(w_i * R_i)", () => {
      // Buat 3 stasiun sederhana
      const threeStations: ThiessenStationInput[] = [
        {
          id: "station-a",
          name: "Stasiun Barat",
          lat: -7.6,
          lng: 109.4,
          rainfall: 100,
          active: true,
        },
        {
          id: "station-b",
          name: "Stasiun Tengah",
          lat: -7.6,
          lng: 109.6,
          rainfall: 50,
          active: true,
        },
        {
          id: "station-c",
          name: "Stasiun Timur",
          lat: -7.6,
          lng: 109.8,
          rainfall: 0,
          active: true,
        },
      ];

      const result = computeThiessenArealRainfall(threeStations);
      assert.equal(result.activeStationsCount, 3);
      assert.ok(result.arealRainfall > 0);

      // Verifikasi bahwa arealRainfall sama dengan penjumlahan weightedRainfall
      const expectedAreal = result.cells.reduce(
        (acc, c) => acc + c.weight * c.rainfall,
        0
      );
      assert.ok(Math.abs(result.arealRainfall - expectedAreal) < 0.05);
    });

    it("handles empty station list without runtime errors", () => {
      const result = computeThiessenArealRainfall([]);
      assert.equal(result.activeStationsCount, 0);
      assert.equal(result.arealRainfall, 0);
      assert.equal(result.cells.length, 0);
    });
  });
});
