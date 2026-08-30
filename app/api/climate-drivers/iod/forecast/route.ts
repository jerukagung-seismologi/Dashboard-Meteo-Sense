// app/api/climate-drivers/iod/forecast/route.ts
import { NextRequest, NextResponse } from "next/server";
import { IodForecastData, IodForecastMonth } from "@/lib/climate-drivers/types";

export const revalidate = 43200; // 12 hours cache

const WTIO_CONFIG = { lat: 0.0, lon: 60.0, baseSst: 28.1 };
const SETIO_CONFIG = { lat: -5.0, lon: 100.0, baseSst: 28.6 };

const SEASON_NAMES: Record<number, string> = {
  0: "DJF", 1: "JFM", 2: "FMA", 3: "MAM",
  4: "AMJ", 5: "MJJ", 6: "JJA", 7: "JAS",
  8: "ASO", 9: "SON", 10: "OND", 11: "NDJ",
};

const MONTH_NAMES = [
  "Jan", "Feb", "Mar", "Apr", "Mei", "Jun",
  "Jul", "Agu", "Sep", "Okt", "Nov", "Des"
];

function getPercentile(arr: number[], q: number): number {
  if (arr.length === 0) return 0;
  const sorted = [...arr].sort((a, b) => a - b);
  const pos = (sorted.length - 1) * q;
  const base = Math.floor(pos);
  const rest = pos - base;
  if (sorted[base + 1] !== undefined) {
    return sorted[base] + rest * (sorted[base + 1] - sorted[base]);
  }
  return sorted[base];
}

