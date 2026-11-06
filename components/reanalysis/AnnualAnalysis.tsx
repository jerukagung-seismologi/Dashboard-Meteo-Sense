// components/reanalysis/AnnualAnalysis.tsx
"use client";

import React, { useState, useMemo } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { CalendarRange, Thermometer, Droplets, Gauge, CloudRain } from "lucide-react";
import dynamic from "next/dynamic";

const ReactECharts = dynamic(() => import("echarts-for-react"), {
  ssr: false,
  loading: () => (
    <div className="h-[350px] w-full flex items-center justify-center text-muted-foreground animate-pulse bg-slate-50 dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-800">
      Membuat grafik analisis tahunan...
    </div>
  ),
});

interface AnnualAnalysisProps {
  days: string[]; // YYYY-MM-DD
  temperatureMean: number[];
  humidityMean: number[];
  pressureMean: number[];
  rainAccumulated: number[];
  isDarkMode: boolean;
}

export const AnnualAnalysis: React.FC<AnnualAnalysisProps> = ({
  days,
  temperatureMean,
  humidityMean,
  pressureMean,
  rainAccumulated,
  isDarkMode,
}) => {
  const [activeTab, setActiveTab] = useState<"temperature" | "humidity" | "pressure" | "rain">("temperature");

  const textColor = isDarkMode ? "#94a3b8" : "#64748b";
  const gridColor = isDarkMode ? "rgba(148, 163, 184, 0.12)" : "rgba(203, 213, 225, 0.4)";
  const tooltipBg = isDarkMode ? "rgba(15, 23, 42, 0.92)" : "rgba(255, 255, 255, 0.95)";
  const tooltipBorder = isDarkMode ? "#334155" : "#e2e8f0";

  const activeInfo = useMemo(() => {
    switch (activeTab) {
      case "temperature":
        return {
          title: "Variabilitas Suhu Tahunan",
          desc: "Suhu rata-rata harian sepanjang tahun untuk mengamati evolusi musiman",
          unit: "°C",
          axisName: "Suhu (°C)",
          icon: <Thermometer className="h-5 w-5 text-orange-500" />,
          color: "#ef4444",
          data: temperatureMean,
          seriesName: "Suhu Harian",
          scale: true,
        };
      case "humidity":
        return {
          title: "Variabilitas Kelembaban Tahunan",
          desc: "Kelembaban relatif rata-rata harian sepanjang tahun",
          unit: "%",
          axisName: "Kelembaban (%)",
          icon: <Droplets className="h-5 w-5 text-blue-500" />,
          color: "#3b82f6",
          data: humidityMean,
          seriesName: "Kelembaban Harian",
          scale: true,
        };
      case "pressure":
        return {
          title: "Variabilitas Tekanan Tahunan",
          desc: "Tekanan MSL rata-rata harian sepanjang tahun",
          unit: "hPa",
          axisName: "Tekanan MSL (hPa)",
          icon: <Gauge className="h-5 w-5 text-pink-500" />,
          color: "#ec4899",
          data: pressureMean,
          seriesName: "Tekanan Harian",
          scale: true,
        };
      case "rain":
        return {
          title: "Kurva Akumulasi Hujan Tahunan",
          desc: "Kurva akumulasi curah hujan kumulatif sepanjang tahun (kurva massa)",
          unit: "mm",
          axisName: "Akumulasi Hujan (mm)",
          icon: <CloudRain className="h-5 w-5 text-purple-500" />,
          color: "#8b5cf6",
          data: rainAccumulated,
          seriesName: "Hujan Akumulatif",
          scale: false,
        };
    }
  }, [activeTab, temperatureMean, humidityMean, pressureMean, rainAccumulated]);

  const chartOption = useMemo(() => {
    if (!days || days.length === 0) return {};

    const validData = (activeInfo.data || []).filter((v: any) => typeof v === "number" && Number.isFinite(v));
    const yMin = validData.length > 0 ? (activeTab === "rain" ? 0 : Math.floor(Math.min(...validData))) : undefined;
    const yMax = validData.length > 0 ? Math.ceil(Math.max(...validData)) : undefined;

    return {
      backgroundColor: "transparent",
      animation: true,
      animationDuration: 600,
      grid: {
        top: 35,
        right: 20,
        bottom: 55,
        left: 55,
        containLabel: false,
      },
      tooltip: {
        trigger: "axis",
        backgroundColor: tooltipBg,
        borderColor: tooltipBorder,
        borderWidth: 1,
        textStyle: {
          color: isDarkMode ? "#f8fafc" : "#0f172a",
          fontSize: 12,
          fontFamily: "Inter, sans-serif",
        },
        axisPointer: {
          type: "cross",
          label: {
            backgroundColor: isDarkMode ? "#334155" : "#64748b",
          },
        },
        formatter: (params: any) => {
          if (!params || !params.length) return "";
          const p = params[0];
          const val = typeof p.value === "number" ? p.value.toFixed(2) : p.value;
          return `
            <div style="font-weight:600; margin-bottom:4px; font-size:11px; opacity:0.8;">Tanggal: ${p.axisValue}</div>
            <div style="display:flex; align-items:center; gap:8px;">
              <span style="display:inline-block; width:8px; height:8px; border-radius:50%; background:${activeInfo.color};"></span>
              <span>${p.seriesName}: <b>${val} ${activeInfo.unit}</b></span>
            </div>
          `;
        },
      },
      xAxis: {
        type: "category",
        data: days,
        boundaryGap: false,
        axisLine: { lineStyle: { color: gridColor } },
        axisTick: { show: false },
        axisLabel: {
          color: textColor,
          fontSize: 11,
          formatter: (val: string) => {
            // Tampilkan tanggal ringkas misal "15 Jan" atau "YYYY-MM"
            if (!val) return "";
            const parts = val.split("-");
            if (parts.length === 3) {
              const months = ["Jan", "Feb", "Mar", "Apr", "Mei", "Jun", "Jul", "Ags", "Sep", "Okt", "Nov", "Des"];
              const mIdx = parseInt(parts[1], 10) - 1;
              return `${parts[2]} ${months[mIdx] || parts[1]}`;
            }
            return val;
          },
        },
      },
      yAxis: {
        type: "value",
        scale: activeInfo.scale,
        name: activeInfo.axisName,
        min: yMin,
        max: yMax,
        nameTextStyle: {
          color: textColor,
          fontSize: 11,
          align: "left",
          padding: [0, 0, 4, 0],
        },
        splitLine: {
          lineStyle: {
            color: gridColor,
            type: "dashed",
          },
        },
        axisLabel: {
          color: textColor,
          fontSize: 11,
        },
      },
      dataZoom: [
        {
          type: "inside",
          start: 0,
          end: 100,
        },
        {
          type: "slider",
          start: 0,
          end: 100,
          height: 20,
          bottom: 10,
          borderColor: "transparent",
          backgroundColor: isDarkMode ? "rgba(30, 41, 59, 0.4)" : "rgba(241, 245, 249, 0.8)",
          fillerColor: isDarkMode ? "rgba(99, 102, 241, 0.25)" : "rgba(99, 102, 241, 0.2)",
          handleStyle: {
            color: isDarkMode ? "#818cf8" : "#6366f1",
            borderColor: "transparent",
          },
          textStyle: {
            color: textColor,
            fontSize: 10,
          },
        },
      ],
      series: [
        {
          name: activeInfo.seriesName,
          type: "line",
          smooth: true,
          showSymbol: false,
          data: activeInfo.data,
          lineStyle: {
            width: 2.2,
            color: activeInfo.color,
          },
          areaStyle: {
            color: {
              type: "linear",
              x: 0,
              y: 0,
              x2: 0,
              y2: 1,
              colorStops: [
                { offset: 0, color: `${activeInfo.color}35` },
                { offset: 1, color: `${activeInfo.color}00` },
              ],
            },
          },
        },
      ],
    };
  }, [days, activeInfo, textColor, gridColor, tooltipBg, tooltipBorder, isDarkMode]);

  return (
    <Card className="border-none shadow-sm dark:bg-slate-900 bg-white">
      <CardHeader className="flex flex-col md:flex-row md:items-center justify-between pb-4 gap-4">
        <div className="space-y-1">
          <CardTitle className="text-lg font-bold flex items-center gap-2">
            <CalendarRange className="h-5 w-5 text-indigo-500" /> {activeInfo.title}
          </CardTitle>
          <CardDescription>{activeInfo.desc}</CardDescription>
        </div>

        {/* Tab Selector as Shadcn Tabs (Gaya Underline seperti Menu Meteorologi) */}
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
                value="rain"
                className="px-3 py-1.5 rounded-t-lg rounded-b-none border border-transparent border-b-2 text-xs font-semibold text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200 data-[state=active]:border-slate-200 dark:data-[state=active]:border-slate-800 data-[state=active]:border-b-orange-500 dark:data-[state=active]:border-b-orange-500 data-[state=active]:bg-white dark:data-[state=active]:bg-slate-900 data-[state=active]:text-orange-600 dark:data-[state=active]:text-orange-400 data-[state=active]:font-bold data-[state=active]:shadow-xs transition-all cursor-pointer"
              >
                Curah Hujan
              </TabsTrigger>
            </TabsList>
          </div>
        </Tabs>
      </CardHeader>

      <CardContent className="p-2">
        {days && days.length > 0 ? (
          <ReactECharts
            option={chartOption}
            style={{ width: "100%", height: "350px" }}
            notMerge={true}
            lazyUpdate={true}
          />
        ) : (
          <div className="h-[350px] w-full flex items-center justify-center text-muted-foreground bg-slate-50/50 dark:bg-slate-900/50 rounded-lg border border-dashed border-slate-200 dark:border-slate-800">
            Tidak ada data deret waktu tahunan yang tersedia.
          </div>
        )}
      </CardContent>
    </Card>
  );
};
