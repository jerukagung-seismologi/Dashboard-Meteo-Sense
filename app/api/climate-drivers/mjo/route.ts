// app/api/climate-drivers/mjo/route.ts
import { NextResponse } from "next/server";
import { getMjoData } from "@/lib/climate-drivers/climateData";

export const revalidate = 300; // Cache for 5 minutes

export async function GET() {
  try {
    const data = getMjoData();
    return NextResponse.json(data);
  } catch (error: any) {
    console.error("Error in GET /api/climate-drivers/mjo:", error);
    return NextResponse.json(
      { error: error.message || "Failed to fetch MJO data" },
      { status: 500 }
    );
  }
}
