// app/api/analysis/weekly/route.ts
import { NextResponse } from "next/server";
import { fetchSensorDataByDateRange } from "@/lib/FetchingSensorData";
import {
  aggregateHourlyAnalysis,
  calculateParameterStats,
  calculateHistogramBins,
  generateHeatmapMatrix,
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
  const calibrationStr = searchParams.get("calibration");
  const daysStr = searchParams.get("days");
  const useCalibration = calibrationStr === "true";
  const days = daysStr ? parseInt(daysStr, 10) : 7;

  if (!sensorId) {
    return NextResponse.json({ error: "sensorId is required" }, { status: 400 });
  }

  const isRefresh = searchParams.get("refresh") === "true" || searchParams.has("_t") || searchParams.has("force");

  try {
    let targetDate = new Date();
    if (startDateStr) {
      const parsed = Date.parse(startDateStr);
      if (!isNaN(parsed)) {
        targetDate = new Date(parsed);
      }
    } else {
      // Default to 6 days ago (for a 7-day period ending today)
      targetDate.setUTCDate(targetDate.getUTCDate() - 6);
    }

    const yyyy = targetDate.getUTCFullYear();
    const mm = targetDate.getUTCMonth();
    const dd = targetDate.getUTCDate();

    const startTimestamp = Date.UTC(yyyy, mm, dd, 0, 0, 0, 0);
    // Dynamic days = days * 24 * 60 * 60 * 1000 ms
    const endTimestamp = startTimestamp + days * 24 * 60 * 60 * 1000 - 1;

    const cacheKey = `${sensorId}:${startTimestamp}:${endTimestamp}:${useCalibration}`;
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

    console.log(`Weekly Analysis API Request: sensorId=${sensorId}, startUTC=${new Date(startTimestamp).toISOString()}, endUTC=${new Date(endTimestamp).toISOString()}`);

    const rawPoints = await fetchSensorDataByDateRange(sensorId, startTimestamp, endTimestamp, useCalibration);
    
    // 1. Weekly Hourly points (168 points max)
    const hourlyWeekly = aggregateHourlyAnalysis(rawPoints);
    const points = hourlyWeekly.map((p) => {
      const wib = getWibTimeParts(p.timestamp);
      return {
        ...p,
        dayLabelWib: wib.dayLabel, // e.g. "20/06"
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

    // 3. Compute histogram bins
    const histograms = {
      temperature: calculateHistogramBins(rawPoints.map((p) => p.temperature)),
      humidity: calculateHistogramBins(rawPoints.map((p) => p.humidity)),
      pressure: calculateHistogramBins(rawPoints.map((p) => p.pressure)),
    };

    // 4. Generate diurnal heatmap matrices (24 hours x Days)
    const heatmaps = {
      temperature: generateHeatmapMatrix(rawPoints, (p) => p.temperature),
      humidity: generateHeatmapMatrix(rawPoints, (p) => p.humidity),
      pressure: generateHeatmapMatrix(rawPoints, (p) => p.pressure),
    };

    const startDateFormatted = new Date(startTimestamp).toISOString().substring(0, 10);
    const endDateFormatted = new Date(endTimestamp).toISOString().substring(0, 10);

    const payload = {
      sensorId,
      startDate: startDateFormatted,
      endDate: endDateFormatted,
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
