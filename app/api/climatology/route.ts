// app/api/climatology/route.ts
import { NextResponse } from "next/server";
import { fetchSensorDataByDateRange } from "@/lib/FetchingSensorData";
import { buildUTCDateRange } from "@/lib/climatology/dateRangeBuilder";
import { aggregateHourly } from "@/lib/climatology/aggregateHourly";
import { aggregateDaily } from "@/lib/climatology/aggregateDaily";
import { calculateStats } from "@/lib/climatology/calculateStatistics";

export const revalidate = 60; // Cache for 1 minute

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const sensorId = searchParams.get("sensorId");
  const preset = searchParams.get("preset"); // "daily" | "weekly" | "monthly" | "yearly"
  const monthStr = searchParams.get("month");
  const yearStr = searchParams.get("year");

  if (!sensorId) {
    return NextResponse.json({ error: "sensorId is required" }, { status: 400 });
  }

  if (!preset) {
    return NextResponse.json({ error: "preset is required" }, { status: 400 });
  }

  try {
    const year = yearStr ? Number(yearStr) : undefined;
    const month = monthStr ? Number(monthStr) : undefined;

    // Get strict UTC date boundaries
    const { start, end } = buildUTCDateRange(preset, year, month);

    console.log(`Climatology Server Query: sensorId=${sensorId}, preset=${preset}, startUTC=${start.toISOString()}, endUTC=${end.toISOString()}`);

    // Fetch raw telemetry logs from Realtime Database within UTC boundaries
    const rawPoints = await fetchSensorDataByDateRange(sensorId, start.getTime(), end.getTime());

    // Aggregate data
    const dailyPoints = aggregateDaily(rawPoints);
    const hourlyPoints = aggregateHourly(rawPoints);

    const isHourly = preset === "daily";
    const points = isHourly ? hourlyPoints : dailyPoints;

    // Calculate descriptive statistics on the server side
    const stats = calculateStats(rawPoints, dailyPoints, hourlyPoints, isHourly);

    return NextResponse.json({
      sensorId,
      preset,
      startDate: start.toISOString(),
      endDate: end.toISOString(),
      points,
      stats,
    });
  } catch (error: any) {
    console.error("Error in GET /api/climatology:", error);
    return NextResponse.json({ error: error.message || "Internal Server Error" }, { status: 500 });
  }
}
