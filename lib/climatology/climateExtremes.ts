// lib/climatology/climateExtremes.ts
import { AggregatedPoint } from "@/lib/climatology/climatologyTypes";
import type { ClimatologySummary } from "@/lib/reanalysis/climatology";

export interface ExtremeEvent {
  value: number;
  dateStr: string;
  timestamp?: number;
}

export interface ClimateExtremesResult {
  temperature: {
    maxObserved: ExtremeEvent | null;
    minObserved: ExtremeEvent | null;
    maxEra5: ExtremeEvent | null;
    minEra5: ExtremeEvent | null;
    extremeHotDaysCount: number; // Tmax >= 35°C
    hotDaysCount: number;        // Tmax >= 33°C
    coldDaysCount: number;       // Tmin <= 20°C
    maxDiurnalRange: ExtremeEvent | null; // Max (Tmax - Tmin)
  };
  rainfall: {
    maxDailyRain: ExtremeEvent | null;
    maxEra5Daily: ExtremeEvent | null;
    totalRain: number;
    consecutiveDryDays: number; // max consecutive days rain < 1mm
    consecutiveWetDays: number; // max consecutive days rain >= 1mm
    heavyRainDaysCount: number;     // rain >= 50mm
    veryHeavyRainDaysCount: number; // rain >= 100mm
    extremeRainDaysCount: number;   // rain >= 150mm
    bmkgCategory: "Ringan" | "Sedang" | "Lebat" | "Sangat Lebat" | "Ekstrem" | "Nihil";
  };
  wind: {
    maxSpeedEra5: (ExtremeEvent & { kmh: number }) | null;
    maxGustEra5: (ExtremeEvent & { kmh: number }) | null;
    isHighWindWarning: boolean; // gust >= 12.8 m/s (25 knots)
  };
  pressure: {
    minObserved: ExtremeEvent | null;
    maxObserved: ExtremeEvent | null;
    minEra5: ExtremeEvent | null;
    maxEra5: ExtremeEvent | null;
    isLowPressureTrough: boolean; // Pmin < 1008 hPa
  };
  humidity: {
    minObserved: ExtremeEvent | null;
    maxObserved: ExtremeEvent | null;
    minEra5: ExtremeEvent | null;
    isSevereDryAir: boolean; // RHmin < 45%
  };
}

