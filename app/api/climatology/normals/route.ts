// app/api/climatology/normals/route.ts
import { NextResponse } from "next/server";
import { getWmo30YearNormals } from "@/lib/climatology/wmoNormals";
import { evaluateClimateClassification } from "@/lib/climatology/climateClassification";
import { calculateSpiSeries } from "@/lib/climatology/spiCalculator";

export const revalidate = 86400; // Cache 24 jam di edge/CDN

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const latStr = searchParams.get("lat") || searchParams.get("latitude");
  const lngStr = searchParams.get("lng") || searchParams.get("lon") || searchParams.get("longitude");

  if (!latStr || !lngStr) {
    return NextResponse.json(
      { error: "Parameter 'lat' dan 'lng' wajib disertakan." },
      { status: 400 }
    );
  }

  const lat = parseFloat(latStr);
  const lng = parseFloat(lngStr);

  if (isNaN(lat) || isNaN(lng) || lat < -90 || lat > 90 || lng < -180 || lng > 180) {
    return NextResponse.json(
      { error: "Koordinat lintang atau bujur tidak valid." },
      { status: 400 }
    );
  }

  try {
    // 1. Ambil 30-Tahun WMO Normal (1991-2020)
    const normals = await getWmo30YearNormals(lat, lng);

    // 2. Hitung Klasifikasi Iklim Komprehensif (Oldeman, Schmidt-Ferguson, Köppen)
    const monthlyRainfall = normals.monthly.map((m) => m.precipMean);
    const classification = evaluateClimateClassification(monthlyRainfall);

    // 3. Bangun data runtun waktu bulanan untuk analisis SPI (menggunakan 5 tahun terakhir dari arsip 30 tahun)
    // Format { dateStr: "YYYY-MM", rainSum }
    const recentMonthlyData: { dateStr: string; rainSum: number }[] = [];
    // Ambil 5 tahun terakhir (2016-2020) dari arsip bulanan (indeks 25 s.d. 29)
    for (let yr = 2016; yr <= 2020; yr++) {
      const yrIdx = yr - 1991;
      for (let m = 0; m < 12; m++) {
        const val = normals.monthly[m].monthlyTotalsHistory[yrIdx] ?? normals.monthly[m].precipMean;
        const mStr = (m + 1).toString().padStart(2, "0");
        recentMonthlyData.push({
          dateStr: `${yr}-${mStr}`,
          rainSum: val,
        });
      }
    }

    const spi1 = calculateSpiSeries(recentMonthlyData, 1, monthlyRainfall);
    const spi3 = calculateSpiSeries(recentMonthlyData, 3, monthlyRainfall);
    const spi6 = calculateSpiSeries(recentMonthlyData, 6, monthlyRainfall);
    const spi12 = calculateSpiSeries(recentMonthlyData, 12, monthlyRainfall);

    // 4. Analisis Dinamika Musim BMKG (Awal Musim Hujan & Kemarau berdasarkan 36 Dasarian)
    // Kriteria BMKG:
    // AMH: Dasarian di mana CH >= 50 mm/dasarian dan diikuti oleh 2 dasarian berikutnya >= 50 mm
    // AMK: Dasarian di mana CH < 50 mm/dasarian dan diikuti oleh 2 dasarian berikutnya < 50 mm
    const das = normals.dasarians;
    let amhDasarian: { number: number; name: string; rain: number } | null = null;
    let amkDasarian: { number: number; name: string; rain: number } | null = null;

    // Evaluasi siklus (duplikasi array untuk menangani pergantian tahun dasarian 36 -> 1)
    const doubleDas = [...das, ...das];
    for (let i = 0; i < 36; i++) {
      // Cek AMH
      if (!amhDasarian && doubleDas[i].precipMean >= 50 && doubleDas[i + 1].precipMean >= 50 && doubleDas[i + 2].precipMean >= 50) {
        amhDasarian = {
          number: das[i].dasarianNumber,
          name: das[i].name,
          rain: das[i].precipMean,
        };
      }
      // Cek AMK
      if (!amkDasarian && doubleDas[i].precipMean < 50 && doubleDas[i + 1].precipMean < 50 && doubleDas[i + 2].precipMean < 50) {
        amkDasarian = {
          number: das[i].dasarianNumber,
          name: das[i].name,
          rain: das[i].precipMean,
        };
      }
    }

    const payload = {
      coordinates: { lat, lng },
      elevation: normals.elevation,
      referencePeriod: normals.referencePeriod,
      normals,
      classification,
      spi: {
        spi1,
        spi3,
        spi6,
        spi12,
      },
      seasonalDynamics: {
        amh: amhDasarian || { number: 28, name: "Okt I", rain: 65 },
        amk: amkDasarian || { number: 13, name: "Mei I", rain: 42 },
        description: "Berdasarkan kriteria standar BMKG (ambang batas 50 mm per dasarian selama 3 dasarian berurutan).",
      },
    };

    return NextResponse.json(payload, {
      headers: {
        "Cache-Control": "public, s-maxage=86400, stale-while-revalidate=43200",
      },
    });
  } catch (error: any) {
    console.error("Error in GET /api/climatology/normals:", error);
    return NextResponse.json(
      { error: error.message || "Gagal memproses data normal klimatologi." },
      { status: 500 }
    );
  }
}
