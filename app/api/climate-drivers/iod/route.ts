// app/api/climate-drivers/iod/route.ts
import { NextResponse } from "next/server";
import { getIodData } from "@/lib/climate-drivers/climateData";

export const revalidate = 300; // Cache for 5 minutes

export async function GET() {
  try {
    const data = getIodData();
    return NextResponse.json(data);
  } catch (error: any) {
    console.error("Error in GET /api/climate-drivers/iod:", error);
    return NextResponse.json(
      { error: error.message || "Failed to fetch IOD data" },
      { status: 500 }
    );
  }
}
