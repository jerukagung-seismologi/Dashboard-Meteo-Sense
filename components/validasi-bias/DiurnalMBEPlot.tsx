// components/validasi-bias/DiurnalMBEPlot.tsx
"use client";

import React, { useMemo } from "react";
import ReactECharts from "echarts-for-react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { MatchedObservationPair } from "@/lib/bias-correction/types";
import { fitDiurnalMBE } from "@/lib/bias-correction/correction/diurnalMBE";

interface DiurnalMBEPlotProps {
  pairs: MatchedObservationPair[];
  variableName: string;
  unit: string;
  isDarkMode?: boolean;
}

export const DiurnalMBEPlot: React.FC<DiurnalMBEPlotProps> = ({
  pairs,
  variableName,
  unit,
  isDarkMode = false,
}) => {
  const diurnalParams = useMemo(() => {
    const calPairs = pairs
      .filter(p => p.aws_value != null && p.era5_value != null)
      .map(p => ({ timestamp: p.timestamp, aws: p.aws_value!, era5: p.era5_value! }));
    return fitDiurnalMBE(calPairs);
  }, [pairs]);

  const option = useMemo(() => {
    const hours = Array.from({ length: 24 }, (_, i) => `${String(i).padStart(2, "0")}:00`);
    const mbeValues = Array.from({ length: 24 }, (_, i) => diurnalParams.hourlyMBE[i] ?? 0);
    const sampleCounts = Array.from({ length: 24 }, (_, i) => diurnalParams.hourlySampleCount[i] ?? 0);

    return {
      backgroundColor: "transparent",
      tooltip: {
        trigger: "axis",
        backgroundColor: isDarkMode ? "#1e293b" : "#ffffff",
        borderColor: isDarkMode ? "#334155" : "#e2e8f0",
        textStyle: { color: isDarkMode ? "#f8fafc" : "#0f172a", fontSize: 11 },
        formatter: (params: any) => {
          if (!Array.isArray(params) || params.length === 0) return "";
          const hIdx = params[0].dataIndex;
          const mbeVal = mbeValues[hIdx];
          const direction = mbeVal >= 0 ? "Ditambah (+)" : "Dikurangi (-)";
          return `<div class="text-xs font-sans">
            <div class="font-bold mb-1 border-b pb-1 text-slate-500">Jam: ${hours[hIdx]} WIB</div>
            <div class="flex justify-between gap-3 py-0.5">
              <span>Mean Bias Error (MBE):</span>
              <strong class="font-mono ${mbeVal >= 0 ? "text-emerald-500" : "text-rose-500"}">${mbeVal >= 0 ? "+" : ""}${mbeVal.toFixed(2)} ${unit}</strong>
            </div>
            <div class="text-[10px] text-slate-400">Penyesuaian Model: ${direction} ${Math.abs(mbeVal).toFixed(2)} ${unit}</div>
            <div class="text-[10px] text-slate-400">Sampel Observasi: ${sampleCounts[hIdx]} data</div>
          </div>`;
        },
      },
      grid: { left: "3%", right: "3%", bottom: "8%", top: "14%", containLabel: true },
      xAxis: {
        type: "category",
        name: "Jam (WIB)",
        nameLocation: "middle",
        nameGap: 24,
        data: hours,
        axisLine: { lineStyle: { color: isDarkMode ? "#334155" : "#cbd5e1" } },
        axisLabel: { color: isDarkMode ? "#94a3b8" : "#64748b", fontSize: 10 },
      },
      yAxis: {
        type: "value",
        scale: true,
        name: `MBE (${unit})`,
        axisLine: { lineStyle: { color: isDarkMode ? "#334155" : "#cbd5e1" } },
        axisLabel: { color: isDarkMode ? "#94a3b8" : "#64748b", fontSize: 10 },
        splitLine: { lineStyle: { color: isDarkMode ? "#1e293b" : "#f1f5f9" } },
      },
      series: [
        {
          name: "Hourly Mean Bias Error (MBE)",
          type: "bar",
          data: mbeValues.map(v => ({
            value: v,
            itemStyle: {
              color: v >= 0 ? "rgba(16, 185, 129, 0.75)" : "rgba(244, 63, 94, 0.75)",
            },
          })),
          markLine: {
            data: [{ yAxis: 0 }],
            lineStyle: { color: isDarkMode ? "#64748b" : "#94a3b8", type: "dashed" },
            label: { formatter: "Bias Nol", fontSize: 10 },
          },
        },
      ],
    };
  }, [diurnalParams, unit, isDarkMode]);

  return (
    <Card className="border-slate-200 dark:border-slate-800 shadow-sm bg-white dark:bg-slate-900">
      <CardHeader className="pb-2 border-b border-slate-100 dark:border-slate-800">
        <div className="flex justify-between items-center">
          <div>
            <CardTitle className="text-sm font-bold text-slate-900 dark:text-slate-100">
              Profil Siklus Diurnal Bias Model: 24 Jam (00:00 – 23:00 WIB)
            </CardTitle>
            <p className="text-xs text-slate-500 mt-0.5">
              Menampilkan Mean Bias Error (MBE = AWS - ERA5) per jam untuk mendeteksi perbedaan bias siang (insolasi) vs malam (radiasi keluar).
            </p>
          </div>
          <div className="text-right">
            <span className="text-[10px] text-slate-400 block">Overall MBE Rata-rata</span>
            <span className={`text-sm font-bold font-mono ${diurnalParams.overallMBE >= 0 ? "text-emerald-600" : "text-rose-600"}`}>
              {diurnalParams.overallMBE >= 0 ? `+${diurnalParams.overallMBE}` : diurnalParams.overallMBE} {unit}
            </span>
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
