// components/reanalysis/DistributionAnalysis.tsx
import React, { useState, useMemo } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { BarChart3, Thermometer, Droplets, Gauge, Wind, CloudRain } from "lucide-react";
import { ParameterStats } from "@/lib/reanalysis/statistics";
import dynamic from "next/dynamic";

const ReactECharts = dynamic(() => import("echarts-for-react"), {
  ssr: false,
  loading: () => (
    <div className="h-[300px] w-full flex items-center justify-center text-muted-foreground animate-pulse">
      Membuat grafik distribusi frekuensi...
    </div>
  ),
});

interface DistributionAnalysisProps {
  temperature: number[];
  humidity: number[];
  pressure: number[];
  windSpeed: number[];
  rain: number[];
  stats: {
    temperature: ParameterStats;
    humidity: ParameterStats;
    pressure: ParameterStats;
    windSpeed: ParameterStats;
    rain: ParameterStats;
  };
  isDarkMode: boolean;
}

export const DistributionAnalysis: React.FC<DistributionAnalysisProps> = ({
  temperature,
  humidity,
  pressure,
  windSpeed,
  rain,
  stats,
  isDarkMode,
}) => {
  const [activeTab, setActiveTab] = useState<"temperature" | "humidity" | "pressure" | "wind" | "rain">("temperature");

  const chartTheme = isDarkMode ? "dark" : "light";
  const textColor = isDarkMode ? "#cbd5e1" : "#475569";
  const gridColor = isDarkMode ? "rgba(71, 85, 105, 0.2)" : "rgba(203, 213, 225, 0.2)";

  // Dynamic parameter mapping
  const activeInfo = useMemo(() => {
    switch (activeTab) {
      case "temperature":
        return {
          title: "Distribusi Suhu Udara",
          desc: "Analisis statistik penyebaran suhu udara (2m)",
          unit: "°C",
          color: ["#f87171", "#ef4444"],
          data: temperature,
          stat: stats.temperature,
          icon: <Thermometer className="h-5 w-5 text-orange-500" />
        };
      case "humidity":
        return {
          title: "Distribusi Kelembaban Relatif",
          desc: "Analisis statistik penyebaran kelembaban relatif (2m)",
          unit: "%",
          color: ["#60a5fa", "#3b82f6"],
          data: humidity,
          stat: stats.humidity,
          icon: <Droplets className="h-5 w-5 text-blue-500" />
        };
      case "pressure":
        return {
          title: "Distribusi Tekanan MSL",
          desc: "Analisis statistik penyebaran tekanan permukaan laut rata-rata",
          unit: "hPa",
          color: ["#f472b6", "#ec4899"],
          data: pressure,
          stat: stats.pressure,
          icon: <Gauge className="h-5 w-5 text-pink-500" />
        };
      case "wind":
        return {
          title: "Distribusi Kecepatan Angin",
          desc: "Analisis statistik penyebaran kecepatan angin (10m)",
          unit: "m/s",
          color: ["#34d399", "#10b981"],
          data: windSpeed,
          stat: stats.windSpeed,
          icon: <Wind className="h-5 w-5 text-emerald-500" />
        };
      case "rain":
        return {
          title: "Distribusi Curah Hujan",
          desc: "Analisis statistik penyebaran kejadian curah hujan",
          unit: "mm",
          color: ["#a78bfa", "#8b5cf6"],
          data: rain,
          stat: stats.rain,
          icon: <CloudRain className="h-5 w-5 text-purple-500" />
        };
    }
  }, [activeTab, temperature, humidity, pressure, windSpeed, rain, stats]);

  // Compute 15 equal-width frequency bins on the fly
  const option = useMemo(() => {
    const rawData = activeInfo.data.filter(v => Number.isFinite(v));
    if (rawData.length === 0) return {};

    const min = Math.min(...rawData);
    const max = Math.max(...rawData);
    
    // Fallback for single value datasets
    if (min === max) {
      return {
        xAxis: { type: "category", data: [min.toFixed(1)] },
        yAxis: { type: "value" },
        series: [{ type: "bar", data: [rawData.length] }]
      };
    }

    const numBins = 12;
    const binWidth = (max - min) / numBins;
    const bins = Array.from({ length: numBins }, (_, idx) => {
      const bMin = min + idx * binWidth;
      const bMax = bMin + binWidth;
      return {
        label: `${bMin.toFixed(1)} - ${bMax.toFixed(1)}`,
        min: bMin,
        max: bMax,
        count: 0
      };
    });

    for (const val of rawData) {
      let bIdx = Math.floor((val - min) / binWidth);
      if (bIdx >= numBins) bIdx = numBins - 1;
      if (bIdx >= 0) bins[bIdx].count++;
    }

    return {
      tooltip: {
        trigger: "axis",
        axisPointer: { type: "shadow" },
        formatter: (params: any) => {
          const item = params[0];
          return `<div class="p-1 text-xs">
            <span class="font-bold">Rentang:</span> ${item.name} ${activeInfo.unit}<br/>
            <span class="font-bold">Frekuensi:</span> ${item.value} sampel
          </div>`;
        }
      },
      grid: { left: "3%", right: "4%", top: "8%", bottom: "15%", containLabel: true },
      xAxis: {
        type: "category",
        data: bins.map(b => b.label),
        axisLabel: { color: textColor, rotate: 25, fontSize: 10 },
        splitLine: { show: false }
      },
      yAxis: {
        type: "value",
        name: "Sampel",
        nameTextStyle: { color: textColor, fontSize: 10 },
        axisLabel: { color: textColor, fontSize: 10 },
        splitLine: { lineStyle: { color: gridColor } }
      },
      series: [
        {
          name: "Frekuensi",
          type: "bar",
          data: bins.map(b => b.count),
          itemStyle: {
            color: {
              type: "linear",
              x: 0,
              y: 0,
              x2: 0,
              y2: 1,
              colorStops: [
                { offset: 0, color: activeInfo.color[0] },
                { offset: 1, color: activeInfo.color[1] }
              ]
            },
            borderRadius: [4, 4, 0, 0]
          }
        }
      ]
    };
  }, [activeInfo, textColor, gridColor]);

  const activeStat = activeInfo.stat;

  return (
    <Card className="border-none shadow-sm dark:bg-slate-900 bg-white">
      <CardHeader className="flex flex-col md:flex-row md:items-center justify-between pb-4 gap-4">
        <div className="space-y-1">
          <CardTitle className="text-lg font-bold flex items-center gap-2">
            <BarChart3 className="h-5 w-5 text-indigo-500" /> {activeInfo.title}
          </CardTitle>
          <CardDescription>{activeInfo.desc}</CardDescription>
        </div>

        {/* Tab selection */}
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
      
      <CardContent className="grid grid-cols-1 lg:grid-cols-4 gap-6 pt-2">
        {/* Histogram Chart */}
        <div className="lg:col-span-3 h-[320px]">
          {activeInfo.data.length > 0 && (
            <ReactECharts
              option={option}
              style={{ height: "100%", width: "100%" }}
              theme={chartTheme}
            />
          )}
        </div>

        {/* Scientific Statistics Panel */}
        <div className="flex flex-col justify-between border-t lg:border-t-0 lg:border-l pt-4 lg:pt-0 lg:pl-6 border-slate-100 dark:border-slate-800 space-y-4">
          <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400">Parameter Statistik</h4>
          
          <div className="grid grid-cols-2 gap-4 flex-grow">
            <div className="bg-slate-50 dark:bg-slate-950 p-2 rounded">
              <span className="text-[9px] text-slate-500 uppercase font-semibold">Mean (Rata-rata)</span>
              <p className="text-sm font-extrabold">{activeStat.mean.toFixed(2)}{activeInfo.unit}</p>
            </div>
            <div className="bg-slate-50 dark:bg-slate-950 p-2 rounded">
              <span className="text-[9px] text-slate-500 uppercase font-semibold">Median</span>
              <p className="text-sm font-extrabold">{activeStat.median.toFixed(2)}{activeInfo.unit}</p>
            </div>
            <div className="bg-slate-50 dark:bg-slate-950 p-2 rounded">
              <span className="text-[9px] text-slate-500 uppercase font-semibold">Mode (Modus)</span>
              <p className="text-sm font-extrabold">{activeStat.mode.toFixed(1)}{activeInfo.unit}</p>
            </div>
            <div className="bg-slate-50 dark:bg-slate-950 p-2 rounded">
              <span className="text-[9px] text-slate-500 uppercase font-semibold">Std Deviasi</span>
              <p className="text-sm font-extrabold">±{activeStat.stdDev.toFixed(2)}{activeInfo.unit}</p>
            </div>
            <div className="bg-slate-50 dark:bg-slate-950 p-2 rounded">
              <span className="text-[9px] text-slate-500 uppercase font-semibold">Skewness</span>
              <p className="text-sm font-extrabold">{activeStat.skewness.toFixed(2)}</p>
            </div>
            <div className="bg-slate-50 dark:bg-slate-950 p-2 rounded">
              <span className="text-[9px] text-slate-500 uppercase font-semibold">Kurtosis</span>
              <p className="text-sm font-extrabold">{activeStat.kurtosis.toFixed(2)}</p>
            </div>
          </div>
          
          <div className="text-[10px] text-slate-500 italic leading-relaxed">
            *Kurtosis dihitung sebagai Excess Kurtosis (Kurtosis - 3). Skewness positif menandakan kemiringan kanan.
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
