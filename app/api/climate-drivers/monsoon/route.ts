// app/api/climate-drivers/monsoon/route.ts
import { NextRequest, NextResponse } from "next/server";
import { MonsoonData, MonsoonDataPoint, MonsoonStatusType } from "@/lib/climate-drivers/types";

export const revalidate = 21600; // 6 hours cache

const REGION_CONFIG = {
  name: "Laut Jawa - Selat Makassar (0°-10°S, 110°-130°E)",
  lat: -5.0,
  lon: 115.0,
};

const CARDINAL_DIRECTIONS = [
  "Utara (N)", "Utara-Timur Laut (NNE)", "Timur Laut (NE)", "Timur-Timur Laut (ENE)",
  "Timur (E)", "Timur-Tenggara (ESE)", "Tenggara (SE)", "Selatan-Tenggara (SSE)",
  "Selatan (S)", "Selatan-Barat Daya (SSW)", "Barat Daya (SW)", "Barat-Barat Daya (WSW)",
  "Barat (W)", "Barat-Barat Laut (WNW)", "Barat Laut (NW)", "Utara-Barat Laut (NNW)"
];

function getCardinalDirection(deg: number): string {
  const index = Math.round((deg % 360) / 22.5) % 16;
  return CARDINAL_DIRECTIONS[index] || "Variabel";
}

function getMonsoonStatus(zonalWindMs: number): MonsoonStatusType {
  if (zonalWindMs > 2.0) return "Monsun Barat (Musim Hujan)";
  if (zonalWindMs < -2.0) return "Monsun Timur (Musim Kemarau)";
  return "Pancaroba / Transisi";
}

const MONTH_NAMES = [
  "Jan", "Feb", "Mar", "Apr", "Mei", "Jun",
  "Jul", "Agu", "Sep", "Okt", "Nov", "Des"
];

