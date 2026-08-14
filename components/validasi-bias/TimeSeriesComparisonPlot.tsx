// components/validasi-bias/TimeSeriesComparisonPlot.tsx
"use client";

import React, { useMemo } from "react";
import ReactECharts from "echarts-for-react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { MatchedObservationPair, MeteorologicalVariable } from "@/lib/bias-correction/types";

interface TimeSeriesComparisonPlotProps {
  pairs: MatchedObservationPair[];
  variableName: string;
  unit: string;
  calibrationCutoffDate: string;
  isDarkMode?: boolean;
}

export const TimeSeriesComparisonPlot: React.FC<TimeSeriesComparisonPlotProps> = ({
  pairs,
  variableName,
  unit,
  calibrationCutoffDate,
  isDarkMode = false,
}) => {
  const option = useMemo(() => {
    const sorted = [...pairs].sort((a, b) => a.timestamp - b.timestamp);
    const timestamps = sorted.map(p => new Date(p.timestamp).toLocaleDateString("id-ID", { day: "2-digit", month: "short", hour: "2-digit" }));
    const awsValues = sorted.map(p => p.aws_value);
    const era5RawValues = sorted.map(p => p.era5_value);
    const era5CorrectedValues = sorted.map(p => p.corrected_value ?? null);

    return {
      backgroundColor: "transparent",
      tooltip: {
        trigger: "axis",
        backgroundColor: isDarkMode ? "#1e293b" : "#ffffff",
        borderColor: isDarkMode ? "#334155" : "#e2e8f0",
        textStyle: {
          color: isDarkMode ? "#f8fafc" : "#0f172a",
          fontSize: 12,
        },
        formatter: (params: any) => {
          if (!Array.isArray(params) || params.length === 0) return "";
          let html = `<div class="font-sans text-xs"><div class="font-bold mb-1 border-b pb-1 text-slate-500">${params[0].axisValue}</div>`;
          params.forEach((item: any) => {
            const val = item.value != null ? `${Number(item.value).toFixed(2)} ${unit}` : "—";
            html += `<div class="flex items-center justify-between gap-4 py-0.5">
              <span style="color:${item.color}">${item.marker} ${item.seriesName}:</span>
              <strong class="font-mono">${val}</strong>
            </div>`;
          });
          html += "</div>";
          return html;
        },
      },
      legend: {
        top: 0,
        right: 10,
        textStyle: { color: isDarkMode ? "#94a3b8" : "#475569", fontSize: 11 },
        data: ["AWS QC (Observasi Referensi)", "ERA5 Raw (Model)", "ERA5 Corrected (Terkoreksi)"],
      },
      grid: {
        left: "3%",
        right: "3%",
        bottom: "10%",
        top: "14%",
        containLabel: true,
      },
      xAxis: {
        type: "category",
        boundaryGap: false,
        data: timestamps,
        axisLine: { lineStyle: { color: isDarkMode ? "#334155" : "#cbd5e1" } },
        axisLabel: { color: isDarkMode ? "#94a3b8" : "#64748b", fontSize: 10 },
      },
      yAxis: {
        type: "value",
        scale: true, // Sangat penting: jangan pernah paksa minimum 0 untuk tekanan, suhu, dll.
        min: (val: { min: number; max: number }) => {
          if (unit === "mm" || (unit === "m/s" && val.min >= 0)) return 0;
          const pad = (val.max - val.min) * 0.1 || 1;
          return Number((val.min - pad).toFixed(1));
        },
        max: (val: { min: number; max: number }) => {
          const pad = (val.max - val.min) * 0.1 || 1;
          return Number((val.max + pad).toFixed(1));
        },
        name: unit,
        nameTextStyle: { color: isDarkMode ? "#94a3b8" : "#64748b", fontSize: 11 },
        splitLine: { lineStyle: { color: isDarkMode ? "#1e293b" : "#f1f5f9" } },
        axisLabel: { color: isDarkMode ? "#94a3b8" : "#64748b", fontSize: 10 },
      },
      dataZoom: [
        { type: "inside", start: 0, end: 100 },
        {
          type: "slider",
          bottom: 0,
          height: 20,
          borderColor: "transparent",
          backgroundColor: isDarkMode ? "#1e293b" : "#f8fafc",
          fillerColor: "rgba(59, 130, 246, 0.15)",
          textStyle: { color: isDarkMode ? "#64748b" : "#94a3b8", fontSize: 9 },
        },
      ],
      series: [
        {
          name: "AWS QC (Observasi Referensi)",
          type: "line",
          data: awsValues,
          smooth: true,
          sampling: "lttb",
          showSymbol: false,
          lineStyle: { width: 2.5, color: "#2563eb" }, // Blue
          itemStyle: { color: "#2563eb" },
        },
        {
          name: "ERA5 Raw (Model)",
          type: "line",
          data: era5RawValues,
          smooth: true,
          sampling: "lttb",
          showSymbol: false,
          lineStyle: { width: 1.5, type: "dashed", color: "#f43f5e" }, // Rose dashed
          itemStyle: { color: "#f43f5e" },
        },
        {
          name: "ERA5 Corrected (Terkoreksi)",
          type: "line",
          data: era5CorrectedValues,
          smooth: true,
          sampling: "lttb",
          showSymbol: false,
          lineStyle: { width: 2, color: "#10b981" }, // Emerald solid
          itemStyle: { color: "#10b981" },
          markLine: calibrationCutoffDate
            ? {
                symbol: ["none", "none"],
                label: {
                  formatter: "Batas Kalibrasi / Validasi",
                  position: "insideEndTop",
                  fontSize: 10,
                  color: isDarkMode ? "#e2e8f0" : "#334155",
                },
                lineStyle: { type: "dotted", color: "#8b5cf6", width: 2 },
                data: [{ xAxis: calibrationCutoffDate }],
              }
            : undefined,
        },
      ],
    };
  }, [pairs, unit, calibrationCutoffDate, isDarkMode]);

  return (
    <Card className="border-slate-200 dark:border-slate-800 shadow-sm bg-white dark:bg-slate-900">
      <CardHeader className="pb-2 border-b border-slate-100 dark:border-slate-800">
        <div className="flex justify-between items-center">
          <div>
            <CardTitle className="text-sm font-bold text-slate-900 dark:text-slate-100">
              Deret Waktu (Time Series): AWS vs ERA5 Raw vs ERA5 Corrected
            </CardTitle>
            <p className="text-xs text-slate-500 mt-0.5">
              Menampilkan ketiga dataset bersamaan untuk memverifikasi keselarasan temporal dan pengurangan bias.
            </p>
          </div>
        </div>
      </CardHeader>
      <CardContent className="pt-4">
        <div className="w-full h-80">
          <ReactECharts option={option} style={{ width: "100%", height: "100%" }} notMerge={true} />
        </div>
      </CardContent>
    </Card>
  );
};
