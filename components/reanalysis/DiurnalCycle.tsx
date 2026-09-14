// components/reanalysis/DiurnalCycle.tsx
import React, { useState, useMemo } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Clock, Thermometer, Droplets, Gauge, Wind, CloudRain } from "lucide-react";
import dynamic from "next/dynamic";
import { DiurnalProfile } from "@/lib/reanalysis/climatology";

const Plot = dynamic(() => import("react-plotly.js"), {
  ssr: false,
  loading: () => (
    <div className="h-[350px] w-full flex items-center justify-center text-muted-foreground animate-pulse bg-slate-50 dark:bg-slate-900 rounded-lg border">
      Membuat grafik profil diurnal...
    </div>
  ),
});

interface DiurnalCycleProps {
  data: DiurnalProfile[];
  isDarkMode: boolean;
}

export const DiurnalCycle: React.FC<DiurnalCycleProps> = ({ data, isDarkMode }) => {
  const [activeTab, setActiveTab] = useState<"temperature" | "humidity" | "pressure" | "wind" | "rain">("temperature");

  const textColor = isDarkMode ? "#cbd5e1" : "#475569";
  const gridColor = isDarkMode ? "rgba(71, 85, 105, 0.2)" : "rgba(203, 213, 225, 0.2)";

  // Hours array (00:00 to 23:00)
  const xData = useMemo(() => data.map(d => d.hour), [data]);

  const activeInfo = useMemo(() => {
    switch (activeTab) {
      case "temperature":
        return {
          title: "Siklus Diurnal Suhu",
          desc: "Rata-rata perubahan suhu udara 2m sepanjang siklus 24 jam",
          unit: "Suhu (°C)",
          icon: <Thermometer className="h-5 w-5 text-orange-500" />,
          traces: [
            {
              x: xData,
              y: data.map(d => d.temperature),
              name: "Suhu Rata-rata",
              type: "scatter" as const,
              mode: "lines+markers" as const,
              line: { color: "#ef4444", width: 3 },
              marker: { size: 6, color: "#f87171" }
            }
          ]
        };
      case "humidity":
        return {
          title: "Siklus Diurnal Kelembaban",
          desc: "Rata-rata perubahan kelembaban relatif sepanjang siklus 24 jam",
          unit: "Kelembaban (%)",
          icon: <Droplets className="h-5 w-5 text-blue-500" />,
          traces: [
            {
              x: xData,
              y: data.map(d => d.humidity),
              name: "Kelembaban Rata-rata",
              type: "scatter" as const,
              mode: "lines+markers" as const,
              line: { color: "#3b82f6", width: 3 },
              marker: { size: 6, color: "#60a5fa" }
            }
          ]
        };
      case "pressure":
        return {
          title: "Siklus Diurnal Tekanan",
          desc: "Pasang-surut barometrik (atmospheric tides) rata-rata sepanjang siklus 24 jam",
          unit: "Tekanan MSL (hPa)",
          icon: <Gauge className="h-5 w-5 text-pink-500" />,
          traces: [
            {
              x: xData,
              y: data.map(d => d.pressure),
              name: "Tekanan Rata-rata",
              type: "scatter" as const,
              mode: "lines+markers" as const,
              line: { color: "#ec4899", width: 3 },
              marker: { size: 6, color: "#f472b6" }
            }
          ]
        };
      case "wind":
        return {
          title: "Siklus Diurnal Kecepatan Angin",
          desc: "Rata-rata fluktuasi kecepatan angin diurnal akibat pemanasan permukaan",
          unit: "Kecepatan Angin (m/s)",
          icon: <Wind className="h-5 w-5 text-emerald-500" />,
          traces: [
            {
              x: xData,
              y: data.map(d => d.windSpeed),
              name: "Kecepatan Rata-rata",
              type: "scatter" as const,
              mode: "lines+markers" as const,
              line: { color: "#10b981", width: 3 },
              marker: { size: 6, color: "#34d399" }
            }
          ]
        };
      case "rain":
        return {
          title: "Klimatologi Diurnal Curah Hujan",
          desc: "Pola rata-rata akumulasi curah hujan per jam untuk mengamati tren konveksi diurnal",
          unit: "Curah Hujan (mm)",
          icon: <CloudRain className="h-5 w-5 text-purple-500" />,
          traces: [
            {
              x: xData,
              y: data.map(d => d.rain),
              name: "Akumulasi Hujan",
              type: "bar" as const,
              marker: { color: "#8b5cf6" }
            }
          ]
        };
    }
  }, [activeTab, xData, data]);

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
      scale: true
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
            <Clock className="h-5 w-5 text-indigo-500" /> {activeInfo.title}
          </CardTitle>
          <CardDescription>{activeInfo.desc}</CardDescription>
        </div>

        {/* Parameter selectors */}
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
          <button
            onClick={() => setActiveTab("rain")}
            className={`px-3 py-1.5 font-semibold rounded-md transition-all duration-200 ${
              activeTab === "rain" ? "bg-white dark:bg-slate-800 text-purple-600 dark:text-purple-400 shadow-sm" : "text-slate-500 hover:text-slate-800"
            }`}
          >
            Hujan
          </button>
        </div>
      </CardHeader>
      
      <CardContent className="p-2">
        {data.length > 0 && (
          <Plot
            data={activeInfo.traces}
            layout={layout}
            config={{ responsive: true, displayModeBar: false }}
            style={{ width: "100%", height: "350px" }}
          />
        )}
      </CardContent>
    </Card>
  );
};
