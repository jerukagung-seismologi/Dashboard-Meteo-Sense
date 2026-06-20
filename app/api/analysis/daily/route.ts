// app/api/analysis/daily/route.ts
import { NextResponse } from "next/server";
import { fetchSensorDataByDateRange } from "@/lib/FetchingSensorData";
import {
  aggregateHourlyAnalysis,
  calculateParameterStats,
  generateDailyHeatmapMatrix
} from "@/lib/climatology/aggregateAnalysis";
import { AnalysisStats } from "@/lib/climatology/analysisTypes";

export const revalidate = 60; // Cache for 1 minute

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const sensorId = searchParams.get("sensorId");
  const dateStr = searchParams.get("date"); // YYYY-MM-DD

  if (!sensorId) {
    return NextResponse.json({ error: "sensorId is required" }, { status: 400 });
  }

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

    const rawPoints = await fetchSensorDataByDateRange(sensorId, startTimestamp, endTimestamp);
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

    return NextResponse.json({
      sensorId,
      date: formattedDate,
      points,
      stats,
      heatmaps,
    });
  } catch (error: any) {
    console.error("Error in GET /api/analysis/daily:", error);
    return NextResponse.json({ error: error.message || "Internal Server Error" }, { status: 500 });
  }
}
