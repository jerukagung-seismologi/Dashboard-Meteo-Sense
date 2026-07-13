import { NextResponse } from "next/server";
import { fetchSensorDataByDateRange } from "@/lib/FetchingSensorData";
import { aggregateDailyUTC } from "@/lib/weatherUtils";

export const revalidate = 60; // Cache for 1 minute

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const sensorId = searchParams.get("sensorId");
  const dateStr = searchParams.get("date"); // YYYY-MM-DD
  const calibrationStr = searchParams.get("calibration");
  const useCalibration = calibrationStr !== "false";

  if (!sensorId || !dateStr) {
    return NextResponse.json({ error: "sensorId and date are required" }, { status: 400 });
  }

  try {
    const parts = dateStr.split("-");
    if (parts.length !== 3) {
      return NextResponse.json({ error: "Invalid date format. Expected YYYY-MM-DD" }, { status: 400 });
    }

    const yyyy = parseInt(parts[0], 10);
    const mm = parseInt(parts[1], 10) - 1;
    const dd = parseInt(parts[2], 10);

    // Astronomical/Meteorological Day in UTC (00:00 to 23:59:59)
    const startTimestamp = Date.UTC(yyyy, mm, dd, 0, 0, 0, 0);
    const endTimestamp = Date.UTC(yyyy, mm, dd, 23, 59, 59, 999);

    const rawPoints = await fetchSensorDataByDateRange(sensorId, startTimestamp, endTimestamp, useCalibration);

    if (!rawPoints || rawPoints.length === 0) {
      return NextResponse.json({
        dayRecord: null,
        hourlyData: []
      });
    }

    // Server-side aggregation for daily metrics
    const dailyRecords = aggregateDailyUTC(rawPoints);
    const dayRecord = dailyRecords.length > 0 ? dailyRecords[0] : null;

    // Server-side aggregation for hourly charts (Suhu & Titik Embun)
    const byHour = new Map<string, any[]>();
    for (const r of rawPoints) {
      const d = new Date(r.timestamp);
      // Hour key in UTC
      const hh = String(d.getUTCHours()).padStart(2, "0");
      const key = `${dateStr}T${hh}`;
      if (!byHour.has(key)) byHour.set(key, []);
      byHour.get(key)!.push(r);
    }

    const FMT_YMD_UTC = new Intl.DateTimeFormat("en-CA", {
      timeZone: "UTC",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    });

    const hourlyData = Array.from(byHour.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([hourKey, items]) => {
        const n = items.length || 1;
        const sum = (arr: number[]) => arr.filter(Number.isFinite).reduce((a, b) => a + b, 0);
        return {
          hourKey,
          temperatureAvg: sum(items.map((i: any) => i.temperature)) / n,
          dewPointAvg: sum(items.map((i: any) => i.dew ?? 0)) / n,
          humidityAvg: sum(items.map((i: any) => i.humidity)) / n,
          pressureAvg: sum(items.map((i: any) => i.pressure)) / n,
          rainfallTot: Math.max(...items.map((i: any) => i.rainrate ?? 0).filter(Number.isFinite), 0),
        };
      });

    return NextResponse.json({
      dayRecord,
      hourlyData
    });
  } catch (error: any) {
    console.error("Error in GET /api/weather/daily-report:", error);
    return NextResponse.json({ error: error.message || "Internal Server Error" }, { status: 500 });
  }
}
