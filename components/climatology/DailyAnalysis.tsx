// components/climatology/DailyAnalysis.tsx
import React, { useMemo, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Thermometer, Droplets, Gauge, Grid } from "lucide-react";
import { AnalysisPoint, DailyHeatmapData } from "@/lib/climatology/analysisTypes";
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
  heatmaps?: {
    temperature: DailyHeatmapData;
    humidity: DailyHeatmapData;
    pressure: DailyHeatmapData;
  };
  isDarkMode: boolean;
}

export const DailyAnalysis: React.FC<DailyAnalysisProps> = ({
  points,
  heatmaps,
  isDarkMode,
}) => {
  const [activeParam, setActiveParam] = useState<"temperature" | "humidity" | "pressure">("temperature");

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

  // Daily Heatmap Trace & Layout Data
  const currentHeatmapData = useMemo(() => {
    return heatmaps?.[activeParam];
  }, [heatmaps, activeParam]);

  const heatmapTrace = useMemo(() => {
    if (!currentHeatmapData) return [];

    const colorscales = {
      temperature: [
        [0, "#313695"],
        [0.1, "#4575b4"],
        [0.2, "#74add1"],
        [0.3, "#abd9e9"],
        [0.4, "#e0f3f8"],
        [0.5, "#ffffbf"],
        [0.6, "#fee090"],
        [0.7, "#fdae61"],
        [0.8, "#f46d43"],
        [0.9, "#d73027"],
        [1.0, "#a50026"]
      ],
      humidity: [
        [0, "#eff6ff"],
        [0.25, "#bfdbfe"],
        [0.5, "#60a5fa"],
        [0.75, "#2563eb"],
        [1.0, "#1e3a8a"]
      ],
      pressure: [
        [0, "#440154"],
        [0.2, "#414487"],
        [0.4, "#2a788e"],
        [0.6, "#22a884"],
        [0.8, "#7ad151"],
        [1.0, "#fde725"]
      ]
    };

    const textMatrix = currentHeatmapData.z.map((row) =>
      row.map((val) => (val !== null ? `<b>${val.toFixed(1)}</b>` : ""))
    );

    return [
      {
        x: currentHeatmapData.hours,
        y: currentHeatmapData.minutes,
        z: currentHeatmapData.z,
        type: "heatmap" as const,
        colorscale: colorscales[activeParam],
        showscale: true,
        xgap: 2,
        ygap: 2,
        text: textMatrix as any,
        texttemplate: "%{text}",
        textfont: {
          size: 9,
          color: isDarkMode ? "#ffffff" : "#1e293b",
          family: "Inter, sans-serif"
        },
        colorbar: {
          tickfont: { color: textColor },
          title: {
            text: activeParam === "temperature" ? "°C" : activeParam === "humidity" ? "%" : "hPa",
            font: { color: textColor }
          }
        }
      } as any
    ];
  }, [currentHeatmapData, activeParam, isDarkMode, textColor]);

  const heatmapLayout = useMemo(() => ({
    autosize: true,
    height: 600,
    margin: { l: 50, r: 20, t: 20, b: 50 },
    paper_bgcolor: "rgba(0,0,0,0)",
    plot_bgcolor: "rgba(0,0,0,0)",
    font: { color: textColor, family: "Inter, sans-serif" },
    xaxis: {
      title: { text: "Jam (WIB)" },
      gridcolor: gridColor,
      zerolinecolor: gridColor,
      tickcolor: textColor,
      type: "category" as const,
      tickmode: "array" as const,
      tickvals: Array.from({ length: 24 }, (_, i) => String(i).padStart(2, "0")),
    },
    yaxis: {
      title: { text: "Menit" },
      gridcolor: gridColor,
      zerolinecolor: gridColor,
      tickcolor: textColor,
      type: "category" as const,
      scaleanchor: "x" as const,
      scaleratio: 1,
      tickmode: "array" as const,
      tickvals: Array.from({ length: 12 }, (_, i) => String(i * 5).padStart(2, "0")),
    }
  }), [textColor, gridColor]);

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
              layout={{ ...commonLayout, yaxis: { ...commonLayout.yaxis, title: { text: "Suhu (°C)" } } }}
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
              layout={{ ...commonLayout, yaxis: { ...commonLayout.yaxis, title: { text: "Kelembaban (%)" }, max: 100, min: 0 } as any }}
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
              layout={{ ...commonLayout, yaxis: { ...commonLayout.yaxis, title: { text: "Tekanan (hPa)" } } }}
              config={{ responsive: true, displayModeBar: false }}
              style={{ width: "100%", height: "350px" }}
            />
          )}
        </CardContent>
      </Card>

      {/* 4. Daily Heatmap Chart (Plotly) */}
      {heatmaps && currentHeatmapData && (
        <Card className="border-none shadow-sm dark:bg-slate-900 bg-white">
          <CardHeader className="flex flex-col md:flex-row md:items-center justify-between pb-4 gap-4">
            <div className="space-y-1">
              <CardTitle className="text-lg font-bold flex items-center gap-2">
                <Grid className="h-5 w-5 text-indigo-500" /> Heatmap Diurnal Harian
              </CardTitle>
              <CardDescription>
                Distribusi nilai parameter cuaca menit-demi-menit terhadap jam WIB (Plotly)
              </CardDescription>
            </div>
            
            {/* Tab Selection */}
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
            <div className="min-w-[700px]">
              <Plot
                data={heatmapTrace}
                layout={heatmapLayout}
                config={{ responsive: true, displayModeBar: false }}
                style={{ width: "100%", height: "600px" }}
              />
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};
