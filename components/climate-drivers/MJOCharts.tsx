// components/climate-drivers/MJOCharts.tsx
"use client";

import React, { useMemo } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { CloudRain, Compass, Activity, Calendar } from "lucide-react";
import dynamic from "next/dynamic";
import { MjoData } from "@/lib/climate-drivers/types";

const ReactECharts = dynamic(() => import("echarts-for-react"), {
  ssr: false,
  loading: () => (
    <div className="h-[320px] w-full flex items-center justify-center text-muted-foreground animate-pulse">
      Memuat Diagram Fase MJO...
    </div>
  ),
});

interface MJOChartsProps {
  data: MjoData;
  isDarkMode?: boolean;
}

export const MJOCharts: React.FC<MJOChartsProps> = ({ data, isDarkMode = false }) => {
  const textColor = isDarkMode ? "#cbd5e1" : "#475569";
  const gridColor = isDarkMode ? "rgba(71, 85, 105, 0.2)" : "rgba(203, 213, 225, 0.2)";

  // 1. RMM Phase Diagram Option (Cartesian 2D coordinate for RMM1 vs RMM2)
  const rmmPhaseOption = useMemo(() => {
    const points = data.phaseDiagram.map((d) => [d.rmm1, d.rmm2, d.date, d.phase]);
    const latestPoint = points[points.length - 1];

    return {
      tooltip: {
        trigger: "item",
        formatter: (params: any) => {
          if (params.seriesType === "scatter" || params.seriesType === "line") {
            const [rmm1, rmm2, date, phase] = params.data;
            const amp = Math.sqrt(rmm1 * rmm1 + rmm2 * rmm2).toFixed(2);
            return `<div class="font-semibold">${date}</div>
              <div class="text-xs">Fase: <span class="font-bold">Fase ${phase}</span></div>
              <div class="text-xs">Amplitudo: <span class="font-bold">${amp}</span></div>
              <div class="text-xs text-slate-400">RMM1: ${rmm1}, RMM2: ${rmm2}</div>`;
          }
          return "";
        },
      },
      grid: { left: "8%", right: "8%", top: "10%", bottom: "10%", containLabel: true },
      xAxis: {
        type: "value",
        name: "RMM1 (Barat -> Timur)",
        nameLocation: "middle",
        nameGap: 25,
        min: -3,
        max: 3,
        splitLine: { lineStyle: { color: gridColor } },
        axisLabel: { color: textColor },
      },
      yAxis: {
        type: "value",
        name: "RMM2 (Utara -> Selatan)",
        nameLocation: "middle",
        nameGap: 30,
        min: -3,
        max: 3,
        splitLine: { lineStyle: { color: gridColor } },
        axisLabel: { color: textColor },
      },
      series: [
        // Center Unit Circle (Amplitude < 1.0 = Inactive)
        {
          type: "custom",
          renderItem: (params: any, api: any) => {
            const center = api.coord([0, 0]);
            const pointOnCircle = api.coord([1, 0]);
            const radius = Math.abs(pointOnCircle[0] - center[0]);
            return {
              type: "circle",
              shape: {
                cx: center[0],
                cy: center[1],
                r: radius,
              },
              style: {
                fill: isDarkMode ? "rgba(100, 116, 139, 0.15)" : "rgba(226, 232, 240, 0.5)",
                stroke: isDarkMode ? "#475569" : "#cbd5e1",
                lineWidth: 1.5,
                lineDash: [4, 4],
              },
            };
          },
          data: [[0, 0]],
        },
        // RMM Trajectory Line
        {
          type: "line",
          data: points,
          smooth: true,
          lineStyle: { width: 2.5, color: "#10b981" },
          symbol: "circle",
          symbolSize: 6,
          itemStyle: { color: "#10b981" },
        },
        // Current Active Position Marker
        {
          type: "scatter",
          data: [latestPoint],
          symbolSize: 14,
          itemStyle: { color: "#ef4444", borderColor: "#ffffff", borderWidth: 2 },
          label: {
            show: true,
            formatter: `Kini (Fase ${latestPoint[3]})`,
            position: "top",
            color: textColor,
            fontWeight: "bold",
            fontSize: 11,
          },
        },
      ],
    };
  }, [data, textColor, gridColor, isDarkMode]);

  // 2. Amplitude Timeline Option
  const amplitudeOption = useMemo(() => {
    const dates = data.historicalAmplitude.map((d) => d.date);
    const amps = data.historicalAmplitude.map((d) => d.amplitude);

    return {
      tooltip: {
        trigger: "axis",
        formatter: (params: any) => {
          const p = params[0];
          return `<div class="font-semibold">${p.name}</div>
            <div class="text-xs mt-1">Amplitudo MJO: <span class="font-bold">${p.value.toFixed(2)}</span></div>
            <div class="text-xs text-emerald-500">${p.value >= 1.0 ? "🟢 MJO Aktif" : "⚪ MJO Tidak Aktif"}</div>`;
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
        name: "Amplitude",
        nameTextStyle: { color: textColor },
        axisLabel: { color: textColor },
        splitLine: { lineStyle: { color: gridColor } },
      },
      series: [
        {
          name: "MJO Amplitude",
          type: "line",
          data: amps,
          smooth: true,
          lineStyle: { width: 3, color: "#059669" },
          itemStyle: { color: "#059669" },
          markLine: {
            silent: true,
            symbol: "none",
            data: [
              {
                yAxis: 1.0,
                lineStyle: { color: "#10b981", type: "dashed", width: 1.5 },
                label: { formatter: "Ambang Aktif (1.0)", color: "#10b981", position: "insideEndTop" },
              },
            ],
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
        },
      ],
    };
  }, [data, textColor, gridColor]);

  return (
    <div className="space-y-6">
      {/* 2-Column Grid for Phase Diagram and Amplitude */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* RMM Phase Diagram */}
        <Card className="border-none shadow-sm dark:bg-slate-900 bg-white flex flex-col justify-between">
          <CardHeader>
            <CardTitle className="text-lg font-bold flex items-center gap-2">
              <Compass className="h-5 w-5 text-emerald-500" /> Diagram Fase RMM (Phase Wheel)
            </CardTitle>
            <CardDescription className="text-xs">
              Lintasan posisi RMM1 vs RMM2. Lingkaran dalam (&lt;1.0) menunjukkan fase lemah / tidak aktif.
            </CardDescription>
          </CardHeader>
          <CardContent className="h-[340px] p-2">
            <ReactECharts option={rmmPhaseOption} style={{ height: "100%", width: "100%" }} />
          </CardContent>
          <div className="px-4 pb-4 pt-1 flex items-center justify-around text-xs text-slate-500 border-t dark:border-slate-800">
            <span className="font-semibold text-emerald-600 dark:text-emerald-400">
              🔴 Fase 4-5: Benua Maritim (Indonesia)
            </span>
            <span>Fase 2-3: Samudra Hindia</span>
            <span>Fase 6-7: Pasifik</span>
          </div>
        </Card>

        {/* Amplitude Timeline */}
        <Card className="border-none shadow-sm dark:bg-slate-900 bg-white flex flex-col justify-between">
          <CardHeader>
            <CardTitle className="text-lg font-bold flex items-center gap-2">
              <Activity className="h-5 w-5 text-teal-500" /> Deret Waktu Amplitudo MJO
            </CardTitle>
            <CardDescription className="text-xs">
              Kekuatan konveksi gelombang MJO. Amplitudo &ge; 1.0 mengonfirmasi fase aktif.
            </CardDescription>
          </CardHeader>
          <CardContent className="h-[340px] p-2">
            <ReactECharts option={amplitudeOption} style={{ height: "100%", width: "100%" }} />
          </CardContent>
          <div className="px-4 pb-4 pt-1 flex items-center justify-between text-xs text-slate-500 border-t dark:border-slate-800">
            <span>Amplitudo Saat Ini: <strong className="text-slate-900 dark:text-slate-100">{data.amplitude.toFixed(1)}</strong></span>
            <span className="font-semibold text-emerald-600 dark:text-emerald-400">Status: {data.status}</span>
          </div>
        </Card>
      </div>

      {/* Phase Timeline / Progression Overview */}
      <Card className="border-none shadow-sm dark:bg-slate-900 bg-white">
        <CardHeader>
          <CardTitle className="text-base font-bold flex items-center gap-2">
            <Calendar className="h-5 w-5 text-indigo-500" /> Pergerakan Fase Konveksi MJO (8 Fase Tropis)
          </CardTitle>
          <CardDescription className="text-xs">
            Perambatan area basah konveksi dari Samudra Hindia Barat (Fase 1-3) ke Indonesia (Fase 4-5) lalu Pasifik (Fase 6-8)
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-8 gap-2">
            {data.phaseTimeline.map((item) => {
              const isCurrent = item.phase === data.phase;
              const isIndonesiaPhase = item.phase === 4 || item.phase === 5;

              return (
                <div
                  key={item.phase}
                  className={`p-2.5 rounded-xl border text-center transition-all ${
                    isCurrent
                      ? "bg-emerald-600 text-white border-emerald-700 shadow-md ring-2 ring-emerald-400"
                      : isIndonesiaPhase
                      ? "bg-emerald-50 dark:bg-emerald-950/40 text-emerald-900 dark:text-emerald-200 border-emerald-200 dark:border-emerald-800"
                      : "bg-slate-50 dark:bg-slate-800/40 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-800"
                  }`}
                >
                  <span className="text-xs block font-bold">Fase {item.phase}</span>
                  <span className="text-[10px] block mt-0.5 opacity-90 line-clamp-1">
                    {item.date.split(" (")[1]?.replace(")", "") || ""}
                  </span>
                  {isCurrent && (
                    <span className="mt-1 inline-block px-1.5 py-0.5 bg-white text-emerald-700 rounded text-[9px] font-black">
                      Kini
                    </span>
                  )}
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
