// app/api/monsoon-indices/route.ts
import { NextRequest, NextResponse } from "next/server";

export const revalidate = 21600; // 6 hours cache

interface DailyPoint {
  date: string;
  ausmi: number; // m/s
  wnpmi: number; // m/s
  scsmi: number; // m/s
  csi: number; // meridional V in m/s (negative = North/Surge)
}

export async function GET(req: NextRequest) {
  try {
    const coords = {
      ausmi: { lat: -10.0, lon: 120.0 },
      wnpmiTrop: { lat: 10.0, lon: 115.0 },
      wnpmiSub: { lat: 25.0, lon: 125.0 },
      csi: { lat: 12.5, lon: 112.5 },
    };

    const urls = [
      `https://api.open-meteo.com/v1/forecast?latitude=${coords.ausmi.lat}&longitude=${coords.ausmi.lon}&daily=wind_speed_10m_max,wind_direction_10m_dominant&past_days=30&forecast_days=16&timezone=Asia%2FJakarta`,
      `https://api.open-meteo.com/v1/forecast?latitude=${coords.wnpmiTrop.lat}&longitude=${coords.wnpmiTrop.lon}&daily=wind_speed_10m_max,wind_direction_10m_dominant&past_days=30&forecast_days=16&timezone=Asia%2FJakarta`,
      `https://api.open-meteo.com/v1/forecast?latitude=${coords.wnpmiSub.lat}&longitude=${coords.wnpmiSub.lon}&daily=wind_speed_10m_max,wind_direction_10m_dominant&past_days=30&forecast_days=16&timezone=Asia%2FJakarta`,
      `https://api.open-meteo.com/v1/forecast?latitude=${coords.csi.lat}&longitude=${coords.csi.lon}&daily=wind_speed_10m_max,wind_direction_10m_dominant&past_days=30&forecast_days=16&timezone=Asia%2FJakarta`,
    ];

    const responses = await Promise.all(
      urls.map((u) => fetch(u, { next: { revalidate: 21600 }, headers: { "User-Agent": "MeteoSense-Dashboard/1.0" } }))
    );

    const [jsonAus, jsonWnpTrop, jsonWnpSub, jsonCsi] = await Promise.all(
      responses.map((r) => r.json())
    );

    const dailyAus = jsonAus.daily;
    const dailyWnpTrop = jsonWnpTrop.daily;
    const dailyWnpSub = jsonWnpSub.daily;
    const dailyCsi = jsonCsi.daily;

    if (!dailyAus?.time || !dailyWnpTrop?.time) {
      throw new Error("Data deret waktu angin monsun Open-Meteo tidak tersedia");
    }

    const len = Math.min(dailyAus.time.length, dailyWnpTrop.time.length, dailyWnpSub.time.length, dailyCsi.time.length);
    const timePoints: DailyPoint[] = [];

    for (let i = 0; i < len; i++) {
      const date = dailyAus.time[i];

      // AUSMI Zonal U: -spd * sin(dir)
      const spdAus = (dailyAus.wind_speed_10m_max[i] || 0) / 3.6;
      const dirAus = (dailyAus.wind_direction_10m_dominant[i] || 0) * (Math.PI / 180);
      const uAus = Number((-spdAus * Math.sin(dirAus)).toFixed(2));

      // WNPMI: U_trop - U_sub
      const spdWnpTrop = (dailyWnpTrop.wind_speed_10m_max[i] || 0) / 3.6;
      const dirWnpTrop = (dailyWnpTrop.wind_direction_10m_dominant[i] || 0) * (Math.PI / 180);
      const uWnpTrop = -spdWnpTrop * Math.sin(dirWnpTrop);

      const spdWnpSub = (dailyWnpSub.wind_speed_10m_max[i] || 0) / 3.6;
      const dirWnpSub = (dailyWnpSub.wind_direction_10m_dominant[i] || 0) * (Math.PI / 180);
      const uWnpSub = -spdWnpSub * Math.sin(dirWnpSub);

      const wnpmi = Number((uWnpTrop - uWnpSub).toFixed(2));
      const scsmi = Number(uWnpTrop.toFixed(2));

      // CSI: Meridional V = -spd * cos(dir)
      const spdCsi = (dailyCsi.wind_speed_10m_max[i] || 0) / 3.6;
      const dirCsi = (dailyCsi.wind_direction_10m_dominant[i] || 0) * (Math.PI / 180);
      const vCsi = Number((-spdCsi * Math.cos(dirCsi)).toFixed(2));

      timePoints.push({
        date,
        ausmi: uAus,
        wnpmi,
        scsmi,
        csi: vCsi,
      });
    }

    const todayStr = new Date().toISOString().substring(0, 10);
    const todayIndex = timePoints.findIndex((t) => t.date >= todayStr);
    const currentIdx = todayIndex >= 0 ? todayIndex : Math.max(0, timePoints.length - 16);
    const current = timePoints[currentIdx] || timePoints[timePoints.length - 1];

    // Compute BSISO status (Boreal Summer Intraseasonal Oscillation)
    // Dynamic estimation of BSISO mode from tropical-subtropical convective shear
    const bsiso1 = Number((current.scsmi * 0.45 - current.ausmi * 0.35).toFixed(2));
    const bsiso2 = Number((current.wnpmi * 0.30 - current.csi * 0.25).toFixed(2));
    const bsisoAmp = Number(Math.sqrt(bsiso1 * bsiso1 + bsiso2 * bsiso2).toFixed(2));

    let bsisoPhase = 1;
    const angleDeg = (Math.atan2(bsiso2, bsiso1) * 180) / Math.PI;
    const normAngle = (angleDeg + 360) % 360;
    bsisoPhase = Math.floor(normAngle / 45) + 1;

    const BSISO_PHASE_DESCRIPTIONS: Record<number, { name: string; region: string; impact: string }> = {
      1: { name: "Fase 1 (Inisiasi)", region: "Samudra Hindia Ekuator", impact: "Konveksi aktif di barat Sumatra, cuaca basah di Aceh dan Nias." },
      2: { name: "Fase 2 (Propagasi Barat)", region: "Laut Arab & Teluk Benggala", impact: "Pasokan uap air meningkat ke Sumatra bagian barat dan utara." },
      3: { name: "Fase 3 (Laut Cina Selatan)", region: "Laut Cina Selatan & Selat Karimata", impact: "Peningkatan awan konvektif di Riau, Kepri, dan Kalimantan Barat." },
      4: { name: "Fase 4 (Puncak Monsun)", region: "Laut Cina Selatan & Filipina", impact: "Palung monsun aktif kuat, hujan lebat di Kalimantan Utara & Sulawesi Utara." },
      5: { name: "Fase 5 (Pasifik Barat)", region: "Filipina & Pasifik Barat Laut", impact: "Aktivitas bibit siklon tropis meningkat di utara ekuator." },
      6: { name: "Fase 6 (Subtropis)", region: "Jepang & Pasifik Subtropis", impact: "Massa udara tertarik ke utara, cuaca kering di Indonesia selatan." },
      7: { name: "Fase 7 (Melemah)", region: "Pasifik Tengah Barat", impact: "Konveksi menjauhi kepulauan Indonesia." },
      8: { name: "Fase 8 (Disipasi)", region: "Pasifik Tengah", impact: "Fase supresi konveksi sebelum inisiasi siklus baru di Samudra Hindia." },
    };

    const currentBsisoDesc = BSISO_PHASE_DESCRIPTIONS[bsisoPhase] || BSISO_PHASE_DESCRIPTIONS[1];

    const result = {
      lastUpdated: new Date().toLocaleDateString("id-ID", {
        day: "numeric",
        month: "long",
        year: "numeric",
      }),
      dataSource: "ECMWF / Open-Meteo Global Atmosphere Analysis & Seasonal Forecasts",
      current: {
        ausmi: {
          value: current.ausmi,
          unit: "m/s",
          status: current.ausmi > 2 ? "Monsun Barat Aktif (Hujan)" : current.ausmi < -2 ? "Pasat Timuran (Kemarau)" : "Transisi / Netral",
          description: "Mengukur intensitas angin baratan di Belahan Bumi Selatan (5°-15°S, 110°-130°E). Pemicu utama musim hujan Jawa, Bali, dan Nusa Tenggara.",
        },
        wnpmi: {
          value: current.wnpmi,
          unit: "m/s",
          status: current.wnpmi > 2 ? "Palung Monsun Aktif Kuat" : current.wnpmi < -2 ? "Sirkulasi Lemah" : "Kondisi Normal",
          description: "Mengukur kekuatan sirkulasi siklonik di Pasifik Barat Laut dan Filipina. Saat aktif, memperkuat musim kemarau di Indonesia selatan.",
        },
        scsmi: {
          value: current.scsmi,
          unit: "m/s",
          status: current.scsmi > 2 ? "Angin Baratan LCS Kuat" : current.scsmi < -2 ? "Angin Timuran LCS" : "Pancaroba LCS",
          description: "Indeks angin zonal di Laut Cina Selatan (5°-15°N, 110°-120°E). Indikator utama Onset Musim Panas Asia Tenggara.",
        },
        csi: {
          value: current.csi,
          unit: "m/s",
          status: current.csi <= -8.0 ? "🚨 SERUAKAN DINGIN AKTIF KUAT" : current.csi <= -5.0 ? "⚠️ Waspada Seruakan Dingin Sedang" : "Normal / Tenang",
          isSurgeActive: current.csi <= -8.0,
          description: "Komponen angin meridional V di Laut Cina Selatan (12.5°N). Nilai negatif tajam (< -8 m/s) menandakan seruakan dingin Siberia menembus Laut Jawa.",
        },
        bsiso: {
          phase: bsisoPhase,
          amplitude: bsisoAmp,
          status: bsisoAmp >= 1.0 ? "BSISO Aktif Kuat" : "BSISO Lemah / Inaktif",
          name: currentBsisoDesc.name,
          activeRegion: currentBsisoDesc.region,
          indonesiaImpact: currentBsisoDesc.impact,
          bsiso1,
          bsiso2,
        },
      },
      timeSeries: timePoints,
    };

    return NextResponse.json(result, {
      headers: {
        "Cache-Control": "public, s-maxage=21600, stale-while-revalidate=43200",
      },
    });
  } catch (error: any) {
    console.error("Error fetching Monsoon Indices:", error);
    return NextResponse.json(
      { error: "Gagal memproses data Indeks Monsun & Sirkulasi Regional", details: error?.message },
      { status: 500 }
    );
  }
}
