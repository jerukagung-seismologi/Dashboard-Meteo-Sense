import { NextResponse } from "next/server";
import {
  batchUpdateSensorFields,
  logSensorCorrection,
  fetchSensorCorrectionLogs,
  BatchSensorFieldUpdate,
  SensorCorrectionAuditLog,
} from "@/lib/FetchingSensorData";

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

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { sensorId, updates, log } = body as {
      sensorId: string;
      updates: BatchSensorFieldUpdate[];
      log: SensorCorrectionAuditLog;
    };

    if (!sensorId || !updates || !Array.isArray(updates) || updates.length === 0) {
      return NextResponse.json(
        { error: "sensorId and non-empty updates array are required" },
        { status: 400 }
      );
    }

    // Eksekusi batch updates
    const count = await batchUpdateSensorFields(sensorId, updates);

    // Simpan audit log jika disertakan
    if (log) {
      await logSensorCorrection({
        ...log,
        sensorId,
        pointCount: count,
      });
    }

    return NextResponse.json({
      success: true,
      message: `Berhasil mengoreksi ${count} titik data.`,
      updatedCount: count,
    });
  } catch (error: any) {
    console.error("Error in POST /api/sensors/batch-correct:", error);
    return NextResponse.json(
      { error: error.message || "Failed to apply batch correction" },
      { status: 500 }
    );
  }
}

