import { NextResponse } from "next/server";
import { getCalibrationDocument, saveCalibrationDocument } from "@/lib/calibration/calibrationCrud";
import { StationCalibrationDocumentSchema } from "@/lib/calibration/calibrationTypes";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const stationId = searchParams.get("stationId");

  if (!stationId) {
    return NextResponse.json({ error: "stationId is required" }, { status: 400 });
  }

  try {
    const data = await getCalibrationDocument(stationId);
    if (!data) {
      return NextResponse.json({ error: "Calibration not found" }, { status: 404 });
    }
    return NextResponse.json(data);
  } catch (error: any) {
    console.error("GET /api/calibration error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const config = StationCalibrationDocumentSchema.parse(body);
    
    await saveCalibrationDocument(config.stationId, config);
    
    return NextResponse.json({ success: true, message: "Calibration saved" });
  } catch (error: any) {
    console.error("POST /api/calibration error:", error);
    return NextResponse.json({ error: error.message || "Invalid payload" }, { status: 400 });
  }
}
