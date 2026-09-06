// app/api/analysis/daily/route.ts
import { NextResponse } from "next/server";
import { fetchSensorDataByDateRange } from "@/lib/FetchingSensorData";
import {
  aggregateHourlyAnalysis,
  calculateParameterStats,
  generateDailyHeatmapMatrix
} from "@/lib/climatology/aggregateAnalysis";
import { AnalysisStats } from "@/lib/climatology/analysisTypes";
type CacheEntry = {
  data: any;
  cachedAt: number;
};
const dailyCache = new Map<string, CacheEntry>();
const CACHE_TTL_MS = 5 * 60 * 1000; // 5 menit TTL

export const revalidate = 60; // Cache for 1 minute

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const sensorId = searchParams.get("sensorId");
  const dateStr = searchParams.get("date"); // YYYY-MM-DD
  const calibrationStr = searchParams.get("calibration");
  const useCalibration = calibrationStr === "true";

  if (!sensorId) {
    return NextResponse.json({ error: "sensorId is required" }, { status: 400 });
  }

  const isRefresh = searchParams.get("refresh") === "true" || searchParams.has("_t") || searchParams.has("force");

  try {
    let targetDate = new Date();
    if (dateStr) {
      const parsed = Date.parse(dateStr);
      if (!isNaN(parsed)) {
        targetDate = new Date(parsed);
      }
    }

    const yyyy = targetDate.getUTCFullYear();
    const mm = targetDate.getUTCMonth();
    const dd = targetDate.getUTCDate();

    const startTimestamp = Date.UTC(yyyy, mm, dd, 0, 0, 0, 0);
    const endTimestamp = Date.UTC(yyyy, mm, dd, 23, 59, 59, 999);

    const cacheKey = `${sensorId}:${startTimestamp}:${endTimestamp}:${useCalibration}`;
    if (!isRefresh) {
      const cached = dailyCache.get(cacheKey);
      if (cached && Date.now() - cached.cachedAt < CACHE_TTL_MS) {
        return NextResponse.json(cached.data, {
          headers: {
            "Cache-Control": "public, s-maxage=60, stale-while-revalidate=120",
            "X-Cache": "HIT",
          },
        });
      }
    }

    const rawPoints = await fetchSensorDataByDateRange(sensorId, startTimestamp, endTimestamp, useCalibration);
    const points = aggregateHourlyAnalysis(rawPoints);

    const stats: AnalysisStats = {
      temperature: calculateParameterStats(rawPoints.map((p) => p.temperature)),
      humidity: calculateParameterStats(rawPoints.map((p) => p.humidity)),
      pressure: calculateParameterStats(rawPoints.map((p) => p.pressure)),
    };

    const heatmaps = {
      temperature: generateDailyHeatmapMatrix(rawPoints, (p) => p.temperature),
      humidity: generateDailyHeatmapMatrix(rawPoints, (p) => p.humidity),
      pressure: generateDailyHeatmapMatrix(rawPoints, (p) => p.pressure),
    };
    const formattedDate = `${yyyy}-${String(mm + 1).padStart(2, "0")}-${String(dd).padStart(2, "0")}`;

    const payload = {
      sensorId,
      date: formattedDate,
      points,
      stats,
      heatmaps,
    };

    dailyCache.set(cacheKey, { data: payload, cachedAt: Date.now() });
    if (dailyCache.size > 50) {
      const oldestKey = dailyCache.keys().next().value;
      if (oldestKey) dailyCache.delete(oldestKey);
    }

    return NextResponse.json(payload, {
      headers: {
        "Cache-Control": isRefresh
          ? "no-store, no-cache, must-revalidate, proxy-revalidate"
          : "public, s-maxage=60, stale-while-revalidate=120",
      },
    });
  } catch (error: any) {
    console.error("Error in GET /api/analysis/daily:", error);
    return NextResponse.json({ error: error.message || "Internal Server Error" }, { status: 500 });
  }
}
