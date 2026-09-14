// components/reanalysis/HovmollerDiagram.tsx
import React, { useState, useMemo } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Layers, Thermometer, Droplets, Gauge, CloudRain } from "lucide-react";
import dynamic from "next/dynamic";

const Plot = dynamic(() => import("react-plotly.js"), {
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
  const gridColor = isDarkMode ? "rgba(71, 85, 105, 0.2)" : "rgba(203, 213, 225, 0.2)";

  // Format YYYY-MM-DD to cleaner display strings (e.g. DD/MM) for X axis ticks
  const formattedDays = useMemo(() => {
    return days.map(d => {
      const parts = d.split("-");
      if (parts.length === 3) return `${parts[2]}/${parts[1]}`;
      return d;
    });
  }, [days]);

  const activeInfo = useMemo(() => {
    // Standard color palettes matching daily/weekly
    const colorscales = {
      temperature: [
        [0, "#313695"], [0.1, "#4575b4"], [0.2, "#74add1"], [0.3, "#abd9e9"], [0.4, "#e0f3f8"],
        [0.5, "#ffffbf"], [0.6, "#fee090"], [0.7, "#fdae61"], [0.8, "#f46d43"], [0.9, "#d73027"], [1, "#a50026"]
      ], // Coolwarm
      humidity: [
        [0, "#eff6ff"], [0.25, "#bfdbfe"], [0.5, "#60a5fa"], [0.75, "#2563eb"], [1, "#1e3a8a"]
      ], // Blues
      pressure: [
        [0, "#440154"], [0.2, "#414487"], [0.4, "#2a788e"], [0.6, "#22a884"], [0.8, "#7ad151"], [1, "#fde725"]
      ], // Viridis
      rain: [
        [0, "#30123b"], [0.125, "#4454c4"], [0.25, "#4490f5"], [0.375, "#1fced4"], [0.5, "#40f88a"],
        [0.625, "#a2fc3c"], [0.75, "#e5d321"], [0.875, "#f77f11"], [1, "#d82b0b"]
      ] // Turbo
    };

    switch (activeTab) {
      case "temperature":
        return {
          title: "Hovmöller Suhu Udara",
          desc: "Fluktuasi suhu udara diurnal sepanjang tahun (Hari vs Jam WIB)",
          unit: "Suhu (°C)",
          icon: <Thermometer className="h-5 w-5 text-orange-500" />,
          z: temperature,
          colorscale: colorscales.temperature
        };
      case "humidity":
        return {
          title: "Hovmöller Kelembaban",
          desc: "Fluktuasi kelembaban relatif diurnal sepanjang tahun (Hari vs Jam WIB)",
          unit: "Kelembaban (%)",
          icon: <Droplets className="h-5 w-5 text-blue-500" />,
          z: humidity,
          colorscale: colorscales.humidity
        };
      case "pressure":
        return {
          title: "Hovmöller Tekanan MSL",
          desc: "Fluktuasi tekanan permukaan laut diurnal sepanjang tahun (Hari vs Jam WIB)",
          unit: "Tekanan MSL (hPa)",
          icon: <Gauge className="h-5 w-5 text-pink-500" />,
          z: pressure,
          colorscale: colorscales.pressure
        };
      case "rain":
        return {
          title: "Hovmöller Curah Hujan",
          desc: "Intensitas laju curah hujan diurnal sepanjang tahun (Hari vs Jam WIB)",
          unit: "Curah Hujan (mm)",
          icon: <CloudRain className="h-5 w-5 text-purple-500" />,
          z: rain,
          colorscale: colorscales.rain
        };
    }
  }, [activeTab, temperature, humidity, pressure, rain]);

  // Calculate local zmin and zmax to fit scale
  const { zmin, zmax } = useMemo(() => {
    if (!activeInfo.z || activeInfo.z.length === 0) return { zmin: undefined, zmax: undefined };
    const flatVals = activeInfo.z.flat().filter(v => v !== null && Number.isFinite(v)) as number[];
    if (flatVals.length === 0) return { zmin: undefined, zmax: undefined };
    return {
      zmin: Math.min(...flatVals),
      zmax: Math.max(...flatVals)
    };
  }, [activeInfo.z]);

  const trace = useMemo(() => {
    if (!days || days.length === 0) return [];
    
    return [
      {
        x: formattedDays,
        y: hours,
        z: activeInfo.z,
        zmin,
        zmax,
        type: "heatmap" as const,
        colorscale: activeInfo.colorscale,
        showscale: true,
        colorbar: {
          tickfont: { color: textColor },
          title: { text: activeInfo.unit, font: { color: textColor } }
        }
      } as any
    ];
  }, [days, hours, formattedDays, activeInfo, zmin, zmax, textColor]);

  const layout = useMemo(() => ({
    autosize: true,
    height: 380,
    margin: { l: 50, r: 20, t: 25, b: 50 },
    paper_bgcolor: "rgba(0,0,0,0)",
    plot_bgcolor: "rgba(0,0,0,0)",
    font: { color: textColor, family: "Inter, sans-serif" },
    xaxis: {
      title: { text: "Tanggal (WIB)" },
      gridcolor: gridColor,
      zerolinecolor: gridColor,
      tickcolor: textColor,
      type: "category" as const,
      // Thin out date labels dynamically to prevent overlaps
      tickmode: "auto" as const,
      nticks: 16,
    },
    yaxis: {
      title: { text: "Jam (WIB)" },
      gridcolor: gridColor,
      zerolinecolor: gridColor,
      tickcolor: textColor,
      type: "category" as const,
      autorange: "reversed" as const // Standard Hovmöller: hour 00 at top
    }
  }), [textColor, gridColor]);

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
          <div className="min-w-[700px]">
            <Plot
              data={trace}
              layout={layout}
              config={{ responsive: true, displayModeBar: false }}
              style={{ width: "100%", height: "380px" }}
            />
          </div>
        )}
      </CardContent>
    </Card>
  );
};
