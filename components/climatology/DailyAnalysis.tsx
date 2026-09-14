// components/climatology/DailyAnalysis.tsx
"use client";

import React, { useMemo, useState } from "react";
import { format } from "date-fns";
import { id } from "date-fns/locale";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Thermometer, Droplets, Gauge, Grid, ChevronLeft, ChevronRight, Calendar as CalendarIcon } from "lucide-react";
import { AnalysisPoint, DailyHeatmapData } from "@/lib/climatology/analysisTypes";
import dynamic from "next/dynamic";

const ReactECharts = dynamic(() => import("echarts-for-react"), {
  ssr: false,
  loading: () => (
    <div className="h-[350px] w-full flex items-center justify-center text-muted-foreground animate-pulse bg-slate-50 dark:bg-slate-900 rounded-lg border">
      Membuat grafik analisis harian...
    </div>
  ),
});

interface DailyAnalysisProps {
  points: AnalysisPoint[];
  heatmaps?: {
    temperature: DailyHeatmapData;
    humidity: DailyHeatmapData;
    pressure: DailyHeatmapData;
  };
  isDarkMode: boolean;
  selectedDate?: Date;
  onPrevDay?: () => void;
  onNextDay?: () => void;
  onToday?: () => void;
  isToday?: boolean;
}

