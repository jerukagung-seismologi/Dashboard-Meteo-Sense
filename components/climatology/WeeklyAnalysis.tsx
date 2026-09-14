// components/climatology/WeeklyAnalysis.tsx
"use client";

import React, { useMemo } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Thermometer, Droplets, Gauge } from "lucide-react";
import { AnalysisPoint } from "@/lib/climatology/analysisTypes";
import dynamic from "next/dynamic";

const Plot = dynamic(() => import("react-plotly.js"), {
  ssr: false,
  loading: () => (
    <div className="h-[350px] w-full flex items-center justify-center text-muted-foreground animate-pulse bg-slate-50 dark:bg-slate-900 rounded-lg border">
      Membuat grafik analisis berkala...
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
    hovermode: "x unified" as const,
    hoverlabel: {
      bgcolor: isDarkMode ? "#0f172a" : "#ffffff",
      bordercolor: isDarkMode ? "#334155" : "#cbd5e1",
      font: {
        family: "Inter, sans-serif",
        size: 12,
        color: isDarkMode ? "#f8fafc" : "#0f172a",
      },
    },
    margin: { l: 50, r: 20, t: 30, b: 50 },
    paper_bgcolor: "rgba(0,0,0,0)",
    plot_bgcolor: "rgba(0,0,0,0)",
    font: { color: textColor, family: "Inter, sans-serif" },
    xaxis: {
      gridcolor: gridColor,
      zerolinecolor: gridColor,
      tickcolor: textColor,
      nticks: 14,
      showspikes: true,
      spikemode: "across" as const,
      spikesnap: "cursor" as const,
      spikethickness: 1,
      spikedash: "dot" as const,
      spikecolor: isDarkMode ? "#64748b" : "#94a3b8",
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
  }), [textColor, gridColor, isDarkMode]);

  // Temperature Weekly Traces
  const tempTraces = useMemo(() => [
    {
      x: xData,
      y: points.map((p) => p.temperatureMax),
      name: "Maksimum",
      type: "scatter" as const,
      mode: "lines" as const,
      line: { color: "#f87171", width: 1.5, dash: "dash" as const },
      hovertemplate: "%{y:.1f} °C<extra></extra>",
    },
    {
      x: xData,
      y: points.map((p) => p.temperatureMean),
      name: "Rata-rata",
      type: "scatter" as const,
      mode: "lines" as const,
      line: { color: "#ef4444", width: 2.5 },
      hovertemplate: "%{y:.1f} °C<extra></extra>",
    },
    {
      x: xData,
      y: points.map((p) => p.temperatureMin),
      name: "Minimum",
      type: "scatter" as const,
      mode: "lines" as const,
      line: { color: "#60a5fa", width: 1.5, dash: "dash" as const },
      hovertemplate: "%{y:.1f} °C<extra></extra>",
    },
  ], [xData, points]);

  // Humidity Weekly Traces
  const humTraces = useMemo(() => [
    {
      x: xData,
      y: points.map((p) => p.humidityMax),
      name: "Maksimum",
      type: "scatter" as const,
      mode: "lines" as const,
      line: { color: "#34d399", width: 1.5, dash: "dash" as const },
      hovertemplate: "%{y:.1f} %<extra></extra>",
    },
    {
      x: xData,
      y: points.map((p) => p.humidityMean),
      name: "Rata-rata",
      type: "scatter" as const,
      mode: "lines" as const,
      line: { color: "#059669", width: 2.5 },
      hovertemplate: "%{y:.1f} %<extra></extra>",
    },
    {
      x: xData,
      y: points.map((p) => p.humidityMin),
      name: "Minimum",
      type: "scatter" as const,
      mode: "lines" as const,
      line: { color: "#f59e0b", width: 1.5, dash: "dash" as const },
      hovertemplate: "%{y:.1f} %<extra></extra>",
    },
  ], [xData, points]);

  // Pressure Weekly Traces
  const pressTraces = useMemo(() => [
    {
      x: xData,
      y: points.map((p) => p.pressureMax),
      name: "Maksimum",
      type: "scatter" as const,
      mode: "lines" as const,
      line: { color: "#f43f5e", width: 1.5, dash: "dash" as const },
      hovertemplate: "%{y:.1f} hPa<extra></extra>",
    },
    {
      x: xData,
      y: points.map((p) => p.pressureMean),
      name: "Rata-rata",
      type: "scatter" as const,
      mode: "lines" as const,
      line: { color: "#db2777", width: 2.5 },
      hovertemplate: "%{y:.1f} hPa<extra></extra>",
    },
    {
      x: xData,
      y: points.map((p) => p.pressureMin),
      name: "Minimum",
      type: "scatter" as const,
      mode: "lines" as const,
      line: { color: "#818cf8", width: 1.5, dash: "dash" as const },
      hovertemplate: "%{y:.1f} hPa<extra></extra>",
    },
  ], [xData, points]);

  return (
    <div className="space-y-6">
      {/* 1. Weekly Temperature */}
      <Card className="border-none shadow-sm dark:bg-slate-900 bg-white">
        <CardHeader className="pb-2">
          <CardTitle className="text-lg font-bold flex items-center gap-2">
            <Thermometer className="h-5 w-5 text-orange-500" /> Analisis Suhu Udara Berkala
          </CardTitle>
          <CardDescription>
            Tren suhu udara resolusi tinggi (Maksimum, Rata-rata, Minimum) — sorot untuk melihat ketiga nilai
          </CardDescription>
        </CardHeader>
        <CardContent className="p-2">
          {points.length > 0 ? (
            <Plot
              data={tempTraces}
              layout={{ ...commonLayout, yaxis: { ...commonLayout.yaxis, title: { text: "Suhu (°C)" } } }}
              config={{ responsive: true, displayModeBar: true, displaylogo: false }}
              style={{ width: "100%", height: "350px" }}
            />
          ) : (
            <div className="h-[350px] flex items-center justify-center text-muted-foreground border border-dashed rounded-lg">
              Tidak ada data observasi suhu
            </div>
          )}
        </CardContent>
      </Card>

      {/* 2. Weekly Humidity */}
      <Card className="border-none shadow-sm dark:bg-slate-900 bg-white">
        <CardHeader className="pb-2">
          <CardTitle className="text-lg font-bold flex items-center gap-2">
            <Droplets className="h-5 w-5 text-blue-500" /> Analisis Kelembaban Relatif Berkala
          </CardTitle>
          <CardDescription>
            Tren kelembaban udara resolusi tinggi (Maksimum, Rata-rata, Minimum) — sorot untuk melihat ketiga nilai
          </CardDescription>
        </CardHeader>
        <CardContent className="p-2">
          {points.length > 0 ? (
            <Plot
              data={humTraces}
              layout={{ ...commonLayout, yaxis: { ...commonLayout.yaxis, title: { text: "Kelembaban (%)" }, max: 100, min: 0 } as any }}
              config={{ responsive: true, displayModeBar: true, displaylogo: false }}
              style={{ width: "100%", height: "350px" }}
            />
          ) : (
            <div className="h-[350px] flex items-center justify-center text-muted-foreground border border-dashed rounded-lg">
              Tidak ada data observasi kelembaban
            </div>
          )}
        </CardContent>
      </Card>

      {/* 3. Weekly Pressure */}
      <Card className="border-none shadow-sm dark:bg-slate-900 bg-white">
        <CardHeader className="pb-2">
          <CardTitle className="text-lg font-bold flex items-center gap-2">
            <Gauge className="h-5 w-5 text-pink-500" /> Analisis Tekanan Udara Permukaan Berkala
          </CardTitle>
          <CardDescription>
            Tren tekanan udara resolusi tinggi (Maksimum, Rata-rata, Minimum) — sorot untuk melihat ketiga nilai
          </CardDescription>
        </CardHeader>
        <CardContent className="p-2">
          {points.length > 0 ? (
            <Plot
              data={pressTraces}
              layout={{ ...commonLayout, yaxis: { ...commonLayout.yaxis, title: { text: "Tekanan (hPa)" } } }}
              config={{ responsive: true, displayModeBar: true, displaylogo: false }}
              style={{ width: "100%", height: "350px" }}
            />
          ) : (
            <div className="h-[350px] flex items-center justify-center text-muted-foreground border border-dashed rounded-lg">
              Tidak ada data observasi tekanan
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};
