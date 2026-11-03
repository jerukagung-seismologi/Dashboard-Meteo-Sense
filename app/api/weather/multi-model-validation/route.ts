// app/api/weather/multi-model-validation/route.ts
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";
export const revalidate = 300; // Cache 5 menit di level server

export interface NWPModelMeta {
  id: string;
  name: string;
  country: string;
  category: "Physics NWP" | "AI Model";
  color: string;
}

export const SUPPORTED_NWP_MODELS: NWPModelMeta[] = [
  { id: "ecmwf_ifs", name: "ECMWF IFS (9 km)", country: "Eropa", category: "Physics NWP", color: "#2563EB" },
  { id: "ecmwf_aifs025_single", name: "ECMWF AIFS (AI)", country: "Eropa (AI)", category: "AI Model", color: "#8B5CF6" },
  { id: "ncep_aigfs025", name: "NOAA AIGFS (AI)", country: "Amerika Serikat (AI)", category: "AI Model", color: "#A855F7" },
  { id: "gfs_seamless", name: "NOAA GFS (11 km)", country: "Amerika Serikat", category: "Physics NWP", color: "#EF4444" },
  { id: "icon_seamless", name: "DWD ICON (13 km)", country: "Jerman", category: "Physics NWP", color: "#14B8A6" },
  { id: "jma_seamless", name: "JMA GSM (0.25°)", country: "Jepang", category: "Physics NWP", color: "#F59E0B" },
  { id: "gem_seamless", name: "CMC GEM (0.15°)", country: "Kanada", category: "Physics NWP", color: "#EC4899" },
  { id: "meteofrance_seamless", name: "Météo-France ARPEGE", country: "Prancis", category: "Physics NWP", color: "#06B6D4" },
  { id: "ukmo_global_deterministic_10km", name: "UKMO Global (10 km)", country: "Inggris", category: "Physics NWP", color: "#6366F1" },
  { id: "metno_seamless", name: "MET Norway", country: "Norwegia", category: "Physics NWP", color: "#0284C7" },
  { id: "dmi_seamless", name: "DMI Seamless", country: "Denmark", category: "Physics NWP", color: "#D946EF" },
  { id: "cma_grapes_global", name: "CMA GRAPES (0.125°)", country: "China", category: "Physics NWP", color: "#F97316" },
];

const DEFAULT_VARIABLES = [
  "temperature_2m",
  "relative_humidity_2m",
  "surface_pressure",
  "dew_point_2m",
  "wind_speed_10m",
  "wind_direction_10m",
  "precipitation",
];

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const latStr = searchParams.get("latitude") || searchParams.get("lat") || "-7.7121";
  const lngStr = searchParams.get("longitude") || searchParams.get("lng") || searchParams.get("lon") || "109.6892";
  const pastDaysParam = parseInt(searchParams.get("past_days") || "7", 10);
  const requestedModelsParam = searchParams.get("models"); // optional comma-separated

  const lat = parseFloat(latStr);
  const lng = parseFloat(lngStr);

  if (isNaN(lat) || isNaN(lng)) {
    return NextResponse.json(
      { error: "Parameter latitude dan longitude harus berupa angka valid." },
      { status: 400 }
    );
  }

  // Clamping past_days to Open-Meteo physical limit: 1 s/d 92 hari
  const pastDays = Math.min(92, Math.max(1, isNaN(pastDaysParam) ? 7 : pastDaysParam));

  // Determine active models
  let activeModels = SUPPORTED_NWP_MODELS;
  if (requestedModelsParam && requestedModelsParam !== "all") {
    const requestedSet = new Set(requestedModelsParam.split(",").map((s) => s.trim()));
    const filtered = SUPPORTED_NWP_MODELS.filter((m) => requestedSet.has(m.id));
    if (filtered.length > 0) {
      activeModels = filtered;
    }
  }

  const modelIds = activeModels.map((m) => m.id).join(",");

  const params = new URLSearchParams({
    latitude: lat.toString(),
    longitude: lng.toString(),
    hourly: DEFAULT_VARIABLES.join(","),
    models: modelIds,
    past_days: pastDays.toString(),
    forecast_days: "0",
    timezone: "Asia/Bangkok", // WIB / GMT+7
    wind_speed_unit: "ms",
  });

  const fetchHeaders = {
    "User-Agent": "MeteoSense-Dashboard/4.0 (https://github.com/evanalif113/Dashboard-Meteo-Sense)",
    Accept: "application/json",
  };

  const openMeteoUrl = `https://api.open-meteo.com/v1/forecast?${params.toString()}`;

  try {
    const res = await fetch(openMeteoUrl, {
      headers: fetchHeaders,
      next: { revalidate: 300 },
    });

    if (!res.ok) {
      const errText = await res.text();
      console.warn("Open-Meteo multi-model API returned status:", res.status, errText);

      // Fallback: retry with 4 core models if 9-model query throttled
      const coreModelIds = "ecmwf_ifs,gfs_seamless,icon_seamless,jma_seamless";
      params.set("models", coreModelIds);
      const fallbackUrl = `https://api.open-meteo.com/v1/forecast?${params.toString()}`;
      const fallbackRes = await fetch(fallbackUrl, {
        headers: fetchHeaders,
        next: { revalidate: 300 },
      });

      if (!fallbackRes.ok) {
        throw new Error(`Open-Meteo API gagal merespons: status ${res.status}`);
      }

      const fbData = await fallbackRes.json();
      activeModels = SUPPORTED_NWP_MODELS.filter((m) =>
        ["ecmwf_ifs", "gfs_seamless", "icon_seamless", "jma_seamless"].includes(m.id)
      );
      return processOpenMeteoPayload(fbData, activeModels, pastDays, lat, lng);
    }

    const data = await res.json();
    return processOpenMeteoPayload(data, activeModels, pastDays, lat, lng);
  } catch (err: any) {
    console.error("Error in multi-model-validation route:", err);
    return NextResponse.json(
      {
        error: err.message || "Gagal mengambil data cuaca dari Open-Meteo Multi-Model API.",
      },
      { status: 502 }
    );
  }
}

