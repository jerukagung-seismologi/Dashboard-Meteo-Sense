// components/validasi-bias/DistributionComparisonPlot.tsx
"use client";

import React, { useMemo, useState } from "react";
import ReactECharts from "echarts-for-react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { MatchedObservationPair } from "@/lib/bias-correction/types";

interface DistributionComparisonPlotProps {
  pairs: MatchedObservationPair[];
  variableName: string;
  unit: string;
  isDarkMode?: boolean;
}

export const DistributionComparisonPlot: React.FC<DistributionComparisonPlotProps> = ({
  pairs,
  variableName,
  unit,
  isDarkMode = false,
}) => {
  const [viewType, setViewType] = useState<"histogram" | "ecdf">("ecdf");

  const option = useMemo(() => {
    const awsVals = pairs.map(p => p.aws_value).filter((v): v is number => v != null).sort((a, b) => a - b);
    const era5RawVals = pairs.map(p => p.era5_value).filter((v): v is number => v != null).sort((a, b) => a - b);
    const era5CorrVals = pairs.map(p => p.corrected_value).filter((v): v is number => v != null).sort((a, b) => a - b);

    if (viewType === "ecdf") {
      // Build ECDF curves
      const buildECDF = (sorted: number[]) => {
        const n = sorted.length;
        if (n === 0) return [];
        return sorted.map((val, idx) => [val, (idx + 1) / n]);
      };

      return {
        backgroundColor: "transparent",
        tooltip: {
          trigger: "axis",
          backgroundColor: isDarkMode ? "#1e293b" : "#ffffff",
          borderColor: isDarkMode ? "#334155" : "#e2e8f0",
          textStyle: { color: isDarkMode ? "#f8fafc" : "#0f172a", fontSize: 11 },
          formatter: (params: any) => {
            if (!Array.isArray(params)) return "";
            let html = `<div class="text-xs font-sans"><div class="font-bold mb-1 border-b pb-1 text-slate-500">Nilai: ${params[0].axisValue} ${unit}</div>`;
            params.forEach((item: any) => {
              const prob = item.data ? `${(item.data[1] * 100).toFixed(1)}%` : "—";
              html += `<div class="flex items-center justify-between gap-3 py-0.5">
                <span style="color:${item.color}">${item.seriesName}:</span>
                <strong class="font-mono">F(x) = ${prob}</strong>
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
          data: ["AWS QC (Observasi)", "ERA5 Raw (Model)", "ERA5 Corrected (Terkoreksi)"],
        },
        grid: { left: "3%", right: "3%", bottom: "8%", top: "14%", containLabel: true },
        xAxis: {
          type: "value",
          scale: true,
          name: unit,
          axisLine: { lineStyle: { color: isDarkMode ? "#334155" : "#cbd5e1" } },
          axisLabel: { color: isDarkMode ? "#94a3b8" : "#64748b", fontSize: 10 },
          splitLine: { lineStyle: { color: isDarkMode ? "#1e293b" : "#f1f5f9" } },
        },
        yAxis: {
          type: "value",
          name: "Probabilitas Kumulatif F(x)",
          min: 0,
          max: 1,
          axisLine: { lineStyle: { color: isDarkMode ? "#334155" : "#cbd5e1" } },
          axisLabel: { color: isDarkMode ? "#94a3b8" : "#64748b", fontSize: 10 },
          splitLine: { lineStyle: { color: isDarkMode ? "#1e293b" : "#f1f5f9" } },
        },
        series: [
          {
            name: "AWS QC (Observasi)",
            type: "line",
            data: buildECDF(awsVals),
            showSymbol: false,
            step: "end",
            lineStyle: { width: 2.5, color: "#2563eb" },
          },
          {
            name: "ERA5 Raw (Model)",
            type: "line",
            data: buildECDF(era5RawVals),
            showSymbol: false,
            step: "end",
            lineStyle: { width: 1.5, type: "dashed", color: "#f43f5e" },
          },
          {
            name: "ERA5 Corrected (Terkoreksi)",
            type: "line",
            data: buildECDF(era5CorrVals),
            showSymbol: false,
            step: "end",
            lineStyle: { width: 2, color: "#10b981" },
          },
        ],
      };
    } else {
      // Histogram binning
      const allVals = [...awsVals, ...era5RawVals, ...era5CorrVals];
      const min = allVals.length > 0 ? Math.min(...allVals) : 0;
      const max = allVals.length > 0 ? Math.max(...allVals) : 100;
      const binCount = 15;
      const binWidth = (max - min) / binCount || 1;

      const binLabels: string[] = [];
      const awsCounts = new Array(binCount).fill(0);
      const era5RawCounts = new Array(binCount).fill(0);
      const era5CorrCounts = new Array(binCount).fill(0);

      for (let i = 0; i < binCount; i++) {
        const bMin = min + i * binWidth;
        const bMax = bMin + binWidth;
        binLabels.push(`${bMin.toFixed(1)}`);
      }

      awsVals.forEach(v => {
        const idx = Math.min(binCount - 1, Math.max(0, Math.floor((v - min) / binWidth)));
        awsCounts[idx]++;
      });
      era5RawVals.forEach(v => {
        const idx = Math.min(binCount - 1, Math.max(0, Math.floor((v - min) / binWidth)));
        era5RawCounts[idx]++;
      });
      era5CorrVals.forEach(v => {
        const idx = Math.min(binCount - 1, Math.max(0, Math.floor((v - min) / binWidth)));
        era5CorrCounts[idx]++;
      });

      return {
        backgroundColor: "transparent",
        tooltip: { trigger: "axis" },
        legend: {
          top: 0,
          right: 10,
          textStyle: { color: isDarkMode ? "#94a3b8" : "#475569", fontSize: 11 },
        },
        grid: { left: "3%", right: "3%", bottom: "8%", top: "14%", containLabel: true },
        xAxis: {
          type: "category",
          data: binLabels,
          axisLine: { lineStyle: { color: isDarkMode ? "#334155" : "#cbd5e1" } },
          axisLabel: { color: isDarkMode ? "#94a3b8" : "#64748b", fontSize: 10 },
        },
        yAxis: {
          type: "value",
          name: "Frekuensi (Jumlah)",
          splitLine: { lineStyle: { color: isDarkMode ? "#1e293b" : "#f1f5f9" } },
        },
        series: [
          { name: "AWS QC (Observasi)", type: "bar", data: awsCounts, itemStyle: { color: "rgba(37, 99, 235, 0.7)" } },
          { name: "ERA5 Raw (Model)", type: "bar", data: era5RawCounts, itemStyle: { color: "rgba(244, 63, 94, 0.7)" } },
          { name: "ERA5 Corrected (Terkoreksi)", type: "bar", data: era5CorrCounts, itemStyle: { color: "rgba(16, 185, 129, 0.7)" } },
        ],
      };
    }
  }, [pairs, viewType, unit, isDarkMode]);

  return (
    <Card className="border-slate-200 dark:border-slate-800 shadow-sm bg-white dark:bg-slate-900">
      <CardHeader className="pb-2 border-b border-slate-100 dark:border-slate-800">
        <div className="flex justify-between items-center">
          <div>
            <CardTitle className="text-sm font-bold text-slate-900 dark:text-slate-100">
              Perbandingan Fungsi Distribusi (ECDF & Histogram)
            </CardTitle>
            <p className="text-xs text-slate-500 mt-0.5">
              Memvalidasi pergeseran kurva probabilitas kumulatif ERA5 setelah bias correction menuju kurva observasi AWS.
            </p>
          </div>
          <div className="flex items-center gap-1.5">
            <Button
              variant={viewType === "ecdf" ? "default" : "outline"}
              size="sm"
              className="h-7 text-xs px-2.5"
              onClick={() => setViewType("ecdf")}
            >
              Kurva ECDF
            </Button>
            <Button
              variant={viewType === "histogram" ? "default" : "outline"}
              size="sm"
              className="h-7 text-xs px-2.5"
              onClick={() => setViewType("histogram")}
            >
              Histogram
            </Button>
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