export async function GET(req: NextRequest) {
  try {
    const weatherUrl = `https://api.open-meteo.com/v1/forecast?latitude=${REGION_CONFIG.lat}&longitude=${REGION_CONFIG.lon}&daily=wind_speed_10m_max,wind_direction_10m_dominant&past_days=30&forecast_days=16&timezone=Asia%2FJakarta`;
    const seasonalUrl = `https://seasonal-api.open-meteo.com/v1/seasonal?latitude=${REGION_CONFIG.lat}&longitude=${REGION_CONFIG.lon}&hourly=wind_speed_10m,wind_direction_10m`;

    const [resWeather, resSeasonal] = await Promise.all([
      fetch(weatherUrl, { next: { revalidate: 21600 }, headers: { "User-Agent": "MeteoSense-Dashboard/1.0" } }),
      fetch(seasonalUrl, { next: { revalidate: 43200 }, headers: { "User-Agent": "MeteoSense-Dashboard/1.0" } }),
    ]);

    if (!resWeather.ok) {
      throw new Error(`Open-Meteo Weather API failed with status ${resWeather.status}`);
    }

    const weatherJson = await resWeather.json();
    const seasonalJson = resSeasonal.ok ? await resSeasonal.json() : null;

    const daily = weatherJson.daily;
    if (!daily || !daily.time || daily.time.length === 0) {
      throw new Error("Data angin harian tidak tersedia");
    }

    const todayStr = new Date().toISOString().substring(0, 10);
    const todayIndex = daily.time.findIndex((t: string) => t >= todayStr);
    const validTodayIdx = todayIndex >= 0 ? todayIndex : Math.max(0, daily.time.length - 16);

    const allPoints: MonsoonDataPoint[] = [];

    for (let i = 0; i < daily.time.length; i++) {
      const date = daily.time[i];
      const speedKmh = daily.wind_speed_10m_max[i] || 0;
      const speedMs = Number((speedKmh / 3.6).toFixed(2));
      const dirDeg = daily.wind_direction_10m_dominant[i] || 0;

      const rad = (dirDeg * Math.PI) / 180;
      // Zonal wind U = -speed * sin(dir)
      const u = Number((-speedMs * Math.sin(rad)).toFixed(2));
      // Meridional wind V = -speed * cos(dir)
      const v = Number((-speedMs * Math.cos(rad)).toFixed(2));

      allPoints.push({
        date,
        zonalWind: u,
        meridionalWind: v,
        windSpeed: speedKmh,
        windSpeedMs: speedMs,
        windDirection: dirDeg,
        status: getMonsoonStatus(u),
      });
    }

    const historical = allPoints.slice(0, validTodayIdx + 1);
    const forecast16Days = allPoints.slice(validTodayIdx);

    const currentPoint = allPoints[validTodayIdx] || allPoints[allPoints.length - 1];
    const currentZonalWind = currentPoint?.zonalWind || -3.5;
    const currentWindSpeedMs = currentPoint?.windSpeedMs || 5.2;
    const currentWindDirection = currentPoint?.windDirection || 115;
    const currentStatus = getMonsoonStatus(currentZonalWind);
    const directionName = getCardinalDirection(currentWindDirection);

    const seasonType: "Musim Kemarau" | "Musim Hujan" | "Pancaroba" =
      currentZonalWind < -2.0
        ? "Musim Kemarau"
        : currentZonalWind > 2.0
        ? "Musim Hujan"
        : "Pancaroba";

    // Build Seasonal Forecast from Open-Meteo Seasonal API
    const seasonalForecast: Array<{
      month: string;
      label: string;
      meanZonalWind: number;
      status: MonsoonStatusType;
      dominantDirection: string;
    }> = [];

    if (seasonalJson?.hourly?.time) {
      const hourly = seasonalJson.hourly;
      const monthlyBuckets: Record<string, { uVals: number[]; dirs: number[] }> = {};

      for (let idx = 0; idx < hourly.time.length; idx++) {
        const timeStr = hourly.time[idx];
        const monthKey = timeStr.substring(0, 7);

        const spdKmh = hourly.wind_speed_10m?.[idx] || 0;
        const spdMs = spdKmh / 3.6;
        const dir = hourly.wind_direction_10m?.[idx] || 0;
        const rad = (dir * Math.PI) / 180;
        const u = -spdMs * Math.sin(rad);

        if (!monthlyBuckets[monthKey]) {
          monthlyBuckets[monthKey] = { uVals: [], dirs: [] };
        }
        monthlyBuckets[monthKey].uVals.push(u);
        monthlyBuckets[monthKey].dirs.push(dir);
      }

      const sortedMonths = Object.keys(monthlyBuckets).sort();
      for (const mKey of sortedMonths) {
        const b = monthlyBuckets[mKey];
        if (b.uVals.length === 0) continue;

        const meanU = Number((b.uVals.reduce((a, c) => a + c, 0) / b.uVals.length).toFixed(2));
        const avgDir = Math.round(b.dirs.reduce((a, c) => a + c, 0) / b.dirs.length);
        const [yStr, mStr] = mKey.split("-");
        const mIdx = parseInt(mStr, 10) - 1;
        const label = `${MONTH_NAMES[mIdx]} ${yStr}`;

        seasonalForecast.push({
          month: mKey,
          label,
          meanZonalWind: meanU,
          status: getMonsoonStatus(meanU),
          dominantDirection: getCardinalDirection(avgDir),
        });
      }
    }

    const monsoonData: MonsoonData = {
      status: currentStatus,
      currentZonalWind,
      currentWindSpeedMs,
      currentWindDirection,
      directionName,
      seasonType,
      lastUpdated: new Date().toLocaleDateString("id-ID", {
        day: "numeric",
        month: "long",
        year: "numeric",
      }),
      dataSource: "Open-Meteo Marine & Atmosphere ECMWF Reanalysis / Forecast",
      sourceUrl: "https://open-meteo.com/en/docs",
      summary: `Indeks Monsun Indonesia saat ini menunjukkan nilai angin zonal U = ${currentZonalWind > 0 ? "+" : ""}${currentZonalWind} m/s (${currentStatus}). Aliran angin dominan bertiup dari arah ${directionName} dengan kecepatan ${currentWindSpeedMs} m/s (${(currentWindSpeedMs * 3.6).toFixed(1)} km/jam).`,
      historical,
      forecast16Days,
      seasonalForecast,
      interpretation: {
        whatIsIt: `Monsun adalah sirkulasi angin skala besar regional di wilayah tropis yang mengalami pembalikan arah secara berkala (sekitar setiap 6 bulan sekali) akibat perbedaan pemanasan termal antara Benua Asia dan Benua Australia. Di Indonesia, fenomena monsun menjadi penentu utama pergeseran musim hujan dan musim kemarau.`,
        indonesiaImpact: `Ketika Monsun Barat aktif (Oktober - Maret), angin bertiup dari arah Barat/Barat Laut melintasi Samudra Hindia dan Laut Cina Selatan, membawa uap air melimpah yang memicu musim hujan. Sebaliknya, ketika Monsun Timur aktif (April - September), angin bertiup dari daratan Australia yang kering dan dingin, memicu musim kemarau di Jawa, Bali, NTB, dan NTT.`,
        westMonsoon: `Monsun Barat (Asia Monsoon): Angin zonal U bertanda positif (> +2.0 m/s). Membawa kelembapan tinggi, tutupan awan konvektif luas, dan curah hujan harian yang tinggi di seluruh kepulauan Indonesia.`,
        eastMonsoon: `Monsun Timur (Australian Monsoon): Angin zonal U bertanda negatif (< -2.0 m/s). Udara bersifat kering dan stabil, membatasi pertumbuhan awan konvektif dan menurunkan curah hujan secara drastis.`,
        transitionSeason: `Masa Pancaroba / Transisi: Kecepatan angin zonal melemah (|U| <= 2.0 m/s) dengan arah angin berubah-ubah. Ditandai dengan cuaca terik di siang hari diikuti potensi hujan lebat, petir, dan angin kencang lokal di sore/malam hari.`,
        currentAssessment: `Berdasarkan observasi angin terkini di wilayah perairan tengah Indonesia (Laut Jawa - Selat Makassar), sirkulasi atmosfer berada dalam kondisi ${currentStatus}. Angin bertiup stabil dari arah ${directionName} dengan komponen zonal ${currentZonalWind > 0 ? "+" : ""}${currentZonalWind} m/s, menegaskan dominasi ${seasonType} di wilayah Indonesia.`,
      },
    };

    return NextResponse.json(monsoonData, {
      headers: {
        "Cache-Control": "public, s-maxage=21600, stale-while-revalidate=43200",
      },
    });
  } catch (error: any) {
    console.error("Error fetching Monsoon index data:", error);
    return NextResponse.json(
      { error: "Gagal memproses data Indeks Monsun Indonesia", details: error?.message },
      { status: 500 }
    );
  }
}
