import { NextRequest, NextResponse } from "next/server";
import fs from "fs/promises";
import path from "path";

// In-memory cache for server lifecycle
let tabularCache: Record<string, any> = {};
let geojsonCache: Record<string, any> = {};

async function loadTabular(kabupaten: string): Promise<any> {
  if (tabularCache[kabupaten]) return tabularCache[kabupaten];
  const filePath = path.join(process.cwd(), "public", "data", kabupaten, "prediksi_musim_desa.json");
  try {
    const raw = await fs.readFile(filePath, "utf-8");
    const parsed = JSON.parse(raw);
    tabularCache[kabupaten] = parsed;
    return parsed;
  } catch (err) {
    console.warn(`[API] Failed to read tabular data for ${kabupaten}:`, err);
    return null;
  }
}

async function loadGeojson(kabupaten: string): Promise<any> {
  if (geojsonCache[kabupaten]) return geojsonCache[kabupaten];
  const filePath = path.join(process.cwd(), "public", "data", kabupaten, `${kabupaten}_desa.json`);
  try {
    const raw = await fs.readFile(filePath, "utf-8");
    const parsed = JSON.parse(raw);
    geojsonCache[kabupaten] = parsed;
    return parsed;
  } catch (err) {
    console.warn(`[API] Failed to read geojson data for ${kabupaten}:`, err);
    return null;
  }
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const kabupaten = (searchParams.get("kabupaten") || "kebumen").toLowerCase().trim();
  const type = (searchParams.get("type") || "tabular").toLowerCase().trim();
  const kecamatan = searchParams.get("kecamatan")?.toLowerCase().trim();
  const dasarian = searchParams.get("dasarian")?.toLowerCase().trim();

  const cacheHeaders = {
    "Cache-Control": "public, max-age=86400, s-maxage=604800, stale-while-revalidate=86400",
    "Content-Type": "application/json",
  };

  try {
    // 1. GEOJSON TYPE
    if (type === "geojson") {
      const geoData = await loadGeojson(kabupaten);
      if (!geoData) {
        return NextResponse.json(
          { error: `GeoJSON data not found for kabupaten ${kabupaten}` },
          { status: 404 }
        );
      }

      if (!kecamatan) {
        return NextResponse.json(geoData, { headers: cacheHeaders });
      }

      const filteredFeatures = (geoData.features || []).filter((f: any) => {
        const kecProp = (f.properties?.kecamatan || f.properties?.nm_kecamatan || "").toLowerCase();
        return kecProp === kecamatan;
      });

      return NextResponse.json(
        {
          type: "FeatureCollection",
          features: filteredFeatures,
        },
        { headers: cacheHeaders }
      );
    }

    // 2. TABULAR TYPE (Default)
    const tabularData = await loadTabular(kabupaten);
    if (!tabularData) {
      return NextResponse.json(
        { error: `Tabular seasonal prediction data not found for kabupaten ${kabupaten}` },
        { status: 404 }
      );
    }

    let hujan = tabularData.hujan || [];
    let kemarau = tabularData.kemarau || [];

    if (kecamatan) {
      hujan = hujan.filter((item: any) => (item.kecamatan || "").toLowerCase() === kecamatan);
      kemarau = kemarau.filter((item: any) => (item.kecamatan || "").toLowerCase() === kecamatan);
    }

    if (dasarian) {
      hujan = hujan.filter((item: any) => {
        const lbl = (item.prakiraan_amh_label || "").toLowerCase();
        const val = String(item.prakiraan_amh_dasarian || "");
        return lbl.includes(dasarian) || val === dasarian;
      });
      kemarau = kemarau.filter((item: any) => {
        const lbl = (item.prakiraan_amk_label || "").toLowerCase();
        const val = String(item.prakiraan_amk_dasarian || "");
        return lbl.includes(dasarian) || val === dasarian;
      });
    }

    return NextResponse.json(
      {
        metadata: tabularData.metadata,
        hujan,
        kemarau,
        total_desa: hujan.length,
      },
      { headers: cacheHeaders }
    );
  } catch (error) {
    console.error("[API seasonal/villages] Unexpected error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
