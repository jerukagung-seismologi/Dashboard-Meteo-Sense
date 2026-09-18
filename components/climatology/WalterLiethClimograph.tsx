// components/climatology/WalterLiethClimograph.tsx
"use client";

import React, { useMemo } from "react";
import ReactECharts from "echarts-for-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { CloudSun, Info, Mountain, Thermometer, Droplets, Compass, ShieldAlert } from "lucide-react";
import type { Wmo30YearNormals } from "@/lib/climatology/wmoNormals";

interface WalterLiethClimographProps {
  normals: Wmo30YearNormals | null;
  stationName?: string;
  isDarkMode?: boolean;
}

export function WalterLiethClimograph({
  normals,
  stationName = "Stasiun Terpilih",
  isDarkMode = false,
}: WalterLiethClimographProps) {
  const textColor = isDarkMode ? "#cbd5e1" : "#475569";
  const gridColor = isDarkMode ? "rgba(71, 85, 105, 0.2)" : "rgba(203, 213, 225, 0.25)";

  const chartOption = useMemo(() => {
    if (!normals) return {};

    const months = normals.monthly.map((m) => m.monthName);
    const temps = normals.monthly.map((m) => m.tempMean);
    const rains = normals.monthly.map((m) => m.precipMean);
    // Ambang batas ariditas Walter-Lieth (P = 2T) dalam satuan mm (sumbu kiri)
    const aridThresholds = temps.map((t) => Number((t * 2).toFixed(1)));

    // Skala hujan maksimal bulat ke atas kelipatan 50, minimal 150 mm
    const maxRain = Math.max(...rains);
    const rainMaxAxis = Math.max(150, Math.ceil(maxRain / 50) * 50);

    // Skala suhu udara WMO: 0 s.d. 50 °C (rentang meteorologis bumi yang realistis & standar WMO)
    const tempMinAxis = 0;
    const tempMaxAxis = 50;

    return {
      backgroundColor: "transparent",
      tooltip: {
        trigger: "axis",
        axisPointer: {
          type: "cross",
          crossStyle: { color: "#999" },
        },
        formatter: (params: any[]) => {
          if (!params || params.length === 0) return "";
          const monthIdx = params[0].dataIndex;
          const mData = normals.monthly[monthIdx];
          const isArid = mData.precipMean < mData.tempMean * 2;
          const netWater = mData.precipMean - mData.tempMean * 2;

          return `
            <div style="font-family: inherit; font-size: 12px; padding: 6px; min-width: 220px;">
              <strong style="font-size: 13px; color: ${isDarkMode ? "#fff" : "#0f172a"}; display: block; border-bottom: 1px solid ${isDarkMode ? "#334155" : "#e2e8f0"}; padding-bottom: 4px; margin-bottom: 6px;">
                ${mData.fullName} (Normal WMO 1991–2020)
              </strong>
              <div style="display: flex; flex-direction: column; gap: 4px;">
                <div style="display: flex; justify-content: space-between; gap: 16px;">
                  <span style="color: #ef4444; font-weight: 600;">● Suhu Udara Rerata (T):</span>
                  <strong style="color: #ef4444;">${mData.tempMean.toFixed(1)} °C</strong>
                </div>
                <div style="display: flex; justify-content: space-between; gap: 16px;">
                  <span style="color: #0284c7; font-weight: 600;">● Curah Hujan (P):</span>
                  <strong style="color: #0284c7;">${mData.precipMean.toFixed(1)} mm</strong>
                </div>
                <div style="display: flex; justify-content: space-between; gap: 16px;">
                  <span style="color: #f59e0b;">● Ambang Ariditas (2T):</span>
                  <strong style="color: #f59e0b;">${(mData.tempMean * 2).toFixed(1)} mm</strong>
                </div>
                <div style="display: flex; justify-content: space-between; gap: 16px; margin-top: 2px;">
                  <span style="color: #64748b;">Kondisi Bioklimat:</span>
                  <strong style="color: ${isArid ? "#ea580c" : "#0284c7"};">
                    ${isArid ? `Periode Arid / Kering (${netWater.toFixed(1)} mm)` : `Periode Humid / Basah (+${netWater.toFixed(1)} mm)`}
                  </strong>
                </div>
                <div style="font-size: 10px; color: #94a3b8; border-top: 1px solid ${isDarkMode ? "#334155" : "#e2e8f0"}; padding-top: 4px; margin-top: 4px;">
                  Suhu Ekstrem: ${mData.tempMinMean}°C s.d. ${mData.tempMaxMean}°C · Hari Hujan: ${mData.rainDaysMean} hari
                </div>
              </div>
            </div>
          `;
        },
      },
      legend: {
        data: ["Curah Hujan (P)", "Suhu Udara (T)", "Ambang Ariditas Walter-Lieth (P = 2T)"],
        textStyle: { color: textColor, fontSize: 11 },
        top: "2%",
      },
      grid: {
        left: "5%",
        right: "5%",
        bottom: "12%",
        top: "16%",
        containLabel: true,
      },
      xAxis: {
        type: "category",
        data: months,
        axisLine: { lineStyle: { color: textColor } },
        axisLabel: { color: textColor, fontWeight: "bold" },
        splitLine: { show: true, lineStyle: { color: gridColor, type: "dashed" } },
      },
      yAxis: [
        {
          type: "value",
          name: "Curah Hujan (mm)",
          min: 0,
          max: rainMaxAxis,
          position: "left",
          axisLabel: {
            color: "#0284c7",
            fontWeight: "bold",
            formatter: "{value} mm",
          },
          splitLine: { lineStyle: { color: gridColor } },
        },
        {
          type: "value",
          name: "Suhu Udara (°C)",
          min: tempMinAxis,
          max: tempMaxAxis,
          interval: 10,
          position: "right",
          axisLabel: {
            color: "#ef4444",
            fontWeight: "bold",
            formatter: "{value} °C",
          },
          splitLine: { show: false },
        },
      ],
      series: [
        {
          name: "Curah Hujan (P)",
          type: "line",
          yAxisIndex: 0,
          data: rains,
          smooth: true,
          symbol: "circle",
          symbolSize: 7,
          itemStyle: { color: "#0284c7" },
          lineStyle: { width: 3, color: "#0284c7" },
          areaStyle: {
            color: {
              type: "linear",
              x: 0,
              y: 0,
              x2: 0,
              y2: 1,
              colorStops: [
                { offset: 0, color: "rgba(2, 132, 199, 0.40)" },
                { offset: 0.8, color: "rgba(2, 132, 199, 0.10)" },
                { offset: 1, color: "rgba(2, 132, 199, 0.01)" },
              ],
            },
          },
          markLine: {
            silent: true,
            symbol: "none",
            data: [
              {
                yAxis: 100,
                lineStyle: { color: "#38bdf8", type: "dotted", width: 1.5 },
                label: {
                  formatter: "Bulan Basah Mohr (100 mm)",
                  position: "insideEndTop",
                  fontSize: 10,
                  color: "#0284c7",
                },
              },
              {
                yAxis: 60,
                lineStyle: { color: "#f59e0b", type: "dotted", width: 1.5 },
                label: {
                  formatter: "Bulan Kering Mohr (60 mm)",
                  position: "insideEndBottom",
                  fontSize: 10,
                  color: "#f59e0b",
                },
              },
            ],
          },
        },
        {
          name: "Ambang Ariditas Walter-Lieth (P = 2T)",
          type: "line",
          yAxisIndex: 0,
          data: aridThresholds,
          smooth: true,
          symbol: "circle",
          symbolSize: 5,
          itemStyle: { color: "#f59e0b" },
          lineStyle: { width: 2, type: "dashed", color: "#f59e0b" },
        },
        {
          name: "Suhu Udara (T)",
          type: "line",
          yAxisIndex: 1,
          data: temps,
          smooth: true,
          symbol: "diamond",
          symbolSize: 8,
          itemStyle: { color: "#ef4444" },
          lineStyle: { width: 3, color: "#ef4444" },
        },
      ],
    };
  }, [normals, isDarkMode, textColor, gridColor]);

  if (!normals) {
    return null;
  }

  // Identifikasi bulan kering vs lembap
  const aridMonths = normals.monthly.filter((m) => m.precipMean < m.tempMean * 2);
  const humidMonths = normals.monthly.filter((m) => m.precipMean >= m.tempMean * 2);

  return (
    <Card className="border-none shadow-sm dark:bg-slate-900 bg-white overflow-hidden">
      {/* Header Standar WMO Klimadiagramm */}
      <CardHeader className="pb-3 border-b dark:border-slate-800 bg-gradient-to-r from-blue-50/70 via-slate-50 to-indigo-50/70 dark:from-slate-900 dark:to-slate-900/50">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2 flex-wrap">
              <Badge variant="outline" className="bg-blue-100/70 text-blue-800 border-blue-300 dark:bg-blue-950/60 dark:text-blue-300 dark:border-blue-800 text-[10px] font-bold">
                WMO Standard No. 1203 / No. 100
              </Badge>
              <Badge variant="outline" className="bg-indigo-100/70 text-indigo-800 border-indigo-300 dark:bg-indigo-950/60 dark:text-indigo-300 dark:border-indigo-800 text-[10px]">
                Periode Normal: 1991–2020 (30 Tahun)
              </Badge>
            </div>
            <CardTitle className="text-lg font-extrabold tracking-tight flex items-center gap-2 text-slate-900 dark:text-slate-100">
              <CloudSun className="h-5 w-5 text-blue-500" />
              Diagram Iklim Walter-Lieth (Climograph WMO)
            </CardTitle>
            <CardDescription className="text-xs text-slate-500 dark:text-slate-400">
              Bioklimatologi rasio standar P = 2T (1°C = 2 mm): visualisasi simultan dinamika termal (0–50°C) dan ketersediaan air ekologis.
            </CardDescription>
          </div>

          {/* Metadata Stasiun Box ala Walter-Lieth */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 bg-white dark:bg-slate-800/90 p-3 rounded-xl border border-slate-200 dark:border-slate-700 text-xs shadow-xs">
            <div className="space-y-0.5">
              <span className="text-[10px] text-slate-400 flex items-center gap-1 font-medium">
                <Compass className="h-3 w-3 text-blue-500" /> Posisi
              </span>
              <div className="font-mono font-bold text-slate-800 dark:text-slate-200 text-[11px]">
                {normals.latitude.toFixed(2)}°, {normals.longitude.toFixed(2)}°
              </div>
            </div>

            <div className="space-y-0.5">
              <span className="text-[10px] text-slate-400 flex items-center gap-1 font-medium">
                <Mountain className="h-3 w-3 text-emerald-500" /> Elevasi
              </span>
              <div className="font-mono font-bold text-slate-800 dark:text-slate-200 text-[11px]">
                {normals.elevation} m dpl
              </div>
            </div>

            <div className="space-y-0.5">
              <span className="text-[10px] text-slate-400 flex items-center gap-1 font-medium">
                <Thermometer className="h-3 w-3 text-red-500" /> Rerata Suhu (T)
              </span>
              <div className="font-mono font-bold text-red-600 dark:text-red-400 text-[11px]">
                {normals.annual.tempMean.toFixed(1)} °C
              </div>
            </div>

            <div className="space-y-0.5">
              <span className="text-[10px] text-slate-400 flex items-center gap-1 font-medium">
                <Droplets className="h-3 w-3 text-cyan-500" /> Total Hujan (P)
              </span>
              <div className="font-mono font-bold text-blue-600 dark:text-blue-400 text-[11px]">
                {normals.annual.precipMean.toFixed(0)} mm/th
              </div>
            </div>
          </div>
        </div>
      </CardHeader>

      <CardContent className="p-4 space-y-4">
        {/* Main Climograph Chart */}
        <div className="h-[360px] w-full">
          <ReactECharts
            option={chartOption}
            style={{ height: "100%", width: "100%" }}
            opts={{ renderer: "svg" }}
          />
        </div>

        {/* Bioclimatic Summary Strip */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 pt-2 border-t dark:border-slate-800 text-xs">
          <div className="p-3 bg-blue-50/60 dark:bg-blue-950/30 rounded-xl border border-blue-200 dark:border-blue-900/40 space-y-1">
            <span className="font-bold text-blue-900 dark:text-blue-200 flex items-center gap-1.5">
              <Droplets className="h-3.5 w-3.5 text-blue-500" /> Periode Humid (Surplus Air)
            </span>
            <p className="text-[11px] text-blue-700 dark:text-blue-300">
              Terjadi selama <strong>{humidMonths.length} bulan</strong> ({humidMonths.map((m) => m.monthName).join(", ") || "Nihil"}), di mana presipitasi melampaui kurva suhu (P &ge; 2T). Ketersediaan air tanah berada dalam fase surplus optimal.
            </p>
          </div>

          <div className="p-3 bg-amber-50/60 dark:bg-amber-950/30 rounded-xl border border-amber-200 dark:border-amber-900/40 space-y-1">
            <span className="font-bold text-amber-900 dark:text-amber-200 flex items-center gap-1.5">
              <CloudSun className="h-3.5 w-3.5 text-amber-500" /> Periode Arid (Defisit / Cekaman Kering)
            </span>
            <p className="text-[11px] text-amber-700 dark:text-amber-300">
              Terjadi selama <strong>{aridMonths.length} bulan</strong> ({aridMonths.map((m) => m.monthName).join(", ") || "Tidak ada bulan arid"}), di mana curah hujan berada di bawah garis kritis 2T (P &lt; 2T).
            </p>
          </div>

          <div className="p-3 bg-slate-50 dark:bg-slate-800/60 rounded-xl border border-slate-200 dark:border-slate-700 space-y-1">
            <span className="font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
              <Info className="h-3.5 w-3.5 text-slate-500" /> Ekstremitas Musiman
            </span>
            <p className="text-[11px] text-slate-600 dark:text-slate-400">
              Bulan Terbasah: <strong className="text-blue-600 dark:text-blue-400">{normals.annual.wettestMonth.name} ({normals.annual.wettestMonth.rain.toFixed(0)} mm)</strong><br />
              Bulan Terkering: <strong className="text-amber-600 dark:text-amber-400">{normals.annual.driestMonth.name} ({normals.annual.driestMonth.rain.toFixed(0)} mm)</strong>
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
