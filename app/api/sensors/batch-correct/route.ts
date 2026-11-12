import { NextResponse } from "next/server";
import { fetchSensorCorrectionLogs } from "@/lib/FetchingSensorData";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const sensorId = searchParams.get("sensorId");
  const limitStr = searchParams.get("limit");
  const limit = limitStr ? parseInt(limitStr, 10) : 20;

  if (!sensorId) {
    return NextResponse.json({ error: "sensorId is required" }, { status: 400 });
  }

  try {
    const logs = await fetchSensorCorrectionLogs(sensorId, limit);
    return NextResponse.json({ logs });
  } catch (error: any) {
    console.error("Error in GET /api/sensors/batch-correct:", error);
    return NextResponse.json({ error: error.message || "Failed to fetch logs" }, { status: 500 });
  }
}

export async function POST() {
  return NextResponse.json(
    {
      error:
        "Direct server-side batch writes are disabled because Firebase RTDB writes require authenticated Admin client credentials.",
    },
    { status: 403 }
  );
}

