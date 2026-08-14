// lib/bias-correction/matching/spatialMatch.ts

export interface SpatialGridCell {
  gridLatitude: number;
  gridLongitude: number;
  gridResolutionDeg: number; // e.g. 0.25 deg for ERA5, 0.1 deg for ERA5-Land
  distanceKm: number;
  elevationMeters?: number;
  method: "nearest" | "bilinear";
}

/**
 * Calculates Haversine great-circle distance between two coordinates in km.
 */
export function calculateHaversineDistanceKm(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const R = 6371; // Earth radius in km
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return Number((R * c).toFixed(2));
}

/**
 * Resolves the nearest ERA5 / ERA5-Land grid point for an AWS station.
 */
export function resolveNearestGridCell(
  stationLat: number,
  stationLon: number,
  gridResolution: number = 0.1, // ERA5-Land default
  method: "nearest" | "bilinear" = "nearest"
): SpatialGridCell {
  const gridLat = Math.round(stationLat / gridResolution) * gridResolution;
  const gridLon = Math.round(stationLon / gridResolution) * gridResolution;
  const dist = calculateHaversineDistanceKm(stationLat, stationLon, gridLat, gridLon);

  return {
    gridLatitude: Number(gridLat.toFixed(4)),
    gridLongitude: Number(gridLon.toFixed(4)),
    gridResolutionDeg: gridResolution,
    distanceKm: dist,
    method,
  };
}
