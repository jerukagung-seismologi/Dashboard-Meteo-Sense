// components/validasi-bias/ScatterComparisonPlot.tsx
"use client";

import React, { useMemo } from "react";
import ReactECharts from "echarts-for-react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { MatchedObservationPair } from "@/lib/bias-correction/types";

interface ScatterComparisonPlotProps {
  pairs: MatchedObservationPair[];
  variableName: string;
  unit: string;
  isDarkMode?: boolean;
}

export const ScatterComparisonPlot: React.FC<ScatterComparisonPlotProps> = ({
  pairs,
  variableName,
  unit,
  isDarkMode = false,
}) => {
  const { rawScatterData, correctedScatterData, minVal, maxVal } = useMemo(() => {
    const rawData: [number, number][] = [];
    const corrData: [number, number][] = [];

    let min = Infinity;
    let max = -Infinity;

    const step = pairs.length > 1500 ? Math.ceil(pairs.length / 1500) : 1;

    for (let i = 0; i < pairs.length; i += step) {
      const p = pairs[i];
      if (p.aws_value != null && p.era5_value != null) {
        rawData.push([p.era5_value, p.aws_value]);
        min = Math.min(min, p.era5_value, p.aws_value);
        max = Math.max(max, p.era5_value, p.aws_value);
      }
      if (p.aws_value != null && p.corrected_value != null) {
        corrData.push([p.corrected_value, p.aws_value]);
        min = Math.min(min, p.corrected_value, p.aws_value);
        max = Math.max(max, p.corrected_value, p.aws_value);
      }
    }

    if (min === Infinity) {
      min = 0;
      max = 100;
    } else {
      const padding = (max - min) * 0.05 || 2;
      min = Math.floor(min - padding);
      max = Math.ceil(max + padding);
    }

    return { rawScatterData: rawData, correctedScatterData: corrData, minVal: min, maxVal: max };
  }, [pairs]);

  const option = useMemo(() => {
    return {
      backgroundColor: "transparent",
      tooltip: {
        trigger: "item",
        backgroundColor: isDarkMode ? "#1e293b" : "#ffffff",
        borderColor: isDarkMode ? "#334155" : "#e2e8f0",
        textStyle: { color: isDarkMode ? "#f8fafc" : "#0f172a", fontSize: 11 },
        formatter: (params: any) => {
          if (!params.data) return "";
          return `<div class="text-xs">
            <strong class="block mb-1 text-slate-500">${params.seriesName}</strong>
            Model (X): <strong class="font-mono">${params.data[0].toFixed(2)} ${unit}</strong><br/>
            AWS Ref (Y): <strong class="font-mono">${params.data[1].toFixed(2)} ${unit}</strong>
          </div>`;
        },
      },
      legend: {
        top: 0,
        right: 10,
        textStyle: { color: isDarkMode ? "#94a3b8" : "#475569", fontSize: 11 },
        data: ["Raw ERA5 vs AWS", "Corrected ERA5 vs AWS", "Garis Ideal 1:1"],
      },
      grid: {
        left: "3%",
        right: "3%",
        bottom: "8%",
        top: "14%",
        containLabel: true,
      },
      xAxis: {
        type: "value",
        scale: true,
        name: `Nilai Model (${unit})`,
        nameLocation: "middle",
        nameGap: 24,
        min: minVal,
        max: maxVal,
        axisLine: { lineStyle: { color: isDarkMode ? "#334155" : "#cbd5e1" } },
        axisLabel: { color: isDarkMode ? "#94a3b8" : "#64748b", fontSize: 10 },
        splitLine: { lineStyle: { color: isDarkMode ? "#1e293b" : "#f1f5f9" } },
      },
      yAxis: {
        type: "value",
        scale: true,
        name: `AWS Observasi (${unit})`,
        min: minVal,
        max: maxVal,
        axisLine: { lineStyle: { color: isDarkMode ? "#334155" : "#cbd5e1" } },
        axisLabel: { color: isDarkMode ? "#94a3b8" : "#64748b", fontSize: 10 },
        splitLine: { lineStyle: { color: isDarkMode ? "#1e293b" : "#f1f5f9" } },
      },
      series: [
        {
          name: "Raw ERA5 vs AWS",
          type: "scatter",
          symbolSize: 6,
          data: rawScatterData,
          itemStyle: { color: "rgba(244, 63, 94, 0.45)" }, // Translucent rose
        },
        {
          name: "Corrected ERA5 vs AWS",
          type: "scatter",
          symbolSize: 6,
          data: correctedScatterData,
          itemStyle: { color: "rgba(16, 185, 129, 0.65)" }, // Translucent emerald
        },
        {
          name: "Garis Ideal 1:1",
          type: "line",
          data: [
            [minVal, minVal],
            [maxVal, maxVal],
          ],
          symbol: "none",
          lineStyle: { type: "dashed", color: isDarkMode ? "#64748b" : "#94a3b8", width: 1.5 },
        },
      ],
    };
  }, [rawScatterData, correctedScatterData, minVal, maxVal, unit, isDarkMode]);

  return (
    <Card className="border-slate-200 dark:border-slate-800 shadow-sm bg-white dark:bg-slate-900">
      <CardHeader className="pb-2 border-b border-slate-100 dark:border-slate-800">
        <CardTitle className="text-sm font-bold text-slate-900 dark:text-slate-100">
          Scatter Plot: Evaluasi Kesesuaian vs Garis 1:1
        </CardTitle>
        <p className="text-xs text-slate-500 mt-0.5">
          Perbandingan penyebaran titik model sebelum (merah) dan sesudah (hijau) koreksi terhadap garis identitas 1:1.
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
