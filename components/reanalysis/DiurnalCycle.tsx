// components/reanalysis/DiurnalCycle.tsx
import React, { useState, useMemo } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Clock, Thermometer, Droplets, Gauge, Wind, CloudRain } from "lucide-react";
import ChartComponent from "@/components/ChartComponent";
import { DiurnalProfile } from "@/lib/reanalysis/climatology";

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

        {/* Parameter selectors as Tabs (Gaya Underline seperti Menu Meteorologi) */}
        <Tabs
          value={activeTab}
          onValueChange={(val) => setActiveTab(val as any)}
          className="w-auto self-start"
        >
          <div className="flex items-center border-b border-slate-200 dark:border-slate-800 overflow-x-auto">
            <TabsList className="bg-transparent gap-1.5 sm:gap-2 h-auto p-0 border-none flex-nowrap justify-start -mb-px">
              <TabsTrigger
                value="temperature"
                className="px-3 py-1.5 rounded-t-lg rounded-b-none border border-transparent border-b-2 text-xs font-semibold text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200 data-[state=active]:border-slate-200 dark:data-[state=active]:border-slate-800 data-[state=active]:border-b-orange-500 dark:data-[state=active]:border-b-orange-500 data-[state=active]:bg-white dark:data-[state=active]:bg-slate-900 data-[state=active]:text-orange-600 dark:data-[state=active]:text-orange-400 data-[state=active]:font-bold data-[state=active]:shadow-xs transition-all cursor-pointer"
              >
                Suhu
              </TabsTrigger>
              <TabsTrigger
                value="humidity"
                className="px-3 py-1.5 rounded-t-lg rounded-b-none border border-transparent border-b-2 text-xs font-semibold text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200 data-[state=active]:border-slate-200 dark:data-[state=active]:border-slate-800 data-[state=active]:border-b-orange-500 dark:data-[state=active]:border-b-orange-500 data-[state=active]:bg-white dark:data-[state=active]:bg-slate-900 data-[state=active]:text-orange-600 dark:data-[state=active]:text-orange-400 data-[state=active]:font-bold data-[state=active]:shadow-xs transition-all cursor-pointer"
              >
                Kelembaban
              </TabsTrigger>
              <TabsTrigger
                value="pressure"
                className="px-3 py-1.5 rounded-t-lg rounded-b-none border border-transparent border-b-2 text-xs font-semibold text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200 data-[state=active]:border-slate-200 dark:data-[state=active]:border-slate-800 data-[state=active]:border-b-orange-500 dark:data-[state=active]:border-b-orange-500 data-[state=active]:bg-white dark:data-[state=active]:bg-slate-900 data-[state=active]:text-orange-600 dark:data-[state=active]:text-orange-400 data-[state=active]:font-bold data-[state=active]:shadow-xs transition-all cursor-pointer"
              >
                Tekanan
              </TabsTrigger>
              <TabsTrigger
                value="wind"
                className="px-3 py-1.5 rounded-t-lg rounded-b-none border border-transparent border-b-2 text-xs font-semibold text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200 data-[state=active]:border-slate-200 dark:data-[state=active]:border-slate-800 data-[state=active]:border-b-orange-500 dark:data-[state=active]:border-b-orange-500 data-[state=active]:bg-white dark:data-[state=active]:bg-slate-900 data-[state=active]:text-orange-600 dark:data-[state=active]:text-orange-400 data-[state=active]:font-bold data-[state=active]:shadow-xs transition-all cursor-pointer"
              >
                Angin
              </TabsTrigger>
              <TabsTrigger
                value="rain"
                className="px-3 py-1.5 rounded-t-lg rounded-b-none border border-transparent border-b-2 text-xs font-semibold text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200 data-[state=active]:border-slate-200 dark:data-[state=active]:border-slate-800 data-[state=active]:border-b-orange-500 dark:data-[state=active]:border-b-orange-500 data-[state=active]:bg-white dark:data-[state=active]:bg-slate-900 data-[state=active]:text-orange-600 dark:data-[state=active]:text-orange-400 data-[state=active]:font-bold data-[state=active]:shadow-xs transition-all cursor-pointer"
              >
                Hujan
              </TabsTrigger>
            </TabsList>
          </div>
        </Tabs>
      </CardHeader>
      
      <CardContent className="p-2">
        {data.length > 0 && (
          <ChartComponent
            data={activeInfo.traces}
            layout={layout}
            style={{ width: "100%", height: "350px" }}
          />
        )}
      </CardContent>
    </Card>
  );
};
