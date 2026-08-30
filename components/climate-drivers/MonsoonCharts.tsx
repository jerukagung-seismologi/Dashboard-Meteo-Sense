// components/climate-drivers/MonsoonCharts.tsx
"use client";

import React, { useMemo } from "react";
import ReactECharts from "echarts-for-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { MonsoonData } from "@/lib/climate-drivers/types";
import { Wind, Compass, TrendingUp, Calendar, CloudRain, Sun, Activity } from "lucide-react";

interface MonsoonChartsProps {
  data: MonsoonData;
  isDarkMode?: boolean;
}

export const MonsoonCharts: React.FC<MonsoonChartsProps> = ({
  data,
  isDarkMode = false,
}) => {
  // Combine historical and 16-day forecast for the continuous timeline
  const timelineData = useMemo(() => {
    if (!data) return { dates: [], uValues: [], colors: [], statusList: [], combined: [] };

    // Deduplicate by date
    const map = new Map<string, typeof data.historical[0]>();
    data.historical?.forEach((p) => map.set(p.date, p));
    data.forecast16Days?.forEach((p) => map.set(p.date, p));

    const combined = Array.from(map.values()).sort((a, b) => a.date.localeCompare(b.date));

    const dates = combined.map((p) => p.date);
    const uValues = combined.map((p) => p.zonalWind);
    const colors = combined.map((p) =>
      p.zonalWind > 2.0 ? "#06b6d4" : p.zonalWind < -2.0 ? "#f59e0b" : "#94a3b8"
    );
    const statusList = combined.map((p) => p.status);

    return { dates, uValues, colors, statusList, combined };
  }, [data]);

  // Main Daily Zonal Wind (U) Time Series Chart
  const dailyChartOption = useMemo(() => {
    return {
      backgroundColor: "transparent",
      tooltip: {
        trigger: "axis",
        backgroundColor: isDarkMode ? "#0f172a" : "#ffffff",
        borderColor: isDarkMode ? "#334155" : "#e2e8f0",
        textStyle: { color: isDarkMode ? "#f8fafc" : "#0f172a", fontSize: 12 },
        formatter: (params: any[]) => {
          const idx = params[0]?.dataIndex ?? 0;
          const item = timelineData.combined[idx];
          if (!item) return "";

          let html = `<div class="font-bold text-sm mb-1">${item.date}</div>`;
          html += `<div class="text-xs space-y-1">`;
          html += `<div class="flex justify-between gap-4"><span class="text-slate-400">Status:</span> <b class="${item.zonalWind > 2.0 ? "text-cyan-500" : item.zonalWind < -2.0 ? "text-amber-500" : "text-slate-400"}">${item.status}</b></div>`;
          html += `<div class="flex justify-between gap-4"><span class="text-slate-400">Angin Zonal (U):</span> <b>${item.zonalWind > 0 ? "+" : ""}${item.zonalWind} m/s</b></div>`;
          html += `<div class="flex justify-between gap-4"><span class="text-slate-400">Kecepatan Angin:</span> <b>${item.windSpeedMs} m/s (${item.windSpeed} km/j)</b></div>`;
          html += `<div class="flex justify-between gap-4"><span class="text-slate-400">Arah Datang Angin:</span> <b>${item.windDirection}°</b></div>`;
          html += `</div>`;
          return html;
        },
      },
      grid: {
        top: 35,
        left: 55,
        right: 25,
        bottom: 35,
        containLabel: false,
      },
      xAxis: {
        type: "category",
        data: timelineData.dates,
        axisLine: { lineStyle: { color: isDarkMode ? "#334155" : "#cbd5e1" } },
        axisLabel: {
          color: isDarkMode ? "#94a3b8" : "#64748b",
          fontSize: 11,
          formatter: (val: string) => val.substring(5), // MM-DD
        },
      },
      yAxis: {
        type: "value",
        name: "Angin Zonal U (m/s)",
        nameTextStyle: { color: isDarkMode ? "#94a3b8" : "#64748b", fontSize: 11 },
        splitLine: { lineStyle: { color: isDarkMode ? "#1e293b" : "#f1f5f9" } },
        axisLabel: {
          color: isDarkMode ? "#94a3b8" : "#64748b",
          fontSize: 11,
          formatter: (v: number) => (v > 0 ? `+${v}` : `${v}`),
        },
      },
      series: [
        {
          name: "Angin Zonal U",
          type: "bar",
          data: timelineData.uValues.map((v, i) => ({
            value: v,
            itemStyle: {
              color: timelineData.colors[i],
              borderRadius: v >= 0 ? [4, 4, 0, 0] : [0, 0, 4, 4],
            },
          })),
          markLine: {
            symbol: "none",
            data: [
              {
                yAxis: 2.0,
                lineStyle: { color: "#06b6d4", type: "dashed", width: 1.5 },
                label: { formatter: "Monsun Barat / Hujan (+2 m/s)", position: "insideEndTop", color: "#06b6d4", fontSize: 10 },
              },
              {
                yAxis: 0,
                lineStyle: { color: isDarkMode ? "#64748b" : "#94a3b8", type: "solid", width: 1 },
                label: { formatter: "Garis Nol (0 m/s)", position: "insideEndTop", color: isDarkMode ? "#64748b" : "#94a3b8", fontSize: 10 },
              },
              {
                yAxis: -2.0,
                lineStyle: { color: "#f59e0b", type: "dashed", width: 1.5 },
                label: { formatter: "Monsun Timur / Kemarau (-2 m/s)", position: "insideEndBottom", color: "#f59e0b", fontSize: 10 },
              },
            ],
          },
        },
      ],
    };
  }, [timelineData, isDarkMode]);

  // Seasonal 7-Month Progression Chart Option
  const seasonalChartOption = useMemo(() => {
    if (!data.seasonalForecast || data.seasonalForecast.length === 0) return {};

    const labels = data.seasonalForecast.map((m) => m.label);
    const uVals = data.seasonalForecast.map((m) => m.meanZonalWind);

    return {
      backgroundColor: "transparent",
      tooltip: {
        trigger: "axis",
        backgroundColor: isDarkMode ? "#0f172a" : "#ffffff",
        borderColor: isDarkMode ? "#334155" : "#e2e8f0",
        textStyle: { color: isDarkMode ? "#f8fafc" : "#0f172a", fontSize: 12 },
        formatter: (params: any[]) => {
          const idx = params[0]?.dataIndex ?? 0;
          const item = data.seasonalForecast[idx];
          if (!item) return "";
          return `
            <div class="font-bold text-sm mb-1">${item.label}</div>
            <div class="text-xs space-y-1">
              <div>Status: <b>${item.status}</b></div>
              <div>Rata-rata U: <b>${item.meanZonalWind > 0 ? "+" : ""}${item.meanZonalWind} m/s</b></div>
              <div>Arah Dominan: <b>${item.dominantDirection}</b></div>
            </div>
          `;
        },
      },
      grid: {
        top: 35,
        left: 55,
        right: 25,
        bottom: 35,
        containLabel: false,
      },
      xAxis: {
        type: "category",
        data: labels,
        axisLine: { lineStyle: { color: isDarkMode ? "#334155" : "#cbd5e1" } },
        axisLabel: { color: isDarkMode ? "#94a3b8" : "#64748b", fontSize: 11 },
      },
      yAxis: {
        type: "value",
        name: "Rata-rata Zonal U (m/s)",
        nameTextStyle: { color: isDarkMode ? "#94a3b8" : "#64748b", fontSize: 11 },
        splitLine: { lineStyle: { color: isDarkMode ? "#1e293b" : "#f1f5f9" } },
        axisLabel: {
          color: isDarkMode ? "#94a3b8" : "#64748b",
          fontSize: 11,
          formatter: (v: number) => (v > 0 ? `+${v}` : `${v}`),
        },
      },
      series: [
        {
          name: "Proyeksi Angin Zonal",
          type: "line",
          data: uVals,
          smooth: true,
          symbol: "circle",
          symbolSize: 8,
          itemStyle: {
            color: (params: any) => (params.value > 2.0 ? "#06b6d4" : params.value < -2.0 ? "#f59e0b" : "#94a3b8"),
          },
          lineStyle: { color: "#6366f1", width: 3 },
          areaStyle: {
            color: isDarkMode ? "rgba(99, 102, 241, 0.15)" : "rgba(99, 102, 241, 0.10)",
          },
          markLine: {
            symbol: "none",
            data: [
              {
                yAxis: 2.0,
                lineStyle: { color: "#06b6d4", type: "dashed" },
                label: { formatter: "Monsun Barat (+2)", position: "insideEndTop", color: "#06b6d4", fontSize: 9 },
              },
              {
                yAxis: -2.0,
                lineStyle: { color: "#f59e0b", type: "dashed" },
                label: { formatter: "Monsun Timur (-2)", position: "insideEndBottom", color: "#f59e0b", fontSize: 9 },
              },
            ],
          },
        },
      ],
    };
  }, [data.seasonalForecast, isDarkMode]);

  return (
    <div className="space-y-6">
      {/* Top Metrics Row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Status Monsun Card */}
        <Card className="border-none shadow-sm dark:bg-slate-900 bg-white">
          <CardContent className="p-4 flex flex-col justify-between h-[115px]">
            <div className="flex justify-between items-center">
              <span className="text-xs font-semibold text-slate-500">Status Monsun Terkini</span>
              <Wind className={`h-4 w-4 ${data.currentZonalWind > 2 ? "text-cyan-500" : data.currentZonalWind < -2 ? "text-amber-500" : "text-slate-400"}`} />
            </div>
            <div className="text-base font-extrabold text-slate-900 dark:text-slate-100 truncate">
              {data.status}
            </div>
            <div className="flex items-center gap-1.5 text-[11px] text-slate-500">
              <span className="font-mono font-bold text-slate-700 dark:text-slate-300">
                U = {data.currentZonalWind > 0 ? "+" : ""}{data.currentZonalWind} m/s
              </span>
            </div>
          </CardContent>
        </Card>

        {/* Kecepatan & Arah Angin Card */}
        <Card className="border-none shadow-sm dark:bg-slate-900 bg-white">
          <CardContent className="p-4 flex flex-col justify-between h-[115px]">
            <div className="flex justify-between items-center">
              <span className="text-xs font-semibold text-slate-500">Arah &amp; Kecepatan Angin</span>
              <Compass className="h-4 w-4 text-indigo-500" />
            </div>
            <div className="text-base font-extrabold text-slate-900 dark:text-slate-100 flex items-center gap-1.5">
              <span>{data.directionName}</span>
              <span className="text-xs font-mono font-normal text-slate-400">({data.currentWindDirection}°)</span>
            </div>
            <span className="text-[11px] text-slate-500 font-mono">
              {data.currentWindSpeedMs} m/s ({(data.currentWindSpeedMs * 3.6).toFixed(1)} km/jam)
            </span>
          </CardContent>
        </Card>

        {/* Musim Berjalan Card */}
        <Card className="border-none shadow-sm dark:bg-slate-900 bg-white">
          <CardContent className="p-4 flex flex-col justify-between h-[115px]">
            <div className="flex justify-between items-center">
              <span className="text-xs font-semibold text-slate-500">Fase Iklim Berjalan</span>
              {data.seasonType === "Musim Hujan" ? (
                <CloudRain className="h-4 w-4 text-cyan-500" />
              ) : (
                <Sun className="h-4 w-4 text-amber-500" />
              )}
            </div>
            <div className="text-base font-extrabold text-slate-900 dark:text-slate-100">
              {data.seasonType}
            </div>
            <span className="text-[11px] text-slate-400">
              {data.seasonType === "Musim Kemarau" ? "Jawa, Bali, NTB, NTT dominan kering" : "Potensi hujan meluas di Indonesia"}
            </span>
          </CardContent>
        </Card>

        {/* Titik Pantau Card */}
        <Card className="border-none shadow-sm dark:bg-slate-900 bg-white">
          <CardContent className="p-4 flex flex-col justify-between h-[115px]">
            <div className="flex justify-between items-center">
              <span className="text-xs font-semibold text-slate-500">Kotak Pemantauan IMI</span>
              <Calendar className="h-4 w-4 text-blue-500" />
            </div>
            <div className="text-sm font-bold text-slate-900 dark:text-slate-100 truncate">
              Laut Jawa - Selat Makassar
            </div>
            <span className="text-[11px] text-slate-400 font-mono">0°-10°S, 110°-130°E</span>
          </CardContent>
        </Card>
      </div>

      {/* Main Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Daily Zonal Wind 30-Day History & 16-Day Forecast (2 Cols) */}
        <Card className="border-none shadow-sm dark:bg-slate-900 bg-white lg:col-span-2">
          <CardHeader className="pb-2 border-b dark:border-slate-800 flex flex-row items-center justify-between">
            <div>
              <CardTitle className="text-base font-bold flex items-center gap-2 text-slate-900 dark:text-slate-100">
                <Activity className="h-4 w-4 text-indigo-500" /> Deret Waktu Angin Zonal Harian (U)
              </CardTitle>
              <CardDescription className="text-xs text-slate-500">
                Histori 30 hari terakhir &amp; prakiraan 16 hari ke depan (Open-Meteo GFS/IFS)
              </CardDescription>
            </div>
            <div className="flex items-center gap-2 text-xs">
              <Badge variant="outline" className="bg-cyan-50 dark:bg-cyan-950/40 text-cyan-700 dark:text-cyan-300 border-cyan-300 text-[10px]">
                Barat / Hujan (U &gt; +2)
              </Badge>
              <Badge variant="outline" className="bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300 border-amber-300 text-[10px]">
                Timur / Kemarau (U &lt; -2)
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="pt-4">
            <div className="h-[320px] w-full">
              <ReactECharts option={dailyChartOption} style={{ height: "100%", width: "100%" }} />
            </div>
          </CardContent>
        </Card>

        {/* Seasonal 7-Month Progression (1 Col) */}
        <Card className="border-none shadow-sm dark:bg-slate-900 bg-white">
          <CardHeader className="pb-2 border-b dark:border-slate-800">
            <CardTitle className="text-base font-bold flex items-center gap-2 text-slate-900 dark:text-slate-100">
              <TrendingUp className="h-4 w-4 text-indigo-500" /> Proyeksi Musiman (SEAS5)
            </CardTitle>
            <CardDescription className="text-xs text-slate-500">
              Evolusi transisi Monsun 7 bulan ke depan
            </CardDescription>
          </CardHeader>
          <CardContent className="pt-4">
            <div className="h-[320px] w-full">
              <ReactECharts option={seasonalChartOption} style={{ height: "100%", width: "100%" }} />
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};
