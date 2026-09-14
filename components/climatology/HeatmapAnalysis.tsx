// components/climatology/HeatmapAnalysis.tsx
"use client";

import React, { useState, useMemo } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Thermometer,
  Droplets,
  Gauge,
  Grid,
  ArrowUpDown,
  ArrowLeftRight,
  Eye,
  EyeOff,
  Calendar,
  Layers,
  Sparkles,
  Info,
} from "lucide-react";
import { HeatmapData } from "@/lib/climatology/analysisTypes";
import dynamic from "next/dynamic";

const ReactECharts = dynamic(() => import("echarts-for-react"), {
  ssr: false,
  loading: () => (
    <div className="h-[400px] w-full flex items-center justify-center text-muted-foreground animate-pulse bg-slate-50 dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800">
      Membuat visualisasi heatmap meteorologi...
    </div>
  ),
});

interface HeatmapAnalysisProps {
  heatmaps: {
    temperature: HeatmapData;
    humidity: HeatmapData;
    pressure: HeatmapData;
  };
  isDarkMode: boolean;
}

const MONTH_NAMES = ["Jan", "Feb", "Mar", "Apr", "Mei", "Jun", "Jul", "Ags", "Sep", "Okt", "Nov", "Des"];
const MONTH_NAMES_FULL = [
  "Januari",
  "Februari",
  "Maret",
  "April",
  "Mei",
  "Juni",
  "Juli",
  "Agustus",
  "September",
  "Oktober",
  "November",
  "Desember",
];

function formatDayShort(ymd: string): string {
  if (!ymd) return "";
  const parts = ymd.split("-");
  if (parts.length === 3) {
    const day = parts[2];
    const monthIdx = parseInt(parts[1], 10) - 1;
    return `${day} ${MONTH_NAMES[monthIdx] || parts[1]}`;
  }
  return ymd;
}

function formatDayFull(ymd: string): string {
  if (!ymd) return "";
  const parts = ymd.split("-");
  if (parts.length === 3) {
    const day = parseInt(parts[2], 10);
    const monthIdx = parseInt(parts[1], 10) - 1;
    const year = parts[0];
    return `${day} ${MONTH_NAMES_FULL[monthIdx] || parts[1]} ${year}`;
  }
  return ymd;
}

