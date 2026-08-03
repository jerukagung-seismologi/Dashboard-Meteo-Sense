// app/api/climate-drivers/enso/route.ts
import { NextResponse } from "next/server";
import { fetchLiveEnsoData } from "@/lib/climate-drivers/liveClimateFetcher";

export const revalidate = 3600; // Cache for 1 hour

export async function GET() {
  try {
    const data = await fetchLiveEnsoData();
    return NextResponse.json(data);
  } catch (error: any) {
    console.error("Error in GET /api/climate-drivers/enso:", error);
    return NextResponse.json(
      { error: error.message || "Failed to fetch ENSO data" },
      { status: 500 }
    );
  }
}
