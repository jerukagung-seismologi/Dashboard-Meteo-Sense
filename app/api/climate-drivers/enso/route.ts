// app/api/climate-drivers/enso/route.ts
import { NextResponse } from "next/server";
import { fetchLiveEnsoData } from "@/lib/climate-drivers/liveClimateFetcher";

export const revalidate = 3600; // Cache for 1 hour

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const refresh = searchParams.get("refresh") === "true" || searchParams.has("_t") || searchParams.has("force");

    const data = await fetchLiveEnsoData();
    return NextResponse.json(data, {
      headers: {
        "Cache-Control": refresh
          ? "no-store, no-cache, must-revalidate, proxy-revalidate"
          : "public, s-maxage=3600, stale-while-revalidate=86400",
      },
    });
  } catch (error: any) {
    console.error("Error in GET /api/climate-drivers/enso:", error);
    return NextResponse.json(
      { error: error.message || "Failed to fetch ENSO data" },
      { status: 500 }
    );
  }
}
