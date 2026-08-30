// components/indeks-monsun/MonsoonIndicesCharts.tsx
"use client";

import React, { useMemo } from "react";
import ReactECharts from "echarts-for-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Wind, Compass, Activity, ShieldAlert, Sparkles } from "lucide-react";

interface MonsoonIndicesChartsProps {
  timeSeries: Array<{
    date: string;
    ausmi: number;
    wnpmi: number;
    scsmi: number;
    csi: number;
  }>;
  currentBsiso: {
    phase: number;
    amplitude: number;
    bsiso1: number;
    bsiso2: number;
    name?: string;
  };
  isDarkMode?: boolean;
}

export const MonsoonIndicesCharts: React.FC<MonsoonIndicesChartsProps> = ({
  timeSeries = [],
  currentBsiso,
  isDarkMode = false,
}) => {
  const dates = timeSeries.map((t) => t.date);
  const ausmiVals = timeSeries.map((t) => t.ausmi);
  const wnpmiVals = timeSeries.map((t) => t.wnpmi);
  const scsmiVals = timeSeries.map((t) => t.scsmi);
  const csiVals = timeSeries.map((t) => t.csi);

  // 1. Dual Dipole Chart Option (AUSMI vs WNPMI)
  const dipoleChartOption = useMemo(() => {
    return {
      backgroundColor: "transparent",
      tooltip: {
        trigger: "axis",
        backgroundColor: isDarkMode ? "#0f172a" : "#ffffff",
        borderColor: isDarkMode ? "#334155" : "#e2e8f0",
        textStyle: { color: isDarkMode ? "#f8fafc" : "#0f172a", fontSize: 12 },
      },
      legend: {
        top: 0,
        textStyle: { color: isDarkMode ? "#cbd5e1" : "#475569", fontSize: 11 },
        data: ["AUSMI (Belahan Selatan / Hujan)", "WNPMI (Belahan Utara / Kemarau)"],
      },
      grid: {
        top: 40,
        left: 50,
        right: 20,
        bottom: 35,
        containLabel: false,
      },
      xAxis: {
        type: "category",
        data: dates,
        axisLine: { lineStyle: { color: isDarkMode ? "#334155" : "#cbd5e1" } },
        axisLabel: {
          color: isDarkMode ? "#94a3b8" : "#64748b",
          fontSize: 10,
          formatter: (val: string) => val.substring(5),
        },
      },
      yAxis: {
        type: "value",
        name: "Indeks (m/s)",
        nameTextStyle: { color: isDarkMode ? "#94a3b8" : "#64748b", fontSize: 11 },
        splitLine: { lineStyle: { color: isDarkMode ? "#1e293b" : "#f1f5f9" } },
        axisLabel: {
          color: isDarkMode ? "#94a3b8" : "#64748b",
          fontSize: 10,
          formatter: (v: number) => (v > 0 ? `+${v}` : `${v}`),
        },
      },
      series: [
        {
          name: "AUSMI (Belahan Selatan / Hujan)",
          type: "line",
          data: ausmiVals,
          smooth: true,
          symbol: "circle",
          symbolSize: 6,
          itemStyle: { color: "#06b6d4" },
          lineStyle: { color: "#06b6d4", width: 2.5 },
          areaStyle: {
            color: isDarkMode ? "rgba(6, 182, 212, 0.15)" : "rgba(6, 182, 212, 0.10)",
          },
        },
        {
          name: "WNPMI (Belahan Utara / Kemarau)",
          type: "line",
          data: wnpmiVals,
          smooth: true,
          symbol: "circle",
          symbolSize: 6,
          itemStyle: { color: "#f59e0b" },
          lineStyle: { color: "#f59e0b", width: 2.5 },
          areaStyle: {
            color: isDarkMode ? "rgba(245, 158, 11, 0.15)" : "rgba(245, 158, 11, 0.10)",
          },
        },
      ],
    };
  }, [dates, ausmiVals, wnpmiVals, isDarkMode]);

  // 2. SCSMI & Cold Surge (CSI) Tracker
  const surgeChartOption = useMemo(() => {
    return {
      backgroundColor: "transparent",
      tooltip: {
        trigger: "axis",
        backgroundColor: isDarkMode ? "#0f172a" : "#ffffff",
        borderColor: isDarkMode ? "#334155" : "#e2e8f0",
        textStyle: { color: isDarkMode ? "#f8fafc" : "#0f172a", fontSize: 12 },
      },
      legend: {
        top: 0,
        textStyle: { color: isDarkMode ? "#cbd5e1" : "#475569", fontSize: 11 },
        data: ["SCSMI (Angin Baratan LCS)", "CSI (Angin Meridional V Seruakan)"],
      },
      grid: {
        top: 40,
        left: 50,
        right: 20,
        bottom: 35,
        containLabel: false,
      },
      xAxis: {
        type: "category",
        data: dates,
        axisLine: { lineStyle: { color: isDarkMode ? "#334155" : "#cbd5e1" } },
        axisLabel: {
          color: isDarkMode ? "#94a3b8" : "#64748b",
          fontSize: 10,
          formatter: (val: string) => val.substring(5),
        },
      },
      yAxis: {
        type: "value",
        name: "Kecepatan (m/s)",
        nameTextStyle: { color: isDarkMode ? "#94a3b8" : "#64748b", fontSize: 11 },
        splitLine: { lineStyle: { color: isDarkMode ? "#1e293b" : "#f1f5f9" } },
        axisLabel: {
          color: isDarkMode ? "#94a3b8" : "#64748b",
          fontSize: 10,
          formatter: (v: number) => (v > 0 ? `+${v}` : `${v}`),
        },
      },
      series: [
        {
          name: "SCSMI (Angin Baratan LCS)",
          type: "line",
          data: scsmiVals,
          smooth: true,
          itemStyle: { color: "#14b8a6" },
          lineStyle: { color: "#14b8a6", width: 2.5 },
        },
        {
          name: "CSI (Angin Meridional V Seruakan)",
          type: "bar",
          data: csiVals.map((v) => ({
            value: v,
            itemStyle: {
              color: v <= -8.0 ? "#ef4444" : v <= -5.0 ? "#f97316" : "#64748b",
              borderRadius: v >= 0 ? [4, 4, 0, 0] : [0, 0, 4, 4],
            },
          })),
          markLine: {
            symbol: "none",
            data: [
              {
                yAxis: -8.0,
                lineStyle: { color: "#ef4444", type: "dashed", width: 2 },
                label: { formatter: "Ambang Seruakan Dingin Aktif (-8 m/s)", position: "insideEndBottom", color: "#ef4444", fontSize: 10 },
              },
            ],
          },
        },
      ],
    };
  }, [dates, scsmiVals, csiVals, isDarkMode]);

  // 3. BSISO 2D Phase Space Diagram (Wheeler-Hendon 2D Phase)
  const bsisoPhaseOption = useMemo(() => {
    const bs1 = currentBsiso.bsiso1;
    const bs2 = currentBsiso.bsiso2;

    return {
      backgroundColor: "transparent",
      tooltip: {
        trigger: "item",
        backgroundColor: isDarkMode ? "#0f172a" : "#ffffff",
        borderColor: isDarkMode ? "#334155" : "#e2e8f0",
        textStyle: { color: isDarkMode ? "#f8fafc" : "#0f172a", fontSize: 12 },
        formatter: () => {
          return `
            <div class="font-bold text-sm">Posisi BSISO Terkini</div>
            <div class="text-xs space-y-1 mt-1">
              <div>Fase: <b>Fase ${currentBsiso.phase}</b></div>
              <div>Amplitudo: <b>${currentBsiso.amplitude}</b> (${currentBsiso.amplitude >= 1 ? "Aktif Kuat" : "Lemah"})</div>
              <div>BSISO1: <b>${bs1}</b> | BSISO2: <b>${bs2}</b></div>
            </div>
          `;
        },
      },
      grid: {
        top: 20,
        left: 45,
        right: 45,
        bottom: 20,
        containLabel: true,
      },
      xAxis: {
        type: "value",
        min: -3,
        max: 3,
        name: "BSISO 1",
        nameLocation: "middle",
        nameGap: 25,
        axisLine: { lineStyle: { color: isDarkMode ? "#475569" : "#cbd5e1" } },
        splitLine: { lineStyle: { color: isDarkMode ? "#1e293b" : "#f1f5f9" } },
      },
      yAxis: {
        type: "value",
        min: -3,
        max: 3,
        name: "BSISO 2",
        nameLocation: "middle",
        nameGap: 25,
        axisLine: { lineStyle: { color: isDarkMode ? "#475569" : "#cbd5e1" } },
        splitLine: { lineStyle: { color: isDarkMode ? "#1e293b" : "#f1f5f9" } },
      },
      series: [
        // Unit Circle Threshold
        {
          name: "Ambang Batas Lingkaran (Amp = 1.0)",
          type: "line",
          data: Array.from({ length: 361 }, (_, i) => {
            const rad = (i * Math.PI) / 180;
            return [Number(Math.cos(rad).toFixed(3)), Number(Math.sin(rad).toFixed(3))];
          }),
          lineStyle: { color: isDarkMode ? "#64748b" : "#94a3b8", type: "dashed", width: 1.5 },
          showSymbol: false,
          silent: true,
        },
        // Current Position Point
        {
          name: "Posisi Terkini",
          type: "scatter",
          data: [[bs1, bs2]],
          symbolSize: 18,
          itemStyle: {
            color: "#6366f1",
            shadowBlur: 10,
            shadowColor: "rgba(99, 102, 241, 0.8)",
          },
          label: {
            show: true,
            formatter: `Fase ${currentBsiso.phase}\n(Amp: ${currentBsiso.amplitude})`,
            position: "right",
            color: isDarkMode ? "#f8fafc" : "#0f172a",
            fontWeight: "bold",
            fontSize: 11,
          },
        },
      ],
    };
  }, [currentBsiso, isDarkMode]);

  return (
    <Card className="border-none shadow-sm dark:bg-slate-900 bg-white">
      <CardHeader className="pb-2 border-b dark:border-slate-800">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div>
            <CardTitle className="text-base font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
              <Activity className="h-5 w-5 text-teal-500" /> Analisis Visualisasi Indeks Monsun &amp; Osilasi Musim Panas
            </CardTitle>
            <CardDescription className="text-xs text-slate-500">
              Eksplorasi perbandingan deret waktu sirkulasi dua sayap monsun, deteksi seruakan dingin, dan diagram fase 2D BSISO
            </CardDescription>
          </div>
        </div>
      </CardHeader>

      <CardContent className="pt-4">
        <Tabs defaultValue="dipole" className="w-full">
          <TabsList className="grid w-full grid-cols-1 sm:grid-cols-3 h-auto p-1 bg-slate-100 dark:bg-slate-800 rounded-xl mb-6">
            <TabsTrigger value="dipole" className="py-2.5 font-bold text-xs sm:text-sm flex items-center gap-1.5">
              <Wind className="h-4 w-4 text-cyan-500" /> Dual Dipole: AUSMI vs WNPMI
            </TabsTrigger>
            <TabsTrigger value="surge" className="py-2.5 font-bold text-xs sm:text-sm flex items-center gap-1.5">
              <ShieldAlert className="h-4 w-4 text-rose-500" /> SCSMI &amp; Cold Surge Tracker
            </TabsTrigger>
            <TabsTrigger value="bsiso" className="py-2.5 font-bold text-xs sm:text-sm flex items-center gap-1.5">
              <Sparkles className="h-4 w-4 text-indigo-500" /> Diagram Fase 2D BSISO
            </TabsTrigger>
          </TabsList>

          {/* Tab 1: Dual Dipole AUSMI vs WNPMI */}
          <TabsContent value="dipole" className="mt-0 space-y-3">
            <div className="flex items-center justify-between text-xs">
              <span className="font-semibold text-slate-700 dark:text-slate-300">
                Perbandingan Sirkulasi Sayap Selatan (AUSMI) vs Sayap Utara (WNPMI):
              </span>
              <span className="text-[11px] text-slate-400">Rentang: 30 Hari Terakhir &amp; 16 Hari Prakiraan</span>
            </div>
            <div className="h-[340px] w-full">
              <ReactECharts option={dipoleChartOption} style={{ height: "100%", width: "100%" }} />
            </div>
          </TabsContent>

          {/* Tab 2: Cold Surge Tracker */}
          <TabsContent value="surge" className="mt-0 space-y-3">
            <div className="flex items-center justify-between text-xs">
              <span className="font-semibold text-slate-700 dark:text-slate-300">
                Pemantau Angin Baratan Laut Cina Selatan (SCSMI) &amp; Seruakan Dingin Siberia (CSI):
              </span>
              <Badge variant="outline" className="text-[10px] text-rose-600 border-rose-300">
                Ambang Batas Seruakan: V ≤ -8.0 m/s
              </Badge>
            </div>
            <div className="h-[340px] w-full">
              <ReactECharts option={surgeChartOption} style={{ height: "100%", width: "100%" }} />
            </div>
          </TabsContent>

          {/* Tab 3: BSISO 2D Phase Diagram */}
          <TabsContent value="bsiso" className="mt-0 space-y-4">
            <div className="flex items-center justify-between text-xs">
              <span className="font-semibold text-slate-700 dark:text-slate-300">
                Diagram Ruang Fase 2D BSISO (Boreal Summer Intraseasonal Oscillation):
              </span>
              <Badge variant="outline" className="text-[10px] text-indigo-600 border-indigo-300">
                Ambang Batas Aktif: Amplitudo ≥ 1.0
              </Badge>
            </div>
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-center">
              <div className="h-[320px] w-full lg:col-span-2">
                <ReactECharts option={bsisoPhaseOption} style={{ height: "100%", width: "100%" }} />
              </div>
              <div className="p-4 rounded-xl border border-indigo-200 dark:border-indigo-900/60 bg-indigo-50/40 dark:bg-indigo-950/20 text-xs space-y-2">
                <div className="font-bold text-indigo-700 dark:text-indigo-300 text-sm flex items-center gap-1.5">
                  <Sparkles className="h-4 w-4" /> Apa itu BSISO?
                </div>
                <p className="text-slate-600 dark:text-slate-300 leading-relaxed">
                  BSISO adalah variabilitas iklim intraseasonal (30–60 hari) selama musim panas belahan bumi utara (Mei–Oktober). Tidak seperti MJO yang merambat ke timur ekuator, BSISO merambat <strong>ke arah utara (*northward propagation*)</strong> dari Samudra Hindia melintasi Laut Cina Selatan dan Filipina.
                </p>
                <div className="pt-1 text-[11px] font-semibold text-indigo-900 dark:text-indigo-200">
                  Status Saat Ini: <strong>{currentBsiso.name}</strong> (Amp: {currentBsiso.amplitude})
                </div>
              </div>
            </div>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
};
