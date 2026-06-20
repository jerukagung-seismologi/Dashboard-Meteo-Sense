// components/climatology/HeatmapAnalysis.tsx
import React, { useState, useMemo } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Thermometer, Droplets, Gauge, Grid } from "lucide-react";
import { HeatmapData } from "@/lib/climatology/analysisTypes";
import dynamic from "next/dynamic";

const Plot = dynamic(() => import("react-plotly.js"), {
  ssr: false,
  loading: () => (
    <div className="h-[500px] w-full flex items-center justify-center text-muted-foreground animate-pulse bg-slate-50 dark:bg-slate-900 rounded-lg border">
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
  const gridColor = isDarkMode ? "rgba(71, 85, 105, 0.2)" : "rgba(203, 213, 225, 0.2)";

  const labels = {
    temperature: {
      title: "Heatmap Suhu Udara",
      desc: "Pola distribusi suhu udara mingguan (Hari vs Jam WIB)",
      unit: "°C",
      icon: <Thermometer className="h-5 w-5 text-orange-500" />,
    },
    humidity: {
      title: "Heatmap Kelembaban Relatif",
      desc: "Pola distribusi kelembaban relatif mingguan (Hari vs Jam WIB)",
      unit: "%",
      icon: <Droplets className="h-5 w-5 text-blue-500" />,
    },
    pressure: {
      title: "Heatmap Tekanan Udara",
      desc: "Pola distribusi tekanan udara mingguan (Hari vs Jam WIB)",
      unit: "hPa",
      icon: <Gauge className="h-5 w-5 text-pink-500" />,
    },
  };

  const currentHeatmapData = useMemo(() => {
    return heatmaps?.[activeParam];
  }, [heatmaps, activeParam]);

  // Format YYYY-MM-DD to DD/MM labels for X-axis
  const xData = useMemo(() => {
    if (!currentHeatmapData?.days) return [];
    return currentHeatmapData.days.map((d) => {
      const parts = d.split("-");
      if (parts.length === 3) return `${parts[2]}/${parts[1]}`;
      return d;
    });
  }, [currentHeatmapData]);

  const heatmapTrace = useMemo(() => {
    if (!currentHeatmapData || !currentHeatmapData.z || currentHeatmapData.z.length === 0) return [];

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

    const flatVals = currentHeatmapData.z.flat().filter((v) => v !== null && Number.isFinite(v)) as number[];
    const zmin = flatVals.length > 0 ? Math.min(...flatVals) : undefined;
    const zmax = flatVals.length > 0 ? Math.max(...flatVals) : undefined;

    return [
      {
        x: currentHeatmapData.hours,
        y: xData,
        z: currentHeatmapData.z,
        type: "heatmap" as const,
        colorscale: colorscales[activeParam],
        showscale: true,
        zmin,
        zmax,
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
            text: labels[activeParam].unit,
            font: { color: textColor }
          }
        }
      } as any
    ];
  }, [currentHeatmapData, activeParam, xData, isDarkMode, textColor]);

  const heatmapLayout = useMemo(() => ({
    autosize: true,
    height: 280,
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
    },
    yaxis: {
      title: { text: "Hari" },
      gridcolor: gridColor,
      zerolinecolor: gridColor,
      tickcolor: textColor,
      type: "category" as const,
    }
  }), [textColor, gridColor]);

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
          <div className="min-w-[650px]">
            <Plot
              data={heatmapTrace}
              layout={heatmapLayout}
              config={{ responsive: true, displayModeBar: false }}
              style={{ width: "100%", height: "280px" }}
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
