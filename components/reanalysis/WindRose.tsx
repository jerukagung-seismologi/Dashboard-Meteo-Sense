// components/reanalysis/WindRose.tsx
import React, { useMemo } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Compass, Wind, Navigation, AlertCircle } from "lucide-react";
import { WindRoseBin } from "@/lib/reanalysis/windRose";
import dynamic from "next/dynamic";

const ReactECharts = dynamic(() => import("echarts-for-react"), {
  ssr: false,
  loading: () => (
    <div className="h-[350px] w-full flex items-center justify-center text-muted-foreground animate-pulse">
      Membuat grafik Wind Rose...
    </div>
  ),
});

interface WindRoseProps {
  data: WindRoseBin[];
  isDarkMode: boolean;
  windSpeedStats: {
    mean: number;
    max: number;
    stdDev: number;
  };
}

export const WindRose: React.FC<WindRoseProps> = ({ data, isDarkMode, windSpeedStats }) => {
  const textColor = isDarkMode ? "#cbd5e1" : "#475569";
  const gridColor = isDarkMode ? "rgba(71, 85, 105, 0.2)" : "rgba(203, 213, 225, 0.2)";

  // Color scheme for speed bins (0-2, 2-4, 4-6, 6-8, >8 m/s)
  const speedColors = ["#3b82f6", "#10b981", "#fbbf24", "#f97316", "#ef4444"];

  // Find the dominant wind direction sector
  const dominantSector = useMemo(() => {
    if (!data || data.length === 0) return { sector: "-", percentage: 0 };
    let maxSector = data[0];
    for (const bin of data) {
      if (bin.totalPercentage > maxSector.totalPercentage) {
        maxSector = bin;
      }
    }
    return {
      sector: maxSector.sector,
      percentage: maxSector.totalPercentage
    };
  }, [data]);

  // Construct options for polar chart
  const option = useMemo(() => {
    if (!data || data.length === 0) return {};

    // ECharts polar series requires data organized by series (speed range)
    // There are 5 bins: "0 - 2 m/s", "2 - 4 m/s", "4 - 6 m/s", "6 - 8 m/s", "> 8 m/s"
    const binsLength = data[0]?.speedBins.length || 0;
    const seriesNames = data[0]?.speedBins.map((b) => b.range) || [];

    const series = Array.from({ length: binsLength }, (_, binIdx) => {
      return {
        type: "bar",
        coordinateSystem: "polar",
        name: seriesNames[binIdx],
        stack: "windrose",
        data: data.map((sectorBin) => sectorBin.speedBins[binIdx]?.percentage || 0),
        itemStyle: {
          color: speedColors[binIdx]
        },
        emphasis: {
          focus: "series"
        }
      };
    });

    const sectors = data.map((d) => d.sector);

    return {
      tooltip: {
        trigger: "axis",
        axisPointer: { type: "shadow" },
        formatter: (params: any[]) => {
          if (!params || params.length === 0) return "";
          const sectorName = params[0].axisValue;
          let total = 0;
          let listHtml = "";
          params.forEach((p) => {
            total += p.value;
            listHtml += `<div class="flex items-center justify-between gap-4">
              <span class="flex items-center gap-1.5 text-slate-600 dark:text-slate-400">
                <span class="w-2.5 h-2.5 rounded-full" style="background-color: ${p.color}"></span>
                ${p.seriesName}:
              </span>
              <span class="font-bold text-slate-800 dark:text-slate-200">${p.value.toFixed(1)}%</span>
            </div>`;
          });
          return `<div class="p-2 text-xs font-sans">
            <div class="font-bold border-b pb-1 mb-1 text-slate-800 dark:text-slate-200">Arah: ${sectorName} (${total.toFixed(1)}%)</div>
            ${listHtml}
          </div>`;
        }
      },
      angleAxis: {
        type: "category",
        data: sectors,
        boundaryGap: false,
        startAngle: 90, // North at the top
        clockwise: true, // Clockwise wind rose orientation
        axisLabel: {
          color: textColor,
          fontSize: 10,
          fontWeight: "bold"
        },
        axisLine: {
          lineStyle: { color: gridColor }
        },
        splitLine: {
          show: true,
          lineStyle: { color: gridColor }
        }
      },
      radiusAxis: {
        type: "value",
        min: 0,
        axisLabel: {
          formatter: "{value}%",
          color: textColor,
          fontSize: 8
        },
        axisLine: {
          show: false
        },
        splitLine: {
          lineStyle: { color: gridColor }
        }
      },
      polar: {
        center: ["50%", "50%"],
        radius: "80%"
      },
      legend: {
        show: true,
        orient: "horizontal",
        bottom: 0,
        data: seriesNames,
        textStyle: {
          color: textColor,
          fontSize: 10
        }
      },
      series: series
    };
  }, [data, textColor, gridColor]);

  const compassFullDirection = (sector: string) => {
    const mapping: Record<string, string> = {
      N: "Utara (0°)",
      NNE: "Utara-Timur Laut (22.5°)",
      NE: "Timur Laut (45°)",
      ENE: "Timur-Timur Laut (67.5°)",
      E: "Timur (90°)",
      ESE: "Timur-Tenggara (112.5°)",
      SE: "Tenggara (135°)",
      SSE: "Selatan-Tenggara (157.5°)",
      S: "Selatan (180°)",
      SSW: "Selatan-Barat Daya (202.5°)",
      SW: "Barat Daya (225°)",
      WSW: "Barat-Barat Daya (247.5°)",
      W: "Barat (270°)",
      WNW: "Barat-Barat Laut (292.5°)",
      NW: "Barat Laut (315°)",
      NNW: "Utara-Barat Laut (337.5°)"
    };
    return mapping[sector] || sector;
  };

  return (
    <Card className="border-none shadow-sm dark:bg-slate-900 bg-white">
      <CardHeader className="pb-4">
        <CardTitle className="text-lg font-bold flex items-center gap-2">
          <Compass className="h-5 w-5 text-indigo-500" /> Analisis Wind Rose (Mawar Angin)
        </CardTitle>
        <CardDescription>
          Morfologi arah dan distribusi kecepatan angin (10m) sepanjang periode data
        </CardDescription>
      </CardHeader>
      
      <CardContent className="grid grid-cols-1 lg:grid-cols-4 gap-6 pt-2">
        {/* Polar Wind Rose Chart */}
        <div className="lg:col-span-3 h-[380px] w-full flex items-center justify-center">
          {data && data.length > 0 ? (
            <ReactECharts
              option={option}
              style={{ height: "100%", width: "100%" }}
              theme={isDarkMode ? "dark" : "light"}
            />
          ) : (
            <div className="text-slate-400 flex flex-col items-center gap-2">
              <AlertCircle className="h-10 w-10 text-slate-300" />
              <span>Data hembusan angin tidak tersedia</span>
            </div>
          )}
        </div>

        {/* Diagnostics & Stats Panel */}
        <div className="flex flex-col border-t lg:border-t-0 lg:border-l pt-4 lg:pt-0 lg:pl-6 border-slate-100 dark:border-slate-800 space-y-4">
          <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
            <Wind className="h-4 w-4 text-emerald-500" /> Diagnostik Angin
          </h4>
          
          <div className="space-y-4 flex-grow">
            <div className="bg-slate-50 dark:bg-slate-950 p-3 rounded-lg border dark:border-slate-800 flex items-center gap-3">
              <div className="p-2 bg-indigo-50 dark:bg-indigo-950 text-indigo-600 dark:text-indigo-400 rounded-md">
                <Navigation className="h-5 w-5" style={{ transform: `rotate(${(data.findIndex(d => d.sector === dominantSector.sector) * 22.5)}deg)` }} />
              </div>
              <div>
                <span className="text-[10px] text-slate-500 uppercase font-semibold block">Arah Dominan</span>
                <span className="text-sm font-extrabold block text-slate-800 dark:text-slate-100">
                  {compassFullDirection(dominantSector.sector)}
                </span>
                <span className="text-[11px] text-indigo-600 dark:text-indigo-400 font-medium">
                  {dominantSector.percentage.toFixed(1)}% dari total sampel
                </span>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="bg-slate-50 dark:bg-slate-950 p-2.5 rounded border dark:border-slate-800">
                <span className="text-[9px] text-slate-500 uppercase font-semibold">Kec. Rata-rata</span>
                <p className="text-sm font-extrabold text-slate-800 dark:text-slate-100">
                  {windSpeedStats.mean.toFixed(2)} m/s
                </p>
                <span className="text-[9px] text-slate-400">
                  {(windSpeedStats.mean * 3.6).toFixed(1)} km/h
                </span>
              </div>
              <div className="bg-slate-50 dark:bg-slate-950 p-2.5 rounded border dark:border-slate-800">
                <span className="text-[9px] text-slate-500 uppercase font-semibold">Kec. Maksimum</span>
                <p className="text-sm font-extrabold text-red-600 dark:text-red-400">
                  {windSpeedStats.max.toFixed(1)} m/s
                </p>
                <span className="text-[9px] text-slate-400">
                  {(windSpeedStats.max * 3.6).toFixed(1)} km/h
                </span>
              </div>
            </div>

            <div className="bg-slate-50 dark:bg-slate-950 p-3 rounded-lg border dark:border-slate-800">
              <span className="text-[9px] text-slate-500 uppercase font-semibold">Deviasi Standar Kecepatan</span>
              <div className="flex items-baseline gap-2 mt-1">
                <span className="text-base font-extrabold text-slate-800 dark:text-slate-100">
                  ±{windSpeedStats.stdDev.toFixed(2)} m/s
                </span>
              </div>
              <p className="text-[10px] text-slate-400 mt-1 leading-relaxed">
                Menunjukkan variabilitas kekuatan angin dari rata-rata klimatologinya.
              </p>
            </div>
          </div>
          
          <div className="text-[10px] text-slate-500 italic leading-relaxed pt-2">
            *Mawar angin mengelompokkan kecepatan angin ke dalam 5 kategori skala meteorologi, dipetakan ke dalam 16 kompas arah utama.
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
