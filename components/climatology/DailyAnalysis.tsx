// components/climatology/DailyAnalysis.tsx
import React, { useMemo } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Thermometer, Droplets, Gauge } from "lucide-react";
import { AnalysisPoint } from "@/lib/climatology/analysisTypes";
import dynamic from "next/dynamic";

const Plot = dynamic(() => import("react-plotly.js"), {
  ssr: false,
  loading: () => (
    <div className="h-[350px] w-full flex items-center justify-center text-muted-foreground animate-pulse bg-slate-50 dark:bg-slate-900 rounded-lg border">
      Membuat grafik analisis harian...
    </div>
  ),
});

interface DailyAnalysisProps {
  points: AnalysisPoint[];
  isDarkMode: boolean;
}

export const DailyAnalysis: React.FC<DailyAnalysisProps> = ({
  points,
  isDarkMode,
}) => {
  const textColor = isDarkMode ? "#cbd5e1" : "#475569";
  const gridColor = isDarkMode ? "rgba(71, 85, 105, 0.2)" : "rgba(203, 213, 225, 0.2)";

  // Format x-axis categories: WIB hours "HH:MM"
  const xData = useMemo(() => points.map((p) => p.timeKeyWib), [points]);

  // Common Plotly Layout parameters
  const commonLayout = useMemo(() => ({
    autosize: true,
    height: 350,
    margin: { l: 50, r: 20, t: 30, b: 50 },
    paper_bgcolor: "rgba(0,0,0,0)",
    plot_bgcolor: "rgba(0,0,0,0)",
    font: { color: textColor, family: "Inter, sans-serif" },
    xaxis: {
      gridcolor: gridColor,
      zerolinecolor: gridColor,
      tickcolor: textColor,
    },
    yaxis: {
      gridcolor: gridColor,
      zerolinecolor: gridColor,
      tickcolor: textColor,
      fixedrange: true,
    },
    legend: {
      orientation: "h" as const,
      yanchor: "bottom" as const,
      y: 1.02,
      xanchor: "right" as const,
      x: 1,
      font: { color: textColor },
    },
  }), [textColor, gridColor]);

  // Suhu Udara Trace Data
  const tempTraces = useMemo(() => [
    {
      x: xData,
      y: points.map((p) => p.temperatureMax),
      name: "Maksimum",
      type: "scatter" as const,
      mode: "lines" as const,
      line: { color: "#f87171", width: 2, dash: "dash" as const },
    },
    {
      x: xData,
      y: points.map((p) => p.temperatureMean),
      name: "Rata-rata",
      type: "scatter" as const,
      mode: "lines" as const,
      line: { color: "#ef4444", width: 3 },
    },
    {
      x: xData,
      y: points.map((p) => p.temperatureMin),
      name: "Minimum",
      type: "scatter" as const,
      mode: "lines" as const,
      line: { color: "#60a5fa", width: 2, dash: "dash" as const },
    },
  ], [xData, points]);

  // Kelembaban Trace Data
  const humTraces = useMemo(() => [
    {
      x: xData,
      y: points.map((p) => p.humidityMax),
      name: "Maksimum",
      type: "scatter" as const,
      mode: "lines" as const,
      line: { color: "#34d399", width: 2, dash: "dash" as const },
    },
    {
      x: xData,
      y: points.map((p) => p.humidityMean),
      name: "Rata-rata",
      type: "scatter" as const,
      mode: "lines" as const,
      line: { color: "#059669", width: 3 },
    },
    {
      x: xData,
      y: points.map((p) => p.humidityMin),
      name: "Minimum",
      type: "scatter" as const,
      mode: "lines" as const,
      line: { color: "#f59e0b", width: 2, dash: "dash" as const },
    },
  ], [xData, points]);

  // Tekanan Trace Data
  const pressTraces = useMemo(() => [
    {
      x: xData,
      y: points.map((p) => p.pressureMax),
      name: "Maksimum",
      type: "scatter" as const,
      mode: "lines" as const,
      line: { color: "#f43f5e", width: 2, dash: "dash" as const },
    },
    {
      x: xData,
      y: points.map((p) => p.pressureMean),
      name: "Rata-rata",
      type: "scatter" as const,
      mode: "lines" as const,
      line: { color: "#db2777", width: 3 },
    },
    {
      x: xData,
      y: points.map((p) => p.pressureMin),
      name: "Minimum",
      type: "scatter" as const,
      mode: "lines" as const,
      line: { color: "#818cf8", width: 2, dash: "dash" as const },
    },
  ], [xData, points]);

  return (
    <div className="space-y-6">
      {/* 1. Suhu Chart */}
      <Card className="border-none shadow-sm dark:bg-slate-900 bg-white">
        <CardHeader className="pb-2">
          <CardTitle className="text-lg font-bold flex items-center gap-2">
            <Thermometer className="h-5 w-5 text-orange-500" /> Analisis Suhu Udara Harian
          </CardTitle>
          <CardDescription>Suhu maksimum, rata-rata, dan minimum setiap jam (WIB)</CardDescription>
        </CardHeader>
        <CardContent className="p-2">
          {points.length > 0 && (
            <Plot
              data={tempTraces}
              layout={{ ...commonLayout, yaxis: { ...commonLayout.yaxis, title: "Suhu (°C)" } }}
              config={{ responsive: true, displayModeBar: false }}
              style={{ width: "100%", height: "350px" }}
            />
          )}
        </CardContent>
      </Card>

      {/* 2. Kelembapan Chart */}
      <Card className="border-none shadow-sm dark:bg-slate-900 bg-white">
        <CardHeader className="pb-2">
          <CardTitle className="text-lg font-bold flex items-center gap-2">
            <Droplets className="h-5 w-5 text-blue-500" /> Analisis Kelembaban Relatif Harian
          </CardTitle>
          <CardDescription>Kelembaban maksimum, rata-rata, dan minimum setiap jam (WIB)</CardDescription>
        </CardHeader>
        <CardContent className="p-2">
          {points.length > 0 && (
            <Plot
              data={humTraces}
              layout={{ ...commonLayout, yaxis: { ...commonLayout.yaxis, title: "Kelembaban (%)", max: 100, min: 0 } }}
              config={{ responsive: true, displayModeBar: false }}
              style={{ width: "100%", height: "350px" }}
            />
          )}
        </CardContent>
      </Card>

      {/* 3. Tekanan Chart */}
      <Card className="border-none shadow-sm dark:bg-slate-900 bg-white">
        <CardHeader className="pb-2">
          <CardTitle className="text-lg font-bold flex items-center gap-2">
            <Gauge className="h-5 w-5 text-pink-500" /> Analisis Tekanan Udara Harian
          </CardTitle>
          <CardDescription>Tekanan maksimum, rata-rata, dan minimum setiap jam (WIB)</CardDescription>
        </CardHeader>
        <CardContent className="p-2">
          {points.length > 0 && (
            <Plot
              data={pressTraces}
              layout={{ ...commonLayout, yaxis: { ...commonLayout.yaxis, title: "Tekanan (hPa)" } }}
              config={{ responsive: true, displayModeBar: false }}
              style={{ width: "100%", height: "350px" }}
            />
          )}
        </CardContent>
      </Card>
    </div>
  );
};
