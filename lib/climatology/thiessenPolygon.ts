// lib/climatology/thiessenPolygon.ts
/**
 * Modul Generator Poligon Thiessen & Analisis Curah Hujan Wilayah Rata-rata Tertimbang (Areal Rainfall)
 * untuk Kabupaten Kebumen.
 * 
 * Karakteristik Teknis:
 * 1. Menghitung sel Voronoi berbasis algoritma Sutherland-Hodgman Half-Plane Clipping
 *    pada bidang bola/proyeksi lintang tropis.
 * 2. Menghitung bobot luasan Thiessen (wi = Ai / Atotal) secara eksak sehingga sum(wi) = 1.0 (100%).
 * 3. Menghitung Curah Hujan Rata-rata Wilayah: R_areal = sum(wi * Ri).
 * 4. Mendukung dynamic toggle stasiun (reaktif): bobot dan poligon langsung dihitung ulang.
 * 5. Menghasilkan GeoJSON FeatureCollection berstandar RFC 7946 yang siap dirender di Leaflet.
 */

import { KEBUMEN_DEFAULT_STATIONS } from "@/lib/data/kebumenStations";

// ─── Tipe Data & Interface ──────────────────────────────────────────────────

export interface ThiessenStationInput {
  id: string;
  name: string;
  lat: number;
  lng: number;
  rainfall: number; // Curah hujan teramati (mm)
  active: boolean;  // Status keikutsertaan stasiun dalam poligon
  elevation?: number;
}

export interface ThiessenCell {
  stationId: string;
  stationName: string;
  lat: number;
  lng: number;
  areaKm2: number;
  weight: number;        // wi (0 s/d 1)
  weightPercent: number; // wi * 100%
  rainfall: number;      // Ri (mm)
  weightedRainfall: number; // wi * Ri (mm)
  // Koordinat Polygon [lng, lat]
  polygonCoordinates: [number, number][];
}

export interface ThiessenGeoJsonFeature {
  type: "Feature";
  id: string;
  properties: {
    stationId: string;
    stationName: string;
    lat: number;
    lng: number;
    areaKm2: number;
    weight: number;
    weightPercentStr: string;
    rainfall: number;
    weightedRainfall: number;
    fillColor: string;
  };
  geometry: {
    type: "Polygon";
    coordinates: [number, number][][];
  };
}

export interface ThiessenAnalysisResult {
  activeStationsCount: number;
  totalAreaKm2: number;
  arealRainfall: number; // mm
  cells: ThiessenCell[];
  geoJson: {
    type: "FeatureCollection";
    features: ThiessenGeoJsonFeature[];
  };
  unweightedMeanRainfall: number;
  maxRainfallStation: { name: string; rainfall: number } | null;
  minRainfallStation: { name: string; rainfall: number } | null;
}

// ─── Batas Geografis Kabupaten Kebumen ───────────────────────────────────────

// Bounding box batas Kabupaten Kebumen (dengan margin penyangga tipis)
// Lintang: -7.83 s/d -7.42 S, Bujur: 109.32 s/d 109.84 E
const KEBUMEN_BBOX = {
  minLng: 109.32,
  maxLng: 109.84,
  minLat: -7.83,
  maxLat: -7.42,
};

// Estimasi luas total Kabupaten Kebumen menurut BPS/Pemkab: 1.281,115 km²
export const KEBUMEN_TOTAL_AREA_KM2 = 1281.1;

// Palet warna estetik meteorologi untuk pewarnaan poligon Thiessen
const THIESSEN_COLOR_PALETTE = [
  "#3b82f6", // Blue
  "#06b6d4", // Cyan
  "#10b981", // Emerald
  "#84cc16", // Lime
  "#eab308", // Yellow
  "#f97316", // Orange
  "#8b5cf6", // Violet
  "#ec4899", // Pink
  "#14b8a6", // Teal
  "#6366f1", // Indigo
  "#f43f5e", // Rose
  "#0ea5e9", // Sky
  "#a855f7", // Purple
  "#22c55e", // Green
  "#d946ef", // Fuchsia
  "#f59e0b", // Amber
];

// ─── Utilitas Geometri & Sutherland-Hodgman Clipping ─────────────────────────

type Point2D = [number, number]; // [lng, lat]

/**
 * Menghitung luas poligon bola datar (Shoelace formula terproyeksi lintang rata-rata).
 * Konversi derajat bujur/lintang ke km pada latitude rata-rata Kebumen (-7.65°).
 */
