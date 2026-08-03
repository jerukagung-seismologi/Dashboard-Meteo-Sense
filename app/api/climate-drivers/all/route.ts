// app/api/climate-drivers/all/route.ts
import { NextResponse } from "next/server";
import { getUnifiedClimateData } from "@/lib/climate-drivers/officialClimateParser";

export const revalidate = 3600; // Cache API response for 1 hour

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const refresh = searchParams.get("refresh") === "true";

    const data = await getUnifiedClimateData(refresh);
    return NextResponse.json(data, {
      headers: {
        "Cache-Control": "public, s-maxage=3600, stale-while-revalidate=86400",
        "Access-Control-Allow-Origin": "*",
      },
    });
  } catch (error: any) {
    console.error("Error in GET /api/climate-drivers/all:", error);
    return NextResponse.json(
      { error: error.message || "Failed to parse official climate data" },
      { status: 500 }
    );
  }
}
