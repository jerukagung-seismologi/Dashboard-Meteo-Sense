// components/validasi-bias/BiasResidualPlot.tsx
"use client";

import React, { useMemo } from "react";
import ReactECharts from "echarts-for-react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { MatchedObservationPair } from "@/lib/bias-correction/types";

interface BiasResidualPlotProps {
  pairs: MatchedObservationPair[];
  variableName: string;
  unit: string;
  isDarkMode?: boolean;
}

export const BiasResidualPlot: React.FC<BiasResidualPlotProps> = ({
  pairs,
  variableName,
  unit,
  isDarkMode = false,
}) => {
  const option = useMemo(() => {
    const rawResiduals = pairs
      .filter(p => p.aws_value != null && p.era5_value != null)
      .map(p => p.era5_value! - p.aws_value!);

    const corrResiduals = pairs
      .filter(p => p.aws_value != null && p.corrected_value != null)
      .map(p => p.corrected_value! - p.aws_value!);

    const all = [...rawResiduals, ...corrResiduals];
    if (all.length === 0) return {};

    const maxAbs = Math.max(...all.map(Math.abs), 2);
    const binCount = 21;
    const binWidth = (maxAbs * 2) / binCount;

    const binLabels: string[] = [];
    const rawCounts = new Array(binCount).fill(0);
    const corrCounts = new Array(binCount).fill(0);

    for (let i = 0; i < binCount; i++) {
      const center = -maxAbs + (i + 0.5) * binWidth;
      binLabels.push(center.toFixed(1));
    }

    rawResiduals.forEach(r => {
      const idx = Math.min(binCount - 1, Math.max(0, Math.floor((r + maxAbs) / binWidth)));
      rawCounts[idx]++;
    });

    corrResiduals.forEach(r => {
      const idx = Math.min(binCount - 1, Math.max(0, Math.floor((r + maxAbs) / binWidth)));
      corrCounts[idx]++;
    });

    return {
      backgroundColor: "transparent",
      tooltip: {
        trigger: "axis",
        backgroundColor: isDarkMode ? "#1e293b" : "#ffffff",
        borderColor: isDarkMode ? "#334155" : "#e2e8f0",
        textStyle: { color: isDarkMode ? "#f8fafc" : "#0f172a", fontSize: 11 },
      },
      legend: {
        top: 0,
        right: 10,
        textStyle: { color: isDarkMode ? "#94a3b8" : "#475569", fontSize: 11 },
        data: ["Residual Raw ERA5 (Model - AWS)", "Residual Corrected ERA5 (Terkoreksi - AWS)"],
      },
      grid: { left: "3%", right: "3%", bottom: "8%", top: "14%", containLabel: true },
      xAxis: {
        type: "category",
        name: `Selisih Residual (${unit})`,
        nameLocation: "middle",
        nameGap: 24,
        data: binLabels,
        axisLine: { lineStyle: { color: isDarkMode ? "#334155" : "#cbd5e1" } },
        axisLabel: { color: isDarkMode ? "#94a3b8" : "#64748b", fontSize: 10 },
      },
      yAxis: {
        type: "value",
        name: "Frekuensi (Jumlah Sampel)",
        splitLine: { lineStyle: { color: isDarkMode ? "#1e293b" : "#f1f5f9" } },
      },
      series: [
        {
          name: "Residual Raw ERA5 (Model - AWS)",
          type: "bar",
          data: rawCounts,
          itemStyle: { color: "rgba(244, 63, 94, 0.65)" },
        },
        {
          name: "Residual Corrected ERA5 (Terkoreksi - AWS)",
          type: "bar",
          data: corrCounts,
          itemStyle: { color: "rgba(16, 185, 129, 0.75)" },
          markLine: {
            data: [{ xAxis: `${binLabels[Math.floor(binCount / 2)]}` }],
            lineStyle: { color: "#2563eb", type: "dashed" },
            label: { formatter: "Bias Nol (Ideal)", fontSize: 10 },
          },
        },
      ],
    };
  }, [pairs, unit, isDarkMode]);

  return (
    <Card className="border-slate-200 dark:border-slate-800 shadow-sm bg-white dark:bg-slate-900">
      <CardHeader className="pb-2 border-b border-slate-100 dark:border-slate-800">
        <CardTitle className="text-sm font-bold text-slate-900 dark:text-slate-100">
          Distribusi Residual Error: (Model - Observasi)
        </CardTitle>
        <p className="text-xs text-slate-500 mt-0.5">
          Memperlihatkan pergeseran residual error menuju simetri di sekitar titik 0 setelah koreksi bias diterapkan.
        </p>
      </CardHeader>
      <CardContent className="pt-4">
        <div className="w-full h-80">
          <ReactECharts option={option} style={{ width: "100%", height: "100%" }} notMerge={true} />
        </div>
      </CardContent>
    </Card>
  );
};
