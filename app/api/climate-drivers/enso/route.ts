// app/api/climate-drivers/enso/route.ts
import { NextResponse } from "next/server";
import { getEnsoData } from "@/lib/climate-drivers/climateData";

export const revalidate = 300; // Cache for 5 minutes

export async function GET() {
  try {
    const data = getEnsoData();
    return NextResponse.json(data);
  } catch (error: any) {
    console.error("Error in GET /api/climate-drivers/enso:", error);
    return NextResponse.json(
      { error: error.message || "Failed to fetch ENSO data" },
      { status: 500 }
    );
  }
}
