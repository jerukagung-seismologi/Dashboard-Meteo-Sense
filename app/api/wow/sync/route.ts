import { NextRequest, NextResponse } from "next/server";

export const runtime = "edge";

interface ObservationItem {
  timestamp: number; // UNIX timestamp in ms
  temperature?: number; // °C
  humidity?: number; // %
  pressure?: number; // hPa
  dew?: number; // °C
  rainfall?: number; // mm
  rainrate?: number; // mm/h
  lux?: number;
  soil_temp?: number; // °C
  soil_moisture?: number; // %
  wind_speed?: number; // m/s or km/h
  wind_dir?: number; // °
  wind_gust?: number;
  wind_gust_dir?: number;
}

interface WOWSyncPayload {
  siteId: string;
  siteAuthenticationKey: string;
  elevationMeters?: number;
  observations: ObservationItem[];
}

// Convert °C to °F
function cToF(c: number): number {
  return Number(((c * 1.8) + 32).toFixed(2));
}

// Convert hPa to inHg
function hpaToInHg(hpa: number): number {
  return Number((hpa * 0.0295299830714).toFixed(3));
}

// Convert mm to inches
function mmToInches(mm: number): number {
  return Number((mm / 25.4).toFixed(3));
}

// Calculate dew point if missing
function calcDewPoint(temp: number, hum: number): number {
  if (!Number.isFinite(temp) || !Number.isFinite(hum) || hum <= 0) return temp;
  const a = 17.27;
  const b = 237.7;
  const alpha = ((a * temp) / (b + temp)) + Math.log(hum / 100);
  const dew = (b * alpha) / (a - alpha);
  return Number.isFinite(dew) ? Number(dew.toFixed(1)) : temp;
}

// Format UTC date as YYYY-MM-DD HH:mm:ss for WOW API
function formatUtcForWOW(timestamp: number): string {
  const d = new Date(timestamp);
  const yyyy = d.getUTCFullYear();
  const mm = String(d.getUTCMonth() + 1).padStart(2, "0");
  const dd = String(d.getUTCDate()).padStart(2, "0");
  const hh = String(d.getUTCHours()).padStart(2, "0");
  const min = String(d.getUTCMinutes()).padStart(2, "0");
  const ss = String(d.getUTCSeconds()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd} ${hh}:${min}:${ss}`;
}

export async function POST(req: NextRequest) {
  try {
    const body: WOWSyncPayload = await req.json();
    const { siteId, siteAuthenticationKey, observations, elevationMeters = 100 } = body;

    if (!siteId || !siteAuthenticationKey) {
      return NextResponse.json(
        { error: "Site ID dan Site Authentication Key (PIN) wajib diisi." },
        { status: 400 }
      );
    }

    if (!observations || !Array.isArray(observations) || observations.length === 0) {
      return NextResponse.json(
        { error: "Daftar observasi kosong. Tidak ada data yang dikirim." },
        { status: 400 }
      );
    }

    // Limit maximum points per batch to prevent timeout
    const pointsToSync = observations.slice(0, 100);

    const logs: string[] = [];
    let succeeded = 0;
    let failed = 0;

    for (const obs of pointsToSync) {
      const dateUtcStr = formatUtcForWOW(obs.timestamp);
      const params = new URLSearchParams();

      params.append("siteid", siteId.trim());
      params.append("siteAuthenticationKey", siteAuthenticationKey.trim());
      params.append("dateutc", dateUtcStr);
      params.append("softwaretype", "MeteoSense_v4.0.0");

      if (Number.isFinite(obs.temperature)) {
        params.append("tempf", String(cToF(obs.temperature!)));
      }

      if (Number.isFinite(obs.humidity)) {
        params.append("humidity", String(Math.round(obs.humidity!)));
      }

      const dew = Number.isFinite(obs.dew)
        ? obs.dew!
        : (Number.isFinite(obs.temperature) && Number.isFinite(obs.humidity)
            ? calcDewPoint(obs.temperature!, obs.humidity!)
            : undefined);

      if (dew !== undefined && Number.isFinite(dew)) {
        params.append("dewptf", String(cToF(dew)));
      }

      if (Number.isFinite(obs.pressure)) {
        // Calculate MSLP if elevation is given
        const tempK = (obs.temperature || 15) + 273.15;
        const mslpHpa = elevationMeters > 0 
          ? obs.pressure! * Math.exp((9.80665 * 0.0289644 * elevationMeters) / (8.31447 * tempK))
          : obs.pressure!;
        params.append("baromin", String(hpaToInHg(mslpHpa)));
      }

      if (Number.isFinite(obs.rainrate) && obs.rainrate! >= 0) {
        params.append("rainin", String(mmToInches(obs.rainrate!)));
      }

      if (Number.isFinite(obs.rainfall) && obs.rainfall! >= 0) {
        params.append("dailyrainin", String(mmToInches(obs.rainfall!)));
      }

      if (Number.isFinite(obs.soil_temp)) {
        params.append("soiltempf", String(cToF(obs.soil_temp!)));
      }

      if (Number.isFinite(obs.soil_moisture)) {
        params.append("soilmoisture", String(Math.round(obs.soil_moisture!)));
      }

      if (Number.isFinite(obs.wind_speed)) {
        // Assuming wind speed is in m/s, convert to mph (1 m/s = 2.23694 mph)
        params.append("windspeedmph", String(Number((obs.wind_speed! * 2.23694).toFixed(1))));
      }

      if (Number.isFinite(obs.wind_dir)) {
        params.append("winddir", String(Math.round(obs.wind_dir!)));
      }

      if (Number.isFinite(obs.wind_gust)) {
        params.append("windgustmph", String(Number((obs.wind_gust! * 2.23694).toFixed(1))));
      }

      if (Number.isFinite(obs.wind_gust_dir)) {
        params.append("windgustdir", String(Math.round(obs.wind_gust_dir!)));
      }

      const targetUrl = `https://wow.metoffice.gov.uk/automaticreading?${params.toString()}`;

      try {
        const response = await fetch(targetUrl, {
          method: "GET",
          headers: {
            "User-Agent": "MeteoSense/4.0.0 (AutomaticWeatherStation)",
          },
        });

        const responseText = await response.text();

        if (response.ok || response.status === 200 || responseText.toLowerCase().includes("success")) {
          succeeded++;
          logs.push(`[OK ${response.status}] ${dateUtcStr}: Terkirim sukses ke WOW Met Office`);
        } else {
          failed++;
          logs.push(`[FAIL ${response.status}] ${dateUtcStr}: ${responseText || response.statusText}`);
        }
      } catch (err: any) {
        failed++;
        logs.push(`[ERR] ${dateUtcStr}: ${err.message || "Gagal menghubungi server WOW"}`);
      }
    }

    return NextResponse.json({
      success: succeeded > 0,
      total: pointsToSync.length,
      succeeded,
      failed,
      logs,
    });
  } catch (error: any) {
    console.error("Error in WOW Sync API:", error);
    return NextResponse.json(
      { error: error.message || "Internal server error saat sinkronisasi WOW." },
      { status: 500 }
    );
  }
}
