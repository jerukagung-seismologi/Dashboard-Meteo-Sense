// app/api/reanalysis/data/route.ts
import { NextResponse } from "next/server";
import { processERA5Hourly } from "@/lib/reanalysis/climatology";

export const revalidate = 86400; // Cache ERA5 historical queries for 24 hours (climatological datasets do not change daily)

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const latStr = searchParams.get("latitude");
  const lngStr = searchParams.get("longitude");
  const startDate = searchParams.get("startDate"); // YYYY-MM-DD
  const endDate = searchParams.get("endDate");     // YYYY-MM-DD

  if (!latStr || !lngStr || !startDate || !endDate) {
    return NextResponse.json(
      { error: "latitude, longitude, startDate, and endDate are required parameters" },
      { status: 400 }
    );
  }

  const lat = Number(latStr);
  const lng = Number(lngStr);

  if (isNaN(lat) || isNaN(lng)) {
    return NextResponse.json({ error: "Invalid coordinate values" }, { status: 400 });
  }

  const variables = [
    "temperature_2m",
    "relative_humidity_2m",
    "dew_point_2m",
    "surface_pressure",
    "pressure_msl",
    "rain",
    "precipitation",
    "wind_speed_10m",
    "wind_gusts_10m",
    "wind_direction_10m",
    "cloud_cover",
    "shortwave_radiation",
    "soil_temperature_0_to_7cm",
    "soil_moisture_0_to_7cm"
  ];

  try {
    const todayStr = new Date().toLocaleDateString("en-CA", { timeZone: "Asia/Bangkok" });
    const end = new Date(endDate);
    const now = new Date(todayStr);
    const diffDays = Math.floor((now.getTime() - end.getTime()) / (1000 * 3600 * 24));

    // Decision Logic:
    // If user explicitly asks for ecmwf_ifs OR if endDate is recent (< 6 days ago) in auto/hybrid mode:
    // Use Open-Meteo Forecast API with ECMWF IFS (0-Day Lag, High Resolution 9km).
    const requestedModel = searchParams.get("model") || "auto";
    const useForecastIfs = requestedModel === "ecmwf_ifs" || (requestedModel !== "era5_land" && diffDays < 6);

    let rawData: any = null;
    let sourceModelUsed = "ECMWF ERA5-Land (9 km)";

    if (useForecastIfs) {
      // 1. Fetch from Forecast API (ECMWF IFS - Real Time / 0-Day Lag)
      const forecastUrl = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lng}&start_date=${startDate}&end_date=${endDate}&hourly=${variables.join(",")}&models=ecmwf_ifs&wind_speed_unit=ms&timezone=auto`;
      console.log("Fetching ECMWF IFS (Real-Time 0-Day Lag):", forecastUrl);

      const res = await fetch(forecastUrl);
      if (res.ok) {
        rawData = await res.json();
        sourceModelUsed = "ECMWF IFS (Operational 9 km, 0-Day Lag)";
      } else {
        console.warn("Forecast API IFS returned non-200, trying archive API...");
      }
    }

    // 2. If not fetched yet (or historical date > 5 days), fetch from Archive API (ERA5-Land)
    if (!rawData) {
      const archiveUrl = `https://archive-api.open-meteo.com/v1/archive?latitude=${lat}&longitude=${lng}&start_date=${startDate}&end_date=${endDate}&hourly=${variables.join(",")}&models=era5_land,era5&wind_speed_unit=ms&timezone=auto`;
      console.log("Fetching ECMWF ERA5-Land Archive:", archiveUrl);

      const res = await fetch(archiveUrl);
      if (res.ok) {
        rawData = await res.json();
        sourceModelUsed = "ECMWF ERA5-Land (High-Res 9 km Reanalysis)";
      } else {
        const errText = await res.text();
        // If archive failed (e.g. recent date not yet in archive), fallback to IFS
        const fallbackUrl = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lng}&start_date=${startDate}&end_date=${endDate}&hourly=${variables.join(",")}&models=ecmwf_ifs&wind_speed_unit=ms&timezone=auto`;
        const fbRes = await fetch(fallbackUrl);
        if (fbRes.ok) {
          rawData = await fbRes.json();
          sourceModelUsed = "ECMWF IFS (Fallback Real-Time)";
        } else {
          throw new Error(`Open-Meteo responded with status ${res.status}: ${errText}`);
        }
      }
    }

    // Process and aggregate everything server-side
    const climatology = processERA5Hourly(rawData);
    (climatology as any).sourceModel = sourceModelUsed;

    return NextResponse.json(climatology);
  } catch (error: any) {
    console.error("Error in GET /api/reanalysis/data:", error);
    return NextResponse.json(
      { error: error.message || "Failed to process reanalysis data" },
      { status: 500 }
    );
  }
}
