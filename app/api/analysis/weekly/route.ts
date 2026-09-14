// app/api/analysis/weekly/route.ts
import { NextResponse } from "next/server";
import { fetchSensorDataByDateRange } from "@/lib/FetchingSensorData";
import {
  aggregateHourlyAnalysis,
  calculateParameterStats,
  calculateHistogramBins,
  generateHeatmapMatrix,
  getTimeParts,
  getWibTimeParts
} from "@/lib/climatology/aggregateAnalysis";
import { AnalysisStats } from "@/lib/climatology/analysisTypes";
type CacheEntry = {
  data: any;
  cachedAt: number;
};
const weeklyCache = new Map<string, CacheEntry>();
const CACHE_TTL_MS = 5 * 60 * 1000; // 5 menit TTL

export const revalidate = 60; // Cache for 1 minute

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const sensorId = searchParams.get("sensorId");
  const startDateStr = searchParams.get("startDate"); // YYYY-MM-DD
  const tzParam = searchParams.get("timezone")?.toUpperCase();
  const timezone: "WIB" | "UTC" = tzParam === "UTC" ? "UTC" : "WIB";
  const calibrationStr = searchParams.get("calibration");
  const daysStr = searchParams.get("days");
  const useCalibration = calibrationStr === "true";
  const days = daysStr ? parseInt(daysStr, 10) : 7;

  if (!sensorId) {
    return NextResponse.json({ error: "sensorId is required" }, { status: 400 });
  }

  const isRefresh = searchParams.get("refresh") === "true" || searchParams.has("_t") || searchParams.has("force");

  try {
    let yyyy: number;
    let mm: number;
    let dd: number;

    if (startDateStr && /^\d{4}-\d{2}-\d{2}$/.test(startDateStr)) {
      const [y, m, d] = startDateStr.split("-");
      yyyy = parseInt(y, 10);
      mm = parseInt(m, 10) - 1;
      dd = parseInt(d, 10);
    } else {
      const now = new Date();
      const offsetMs = timezone === "WIB" ? 7 * 3600 * 1000 : 0;
      const targetNow = new Date(now.getTime() + offsetMs);
      targetNow.setUTCDate(targetNow.getUTCDate() - (days - 1));
      yyyy = targetNow.getUTCFullYear();
      mm = targetNow.getUTCMonth();
      dd = targetNow.getUTCDate();
    }

    const baseUtcEpoch = Date.UTC(yyyy, mm, dd, 0, 0, 0, 0);
    const startTimestamp = timezone === "WIB" ? baseUtcEpoch - 7 * 3600 * 1000 : baseUtcEpoch;
    // Dynamic days = days * 24 * 60 * 60 * 1000 ms
    const endTimestamp = startTimestamp + days * 24 * 60 * 60 * 1000 - 1;

    const cacheKey = `${sensorId}:${startTimestamp}:${endTimestamp}:${useCalibration}:${timezone}`;
    if (!isRefresh) {
      const cached = weeklyCache.get(cacheKey);
      if (cached && Date.now() - cached.cachedAt < CACHE_TTL_MS) {
        return NextResponse.json(cached.data, {
          headers: {
            "Cache-Control": "public, s-maxage=60, stale-while-revalidate=120",
            "X-Cache": "HIT",
          },
        });
      }
    }

    console.log(`Weekly Analysis API Request: sensorId=${sensorId}, tz=${timezone}, startUTC=${new Date(startTimestamp).toISOString()}, endUTC=${new Date(endTimestamp).toISOString()}`);

    const rawPoints = await fetchSensorDataByDateRange(sensorId, startTimestamp, endTimestamp, useCalibration);
    
    // 1. Weekly Hourly points (168 points max)
    const hourlyWeekly = aggregateHourlyAnalysis(rawPoints, timezone);
    const points = hourlyWeekly.map((p) => {
      const wib = getTimeParts(p.timestamp, "WIB");
      const utc = getTimeParts(p.timestamp, "UTC");
      const activeTp = timezone === "WIB" ? wib : utc;
      return {
        ...p,
        dayLabel: activeTp.dayLabel,
        dayLabelWib: wib.dayLabel, // e.g. "20/06"
        dayLabelUtc: utc.dayLabel,
      };
    });

    // 2. Compute parameters stats
    const stats: AnalysisStats = {
      temperature: calculateParameterStats(rawPoints.map((p) => p.temperature)),
      humidity: calculateParameterStats(rawPoints.map((p) => p.humidity)),
      pressure: calculateParameterStats(rawPoints.map((p) => p.pressure)),
      rainfall: calculateParameterStats(rawPoints.map((p) => p.rainfall)),
      windSpeed: calculateParameterStats(rawPoints.map((p) => (p as any).windSpeed ?? (p as any).wind_speed ?? 0)),
      solarRadiation: calculateParameterStats(rawPoints.map((p) => p.lux ?? 0)),
    };

    // 3. Compute histogram bins & stats
    const histograms = {
      temperature: {
        bins: calculateHistogramBins(rawPoints.map((p) => p.temperature)),
        stats: stats.temperature,
      },
      humidity: {
        bins: calculateHistogramBins(rawPoints.map((p) => p.humidity)),
        stats: stats.humidity,
      },
      pressure: {
        bins: calculateHistogramBins(rawPoints.map((p) => p.pressure)),
        stats: stats.pressure,
      },
    };

    // 4. Generate diurnal heatmap matrices (24 hours x Days)
    const heatmaps = {
      temperature: generateHeatmapMatrix(rawPoints, (p) => p.temperature, timezone),
      humidity: generateHeatmapMatrix(rawPoints, (p) => p.humidity, timezone),
      pressure: generateHeatmapMatrix(rawPoints, (p) => p.pressure, timezone),
    };

    const startDateFormatted = getTimeParts(startTimestamp, timezone).ymd;
    const endDateFormatted = getTimeParts(endTimestamp, timezone).ymd;

    const payload = {
      sensorId,
      startDate: startDateFormatted,
      endDate: endDateFormatted,
      timezone,
      points,
      stats,
      histograms,
      heatmaps,
    };

    weeklyCache.set(cacheKey, { data: payload, cachedAt: Date.now() });
    if (weeklyCache.size > 50) {
      const oldestKey = weeklyCache.keys().next().value;
      if (oldestKey) weeklyCache.delete(oldestKey);
    }

    return NextResponse.json(payload, {
      headers: {
        "Cache-Control": isRefresh
          ? "no-store, no-cache, must-revalidate, proxy-revalidate"
          : "public, s-maxage=60, stale-while-revalidate=120",
      },
    });
  } catch (error: any) {
    console.error("Error in GET /api/analysis/weekly:", error);
    return NextResponse.json({ error: error.message || "Internal Server Error" }, { status: 500 });
  }
}
