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
    <div className="h-[400px] w-full flex items-center justify-center text-muted-foreground animate-pulse bg-slate-50 dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800">
      Membuat grafik deret waktu...
    </div>
  ),
});

interface DataItem {
  name: string;
  value: [string, number]; // [timeIso, val]
}

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
  const gridColor = isDarkMode ? "rgba(71, 85, 105, 0.2)" : "rgba(203, 213, 225, 0.2)";
  const tooltipBg = isDarkMode ? "rgba(15, 23, 42, 0.95)" : "rgba(255, 255, 255, 0.96)";
  const tooltipBorder = isDarkMode ? "#334155" : "#cbd5e1";

  const activeInfo = useMemo(() => {
    switch (activeTab) {
      case "temperature":
        return {
          title: "Suhu Udara (2m)",
          desc: "Fluktuasi suhu udara hasil reanalisis ERA5",
          unit: "°C",
          icon: <Thermometer className="h-5 w-5 text-orange-500" />,
          series: [
            {
              name: "Suhu Udara",
              type: "line",
              smooth: true,
              showSymbol: false,
              lineStyle: { width: 2.6, color: "#ef4444" },
              itemStyle: { color: "#ef4444" },
              data: times.map((t, idx) => ({ name: t, value: [t, temperature[idx] ?? 0] })),
            },
          ],
        };
      case "humidity":
        return {
          title: "Kelembaban Relatif (2m)",
          desc: "Persentase uap air di udara relatif terhadap saturasi",
          unit: "%",
          icon: <Droplets className="h-5 w-5 text-blue-500" />,
          series: [
            {
              name: "Kelembaban",
              type: "line",
              smooth: true,
              showSymbol: false,
              lineStyle: { width: 2.6, color: "#3b82f6" },
              itemStyle: { color: "#3b82f6" },
              data: times.map((t, idx) => ({ name: t, value: [t, humidity[idx] ?? 0] })),
            },
          ],
        };
      case "pressure":
        return {
          title: "Tekanan Permukaan Laut (MSL)",
          desc: "Tekanan udara yang disesuaikan dengan permukaan laut rata-rata",
          unit: "hPa",
          icon: <Gauge className="h-5 w-5 text-pink-500" />,
          series: [
            {
              name: "Tekanan MSL",
              type: "line",
              smooth: true,
              showSymbol: false,
              lineStyle: { width: 2.6, color: "#ec4899" },
              itemStyle: { color: "#ec4899" },
              data: times.map((t, idx) => ({ name: t, value: [t, pressure[idx] ?? 0] })),
            },
          ],
        };
      case "wind":
        return {
          title: "Kecepatan & Hembusan Angin",
          desc: "Kecepatan angin rata-rata (10m) beserta hembusan maksimum (gust)",
          unit: "m/s",
          icon: <Wind className="h-5 w-5 text-emerald-500" />,
          series: [
            {
              name: "Kecepatan Rata-rata",
              type: "line",
              smooth: true,
              showSymbol: false,
              lineStyle: { width: 2.6, color: "#10b981" },
              itemStyle: { color: "#10b981" },
              data: times.map((t, idx) => ({ name: t, value: [t, windSpeed[idx] ?? 0] })),
            },
            {
              name: "Hembusan Angin (Gust)",
              type: "line",
              smooth: true,
              showSymbol: false,
              lineStyle: { width: 1.8, type: "dashed", color: "#f59e0b" },
              itemStyle: { color: "#f59e0b" },
              data: times.map((t, idx) => ({ name: t, value: [t, windGust[idx] ?? 0] })),
            },
          ],
        };
      case "rain":
        return {
          title: "Curah Hujan Per Jam",
          desc: "Laju presipitasi curah hujan per jam",
          unit: "mm",
          icon: <CloudRain className="h-5 w-5 text-purple-500" />,
          series: [
            {
              name: "Curah Hujan",
              type: "bar",
              itemStyle: { color: "#8b5cf6" },
              data: times.map((t, idx) => ({ name: t, value: [t, rain[idx] ?? 0] })),
            },
          ],
        };
      case "radiation":
        return {
          title: "Radiasi Gelombang Pendek",
          desc: "Energi radiasi matahari gelombang pendek yang diterima di permukaan bumi",
          unit: "W/m²",
          icon: <Sun className="h-5 w-5 text-amber-500" />,
          series: [
            {
              name: "Shortwave Rad",
              type: "line",
              smooth: true,
              showSymbol: false,
              lineStyle: { width: 2, color: "#f59e0b" },
              itemStyle: { color: "#f59e0b" },
              areaStyle: {
                color: {
                  type: "linear",
                  x: 0,
                  y: 0,
                  x2: 0,
                  y2: 1,
                  colorStops: [
                    { offset: 0, color: "rgba(245, 158, 11, 0.35)" },
                    { offset: 1, color: "rgba(245, 158, 11, 0.0)" },
                  ],
                },
              },
              data: times.map((t, idx) => ({ name: t, value: [t, radiation[idx] ?? 0] })),
            },
          ],
        };
    }
  }, [activeTab, times, temperature, humidity, pressure, windSpeed, windGust, rain, radiation]);

  const chartOption = useMemo(() => {
    return {
      backgroundColor: "transparent",
      animation: true,
      animationDuration: 400,
      grid: {
        top: 35,
        right: 25,
        bottom: 50,
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
          const rawTime = first.value[0];
          const date = new Date(rawTime);
          const timeFormatted = !isNaN(date.getTime())
            ? `${String(date.getDate()).padStart(2, "0")}/${String(date.getMonth() + 1).padStart(2, "0")}/${date.getFullYear()} ${String(date.getHours()).padStart(2, "0")}:${String(date.getMinutes()).padStart(2, "0")} WIB`
            : rawTime;

          let html = `
            <div style="font-weight:700; margin-bottom:5px; font-size:11px; opacity:0.85;">
              Waktu: ${timeFormatted}
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
        type: "time",
        splitLine: { show: false },
        axisLine: { lineStyle: { color: gridColor } },
        axisTick: { show: false },
        axisLabel: {
          color: textColor,
          fontSize: 11,
          formatter: "{dd}/{MM} {HH}:{mm}",
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
      dataZoom: [
        {
          type: "inside",
          start: 0,
          end: 100,
        },
        {
          type: "slider",
          start: 0,
          end: 100,
          height: 18,
          bottom: 5,
          borderColor: "transparent",
          backgroundColor: isDarkMode ? "rgba(30, 41, 59, 0.4)" : "rgba(241, 245, 249, 0.8)",
          fillerColor: isDarkMode ? "rgba(99, 102, 241, 0.25)" : "rgba(99, 102, 241, 0.2)",
          handleStyle: {
            color: isDarkMode ? "#818cf8" : "#6366f1",
            borderColor: "transparent",
          },
          textStyle: {
            color: textColor,
            fontSize: 10,
          },
        },
      ],
      series: activeInfo.series,
    };
  }, [activeInfo, textColor, gridColor, tooltipBg, tooltipBorder, isDarkMode]);

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
        {times.length > 0 ? (
          <ReactECharts
            option={chartOption}
            style={{ width: "100%", height: "400px" }}
            notMerge={false}
            lazyUpdate={true}
          />
        ) : (
          <div className="h-[400px] flex items-center justify-center text-muted-foreground border border-dashed rounded-lg">
            Tidak ada data deret waktu yang tersedia
          </div>
        )}
      </CardContent>
    </Card>
  );
};