export function computeClimateExtremes(
  points: AggregatedPoint[],
  era5Data: (ClimatologySummary & { sourceModel?: string }) | null,
  startDateMs?: number,
  endDateMs?: number
): ClimateExtremesResult {
  const result: ClimateExtremesResult = {
    temperature: {
      maxObserved: null,
      minObserved: null,
      maxEra5: null,
      minEra5: null,
      extremeHotDaysCount: 0,
      hotDaysCount: 0,
      coldDaysCount: 0,
      maxDiurnalRange: null,
    },
    rainfall: {
      maxDailyRain: null,
      maxEra5Daily: null,
      totalRain: 0,
      consecutiveDryDays: 0,
      consecutiveWetDays: 0,
      heavyRainDaysCount: 0,
      veryHeavyRainDaysCount: 0,
      extremeRainDaysCount: 0,
      bmkgCategory: "Nihil",
    },
    wind: {
      maxSpeedEra5: null,
      maxGustEra5: null,
      isHighWindWarning: false,
    },
    pressure: {
      minObserved: null,
      maxObserved: null,
      minEra5: null,
      maxEra5: null,
      isLowPressureTrough: false,
    },
    humidity: {
      minObserved: null,
      maxObserved: null,
      minEra5: null,
      isSevereDryAir: false,
    },
  };

  // 1. Process Station Observations (points)
  if (points && points.length > 0) {
    let tMax = -Infinity;
    let tMaxPt: AggregatedPoint | null = null;
    let tMin = Infinity;
    let tMinPt: AggregatedPoint | null = null;

    let pMin = Infinity;
    let pMinPt: AggregatedPoint | null = null;
    let pMax = -Infinity;
    let pMaxPt: AggregatedPoint | null = null;

    let hMin = Infinity;
    let hMinPt: AggregatedPoint | null = null;
    let hMax = -Infinity;
    let hMaxPt: AggregatedPoint | null = null;

    let rMax = 0;
    let rMaxPt: AggregatedPoint | null = null;
    let totalRain = 0;

    let curDry = 0;
    let maxDry = 0;
    let curWet = 0;
    let maxWet = 0;

    let maxDtr = 0;
    let maxDtrPt: AggregatedPoint | null = null;

    points.forEach((p) => {
      // Temperature Extremes
      if (Number.isFinite(p.temperatureMax)) {
        if (p.temperatureMax > tMax) {
          tMax = p.temperatureMax;
          tMaxPt = p;
        }
        if (p.temperatureMax >= 35) {
          result.temperature.extremeHotDaysCount++;
        }
        if (p.temperatureMax >= 33) {
          result.temperature.hotDaysCount++;
        }
      }

      if (Number.isFinite(p.temperatureMin)) {
        if (p.temperatureMin < tMin) {
          tMin = p.temperatureMin;
          tMinPt = p;
        }
        if (p.temperatureMin <= 20) {
          result.temperature.coldDaysCount++;
        }
      }

      if (Number.isFinite(p.temperatureMax) && Number.isFinite(p.temperatureMin)) {
        const dtr = p.temperatureMax - p.temperatureMin;
        if (dtr > maxDtr) {
          maxDtr = dtr;
          maxDtrPt = p;
        }
      }

      // Pressure Extremes
      if (Number.isFinite(p.pressureMin) && p.pressureMin > 800) {
        if (p.pressureMin < pMin) {
          pMin = p.pressureMin;
          pMinPt = p;
        }
      }
      if (Number.isFinite(p.pressureMax) && p.pressureMax > 800) {
        if (p.pressureMax > pMax) {
          pMax = p.pressureMax;
          pMaxPt = p;
        }
      }

      // Humidity Extremes
      if (Number.isFinite(p.humidityMin)) {
        if (p.humidityMin < hMin) {
          hMin = p.humidityMin;
          hMinPt = p;
        }
      }
      if (Number.isFinite(p.humidityMax)) {
        if (p.humidityMax > hMax) {
          hMax = p.humidityMax;
          hMaxPt = p;
        }
      }

      // Rainfall Extremes
      const r = p.rainfallAccumulation || 0;
      totalRain += r;
      if (r > rMax) {
        rMax = r;
        rMaxPt = p;
      }

      if (r >= 150) {
        result.rainfall.extremeRainDaysCount++;
      } else if (r >= 100) {
        result.rainfall.veryHeavyRainDaysCount++;
      } else if (r >= 50) {
        result.rainfall.heavyRainDaysCount++;
      }

      // Consecutive Dry / Wet Days
      if (r < 1.0) {
        curDry++;
        curWet = 0;
        if (curDry > maxDry) maxDry = curDry;
      } else {
        curWet++;
        curDry = 0;
        if (curWet > maxWet) maxWet = curWet;
      }
    });

    const formatDateStr = (ts: number) => {
      const d = new Date(ts);
      return d.toLocaleDateString("id-ID", {
        timeZone: "Asia/Jakarta",
        day: "2-digit",
        month: "short",
        year: "numeric",
      });
    };

    if (tMaxPt) {
      result.temperature.maxObserved = {
        value: Number((tMaxPt as any).temperatureMax.toFixed(2)),
        dateStr: formatDateStr((tMaxPt as any).timestamp),
        timestamp: (tMaxPt as any).timestamp,
      };
    }
    if (tMinPt) {
      result.temperature.minObserved = {
        value: Number((tMinPt as any).temperatureMin.toFixed(2)),
        dateStr: formatDateStr((tMinPt as any).timestamp),
        timestamp: (tMinPt as any).timestamp,
      };
    }
    if (maxDtrPt) {
      result.temperature.maxDiurnalRange = {
        value: Number(maxDtr.toFixed(2)),
        dateStr: formatDateStr((maxDtrPt as any).timestamp),
        timestamp: (maxDtrPt as any).timestamp,
      };
    }

    if (pMinPt) {
      result.pressure.minObserved = {
        value: Number((pMinPt as any).pressureMin.toFixed(2)),
        dateStr: formatDateStr((pMinPt as any).timestamp),
        timestamp: (pMinPt as any).timestamp,
      };
      result.pressure.isLowPressureTrough = pMin < 1008;
    }
    if (pMaxPt) {
      result.pressure.maxObserved = {
        value: Number((pMaxPt as any).pressureMax.toFixed(2)),
        dateStr: formatDateStr((pMaxPt as any).timestamp),
        timestamp: (pMaxPt as any).timestamp,
      };
    }

    if (hMinPt) {
      result.humidity.minObserved = {
        value: Number((hMinPt as any).humidityMin.toFixed(2)),
        dateStr: formatDateStr((hMinPt as any).timestamp),
        timestamp: (hMinPt as any).timestamp,
      };
      result.humidity.isSevereDryAir = hMin < 45;
    }
    if (hMaxPt) {
      result.humidity.maxObserved = {
        value: Number((hMaxPt as any).humidityMax.toFixed(2)),
        dateStr: formatDateStr((hMaxPt as any).timestamp),
        timestamp: (hMaxPt as any).timestamp,
      };
    }

    result.rainfall.totalRain = Number(totalRain.toFixed(2));
    result.rainfall.consecutiveDryDays = maxDry;
    result.rainfall.consecutiveWetDays = maxWet;

    if (rMaxPt) {
      result.rainfall.maxDailyRain = {
        value: Number((rMaxPt as any).rainfallAccumulation.toFixed(2)),
        dateStr: formatDateStr((rMaxPt as any).timestamp),
        timestamp: (rMaxPt as any).timestamp,
      };

      if (rMax >= 150) result.rainfall.bmkgCategory = "Ekstrem";
      else if (rMax >= 100) result.rainfall.bmkgCategory = "Sangat Lebat";
      else if (rMax >= 50) result.rainfall.bmkgCategory = "Lebat";
      else if (rMax >= 20) result.rainfall.bmkgCategory = "Sedang";
      else if (rMax > 0.5) result.rainfall.bmkgCategory = "Ringan";
      else result.rainfall.bmkgCategory = "Nihil";
    }
  }

  // 2. Process ERA5 Reanalysis Extremes
  if (era5Data) {
    // If stats are available
    if (era5Data.stats) {
      const { temperature, humidity, pressure, rain, windSpeed } = era5Data.stats;

      if (temperature) {
        result.temperature.maxEra5 = {
          value: Number(temperature.max.toFixed(2)),
          dateStr: "Rekor ERA5",
        };
        result.temperature.minEra5 = {
          value: Number(temperature.min.toFixed(2)),
          dateStr: "Rekor ERA5",
        };
      }

      if (pressure) {
        result.pressure.minEra5 = {
          value: Number(pressure.min.toFixed(2)),
          dateStr: "Rekor ERA5",
        };
        result.pressure.maxEra5 = {
          value: Number(pressure.max.toFixed(2)),
          dateStr: "Rekor ERA5",
        };
      }

      if (humidity) {
        result.humidity.minEra5 = {
          value: Number(humidity.min.toFixed(2)),
          dateStr: "Rekor ERA5",
        };
      }

      if (rain) {
        result.rainfall.maxEra5Daily = {
          value: Number(rain.max.toFixed(2)),
          dateStr: "Rekor ERA5",
        };
      }

      if (windSpeed) {
        const ms = Number(windSpeed.max.toFixed(2));
        result.wind.maxSpeedEra5 = {
          value: ms,
          kmh: Number((ms * 3.6).toFixed(1)),
          dateStr: "Rekor ERA5",
        };
      }
    }

    // Check hourly series for precise hourly gust & peak wind
    if (era5Data.hourly) {
      const { times, temperature, windGust, windSpeed, rain, pressure, humidity } = era5Data.hourly;
      const len = times ? times.length : 0;

      let topGust = 0;
      let topGustIdx = -1;
      let topWind = 0;
      let topWindIdx = -1;
      let topRain = 0;
      let topRainIdx = -1;
      let topTemp = -Infinity;
      let topTempIdx = -1;
      let botTemp = Infinity;
      let botTempIdx = -1;
      let botPress = Infinity;
      let botPressIdx = -1;

      for (let i = 0; i < len; i++) {
        // Filter by date range if provided
        if (startDateMs && endDateMs && times[i]) {
          const tMs = new Date(times[i]).getTime();
          if (tMs < startDateMs || tMs > endDateMs) continue;
        }

        if (windGust && windGust[i] != null && windGust[i] > topGust) {
          topGust = windGust[i];
          topGustIdx = i;
        }
        if (windSpeed && windSpeed[i] != null && windSpeed[i] > topWind) {
          topWind = windSpeed[i];
          topWindIdx = i;
        }
        if (rain && rain[i] != null && rain[i] > topRain) {
          topRain = rain[i];
          topRainIdx = i;
        }
        if (temperature && temperature[i] != null) {
          if (temperature[i] > topTemp) {
            topTemp = temperature[i];
            topTempIdx = i;
          }
          if (temperature[i] < botTemp) {
            botTemp = temperature[i];
            botTempIdx = i;
          }
        }
        if (pressure && pressure[i] != null && pressure[i] > 800) {
          if (pressure[i] < botPress) {
            botPress = pressure[i];
            botPressIdx = i;
          }
        }
      }

      const formatIso = (iso: string) => {
        try {
          const d = new Date(iso);
          return d.toLocaleDateString("id-ID", {
            timeZone: "Asia/Jakarta",
            day: "2-digit",
            month: "short",
            hour: "2-digit",
            minute: "2-digit",
          }) + " WIB";
        } catch {
          return iso;
        }
      };

      if (topGustIdx >= 0) {
        result.wind.maxGustEra5 = {
          value: Number(topGust.toFixed(2)),
          kmh: Number((topGust * 3.6).toFixed(1)),
          dateStr: formatIso(times[topGustIdx]),
        };
        result.wind.isHighWindWarning = topGust >= 12.8; // 25 knots
      }

      if (topWindIdx >= 0) {
        result.wind.maxSpeedEra5 = {
          value: Number(topWind.toFixed(2)),
          kmh: Number((topWind * 3.6).toFixed(1)),
          dateStr: formatIso(times[topWindIdx]),
        };
      }

      if (topTempIdx >= 0) {
        result.temperature.maxEra5 = {
          value: Number(topTemp.toFixed(2)),
          dateStr: formatIso(times[topTempIdx]),
        };
      }
      if (botTempIdx >= 0) {
        result.temperature.minEra5 = {
          value: Number(botTemp.toFixed(2)),
          dateStr: formatIso(times[botTempIdx]),
        };
      }
      if (botPressIdx >= 0) {
        result.pressure.minEra5 = {
          value: Number(botPress.toFixed(2)),
          dateStr: formatIso(times[botPressIdx]),
        };
      }
    }
  }

  return result;
}
