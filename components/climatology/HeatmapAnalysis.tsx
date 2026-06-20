// components/climatology/HeatmapAnalysis.tsx
import React, { useState, useMemo } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Thermometer, Droplets, Gauge } from "lucide-react";
import { HeatmapData } from "@/lib/climatology/analysisTypes";
import dynamic from "next/dynamic";

const ReactECharts = dynamic(() => import("echarts-for-react"), {
  ssr: false,
  loading: () => (
    <div className="h-[450px] w-full flex items-center justify-center text-muted-foreground animate-pulse bg-slate-50 dark:bg-slate-900 rounded-lg border">
      Membuat visualisasi heatmap 2D...
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

  const chartTheme = isDarkMode ? "dark" : "light";
  const textColor = isDarkMode ? "#cbd5e1" : "#475569";
  const gridColor = isDarkMode ? "rgba(71, 85, 105, 0.2)" : "rgba(203, 213, 225, 0.2)";

  // Color mapping definitions
  const colorPalettes = {
    temperature: [
      "#313695", "#4575b4", "#74add1", "#abd9e9", "#e0f3f8",
      "#ffffbf", "#fee090", "#fdae61", "#f46d43", "#d73027", "#a50026"
    ], // Coolwarm
    humidity: ["#eff6ff", "#bfdbfe", "#60a5fa", "#2563eb", "#1e3a8a"], // Blues
    pressure: ["#440154", "#414487", "#2a788e", "#22a884", "#7ad151", "#fde725"], // Viridis
  };

  const labels = {
    temperature: {
      title: "Heatmap Suhu Udara",
      desc: "Distribusi suhu udara 2D (Hari vs Waktu WIB)",
      unit: "°C",
      icon: <Thermometer className="h-5 w-5 text-orange-500" />,
    },
    humidity: {
      title: "Heatmap Kelembaban Relatif",
      desc: "Distribusi kelembaban relatif 2D (Hari vs Waktu WIB)",
      unit: "%",
      icon: <Droplets className="h-5 w-5 text-blue-500" />,
    },
    pressure: {
      title: "Heatmap Tekanan Udara",
      desc: "Distribusi tekanan udara 2D (Hari vs Waktu WIB)",
      unit: "hPa",
      icon: <Gauge className="h-5 w-5 text-pink-500" />,
    },
  };

  const option = useMemo(() => {
    const data = heatmaps[activeParam];
    if (!data || !data.days || !data.slots || data.matrix.length === 0) return {};

    // Calculate min/max for visualMap scale
    const values = data.matrix.map((item) => item[2]);
    const minVal = values.length > 0 ? Math.min(...values) : 0;
    const maxVal = values.length > 0 ? Math.max(...values) : 100;

    // Convert slot labels to clean WIB formatted strings
    // Format original dates to more friendly labels (e.g. 2026-06-20 -> 20/06)
    const formattedDays = data.days.map((d) => {
      const parts = d.split("-");
      if (parts.length === 3) {
        return `${parts[2]}/${parts[1]}`;
      }
      return d;
    });

    return {
      tooltip: {
        position: "top",
        formatter: (params: any) => {
          const [dayIdx, slotIdx, val] = params.value;
          const originalDay = data.days[dayIdx];
          const slotTime = data.slots[slotIdx];
          
          // Format date for display
          let displayDate = originalDay;
          try {
            const dateObj = new Date(originalDay);
            displayDate = dateObj.toLocaleDateString("id-ID", {
              weekday: "long",
              day: "numeric",
              month: "long",
              year: "numeric",
            });
          } catch (e) {}

          return `<div class="p-1 text-slate-800 dark:text-slate-100 text-xs leading-normal">
            <div class="font-bold border-b pb-1 mb-1 border-slate-200 dark:border-slate-700">${displayDate}</div>
            <div class="flex justify-between gap-4 mt-1">
              <span>Waktu:</span>
              <span class="font-semibold">${slotTime} WIB</span>
            </div>
            <div class="flex justify-between gap-4">
              <span>Nilai:</span>
              <span class="font-bold text-indigo-600 dark:text-indigo-400">${val} ${labels[activeParam].unit}</span>
            </div>
          </div>`;
        },
      },
      grid: {
        left: "3%",
        right: "10%",
        top: "5%",
        bottom: "15%",
        containLabel: true,
      },
      xAxis: {
        type: "category",
        data: formattedDays,
        splitArea: { show: true },
        axisLabel: { color: textColor },
        axisLine: { lineStyle: { color: gridColor } },
      },
      yAxis: {
        type: "category",
        data: data.slots,
        splitArea: { show: true },
        axisLabel: {
          color: textColor,
          // Only show labels every few ticks if there are too many slots
          interval: Math.max(0, Math.floor(data.slots.length / 12)),
        },
        axisLine: { lineStyle: { color: gridColor } },
      },
      visualMap: {
        min: minVal,
        max: maxVal,
        calculable: true,
        orient: "vertical",
        right: "1%",
        top: "center",
        inRange: { color: colorPalettes[activeParam] },
        textStyle: { color: textColor },
      },
      series: [
        {
          name: labels[activeParam].title,
          type: "heatmap",
          data: data.matrix,
          label: { show: false },
          emphasis: {
            itemStyle: {
              shadowBlur: 10,
              shadowColor: "rgba(0, 0, 0, 0.5)",
            },
          },
        },
      ],
    };
  }, [heatmaps, activeParam, textColor, gridColor]);

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

      <CardContent className="h-[450px] p-2">
        {heatmaps[activeParam] && heatmaps[activeParam].matrix.length > 0 ? (
          <ReactECharts
            option={option}
            style={{ height: "100%", width: "100%" }}
            theme={chartTheme}
          />
        ) : (
          <div className="h-full flex items-center justify-center text-sm text-slate-400 dark:text-slate-500">
            Tidak ada data heatmap yang tersedia
          </div>
        )}
      </CardContent>
    </Card>
  );
};
