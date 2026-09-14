// components/reanalysis/DiurnalCycle.tsx
"use client";

import React, { useState, useMemo } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Clock, Thermometer, Droplets, Gauge, Wind, CloudRain } from "lucide-react";
import dynamic from "next/dynamic";
import { DiurnalProfile } from "@/lib/reanalysis/climatology";

const ReactECharts = dynamic(() => import("echarts-for-react"), {
  ssr: false,
  loading: () => (
    <div className="h-[350px] w-full flex items-center justify-center text-muted-foreground animate-pulse bg-slate-50 dark:bg-slate-900 rounded-lg border">
      Membuat grafik profil diurnal...
    </div>
  ),
});

interface DiurnalCycleProps {
  data: DiurnalProfile[];
  isDarkMode: boolean;
}

export const DiurnalCycle: React.FC<DiurnalCycleProps> = ({ data, isDarkMode }) => {
  const [activeTab, setActiveTab] = useState<"temperature" | "humidity" | "pressure" | "wind" | "rain">("temperature");

  const textColor = isDarkMode ? "#cbd5e1" : "#475569";
  const gridColor = isDarkMode ? "rgba(71, 85, 105, 0.2)" : "rgba(203, 213, 225, 0.25)";

  // Hours array (00:00 to 23:00)
  const xData = useMemo(() => data.map(d => d.hour), [data]);

  const activeInfo = useMemo(() => {
    switch (activeTab) {
      case "temperature":
        return {
          title: "Siklus Diurnal Suhu",
          desc: "Rata-rata perubahan suhu udara 2m sepanjang siklus 24 jam",
          unit: "°C",
          icon: <Thermometer className="h-5 w-5 text-orange-500" />,
          color: "#ef4444",
          data: data.map(d => d.temperature),
        };
      case "humidity":
        return {
          title: "Siklus Diurnal Kelembaban",
          desc: "Rata-rata perubahan kelembaban relatif sepanjang siklus 24 jam",
          unit: "%",
          icon: <Droplets className="h-5 w-5 text-blue-500" />,
          color: "#3b82f6",
          data: data.map(d => d.humidity),
        };
      case "pressure":
        return {
          title: "Siklus Diurnal Tekanan",
          desc: "Pasang-surut barometrik (atmospheric tides) rata-rata sepanjang siklus 24 jam",
          unit: "hPa",
          icon: <Gauge className="h-5 w-5 text-pink-500" />,
          color: "#ec4899",
          data: data.map(d => d.pressure),
        };
      case "wind":
        return {
          title: "Siklus Diurnal Kecepatan Angin",
          desc: "Rata-rata fluktuasi kecepatan angin diurnal akibat pemanasan permukaan",
          unit: "m/s",
          icon: <Wind className="h-5 w-5 text-emerald-500" />,
          color: "#10b981",
          data: data.map(d => d.windSpeed),
        };
      case "rain":
        return {
          title: "Klimatologi Diurnal Curah Hujan",
          desc: "Pola rata-rata akumulasi curah hujan per jam untuk mengamati tren konveksi diurnal",
          unit: "mm",
          icon: <CloudRain className="h-5 w-5 text-purple-500" />,
          color: "#8b5cf6",
          data: data.map(d => d.rain),
        };
    }
  }, [activeTab, data]);

  const option = useMemo(() => {
    if (data.length === 0) return {};

    const isRain = activeTab === "rain";

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
        bottom: 35,
        left: 55,
        containLabel: true,
      },
      xAxis: {
        type: "category",
        data: xData,
        boundaryGap: isRain,
        axisLine: { lineStyle: { color: gridColor } },
        axisLabel: { color: textColor, fontSize: 11, interval: 1 },
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
      series: [
        isRain
          ? {
              name: activeInfo.title,
              type: "bar",
              data: activeInfo.data,
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
            }
          : {
              name: activeInfo.title,
              type: "line",
              data: activeInfo.data,
              smooth: true,
              showSymbol: true,
              symbolSize: 6,
              itemStyle: { color: activeInfo.color },
              lineStyle: { width: 3, color: activeInfo.color },
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
  }, [data, xData, activeTab, activeInfo, textColor, gridColor, isDarkMode]);

  return (
    <Card className="border-none shadow-sm dark:bg-slate-900 bg-white">
      <CardHeader className="flex flex-col md:flex-row md:items-center justify-between pb-4 gap-4">
        <div className="space-y-1">
          <CardTitle className="text-lg font-bold flex items-center gap-2">
            <Clock className="h-5 w-5 text-indigo-500" /> {activeInfo.title}
          </CardTitle>
          <CardDescription>{activeInfo.desc}</CardDescription>
        </div>

        {/* Parameter selectors */}
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
          <button
            onClick={() => setActiveTab("rain")}
            className={`px-3 py-1.5 font-semibold rounded-md transition-all duration-200 ${
              activeTab === "rain" ? "bg-white dark:bg-slate-800 text-purple-600 dark:text-purple-400 shadow-sm" : "text-slate-500 hover:text-slate-800"
            }`}
          >
            Hujan
          </button>
        </div>
      </CardHeader>
      
      <CardContent className="p-2">
        {data.length > 0 && (
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
