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

  try {
    // Construct Open-Meteo ERA5 URL
    const variables = [
      "temperature_2m",
      "relative_humidity_2m",
      "dew_point_2m",
      "surface_pressure",
      "pressure_msl",
      "rain",
      "wind_speed_10m",
      "wind_gusts_10m",
      "wind_direction_10m",
      "cloud_cover",
      "shortwave_radiation",
      "soil_temperature_0_to_7cm",
      "soil_moisture_0_to_7cm"
    ];

    const apiUrl = `https://archive-api.open-meteo.com/v1/archive?latitude=${lat}&longitude=${lng}&start_date=${startDate}&end_date=${endDate}&hourly=${variables.join(",")}&wind_speed_unit=ms&timezone=auto`;

    console.log("Fetching ERA5 Reanalysis data from Open-Meteo:", apiUrl);

    const response = await fetch(apiUrl);
    if (!response.ok) {
      const errText = await response.text();
      throw new Error(`Open-Meteo responded with status ${response.status}: ${errText}`);
    }

    const rawData = await response.json();
    
    // Process and aggregate everything server-side
    const climatology = processERA5Hourly(rawData);

    return NextResponse.json(climatology);
  } catch (error: any) {
    console.error("Error in GET /api/reanalysis/data:", error);
    return NextResponse.json(
      { error: error.message || "Failed to process ERA5 data" },
      { status: 500 }
    );
  }
}
