// app/api/climate-drivers/summary/route.ts
import { NextResponse } from "next/server";
import { getClimateDriversSummary } from "@/lib/climate-drivers/climateData";

export const revalidate = 300; // Cache for 5 minutes

export async function GET() {
  try {
    const summary = getClimateDriversSummary();
    return NextResponse.json(summary);
  } catch (error: any) {
    console.error("Error in GET /api/climate-drivers/summary:", error);
    return NextResponse.json(
      { error: error.message || "Failed to fetch climate summary" },
      { status: 500 }
    );
  }
}