export function calculatePolygonAreaKm2(polygon: Point2D[]): number {
  if (polygon.length < 3) return 0;

  const meanLatRad = (-7.65 * Math.PI) / 180;
  const kmPerDegLat = 110.574;
  const kmPerDegLng = 111.32 * Math.cos(meanLatRad);

  let area = 0;
  for (let i = 0; i < polygon.length; i++) {
    const j = (i + 1) % polygon.length;
    const x1 = polygon[i][0] * kmPerDegLng;
    const y1 = polygon[i][1] * kmPerDegLat;
    const x2 = polygon[j][0] * kmPerDegLng;
    const y2 = polygon[j][1] * kmPerDegLat;
    area += x1 * y2 - x2 * y1;
  }

  return Math.abs(area) / 2;
}

/**
 * Sutherland-Hodgman Polygon Clipping terhadap Half-Plane:
 * Half-plane ditentukan oleh titik tengah M dan vektor normal n menuju titik station P.
 * Titik Q berada di sisi 'dalam' jika (Q - M) . (P - Other) >= 0.
 */
function clipPolygonWithHalfPlane(
  polygon: Point2D[],
  stationP: Point2D,
  otherP: Point2D
): Point2D[] {
  if (polygon.length < 3) return polygon;

  // Garis bisektor memotong tegak lurus di titik tengah
  const midX = (stationP[0] + otherP[0]) / 2;
  const midY = (stationP[1] + otherP[1]) / 2;

  // Vektor normal mengarah ke stationP
  const nx = stationP[0] - otherP[0];
  const ny = stationP[1] - otherP[1];

  // Fungsi penentu apakah titik (qx, qy) berada di sisi stationP
  const isInside = (qx: number, qy: number): boolean => {
    return (qx - midX) * nx + (qy - midY) * ny >= 0;
  };

  // Titik perpotongan antara segmen (A -> B) dengan garis bisektor
  const computeIntersection = (A: Point2D, B: Point2D): Point2D => {
    const dx = B[0] - A[0];
    const dy = B[1] - A[1];
    const denominator = dx * nx + dy * ny;

    if (Math.abs(denominator) < 1e-12) {
      return A;
    }

    const t = ((midX - A[0]) * nx + (midY - A[1]) * ny) / denominator;
    return [A[0] + t * dx, A[1] + t * dy];
  };

  const output: Point2D[] = [];

  for (let i = 0; i < polygon.length; i++) {
    const current = polygon[i];
    const prev = polygon[(i + polygon.length - 1) % polygon.length];

    const currentInside = isInside(current[0], current[1]);
    const prevInside = isInside(prev[0], prev[1]);

    if (currentInside) {
      if (!prevInside) {
        output.push(computeIntersection(prev, current));
      }
      output.push(current);
    } else if (prevInside) {
      output.push(computeIntersection(prev, current));
    }
  }

  return output;
}

// ─── Engine Perhitungan Poligon Thiessen & Bobot Wilayah ─────────────────────

/**
 * Menghitung Poligon Thiessen dan Curah Hujan Rata-rata Wilayah
 * berdasarkan stasiun aktif di Kabupaten Kebumen.
 */
