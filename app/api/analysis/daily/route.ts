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
  const tzParam = searchParams.get("timezone")?.toUpperCase();
  const timezone: "WIB" | "UTC" = tzParam === "UTC" ? "UTC" : "WIB";
  const calibrationStr = searchParams.get("calibration");
  const useCalibration = calibrationStr === "true";

  if (!sensorId) {
    return NextResponse.json({ error: "sensorId is required" }, { status: 400 });
  }

  const isRefresh = searchParams.get("refresh") === "true" || searchParams.has("_t") || searchParams.has("force");

  try {
    let yyyy: number;
    let mm: number;
    let dd: number;

    if (dateStr && /^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
      const [y, m, d] = dateStr.split("-");
      yyyy = parseInt(y, 10);
      mm = parseInt(m, 10) - 1;
      dd = parseInt(d, 10);
    } else {
      const now = new Date();
      const offsetMs = timezone === "WIB" ? 7 * 3600 * 1000 : 0;
      const targetNow = new Date(now.getTime() + offsetMs);
      yyyy = targetNow.getUTCFullYear();
      mm = targetNow.getUTCMonth();
      dd = targetNow.getUTCDate();
    }

    // Hitung startTimestamp dan endTimestamp (dalam UTC Epoch)
    // WIB: 00:00:00 WIB = Date.UTC(yyyy, mm, dd, 0, 0, 0) - 7 jam
    // UTC: 00:00:00 UTC = Date.UTC(yyyy, mm, dd, 0, 0, 0)
    const baseUtcEpoch = Date.UTC(yyyy, mm, dd, 0, 0, 0, 0);
    const startTimestamp = timezone === "WIB" ? baseUtcEpoch - 7 * 3600 * 1000 : baseUtcEpoch;
    const endTimestamp = startTimestamp + 24 * 3600 * 1000 - 1;

    const cacheKey = `${sensorId}:${startTimestamp}:${endTimestamp}:${useCalibration}:${timezone}`;
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
    const points = aggregateHourlyAnalysis(rawPoints, timezone);

    const stats: AnalysisStats = {
      temperature: calculateParameterStats(rawPoints.map((p) => p.temperature)),
      humidity: calculateParameterStats(rawPoints.map((p) => p.humidity)),
      pressure: calculateParameterStats(rawPoints.map((p) => p.pressure)),
    };

    const heatmaps = {
      temperature: generateDailyHeatmapMatrix(rawPoints, (p) => p.temperature, timezone),
      humidity: generateDailyHeatmapMatrix(rawPoints, (p) => p.humidity, timezone),
      pressure: generateDailyHeatmapMatrix(rawPoints, (p) => p.pressure, timezone),
    };
    const formattedDate = `${yyyy}-${String(mm + 1).padStart(2, "0")}-${String(dd).padStart(2, "0")}`;

    const payload = {
      sensorId,
      date: formattedDate,
      timezone,
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
