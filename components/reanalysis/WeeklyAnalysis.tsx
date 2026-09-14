// components/reanalysis/WeeklyAnalysis.tsx
import React, { useState, useMemo } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { CalendarDays, Thermometer, Droplets, Gauge, Wind } from "lucide-react";
import dynamic from "next/dynamic";

const Plot = dynamic(() => import("react-plotly.js"), {
  ssr: false,
  loading: () => (
    <div className="h-[350px] w-full flex items-center justify-center text-muted-foreground animate-pulse bg-slate-50 dark:bg-slate-900 rounded-lg border">
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

  const activeInfo = useMemo(() => {
    switch (activeTab) {
      case "temperature":
        return {
          title: "Tren Suhu Mingguan",
          desc: "Suhu maksimum, rata-rata, dan minimum harian selama 7 hari terakhir",
          unit: "Suhu (°C)",
          icon: <Thermometer className="h-5 w-5 text-orange-500" />,
          data: temperature,
          colors: { max: "#f87171", mean: "#ef4444", min: "#60a5fa" }
        };
      case "humidity":
        return {
          title: "Tren Kelembaban Mingguan",
          desc: "Kelembaban maksimum, rata-rata, dan minimum harian selama 7 hari terakhir",
          unit: "Kelembaban (%)",
          icon: <Droplets className="h-5 w-5 text-blue-500" />,
          data: humidity,
          colors: { max: "#34d399", mean: "#3b82f6", min: "#f59e0b" }
        };
      case "pressure":
        return {
          title: "Tren Tekanan Mingguan",
          desc: "Tekanan maksimum, rata-rata, dan minimum harian selama 7 hari terakhir",
          unit: "Tekanan MSL (hPa)",
          icon: <Gauge className="h-5 w-5 text-pink-500" />,
          data: pressure,
          colors: { max: "#f43f5e", mean: "#ec4899", min: "#818cf8" }
        };
      case "wind":
        return {
          title: "Tren Kecepatan Angin Mingguan",
          desc: "Kecepatan angin maksimum, rata-rata, dan minimum harian selama 7 hari terakhir",
          unit: "Kecepatan Angin (m/s)",
          icon: <Wind className="h-5 w-5 text-emerald-500" />,
          data: windSpeed,
          colors: { max: "#34d399", mean: "#10b981", min: "#a78bfa" }
        };
    }
  }, [activeTab, temperature, humidity, pressure, windSpeed]);

  const traces = useMemo(() => {
    if (!days || days.length === 0) return [];
    
    return [
      {
        x: days,
        y: activeInfo.data.max,
        name: "Maksimum",
        type: "scatter" as const,
        mode: "lines" as const,
        line: { color: activeInfo.colors.max, width: 2, dash: "dash" as const },
      },
      {
        x: days,
        y: activeInfo.data.mean,
        name: "Rata-rata",
        type: "scatter" as const,
        mode: "lines+markers" as const,
        line: { color: activeInfo.colors.mean, width: 3 },
        marker: { size: 6 }
      },
      {
        x: days,
        y: activeInfo.data.min,
        name: "Minimum",
        type: "scatter" as const,
        mode: "lines" as const,
        line: { color: activeInfo.colors.min, width: 2, dash: "dash" as const },
      }
    ];
  }, [days, activeInfo]);

  const layout = useMemo(() => ({
    autosize: true,
    height: 350,
    margin: { l: 50, r: 20, t: 25, b: 50 },
    paper_bgcolor: "rgba(0,0,0,0)",
    plot_bgcolor: "rgba(0,0,0,0)",
    font: { color: textColor, family: "Inter, sans-serif" },
    xaxis: {
      type: "category" as const,
      gridcolor: gridColor,
      zerolinecolor: gridColor,
      tickcolor: textColor,
    },
    yaxis: {
      title: { text: activeInfo.unit },
      gridcolor: gridColor,
      zerolinecolor: gridColor,
      tickcolor: textColor,
      fixedrange: true,
    },
    legend: {
      orientation: "h" as const,
      yanchor: "bottom" as const,
      y: 1.05,
      xanchor: "right" as const,
      x: 1,
      font: { color: textColor }
    },
  }), [textColor, gridColor, activeInfo.unit]);

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
        {days.length > 0 && (
          <Plot
            data={traces}
            layout={layout}
            config={{ responsive: true, displayModeBar: false }}
            style={{ width: "100%", height: "350px" }}
          />
        )}
      </CardContent>
    </Card>
  );
};
