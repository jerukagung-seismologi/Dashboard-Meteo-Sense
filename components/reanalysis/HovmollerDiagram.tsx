// components/reanalysis/HovmollerDiagram.tsx
"use client";

import React, { useState, useMemo } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Layers, Thermometer, Droplets, Gauge, CloudRain } from "lucide-react";
import dynamic from "next/dynamic";

const ReactECharts = dynamic(() => import("echarts-for-react"), {
  ssr: false,
  loading: () => (
    <div className="h-[380px] w-full flex items-center justify-center text-muted-foreground animate-pulse bg-slate-50 dark:bg-slate-900 rounded-lg border">
      Membuat diagram Hovmöller...
    </div>
  ),
});

interface HovmollerDiagramProps {
  days: string[]; // YYYY-MM-DD
  hours: string[]; // "00" to "23"
  temperature: (number | null)[][]; // [hourIdx][dayIdx]
  humidity: (number | null)[][];
  pressure: (number | null)[][];
  rain: (number | null)[][];
  isDarkMode: boolean;
}

export const HovmollerDiagram: React.FC<HovmollerDiagramProps> = ({
  days,
  hours,
  temperature,
  humidity,
  pressure,
  rain,
  isDarkMode,
}) => {
  const [activeTab, setActiveTab] = useState<"temperature" | "humidity" | "pressure" | "rain">("temperature");

  const textColor = isDarkMode ? "#cbd5e1" : "#475569";
  const gridColor = isDarkMode ? "rgba(71, 85, 105, 0.2)" : "rgba(203, 213, 225, 0.25)";

  // Format YYYY-MM-DD to cleaner display strings (e.g. DD/MM) for X axis ticks
  const formattedDays = useMemo(() => {
    return days.map(d => {
      const parts = d.split("-");
      if (parts.length === 3) return `${parts[2]}/${parts[1]}`;
      return d;
    });
  }, [days]);

  const activeInfo = useMemo(() => {
    const colorscales = {
      temperature: ["#313695", "#4575b4", "#74add1", "#abd9e9", "#e0f3f8", "#ffffbf", "#fee090", "#fdae61", "#f46d43", "#d73027", "#a50026"],
      humidity: ["#eff6ff", "#bfdbfe", "#60a5fa", "#2563eb", "#1e3a8a"],
      pressure: ["#440154", "#414487", "#2a788e", "#22a884", "#7ad151", "#fde725"],
      rain: ["#30123b", "#4454c4", "#4490f5", "#1fced4", "#40f88a", "#a2fc3c", "#e5d321", "#f77f11", "#d82b0b"],
    };

    switch (activeTab) {
      case "temperature":
        return {
          title: "Hovmöller Suhu Udara",
          desc: "Fluktuasi suhu udara diurnal sepanjang tahun (Hari vs Jam WIB)",
          unit: "°C",
          icon: <Thermometer className="h-5 w-5 text-orange-500" />,
          z: temperature,
          colors: colorscales.temperature,
        };
      case "humidity":
        return {
          title: "Hovmöller Kelembaban",
          desc: "Fluktuasi kelembaban relatif diurnal sepanjang tahun (Hari vs Jam WIB)",
          unit: "%",
          icon: <Droplets className="h-5 w-5 text-blue-500" />,
          z: humidity,
          colors: colorscales.humidity,
        };
      case "pressure":
        return {
          title: "Hovmöller Tekanan MSL",
          desc: "Fluktuasi tekanan permukaan laut diurnal sepanjang tahun (Hari vs Jam WIB)",
          unit: "hPa",
          icon: <Gauge className="h-5 w-5 text-pink-500" />,
          z: pressure,
          colors: colorscales.pressure,
        };
      case "rain":
        return {
          title: "Hovmöller Curah Hujan",
          desc: "Intensitas laju curah hujan diurnal sepanjang tahun (Hari vs Jam WIB)",
          unit: "mm",
          icon: <CloudRain className="h-5 w-5 text-purple-500" />,
          z: rain,
          colors: colorscales.rain,
        };
    }
  }, [activeTab, temperature, humidity, pressure, rain]);

  // Format matrix data [dayIdx, hourIdx, value]
  const { chartData, zmin, zmax } = useMemo(() => {
    if (!activeInfo.z || activeInfo.z.length === 0 || !days || days.length === 0) {
      return { chartData: [], zmin: 0, zmax: 100 };
    }

    const flatVals: number[] = [];
    const formatted: [number, number, number | null][] = [];

    // activeInfo.z is [hourIdx][dayIdx]
    activeInfo.z.forEach((row, hourIdx) => {
      row.forEach((val, dayIdx) => {
        if (val !== null && Number.isFinite(val)) {
          flatVals.push(val);
          formatted.push([dayIdx, hourIdx, Number(val.toFixed(2))]);
        } else {
          formatted.push([dayIdx, hourIdx, null]);
        }
      });
    });

    const min = flatVals.length > 0 ? Math.floor(Math.min(...flatVals)) : 0;
    const max = flatVals.length > 0 ? Math.ceil(Math.max(...flatVals)) : 100;

    return { chartData: formatted, zmin: min, zmax: max };
  }, [activeInfo.z, days]);

  const option = useMemo(() => {
    if (chartData.length === 0) return {};

    return {
      backgroundColor: "transparent",
      tooltip: {
        position: "top",
        backgroundColor: isDarkMode ? "rgba(15, 23, 42, 0.95)" : "rgba(255, 255, 255, 0.95)",
        borderColor: isDarkMode ? "#334155" : "#e2e8f0",
        textStyle: { color: isDarkMode ? "#f8fafc" : "#0f172a", fontSize: 12 },
        formatter: (params: any) => {
          const day = days[params.value[0]];
          const hour = hours[params.value[1]];
          const val = params.value[2];
          return `
            <div style="font-size:12px;font-family:Inter,sans-serif;">
              <div style="color:${isDarkMode ? '#94a3b8' : '#64748b'};margin-bottom:2px;">Tanggal: ${day} | Jam: ${hour}:00 WIB</div>
              <div style="font-weight:600;color:${isDarkMode ? '#f8fafc' : '#0f172a'};">
                ${activeInfo.title}: ${val !== null ? `${val} ${activeInfo.unit}` : "Tidak Ada Data"}
              </div>
            </div>
          `;
        },
      },
      grid: {
        top: 20,
        right: 20,
        bottom: 60,
        left: 55,
        containLabel: true,
      },
      xAxis: {
        type: "category",
        data: formattedDays,
        name: "Tanggal",
        splitArea: { show: false },
        axisLine: { lineStyle: { color: gridColor } },
        axisLabel: { color: textColor, fontSize: 10, hideOverlap: true },
      },
      yAxis: {
        type: "category",
        data: hours.map(h => `${h}:00`),
        name: "Jam (WIB)",
        inverse: true, // Hour 00 at top
        splitArea: { show: false },
        axisLine: { lineStyle: { color: gridColor } },
        axisLabel: { color: textColor, fontSize: 10 },
      },
      visualMap: {
        min: zmin,
        max: zmax,
        calculable: true,
        orient: "horizontal",
        left: "center",
        bottom: 5,
        inRange: { color: activeInfo.colors },
        textStyle: { color: textColor, fontSize: 10 },
      },
      dataZoom: [
        { type: "inside", xAxisIndex: 0 },
        {
          type: "slider",
          xAxisIndex: 0,
          bottom: 30,
          height: 16,
          borderColor: "transparent",
          backgroundColor: isDarkMode ? "rgba(30, 41, 59, 0.5)" : "rgba(241, 245, 249, 0.8)",
          fillerColor: "rgba(99, 102, 241, 0.2)",
          handleStyle: { color: "#6366f1" },
          textStyle: { color: textColor, fontSize: 9 },
        },
      ],
      series: [
        {
          name: activeInfo.title,
          type: "heatmap",
          data: chartData,
          emphasis: {
            itemStyle: {
              shadowBlur: 10,
              shadowColor: "rgba(0, 0, 0, 0.5)",
            },
          },
        },
      ],
    };
  }, [chartData, zmin, zmax, activeInfo, days, hours, formattedDays, textColor, gridColor, isDarkMode]);

  return (
    <Card className="border-none shadow-sm dark:bg-slate-900 bg-white">
      <CardHeader className="flex flex-col md:flex-row md:items-center justify-between pb-4 gap-4">
        <div className="space-y-1">
          <CardTitle className="text-lg font-bold flex items-center gap-2">
            <Layers className="h-5 w-5 text-indigo-500" /> {activeInfo.title}
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
      
      <CardContent className="p-2 overflow-x-auto">
        {days.length > 0 && (
          <div className="min-w-[700px] w-full h-[380px]">
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
