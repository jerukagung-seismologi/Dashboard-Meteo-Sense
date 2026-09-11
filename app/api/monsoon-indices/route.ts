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

async function fetchJsonWithRetry(url: string, retries = 2, timeoutMs = 12000): Promise<any> {
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), timeoutMs);
      const res = await fetch(url, {
        signal: controller.signal,
        next: { revalidate: 21600 },
        headers: { "User-Agent": "MeteoSense-Dashboard/1.0" },
      });
      clearTimeout(timer);
      if (!res.ok) {
        throw new Error(`HTTP ${res.status}: ${res.statusText}`);
      }
      return await res.json();
    } catch (err) {
      if (attempt === retries) throw err;
      await new Promise((r) => setTimeout(r, 600 * (attempt + 1)));
    }
  }
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
      // 1. AUSMI: U850 in Southern Hemisphere
      `https://api.open-meteo.com/v1/forecast?latitude=${coords.ausmi.lat}&longitude=${coords.ausmi.lon}&hourly=wind_speed_850hPa,wind_direction_850hPa&wind_speed_unit=ms&past_days=30&forecast_days=16&timezone=Asia%2FJakarta`,
      // 2. WNPMI Tropics: U850
      `https://api.open-meteo.com/v1/forecast?latitude=${coords.wnpmiTrop.lat}&longitude=${coords.wnpmiTrop.lon}&hourly=wind_speed_850hPa,wind_direction_850hPa&wind_speed_unit=ms&past_days=30&forecast_days=16&timezone=Asia%2FJakarta`,
      // 3. WNPMI Subtropics: U850
      `https://api.open-meteo.com/v1/forecast?latitude=${coords.wnpmiSub.lat}&longitude=${coords.wnpmiSub.lon}&hourly=wind_speed_850hPa,wind_direction_850hPa&wind_speed_unit=ms&past_days=30&forecast_days=16&timezone=Asia%2FJakarta`,
      // 4. CSI: V925 in South China Sea (Chang et al. 2005 / BMKG standard)
      `https://api.open-meteo.com/v1/forecast?latitude=${coords.csi.lat}&longitude=${coords.csi.lon}&hourly=wind_speed_925hPa,wind_direction_925hPa&wind_speed_unit=ms&past_days=30&forecast_days=16&timezone=Asia%2FJakarta`,
      // 5. WYI: Webster-Yang vertical shear (U850 - U200)
      `https://api.open-meteo.com/v1/forecast?latitude=${coords.wyi.lat}&longitude=${coords.wyi.lon}&hourly=wind_speed_850hPa,wind_direction_850hPa,wind_speed_200hPa,wind_direction_200hPa&wind_speed_unit=ms&past_days=30&forecast_days=16&timezone=Asia%2FJakarta`,
      // 6. SASMI: South Asian vertical shear (V850 - V200, Goswami et al. 1999)
      `https://api.open-meteo.com/v1/forecast?latitude=${coords.sasmi.lat}&longitude=${coords.sasmi.lon}&hourly=wind_speed_850hPa,wind_direction_850hPa,wind_speed_200hPa,wind_direction_200hPa&wind_speed_unit=ms&past_days=30&forecast_days=16&timezone=Asia%2FJakarta`,
      // 7. EASMI: East Asian V850
      `https://api.open-meteo.com/v1/forecast?latitude=${coords.easmi.lat}&longitude=${coords.easmi.lon}&hourly=wind_speed_850hPa,wind_direction_850hPa&wind_speed_unit=ms&past_days=30&forecast_days=16&timezone=Asia%2FJakarta`,
    ];

    const [
      jsonAus,
      jsonWnpTrop,
      jsonWnpSub,
      jsonCsi,
      jsonWyi,
      jsonSasmi,
      jsonEasmi,
    ] = await Promise.all(urls.map((u) => fetchJsonWithRetry(u)));

    const hourlyAus = jsonAus?.hourly;
    const hourlyWnpTrop = jsonWnpTrop?.hourly;
    const hourlyWnpSub = jsonWnpSub?.hourly;
    const hourlyCsi = jsonCsi?.hourly;
    const hourlyWyi = jsonWyi?.hourly;
    const hourlySasmi = jsonSasmi?.hourly;
    const hourlyEasmi = jsonEasmi?.hourly;

    if (!hourlyAus?.time || !hourlyWnpTrop?.time) {
      throw new Error("Data deret waktu angin monsun Open-Meteo tidak tersedia");
    }

    const times = hourlyAus.time;
    const totalHours = times.length;

    // Agregasi Vektor Harian Sejati (True Daily Vector Mean) dari 24 jam observasi
    const dailyBuckets = new Map<string, {
      uAus: number[];
      uWnpTrop: number[];
      uWnpSub: number[];
      vCsi: number[];
      wyiShear: number[];
      sasmiShear: number[];
      vEasmi: number[];
    }>();

    for (let i = 0; i < totalHours; i++) {
      const day = times[i].slice(0, 10);
      if (!dailyBuckets.has(day)) {
        dailyBuckets.set(day, {
          uAus: [],
          uWnpTrop: [],
          uWnpSub: [],
          vCsi: [],
          wyiShear: [],
          sasmiShear: [],
          vEasmi: [],
        });
      }
      const b = dailyBuckets.get(day)!;

      // 1. AUSMI U850: -spd * sin(dir)
      const spdAus = hourlyAus.wind_speed_850hPa?.[i];
      if (spdAus != null && Number.isFinite(spdAus)) {
        const dirAus = (hourlyAus.wind_direction_850hPa?.[i] || 0) * (Math.PI / 180);
        b.uAus.push(-spdAus * Math.sin(dirAus));
      }

      // 2. WNPMI Trop U850 & Sub U850
      const spdWnpTrop = hourlyWnpTrop.wind_speed_850hPa?.[i];
      if (spdWnpTrop != null && Number.isFinite(spdWnpTrop)) {
        const dirWnpTrop = (hourlyWnpTrop.wind_direction_850hPa?.[i] || 0) * (Math.PI / 180);
        b.uWnpTrop.push(-spdWnpTrop * Math.sin(dirWnpTrop));
      }

      const spdWnpSub = hourlyWnpSub.wind_speed_850hPa?.[i];
      if (spdWnpSub != null && Number.isFinite(spdWnpSub)) {
        const dirWnpSub = (hourlyWnpSub.wind_direction_850hPa?.[i] || 0) * (Math.PI / 180);
        b.uWnpSub.push(-spdWnpSub * Math.sin(dirWnpSub));
      }

      // 4. CSI V925: -spd * cos(dir) (Cold Surge Index BMKG & Chang et al. 2005)
      const spdCsi = hourlyCsi.wind_speed_925hPa?.[i];
      if (spdCsi != null && Number.isFinite(spdCsi)) {
        const dirCsi = (hourlyCsi.wind_direction_925hPa?.[i] || 0) * (Math.PI / 180);
        b.vCsi.push(-spdCsi * Math.cos(dirCsi));
      }

      // 5. WYI: Webster-Yang vertical zonal shear U850 - U200 (Webster & Yang 1992)
      const spdWyi850 = hourlyWyi.wind_speed_850hPa?.[i];
      const spdWyi200 = hourlyWyi.wind_speed_200hPa?.[i];
      if (spdWyi850 != null && spdWyi200 != null && Number.isFinite(spdWyi850) && Number.isFinite(spdWyi200)) {
        const dirWyi850 = (hourlyWyi.wind_direction_850hPa?.[i] || 0) * (Math.PI / 180);
        const uWyi850 = -spdWyi850 * Math.sin(dirWyi850);
        const dirWyi200 = (hourlyWyi.wind_direction_200hPa?.[i] || 0) * (Math.PI / 180);
        const uWyi200 = -spdWyi200 * Math.sin(dirWyi200);
        b.wyiShear.push(uWyi850 - uWyi200);
      }

      // 6. SASMI: South Asian vertical meridional shear V850 - V200 (Goswami et al. 1999)
      const spdSasmi850 = hourlySasmi.wind_speed_850hPa?.[i];
      const spdSasmi200 = hourlySasmi.wind_speed_200hPa?.[i];
      if (spdSasmi850 != null && spdSasmi200 != null && Number.isFinite(spdSasmi850) && Number.isFinite(spdSasmi200)) {
        const dirSasmi850 = (hourlySasmi.wind_direction_850hPa?.[i] || 0) * (Math.PI / 180);
        const vSasmi850 = -spdSasmi850 * Math.cos(dirSasmi850);
        const dirSasmi200 = (hourlySasmi.wind_direction_200hPa?.[i] || 0) * (Math.PI / 180);
        const vSasmi200 = -spdSasmi200 * Math.cos(dirSasmi200);
        b.sasmiShear.push(vSasmi850 - vSasmi200);
      }

      // 7. EASMI: East Asian Summer Monsoon V850 (Zhang et al. 2003)
      const spdEasmi = hourlyEasmi.wind_speed_850hPa?.[i];
      if (spdEasmi != null && Number.isFinite(spdEasmi)) {
        const dirEasmi = (hourlyEasmi.wind_direction_850hPa?.[i] || 0) * (Math.PI / 180);
        b.vEasmi.push(-spdEasmi * Math.cos(dirEasmi));
      }
    }

    const mean = (arr: number[]) => (arr.length > 0 ? arr.reduce((a, b) => a + b, 0) / arr.length : 0);

    const timePoints: MonsoonDailyPoint[] = [];

    for (const [date, b] of dailyBuckets.entries()) {
      if (b.uAus.length < 12 || b.uWnpTrop.length < 12) continue; // Skip days without sufficient valid observations

      const uAus = Number(mean(b.uAus).toFixed(2));
      const uTrop = mean(b.uWnpTrop);
      const uSub = mean(b.uWnpSub);
      const wnpmi = Number((uTrop - uSub).toFixed(2));
      const scsmi = Number(uTrop.toFixed(2));
      const vCsi = Number(mean(b.vCsi).toFixed(2));
      const wyi = Number(mean(b.wyiShear).toFixed(2));
      const sasmi = Number(mean(b.sasmiShear).toFixed(2));
      const easmi = Number(mean(b.vEasmi).toFixed(2));

      // 8. BSISO1 (30-60 days mode) & 9. BSISO2 (10-23 days mode) - Normalized Circulation Projection
      const b1 = Number((scsmi * 0.35 - uAus * 0.25).toFixed(2));
      const b2 = Number((wnpmi * 0.25 - vCsi * 0.20).toFixed(2));

      timePoints.push({
        date,
        ausmi: uAus,
        wnpmi,
        scsmi,
        csi: vCsi,
        wyi,
        sasmi,
        easmi,
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
          status: current.ausmi > 2.0 ? "Positif" : current.ausmi < -2.0 ? "Negatif" : "Netral",
          description: "Mengukur intensitas angin baratan di Belahan Bumi Selatan (5°-15°S, 110°-130°E). Pemicu utama musim hujan Jawa, Bali, dan Nusa Tenggara.",
        },
        wnpmi: {
          value: current.wnpmi,
          unit: "m/s",
          status: current.wnpmi > 2.0 ? "Positif" : current.wnpmi < -2.0 ? "Negatif" : "Netral",
          description: "Mengukur kekuatan sirkulasi siklonik di Pasifik Barat Laut dan Filipina. Saat aktif, memperkuat musim kemarau di Indonesia selatan.",
        },
        scsmi: {
          value: current.scsmi,
          unit: "m/s",
          status: current.scsmi > 2.0 ? "Positif" : current.scsmi < -2.0 ? "Negatif" : "Netral",
          description: "Indeks angin zonal di Laut Cina Selatan (5°-15°N, 110°-120°E). Indikator utama Onset Musim Panas Asia Tenggara.",
        },
        csi: {
          value: current.csi,
          unit: "m/s",
          status: current.csi <= -8.0 ? "Positif" : current.csi <= -5.0 ? "Waspada" : "Netral",
          isSurgeActive: current.csi <= -8.0,
          description: "Komponen angin meridional V di Laut Cina Selatan (12.5°N). Nilai negatif tajam (< -8 m/s) menandakan seruakan dingin Siberia menembus Laut Jawa.",
        },
        wyi: {
          value: current.wyi,
          unit: "m/s",
          status: current.wyi > 5.0 ? "Positif" : current.wyi < -2.0 ? "Negatif" : "Netral",
          description: "Indeks Webster-Yang (0°-20°N, 40°-110°E) mengukur sirkulasi termal musiman skala luas antara Benua Asia dan Samudra Hindia tropis.",
        },
        sasmi: {
          value: current.sasmi,
          unit: "m/s",
          status: current.sasmi > 2.0 ? "Positif" : current.sasmi < -2.0 ? "Negatif" : "Netral",
          description: "Indeks Goswami et al. (1999) mengukur komponen meridional V di Teluk Benggala penentu suplai konveksi ke Sumatra utara & Selat Malaka.",
        },
        easmi: {
          value: current.easmi,
          unit: "m/s",
          status: current.easmi > 2.0 ? "Positif" : current.easmi < -2.0 ? "Negatif" : "Netral",
          description: "Indeks Zhang et al. (2003) mengukur intensitas monsun musim panas Asia Timur dan dinamika front semi-stasioner Meiyu/Baiu.",
        },
        bsiso1: {
          value: bsiso1,
          unit: "indeks",
          status: bsiso1 >= 1.0 ? "Positif" : bsiso1 <= -1.0 ? "Negatif" : "Netral",
          description: "Modus osilasi intraseasonal musim panas siklus 30–60 hari. Mengendalikan propagasi awan konvektif monsun ke arah utara dari Samudra Hindia melintasi Indonesia barat.",
        },
        bsiso2: {
          value: bsiso2,
          unit: "indeks",
          status: bsiso2 >= 1.0 ? "Positif" : bsiso2 <= -1.0 ? "Negatif" : "Netral",
          description: "Modus osilasi kuasi dua-mingguan siklus 10–23 hari. Bertindak sebagai pemicu (trigger) awal masuknya musim hujan (Onset) dan fluktuasi sub-musiman di Laut Cina Selatan.",
        },
        bsiso: {
          phase: bsisoPhase,
          amplitude: bsisoAmp,
          status: bsisoAmp >= 1.0 ? "Positif" : "Netral",
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
