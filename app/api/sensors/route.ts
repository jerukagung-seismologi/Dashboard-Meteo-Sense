import { NextResponse } from "next/server";
import {
  fetchSensorData,
  fetchSensorDataByDateRange,
  fetchSensorDataByValue,
  fetchSensorMetadata
} from "@/lib/FetchingSensorData";

export const revalidate = 60; // Cache for 1 minute

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const action = searchParams.get("action");
  const sensorId = searchParams.get("sensorId");
  const calibrationStr = searchParams.get("calibration");
  const applyCalibration = calibrationStr !== "false"; // Default to true unless explicitly false

  if (!sensorId || !action) {
    return NextResponse.json({ error: "sensorId and action are required" }, { status: 400 });
  }

  const isRefresh = searchParams.get("refresh") === "true" || searchParams.has("_t") || searchParams.has("force");
  const responseOptions = {
    headers: {
      "Cache-Control": isRefresh
        ? "no-store, no-cache, must-revalidate, proxy-revalidate"
        : "public, s-maxage=60, stale-while-revalidate=120",
    },
  };

  try {
    switch (action) {
      case "metadata": {
        const data = await fetchSensorMetadata(sensorId);
        return NextResponse.json(data, responseOptions);
      }
      case "latest": {
        const limitStr = searchParams.get("limit");
        const limit = limitStr ? parseInt(limitStr, 10) : 1;
        const data = await fetchSensorData(sensorId, limit, applyCalibration);
        return NextResponse.json(data, responseOptions);
      }
      case "range": {
        const startStr = searchParams.get("start");
        const endStr = searchParams.get("end");
        if (!startStr || !endStr) {
          return NextResponse.json({ error: "start and end timestamps are required for range action" }, { status: 400 });
        }
        const startTimestamp = parseInt(startStr, 10);
        const endTimestamp = parseInt(endStr, 10);
        const data = await fetchSensorDataByDateRange(sensorId, startTimestamp, endTimestamp, applyCalibration);
        return NextResponse.json(data, responseOptions);
      }
      case "value": {
        const field = searchParams.get("field");
        const valueStr = searchParams.get("value");
        if (!field || !valueStr) {
          return NextResponse.json({ error: "field and value are required for value action" }, { status: 400 });
        }
        const value = parseFloat(valueStr);
        const data = await fetchSensorDataByValue(sensorId, field, value, applyCalibration);
        return NextResponse.json(data, responseOptions);
      }
      default:
        return NextResponse.json({ error: "Invalid action" }, { status: 400 });
    }
  } catch (error: any) {
    console.error(`API Error in /api/sensors for action ${action}:`, error);
    return NextResponse.json({ error: error.message || "Internal Server Error" }, { status: 500 });
  }
}
