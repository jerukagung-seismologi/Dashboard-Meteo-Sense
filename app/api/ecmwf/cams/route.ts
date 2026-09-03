// app/api/ecmwf/cams/route.ts
import { NextRequest, NextResponse } from "next/server";

export const revalidate = 1800; // Cache for 30 minutes

export const CAMS_PRODUCTS = {
  "aerosol-forecasts": {
    label: "Aerosol & Debu (Optical Depth)",
    unit: "AOD (550nm)",
    description: "Distribusi ketebalan optik aerosol total, partikel debu gurun, dan materi organik",
  },
  "carbon-monoxide-forecasts": {
    label: "Karbon Monoksida (CO)",
    unit: "10^18 molekul/cm²",
    description: "Kolom total karbon monoksida dari emisi pembakaran bahan bakar dan biomassa",
  },
  "carbon-dioxide-forecasts": {
    label: "Karbon Dioksida (CO2)",
    unit: "ppmv",
    description: "Fraksi molar rata-rata kolom gas rumah kaca karbon dioksida di atmosfer",
  },
  "nitrogen-dioxide-forecasts": {
    label: "Nitrogen Dioksida (NO2)",
    unit: "10^15 molekul/cm²",
    description: "Kolom total nitrogen dioksida dari emisi lalu lintas kendaraan dan kawasan industri",
  },
  "ozone-forecasts": {
    label: "Ozon Total (O3)",
    unit: "Dobson Units (DU)",
    description: "Distribusi kolom total ozon atmosfer dan pelindung radiasi ultraviolet",
  },
  "sulphur-dioxide-forecasts": {
    label: "Sulfur Dioksida (SO2)",
    unit: "10^15 molekul/cm²",
    description: "Kolom total sulfur dioksida dari aktivitas industri, PLTU batubara, dan erupsi vulkanik",
  },
};

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const product = searchParams.get("product") || "aerosol-forecasts";
  const projection = searchParams.get("projection") || "classical_south_east_asia_and_indonesia";
  const baseTime = searchParams.get("base_time");
  const validTime = searchParams.get("valid_time");
  const isRefresh = searchParams.get("refresh") === "true" || searchParams.get("_t");

  try {
    let apiUrl = `https://charts.ecmwf.int/opencharts-api/v1/products/${encodeURIComponent(
      product
    )}/?projection=${encodeURIComponent(projection)}`;

    if (baseTime) {
      apiUrl += `&base_time=${encodeURIComponent(baseTime)}`;
    }
    if (validTime) {
      apiUrl += `&valid_time=${encodeURIComponent(validTime)}`;
    }

    const res = await fetch(apiUrl, {
      headers: {
        "User-Agent": "MeteoSense-Dashboard/2.1 (Educational & Research)",
        Accept: "application/json, */*",
      },
      cache: isRefresh ? "no-store" : "force-cache",
      next: { revalidate: isRefresh ? 0 : 1800 },
    });

    if (!res.ok) {
      // Fallback request without specific time parameters if timestamp expired
      const fallbackRes = await fetch(
        `https://charts.ecmwf.int/opencharts-api/v1/products/${encodeURIComponent(
          product
        )}/?projection=${encodeURIComponent(projection)}`,
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
            product,
            title: fallbackJson.data?.attributes?.title || CAMS_PRODUCTS[product as keyof typeof CAMS_PRODUCTS]?.label || "CAMS Forecast",
            description: fallbackJson.data?.attributes?.description || CAMS_PRODUCTS[product as keyof typeof CAMS_PRODUCTS]?.description || "",
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
        product,
        title: attributes.title || CAMS_PRODUCTS[product as keyof typeof CAMS_PRODUCTS]?.label || "CAMS Forecast",
        description: attributes.description || CAMS_PRODUCTS[product as keyof typeof CAMS_PRODUCTS]?.description || "",
        imageUrl: link.href || null,
        projection,
        isFallback: false,
      },
      {
        headers: isRefresh ? { "Cache-Control": "no-store, no-cache, must-revalidate" } : {},
      }
    );
  } catch (error: any) {
    console.error("Error in GET /api/ecmwf/cams:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Failed to fetch ECMWF CAMS data" },
      { status: 500 }
    );
  }
}
