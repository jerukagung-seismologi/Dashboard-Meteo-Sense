// components/climatology/HeatmapAnalysis.tsx
"use client";

import React, { useState, useMemo } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Thermometer, Droplets, Gauge } from "lucide-react";
import { HeatmapData } from "@/lib/climatology/analysisTypes";
import dynamic from "next/dynamic";

const ReactECharts = dynamic(() => import("echarts-for-react"), {
  ssr: false,
  loading: () => (
    <div className="h-[320px] w-full flex items-center justify-center text-muted-foreground animate-pulse bg-slate-50 dark:bg-slate-900 rounded-lg border">
      Membuat visualisasi heatmap mingguan...
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

export const HeatmapAnalysis: React.FC<HeatmapAnalysisProps> = ({
  heatmaps,
  isDarkMode,
}) => {
  const [activeParam, setActiveParam] = useState<"temperature" | "humidity" | "pressure">("temperature");

  const textColor = isDarkMode ? "#cbd5e1" : "#475569";
  const gridColor = isDarkMode ? "rgba(71, 85, 105, 0.2)" : "rgba(203, 213, 225, 0.25)";

  const labels = {
    temperature: {
      title: "Heatmap Suhu Udara",
      desc: "Pola distribusi suhu udara mingguan (Hari vs Jam WIB)",
      unit: "°C",
      icon: <Thermometer className="h-5 w-5 text-orange-500" />,
      colors: ["#313695", "#4575b4", "#74add1", "#abd9e9", "#e0f3f8", "#ffffbf", "#fee090", "#fdae61", "#f46d43", "#d73027", "#a50026"],
    },
    humidity: {
      title: "Heatmap Kelembaban Relatif",
      desc: "Pola distribusi kelembaban relatif mingguan (Hari vs Jam WIB)",
      unit: "%",
      icon: <Droplets className="h-5 w-5 text-blue-500" />,
      colors: ["#eff6ff", "#bfdbfe", "#60a5fa", "#2563eb", "#1e3a8a"],
    },
    pressure: {
      title: "Heatmap Tekanan Udara",
      desc: "Pola distribusi tekanan udara mingguan (Hari vs Jam WIB)",
      unit: "hPa",
      icon: <Gauge className="h-5 w-5 text-pink-500" />,
      colors: ["#440154", "#414487", "#2a788e", "#22a884", "#7ad151", "#fde725"],
    },
  };

  const currentHeatmapData = useMemo(() => {
    return heatmaps?.[activeParam];
  }, [heatmaps, activeParam]);

  // Format YYYY-MM-DD to DD/MM labels for Y-axis
  const dayLabels = useMemo(() => {
    if (!currentHeatmapData?.days) return [];
    return currentHeatmapData.days.map((d) => {
      const parts = d.split("-");
      if (parts.length === 3) return `${parts[2]}/${parts[1]}`;
      return d;
    });
  }, [currentHeatmapData]);

  const hoursData = useMemo(() => {
    return currentHeatmapData?.hours || Array.from({ length: 24 }, (_, i) => String(i).padStart(2, "0"));
  }, [currentHeatmapData]);

  // Format matrix data into [hourIdx, dayIdx, value]
  const { chartData, zmin, zmax } = useMemo(() => {
    if (!currentHeatmapData || !currentHeatmapData.z || currentHeatmapData.z.length === 0) {
      return { chartData: [], zmin: 0, zmax: 100 };
    }

    const dataPoints: [number, number, number | null][] = [];
    const flatVals: number[] = [];

    // currentHeatmapData.z is typically [dayIdx][hourIdx]
    currentHeatmapData.z.forEach((row, dayIdx) => {
      row.forEach((val, hourIdx) => {
        if (val !== null && Number.isFinite(val)) {
          flatVals.push(val);
          dataPoints.push([hourIdx, dayIdx, Number(val.toFixed(1))]);
        } else {
          dataPoints.push([hourIdx, dayIdx, null]);
        }
      });
    });

    const min = flatVals.length > 0 ? Math.floor(Math.min(...flatVals)) : 0;
    const max = flatVals.length > 0 ? Math.ceil(Math.max(...flatVals)) : 100;

    return { chartData: dataPoints, zmin: min, zmax: max };
  }, [currentHeatmapData]);

  const option = useMemo(() => {
    if (chartData.length === 0) return {};
    const info = labels[activeParam];

    return {
      backgroundColor: "transparent",
      tooltip: {
        position: "top",
        backgroundColor: isDarkMode ? "rgba(15, 23, 42, 0.95)" : "rgba(255, 255, 255, 0.95)",
        borderColor: isDarkMode ? "#334155" : "#e2e8f0",
        textStyle: { color: isDarkMode ? "#f8fafc" : "#0f172a", fontSize: 12 },
        formatter: (params: any) => {
          const hour = hoursData[params.value[0]];
          const day = dayLabels[params.value[1]];
          const val = params.value[2];
          return `
            <div style="font-size:12px;font-family:Inter,sans-serif;">
              <div style="color:${isDarkMode ? '#94a3b8' : '#64748b'};margin-bottom:2px;">Hari: ${day} | Jam: ${hour}:00 WIB</div>
              <div style="font-weight:600;color:${isDarkMode ? '#f8fafc' : '#0f172a'};">
                ${info.title}: ${val !== null ? `${val} ${info.unit}` : "Tidak Ada Data"}
              </div>
            </div>
          `;
        },
      },
      grid: {
        top: 20,
        right: 20,
        bottom: 55,
        left: 55,
        containLabel: true,
      },
      xAxis: {
        type: "category",
        data: hoursData.map(h => `${h}:00`),
        splitArea: { show: true },
        axisLine: { lineStyle: { color: gridColor } },
        axisLabel: { color: textColor, fontSize: 10, interval: 1 },
      },
      yAxis: {
        type: "category",
        data: dayLabels,
        splitArea: { show: true },
        axisLine: { lineStyle: { color: gridColor } },
        axisLabel: { color: textColor, fontSize: 11 },
      },
      visualMap: {
        min: zmin,
        max: zmax,
        calculable: true,
        orient: "horizontal",
        left: "center",
        bottom: 5,
        inRange: { color: info.colors },
        textStyle: { color: textColor, fontSize: 10 },
      },
      series: [
        {
          name: info.title,
          type: "heatmap",
          data: chartData,
          label: {
            show: true,
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
  }, [chartData, zmin, zmax, activeParam, dayLabels, hoursData, textColor, gridColor, isDarkMode]);

  const activeInfo = labels[activeParam];

  return (
    <Card className="border-none shadow-sm dark:bg-slate-900 bg-white">
      <CardHeader className="flex flex-col md:flex-row md:items-center justify-between pb-4 gap-4">
        <div className="space-y-1">
          <CardTitle className="text-lg font-bold flex items-center gap-2">
            {activeInfo.icon} {activeInfo.title}
          </CardTitle>
          <CardDescription>{activeInfo.desc}</CardDescription>
        </div>

        {/* Tab Buttons */}
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
        {currentHeatmapData && currentHeatmapData.z && currentHeatmapData.z.length > 0 ? (
          <div className="min-w-[650px] w-full h-[320px]">
            <ReactECharts
              option={option}
              style={{ width: "100%", height: "100%" }}
              opts={{ renderer: "canvas" }}
              notMerge={true}
            />
          </div>
        ) : (
          <div className="h-[280px] flex items-center justify-center text-sm text-slate-400 dark:text-slate-500">
            Tidak ada data heatmap yang tersedia
          </div>
        )}
      </CardContent>
    </Card>
  );
};
