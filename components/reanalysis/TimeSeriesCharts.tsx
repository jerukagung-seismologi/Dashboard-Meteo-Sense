// components/reanalysis/TimeSeriesCharts.tsx
import React, { useState, useMemo } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Thermometer, Droplets, Gauge, Wind, CloudRain, Sun, Download } from "lucide-react";
import dynamic from "next/dynamic";

const Plot = dynamic(() => import("react-plotly.js"), {
  ssr: false,
  loading: () => (
    <div className="h-[400px] w-full flex items-center justify-center text-muted-foreground animate-pulse bg-slate-50 dark:bg-slate-900 rounded-lg border">
      Membuat grafik deret waktu...
    </div>
  ),
});

interface TimeSeriesChartsProps {
  times: string[];
  temperature: number[];
  humidity: number[];
  pressure: number[];
  rain: number[];
  windSpeed: number[];
  windGust: number[];
  radiation: number[];
  isDarkMode: boolean;
}

export const TimeSeriesCharts: React.FC<TimeSeriesChartsProps> = ({
  times,
  temperature,
  humidity,
  pressure,
  rain,
  windSpeed,
  windGust,
  radiation,
  isDarkMode,
}) => {
  const [activeTab, setActiveTab] = useState<"temperature" | "humidity" | "pressure" | "wind" | "rain" | "radiation">("temperature");

  const textColor = isDarkMode ? "#cbd5e1" : "#475569";
  const gridColor = isDarkMode ? "rgba(71, 85, 105, 0.2)" : "rgba(203, 213, 225, 0.2)";

  // Format dates for Plotly X-axis
  const xData = useMemo(() => times.map(t => new Date(t)), [times]);

  const activeInfo = useMemo(() => {
    switch (activeTab) {
      case "temperature":
        return {
          title: "Suhu Udara (2m)",
          desc: "Fluktuasi suhu udara hasil reanalisis ERA5",
          unit: "°C",
          icon: <Thermometer className="h-5 w-5 text-orange-500" />,
          traces: [
            {
              x: xData,
              y: temperature,
              name: "Suhu Udara",
              type: "scatter" as const,
              mode: "lines" as const,
              line: { color: "#ef4444", width: 2.5 },
            }
          ]
        };
      case "humidity":
        return {
          title: "Kelembaban Relatif (2m)",
          desc: "Persentase uap air di udara relatif terhadap saturasi",
          unit: "%",
          icon: <Droplets className="h-5 w-5 text-blue-500" />,
          traces: [
            {
              x: xData,
              y: humidity,
              name: "Kelembaban",
              type: "scatter" as const,
              mode: "lines" as const,
              line: { color: "#3b82f6", width: 2.5 },
            }
          ]
        };
      case "pressure":
        return {
          title: "Tekanan Permukaan Laut (MSL)",
          desc: "Tekanan udara yang disesuaikan dengan permukaan laut rata-rata",
          unit: "hPa",
          icon: <Gauge className="h-5 w-5 text-pink-500" />,
          traces: [
            {
              x: xData,
              y: pressure,
              name: "Tekanan MSL",
              type: "scatter" as const,
              mode: "lines" as const,
              line: { color: "#ec4899", width: 2.5 },
            }
          ]
        };
      case "wind":
        return {
          title: "Kecepatan & Hembusan Angin",
          desc: "Kecepatan angin rata-rata (10m) beserta hembusan maksimum (gust)",
          unit: "m/s",
          icon: <Wind className="h-5 w-5 text-emerald-500" />,
          traces: [
            {
              x: xData,
              y: windSpeed,
              name: "Kecepatan Rata-rata",
              type: "scatter" as const,
              mode: "lines" as const,
              line: { color: "#10b981", width: 2.5 },
            },
            {
              x: xData,
              y: windGust,
              name: "Hembusan Angin (Gust)",
              type: "scatter" as const,
              mode: "lines" as const,
              line: { color: "#f59e0b", width: 1.5, dash: "dash" as const },
            }
          ]
        };
      case "rain":
        return {
          title: "Curah Hujan Per Jam",
          desc: "Laju presipitasi curah hujan per jam",
          unit: "mm",
          icon: <CloudRain className="h-5 w-5 text-purple-500" />,
          traces: [
            {
              x: xData,
              y: rain,
              name: "Curah Hujan",
              type: "bar" as const,
              marker: { color: "#8b5cf6" },
            }
          ]
        };
      case "radiation":
        return {
          title: "Radiasi Gelombang Pendek",
          desc: "Energi radiasi matahari gelombang pendek yang diterima di permukaan bumi",
          unit: "W/m²",
          icon: <Sun className="h-5 w-5 text-amber-500" />,
          traces: [
            {
              x: xData,
              y: radiation,
              name: "Shortwave Rad",
              type: "scatter" as const,
              mode: "lines" as const,
              line: { color: "#f59e0b", width: 2 },
              fill: "tozeroy" as const,
              fillcolor: "rgba(245, 158, 11, 0.1)"
            }
          ]
        };
    }
  }, [activeTab, xData, temperature, humidity, pressure, windSpeed, windGust, rain, radiation]);

  const layout = useMemo(() => ({
    autosize: true,
    height: 400,
    margin: { l: 50, r: 20, t: 25, b: 50 },
    paper_bgcolor: "rgba(0,0,0,0)",
    plot_bgcolor: "rgba(0,0,0,0)",
    font: { color: textColor, family: "Inter, sans-serif" },
    xaxis: {
      type: "date" as const,
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

  const handleDownloadCsv = () => {
    const headers = ["Waktu", activeInfo.title + ` (${activeInfo.unit})`];
    let valuesArray: number[] = [];

    switch (activeTab) {
      case "temperature": valuesArray = temperature; break;
      case "humidity": valuesArray = humidity; break;
      case "pressure": valuesArray = pressure; break;
      case "wind": valuesArray = windSpeed; break;
      case "rain": valuesArray = rain; break;
      case "radiation": valuesArray = radiation; break;
    }

    const rows = times.map((t, idx) => `"${t}",${valuesArray[idx]?.toFixed(2) || 0}`);
    const csvContent = [headers.join(","), ...rows].join("\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `era5_${activeTab}_series.csv`);
    link.click();
    URL.revokeObjectURL(url);
  };

  return (
    <Card className="border-none shadow-sm dark:bg-slate-900 bg-white">
      <CardHeader className="flex flex-col md:flex-row md:items-center justify-between pb-4 gap-4">
        <div className="space-y-1">
          <CardTitle className="text-lg font-bold flex items-center gap-2">
            {activeInfo.icon} {activeInfo.title}
          </CardTitle>
          <CardDescription>{activeInfo.desc}</CardDescription>
        </div>

        <div className="flex flex-wrap gap-2 items-center">
          {/* Parameter tab selectors */}
          <div className="flex border rounded-lg p-1 bg-slate-50 dark:bg-slate-950 dark:border-slate-800 text-xs">
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
            <button
              onClick={() => setActiveTab("radiation")}
              className={`px-3 py-1.5 font-semibold rounded-md transition-all duration-200 ${
                activeTab === "radiation" ? "bg-white dark:bg-slate-800 text-amber-600 dark:text-amber-400 shadow-sm" : "text-slate-500 hover:text-slate-800"
              }`}
            >
              Radiasi
            </button>
          </div>

          <Button
            variant="outline"
            size="sm"
            onClick={handleDownloadCsv}
            className="text-xs text-slate-600 dark:text-slate-300 gap-1 border-slate-200 hover:bg-slate-50 dark:border-slate-800 dark:hover:bg-slate-800"
          >
            <Download className="h-3.5 w-3.5" /> CSV
          </Button>
        </div>
      </CardHeader>
      
      <CardContent className="p-2">
        {times.length > 0 && (
          <Plot
            data={activeInfo.traces}
            layout={layout}
            config={{ responsive: true, displayModeBar: true, toImageButtonOptions: { format: "png", filename: `era5_${activeTab}_series` } }}
            style={{ width: "100%", height: "400px" }}
          />
        )}
      </CardContent>
    </Card>
  );
};
