// app/api/weather/fts-forecast/route.ts
import { NextResponse } from "next/server";
import { computeChenFTS, FTSDataPoint } from "@/lib/forecasting/fuzzyTimeSeries";
import { getStationHHMTSeries, KEBUMEN_PRESEEDED_HISTORICAL_HHMT } from "@/lib/climatology/designRainfall";

export const dynamic = "force-dynamic";

/**
 * Menghasilkan data sintetis realistis dasarian atau bulanan
 * jika klien tidak menyertakan deret kustom.
 */
function generateSampleSeries(stationId: string, mode: "dasarian" | "monthly"): FTSDataPoint[] {
  const annualMax = getStationHHMTSeries(stationId);

  if (mode === "monthly") {
    // 24 bulan (2 tahun observasi bulanan)
    const months = [
      "Jan", "Feb", "Mar", "Apr", "Mei", "Jun",
      "Jul", "Agu", "Sep", "Okt", "Nov", "Des"
    ];
    const points: FTSDataPoint[] = [];
    const baseRain = [320, 290, 270, 190, 120, 65, 45, 30, 55, 140, 260, 310]; // Karakteristik monsunal Kebumen

    for (let yr = 2022; yr <= 2023; yr++) {
      months.forEach((m, idx) => {
        const factor = 0.85 + Math.sin(idx * 0.5 + yr) * 0.25;
        const val = Math.max(5, Math.round(baseRain[idx] * factor));
        points.push({
          period: `${m} ${yr}`,
          actual: val,
        });
      });
    }
    return points;
  }

  // Dasarian: 36 dasarian untuk 1 tahun musim
  const points: FTSDataPoint[] = [];
  const baseDasarian = [
    110, 105, 100, 95, 90, 85, 80, 75, 70, 60, 50, 40,
    30, 20, 15, 10, 8, 5, 5, 8, 12, 20, 35, 55,
    75, 90, 100, 110, 115, 120, 125, 120, 115, 110, 105, 100
  ];

  baseDasarian.forEach((val, idx) => {
    const dasarianNo = idx + 1;
    const noise = Math.sin(idx * 0.4) * 12;
    points.push({
      period: `Dasarian ${dasarianNo}`,
      actual: Math.max(0, Math.round(val + noise)),
    });
  });

  return points;
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const stationId = searchParams.get("stationId") || "stasiun-jerukagung-klirong";
    const mode = (searchParams.get("mode") as "dasarian" | "monthly") || "monthly";
    const k = searchParams.get("k") ? parseInt(searchParams.get("k")!, 10) : undefined;
    const steps = searchParams.get("steps") ? parseInt(searchParams.get("steps")!, 10) : 3;

    const series = generateSampleSeries(stationId, mode);
    const result = computeChenFTS(series, {
      intervalsCount: k,
      futureSteps: steps,
    });

    return NextResponse.json({
      success: true,
      stationId,
      mode,
      forecast: result,
    });
  } catch (error: any) {
    console.error("Error in GET /api/weather/fts-forecast:", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const stationId = body.stationId || "stasiun-jerukagung-klirong";
    const mode = body.mode || "monthly";
    const intervalsCount = body.intervalsCount ? parseInt(body.intervalsCount, 10) : undefined;
    const futureSteps = body.futureSteps ? parseInt(body.futureSteps, 10) : 3;

    let series: FTSDataPoint[] = body.series;
    if (!series || !Array.isArray(series) || series.length < 3) {
      series = generateSampleSeries(stationId, mode);
    }

    const result = computeChenFTS(series, {
      intervalsCount,
      futureSteps,
      d1Margin: body.d1Margin,
      d2Margin: body.d2Margin,
    });

    return NextResponse.json({
      success: true,
      stationId,
      mode,
      dataLength: series.length,
      forecast: result,
    });
  } catch (error: any) {
    console.error("Error in POST /api/weather/fts-forecast:", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
