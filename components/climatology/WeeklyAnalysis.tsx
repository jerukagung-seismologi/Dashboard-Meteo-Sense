// components/climatology/WeeklyAnalysis.tsx
"use client";

import React, { useMemo } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Thermometer, Droplets } from "lucide-react";
import { AnalysisPoint } from "@/lib/climatology/analysisTypes";
import dynamic from "next/dynamic";

const ReactECharts = dynamic(() => import("echarts-for-react"), {
  ssr: false,
  loading: () => (
    <div className="h-[350px] w-full flex items-center justify-center text-muted-foreground animate-pulse bg-slate-50 dark:bg-slate-900 rounded-lg border">
      Membuat grafik analisis mingguan...
    </div>
  ),
});

interface WeeklyAnalysisProps {
  points: (AnalysisPoint & { dayLabelWib: string })[];
  isDarkMode: boolean;
}

export const WeeklyAnalysis: React.FC<WeeklyAnalysisProps> = ({
  points,
  isDarkMode,
}) => {
  const textColor = isDarkMode ? "#cbd5e1" : "#475569";
  const gridColor = isDarkMode ? "rgba(71, 85, 105, 0.2)" : "rgba(203, 213, 225, 0.25)";

  // Format x-axis categories: Combine Date + WIB time "DD/MM HH:MM"
  const xData = useMemo(() => points.map((p) => `${p.dayLabelWib} ${p.timeKeyWib}`), [points]);

  // Temperature ECharts Option
  const tempOption = useMemo(() => {
    if (points.length === 0) return {};
    return {
      backgroundColor: "transparent",
      tooltip: {
        trigger: "axis",
        axisPointer: {
          type: "cross",
          label: { backgroundColor: isDarkMode ? "#334155" : "#64748b" },
        },
        valueFormatter: (val: any) => (typeof val === "number" ? `${val.toFixed(1)} °C` : "—"),
      },
      legend: {
        top: 0,
        right: 10,
        textStyle: { color: textColor, fontSize: 11 },
        data: ["Suhu Maksimum", "Suhu Rata-rata", "Suhu Minimum"],
      },
      grid: {
        top: 35,
        right: 20,
        bottom: 50,
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
        name: "(°C)",
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
          fillerColor: isDarkMode ? "rgba(239, 68, 68, 0.2)" : "rgba(239, 68, 68, 0.15)",
          handleStyle: { color: "#ef4444" },
          textStyle: { color: textColor, fontSize: 10 },
        },
      ],
      series: [
        {
          name: "Suhu Maksimum",
          type: "line",
          data: points.map((p) => p.temperatureMax),
          smooth: true,
          showSymbol: false,
          lineStyle: { width: 1.5, type: "dashed", color: "#f87171" },
          itemStyle: { color: "#f87171" },
        },
        {
          name: "Suhu Rata-rata",
          type: "line",
          data: points.map((p) => p.temperatureMean),
          smooth: true,
          showSymbol: false,
          lineStyle: { width: 2.5, color: "#ef4444" },
          itemStyle: { color: "#ef4444" },
          areaStyle: {
            color: {
              type: "linear",
              x: 0,
              y: 0,
              x2: 0,
              y2: 1,
              colorStops: [
                { offset: 0, color: "rgba(239, 68, 68, 0.18)" },
                { offset: 1, color: "rgba(239, 68, 68, 0.0)" },
              ],
            },
          },
        },
        {
          name: "Suhu Minimum",
          type: "line",
          data: points.map((p) => p.temperatureMin),
          smooth: true,
          showSymbol: false,
          lineStyle: { width: 1.5, type: "dashed", color: "#60a5fa" },
          itemStyle: { color: "#60a5fa" },
        },
      ],
    };
  }, [points, xData, textColor, gridColor, isDarkMode]);

  // Humidity ECharts Option
  const humOption = useMemo(() => {
    if (points.length === 0) return {};
    return {
      backgroundColor: "transparent",
      tooltip: {
        trigger: "axis",
        axisPointer: {
          type: "cross",
          label: { backgroundColor: isDarkMode ? "#334155" : "#64748b" },
        },
        valueFormatter: (val: any) => (typeof val === "number" ? `${val.toFixed(1)} %` : "—"),
      },
      legend: {
        top: 0,
        right: 10,
        textStyle: { color: textColor, fontSize: 11 },
        data: ["Kelembaban Maksimum", "Kelembaban Rata-rata", "Kelembaban Minimum"],
      },
      grid: {
        top: 35,
        right: 20,
        bottom: 50,
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
        min: 0,
        max: 100,
        name: "(%)",
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
          fillerColor: isDarkMode ? "rgba(16, 185, 129, 0.2)" : "rgba(16, 185, 129, 0.15)",
          handleStyle: { color: "#10b981" },
          textStyle: { color: textColor, fontSize: 10 },
        },
      ],
      series: [
        {
          name: "Kelembaban Maksimum",
          type: "line",
          data: points.map((p) => p.humidityMax),
          smooth: true,
          showSymbol: false,
          lineStyle: { width: 1.5, type: "dashed", color: "#34d399" },
          itemStyle: { color: "#34d399" },
        },
        {
          name: "Kelembaban Rata-rata",
          type: "line",
          data: points.map((p) => p.humidityMean),
          smooth: true,
          showSymbol: false,
          lineStyle: { width: 2.5, color: "#059669" },
          itemStyle: { color: "#059669" },
          areaStyle: {
            color: {
              type: "linear",
              x: 0,
              y: 0,
              x2: 0,
              y2: 1,
              colorStops: [
                { offset: 0, color: "rgba(5, 150, 105, 0.18)" },
                { offset: 1, color: "rgba(5, 150, 105, 0.0)" },
              ],
            },
          },
        },
        {
          name: "Kelembaban Minimum",
          type: "line",
          data: points.map((p) => p.humidityMin),
          smooth: true,
          showSymbol: false,
          lineStyle: { width: 1.5, type: "dashed", color: "#f59e0b" },
          itemStyle: { color: "#f59e0b" },
        },
      ],
    };
  }, [points, xData, textColor, gridColor, isDarkMode]);

  return (
    <div className="space-y-6">
      {/* 1. Weekly Temperature */}
      <Card className="border-none shadow-sm dark:bg-slate-900 bg-white">
        <CardHeader className="pb-2">
          <CardTitle className="text-lg font-bold flex items-center gap-2">
            <Thermometer className="h-5 w-5 text-orange-500" /> Analisis Suhu Udara Mingguan
          </CardTitle>
          <CardDescription>Tren suhu udara jam-demi-jam resolusi tinggi selama 7 hari (WIB)</CardDescription>
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

      {/* 2. Weekly Humidity */}
      <Card className="border-none shadow-sm dark:bg-slate-900 bg-white">
        <CardHeader className="pb-2">
          <CardTitle className="text-lg font-bold flex items-center gap-2">
            <Droplets className="h-5 w-5 text-blue-500" /> Analisis Kelembaban Relatif Mingguan
          </CardTitle>
          <CardDescription>Tren kelembaban udara jam-demi-jam resolusi tinggi selama 7 hari (WIB)</CardDescription>
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
    </div>
  );
};
