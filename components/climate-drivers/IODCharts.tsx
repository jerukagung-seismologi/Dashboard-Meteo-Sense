// components/climate-drivers/IODCharts.tsx
"use client";

import React, { useMemo } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Compass, TrendingUp, Layers } from "lucide-react";
import dynamic from "next/dynamic";
import { IodData } from "@/lib/climate-drivers/types";

const ReactECharts = dynamic(() => import("echarts-for-react"), {
  ssr: false,
  loading: () => (
    <div className="h-[300px] w-full flex items-center justify-center text-muted-foreground animate-pulse">
      Memuat Grafik IOD...
    </div>
  ),
});

interface IODChartsProps {
  data: IodData;
  isDarkMode?: boolean;
}

export const IODCharts: React.FC<IODChartsProps> = ({ data, isDarkMode = false }) => {
  const textColor = isDarkMode ? "#cbd5e1" : "#475569";
  const gridColor = isDarkMode ? "rgba(71, 85, 105, 0.2)" : "rgba(203, 213, 225, 0.2)";

  // 1. DMI Time Series Option
  const dmiOption = useMemo(() => {
    const dates = data.historicalDmi.map((d) => d.date);
    const values = data.historicalDmi.map((d) => d.dmi);

    return {
      tooltip: {
        trigger: "axis",
        formatter: (params: any) => {
          const p = params[0];
          const val = p.value;
          let statusStr = "🟢 IOD Netral";
          if (val >= 0.4) statusStr = "🟠 IOD Positif";
          if (val <= -0.4) statusStr = "🔵 IOD Negatif";

          return `<div class="font-semibold">${p.name}</div>
            <div class="text-xs mt-1">DMI: <span class="font-bold">${val >= 0 ? "+" : ""}${val.toFixed(2)}°C</span></div>
            <div class="text-xs mt-0.5">${statusStr}</div>`;
        },
      },
      grid: { left: "3%", right: "4%", top: "12%", bottom: "10%", containLabel: true },
      xAxis: {
        type: "category",
        data: dates,
        axisLabel: { color: textColor },
      },
      yAxis: {
        type: "value",
        name: "DMI (°C)",
        nameTextStyle: { color: textColor },
        axisLabel: { color: textColor },
        splitLine: { lineStyle: { color: gridColor } },
      },
      series: [
        {
          name: "Dipole Mode Index",
          type: "bar",
          data: values.map((val) => ({
            value: val,
            itemStyle: {
              color: val >= 0.4 ? "#f59e0b" : val <= -0.4 ? "#3b82f6" : "#10b981",
            },
          })),
          markLine: {
            silent: true,
            symbol: "none",
            data: [
              {
                yAxis: 0.4,
                lineStyle: { color: "#f59e0b", type: "dashed", width: 1.5 },
                label: { formatter: "IOD Positif (+0.4)", color: "#f59e0b", position: "insideEndTop" },
              },
              {
                yAxis: -0.4,
                lineStyle: { color: "#3b82f6", type: "dashed", width: 1.5 },
                label: { formatter: "IOD Negatif (-0.4)", color: "#3b82f6", position: "insideEndBottom" },
              },
              {
                yAxis: 0.0,
                lineStyle: { color: textColor, type: "dotted", width: 1 },
              },
            ],
          },
        },
      ],
    };
  }, [data, textColor, gridColor]);

  // 2. Historical Periods Comparison Option
  const periodsOption = useMemo(() => {
    const dates = data.historicalPeriods.map((d) => d.date);
    const values = data.historicalPeriods.map((d) => d.dmi);

    return {
      tooltip: {
        trigger: "axis",
        formatter: (params: any) => {
          const p = params[0];
          return `<div class="font-semibold">${p.name}</div>
            <div class="text-xs mt-1">DMI: <span class="font-bold">${p.value >= 0 ? "+" : ""}${p.value.toFixed(2)}°C</span></div>`;
        },
      },
      grid: { left: "3%", right: "4%", top: "12%", bottom: "10%", containLabel: true },
      xAxis: {
        type: "category",
        data: dates,
        axisLabel: { color: textColor },
      },
      yAxis: {
        type: "value",
        name: "DMI Anomaly (°C)",
        nameTextStyle: { color: textColor },
        axisLabel: { color: textColor },
        splitLine: { lineStyle: { color: gridColor } },
      },
      series: [
        {
          name: "Periode IOD",
          type: "line",
          data: values,
          smooth: true,
          lineStyle: { width: 3, color: "#d97706" },
          itemStyle: { color: "#d97706" },
          areaStyle: {
            color: {
              type: "linear",
              x: 0,
              y: 0,
              x2: 0,
              y2: 1,
              colorStops: [
                { offset: 0, color: "rgba(217, 119, 6, 0.25)" },
                { offset: 1, color: "rgba(217, 119, 6, 0.0)" },
              ],
            },
          },
        },
      ],
    };
  }, [data, textColor, gridColor]);

  return (
    <div className="space-y-6">
      {/* DMI Time Series */}
      <Card className="border-none shadow-sm dark:bg-slate-900 bg-white">
        <CardHeader>
          <CardTitle className="text-lg font-bold flex items-center gap-2">
            <Compass className="h-5 w-5 text-amber-500" /> Deret Waktu Indeks DMI (Dipole Mode Index)
          </CardTitle>
          <CardDescription>
            Batas ambang IOD Positif (+0.4°C) dan IOD Negatif (-0.4°C) berdasarkan perbedaan suhu perairan Samudra Hindia Barat & Timur
          </CardDescription>
        </CardHeader>
        <CardContent className="h-[320px] p-2">
          <ReactECharts option={dmiOption} style={{ height: "100%", width: "100%" }} />
        </CardContent>
      </Card>

      {/* Historical Periods Comparison */}
      <Card className="border-none shadow-sm dark:bg-slate-900 bg-white">
        <CardHeader>
          <CardTitle className="text-base font-bold flex items-center gap-2">
            <Layers className="h-5 w-5 text-amber-600" /> Perbandingan Periode IOD Positif vs Negatif
          </CardTitle>
          <CardDescription className="text-xs">
            Tren perubahan fase dipol Samudra Hindia antar kuartal
          </CardDescription>
        </CardHeader>
        <CardContent className="h-[280px] p-2">
          <ReactECharts option={periodsOption} style={{ height: "100%", width: "100%" }} />
        </CardContent>
      </Card>
    </div>
  );
};
