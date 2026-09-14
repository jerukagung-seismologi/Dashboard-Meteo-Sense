// app/api/ecmwf/mjo/route.ts
import { NextRequest, NextResponse } from "next/server";
import { EcmwfMjoData, EcmwfMjoTimeOption } from "@/lib/climate-drivers/types";

export const revalidate = 1800; // Cache 30 menit

function compactToIso(compact: string): string {
  if (compact.length >= 12 && !compact.includes("-") && !compact.includes("T")) {
    const y = compact.slice(0, 4);
    const m = compact.slice(4, 6);
    const d = compact.slice(6, 8);
    const h = compact.slice(8, 10);
    const min = compact.slice(10, 12);
    return `${y}-${m}-${d}T${h}:${min}:00Z`;
  }
  return compact;
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const rawBaseTime = searchParams.get("base_time");
  const isRefresh = searchParams.get("refresh") === "true" || searchParams.get("_t");

  const product = "mofc_multi_mjo_family_index";
  const packageUrl = `https://charts.ecmwf.int/opencharts-api/v1/packages/opencharts/products/${product}/`;

  try {
    // 1. Ambil daftar waktu run model (base_time) yang tersedia dari katalog paket
    let availableTimes: EcmwfMjoTimeOption[] = [];
    let packageTitle = "Madden-Julian Oscillation (MJO) index - Sub-seasonal range forecast";
    let packageDescription = "";

    try {
      const pkgRes = await fetch(packageUrl, {
        headers: {
          "User-Agent": "MeteoSense-Dashboard/2.1 (Educational & Research)",
          Accept: "application/json, */*",
        },
        cache: isRefresh ? "no-store" : "force-cache",
        next: { revalidate: isRefresh ? 0 : 1800 },
      });

      if (pkgRes.ok) {
        const pkgJson = await pkgRes.json();
        packageTitle = pkgJson.title || packageTitle;
        packageDescription = pkgJson.description || "";

        const axisValues = pkgJson.axis?.[0]?.values || [];
        availableTimes = axisValues.map((item: { value: string; label: string }) => ({
          value: item.value,
          iso: compactToIso(item.value),
          label: item.label,
        }));
      }
    } catch (pkgErr) {
      console.warn("Gagal mengambil package metadata ECMWF MJO:", pkgErr);
    }

    // 2. Tentukan target base_time dalam format ISO 8601
    let targetIso: string | undefined = undefined;
    if (rawBaseTime) {
      targetIso = compactToIso(rawBaseTime);
    } else if (availableTimes.length > 0) {
      targetIso = availableTimes[0].iso;
    }

    // 3. Ambil URL citra produk grafis ECMWF
    let productUrl = `https://charts.ecmwf.int/opencharts-api/v1/products/${product}/`;
    if (targetIso) {
      productUrl += `?base_time=${encodeURIComponent(targetIso)}`;
    }

    const prodRes = await fetch(productUrl, {
      headers: {
        "User-Agent": "MeteoSense-Dashboard/2.1 (Educational & Research)",
        Accept: "application/json, */*",
      },
      cache: isRefresh ? "no-store" : "force-cache",
      next: { revalidate: isRefresh ? 0 : 1800 },
    });

    if (!prodRes.ok) {
      // Fallback: coba request tanpa parameter base_time (akan mengembalikan run terkini)
      const fallbackRes = await fetch(
        `https://charts.ecmwf.int/opencharts-api/v1/products/${product}/`,
        {
          headers: { "User-Agent": "MeteoSense-Dashboard/2.1" },
          cache: "no-store",
        }
      );

      if (fallbackRes.ok) {
        const fallbackJson = await fallbackRes.json();
        const responseData: EcmwfMjoData = {
          success: true,
          product,
          title: fallbackJson.data?.attributes?.title || packageTitle,
          description: fallbackJson.data?.attributes?.description || packageDescription,
          imageUrl: fallbackJson.data?.link?.href || null,
          baseTime: targetIso || (availableTimes[0]?.iso ?? "latest"),
          availableTimes,
          copyright: fallbackJson.meta?.copyright || "© ECMWF",
          licence: fallbackJson.meta?.licence || "CC-BY-4.0",
          sourceUrl: `https://charts.ecmwf.int/products/${product}`,
          isFallback: true,
        };

        return NextResponse.json(responseData, {
          headers: isRefresh ? { "Cache-Control": "no-store, no-cache, must-revalidate" } : {},
        });
      }

      return NextResponse.json(
        { success: false, error: `ECMWF API HTTP ${prodRes.status}` },
        { status: prodRes.status }
      );
    }

    const prodJson = await prodRes.json();
    const attributes = prodJson.data?.attributes || {};
    const link = prodJson.data?.link || {};

    const responseData: EcmwfMjoData = {
      success: true,
      product,
      title: attributes.title || packageTitle,
      description: attributes.description || packageDescription,
      imageUrl: link.href || null,
      baseTime: targetIso || (availableTimes[0]?.iso ?? "latest"),
      availableTimes,
      copyright: prodJson.meta?.copyright || "© ECMWF",
      licence: prodJson.meta?.licence || "CC-BY-4.0",
      sourceUrl: `https://charts.ecmwf.int/products/${product}`,
      isFallback: false,
    };

    return NextResponse.json(responseData, {
      headers: isRefresh ? { "Cache-Control": "no-store, no-cache, must-revalidate" } : {},
    });
  } catch (error: any) {
    console.error("Error in GET /api/ecmwf/mjo:", error);
    return NextResponse.json(
      {
        success: false,
        error: error.message || "Gagal mengambil data prakiraan MJO dari ECMWF OpenCharts",
      },
      { status: 500 }
    );
  }
}