export function computeThiessenArealRainfall(
  stations: ThiessenStationInput[]
): ThiessenAnalysisResult {
  const activeStations = stations.filter((s) => s.active);

  if (activeStations.length === 0) {
    return {
      activeStationsCount: 0,
      totalAreaKm2: 0,
      arealRainfall: 0,
      cells: [],
      geoJson: { type: "FeatureCollection", features: [] },
      unweightedMeanRainfall: 0,
      maxRainfallStation: null,
      minRainfallStation: null,
    };
  }

  // Poligon batas awal bounding box Kebumen
  const basePolygon: Point2D[] = [
    [KEBUMEN_BBOX.minLng, KEBUMEN_BBOX.minLat],
    [KEBUMEN_BBOX.maxLng, KEBUMEN_BBOX.minLat],
    [KEBUMEN_BBOX.maxLng, KEBUMEN_BBOX.maxLat],
    [KEBUMEN_BBOX.minLng, KEBUMEN_BBOX.maxLat],
  ];

  // 1. Bentuk Poligon Voronoi untuk setiap stasiun aktif
  const rawCells: {
    station: ThiessenStationInput;
    polygon: Point2D[];
    rawArea: number;
  }[] = [];

  for (let i = 0; i < activeStations.length; i++) {
    const station = activeStations[i];
    const sPos: Point2D = [station.lng, station.lat];

    let currentPoly = [...basePolygon];

    for (let j = 0; j < activeStations.length; j++) {
      if (i === j) continue;
      const otherPos: Point2D = [activeStations[j].lng, activeStations[j].lat];
      currentPoly = clipPolygonWithHalfPlane(currentPoly, sPos, otherPos);
    }

    const rawArea = calculatePolygonAreaKm2(currentPoly);
    rawCells.push({
      station,
      polygon: currentPoly,
      rawArea: Math.max(0.1, rawArea),
    });
  }

  // 2. Normalisasi Luasan & Hitung Bobot wi
  const sumRawArea = rawCells.reduce((acc, c) => acc + c.rawArea, 0);

  let totalArea = 0;
  let arealRainfall = 0;
  let unweightedSum = 0;

  let maxStation: { name: string; rainfall: number } | null = null;
  let minStation: { name: string; rainfall: number } | null = null;

  const cells: ThiessenCell[] = [];
  const features: ThiessenGeoJsonFeature[] = [];

  for (let idx = 0; idx < rawCells.length; idx++) {
    const item = rawCells[idx];
    const weight = sumRawArea > 0 ? item.rawArea / sumRawArea : 1 / rawCells.length;
    const areaKm2 = Number((weight * KEBUMEN_TOTAL_AREA_KM2).toFixed(2));
    const rainfall = item.station.rainfall;
    const weightedRainfall = Number((weight * rainfall).toFixed(2));

    totalArea += areaKm2;
    arealRainfall += weight * rainfall;
    unweightedSum += rainfall;

    if (!maxStation || rainfall > maxStation.rainfall) {
      maxStation = { name: item.station.name, rainfall };
    }
    if (!minStation || rainfall < minStation.rainfall) {
      minStation = { name: item.station.name, rainfall };
    }

    // Pastikan poligon tertutup untuk format GeoJSON standar
    const closedPoly = [...item.polygon];
    if (
      closedPoly.length > 0 &&
      (closedPoly[0][0] !== closedPoly[closedPoly.length - 1][0] ||
        closedPoly[0][1] !== closedPoly[closedPoly.length - 1][1])
    ) {
      closedPoly.push([closedPoly[0][0], closedPoly[0][1]]);
    }

    const color = THIESSEN_COLOR_PALETTE[idx % THIESSEN_COLOR_PALETTE.length];
    const weightPercent = Number((weight * 100).toFixed(2));

    cells.push({
      stationId: item.station.id,
      stationName: item.station.name,
      lat: item.station.lat,
      lng: item.station.lng,
      areaKm2,
      weight: Number(weight.toFixed(4)),
      weightPercent,
      rainfall,
      weightedRainfall,
      polygonCoordinates: closedPoly,
    });

    features.push({
      type: "Feature",
      id: item.station.id,
      properties: {
        stationId: item.station.id,
        stationName: item.station.name,
        lat: item.station.lat,
        lng: item.station.lng,
        areaKm2,
        weight: Number(weight.toFixed(4)),
        weightPercentStr: `${weightPercent}%`,
        rainfall,
        weightedRainfall,
        fillColor: color,
      },
      geometry: {
        type: "Polygon",
        coordinates: [closedPoly],
      },
    });
  }

  return {
    activeStationsCount: activeStations.length,
    totalAreaKm2: Number(KEBUMEN_TOTAL_AREA_KM2.toFixed(1)),
    arealRainfall: Number(arealRainfall.toFixed(2)),
    cells: cells.sort((a, b) => b.weight - a.weight), // Urutkan dari bobot terbesar
    geoJson: {
      type: "FeatureCollection",
      features,
    },
    unweightedMeanRainfall: Number((unweightedSum / activeStations.length).toFixed(2)),
    maxRainfallStation: maxStation,
    minRainfallStation: minStation,
  };
}

/**
 * Mengonversi stasiun default Kebumen dari KEBUMEN_DEFAULT_STATIONS
 * menjadi format input Thiessen dengan nilai hujan realistis / default.
 */
export function getDefaultKebumenThiessenInputs(
  customRainfallMap?: Record<string, number>
): ThiessenStationInput[] {
  return KEBUMEN_DEFAULT_STATIONS.map((station) => {
    // Curah hujan kustom atau fallback acuan stasiun
    const stationRain = typeof station.rainfall === "number" ? station.rainfall : 0;
    const rain = customRainfallMap && customRainfallMap[station.id] !== undefined
      ? customRainfallMap[station.id]
      : stationRain;

    return {
      id: station.id,
      name: station.name,
      lat: station.lat,
      lng: station.lng,
      rainfall: rain,
      active: true,
    };
  });
}
