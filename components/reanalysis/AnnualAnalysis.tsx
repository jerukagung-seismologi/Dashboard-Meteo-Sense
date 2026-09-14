// components/reanalysis/AnnualAnalysis.tsx
"use client";

import React, { useState, useMemo } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { CalendarRange, Thermometer, Droplets, Gauge, CloudRain } from "lucide-react";
import dynamic from "next/dynamic";

const ReactECharts = dynamic(() => import("echarts-for-react"), {
  ssr: false,
  loading: () => (
    <div className="h-[350px] w-full flex items-center justify-center text-muted-foreground animate-pulse bg-slate-50 dark:bg-slate-900 rounded-lg border">
      Membuat grafik analisis tahunan...
    </div>
  ),
});

interface AnnualAnalysisProps {
  days: string[]; // YYYY-MM-DD
  temperatureMean: number[];
  humidityMean: number[];
  pressureMean: number[];
  rainAccumulated: number[];
  isDarkMode: boolean;
}

export const AnnualAnalysis: React.FC<AnnualAnalysisProps> = ({
  days,
  temperatureMean,
  humidityMean,
  pressureMean,
  rainAccumulated,
  isDarkMode,
}) => {
  const [activeTab, setActiveTab] = useState<"temperature" | "humidity" | "pressure" | "rain">("temperature");

  const textColor = isDarkMode ? "#cbd5e1" : "#475569";
  const gridColor = isDarkMode ? "rgba(71, 85, 105, 0.2)" : "rgba(203, 213, 225, 0.25)";

  const activeInfo = useMemo(() => {
    switch (activeTab) {
      case "temperature":
        return {
          title: "Variabilitas Suhu Tahunan",
          desc: "Suhu rata-rata harian sepanjang tahun untuk mengamati evolusi musiman",
          unit: "°C",
          icon: <Thermometer className="h-5 w-5 text-orange-500" />,
          color: "#ef4444",
          data: temperatureMean,
          name: "Suhu Harian",
        };
      case "humidity":
        return {
          title: "Variabilitas Kelembaban Tahunan",
          desc: "Kelembaban relatif rata-rata harian sepanjang tahun",
          unit: "%",
          icon: <Droplets className="h-5 w-5 text-blue-500" />,
          color: "#3b82f6",
          data: humidityMean,
          name: "Kelembaban Harian",
        };
      case "pressure":
        return {
          title: "Variabilitas Tekanan Tahunan",
          desc: "Tekanan MSL rata-rata harian sepanjang tahun",
          unit: "hPa",
          icon: <Gauge className="h-5 w-5 text-pink-500" />,
          color: "#ec4899",
          data: pressureMean,
          name: "Tekanan Harian",
        };
      case "rain":
        return {
          title: "Kurva Akumulasi Hujan Tahunan",
          desc: "Kurva akumulasi curah hujan kumulatif sepanjang tahun (kurva massa)",
          unit: "mm",
          icon: <CloudRain className="h-5 w-5 text-purple-500" />,
          color: "#8b5cf6",
          data: rainAccumulated,
          name: "Hujan Akumulatif",
        };
    }
  }, [activeTab, temperatureMean, humidityMean, pressureMean, rainAccumulated]);

  const option = useMemo(() => {
    if (!days || days.length === 0) return {};

    return {
      backgroundColor: "transparent",
      tooltip: {
        trigger: "axis",
        axisPointer: {
          type: "cross",
          label: { backgroundColor: isDarkMode ? "#334155" : "#64748b" },
        },
        valueFormatter: (val: any) => (typeof val === "number" ? `${val.toFixed(2)} ${activeInfo.unit}` : "—"),
      },
      grid: {
        top: 25,
        right: 20,
        bottom: 50,
        left: 55,
        containLabel: true,
      },
      xAxis: {
        type: "category",
        data: days,
        boundaryGap: false,
        axisLine: { lineStyle: { color: gridColor } },
        axisLabel: { color: textColor, fontSize: 11, hideOverlap: true },
        splitLine: { show: false },
      },
      yAxis: {
        type: "value",
        min: activeTab === "humidity" ? 0 : activeTab === "rain" ? 0 : undefined,
        max: activeTab === "humidity" ? 100 : undefined,
        scale: activeTab !== "humidity" && activeTab !== "rain",
        name: `(${activeInfo.unit})`,
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
          fillerColor: `${activeInfo.color}26`,
          handleStyle: { color: activeInfo.color },
          textStyle: { color: textColor, fontSize: 10 },
        },
      ],
      series: [
        {
          name: activeInfo.name,
          type: "line",
          data: activeInfo.data,
          smooth: true,
          showSymbol: false,
          lineStyle: { width: 2.5, color: activeInfo.color },
          itemStyle: { color: activeInfo.color },
          areaStyle: {
            color: {
              type: "linear",
              x: 0,
              y: 0,
              x2: 0,
              y2: 1,
              colorStops: [
                { offset: 0, color: `${activeInfo.color}33` },
                { offset: 1, color: `${activeInfo.color}00` },
              ],
            },
          },
        },
      ],
    };
  }, [days, activeTab, activeInfo, textColor, gridColor, isDarkMode]);

  return (
    <Card className="border-none shadow-sm dark:bg-slate-900 bg-white">
      <CardHeader className="flex flex-col md:flex-row md:items-center justify-between pb-4 gap-4">
        <div className="space-y-1">
          <CardTitle className="text-lg font-bold flex items-center gap-2">
            <CalendarRange className="h-5 w-5 text-indigo-500" /> {activeInfo.title}
          </CardTitle>
          <CardDescription>{activeInfo.desc}</CardDescription>
        </div>

        {/* Tab Selector */}
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
            onClick={() => setActiveTab("rain")}
            className={`px-3 py-1.5 font-semibold rounded-md transition-all duration-200 ${
              activeTab === "rain" ? "bg-white dark:bg-slate-800 text-purple-600 dark:text-purple-400 shadow-sm" : "text-slate-500 hover:text-slate-800"
            }`}
          >
            Curah Hujan
          </button>
        </div>
      </CardHeader>
      
      <CardContent className="p-2">
        {days.length > 0 && (
          <div className="w-full h-[350px]">
            <ReactECharts
              option={option}
              style={{ width: "100%", height: "100%" }}
              opts={{ renderer: "canvas" }}
              notMerge={true}
            />
          </div>
        )}
      </CardContent>
    </Card>
  );
};
