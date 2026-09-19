// app/api/climatology/normals/route.ts
import { NextResponse } from "next/server";
import { getWmo30YearNormals, fetchRecentMonthlyPrecip } from "@/lib/climatology/wmoNormals";
import { evaluateClimateClassification } from "@/lib/climatology/climateClassification";
import { calculateSpiSeries } from "@/lib/climatology/spiCalculator";

// Tidak di-cache di edge karena seri SPI mencakup data mutakhir (berjalan)
export const revalidate = 0;

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
    // 1. Ambil WMO Normal 1991-2020 DAN data mutakhir 2021-sekarang secara PARALEL
    //    → hemat ~50% waktu dibanding sekuensial, karena keduanya adalah I/O bound HTTP
    const [normals, recentMonthlyData] = await Promise.all([
      getWmo30YearNormals(lat, lng),
      fetchRecentMonthlyPrecip(lat, lng, 2021),
    ]);

    // 2. Hitung Klasifikasi Iklim Komprehensif (Oldeman, Schmidt-Ferguson, Köppen)
    const monthlyRainfall = normals.monthly.map((m) => m.precipMean);
    const classification = evaluateClimateClassification(monthlyRainfall);

    // 3. Bangun data runtun waktu bulanan untuk SPI
    //    Gunakan 5 tahun akhir WMO baseline (2016-2020) sebagai warm-up,
    //    lalu sambungkan dengan data real-time 2021 s.d. bulan lalu.
    const baselineMonthlyData: { dateStr: string; rainSum: number }[] = [];
    for (let yr = 2016; yr <= 2020; yr++) {
      const yrIdx = yr - 1991;
      for (let m = 0; m < 12; m++) {
        const val = normals.monthly[m].monthlyTotalsHistory[yrIdx] ?? normals.monthly[m].precipMean;
        const mStr = (m + 1).toString().padStart(2, "0");
        baselineMonthlyData.push({ dateStr: `${yr}-${mStr}`, rainSum: val });
      }
    }

    // Gabungkan: baseline 2016-2020 + data mutakhir 2021-sekarang
    const fullSpiData = [...baselineMonthlyData, ...recentMonthlyData];

    // 4. Hitung SPI series pada keseluruhan runtun waktu gabungan
    const spi1 = calculateSpiSeries(fullSpiData, 1, monthlyRainfall);
    const spi3 = calculateSpiSeries(fullSpiData, 3, monthlyRainfall);
    const spi6 = calculateSpiSeries(fullSpiData, 6, monthlyRainfall);
    const spi12 = calculateSpiSeries(fullSpiData, 12, monthlyRainfall);

    // 5. Hitung rata-rata klimatologis periode berjalan (2021–sekarang)
    //    sebagai "normal sementara" untuk perbandingan
    let currentPeriodNormals: {
      periodLabel: string;
      startYear: number;
      endYear: number;
      monthlyMeans: { monthIndex: number; monthName: string; precipMean: number }[];
      annualMean: number;
    } | null = null;

    if (recentMonthlyData.length >= 12) {
      // Kelompokkan per bulan (0..11) → hitung rata-rata dari tahun yang sudah lengkap
      const now = new Date();
      const currentYear = now.getFullYear();
      const currentMonth = now.getMonth() + 1; // 1..12

      // Hanya gunakan tahun yang sudah berjalan penuh (2021 s.d. tahun lalu)
      // supaya rata-rata tidak bias karena tahun berjalan belum selesai
      const lastFullYear = currentMonth === 12 ? currentYear : currentYear - 1;
      const fullYearData = recentMonthlyData.filter((d) => {
        const yr = parseInt(d.dateStr.substring(0, 4), 10);
        return yr >= 2021 && yr <= lastFullYear;
      });

      if (fullYearData.length >= 12) {
        const monthSums: number[] = Array(12).fill(0);
        const monthCounts: number[] = Array(12).fill(0);
        for (const d of fullYearData) {
          const m = parseInt(d.dateStr.substring(5, 7), 10) - 1; // 0..11
          monthSums[m] += d.rainSum;
          monthCounts[m]++;
        }

        const MONTH_NAMES = ["Jan", "Feb", "Mar", "Apr", "Mei", "Jun", "Jul", "Agu", "Sep", "Okt", "Nov", "Des"];
        const monthlyMeans = monthSums.map((sum, m) => ({
          monthIndex: m,
          monthName: MONTH_NAMES[m],
          precipMean: monthCounts[m] > 0 ? Number((sum / monthCounts[m]).toFixed(1)) : 0,
        }));

        const annualMean = Number(monthlyMeans.reduce((a, b) => a + b.precipMean, 0).toFixed(1));

        currentPeriodNormals = {
          periodLabel: `2021–${lastFullYear}`,
          startYear: 2021,
          endYear: lastFullYear,
          monthlyMeans,
          annualMean,
        };
      }
    }

    // 6. Analisis Dinamika Musim BMKG (Awal Musim Hujan & Kemarau berdasarkan 36 Dasarian)
    const das = normals.dasarians;
    let amhDasarian: { number: number; name: string; rain: number } | null = null;
    let amkDasarian: { number: number; name: string; rain: number } | null = null;

    const doubleDas = [...das, ...das];
    for (let i = 0; i < 36; i++) {
      if (!amhDasarian && doubleDas[i].precipMean >= 50 && doubleDas[i + 1].precipMean >= 50 && doubleDas[i + 2].precipMean >= 50) {
        amhDasarian = { number: das[i].dasarianNumber, name: das[i].name, rain: das[i].precipMean };
      }
      if (!amkDasarian && doubleDas[i].precipMean < 50 && doubleDas[i + 1].precipMean < 50 && doubleDas[i + 2].precipMean < 50) {
        amkDasarian = { number: das[i].dasarianNumber, name: das[i].name, rain: das[i].precipMean };
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
        // Metadata rentang data yang dipakai untuk SPI (berguna untuk label di UI)
        dataRange: {
          start: fullSpiData[0]?.dateStr ?? "2016-01",
          end: fullSpiData[fullSpiData.length - 1]?.dateStr ?? "2020-12",
          totalMonths: fullSpiData.length,
        },
      },
      // Normal periode berjalan (2021–sekarang) — null jika belum ada 1 tahun penuh
      currentPeriodNormals,
      seasonalDynamics: {
        amh: amhDasarian || { number: 28, name: "Okt I", rain: 65 },
        amk: amkDasarian || { number: 13, name: "Mei I", rain: 42 },
        description: "Berdasarkan kriteria standar BMKG (ambang batas 50 mm per dasarian selama 3 dasarian berurutan).",
      },
    };

    return NextResponse.json(payload, {
      headers: {
        // Revalidasi lebih sering karena mencakup data mutakhir
        "Cache-Control": "public, s-maxage=21600, stale-while-revalidate=3600",
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
