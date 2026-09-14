// components/reanalysis/MonthlyAnalysis.tsx
"use client";

import React, { useState, useMemo } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { CalendarDays, Thermometer, Droplets, Gauge, CloudRain } from "lucide-react";
import dynamic from "next/dynamic";

const ReactECharts = dynamic(() => import("echarts-for-react"), {
  ssr: false,
  loading: () => (
    <div className="h-[350px] w-full flex items-center justify-center text-muted-foreground animate-pulse bg-slate-50 dark:bg-slate-900 rounded-lg border">
      Membuat grafik analisis bulanan...
    </div>
  ),
});

interface MonthlyDataField {
  min: number[];
  mean: number[];
  max: number[];
}

interface MonthlyAnalysisProps {
  months: string[];
  temperature: MonthlyDataField;
  humidity: MonthlyDataField;
  pressure: MonthlyDataField;
  rain: number[];
  isDarkMode: boolean;
}

export const MonthlyAnalysis: React.FC<MonthlyAnalysisProps> = ({
  months,
  temperature,
  humidity,
  pressure,
  rain,
  isDarkMode,
}) => {
  const [activeTab, setActiveTab] = useState<"temperature" | "humidity" | "pressure" | "rain">("temperature");

  const textColor = isDarkMode ? "#cbd5e1" : "#475569";
  const gridColor = isDarkMode ? "rgba(71, 85, 105, 0.2)" : "rgba(203, 213, 225, 0.25)";

  const activeInfo = useMemo(() => {
    switch (activeTab) {
      case "temperature":
        return {
          title: "Suhu Udara Bulanan",
          desc: "Klimatologi suhu maksimum, rata-rata, dan minimum bulanan",
          unit: "°C",
          icon: <Thermometer className="h-5 w-5 text-orange-500" />,
          data: temperature,
          colors: { max: "#f87171", mean: "#ef4444", min: "#60a5fa" }
        };
      case "humidity":
        return {
          title: "Kelembaban Bulanan",
          desc: "Klimatologi kelembaban maksimum, rata-rata, dan minimum bulanan",
          unit: "%",
          icon: <Droplets className="h-5 w-5 text-blue-500" />,
          data: humidity,
          colors: { max: "#34d399", mean: "#3b82f6", min: "#f59e0b" }
        };
      case "pressure":
        return {
          title: "Tekanan MSL Bulanan",
          desc: "Klimatologi tekanan MSL maksimum, rata-rata, dan minimum bulanan",
          unit: "hPa",
          icon: <Gauge className="h-5 w-5 text-pink-500" />,
          data: pressure,
          colors: { max: "#f43f5e", mean: "#ec4899", min: "#818cf8" }
        };
      case "rain":
        return {
          title: "Akumulasi Curah Hujan Bulanan",
          desc: "Akumulasi curah hujan kumulatif bulanan (mm) hasil reanalisis",
          unit: "mm",
          icon: <CloudRain className="h-5 w-5 text-purple-500" />,
          data: { min: [], mean: rain, max: [] },
          colors: { max: "#a855f7", mean: "#8b5cf6", min: "#7c3aed" }
        };
    }
  }, [activeTab, temperature, humidity, pressure, rain]);

  const option = useMemo(() => {
    if (!months || months.length === 0) return {};

    const isRain = activeTab === "rain";

    const series = isRain
      ? [
          {
            name: "Akumulasi Hujan",
            type: "bar",
            data: rain,
            itemStyle: {
              color: {
                type: "linear",
                x: 0,
                y: 0,
                x2: 0,
                y2: 1,
                colorStops: [
                  { offset: 0, color: "#a855f7" },
                  { offset: 1, color: "#7c3aed" },
                ],
              },
              borderRadius: [4, 4, 0, 0],
            },
          },
        ]
      : [
          {
            name: "Maksimum",
            type: "line",
            data: (activeInfo.data as MonthlyDataField).max,
            smooth: true,
            showSymbol: true,
            symbolSize: 6,
            lineStyle: { width: 1.5, type: "dashed", color: activeInfo.colors.max },
            itemStyle: { color: activeInfo.colors.max },
          },
          {
            name: "Rata-rata",
            type: "line",
            data: (activeInfo.data as MonthlyDataField).mean,
            smooth: true,
            showSymbol: true,
            symbolSize: 6,
            lineStyle: { width: 2.5, color: activeInfo.colors.mean },
            itemStyle: { color: activeInfo.colors.mean },
            areaStyle: {
              color: {
                type: "linear",
                x: 0,
                y: 0,
                x2: 0,
                y2: 1,
                colorStops: [
                  { offset: 0, color: `${activeInfo.colors.mean}26` },
                  { offset: 1, color: `${activeInfo.colors.mean}00` },
                ],
              },
            },
          },
          {
            name: "Minimum",
            type: "line",
            data: (activeInfo.data as MonthlyDataField).min,
            smooth: true,
            showSymbol: true,
            symbolSize: 6,
            lineStyle: { width: 1.5, type: "dashed", color: activeInfo.colors.min },
            itemStyle: { color: activeInfo.colors.min },
          },
        ];

    return {
      backgroundColor: "transparent",
      tooltip: {
        trigger: "axis",
        axisPointer: {
          type: "cross",
          label: { backgroundColor: isDarkMode ? "#334155" : "#64748b" },
        },
        valueFormatter: (val: any) => (typeof val === "number" ? `${val.toFixed(1)} ${activeInfo.unit}` : "—"),
      },
      legend: !isRain
        ? {
            top: 0,
            right: 10,
            textStyle: { color: textColor, fontSize: 11 },
            data: ["Maksimum", "Rata-rata", "Minimum"],
          }
        : undefined,
      grid: {
        top: 35,
        right: 20,
        bottom: 35,
        left: 55,
        containLabel: true,
      },
      xAxis: {
        type: "category",
        data: months,
        boundaryGap: isRain,
        axisLine: { lineStyle: { color: gridColor } },
        axisLabel: { color: textColor, fontSize: 11 },
        splitLine: { show: false },
      },
      yAxis: {
        type: "value",
        min: activeTab === "humidity" ? 0 : isRain ? 0 : undefined,
        max: activeTab === "humidity" ? 100 : undefined,
        scale: !isRain && activeTab !== "humidity",
        name: `(${activeInfo.unit})`,
        nameTextStyle: { color: textColor, fontSize: 11 },
        axisLabel: { color: textColor, fontSize: 11 },
        axisLine: { show: false },
        splitLine: { lineStyle: { color: gridColor, type: "dashed" } },
      },
      series,
    };
  }, [months, activeTab, activeInfo, rain, textColor, gridColor, isDarkMode]);

  return (
    <Card className="border-none shadow-sm dark:bg-slate-900 bg-white">
      <CardHeader className="flex flex-col md:flex-row md:items-center justify-between pb-4 gap-4">
        <div className="space-y-1">
          <CardTitle className="text-lg font-bold flex items-center gap-2">
            <CalendarDays className="h-5 w-5 text-indigo-500" /> {activeInfo.title}
          </CardTitle>
          <CardDescription>{activeInfo.desc}</CardDescription>
        </div>

        {/* Tab Selection */}
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
        {months.length > 0 && (
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
