// components/climatology/SpiDroughtSection.tsx
"use client";

import React, { useState, useMemo } from "react";
import ReactECharts from "echarts-for-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { CloudRain, AlertTriangle, CheckCircle, Info, ShieldAlert } from "lucide-react";
import type { SpiSeriesResult, SpiPoint } from "@/lib/climatology/spiCalculator";

interface SpiDroughtSectionProps {
  spiData: {
    spi1: SpiSeriesResult;
    spi3: SpiSeriesResult;
    spi6: SpiSeriesResult;
    spi12: SpiSeriesResult;
  } | null;
  isDarkMode?: boolean;
}

export function SpiDroughtSection({ spiData, isDarkMode = false }: SpiDroughtSectionProps) {
  const [activeTimescale, setActiveTimescale] = useState<"1" | "3" | "6" | "12">("3");

  const currentSeries: SpiSeriesResult | null = useMemo(() => {
    if (!spiData) return null;
    if (activeTimescale === "1") return spiData.spi1;
    if (activeTimescale === "3") return spiData.spi3;
    if (activeTimescale === "6") return spiData.spi6;
    return spiData.spi12;
  }, [spiData, activeTimescale]);

  const textColor = isDarkMode ? "#cbd5e1" : "#475569";
  const gridColor = isDarkMode ? "rgba(71, 85, 105, 0.2)" : "rgba(203, 213, 225, 0.25)";

  const chartOption = useMemo(() => {
    if (!currentSeries || currentSeries.points.length === 0) return {};

    const dates = currentSeries.points.map((p) => p.dateStr);
    const spiValues = currentSeries.points.map((p) => p.spiValue);

    return {
      backgroundColor: "transparent",
      tooltip: {
        trigger: "axis",
        axisPointer: { type: "shadow" },
        formatter: (params: any[]) => {
          if (!params || params.length === 0) return "";
          const ptIdx = params[0].dataIndex;
          const pt = currentSeries.points[ptIdx];

          return `
            <div style="font-family: inherit; font-size: 12px; padding: 4px;">
              <strong style="font-size: 13px; color: ${isDarkMode ? "#fff" : "#0f172a"};">
                Periode: ${pt.dateStr}
              </strong>
              <div style="margin-top: 6px; display: flex; flex-direction: column; gap: 4px;">
                <div style="display: flex; justify-content: space-between; gap: 16px;">
                  <span>Nilai SPI:</span>
                  <strong style="color: ${pt.category.color}; font-family: monospace; font-size: 13px;">
                    ${pt.spiValue > 0 ? `+${pt.spiValue.toFixed(2)}` : pt.spiValue.toFixed(2)}
                  </strong>
                </div>
                <div style="display: flex; justify-content: space-between; gap: 16px;">
                  <span>Kategori WMO:</span>
                  <strong style="color: ${pt.category.color};">${pt.category.labelId}</strong>
                </div>
                <div style="display: flex; justify-content: space-between; gap: 16px;">
                  <span>Akumulasi Hujan:</span>
                  <strong>${pt.rainSum.toFixed(1)} mm</strong>
                </div>
                <div style="font-size: 10px; color: #94a3b8; border-top: 1px solid #e2e8f0; padding-top: 4px; margin-top: 2px;">
                  ${pt.category.description}
                </div>
              </div>
            </div>
          `;
        },
      },
      grid: {
        left: "4%",
        right: "4%",
        bottom: "12%",
        top: "14%",
        containLabel: true,
      },
      xAxis: {
        type: "category",
        data: dates,
        axisLine: { lineStyle: { color: textColor } },
        axisLabel: {
          color: textColor,
          fontSize: 10,
          rotate: dates.length > 24 ? 45 : 0,
        },
      },
      yAxis: {
        type: "value",
        name: "Indeks SPI (z-score)",
        min: -3.0,
        max: 3.0,
        interval: 1.0,
        axisLabel: {
          color: textColor,
          formatter: (val: number) => (val > 0 ? `+${val}` : `${val}`),
        },
        splitLine: { lineStyle: { color: gridColor } },
      },
      visualMap: {
        show: false,
        dimension: 1,
        pieces: [
          { gte: 2.0, color: "#1e40af" }, // Extremely wet
          { gte: 1.5, lt: 2.0, color: "#0284c7" }, // Severely wet
          { gte: 1.0, lt: 1.5, color: "#06b6d4" }, // Moderately wet
          { gt: -1.0, lt: 1.0, color: "#10b981" }, // Near normal
          { lte: -1.0, gt: -1.5, color: "#f59e0b" }, // Moderately dry
          { lte: -1.5, gt: -2.0, color: "#f97316" }, // Severely dry
          { lte: -2.0, color: "#ef4444" }, // Extremely dry
        ],
      },
      series: [
        {
          name: "SPI",
          type: "bar",
          data: spiValues,
          barMaxWidth: 16,
          itemStyle: { borderRadius: [3, 3, 0, 0] },
          markLine: {
            silent: true,
            symbol: "none",
            data: [
              { yAxis: 0, lineStyle: { color: textColor, width: 1.5 } },
              { yAxis: 1.0, lineStyle: { color: "#06b6d4", type: "dashed" }, label: { formatter: "+1.0 Cukup Basah", position: "insideEndTop", fontSize: 9 } },
              { yAxis: -1.0, lineStyle: { color: "#f59e0b", type: "dashed" }, label: { formatter: "-1.0 Agak Kering", position: "insideEndBottom", fontSize: 9 } },
              { yAxis: -1.5, lineStyle: { color: "#f97316", type: "dashed" }, label: { formatter: "-1.5 Siaga Kering", position: "insideEndBottom", fontSize: 9 } },
              { yAxis: -2.0, lineStyle: { color: "#ef4444", type: "dashed" }, label: { formatter: "-2.0 Ekstrem", position: "insideEndBottom", fontSize: 9 } },
            ],
          },
        },
      ],
    };
  }, [currentSeries, isDarkMode, textColor, gridColor]);

  if (!spiData) return null;

  const currentSpi = currentSeries?.currentSpi;

  return (
    <Card className="border-none shadow-sm dark:bg-slate-900 bg-white overflow-hidden">
      <CardHeader className="pb-3 border-b dark:border-slate-800 bg-gradient-to-r from-amber-50/50 via-slate-50 to-blue-50/50 dark:from-slate-900 dark:to-slate-900/50">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2 flex-wrap">
              <Badge variant="outline" className="bg-amber-100 text-amber-900 dark:bg-amber-950 dark:text-amber-200 border-amber-300 text-[10px] font-bold">
                Standar WMO-No. 1090
              </Badge>
              <Badge variant="outline" className="bg-slate-100 text-slate-800 dark:bg-slate-800 dark:text-slate-300 text-[10px]">
                McKee et al. (1993)
              </Badge>
            </div>
            <CardTitle className="text-lg font-extrabold tracking-tight flex items-center gap-2 text-slate-900 dark:text-slate-100">
              <ShieldAlert className="h-5 w-5 text-amber-500" />
              Monitoring Kekeringan SPI (Standardized Precipitation Index)
            </CardTitle>
            <CardDescription className="text-xs text-slate-500 dark:text-slate-400">
              Transformasi distribusi Gamma untuk deteksi anomali defisit hujan multiskala: meteorologis, agrikultur, hingga hidrologis.
            </CardDescription>
          </div>

          {/* Timescale Selector Tabs */}
          <Tabs value={activeTimescale} onValueChange={(v) => setActiveTimescale(v as any)}>
            <TabsList className="bg-slate-100 dark:bg-slate-800 p-1">
              <TabsTrigger value="1" className="text-xs px-3 py-1.5 font-bold">
                SPI-1 (1 Bln)
              </TabsTrigger>
              <TabsTrigger value="3" className="text-xs px-3 py-1.5 font-bold">
                SPI-3 (Musim)
              </TabsTrigger>
              <TabsTrigger value="6" className="text-xs px-3 py-1.5 font-bold">
                SPI-6 (Hidro)
              </TabsTrigger>
              <TabsTrigger value="12" className="text-xs px-3 py-1.5 font-bold">
                SPI-12 (Tahunan)
              </TabsTrigger>
            </TabsList>
          </Tabs>
        </div>
      </CardHeader>

      <CardContent className="p-4 space-y-5">
        {/* KPI Strip Status Terkini */}
        {currentSpi && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 p-3 bg-slate-50 dark:bg-slate-800/60 rounded-xl border border-slate-200 dark:border-slate-700 text-xs">
            <div className="space-y-0.5">
              <span className="text-[10px] text-slate-400 font-semibold uppercase">Skala Waktu Aktif</span>
              <div className="font-bold text-slate-900 dark:text-slate-100 text-sm">
                {currentSeries?.title}
              </div>
              <p className="text-[11px] text-slate-500">{currentSeries?.application}</p>
            </div>

            <div className="space-y-0.5 md:border-l dark:border-slate-700 md:pl-3">
              <span className="text-[10px] text-slate-400 font-semibold uppercase">Nilai SPI Terkini ({currentSpi.dateStr})</span>
              <div className="flex items-center gap-2">
                <span className="text-2xl font-black font-mono" style={{ color: currentSpi.category.color }}>
                  {currentSpi.spiValue > 0 ? `+${currentSpi.spiValue.toFixed(2)}` : currentSpi.spiValue.toFixed(2)}
                </span>
                <Badge className={`text-[10px] font-bold ${currentSpi.category.badgeBg}`}>
                  {currentSpi.category.labelId}
                </Badge>
              </div>
              <p className="text-[11px] text-slate-500">Akumulasi presipitasi periode: <strong>{currentSpi.rainSum.toFixed(1)} mm</strong></p>
            </div>

            <div className="space-y-0.5 md:border-l dark:border-slate-700 md:pl-3">
              <span className="text-[10px] text-slate-400 font-semibold uppercase">Implikasi &amp; Peringatan Dini</span>
              <p className="text-[11px] text-slate-700 dark:text-slate-300 font-medium">
                {currentSpi.category.description}
              </p>
            </div>
          </div>
        )}

        {/* ECharts SPI Bar Chart */}
        <div className="h-[340px] w-full">
          <ReactECharts option={chartOption} style={{ height: "100%", width: "100%" }} opts={{ renderer: "svg" }} />
        </div>

        {/* WMO Official Scale Guide Legend */}
        <div className="border-t dark:border-slate-800 pt-3">
          <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block mb-2">
            Standar Kategori Tingkat Kekeringan &amp; Kebasahan WMO:
          </span>
          <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-2 text-[10px] text-center">
            <div className="p-2 rounded-lg bg-blue-900 text-white font-semibold">
              ≥ +2.00
              <span className="block text-[9px] font-normal opacity-90">Amat Sangat Basah</span>
            </div>
            <div className="p-2 rounded-lg bg-sky-600 text-white font-semibold">
              +1.50 s.d. +1.99
              <span className="block text-[9px] font-normal opacity-90">Sangat Basah</span>
            </div>
            <div className="p-2 rounded-lg bg-cyan-600 text-white font-semibold">
              +1.00 s.d. +1.49
              <span className="block text-[9px] font-normal opacity-90">Cukup Basah</span>
            </div>
            <div className="p-2 rounded-lg bg-emerald-600 text-white font-semibold">
              -0.99 s.d. +0.99
              <span className="block text-[9px] font-normal opacity-90">Normal / Wajar</span>
            </div>
            <div className="p-2 rounded-lg bg-amber-600 text-white font-semibold">
              -1.00 s.d. -1.49
              <span className="block text-[9px] font-normal opacity-90">Agak Kering</span>
            </div>
            <div className="p-2 rounded-lg bg-orange-600 text-white font-semibold">
              -1.50 s.d. -1.99
              <span className="block text-[9px] font-normal opacity-90">Sangat Kering</span>
            </div>
            <div className="p-2 rounded-lg bg-red-600 text-white font-semibold">
              ≤ -2.00
              <span className="block text-[9px] font-normal opacity-90">Amat Sangat Kering</span>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
