// components/reanalysis/HovmollerDiagram.tsx
import React, { useState, useMemo } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Layers, Thermometer, Droplets, Gauge, CloudRain } from "lucide-react";
import ChartComponent from "@/components/ChartComponent";

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

        {/* Tab Selector (Gaya Underline seperti Menu Meteorologi) */}
        <Tabs
          value={activeTab}
          onValueChange={(val) => setActiveTab(val as "temperature" | "humidity" | "pressure" | "rain")}
          className="self-start"
        >
          <div className="flex items-center border-b border-slate-200 dark:border-slate-800 overflow-x-auto">
            <TabsList className="bg-transparent gap-1.5 sm:gap-2 h-auto p-0 border-none flex-nowrap justify-start -mb-px">
              <TabsTrigger
                value="temperature"
                className="px-3 py-1.5 rounded-t-lg rounded-b-none border border-transparent border-b-2 text-xs font-semibold text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200 data-[state=active]:border-slate-200 dark:data-[state=active]:border-slate-800 data-[state=active]:border-b-orange-500 dark:data-[state=active]:border-b-orange-500 data-[state=active]:bg-white dark:data-[state=active]:bg-slate-900 data-[state=active]:text-orange-600 dark:data-[state=active]:text-orange-400 data-[state=active]:font-bold data-[state=active]:shadow-xs transition-all cursor-pointer gap-1.5 flex items-center"
              >
                <Thermometer className="w-3.5 h-3.5" />
                Suhu
              </TabsTrigger>
              <TabsTrigger
                value="humidity"
                className="px-3 py-1.5 rounded-t-lg rounded-b-none border border-transparent border-b-2 text-xs font-semibold text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200 data-[state=active]:border-slate-200 dark:data-[state=active]:border-slate-800 data-[state=active]:border-b-orange-500 dark:data-[state=active]:border-b-orange-500 data-[state=active]:bg-white dark:data-[state=active]:bg-slate-900 data-[state=active]:text-orange-600 dark:data-[state=active]:text-orange-400 data-[state=active]:font-bold data-[state=active]:shadow-xs transition-all cursor-pointer gap-1.5 flex items-center"
              >
                <Droplets className="w-3.5 h-3.5" />
                Kelembaban
              </TabsTrigger>
              <TabsTrigger
                value="pressure"
                className="px-3 py-1.5 rounded-t-lg rounded-b-none border border-transparent border-b-2 text-xs font-semibold text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200 data-[state=active]:border-slate-200 dark:data-[state=active]:border-slate-800 data-[state=active]:border-b-orange-500 dark:data-[state=active]:border-b-orange-500 data-[state=active]:bg-white dark:data-[state=active]:bg-slate-900 data-[state=active]:text-orange-600 dark:data-[state=active]:text-orange-400 data-[state=active]:font-bold data-[state=active]:shadow-xs transition-all cursor-pointer gap-1.5 flex items-center"
              >
                <Gauge className="w-3.5 h-3.5" />
                Tekanan
              </TabsTrigger>
              <TabsTrigger
                value="rain"
                className="px-3 py-1.5 rounded-t-lg rounded-b-none border border-transparent border-b-2 text-xs font-semibold text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200 data-[state=active]:border-slate-200 dark:data-[state=active]:border-slate-800 data-[state=active]:border-b-orange-500 dark:data-[state=active]:border-b-orange-500 data-[state=active]:bg-white dark:data-[state=active]:bg-slate-900 data-[state=active]:text-orange-600 dark:data-[state=active]:text-orange-400 data-[state=active]:font-bold data-[state=active]:shadow-xs transition-all cursor-pointer gap-1.5 flex items-center"
              >
                <CloudRain className="w-3.5 h-3.5" />
                Curah Hujan
              </TabsTrigger>
            </TabsList>
          </div>
        </Tabs>
      </CardHeader>
      
      <CardContent className="p-2 overflow-x-auto">
        {days.length > 0 && (
          <div className="min-w-[700px]">
            <ChartComponent
              data={trace}
              layout={layout}
              style={{ width: "100%", height: "380px" }}
            />
          </div>
        )}
      </CardContent>
    </Card>
  );
};