export const HeatmapAnalysis: React.FC<HeatmapAnalysisProps> = ({ heatmaps, isDarkMode }) => {
  const [activeParam, setActiveParam] = useState<"temperature" | "humidity" | "pressure">("temperature");
  const [orientation, setOrientation] = useState<"hourX_dayY" | "dayX_hourY">("hourX_dayY");
  const [showValues, setShowValues] = useState<boolean | null>(null);

  const textColor = isDarkMode ? "#94a3b8" : "#64748b";
  const gridBorderColor = isDarkMode ? "#334155" : "#cbd5e1";
  const tooltipBg = isDarkMode ? "rgba(15, 23, 42, 0.94)" : "rgba(255, 255, 255, 0.96)";
  const tooltipBorder = isDarkMode ? "#334155" : "#e2e8f0";

  const labels = {
    temperature: {
      title: "Heatmap Suhu Udara",
      desc: "Distribusi termal diurnal terhadap rentang hari observasi",
      unit: "°C",
      paramLabel: "Suhu Udara",
      icon: <Thermometer className="h-5 w-5 text-orange-500" />,
      colorScale: [
        "#313695",
        "#4575b4",
        "#74add1",
        "#abd9e9",
        "#e0f3f8",
        "#ffffbf",
        "#fee090",
        "#fdae61",
        "#f46d43",
        "#d73027",
        "#a50026",
      ],
      highlightColor: "#ef4444",
    },
    humidity: {
      title: "Heatmap Kelembaban Relatif",
      desc: "Distribusi kelembaban udara nisbi terhadap rentang hari observasi",
      unit: "%",
      paramLabel: "Kelembaban",
      icon: <Droplets className="h-5 w-5 text-blue-500" />,
      colorScale: ["#eff6ff", "#bfdbfe", "#60a5fa", "#3b82f6", "#2563eb", "#1d4ed8", "#172554"],
      highlightColor: "#3b82f6",
    },
    pressure: {
      title: "Heatmap Tekanan Udara",
      desc: "Distribusi tekanan permukaan laut terhadap rentang hari observasi",
      unit: "hPa",
      paramLabel: "Tekanan MSL",
      icon: <Gauge className="h-5 w-5 text-pink-500" />,
      colorScale: [
        "#440154",
        "#482878",
        "#3e4989",
        "#31688e",
        "#26828e",
        "#1f9e89",
        "#35b779",
        "#6ece58",
        "#b5de2b",
        "#fde725",
      ],
      highlightColor: "#ec4899",
    },
  };

  const activeInfo = labels[activeParam];
  const currentHeatmapData = useMemo(() => heatmaps?.[activeParam], [heatmaps, activeParam]);

  const days = useMemo(() => currentHeatmapData?.days || [], [currentHeatmapData]);
  const hours = useMemo(() => currentHeatmapData?.hours || [], [currentHeatmapData]);
  const numDays = days.length;

  // Nilai otomatis toggle label: jika hari <= 14 otomatis aktif, jika > 14 dinonaktifkan agar tidak menumpuk
  const isValuesVisible = showValues !== null ? showValues : numDays <= 14;

  // 1. Ekstraksi Nilai Min, Max, Rerata untuk skala VisualMap
  const { flatValues, minVal, maxVal, avgVal } = useMemo(() => {
    if (!currentHeatmapData?.z) {
      return { flatValues: [], minVal: 0, maxVal: 100, avgVal: 0 };
    }
    const valid = currentHeatmapData.z
      .flat()
      .filter((v): v is number => v !== null && Number.isFinite(v));

    if (valid.length === 0) {
      return { flatValues: [], minVal: 0, maxVal: 100, avgVal: 0 };
    }

    const min = Math.min(...valid);
    const max = Math.max(...valid);
    const avg = valid.reduce((a, b) => a + b, 0) / valid.length;

    return {
      flatValues: valid,
      minVal: Math.floor(min * 10) / 10,
      maxVal: Math.ceil(max * 10) / 10,
      avgVal: Math.round(avg * 10) / 10,
    };
  }, [currentHeatmapData]);

  // 2. Perhitungan Proporsional Panjang & Lebar Dinamis
  // Mencegah anomali sel gepeng (squished) atau meluap ketika rentang hari berubah dari 7, 14, 30, ke 60 hari
  const { chartHeight, chartWidth, minContainerWidth } = useMemo(() => {
    if (orientation === "hourX_dayY") {
      // Mode Vertikal (Jam di sumbu X [24 kolom], Hari di sumbu Y [N baris])
      const cellHeight = numDays <= 7 ? 38 : numDays <= 14 ? 30 : numDays <= 31 ? 26 : 22;
      const height = Math.max(340, numDays * cellHeight + 110);
      const minW = Math.max(760, 24 * 32 + 120); // minimal 888px untuk 24 kolom jam yang lapang
      return {
        chartHeight: height,
        chartWidth: "100%",
        minContainerWidth: `${minW}px`,
      };
    } else {
      // Mode Horizontal / Hovmöller (Hari di sumbu X [N kolom], Jam di sumbu Y [24 baris])
      const colWidth = numDays <= 7 ? 65 : numDays <= 14 ? 45 : numDays <= 31 ? 32 : 24;
      const widthPx = Math.max(800, numDays * colWidth + 140);
      return {
        chartHeight: 520, // 24 jam dengan tinggi 18px per jam + margins
        chartWidth: `${widthPx}px`,
        minContainerWidth: `${widthPx}px`,
      };
    }
  }, [orientation, numDays]);

  // 3. Opsi ECharts Heatmap Konfigurasi Lengkap
  const chartOption = useMemo(() => {
    if (!currentHeatmapData?.z || numDays === 0 || hours.length === 0) return {};

    const hourLabels = hours.map((h) => `${h}:00`);
    const dayShortLabels = days.map((d) => formatDayShort(d));

    // Susun data array 3-tuple [x, y, value] sesuai orientasi
    const dataPoints: [number, number, number | null][] = [];

    if (orientation === "hourX_dayY") {
      for (let d = 0; d < numDays; d++) {
        for (let h = 0; h < 24; h++) {
          const val = currentHeatmapData.z[d]?.[h];
          dataPoints.push([h, d, val !== null && Number.isFinite(val) ? val : null]);
        }
      }
    } else {
      for (let d = 0; d < numDays; d++) {
        for (let h = 0; h < 24; h++) {
          const val = currentHeatmapData.z[d]?.[h];
          dataPoints.push([d, h, val !== null && Number.isFinite(val) ? val : null]);
        }
      }
    }

    const xAxisData = orientation === "hourX_dayY" ? hourLabels : dayShortLabels;
    const yAxisData = orientation === "hourX_dayY" ? dayShortLabels : hourLabels;

    return {
      backgroundColor: "transparent",
      animation: false,
      grid: {
        top: 40,
        right: 80,
        bottom: 50,
        left: orientation === "hourX_dayY" ? 75 : 65,
        containLabel: false,
      },
      tooltip: {
        position: "top",
        backgroundColor: tooltipBg,
        borderColor: tooltipBorder,
        borderWidth: 1,
        textStyle: {
          color: isDarkMode ? "#f8fafc" : "#0f172a",
          fontSize: 12,
          fontFamily: "Inter, sans-serif",
        },
        formatter: (params: any) => {
          if (!params || !params.data) return "";
          const xIdx = params.data[0];
          const yIdx = params.data[1];
          const rawVal = params.data[2];

          const dateStr =
            orientation === "hourX_dayY"
              ? formatDayFull(days[yIdx])
              : formatDayFull(days[xIdx]);
          const hourStr = orientation === "hourX_dayY" ? hours[xIdx] : hours[yIdx];

          const valText =
            rawVal !== null && rawVal !== undefined
              ? `<b>${Number(rawVal).toFixed(1)} ${activeInfo.unit}</b>`
              : `<span style="color:#94a3b8">Tidak Ada Data</span>`;

          return `
            <div style="font-weight:700; margin-bottom:4px; font-size:12px; color:${isDarkMode ? '#e2e8f0' : '#1e293b'}">
              ${dateStr}
            </div>
            <div style="font-size:11px; margin-bottom:2px;">
              Pukul: <b>${hourStr}:00 WIB</b>
            </div>
            <div style="display:flex; align-items:center; gap:6px; font-size:12px; margin-top:4px;">
              <span style="display:inline-block; width:8px; height:8px; border-radius:50%; background:${activeInfo.highlightColor}"></span>
              <span>${activeInfo.paramLabel}: ${valText}</span>
            </div>
          `;
        },
      },
      xAxis: {
        type: "category",
        data: xAxisData,
        splitArea: { show: false },
        axisLine: { lineStyle: { color: gridBorderColor } },
        axisTick: { alignWithLabel: true },
        axisLabel: {
          color: textColor,
          fontSize: 11,
          interval: orientation === "hourX_dayY" ? 0 : numDays > 20 ? 1 : 0,
          rotate: orientation === "dayX_hourY" && numDays > 14 ? 35 : 0,
        },
        name: orientation === "hourX_dayY" ? "Jam (WIB)" : "Hari Observasi",
        nameLocation: "middle",
        nameGap: orientation === "dayX_hourY" && numDays > 14 ? 35 : 28,
        nameTextStyle: {
          color: textColor,
          fontSize: 11,
          fontWeight: 600,
        },
      },
      yAxis: {
        type: "category",
        data: yAxisData,
        splitArea: { show: false },
        axisLine: { lineStyle: { color: gridBorderColor } },
        axisLabel: {
          color: textColor,
          fontSize: 11,
        },
        name: orientation === "hourX_dayY" ? "Hari Observasi" : "Jam (WIB)",
        nameLocation: "middle",
        nameGap: orientation === "hourX_dayY" ? 55 : 45,
        nameTextStyle: {
          color: textColor,
          fontSize: 11,
          fontWeight: 600,
        },
      },
      visualMap: {
        min: minVal,
        max: maxVal,
        calculable: true,
        orient: "vertical",
        right: 10,
        top: "middle",
        inRange: {
          color: activeInfo.colorScale,
        },
        textStyle: {
          color: textColor,
          fontSize: 10,
        },
        formatter: (val: number) => `${val.toFixed(0)}${activeInfo.unit}`,
      },
      series: [
        {
          name: activeInfo.title,
          type: "heatmap",
          data: dataPoints,
          label: {
            show: isValuesVisible,
            fontSize: numDays > 15 ? 9 : 10,
            color: isDarkMode ? "#ffffff" : "#0f172a",
            formatter: (p: any) =>
              p.data[2] !== null && p.data[2] !== undefined ? Number(p.data[2]).toFixed(1) : "",
          },
          itemStyle: {
            borderColor: isDarkMode ? "#0f172a" : "#ffffff",
            borderWidth: 1,
            borderRadius: 1.5,
          },
          emphasis: {
            itemStyle: {
              shadowBlur: 10,
              shadowColor: "rgba(0, 0, 0, 0.5)",
              borderColor: activeInfo.highlightColor,
              borderWidth: 2,
            },
          },
        },
      ],
    };
  }, [
    currentHeatmapData,
    days,
    hours,
    numDays,
    orientation,
    activeInfo,
    minVal,
    maxVal,
    textColor,
    gridBorderColor,
    tooltipBg,
    tooltipBorder,
    isDarkMode,
    isValuesVisible,
  ]);

  return (
    <Card className="border-none shadow-sm dark:bg-slate-900 bg-white overflow-hidden">
      <CardHeader className="p-4 sm:p-6 border-b border-slate-100 dark:border-slate-800/80">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex flex-wrap items-center gap-2">
              <Badge
                variant="outline"
                className="bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 border-indigo-200 dark:border-indigo-800 text-[11px] font-semibold"
              >
                <Grid className="h-3 w-3 mr-1" />
                Matriks 2D Diurnal
              </Badge>
              <Badge
                variant="outline"
                className="bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 text-[11px] font-medium"
              >
                Rentang: {numDays} Hari ({numDays * 24} Titik Sel)
              </Badge>
              {flatValues.length > 0 && (
                <Badge
                  variant="outline"
                  className="bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800 text-[11px] font-mono"
                >
                  Min: {minVal} | Rerata: {avgVal} | Maks: {maxVal} {activeInfo.unit}
                </Badge>
              )}
            </div>
            <CardTitle className="text-lg font-bold flex items-center gap-2 text-slate-900 dark:text-slate-100">
              {activeInfo.icon} {activeInfo.title}
            </CardTitle>
            <CardDescription className="text-xs sm:text-sm text-slate-500 dark:text-slate-400">
              {activeInfo.desc} — Proporsi panjang dan lebar disesuaikan otomatis dengan rentang waktu analisis
            </CardDescription>
          </div>

          {/* Action Toolbar */}
          <div className="flex flex-wrap items-center gap-2 self-start lg:self-center">
            {/* Parameter Selector */}
            <div className="flex border rounded-lg p-1 bg-slate-50 dark:bg-slate-950 dark:border-slate-800 text-xs">
              <button
                onClick={() => setActiveParam("temperature")}
                className={`px-3 py-1.5 font-semibold rounded-md transition-all duration-200 ${
                  activeParam === "temperature"
                    ? "bg-white dark:bg-slate-800 text-orange-600 dark:text-orange-400 shadow-sm"
                    : "text-slate-500 hover:text-slate-800 dark:hover:text-slate-200"
                }`}
              >
                Suhu
              </button>
              <button
                onClick={() => setActiveParam("humidity")}
                className={`px-3 py-1.5 font-semibold rounded-md transition-all duration-200 ${
                  activeParam === "humidity"
                    ? "bg-white dark:bg-slate-800 text-blue-600 dark:text-blue-400 shadow-sm"
                    : "text-slate-500 hover:text-slate-800 dark:hover:text-slate-200"
                }`}
              >
                Kelembaban
              </button>
              <button
                onClick={() => setActiveParam("pressure")}
                className={`px-3 py-1.5 font-semibold rounded-md transition-all duration-200 ${
                  activeParam === "pressure"
                    ? "bg-white dark:bg-slate-800 text-pink-600 dark:text-pink-400 shadow-sm"
                    : "text-slate-500 hover:text-slate-800 dark:hover:text-slate-200"
                }`}
              >
                Tekanan
              </button>
            </div>

            {/* Orientation Toggle */}
            <Button
              variant="outline"
              size="sm"
              onClick={() =>
                setOrientation((prev) => (prev === "hourX_dayY" ? "dayX_hourY" : "hourX_dayY"))
              }
              className="h-8 text-xs gap-1.5 dark:bg-slate-950 dark:border-slate-800"
              title={
                orientation === "hourX_dayY"
                  ? "Beralih ke format Hovmöller (Hari di Sumbu X)"
                  : "Beralih ke format Diurnal (Jam di Sumbu X)"
              }
            >
              {orientation === "hourX_dayY" ? (
                <>
                  <ArrowLeftRight className="h-3.5 w-3.5 text-indigo-500" />
                  <span className="hidden sm:inline">Format Hovmöller (Hari di Sumbu X)</span>
                  <span className="sm:hidden">Hovmöller</span>
                </>
              ) : (
                <>
                  <ArrowUpDown className="h-3.5 w-3.5 text-indigo-500" />
                  <span className="hidden sm:inline">Format Diurnal (Jam di Sumbu X)</span>
                  <span className="sm:hidden">Diurnal</span>
                </>
              )}
            </Button>

            {/* Toggle Cell Values Label */}
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowValues((prev) => (prev !== null ? !prev : !isValuesVisible))}
              className="h-8 text-xs gap-1.5 dark:bg-slate-950 dark:border-slate-800"
              title={isValuesVisible ? "Sembunyikan angka dalam sel" : "Tampilkan angka dalam sel"}
            >
              {isValuesVisible ? (
                <>
                  <EyeOff className="h-3.5 w-3.5 text-slate-400" />
                  <span className="hidden sm:inline">Sembunyikan Nilai</span>
                </>
              ) : (
                <>
                  <Eye className="h-3.5 w-3.5 text-emerald-500" />
                  <span className="hidden sm:inline">Tampilkan Nilai</span>
                </>
              )}
            </Button>
          </div>
        </div>
      </CardHeader>

      <CardContent className="p-3 sm:p-6">
        {currentHeatmapData && currentHeatmapData.z && currentHeatmapData.z.length > 0 && numDays > 0 ? (
          <div className="w-full space-y-2">
            {/* Scroll Wrapper with dynamic minimum width to guarantee proportional cell size */}
            <div className="w-full overflow-x-auto rounded-xl border border-slate-100 dark:border-slate-800/80 bg-slate-50/50 dark:bg-slate-950/40 p-2 scrollbar-thin">
              <div style={{ minWidth: minContainerWidth, width: chartWidth }}>
                <ReactECharts
                  option={chartOption}
                  style={{ width: "100%", height: `${chartHeight}px` }}
                  notMerge={true}
                  lazyUpdate={true}
                />
              </div>
            </div>

            {/* Footnote explanation of automatic sizing */}
            <div className="flex flex-wrap items-center justify-between text-[11px] text-slate-400 px-1 pt-1">
              <span className="flex items-center gap-1.5">
                <Info className="h-3.5 w-3.5 text-indigo-400 shrink-0" />
                Dimensi matriks: {orientation === "hourX_dayY" ? `24 Jam × ${numDays} Hari` : `${numDays} Hari × 24 Jam`}. 
                Tinggi &amp; lebar sel diskalakan otomatis agar rasio piksel tetap ideal.
              </span>
              <span>Arahkan kursor / sentuh sel untuk rincian waktu &amp; nilai presisi.</span>
            </div>
          </div>
        ) : (
          <div className="h-[320px] flex flex-col items-center justify-center text-sm text-slate-400 dark:text-slate-500 gap-2 border border-dashed rounded-xl">
            <Grid className="h-8 w-8 text-slate-300 dark:text-slate-600" />
            <span>Tidak ada data matriks heatmap yang tersedia untuk periode ini</span>
          </div>
        )}
      </CardContent>
    </Card>
  );
};
