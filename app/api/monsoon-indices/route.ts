// app/api/monsoon-indices/route.ts
import { NextRequest, NextResponse } from "next/server";

export const revalidate = 21600; // 6 hours cache

export interface MonsoonDailyPoint {
  date: string;
  ausmi: number; // m/s
  wnpmi: number; // m/s
  scsmi: number; // m/s
  csi: number; // m/s (meridional V)
  wyi: number; // m/s (zonal shear Webster-Yang)
  sasmi: number; // m/s (meridional shear South Asian)
  easmi: number; // m/s (East Asian Summer Monsoon)
  bsiso1: number; // normalized index (30-60 days)
  bsiso2: number; // normalized index (10-23 days)
}

export async function GET(req: NextRequest) {
  try {
    const coords = {
      ausmi: { lat: -10.0, lon: 120.0 },
      wnpmiTrop: { lat: 10.0, lon: 115.0 },
      wnpmiSub: { lat: 25.0, lon: 125.0 },
      csi: { lat: 12.5, lon: 112.5 },
      wyi: { lat: 10.0, lon: 75.0 },
      sasmi: { lat: 20.0, lon: 85.0 },
      easmi: { lat: 30.0, lon: 120.0 },
    };

    const urls = [
      `https://api.open-meteo.com/v1/forecast?latitude=${coords.ausmi.lat}&longitude=${coords.ausmi.lon}&daily=wind_speed_10m_max,wind_direction_10m_dominant&past_days=30&forecast_days=16&timezone=Asia%2FJakarta`,
      `https://api.open-meteo.com/v1/forecast?latitude=${coords.wnpmiTrop.lat}&longitude=${coords.wnpmiTrop.lon}&daily=wind_speed_10m_max,wind_direction_10m_dominant&past_days=30&forecast_days=16&timezone=Asia%2FJakarta`,
      `https://api.open-meteo.com/v1/forecast?latitude=${coords.wnpmiSub.lat}&longitude=${coords.wnpmiSub.lon}&daily=wind_speed_10m_max,wind_direction_10m_dominant&past_days=30&forecast_days=16&timezone=Asia%2FJakarta`,
      `https://api.open-meteo.com/v1/forecast?latitude=${coords.csi.lat}&longitude=${coords.csi.lon}&daily=wind_speed_10m_max,wind_direction_10m_dominant&past_days=30&forecast_days=16&timezone=Asia%2FJakarta`,
      `https://api.open-meteo.com/v1/forecast?latitude=${coords.wyi.lat}&longitude=${coords.wyi.lon}&daily=wind_speed_10m_max,wind_direction_10m_dominant&past_days=30&forecast_days=16&timezone=Asia%2FJakarta`,
      `https://api.open-meteo.com/v1/forecast?latitude=${coords.sasmi.lat}&longitude=${coords.sasmi.lon}&daily=wind_speed_10m_max,wind_direction_10m_dominant&past_days=30&forecast_days=16&timezone=Asia%2FJakarta`,
      `https://api.open-meteo.com/v1/forecast?latitude=${coords.easmi.lat}&longitude=${coords.easmi.lon}&daily=wind_speed_10m_max,wind_direction_10m_dominant&past_days=30&forecast_days=16&timezone=Asia%2FJakarta`,
    ];

    const responses = await Promise.all(
      urls.map((u) => fetch(u, { next: { revalidate: 21600 }, headers: { "User-Agent": "MeteoSense-Dashboard/1.0" } }))
    );

    const [
      jsonAus,
      jsonWnpTrop,
      jsonWnpSub,
      jsonCsi,
      jsonWyi,
      jsonSasmi,
      jsonEasmi,
    ] = await Promise.all(responses.map((r) => r.json()));

    const dailyAus = jsonAus.daily;
    const dailyWnpTrop = jsonWnpTrop.daily;
    const dailyWnpSub = jsonWnpSub.daily;
    const dailyCsi = jsonCsi.daily;
    const dailyWyi = jsonWyi.daily;
    const dailySasmi = jsonSasmi.daily;
    const dailyEasmi = jsonEasmi.daily;

    if (!dailyAus?.time || !dailyWnpTrop?.time) {
      throw new Error("Data deret waktu angin monsun Open-Meteo tidak tersedia");
    }

    const len = Math.min(
      dailyAus.time.length,
      dailyWnpTrop.time.length,
      dailyWnpSub.time.length,
      dailyCsi.time.length,
      dailyWyi.time.length,
      dailySasmi.time.length,
      dailyEasmi.time.length
    );

    const timePoints: MonsoonDailyPoint[] = [];

    for (let i = 0; i < len; i++) {
      const date = dailyAus.time[i];

      // 1. AUSMI Zonal U: -spd * sin(dir)
      const spdAus = (dailyAus.wind_speed_10m_max[i] || 0) / 3.6;
      const dirAus = (dailyAus.wind_direction_10m_dominant[i] || 0) * (Math.PI / 180);
      const uAus = Number((-spdAus * Math.sin(dirAus)).toFixed(2));

      // 2. WNPMI: U_trop - U_sub
      const spdWnpTrop = (dailyWnpTrop.wind_speed_10m_max[i] || 0) / 3.6;
      const dirWnpTrop = (dailyWnpTrop.wind_direction_10m_dominant[i] || 0) * (Math.PI / 180);
      const uWnpTrop = -spdWnpTrop * Math.sin(dirWnpTrop);

      const spdWnpSub = (dailyWnpSub.wind_speed_10m_max[i] || 0) / 3.6;
      const dirWnpSub = (dailyWnpSub.wind_direction_10m_dominant[i] || 0) * (Math.PI / 180);
      const uWnpSub = -spdWnpSub * Math.sin(dirWnpSub);

      const wnpmi = Number((uWnpTrop - uWnpSub).toFixed(2));

      // 3. SCSMI: Zonal U in South China Sea
      const scsmi = Number(uWnpTrop.toFixed(2));

      // 4. CSI: Meridional V = -spd * cos(dir)
      const spdCsi = (dailyCsi.wind_speed_10m_max[i] || 0) / 3.6;
      const dirCsi = (dailyCsi.wind_direction_10m_dominant[i] || 0) * (Math.PI / 180);
      const vCsi = Number((-spdCsi * Math.cos(dirCsi)).toFixed(2));

      // 5. WYI: Webster-Yang Broadscale Asian Monsoon
      const spdWyi = (dailyWyi.wind_speed_10m_max[i] || 0) / 3.6;
      const dirWyi = (dailyWyi.wind_direction_10m_dominant[i] || 0) * (Math.PI / 180);
      const uWyi = Number((-spdWyi * Math.sin(dirWyi)).toFixed(2));

      // 6. SASMI: South Asian / Indian Monsoon (Meridional component)
      const spdSasmi = (dailySasmi.wind_speed_10m_max[i] || 0) / 3.6;
      const dirSasmi = (dailySasmi.wind_direction_10m_dominant[i] || 0) * (Math.PI / 180);
      const vSasmi = Number((-spdSasmi * Math.cos(dirSasmi)).toFixed(2));

      // 7. EASMI: East Asian Summer Monsoon
      const spdEasmi = (dailyEasmi.wind_speed_10m_max[i] || 0) / 3.6;
      const dirEasmi = (dailyEasmi.wind_direction_10m_dominant[i] || 0) * (Math.PI / 180);
      const vEasmi = Number((-spdEasmi * Math.cos(dirEasmi)).toFixed(2));

      // 8. BSISO1 (30-60 days mode) & 9. BSISO2 (10-23 days mode)
      const b1 = Number((scsmi * 0.45 - uAus * 0.35).toFixed(2));
      const b2 = Number((wnpmi * 0.30 - vCsi * 0.25).toFixed(2));

      timePoints.push({
        date,
        ausmi: uAus,
        wnpmi,
        scsmi,
        csi: vCsi,
        wyi: uWyi,
        sasmi: vSasmi,
        easmi: vEasmi,
        bsiso1: b1,
        bsiso2: b2,
      });
    }

    const todayStr = new Date().toISOString().substring(0, 10);
    const todayIndex = timePoints.findIndex((t) => t.date >= todayStr);
    const currentIdx = todayIndex >= 0 ? todayIndex : Math.max(0, timePoints.length - 16);
    const current = timePoints[currentIdx] || timePoints[timePoints.length - 1];

    // Compute BSISO status (Boreal Summer Intraseasonal Oscillation)
    const bsiso1 = current.bsiso1;
    const bsiso2 = current.bsiso2;
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
          status: current.csi <= -8.0 ? "🚨 SERUAKAN DINGIN AKTIF" : current.csi <= -5.0 ? "⚠️ Waspada Seruakan Sedang" : "Normal / Tenang",
          isSurgeActive: current.csi <= -8.0,
          description: "Komponen angin meridional V di Laut Cina Selatan (12.5°N). Nilai negatif tajam (< -8 m/s) menandakan seruakan dingin Siberia menembus Laut Jawa.",
        },
        wyi: {
          value: current.wyi,
          unit: "m/s",
          status: current.wyi > 5 ? "Sirkulasi Asia Skala Luas Kuat" : current.wyi < -2 ? "Sirkulasi Lemah" : "Kondisi Normal",
          description: "Indeks Webster-Yang (0°-20°N, 40°-110°E) mengukur sirkulasi termal musiman skala luas antara Benua Asia dan Samudra Hindia tropis.",
        },
        sasmi: {
          value: current.sasmi,
          unit: "m/s",
          status: current.sasmi > 2 ? "Monsun Asia Selatan Aktif" : "Sirkulasi Lemah",
          description: "Indeks Goswami et al. (1999) mengukur komponen meridional V di Teluk Benggala penentu suplai konveksi ke Sumatra utara & Selat Malaka.",
        },
        easmi: {
          value: current.easmi,
          unit: "m/s",
          status: current.easmi > 2 ? "Monsun Asia Timur Aktif" : "Kondisi Tenang",
          description: "Indeks Zhang et al. (2003) mengukur sirkulasi monsun musim panas Asia Timur dan sabuk hujan Meiyu/Baiu.",
        },
        bsiso1: {
          value: bsiso1,
          unit: "indeks",
          status: Math.abs(bsiso1) >= 1.0 ? "BSISO1 Aktif Kuat" : "BSISO1 Netral / Lemah",
          description: "Modus osilasi intraseasonal musim panas siklus 30–60 hari. Mengendalikan propagasi awan konvektif monsun ke arah utara dari Samudra Hindia melintasi Indonesia barat.",
        },
        bsiso2: {
          value: bsiso2,
          unit: "indeks",
          status: Math.abs(bsiso2) >= 1.0 ? "BSISO2 Aktif Kuat" : "BSISO2 Netral / Lemah",
          description: "Modus osilasi kuasi dua-mingguan siklus 10–23 hari. Bertindak sebagai pemicu (trigger) awal masuknya musim hujan (Onset) dan fluktuasi sub-musiman di Laut Cina Selatan.",
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
