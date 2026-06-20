// components/climatology/WeeklyAnalysis.tsx
import React, { useMemo } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Thermometer, Droplets } from "lucide-react";
import { AnalysisPoint } from "@/lib/climatology/analysisTypes";
import dynamic from "next/dynamic";

const Plot = dynamic(() => import("react-plotly.js"), {
  ssr: false,
  loading: () => (
    <div className="h-[350px] w-full flex items-center justify-center text-muted-foreground animate-pulse bg-slate-50 dark:bg-slate-900 rounded-lg border">
      Membuat grafik analisis mingguan...
    </div>
  ),
});

interface WeeklyAnalysisProps {
  points: (AnalysisPoint & { dayLabelWib: string })[];
  isDarkMode: boolean;
}

export const WeeklyAnalysis: React.FC<WeeklyAnalysisProps> = ({
  points,
  isDarkMode,
}) => {
  const textColor = isDarkMode ? "#cbd5e1" : "#475569";
  const gridColor = isDarkMode ? "rgba(71, 85, 105, 0.2)" : "rgba(203, 213, 225, 0.2)";

  // Format x-axis categories: Combine Date + WIB time "DD/MM HH:MM"
  const xData = useMemo(() => points.map((p) => `${p.dayLabelWib} ${p.timeKeyWib}`), [points]);

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
      nticks: 14, // Spaced out for 7 days
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

  // Temperature Weekly Traces
  const tempTraces = useMemo(() => [
    {
      x: xData,
      y: points.map((p) => p.temperatureMax),
      name: "Suhu Maksimum",
      type: "scatter" as const,
      mode: "lines" as const,
      line: { color: "#f87171", width: 1.5, dash: "dash" as const },
    },
    {
      x: xData,
      y: points.map((p) => p.temperatureMean),
      name: "Suhu Rata-rata",
      type: "scatter" as const,
      mode: "lines" as const,
      line: { color: "#ef4444", width: 2.5 },
    },
    {
      x: xData,
      y: points.map((p) => p.temperatureMin),
      name: "Suhu Minimum",
      type: "scatter" as const,
      mode: "lines" as const,
      line: { color: "#60a5fa", width: 1.5, dash: "dash" as const },
    },
  ], [xData, points]);

  // Humidity Weekly Traces
  const humTraces = useMemo(() => [
    {
      x: xData,
      y: points.map((p) => p.humidityMax),
      name: "Kelembaban Maksimum",
      type: "scatter" as const,
      mode: "lines" as const,
      line: { color: "#34d399", width: 1.5, dash: "dash" as const },
    },
    {
      x: xData,
      y: points.map((p) => p.humidityMean),
      name: "Kelembaban Rata-rata",
      type: "scatter" as const,
      mode: "lines" as const,
      line: { color: "#059669", width: 2.5 },
    },
    {
      x: xData,
      y: points.map((p) => p.humidityMin),
      name: "Kelembaban Minimum",
      type: "scatter" as const,
      mode: "lines" as const,
      line: { color: "#f59e0b", width: 1.5, dash: "dash" as const },
    },
  ], [xData, points]);

  return (
    <div className="space-y-6">
      {/* 1. Weekly Temperature */}
      <Card className="border-none shadow-sm dark:bg-slate-900 bg-white">
        <CardHeader className="pb-2">
          <CardTitle className="text-lg font-bold flex items-center gap-2">
            <Thermometer className="h-5 w-5 text-orange-500" /> Analisis Suhu Udara Mingguan
          </CardTitle>
          <CardDescription>Tren suhu udara jam-demi-jam resolusi tinggi selama 7 hari (WIB)</CardDescription>
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

      {/* 2. Weekly Humidity */}
      <Card className="border-none shadow-sm dark:bg-slate-900 bg-white">
        <CardHeader className="pb-2">
          <CardTitle className="text-lg font-bold flex items-center gap-2">
            <Droplets className="h-5 w-5 text-blue-500" /> Analisis Kelembaban Relatif Mingguan
          </CardTitle>
          <CardDescription>Tren kelembaban udara jam-demi-jam resolusi tinggi selama 7 hari (WIB)</CardDescription>
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
    </div>
  );
};