export const DailyAnalysis: React.FC<DailyAnalysisProps> = ({
  points,
  heatmaps,
  isDarkMode,
  selectedDate,
  onPrevDay,
  onNextDay,
  onToday,
  isToday,
}) => {
  const [activeParam, setActiveParam] = useState<"temperature" | "humidity" | "pressure">("temperature");

  const textColor = isDarkMode ? "#cbd5e1" : "#475569";
  const gridColor = isDarkMode ? "rgba(71, 85, 105, 0.2)" : "rgba(203, 213, 225, 0.25)";

  // Format x-axis categories: WIB hours "HH:MM"
  const xData = useMemo(() => points.map((p) => p.timeKeyWib), [points]);

  // Option Generator for 3-line daily analysis (Max, Mean, Min)
  const createLineOption = (
    title: string,
    unit: string,
    maxData: (number | null)[],
    meanData: (number | null)[],
    minData: (number | null)[],
    colors: { max: string; mean: string; min: string; area: string },
    yMin?: number,
    yMax?: number
  ) => ({
    backgroundColor: "transparent",
    tooltip: {
      trigger: "axis",
      axisPointer: {
        type: "cross",
        label: { backgroundColor: isDarkMode ? "#334155" : "#64748b" },
      },
      valueFormatter: (val: any) => (typeof val === "number" ? `${val.toFixed(1)} ${unit}` : "—"),
    },
    legend: {
      top: 0,
      right: 10,
      textStyle: { color: textColor, fontSize: 11 },
      data: ["Maksimum", "Rata-rata", "Minimum"],
    },
    grid: {
      top: 35,
      right: 20,
      bottom: 45,
      left: 50,
      containLabel: true,
    },
    xAxis: {
      type: "category",
      data: xData,
      boundaryGap: false,
      axisLine: { lineStyle: { color: gridColor } },
      axisLabel: { color: textColor, fontSize: 11, hideOverlap: true },
      splitLine: { show: false },
    },
    yAxis: {
      type: "value",
      min: yMin,
      max: yMax,
      name: `(${unit})`,
      nameTextStyle: { color: textColor, fontSize: 11 },
      axisLabel: { color: textColor, fontSize: 11 },
      axisLine: { show: false },
      splitLine: { lineStyle: { color: gridColor, type: "dashed" } },
    },
    dataZoom: [
      { type: "inside" },
      {
        type: "slider",
        bottom: 5,
        height: 18,
        borderColor: "transparent",
        backgroundColor: isDarkMode ? "rgba(30, 41, 59, 0.5)" : "rgba(241, 245, 249, 0.8)",
        fillerColor: `${colors.mean}26`,
        handleStyle: { color: colors.mean },
        textStyle: { color: textColor, fontSize: 10 },
      },
    ],
    series: [
      {
        name: "Maksimum",
        type: "line",
        data: maxData,
        smooth: true,
        showSymbol: false,
        lineStyle: { width: 1.5, type: "dashed", color: colors.max },
        itemStyle: { color: colors.max },
      },
      {
        name: "Rata-rata",
        type: "line",
        data: meanData,
        smooth: true,
        showSymbol: false,
        lineStyle: { width: 2.5, color: colors.mean },
        itemStyle: { color: colors.mean },
        areaStyle: {
          color: {
            type: "linear",
            x: 0,
            y: 0,
            x2: 0,
            y2: 1,
            colorStops: [
              { offset: 0, color: colors.area },
              { offset: 1, color: "rgba(0,0,0,0)" },
            ],
          },
        },
      },
      {
        name: "Minimum",
        type: "line",
        data: minData,
        smooth: true,
        showSymbol: false,
        lineStyle: { width: 1.5, type: "dashed", color: colors.min },
        itemStyle: { color: colors.min },
      },
    ],
  });

  const tempOption = useMemo(() => {
    if (points.length === 0) return {};
    return createLineOption(
      "Suhu",
      "°C",
      points.map((p) => p.temperatureMax),
      points.map((p) => p.temperatureMean),
      points.map((p) => p.temperatureMin),
      { max: "#f87171", mean: "#ef4444", min: "#60a5fa", area: "rgba(239, 68, 68, 0.18)" }
    );
  }, [points, xData, textColor, gridColor, isDarkMode]);

  const humOption = useMemo(() => {
    if (points.length === 0) return {};
    return createLineOption(
      "Kelembaban",
      "%",
      points.map((p) => p.humidityMax),
      points.map((p) => p.humidityMean),
      points.map((p) => p.humidityMin),
      { max: "#34d399", mean: "#059669", min: "#f59e0b", area: "rgba(5, 150, 105, 0.18)" },
      0,
      100
    );
  }, [points, xData, textColor, gridColor, isDarkMode]);

  const pressOption = useMemo(() => {
    if (points.length === 0) return {};
    return createLineOption(
      "Tekanan",
      "hPa",
      points.map((p) => p.pressureMax),
      points.map((p) => p.pressureMean),
      points.map((p) => p.pressureMin),
      { max: "#f43f5e", mean: "#db2777", min: "#818cf8", area: "rgba(219, 39, 119, 0.18)" }
    );
  }, [points, xData, textColor, gridColor, isDarkMode]);

  // Daily Heatmap Trace & Layout Data
  const currentHeatmapData = useMemo(() => {
    return heatmaps?.[activeParam];
  }, [heatmaps, activeParam]);

  const heatmapOption = useMemo(() => {
    if (!currentHeatmapData || !currentHeatmapData.z || currentHeatmapData.z.length === 0) return {};

    const colorscales = {
      temperature: ["#313695", "#4575b4", "#74add1", "#abd9e9", "#e0f3f8", "#ffffbf", "#fee090", "#fdae61", "#f46d43", "#d73027", "#a50026"],
      humidity: ["#eff6ff", "#bfdbfe", "#60a5fa", "#2563eb", "#1e3a8a"],
      pressure: ["#440154", "#414487", "#2a788e", "#22a884", "#7ad151", "#fde725"],
    };

    const flatVals = currentHeatmapData.z.flat().filter((v) => v !== null && Number.isFinite(v)) as number[];
    const zmin = flatVals.length > 0 ? Math.floor(Math.min(...flatVals)) : 0;
    const zmax = flatVals.length > 0 ? Math.ceil(Math.max(...flatVals)) : 100;

    const formattedData: [number, number, number | null][] = [];
    currentHeatmapData.z.forEach((row, hourIdx) => {
      row.forEach((val, minIdx) => {
        formattedData.push([minIdx, hourIdx, val !== null ? Number(val.toFixed(1)) : null]);
      });
    });

    const unit = activeParam === "temperature" ? "°C" : activeParam === "humidity" ? "%" : "hPa";

    return {
      backgroundColor: "transparent",
      tooltip: {
        position: "top",
        backgroundColor: isDarkMode ? "rgba(15, 23, 42, 0.95)" : "rgba(255, 255, 255, 0.95)",
        borderColor: isDarkMode ? "#334155" : "#e2e8f0",
        textStyle: { color: isDarkMode ? "#f8fafc" : "#0f172a", fontSize: 12 },
        formatter: (params: any) => {
          const minute = currentHeatmapData.minutes[params.value[0]];
          const hour = currentHeatmapData.hours[params.value[1]];
          const val = params.value[2];
          return `
            <div style="font-size:12px;font-family:Inter,sans-serif;">
              <div style="color:${isDarkMode ? '#94a3b8' : '#64748b'};margin-bottom:2px;">Pukul ${hour}:${minute} WIB</div>
              <div style="font-weight:600;color:${isDarkMode ? '#f8fafc' : '#0f172a'};">
                Nilai: ${val !== null ? `${val} ${unit}` : "Tidak Ada Data"}
              </div>
            </div>
          `;
        },
      },
      grid: {
        top: 20,
        right: 20,
        bottom: 50,
        left: 55,
        containLabel: true,
      },
      xAxis: {
        type: "category",
        data: currentHeatmapData.minutes.map((m) => `:${m}`),
        name: "Menit",
        splitArea: { show: true },
        axisLine: { lineStyle: { color: gridColor } },
        axisLabel: { color: textColor, fontSize: 10 },
      },
      yAxis: {
        type: "category",
        data: currentHeatmapData.hours.map((h) => `${h}:00`),
        name: "Jam (WIB)",
        splitArea: { show: true },
        axisLine: { lineStyle: { color: gridColor } },
        axisLabel: { color: textColor, fontSize: 10 },
      },
      visualMap: {
        min: zmin,
        max: zmax,
        calculable: true,
        orient: "horizontal",
        left: "center",
        bottom: 0,
        inRange: { color: colorscales[activeParam] },
        textStyle: { color: textColor, fontSize: 10 },
      },
      series: [
        {
          name: "Diurnal Harian",
          type: "heatmap",
          data: formattedData,
          label: {
            show: currentHeatmapData.minutes.length <= 12,
            fontSize: 8,
            color: isDarkMode ? "#f8fafc" : "#0f172a",
            formatter: (p: any) => (p.data[2] !== null ? p.data[2] : ""),
          },
          emphasis: {
            itemStyle: {
              shadowBlur: 10,
              shadowColor: "rgba(0, 0, 0, 0.5)",
            },
          },
        },
      ],
    };
  }, [currentHeatmapData, activeParam, textColor, gridColor, isDarkMode]);

  return (
    <div className="space-y-6">
      {/* Date Navigator Header */}
      {selectedDate && (
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 p-3 bg-white dark:bg-slate-900 rounded-xl border border-slate-200/80 dark:border-slate-800 shadow-sm">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-lg bg-orange-50 dark:bg-orange-950/40 text-orange-600 dark:text-orange-400 border border-orange-100 dark:border-orange-900/40">
              <CalendarIcon className="h-4 w-4" />
            </div>
            <div>
              <p className="text-[11px] font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                Tanggal Analisis
              </p>
              <h3 className="text-sm sm:text-base font-bold text-slate-800 dark:text-slate-100">
                {format(selectedDate, "EEEE, dd MMMM yyyy", { locale: id })}
                {isToday && (
                  <span className="ml-2 inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300">
                    Hari Ini
                  </span>
                )}
              </h3>
            </div>
          </div>

          {/* Navigation Buttons */}
          <div className="flex items-center gap-1.5 w-full sm:w-auto justify-end">
            <Button
              variant="outline"
              size="sm"
              onClick={onPrevDay}
              title="Mundur 1 Hari"
              className="h-8 text-xs font-semibold text-slate-700 dark:text-slate-200 border-slate-200 dark:border-slate-800 hover:bg-orange-50 hover:text-orange-600 dark:hover:bg-slate-800 dark:hover:text-orange-400"
            >
              <ChevronLeft className="h-3.5 w-3.5 mr-1 text-orange-500" /> Hari Sebelumnya
            </Button>

            <Button
              variant="outline"
              size="sm"
              onClick={onNextDay}
              disabled={isToday}
              title="Maju 1 Hari"
              className="h-8 text-xs font-semibold text-slate-700 dark:text-slate-200 border-slate-200 dark:border-slate-800 hover:bg-orange-50 hover:text-orange-600 dark:hover:bg-slate-800 dark:hover:text-orange-400 disabled:opacity-40"
            >
              Hari Selanjutnya <ChevronRight className="h-3.5 w-3.5 ml-1 text-orange-500" />
            </Button>

            {!isToday && onToday && (
              <Button
                variant="outline"
                size="sm"
                onClick={onToday}
                className="h-8 px-2.5 text-xs font-semibold text-orange-600 dark:text-orange-400 border-orange-200 dark:border-orange-900/50 bg-orange-50/50 dark:bg-orange-950/30 hover:bg-orange-100 dark:hover:bg-orange-900/50"
              >
                Hari Ini
              </Button>
            )}
          </div>
        </div>
      )}

      {/* 1. Suhu Chart */}
      <Card className="border-none shadow-sm dark:bg-slate-900 bg-white">
        <CardHeader className="pb-2">
          <CardTitle className="text-lg font-bold flex items-center gap-2">
            <Thermometer className="h-5 w-5 text-orange-500" /> Analisis Suhu Udara Harian
          </CardTitle>
          <CardDescription>Suhu maksimum, rata-rata, dan minimum setiap jam (WIB)</CardDescription>
        </CardHeader>
        <CardContent className="p-2">
          {points.length > 0 && (
            <div className="w-full h-[350px]">
              <ReactECharts
                option={tempOption}
                style={{ width: "100%", height: "100%" }}
                opts={{ renderer: "canvas" }}
                notMerge={true}
              />
            </div>
          )}
        </CardContent>
      </Card>

      {/* 2. Kelembapan Chart */}
      <Card className="border-none shadow-sm dark:bg-slate-900 bg-white">
        <CardHeader className="pb-2">
          <CardTitle className="text-lg font-bold flex items-center gap-2">
            <Droplets className="h-5 w-5 text-blue-500" /> Analisis Kelembaban Relatif Harian
          </CardTitle>
          <CardDescription>Kelembaban maksimum, rata-rata, dan minimum setiap jam (WIB)</CardDescription>
        </CardHeader>
        <CardContent className="p-2">
          {points.length > 0 && (
            <div className="w-full h-[350px]">
              <ReactECharts
                option={humOption}
                style={{ width: "100%", height: "100%" }}
                opts={{ renderer: "canvas" }}
                notMerge={true}
              />
            </div>
          )}
        </CardContent>
      </Card>

      {/* 3. Tekanan Chart */}
      <Card className="border-none shadow-sm dark:bg-slate-900 bg-white">
        <CardHeader className="pb-2">
          <CardTitle className="text-lg font-bold flex items-center gap-2">
            <Gauge className="h-5 w-5 text-pink-500" /> Analisis Tekanan Udara Harian
          </CardTitle>
          <CardDescription>Tekanan maksimum, rata-rata, dan minimum setiap jam (WIB)</CardDescription>
        </CardHeader>
        <CardContent className="p-2">
          {points.length > 0 && (
            <div className="w-full h-[350px]">
              <ReactECharts
                option={pressOption}
                style={{ width: "100%", height: "100%" }}
                opts={{ renderer: "canvas" }}
                notMerge={true}
              />
            </div>
          )}
        </CardContent>
      </Card>

      {/* 4. Daily Heatmap Chart (Apache ECharts) */}
      {heatmaps && currentHeatmapData && (
        <Card className="border-none shadow-sm dark:bg-slate-900 bg-white">
          <CardHeader className="flex flex-col md:flex-row md:items-center justify-between pb-4 gap-4">
            <div className="space-y-1">
              <CardTitle className="text-lg font-bold flex items-center gap-2">
                <Grid className="h-5 w-5 text-indigo-500" /> Heatmap Diurnal Harian
              </CardTitle>
              <CardDescription>
                Distribusi nilai parameter cuaca menit-demi-menit terhadap jam WIB (Apache ECharts)
              </CardDescription>
            </div>
            
            {/* Tab Selection */}
            <div className="flex border rounded-lg p-1 bg-slate-50 dark:bg-slate-950 dark:border-slate-800 self-start md:self-center">
              <button
                onClick={() => setActiveParam("temperature")}
                className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-all duration-200 ${
                  activeParam === "temperature"
                    ? "bg-white dark:bg-slate-800 text-orange-600 dark:text-orange-400 shadow-sm"
                    : "text-slate-500 hover:text-slate-800 dark:hover:text-slate-200"
                }`}
              >
                Suhu
              </button>
              <button
                onClick={() => setActiveParam("humidity")}
                className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-all duration-200 ${
                  activeParam === "humidity"
                    ? "bg-white dark:bg-slate-800 text-blue-600 dark:text-blue-400 shadow-sm"
                    : "text-slate-500 hover:text-slate-800 dark:hover:text-slate-200"
                }`}
              >
                Kelembaban
              </button>
              <button
                onClick={() => setActiveParam("pressure")}
                className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-all duration-200 ${
                  activeParam === "pressure"
                    ? "bg-white dark:bg-slate-800 text-pink-600 dark:text-pink-400 shadow-sm"
                    : "text-slate-500 hover:text-slate-800 dark:hover:text-slate-200"
                }`}
              >
                Tekanan
              </button>
            </div>
          </CardHeader>
          <CardContent className="p-2 overflow-x-auto">
            <div className="min-w-[700px] w-full h-[380px]">
              <ReactECharts
                option={heatmapOption}
                style={{ width: "100%", height: "100%" }}
                opts={{ renderer: "canvas" }}
                notMerge={true}
              />
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};
