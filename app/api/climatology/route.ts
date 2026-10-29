// app/api/climatology/route.ts
import { NextResponse } from "next/server";
import { fetchSensorDataByDateRange } from "@/lib/FetchingSensorData";
import { buildUTCDateRange } from "@/lib/climatology/dateRangeBuilder";
import { aggregateHourly } from "@/lib/climatology/aggregateHourly";
import { aggregateDaily } from "@/lib/climatology/aggregateDaily";
import { calculateStats } from "@/lib/climatology/calculateStatistics";
type ClimatologyCacheEntry = {
  data: any;
  cachedAt: number;
};
const climCache = new Map<string, ClimatologyCacheEntry>();
const MAX_CLIM_CACHE = 50;
const CLIM_TTL_MS = 5 * 60 * 1000; // 5 mins

export const revalidate = 60; // Cache for 1 minute

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const sensorId = searchParams.get("sensorId");
  const preset = searchParams.get("preset"); // "daily" | "weekly" | "monthly" | "yearly"
  const monthStr = searchParams.get("month");
  const yearStr = searchParams.get("year");
  const dasarianStr = searchParams.get("dasarian");
  const calibrationStr = searchParams.get("calibration");
  const useCalibration = calibrationStr === "true";

  if (!sensorId) {
    return NextResponse.json({ error: "sensorId is required" }, { status: 400 });
  }

  if (!preset) {
    return NextResponse.json({ error: "preset is required" }, { status: 400 });
  }

  const isRefresh = searchParams.get("refresh") === "true" || searchParams.has("_t") || searchParams.has("force");

  try {
    const year = yearStr ? Number(yearStr) : undefined;
    const month = monthStr ? Number(monthStr) : undefined;
    const dasarian = dasarianStr ? Number(dasarianStr) : undefined;

    const cacheKey = `${sensorId}:${preset}:${year}:${month}:${dasarian}:${useCalibration}`;
    if (!isRefresh) {
      const cached = climCache.get(cacheKey);
      if (cached && Date.now() - cached.cachedAt < CLIM_TTL_MS) {
        return NextResponse.json(cached.data, {
          headers: {
            "Cache-Control": "public, s-maxage=300, stale-while-revalidate=600",
            "X-Cache": "HIT",
          },
        });
      }
    }

    // Get strict UTC date boundaries
    const { start, end } = buildUTCDateRange(preset, year, month, dasarian);

    console.log(`Climatology Server Query: sensorId=${sensorId}, preset=${preset}, startUTC=${start.toISOString()}, endUTC=${end.toISOString()}`);

    // Buffer fetch start by 15 minutes to guarantee capturing the previous reading across the 00:00 UTC day boundary
    const fetchStart = start.getTime() - 15 * 60 * 1000;
    const resolution = preset === "yearly" ? "hourly" : undefined;
    const rawPoints = await fetchSensorDataByDateRange(
      sensorId,
      fetchStart,
      end.getTime(),
      useCalibration,
      resolution
    );

    // Aggregate data and filter strictly to requested time window
    const dailyPoints = aggregateDaily(rawPoints).filter(
      (p) => p.timestamp >= start.getTime() && p.timestamp <= end.getTime()
    );
    const hourlyPoints = aggregateHourly(rawPoints).filter(
      (p) => p.timestamp >= start.getTime() && p.timestamp <= end.getTime()
    );

    const isHourly = preset === "daily";
    const points = isHourly ? hourlyPoints : dailyPoints;

    // Filter points to the exact period for statistical evaluation
    const periodRawPoints = rawPoints.filter(
      (p) => p.timestamp >= start.getTime() && p.timestamp <= end.getTime()
    );

    // Calculate descriptive statistics on the server side
    const stats = calculateStats(periodRawPoints, dailyPoints, hourlyPoints, isHourly);

    const payload = {
      sensorId,
      preset,
      startDate: start.toISOString(),
      endDate: end.toISOString(),
      points,
      stats,
    };

    if (climCache.size >= MAX_CLIM_CACHE) {
      const oldestKey = climCache.keys().next().value;
      if (oldestKey) climCache.delete(oldestKey);
    }
    climCache.set(cacheKey, { data: payload, cachedAt: Date.now() });

    return NextResponse.json(
      payload,
      {
        headers: {
          "Cache-Control": isRefresh
            ? "no-store, no-cache, must-revalidate, proxy-revalidate"
            : "public, s-maxage=300, stale-while-revalidate=600",
        },
      }
    );
  } catch (error: any) {
    console.error("Error in GET /api/climatology:", error);
    return NextResponse.json({ error: error.message || "Internal Server Error" }, { status: 500 });
  }
}