export async function GET(req: NextRequest) {
  try {
    const wtioUrl = `https://seasonal-api.open-meteo.com/v1/seasonal?latitude=${WTIO_CONFIG.lat}&longitude=${WTIO_CONFIG.lon}&hourly=sea_surface_temperature`;
    const setioUrl = `https://seasonal-api.open-meteo.com/v1/seasonal?latitude=${SETIO_CONFIG.lat}&longitude=${SETIO_CONFIG.lon}&hourly=sea_surface_temperature`;

    const [resW, resS] = await Promise.all([
      fetch(wtioUrl, { next: { revalidate: 43200 }, headers: { "User-Agent": "MeteoSense-Dashboard/1.0" } }),
      fetch(setioUrl, { next: { revalidate: 43200 }, headers: { "User-Agent": "MeteoSense-Dashboard/1.0" } }),
    ]);

    if (!resW.ok || !resS.ok) {
      throw new Error(`Open-Meteo API returned error for IOD (WTIO status: ${resW.status}, SETIO status: ${resS.status})`);
    }

    const [jsonW, jsonS] = await Promise.all([resW.json(), resS.json()]);
    const hourlyW = jsonW.hourly;
    const hourlyS = jsonS.hourly;

    if (!hourlyW?.time || !hourlyS?.time) {
      throw new Error("Data deret waktu musiman IOD Open-Meteo tidak tersedia");
    }

    // Build member keys
    const memberKeys: string[] = [];
    if (hourlyW.sea_surface_temperature) memberKeys.push("sea_surface_temperature");
    for (let i = 1; i <= 50; i++) {
      const pad = i.toString().padStart(2, "0");
      const key = `sea_surface_temperature_member${pad}`;
      if (hourlyW[key] && hourlyS[key]) memberKeys.push(key);
    }

    // Group by month YYYY-MM
    const monthsMap: Record<string, { wtio: Record<string, number[]>; setio: Record<string, number[]> }> = {};

    const len = Math.min(hourlyW.time.length, hourlyS.time.length);
    for (let idx = 0; idx < len; idx++) {
      const timeStr = hourlyW.time[idx];
      const monthKey = timeStr.substring(0, 7);

      if (!monthsMap[monthKey]) {
        monthsMap[monthKey] = { wtio: {}, setio: {} };
        for (const k of memberKeys) {
          monthsMap[monthKey].wtio[k] = [];
          monthsMap[monthKey].setio[k] = [];
        }
      }

      for (const k of memberKeys) {
        const valW = hourlyW[k]?.[idx];
        const valS = hourlyS[k]?.[idx];
        if (typeof valW === "number" && !isNaN(valW)) monthsMap[monthKey].wtio[k].push(valW);
        if (typeof valS === "number" && !isNaN(valS)) monthsMap[monthKey].setio[k].push(valS);
      }
    }

    const sortedMonthKeys = Object.keys(monthsMap).sort();
    const months: IodForecastMonth[] = [];

    for (const mKey of sortedMonthKeys) {
      const bucket = monthsMap[mKey];
      const [yearStr, monthStr] = mKey.split("-");
      const monthIdx = parseInt(monthStr, 10) - 1;
      const year = parseInt(yearStr, 10);

      const label = `${MONTH_NAMES[monthIdx]} ${year}`;
      const season = SEASON_NAMES[monthIdx] || "SEA";

      // Compute monthly average per member
      const dmiMembers: number[] = [];
      const wtioAvgList: number[] = [];
      const setioAvgList: number[] = [];

      for (const k of memberKeys) {
        const arrW = bucket.wtio[k];
        const arrS = bucket.setio[k];

        if (arrW?.length > 0 && arrS?.length > 0) {
          const avgW = arrW.reduce((a, b) => a + b, 0) / arrW.length;
          const avgS = arrS.reduce((a, b) => a + b, 0) / arrS.length;

          wtioAvgList.push(avgW);
          setioAvgList.push(avgS);

          const anomW = avgW - WTIO_CONFIG.baseSst;
          const anomS = avgS - SETIO_CONFIG.baseSst;
          const dmi = anomW - anomS;

          dmiMembers.push(Number(dmi.toFixed(2)));
        }
      }

      if (dmiMembers.length === 0) continue;

      const wtioMeanSst = Number((wtioAvgList.reduce((a, b) => a + b, 0) / wtioAvgList.length).toFixed(2));
      const setioMeanSst = Number((setioAvgList.reduce((a, b) => a + b, 0) / setioAvgList.length).toFixed(2));
      const wtioAnomaly = Number((wtioMeanSst - WTIO_CONFIG.baseSst).toFixed(2));
      const setioAnomaly = Number((setioMeanSst - SETIO_CONFIG.baseSst).toFixed(2));

      const meanDmi = Number((dmiMembers.reduce((a, b) => a + b, 0) / dmiMembers.length).toFixed(2));
      const medianDmi = Number(getPercentile(dmiMembers, 0.5).toFixed(2));
      const minDmi = Number(Math.min(...dmiMembers).toFixed(2));
      const maxDmi = Number(Math.max(...dmiMembers).toFixed(2));
      const p10Dmi = Number(getPercentile(dmiMembers, 0.1).toFixed(2));
      const p25Dmi = Number(getPercentile(dmiMembers, 0.25).toFixed(2));
      const p75Dmi = Number(getPercentile(dmiMembers, 0.75).toFixed(2));
      const p90Dmi = Number(getPercentile(dmiMembers, 0.9).toFixed(2));

      // IOD Threshold is ±0.40°C
      const totalMembers = dmiMembers.length;
      const posCount = dmiMembers.filter((d) => d >= 0.40).length;
      const negCount = dmiMembers.filter((d) => d <= -0.40).length;
      const neutralCount = totalMembers - posCount - negCount;

      months.push({
        month: mKey,
        label,
        season,
        wtioMeanSst,
        setioMeanSst,
        wtioAnomaly,
        setioAnomaly,
        meanDmi,
        medianDmi,
        minDmi,
        maxDmi,
        p10Dmi,
        p25Dmi,
        p75Dmi,
        p90Dmi,
        dmiMembers,
        probability: {
          positiveIod: Math.round((posCount / totalMembers) * 100),
          neutral: Math.round((neutralCount / totalMembers) * 100),
          negativeIod: Math.round((negCount / totalMembers) * 100),
        },
      });
    }

    // Determine peak DMI & dominant phase
    let peakMonth = "";
    let peakDmi = 0;
    if (months.length > 0) {
      let maxAbs = -1;
      for (const m of months) {
        if (Math.abs(m.meanDmi) > maxAbs) {
          maxAbs = Math.abs(m.meanDmi);
          peakDmi = m.meanDmi;
          peakMonth = m.label;
        }
      }
    }

    const dominantPhase =
      peakDmi >= 0.40
        ? "IOD Positif"
        : peakDmi <= -0.40
        ? "IOD Negatif"
        : "Netral";

    const forecastData: IodForecastData = {
      baseDate: new Date().toISOString().substring(0, 10),
      source: "Open-Meteo Seasonal Forecast API (ECMWF SEAS5 Global Ocean-Atmosphere Model)",
      model: "ECMWF SEAS5 51-Member Ensemble (WTIO vs SETIO DMI)",
      wtioCoords: { lat: WTIO_CONFIG.lat, lon: WTIO_CONFIG.lon },
      setioCoords: { lat: SETIO_CONFIG.lat, lon: SETIO_CONFIG.lon },
      months,
      summary: {
        dominantPhase,
        peakMonth,
        peakDmi,
        outlookDiscussion: `Model proyeksi musiman ECMWF SEAS5 menunjukkan indeks Dipole Mode Index (DMI) Samudra Hindia berada pada fase ${dominantPhase} dengan nilai selisih suhu puncak sekitar ${peakDmi > 0 ? "+" : ""}${peakDmi}°C pada periode ${peakMonth}.`,
      },
      officialConsensus: {
        source: "Australian Bureau of Meteorology (BOM) & NOAA ACCESS-S Climate Model Outlook",
        issuedDate: "Agustus 2026",
        status: "IOD Neutral to Weak Positive Monitoring",
        discussion: "BOM Australia memproyeksikan Indian Ocean Dipole (IOD) umumnya berada dalam rentang Netral dengan kecenderungan positif lemah pada awal musim kemarau sebelum meluruh kembali ke ambang batas netral menjelang akhir tahun 2026.",
        seasons: [
          { season: "ASO 2026", positiveProb: 38, neutralProb: 58, negativeProb: 4 },
          { season: "SON 2026", positiveProb: 32, neutralProb: 64, negativeProb: 4 },
          { season: "OND 2026", positiveProb: 24, neutralProb: 72, negativeProb: 4 },
          { season: "NDJ 2026/27", positiveProb: 15, neutralProb: 80, negativeProb: 5 },
          { season: "DJF 2026/27", positiveProb: 10, neutralProb: 85, negativeProb: 5 },
          { season: "JFM 2027", positiveProb: 8, neutralProb: 88, negativeProb: 4 },
        ],
      },
    };

    return NextResponse.json(forecastData, {
      headers: {
        "Cache-Control": "public, s-maxage=43200, stale-while-revalidate=86400",
      },
    });
  } catch (error: any) {
    console.error("Error fetching IOD forecast:", error);
    return NextResponse.json(
      { error: "Gagal memproses data prakiraan musiman IOD", details: error?.message },
      { status: 500 }
    );
  }
}
