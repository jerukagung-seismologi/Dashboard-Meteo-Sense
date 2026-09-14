// components/reanalysis/WeeklyAnalysis.tsx
"use client";

import React, { useState, useMemo } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { CalendarDays, Thermometer, Droplets, Gauge, Wind } from "lucide-react";
import dynamic from "next/dynamic";

const ReactECharts = dynamic(() => import("echarts-for-react"), {
  ssr: false,
  loading: () => (
    <div className="h-[350px] w-full flex items-center justify-center text-muted-foreground animate-pulse bg-slate-50 dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800">
      Membuat grafik analisis mingguan...
    </div>
  ),
});

interface WeeklyDataField {
  min: number[];
  mean: number[];
  max: number[];
}

interface WeeklyAnalysisProps {
  days: string[];
  temperature: WeeklyDataField;
  humidity: WeeklyDataField;
  pressure: WeeklyDataField;
  windSpeed: WeeklyDataField;
  isDarkMode: boolean;
}

export const WeeklyAnalysis: React.FC<WeeklyAnalysisProps> = ({
  days,
  temperature,
  humidity,
  pressure,
  windSpeed,
  isDarkMode,
}) => {
  const [activeTab, setActiveTab] = useState<"temperature" | "humidity" | "pressure" | "wind">("temperature");

  const textColor = isDarkMode ? "#cbd5e1" : "#475569";
  const gridColor = isDarkMode ? "rgba(71, 85, 105, 0.2)" : "rgba(203, 213, 225, 0.2)";
  const tooltipBg = isDarkMode ? "rgba(15, 23, 42, 0.95)" : "rgba(255, 255, 255, 0.96)";
  const tooltipBorder = isDarkMode ? "#334155" : "#cbd5e1";

  const activeInfo = useMemo(() => {
    switch (activeTab) {
      case "temperature":
        return {
          title: "Tren Suhu Mingguan",
          desc: "Suhu maksimum, rata-rata, dan minimum harian selama 7 hari terakhir",
          unit: "°C",
          icon: <Thermometer className="h-5 w-5 text-orange-500" />,
          data: temperature,
          colors: { max: "#f87171", mean: "#ef4444", min: "#60a5fa" },
        };
      case "humidity":
        return {
          title: "Tren Kelembaban Mingguan",
          desc: "Kelembaban maksimum, rata-rata, dan minimum harian selama 7 hari terakhir",
          unit: "%",
          icon: <Droplets className="h-5 w-5 text-blue-500" />,
          data: humidity,
          colors: { max: "#34d399", mean: "#3b82f6", min: "#f59e0b" },
        };
      case "pressure":
        return {
          title: "Tren Tekanan Mingguan",
          desc: "Tekanan maksimum, rata-rata, dan minimum harian selama 7 hari terakhir",
          unit: "hPa",
          icon: <Gauge className="h-5 w-5 text-pink-500" />,
          data: pressure,
          colors: { max: "#f43f5e", mean: "#ec4899", min: "#818cf8" },
        };
      case "wind":
        return {
          title: "Tren Kecepatan Angin Mingguan",
          desc: "Kecepatan angin maksimum, rata-rata, dan minimum harian selama 7 hari terakhir",
          unit: "m/s",
          icon: <Wind className="h-5 w-5 text-emerald-500" />,
          data: windSpeed,
          colors: { max: "#34d399", mean: "#10b981", min: "#a78bfa" },
        };
    }
  }, [activeTab, temperature, humidity, pressure, windSpeed]);

  const chartOption = useMemo(() => {
    if (!days || days.length === 0) return {};

    const maxData = days.map((d, idx) => ({
      name: d,
      value: [d, activeInfo.data.max[idx] ?? 0],
    }));
    const meanData = days.map((d, idx) => ({
      name: d,
      value: [d, activeInfo.data.mean[idx] ?? 0],
    }));
    const minData = days.map((d, idx) => ({
      name: d,
      value: [d, activeInfo.data.min[idx] ?? 0],
    }));

    return {
      backgroundColor: "transparent",
      animation: true,
      animationDuration: 400,
      grid: {
        top: 35,
        right: 25,
        bottom: 40,
        left: 55,
        containLabel: false,
      },
      tooltip: {
        trigger: "axis",
        backgroundColor: tooltipBg,
        borderColor: tooltipBorder,
        borderWidth: 1,
        textStyle: {
          color: isDarkMode ? "#f8fafc" : "#0f172a",
          fontSize: 12,
          fontFamily: "Inter, sans-serif",
        },
        axisPointer: {
          type: "cross",
          animation: false,
          label: {
            backgroundColor: isDarkMode ? "#334155" : "#64748b",
          },
        },
        formatter: (params: any) => {
          if (!params || !params.length) return "";
          const first = params[0];
          const dateStr = first.name || first.value[0];
          let html = `
            <div style="font-weight:700; margin-bottom:5px; font-size:11px; opacity:0.85;">
              Tanggal: ${dateStr}
            </div>
            <div style="display:flex; flex-direction:column; gap:4px;">
          `;
          params.forEach((item: any) => {
            const val = typeof item.value[1] === "number" ? item.value[1].toFixed(1) : item.value[1];
            html += `
              <div style="display:flex; align-items:center; justify-content:space-between; gap:16px;">
                <span style="display:flex; align-items:center; gap:6px;">
                  <span style="display:inline-block; width:8px; height:8px; border-radius:50%; background:${item.color};"></span>
                  <span>${item.seriesName}</span>
                </span>
                <span style="font-weight:700; font-family:monospace;">${val} ${activeInfo.unit}</span>
              </div>
            `;
          });
          html += `</div>`;
          return html;
        },
      },
      legend: {
        orient: "horizontal",
        right: 20,
        top: 5,
        textStyle: {
          color: textColor,
          fontSize: 11,
        },
        icon: "roundRect",
      },
      xAxis: {
        type: "category",
        data: days,
        boundaryGap: false,
        splitLine: { show: false },
        axisLine: { lineStyle: { color: gridColor } },
        axisTick: { show: false },
        axisLabel: {
          color: textColor,
          fontSize: 11,
        },
      },
      yAxis: {
        type: "value",
        scale: true,
        name: activeInfo.unit,
        nameTextStyle: {
          color: textColor,
          fontSize: 11,
          align: "left",
          padding: [0, 0, 4, 0],
        },
        splitLine: {
          lineStyle: {
            color: gridColor,
            type: "dashed",
          },
        },
        axisLabel: {
          color: textColor,
          fontSize: 11,
        },
      },
      series: [
        {
          name: "Maksimum",
          type: "line",
          showSymbol: false,
          smooth: true,
          data: maxData,
          lineStyle: { width: 1.8, type: "dashed", color: activeInfo.colors.max },
          itemStyle: { color: activeInfo.colors.max },
        },
        {
          name: "Rata-rata",
          type: "line",
          showSymbol: true,
          symbolSize: 6,
          smooth: true,
          data: meanData,
          lineStyle: { width: 2.8, color: activeInfo.colors.mean },
          itemStyle: { color: activeInfo.colors.mean },
        },
        {
          name: "Minimum",
          type: "line",
          showSymbol: false,
          smooth: true,
          data: minData,
          lineStyle: { width: 1.8, type: "dashed", color: activeInfo.colors.min },
          itemStyle: { color: activeInfo.colors.min },
        },
      ],
    };
  }, [days, activeInfo, textColor, gridColor, tooltipBg, tooltipBorder, isDarkMode]);

  return (
    <Card className="border-none shadow-sm dark:bg-slate-900 bg-white">
      <CardHeader className="flex flex-col md:flex-row md:items-center justify-between pb-4 gap-4">
        <div className="space-y-1">
          <CardTitle className="text-lg font-bold flex items-center gap-2">
            <CalendarDays className="h-5 w-5 text-indigo-500" /> {activeInfo.title}
          </CardTitle>
          <CardDescription>{activeInfo.desc}</CardDescription>
        </div>

        {/* Parameter Selector Buttons */}
        <div className="flex border rounded-lg p-1 bg-slate-50 dark:bg-slate-950 dark:border-slate-800 text-xs self-start md:self-center">
          <button
            onClick={() => setActiveTab("temperature")}
            className={`px-3 py-1.5 font-semibold rounded-md transition-all duration-200 ${
              activeTab === "temperature" ? "bg-white dark:bg-slate-800 text-orange-600 dark:text-orange-400 shadow-sm" : "text-slate-500 hover:text-slate-800"
            }`}
          >
            Suhu
          </button>
          <button
            onClick={() => setActiveTab("humidity")}
            className={`px-3 py-1.5 font-semibold rounded-md transition-all duration-200 ${
              activeTab === "humidity" ? "bg-white dark:bg-slate-800 text-blue-600 dark:text-blue-400 shadow-sm" : "text-slate-500 hover:text-slate-800"
            }`}
          >
            Kelembaban
          </button>
          <button
            onClick={() => setActiveTab("pressure")}
            className={`px-3 py-1.5 font-semibold rounded-md transition-all duration-200 ${
              activeTab === "pressure" ? "bg-white dark:bg-slate-800 text-pink-600 dark:text-pink-400 shadow-sm" : "text-slate-500 hover:text-slate-800"
            }`}
          >
            Tekanan
          </button>
          <button
            onClick={() => setActiveTab("wind")}
            className={`px-3 py-1.5 font-semibold rounded-md transition-all duration-200 ${
              activeTab === "wind" ? "bg-white dark:bg-slate-800 text-emerald-600 dark:text-emerald-400 shadow-sm" : "text-slate-500 hover:text-slate-800"
            }`}
          >
            Angin
          </button>
        </div>
      </CardHeader>

      <CardContent className="p-2">
        {days.length > 0 ? (
          <ReactECharts
            option={chartOption}
            style={{ width: "100%", height: "350px" }}
            notMerge={false}
            lazyUpdate={true}
          />
        ) : (
          <div className="h-[350px] flex items-center justify-center text-muted-foreground border border-dashed rounded-lg">
            Tidak ada data analisis mingguan yang tersedia
          </div>
        )}
      </CardContent>
    </Card>
  );
};
