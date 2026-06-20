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

export const revalidate = 60; // Cache for 1 minute

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const sensorId = searchParams.get("sensorId");
  const startDateStr = searchParams.get("startDate"); // YYYY-MM-DD

  if (!sensorId) {
    return NextResponse.json({ error: "sensorId is required" }, { status: 400 });
  }

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
    // 7 days = 7 * 24 * 60 * 60 * 1000 ms
    const endTimestamp = startTimestamp + 7 * 24 * 60 * 60 * 1000 - 1;

    console.log(`Weekly Analysis API Request: sensorId=${sensorId}, startUTC=${new Date(startTimestamp).toISOString()}, endUTC=${new Date(endTimestamp).toISOString()}`);

    const rawPoints = await fetchSensorDataByDateRange(sensorId, startTimestamp, endTimestamp);
    
    // 1. Weekly Hourly points (168 points max)
    const hourlyWeekly = aggregateHourlyAnalysis(rawPoints);
    const points = hourlyWeekly.map((p) => {
      const wib = getWibTimeParts(p.timestamp);
      return {
        ...p,
        dayLabelWib: wib.dayLabel, // e.g. "20/06"
      };
    });

    // 2. Summary stats for the 7 days
    const tempValues = rawPoints.map((p) => p.temperature).filter(Number.isFinite);
    const humValues = rawPoints.map((p) => p.humidity).filter(Number.isFinite);
    const pressValues = rawPoints.map((p) => p.pressure).filter(Number.isFinite);

    const tempStats = calculateParameterStats(tempValues);
    const humStats = calculateParameterStats(humValues);
    const pressStats = calculateParameterStats(pressValues);

    const stats: AnalysisStats = {
      temperature: tempStats,
      humidity: humStats,
      pressure: pressStats,
    };

    // 3. Pre-bin histograms (10 bins each)
    const histograms = {
      temperature: {
        bins: calculateHistogramBins(tempValues, 10),
        stats: tempStats,
      },
      humidity: {
        bins: calculateHistogramBins(humValues, 10),
        stats: humStats,
      },
      pressure: {
        bins: calculateHistogramBins(pressValues, 10),
        stats: pressStats,
      },
    };

    // 4. Heatmaps: mapping day category and hour:minute category
    const heatmaps = {
      temperature: generateHeatmapMatrix(rawPoints, (p) => p.temperature),
      humidity: generateHeatmapMatrix(rawPoints, (p) => p.humidity),
      pressure: generateHeatmapMatrix(rawPoints, (p) => p.pressure),
    };

    const startDateFormatted = new Date(startTimestamp).toISOString().substring(0, 10);
    const endDateFormatted = new Date(endTimestamp).toISOString().substring(0, 10);

    return NextResponse.json({
      sensorId,
      startDate: startDateFormatted,
      endDate: endDateFormatted,
      points,
      stats,
      histograms,
      heatmaps,
    });
  } catch (error: any) {
    console.error("Error in GET /api/analysis/weekly:", error);
    return NextResponse.json({ error: error.message || "Internal Server Error" }, { status: 500 });
  }
}
