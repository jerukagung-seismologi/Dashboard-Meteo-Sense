// app/api/climate-drivers/mjo/route.ts
import { NextResponse } from "next/server";
import { fetchLiveMjoData } from "@/lib/climate-drivers/liveClimateFetcher";

export const revalidate = 3600; // Cache for 1 hour

export async function GET() {
  try {
    const data = await fetchLiveMjoData();
    return NextResponse.json(data);
  } catch (error: any) {
    console.error("Error in GET /api/climate-drivers/mjo:", error);
    return NextResponse.json(
      { error: error.message || "Failed to fetch MJO data" },
      { status: 500 }
    );
  }
}
