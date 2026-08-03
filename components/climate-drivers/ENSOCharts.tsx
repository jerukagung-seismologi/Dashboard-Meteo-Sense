// components/climate-drivers/ENSOCharts.tsx
"use client";

import React, { useMemo } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Waves, TrendingUp, BarChart2 } from "lucide-react";
import dynamic from "next/dynamic";
import { EnsoData } from "@/lib/climate-drivers/types";

const ReactECharts = dynamic(() => import("echarts-for-react"), {
  ssr: false,
  loading: () => (
    <div className="h-[300px] w-full flex items-center justify-center text-muted-foreground animate-pulse">
      Memuat Grafik ENSO...
    </div>
  ),
});

interface ENSOChartsProps {
  data: EnsoData;
  isDarkMode?: boolean;
}

export const ENSOCharts: React.FC<ENSOChartsProps> = ({ data, isDarkMode = false }) => {
  const textColor = isDarkMode ? "#cbd5e1" : "#475569";
  const gridColor = isDarkMode ? "rgba(71, 85, 105, 0.2)" : "rgba(203, 213, 225, 0.2)";

  // 1. ONI Chart Option
  const oniOption = useMemo(() => {
    const dates = data.historicalOni.map((d) => d.date);
    const values = data.historicalOni.map((d) => d.oni);

    return {
      tooltip: {
        trigger: "axis",
        formatter: (params: any) => {
          const p = params[0];
          const val = p.value;
          let statusStr = "🟢 Netral";
          if (val >= 0.5) statusStr = "🔴 El Niño";
          if (val <= -0.5) statusStr = "🔵 La Niña";

          return `<div class="font-semibold">${p.name}</div>
            <div class="text-xs mt-1">ONI: <span class="font-bold">${val >= 0 ? "+" : ""}${val.toFixed(1)}°C</span></div>
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
        name: "ONI (°C)",
        nameTextStyle: { color: textColor },
        axisLabel: { color: textColor },
        splitLine: { lineStyle: { color: gridColor } },
      },
      series: [
        {
          name: "Indeks ONI",
          type: "bar",
          data: values.map((val) => ({
            value: val,
            itemStyle: {
              color: val >= 0.5 ? "#ef4444" : val <= -0.5 ? "#3b82f6" : "#10b981",
            },
          })),
          markLine: {
            silent: true,
            symbol: "none",
            data: [
              {
                yAxis: 0.5,
                lineStyle: { color: "#ef4444", type: "dashed", width: 1.5 },
                label: { formatter: "El Niño (+0.5)", color: "#ef4444", position: "insideEndTop" },
              },
              {
                yAxis: -0.5,
                lineStyle: { color: "#3b82f6", type: "dashed", width: 1.5 },
                label: { formatter: "La Niña (-0.5)", color: "#3b82f6", position: "insideEndBottom" },
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

  // 2. Niño 3.4 SST Anomaly Option
  const nino34Option = useMemo(() => {
    const dates = data.historicalNino34.map((d) => d.date);
    const values = data.historicalNino34.map((d) => d.value);

    return {
      tooltip: {
        trigger: "axis",
        formatter: (params: any) => {
          const p = params[0];
          return `<div class="font-semibold">${p.name}</div>
            <div class="text-xs mt-1">Anomali Niño 3.4: <span class="font-bold">${p.value >= 0 ? "+" : ""}${p.value.toFixed(2)}°C</span></div>`;
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
        name: "SST Anomaly (°C)",
        nameTextStyle: { color: textColor },
        axisLabel: { color: textColor },
        splitLine: { lineStyle: { color: gridColor } },
      },
      series: [
        {
          name: "Niño 3.4 Anomaly",
          type: "line",
          data: values,
          smooth: true,
          lineStyle: { width: 3, color: "#8b5cf6" },
          itemStyle: { color: "#8b5cf6" },
          areaStyle: {
            color: {
              type: "linear",
              x: 0,
              y: 0,
              x2: 0,
              y2: 1,
              colorStops: [
                { offset: 0, color: "rgba(139, 92, 246, 0.25)" },
                { offset: 1, color: "rgba(139, 92, 246, 0.0)" },
              ],
            },
          },
        },
      ],
    };
  }, [data, textColor, gridColor]);

  // 3. SOI Option
  const soiOption = useMemo(() => {
    const dates = data.historicalSoi.map((d) => d.date);
    const values = data.historicalSoi.map((d) => d.value);

    return {
      tooltip: {
        trigger: "axis",
        formatter: (params: any) => {
          const p = params[0];
          return `<div class="font-semibold">${p.name}</div>
            <div class="text-xs mt-1">SOI Index: <span class="font-bold">${p.value >= 0 ? "+" : ""}${p.value.toFixed(1)}</span></div>`;
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
        name: "SOI Index",
        nameTextStyle: { color: textColor },
        axisLabel: { color: textColor },
        splitLine: { lineStyle: { color: gridColor } },
      },
      series: [
        {
          name: "SOI",
          type: "bar",
          data: values.map((val) => ({
            value: val,
            itemStyle: {
              color: val >= 7 ? "#3b82f6" : val <= -7 ? "#ef4444" : "#64748b",
            },
          })),
        },
      ],
    };
  }, [data, textColor, gridColor]);

  return (
    <div className="space-y-6">
      {/* ONI Time Series */}
      <Card className="border-none shadow-sm dark:bg-slate-900 bg-white">
        <CardHeader>
          <CardTitle className="text-lg font-bold flex items-center gap-2">
            <Waves className="h-5 w-5 text-blue-500" /> Deret Waktu Indeks ONI (Oceanic Niño Index)
          </CardTitle>
          <CardDescription>
            Batas ambang El Niño (+0.5°C) dan La Niña (-0.5°C) berdasarkan rata-rata berjalan 3 bulanan suhu permukaan laut Pasifik 3.4
          </CardDescription>
        </CardHeader>
        <CardContent className="h-[320px] p-2">
          <ReactECharts option={oniOption} style={{ height: "100%", width: "100%" }} />
        </CardContent>
      </Card>

      {/* Grid for Niño 3.4 and SOI */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card className="border-none shadow-sm dark:bg-slate-900 bg-white">
          <CardHeader>
            <CardTitle className="text-base font-bold flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-purple-500" /> Anomali Suhu Perairan Niño 3.4
            </CardTitle>
            <CardDescription className="text-xs">
              Suhu permukaan laut kawasan Pasifik Tengah (5°N-5°S, 170°W-120°W)
            </CardDescription>
          </CardHeader>
          <CardContent className="h-[280px] p-2">
            <ReactECharts option={nino34Option} style={{ height: "100%", width: "100%" }} />
          </CardContent>
        </Card>

        <Card className="border-none shadow-sm dark:bg-slate-900 bg-white">
          <CardHeader>
            <CardTitle className="text-base font-bold flex items-center gap-2">
              <BarChart2 className="h-5 w-5 text-emerald-500" /> Indeks SOI (Southern Oscillation Index)
            </CardTitle>
            <CardDescription className="text-xs">
              Perbedaan tekanan udara permukaan laut antara Tahiti dan Darwin (Australia)
            </CardDescription>
          </CardHeader>
          <CardContent className="h-[280px] p-2">
            <ReactECharts option={soiOption} style={{ height: "100%", width: "100%" }} />
          </CardContent>
        </Card>
      </div>
    </div>
  );
};
