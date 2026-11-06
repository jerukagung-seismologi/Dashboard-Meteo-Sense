import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export interface ReferenceGuidePoint {
  timestamp: number; // ms
  timeFormatted: string;
  dateFormatted: string;
  temperature?: number;
  humidity?: number;
  pressure?: number;
  dew?: number;
  rainfall?: number;
  rainrate?: number;
  windSpeed?: number;
  lux?: number;
  soil_temp?: number;
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const latStr = searchParams.get("latitude") || searchParams.get("lat") || "-7.7121";
  const lngStr = searchParams.get("longitude") || searchParams.get("lng") || searchParams.get("lon") || "109.6892";
  const startDate = searchParams.get("start_date"); // YYYY-MM-DD
  const endDate = searchParams.get("end_date"); // YYYY-MM-DD
  const model = searchParams.get("model") || "ecmwf_ifs"; // ecmwf_ifs | era5

  const lat = parseFloat(latStr);
  const lng = parseFloat(lngStr);

  if (isNaN(lat) || isNaN(lng)) {
    return NextResponse.json(
      { error: "Parameter latitude dan longitude harus berupa angka valid." },
      { status: 400 }
    );
  }

  if (!startDate || !endDate) {
    return NextResponse.json(
      { error: "Parameter start_date dan end_date (YYYY-MM-DD) wajib disertakan." },
      { status: 400 }
    );
  }

  const startMs = new Date(`${startDate}T00:00:00+07:00`).getTime();
  const nowMs = Date.now();
  const ninetyDaysAgoMs = nowMs - 90 * 86400 * 1000;

  // Tentukan apakah menggunakan Forecast API (ECMWF IFS) atau Archive API (ERA5-Land)
  const isArchive = startMs < ninetyDaysAgoMs || model === "era5";

  const hourlyVars = [
    "temperature_2m",
    "relative_humidity_2m",
    "surface_pressure",
    "dew_point_2m",
    "precipitation",
    "wind_speed_10m",
    "shortwave_radiation",
    "soil_temperature_0cm",
  ].join(",");

  const params = new URLSearchParams({
    latitude: lat.toString(),
    longitude: lng.toString(),
    start_date: startDate,
    end_date: endDate,
    hourly: hourlyVars,
    timezone: "Asia/Bangkok", // WIB (UTC+7)
    wind_speed_unit: "ms",
  });

  if (!isArchive) {
    params.set("models", "ecmwf_ifs");
  }

  const baseUrl = isArchive
    ? `https://archive-api.open-meteo.com/v1/archive?${params.toString()}`
    : `https://api.open-meteo.com/v1/forecast?${params.toString()}`;

  try {
    const res = await fetch(baseUrl, {
      headers: {
        "User-Agent": "MeteoSense-Dashboard/4.0 (QC-Reference-Guide)",
        Accept: "application/json",
      },
      next: { revalidate: 300 },
    });

    if (!res.ok) {
      const errText = await res.text();
      console.warn("Open-Meteo Reference Guide API status:", res.status, errText);
      return NextResponse.json(
        { error: `Gagal mengambil data penuntun model (${res.status}): ${errText}` },
        { status: res.status }
      );
    }

    const json = await res.json();
    const hourly = json.hourly;

    if (!hourly || !Array.isArray(hourly.time)) {
      return NextResponse.json(
        { error: "Format data Open-Meteo tidak memiliki field hourly." },
        { status: 502 }
      );
    }

    const times: string[] = hourly.time;
    const points: ReferenceGuidePoint[] = times.map((tStr: string, idx: number) => {
      // tStr format: "2026-11-05T00:00"
      const timestamp = new Date(`${tStr}:00+07:00`).getTime();
      const d = new Date(timestamp);
      const hh = String(d.getHours()).padStart(2, "0");
      const mm = String(d.getMinutes()).padStart(2, "0");
      const day = String(d.getDate()).padStart(2, "0");
      const month = String(d.getMonth() + 1).padStart(2, "0");
      const year = d.getFullYear();

      const tempVal = hourly.temperature_2m?.[idx];
      const humVal = hourly.relative_humidity_2m?.[idx];
      const pressVal = hourly.surface_pressure?.[idx];
      const dewVal = hourly.dew_point_2m?.[idx];
      const rainVal = hourly.precipitation?.[idx];
      const windVal = hourly.wind_speed_10m?.[idx];
      const radVal = hourly.shortwave_radiation?.[idx];
      const soilVal = hourly.soil_temperature_0cm?.[idx];

      return {
        timestamp,
        timeFormatted: `${hh}:${mm}`,
        dateFormatted: `${day}/${month}/${year} ${hh}:${mm}`,
        temperature: tempVal != null && Number.isFinite(Number(tempVal)) ? Number(Number(tempVal).toFixed(2)) : undefined,
        humidity: humVal != null && Number.isFinite(Number(humVal)) ? Number(Number(humVal).toFixed(1)) : undefined,
        pressure: pressVal != null && Number.isFinite(Number(pressVal)) ? Number(Number(pressVal).toFixed(2)) : undefined,
        dew: dewVal != null && Number.isFinite(Number(dewVal)) ? Number(Number(dewVal).toFixed(2)) : undefined,
        rainfall: rainVal != null && Number.isFinite(Number(rainVal)) ? Number(Number(rainVal).toFixed(2)) : 0,
        rainrate: rainVal != null && Number.isFinite(Number(rainVal)) ? Number(Number(rainVal).toFixed(2)) : 0,
        windSpeed: windVal != null && Number.isFinite(Number(windVal)) ? Number(Number(windVal).toFixed(2)) : undefined,
        lux: radVal != null && Number.isFinite(Number(radVal)) ? Math.round(Number(radVal) * 126.7) : 0, // Approx conversion W/m² to Lux
        soil_temp: soilVal != null && Number.isFinite(Number(soilVal)) ? Number(Number(soilVal).toFixed(2)) : undefined,
      };
    });

    return NextResponse.json({
      modelName: isArchive ? "ECMWF ERA5-Land (Reanalisis)" : "ECMWF IFS (9 km Operasional)",
      source: isArchive ? "era5_archive" : "ecmwf_ifs_forecast",
      startDate,
      endDate,
      pointCount: points.length,
      points,
    });
  } catch (error: any) {
    console.error("Error in GET /api/weather/reference-guide:", error);
    return NextResponse.json(
      { error: error.message || "Internal server error fetching reference guide" },
      { status: 500 }
    );
  }
}