function processOpenMeteoPayload(
  data: any,
  activeModels: NWPModelMeta[],
  pastDays: number,
  lat: number,
  lng: number
) {
  if (!data?.hourly?.time || !Array.isArray(data.hourly.time)) {
    return NextResponse.json({ error: "Format respons hourly tidak valid dari Open-Meteo." }, { status: 502 });
  }

  const times: string[] = data.hourly.time;
  const timeLength = times.length;

  // Variables data mapping: variable -> { [modelId]: number[], ensembleMean: number[] }
  const seriesByVariable: Record<
    string,
    {
      models: Record<string, (number | null)[]>;
      ensembleMean: (number | null)[];
    }
  > = {};

  for (const varKey of DEFAULT_VARIABLES) {
    const modelSeriesMap: Record<string, (number | null)[]> = {};
    const ensembleMeans: (number | null)[] = [];

    // Collect series for each model
    for (const model of activeModels) {
      // Open-Meteo naming format: `${varKey}_${modelId}`
      const propKey = `${varKey}_${model.id}`;
      const rawArr = data.hourly[propKey];
      if (Array.isArray(rawArr)) {
        modelSeriesMap[model.id] = rawArr.map((v) =>
          v !== null && v !== undefined && !isNaN(Number(v)) ? Number(Number(v).toFixed(2)) : null
        );
      } else {
        modelSeriesMap[model.id] = new Array(timeLength).fill(null);
      }
    }

    // Compute Ensemble Mean per time index
    for (let t = 0; t < timeLength; t++) {
      let sum = 0;
      let count = 0;
      for (const model of activeModels) {
        const val = modelSeriesMap[model.id]?.[t];
        if (val !== null && val !== undefined) {
          sum += val;
          count++;
        }
      }
      ensembleMeans.push(count > 0 ? Number((sum / count).toFixed(2)) : null);
    }

    seriesByVariable[varKey] = {
      models: modelSeriesMap,
      ensembleMean: ensembleMeans,
    };
  }

  return NextResponse.json({
    meta: {
      latitude: lat,
      longitude: lng,
      pastDays,
      totalHours: timeLength,
      startTime: times[0],
      endTime: times[timeLength - 1],
      interval: "1 jam (hourly)",
      modelsCount: activeModels.length,
    },
    times,
    models: activeModels,
    series: seriesByVariable,
  });
}

