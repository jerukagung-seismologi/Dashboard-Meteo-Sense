// app/api/ecmwf/aerosol/route.ts
import { NextRequest, NextResponse } from "next/server";

export const revalidate = 1800; // Cache for 30 minutes

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const projection = searchParams.get("projection") || "classical_south_east_asia_and_indonesia";
  const baseTime = searchParams.get("base_time");
  const validTime = searchParams.get("valid_time");
  const isRefresh = searchParams.get("refresh") === "true" || searchParams.get("_t");

  try {
    let apiUrl = `https://charts.ecmwf.int/opencharts-api/v1/products/aerosol-forecasts/?projection=${encodeURIComponent(projection)}`;
    
    if (baseTime) {
      apiUrl += `&base_time=${encodeURIComponent(baseTime)}`;
    }
    if (validTime) {
      apiUrl += `&valid_time=${encodeURIComponent(validTime)}`;
    }

    const res = await fetch(apiUrl, {
      headers: {
        "User-Agent": "MeteoSense-Dashboard/2.1 (Educational & Research)",
        "Accept": "application/json, */*",
      },
      cache: isRefresh ? "no-store" : "force-cache",
      next: { revalidate: isRefresh ? 0 : 1800 },
    });

    if (!res.ok) {
      // Fallback request without parameters if specific valid_time expired
      const fallbackRes = await fetch(
        `https://charts.ecmwf.int/opencharts-api/v1/products/aerosol-forecasts/?projection=${encodeURIComponent(projection)}`,
        {
          headers: { "User-Agent": "MeteoSense-Dashboard/2.1" },
          cache: "no-store",
        }
      );

      if (fallbackRes.ok) {
        const fallbackJson = await fallbackRes.json();
        return NextResponse.json(
          {
            success: true,
            title: fallbackJson.data?.attributes?.title || "Aerosol Forecasts",
            description: fallbackJson.data?.attributes?.description || "",
            imageUrl: fallbackJson.data?.link?.href || null,
            projection,
            isFallback: true,
          },
          {
            headers: isRefresh ? { "Cache-Control": "no-store, no-cache, must-revalidate" } : {},
          }
        );
      }

      return NextResponse.json(
        { success: false, error: `ECMWF API HTTP ${res.status}` },
        { status: res.status }
      );
    }

    const json = await res.json();
    const attributes = json.data?.attributes || {};
    const link = json.data?.link || {};

    return NextResponse.json(
      {
        success: true,
        title: attributes.title || "Aerosol Forecasts",
        description: attributes.description || "",
        imageUrl: link.href || null,
        projection,
        isFallback: false,
      },
      {
        headers: isRefresh ? { "Cache-Control": "no-store, no-cache, must-revalidate" } : {},
      }
    );
  } catch (error: any) {
    console.error("Error in GET /api/ecmwf/aerosol:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Failed to fetch ECMWF aerosol data" },
      { status: 500 }
    );
  }
}
