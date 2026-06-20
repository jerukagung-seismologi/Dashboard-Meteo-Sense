// app/api/climatology/route.ts
import { NextResponse } from "next/server";
import { fetchSensorDataByDateRange } from "@/lib/FetchingSensorData";
import { aggregateHourly } from "@/lib/climatology/aggregateHourly";
import { aggregateDaily } from "@/lib/climatology/aggregateDaily";
import { aggregateMonthly } from "@/lib/climatology/aggregateMonthly";
import { calculateStats } from "@/lib/climatology/calculateStatistics";

export const revalidate = 60; // Cache for 1 minute

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const sensorId = searchParams.get("sensorId");
  const range = searchParams.get("range"); // "12h" | "24h" | "7d" | "30d" | "monthly" | "yearly" | "custom"
  const startDate = searchParams.get("startDate");
  const endDate = searchParams.get("endDate");

  if (!sensorId) {
    return NextResponse.json({ error: "sensorId is required" }, { status: 400 });
  }

  if (!range) {
    return NextResponse.json({ error: "range is required" }, { status: 400 });
  }

  try {
    let startTimestamp = 0;
    let endTimestamp = Date.now();
    let aggregator: typeof aggregateHourly = aggregateHourly;

    if (range === "12h") {
      startTimestamp = endTimestamp - 12 * 60 * 60 * 1000;
      aggregator = aggregateHourly;
    } else if (range === "24h") {
      startTimestamp = endTimestamp - 24 * 60 * 60 * 1000;
      aggregator = aggregateHourly;
    } else if (range === "7d") {
      startTimestamp = endTimestamp - 7 * 24 * 60 * 60 * 1000;
      aggregator = aggregateDaily;
    } else if (range === "30d") {
      startTimestamp = endTimestamp - 30 * 24 * 60 * 60 * 1000;
      aggregator = aggregateDaily;
    } else if (range === "monthly") {
      // expects startDate parameter like "2026-06"
      const startStr = startDate || new Intl.DateTimeFormat("en-CA", {
        timeZone: "Asia/Jakarta",
        year: "numeric",
        month: "2-digit"
      }).format(new Date()); // e.g. "2026-06"

      const [yyyy, mm] = startStr.split("-");
      startTimestamp = Date.parse(`${yyyy}-${mm}-01T00:00:00+07:00`);

      const currentYear = Number(yyyy);
      const currentMonth = Number(mm); // 1-12
      // Construct next month start
      let nextYear = currentYear;
      let nextMonth = currentMonth + 1;
      if (nextMonth > 12) {
        nextMonth = 1;
        nextYear += 1;
      }
      const nextMonthEpoch = Date.parse(`${nextYear}-${String(nextMonth).padStart(2, "0")}-01T00:00:00+07:00`);
      endTimestamp = nextMonthEpoch - 1000;
      aggregator = aggregateDaily;
    } else if (range === "yearly") {
      // expects startDate parameter like "2026"
      const yyyy = startDate || String(new Date().getFullYear());
      startTimestamp = Date.parse(`${yyyy}-01-01T00:00:00+07:00`);
      endTimestamp = Date.parse(`${yyyy}-12-31T23:59:59+07:00`);
      aggregator = aggregateMonthly;
    } else if (range === "custom") {
      if (!startDate || !endDate) {
        return NextResponse.json({ error: "startDate and endDate are required for custom range" }, { status: 400 });
      }
      const startParam = isNaN(Number(startDate)) ? Date.parse(startDate) : Number(startDate);
      const endParam = isNaN(Number(endDate)) ? Date.parse(endDate) : Number(endDate);
      if (isNaN(startParam) || isNaN(endParam)) {
        return NextResponse.json({ error: "Invalid startDate or endDate values" }, { status: 400 });
      }
      startTimestamp = startParam;
      endTimestamp = endParam;

      const diffMs = endTimestamp - startTimestamp;
      const diffDays = diffMs / (24 * 60 * 60 * 1000);
      if (diffDays <= 1) {
        aggregator = aggregateHourly;
      } else if (diffDays <= 31) {
        aggregator = aggregateDaily;
      } else {
        aggregator = aggregateMonthly;
      }
    } else {
      return NextResponse.json({ error: "Invalid range parameter" }, { status: 400 });
    }

    console.log(`Climatology API Request: sensorId=${sensorId}, range=${range}, start=${new Date(startTimestamp).toISOString()}, end=${new Date(endTimestamp).toISOString()}`);

    // Fetch raw data points within date range from RTDB
    const rawPoints = await fetchSensorDataByDateRange(sensorId, startTimestamp, endTimestamp);
    
    // Aggregation
    const points = aggregator(rawPoints);

    // Calculate stats - we need daily aggregates to correctly compute rain days
    const dailyPoints = aggregateDaily(rawPoints);
    const dailyRainfallMap = new Map<string, number>();
    for (const dp of dailyPoints) {
      dailyRainfallMap.set(dp.timeKey, dp.rainfallAccumulation);
    }

    const stats = calculateStats(rawPoints, points.length, dailyRainfallMap);

    return NextResponse.json({
      sensorId,
      range,
      startDate: new Date(startTimestamp).toISOString(),
      endDate: new Date(endTimestamp).toISOString(),
      points,
      stats,
    });
  } catch (error: any) {
    console.error("Error in GET /api/climatology:", error);
    return NextResponse.json({ error: error.message || "Internal Server Error" }, { status: 500 });
  }
}
