// lib/reanalysis/windRose.ts

export interface WindRoseBin {
  sector: string; // N, NNE, NE, ENE, E, ESE, SE, SSE, S, SSW, SW, WSW, W, WNW, NW, NNW
  speedBins: {
    range: string; // "0-2", "2-4", "4-6", "6-8", "8+" (in m/s)
    count: number;
    percentage: number;
  }[];
  totalCount: number;
  totalPercentage: number;
}

export const SECTORS = [
  "N", "NNE", "NE", "ENE", "E", "ESE", "SE", "SSE",
  "S", "SSW", "SW", "WSW", "W", "WNW", "NW", "NNW"
];

const SPEED_RANGES = [
  { label: "0 - 2 m/s", min: 0, max: 2 },
  { label: "2 - 4 m/s", min: 2, max: 4 },
  { label: "4 - 6 m/s", min: 4, max: 6 },
  { label: "6 - 8 m/s", min: 6, max: 8 },
  { label: "> 8 m/s", min: 8, max: Infinity }
];

export function calculateWindRose(
  windSpeeds: number[], // m/s
  windDirections: number[] // degrees (0-360)
): WindRoseBin[] {
  const totalPoints = Math.min(windSpeeds.length, windDirections.length);
  
  // Initialize bins
  const sectorData: Record<string, number[]> = {};
  for (const sector of SECTORS) {
    sectorData[sector] = [];
  }

  // Group speeds by sector
  for (let i = 0; i < totalPoints; i++) {
    const speed = windSpeeds[i];
    const dir = windDirections[i];

    if (!Number.isFinite(speed) || !Number.isFinite(dir)) continue;

    // Convert degrees to 16 compass sectors
    // 360 / 16 = 22.5 degrees per sector.
    // Shift by 11.25 degrees (half sector) so North is centered at 0/360.
    const normalizedDir = (dir + 11.25) % 360;
    const sectorIdx = Math.floor(normalizedDir / 22.5);
    const sector = SECTORS[sectorIdx] || "N";
    sectorData[sector].push(speed);
  }

  const result: WindRoseBin[] = SECTORS.map((sector) => {
    const speeds = sectorData[sector];
    const totalCount = speeds.length;

    const binnedSpeeds = SPEED_RANGES.map((r) => {
      const count = speeds.filter((s) => s >= r.min && s < r.max).length;
      const percentage = totalPoints > 0 ? (count / totalPoints) * 100 : 0;
      return {
        range: r.label,
        count,
        percentage: Math.round(percentage * 100) / 100
      };
    });

    const totalPercentage = totalPoints > 0 ? (totalCount / totalPoints) * 100 : 0;

    return {
      sector,
      speedBins: binnedSpeeds,
      totalCount,
      totalPercentage: Math.round(totalPercentage * 100) / 100
    };
  });

  return result;
}
