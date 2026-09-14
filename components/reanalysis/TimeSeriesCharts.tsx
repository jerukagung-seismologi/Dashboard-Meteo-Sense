// components/reanalysis/TimeSeriesCharts.tsx
"use client";

import React, { useState, useMemo } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Thermometer, Droplets, Gauge, Wind, CloudRain, Sun, Download } from "lucide-react";
import dynamic from "next/dynamic";

const ReactECharts = dynamic(() => import("echarts-for-react"), {
  ssr: false,
  loading: () => (
    <div className="h-[400px] w-full flex items-center justify-center text-muted-foreground animate-pulse bg-slate-50 dark:bg-slate-900 rounded-lg border">
      Membuat grafik deret waktu...
    </div>
  ),
});

interface TimeSeriesChartsProps {
  times: string[];
  temperature: number[];
  humidity: number[];
  pressure: number[];
  rain: number[];
  windSpeed: number[];
  windGust: number[];
  radiation: number[];
  isDarkMode: boolean;
}

export const TimeSeriesCharts: React.FC<TimeSeriesChartsProps> = ({
  times,
  temperature,
  humidity,
  pressure,
  rain,
  windSpeed,
  windGust,
  radiation,
  isDarkMode,
}) => {
  const [activeTab, setActiveTab] = useState<"temperature" | "humidity" | "pressure" | "wind" | "rain" | "radiation">("temperature");

  const textColor = isDarkMode ? "#cbd5e1" : "#475569";
  const gridColor = isDarkMode ? "rgba(71, 85, 105, 0.2)" : "rgba(203, 213, 225, 0.25)";

  const activeInfo = useMemo(() => {
    switch (activeTab) {
      case "temperature":
        return {
          title: "Suhu Udara (2m)",
          desc: "Fluktuasi suhu udara hasil reanalisis ERA5",
          unit: "°C",
          icon: <Thermometer className="h-5 w-5 text-orange-500" />,
          color: "#ef4444",
        };
      case "humidity":
        return {
          title: "Kelembaban Relatif (2m)",
          desc: "Persentase uap air di udara relatif terhadap saturasi",
          unit: "%",
          icon: <Droplets className="h-5 w-5 text-blue-500" />,
          color: "#3b82f6",
        };
      case "pressure":
        return {
          title: "Tekanan Permukaan Laut (MSL)",
          desc: "Tekanan udara yang disesuaikan dengan permukaan laut rata-rata",
          unit: "hPa",
          icon: <Gauge className="h-5 w-5 text-pink-500" />,
          color: "#ec4899",
        };
      case "wind":
        return {
          title: "Kecepatan & Hembusan Angin",
          desc: "Kecepatan angin rata-rata (10m) beserta hembusan maksimum (gust)",
          unit: "m/s",
          icon: <Wind className="h-5 w-5 text-emerald-500" />,
          color: "#10b981",
        };
      case "rain":
        return {
          title: "Curah Hujan Per Jam",
          desc: "Laju presipitasi curah hujan per jam",
          unit: "mm",
          icon: <CloudRain className="h-5 w-5 text-purple-500" />,
          color: "#8b5cf6",
        };
      case "radiation":
        return {
          title: "Radiasi Gelombang Pendek",
          desc: "Energi radiasi matahari gelombang pendek yang diterima di permukaan bumi",
          unit: "W/m²",
          icon: <Sun className="h-5 w-5 text-amber-500" />,
          color: "#f59e0b",
        };
    }
  }, [activeTab]);

  const option = useMemo(() => {
    if (times.length === 0) return {};

    let series: any[] = [];
    let yMin: number | undefined = undefined;
    let yMax: number | undefined = undefined;

    if (activeTab === "temperature") {
      series = [
        {
          name: "Suhu Udara",
          type: "line",
          data: temperature,
          smooth: true,
          showSymbol: times.length < 50,
          itemStyle: { color: "#ef4444" },
          lineStyle: { width: 2.5, color: "#ef4444" },
          areaStyle: {
            color: {
              type: "linear",
              x: 0,
              y: 0,
              x2: 0,
              y2: 1,
              colorStops: [
                { offset: 0, color: "rgba(239, 68, 68, 0.2)" },
                { offset: 1, color: "rgba(239, 68, 68, 0.0)" },
              ],
            },
          },
        },
      ];
    } else if (activeTab === "humidity") {
      yMin = 0;
      yMax = 100;
      series = [
        {
          name: "Kelembaban",
          type: "line",
          data: humidity,
          smooth: true,
          showSymbol: times.length < 50,
          itemStyle: { color: "#3b82f6" },
          lineStyle: { width: 2.5, color: "#3b82f6" },
          areaStyle: {
            color: {
              type: "linear",
              x: 0,
              y: 0,
              x2: 0,
              y2: 1,
              colorStops: [
                { offset: 0, color: "rgba(59, 130, 246, 0.2)" },
                { offset: 1, color: "rgba(59, 130, 246, 0.0)" },
              ],
            },
          },
        },
      ];
    } else if (activeTab === "pressure") {
      series = [
        {
          name: "Tekanan MSL",
          type: "line",
          data: pressure,
          smooth: true,
          showSymbol: times.length < 50,
          itemStyle: { color: "#ec4899" },
          lineStyle: { width: 2.5, color: "#ec4899" },
          areaStyle: {
            color: {
              type: "linear",
              x: 0,
              y: 0,
              x2: 0,
              y2: 1,
              colorStops: [
                { offset: 0, color: "rgba(236, 72, 153, 0.15)" },
                { offset: 1, color: "rgba(236, 72, 153, 0.0)" },
              ],
            },
          },
        },
      ];
    } else if (activeTab === "wind") {
      series = [
        {
          name: "Kecepatan Rata-rata",
          type: "line",
          data: windSpeed,
          smooth: true,
          showSymbol: times.length < 50,
          itemStyle: { color: "#10b981" },
          lineStyle: { width: 2.5, color: "#10b981" },
        },
        {
          name: "Hembusan Angin (Gust)",
          type: "line",
          data: windGust,
          smooth: true,
          showSymbol: times.length < 50,
          itemStyle: { color: "#f59e0b" },
          lineStyle: { width: 1.5, type: "dashed", color: "#f59e0b" },
        },
      ];
    } else if (activeTab === "rain") {
      yMin = 0;
      series = [
        {
          name: "Curah Hujan",
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
            borderRadius: [3, 3, 0, 0],
          },
        },
      ];
    } else if (activeTab === "radiation") {
      yMin = 0;
      series = [
        {
          name: "Shortwave Rad",
          type: "line",
          data: radiation,
          smooth: true,
          showSymbol: times.length < 50,
          itemStyle: { color: "#f59e0b" },
          lineStyle: { width: 2, color: "#f59e0b" },
          areaStyle: {
            color: {
              type: "linear",
              x: 0,
              y: 0,
              x2: 0,
              y2: 1,
              colorStops: [
                { offset: 0, color: "rgba(245, 158, 11, 0.25)" },
                { offset: 1, color: "rgba(245, 158, 11, 0.0)" },
              ],
            },
          },
        },
      ];
    }

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
      legend: {
        top: 0,
        right: 10,
        textStyle: { color: textColor, fontSize: 11 },
      },
      grid: {
        top: 35,
        right: 20,
        bottom: 55,
        left: 55,
        containLabel: true,
      },
      xAxis: {
        type: "category",
        data: times,
        boundaryGap: activeTab === "rain",
        axisLine: { lineStyle: { color: gridColor } },
        axisLabel: { color: textColor, fontSize: 11, hideOverlap: true },
        splitLine: { show: false },
      },
      yAxis: {
        type: "value",
        min: yMin,
        max: yMax,
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
      series,
    };
  }, [times, activeTab, temperature, humidity, pressure, windSpeed, windGust, rain, radiation, activeInfo, textColor, gridColor, isDarkMode]);

  const handleDownloadCsv = () => {
    const headers = ["Waktu", activeInfo.title + ` (${activeInfo.unit})`];
    let valuesArray: number[] = [];

    switch (activeTab) {
      case "temperature": valuesArray = temperature; break;
      case "humidity": valuesArray = humidity; break;
      case "pressure": valuesArray = pressure; break;
      case "wind": valuesArray = windSpeed; break;
      case "rain": valuesArray = rain; break;
      case "radiation": valuesArray = radiation; break;
    }

    const rows = times.map((t, idx) => `"${t}",${valuesArray[idx]?.toFixed(2) || 0}`);
    const csvContent = [headers.join(","), ...rows].join("\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `era5_${activeTab}_series.csv`);
    link.click();
    URL.revokeObjectURL(url);
  };

  return (
    <Card className="border-none shadow-sm dark:bg-slate-900 bg-white">
      <CardHeader className="flex flex-col md:flex-row md:items-center justify-between pb-4 gap-4">
        <div className="space-y-1">
          <CardTitle className="text-lg font-bold flex items-center gap-2">
            {activeInfo.icon} {activeInfo.title}
          </CardTitle>
          <CardDescription>{activeInfo.desc}</CardDescription>
        </div>

        <div className="flex flex-wrap gap-2 items-center">
          {/* Parameter tab selectors */}
          <div className="flex border rounded-lg p-1 bg-slate-50 dark:bg-slate-950 dark:border-slate-800 text-xs">
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
            <button
              onClick={() => setActiveTab("radiation")}
              className={`px-3 py-1.5 font-semibold rounded-md transition-all duration-200 ${
                activeTab === "radiation" ? "bg-white dark:bg-slate-800 text-amber-600 dark:text-amber-400 shadow-sm" : "text-slate-500 hover:text-slate-800"
              }`}
            >
              Radiasi
            </button>
          </div>

          <Button
            variant="outline"
            size="sm"
            onClick={handleDownloadCsv}
            className="text-xs text-slate-600 dark:text-slate-300 gap-1 border-slate-200 hover:bg-slate-50 dark:border-slate-800 dark:hover:bg-slate-800"
          >
            <Download className="h-3.5 w-3.5" /> CSV
          </Button>
        </div>
      </CardHeader>
      
      <CardContent className="p-2">
        {times.length > 0 && (
          <div className="w-full h-[400px]">
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
