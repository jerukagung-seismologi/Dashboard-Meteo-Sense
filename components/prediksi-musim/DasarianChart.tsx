"use client";

import React, { useMemo } from "react";
import ReactECharts from "echarts-for-react";
import { DasarianChartData } from "@/lib/seasonalPredictionTypes";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { BarChart3, Info } from "lucide-react";

interface DasarianChartProps {
  chartData?: DasarianChartData;
  wilayahName: string;
  isDesa?: boolean;
  kecamatanName?: string;
}

export const DasarianChart: React.FC<DasarianChartProps> = ({
  chartData,
  wilayahName,
  isDesa = false,
  kecamatanName,
}) => {
  if (!chartData || !chartData.labels || chartData.labels.length === 0) {
    return (
      <div className="p-6 text-center text-sm text-gray-500 dark:text-gray-400 bg-gray-50 dark:bg-gray-800/40 rounded-xl border border-dashed border-gray-200 dark:border-gray-700">
        Data profil 36 dasarian tidak tersedia untuk wilayah ini.
      </div>
    );
  }

  const option = useMemo(() => {
    const labels = chartData.labels || [];
    const normal = chartData.normal || [];
    const aktual = chartData.aktual || [];
    const proyeksi = chartData.proyeksi || [];

    return {
      tooltip: {
        trigger: "axis",
        backgroundColor: "rgba(17, 24, 39, 0.95)",
        borderColor: "#374151",
        textStyle: { color: "#f3f4f6", fontSize: 12 },
        formatter: (params: any) => {
          if (!params || params.length === 0) return "";
          const dasarianIdx = params[0].dataIndex;
          const label = labels[dasarianIdx];
          const normVal = normal[dasarianIdx] !== undefined ? `${normal[dasarianIdx].toFixed(1)} mm` : "-";
          const aktVal = aktual[dasarianIdx] !== null && aktual[dasarianIdx] !== undefined ? `${aktual[dasarianIdx]?.toFixed(1)} mm` : null;
          const proyVal = proyeksi[dasarianIdx] !== null && proyeksi[dasarianIdx] !== undefined ? `${proyeksi[dasarianIdx]?.toFixed(1)} mm` : null;

          let out = `<div class="font-bold text-sm mb-1 text-sky-400">Dasarian: ${label}</div>`;
          out += `<div class="flex items-center justify-between gap-4 text-xs py-0.5">
                    <span class="text-emerald-400">Normal (2000–2025):</span>
                    <span class="font-mono font-semibold">${normVal}</span>
                  </div>`;
          if (aktVal !== null) {
            out += `<div class="flex items-center justify-between gap-4 text-xs py-0.5">
                      <span class="text-blue-400">Realisasi 2026:</span>
                      <span class="font-mono font-bold text-blue-200">${aktVal}</span>
                    </div>`;
          }
          if (proyVal !== null) {
            out += `<div class="flex items-center justify-between gap-4 text-xs py-0.5">
                      <span class="text-amber-400">Prakiraan Model:</span>
                      <span class="font-mono font-bold text-amber-200">${proyVal}</span>
                    </div>`;
          }
          return out;
        },
      },
      legend: {
        top: 0,
        right: 10,
        textStyle: { color: "#9ca3af", fontSize: 11 },
        data: ["Normal Klimatologis (2000-2025)", "Realisasi 2026", "Prakiraan 2026"],
      },
      grid: {
        top: 40,
        left: 45,
        right: 20,
        bottom: 55,
      },
      xAxis: {
        type: "category",
        data: labels,
        axisLine: { lineStyle: { color: "#4b5563" } },
        axisLabel: {
          color: "#9ca3af",
          fontSize: 10,
          interval: 2, // Tampilkan tiap 3 dasarian (1 bulan)
          rotate: 35,
        },
      },
      yAxis: {
        type: "value",
        name: "Curah Hujan (mm)",
        nameTextStyle: { color: "#9ca3af", fontSize: 11, padding: [0, 0, 0, 10] },
        splitLine: { lineStyle: { color: "rgba(107, 114, 128, 0.2)", type: "dashed" } },
        axisLabel: { color: "#9ca3af", fontSize: 10 },
      },
      dataZoom: [
        {
          type: "inside",
          start: 0,
          end: 100,
        },
        {
          type: "slider",
          bottom: 5,
          height: 16,
          borderColor: "transparent",
          backgroundColor: "rgba(156, 163, 175, 0.1)",
          fillerColor: "rgba(59, 130, 246, 0.2)",
          handleStyle: { color: "#3b82f6" },
          textStyle: { color: "#9ca3af", fontSize: 9 },
        },
      ],
      series: [
        {
          name: "Normal Klimatologis (2000-2025)",
          type: "line",
          data: normal,
          smooth: true,
          showSymbol: false,
          lineStyle: {
            color: "#10b981",
            width: 2,
            type: "dashed",
          },
          areaStyle: {
            color: {
              type: "linear",
              x: 0,
              y: 0,
              x2: 0,
              y2: 1,
              colorStops: [
                { offset: 0, color: "rgba(16, 185, 129, 0.25)" },
                { offset: 1, color: "rgba(16, 185, 129, 0.0)" },
              ],
            },
          },
          markLine: {
            symbol: ["none", "none"],
            data: [
              {
                yAxis: 50,
                lineStyle: { color: "#eab308", type: "dotted", width: 1.5 },
                label: {
                  formatter: "Ambang Hujan (50 mm)",
                  position: "insideEndTop",
                  fontSize: 10,
                  color: "#eab308",
                },
              },
            ],
          },
        },
        {
          name: "Realisasi 2026",
          type: "line",
          data: aktual,
          connectNulls: false,
          smooth: false,
          symbol: "circle",
          symbolSize: 5,
          itemStyle: { color: "#2563eb" },
          lineStyle: { color: "#2563eb", width: 2.5 },
        },
        {
          name: "Prakiraan 2026",
          type: "line",
          data: proyeksi,
          connectNulls: true,
          smooth: true,
          symbol: "diamond",
          symbolSize: 6,
          itemStyle: { color: "#f59e0b" },
          lineStyle: { color: "#f59e0b", width: 2.5, type: "dashed" },
        },
      ],
    };
  }, [chartData]);

  const subtitle = isDesa && kecamatanName
    ? `Desa ${wilayahName}, Kec. ${kecamatanName}`
    : `Kecamatan ${wilayahName}`;

  return (
    <Card className="border border-gray-200 dark:border-gray-800 shadow-sm bg-white dark:bg-gray-900/90">
      <CardHeader className="pb-2 pt-4 px-4 sm:px-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1">
          <div>
            <CardTitle className="text-base sm:text-lg font-bold flex items-center gap-2 text-gray-900 dark:text-gray-100">
              <BarChart3 className="w-5 h-5 text-blue-600 dark:text-blue-400" />
              Profil Curah Hujan 36 Dasarian (Tahun 2026)
            </CardTitle>
            <CardDescription className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
              {subtitle} • Perbandingan Realisasi vs Normal Klimatologi 26 Tahun (2000–2025)
            </CardDescription>
          </div>
          <div className="flex items-center gap-1.5 text-[11px] text-gray-500 dark:text-gray-400 bg-gray-50 dark:bg-gray-800/80 px-2.5 py-1 rounded-full w-fit">
            <Info className="w-3.5 h-3.5 text-blue-500" />
            <span>Geser slider untuk rentang waktu spesifik</span>
          </div>
        </div>
      </CardHeader>

      <CardContent className="px-2 sm:px-4 pb-4">
        <div className="h-72 w-full">
          <ReactECharts
            option={option}
            style={{ height: "100%", width: "100%" }}
            opts={{ renderer: "canvas" }}
          />
        </div>

        <div className="mt-2 grid grid-cols-1 sm:grid-cols-3 gap-2 text-[11px] bg-slate-50 dark:bg-gray-800/60 p-2.5 rounded-lg border border-gray-100 dark:border-gray-700/60">
          <div className="flex items-center gap-2">
            <span className="w-3 h-0.5 bg-emerald-500 border-dashed inline-block" />
            <span className="text-gray-600 dark:text-gray-300">
              <strong>Normal 2000–2025:</strong> Rata-rata historis CHIRPS & ERA5
            </span>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-3 h-1 bg-blue-600 rounded-sm inline-block" />
            <span className="text-gray-600 dark:text-gray-300">
              <strong>Realisasi 2026:</strong> Observasi D1–D30 (Jan–Okt)
            </span>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-3 h-1 bg-amber-500 rounded-sm inline-block" />
            <span className="text-gray-600 dark:text-gray-300">
              <strong>Prakiraan 2026:</strong> Proyeksi Model D31–D36 (Nov–Des)
            </span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default DasarianChart;
