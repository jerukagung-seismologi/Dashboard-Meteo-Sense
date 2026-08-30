// components/indeks-monsun/MonsoonIndicesCharts.tsx
"use client";

import React, { useMemo, useState } from "react";
import ReactECharts from "echarts-for-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Wind, Compass, Activity, ShieldAlert, Sparkles, Globe, Layers, Navigation } from "lucide-react";

interface MonsoonIndicesChartsProps {
  timeSeries: Array<{
    date: string;
    ausmi: number;
    wnpmi: number;
    scsmi: number;
    csi: number;
    wyi?: number;
    sasmi?: number;
    easmi?: number;
    bsiso1?: number;
    bsiso2?: number;
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
  const [activeTab, setActiveTab] = useState("dipole");

  const dates = timeSeries.map((t) => t.date);
  const ausmiVals = timeSeries.map((t) => t.ausmi);
  const wnpmiVals = timeSeries.map((t) => t.wnpmi);
  const scsmiVals = timeSeries.map((t) => t.scsmi);
  const csiVals = timeSeries.map((t) => t.csi);
  const wyiVals = timeSeries.map((t) => t.wyi ?? 0);
  const sasmiVals = timeSeries.map((t) => t.sasmi ?? 0);
  const easmiVals = timeSeries.map((t) => t.easmi ?? 0);
  const bsiso1Vals = timeSeries.map((t) => t.bsiso1 ?? 0);
  const bsiso2Vals = timeSeries.map((t) => t.bsiso2 ?? 0);

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

  // 3. Broadscale Asian & Regional Monsoons (WYI, SASMI, EASMI)
  const broadscaleChartOption = useMemo(() => {
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
        data: ["WYI (Webster-Yang)", "SASMI (India / Teluk Benggala)", "EASMI (Asia Timur / Meiyu)"],
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
          name: "WYI (Webster-Yang)",
          type: "line",
          data: wyiVals,
          smooth: true,
          itemStyle: { color: "#6366f1" },
          lineStyle: { color: "#6366f1", width: 2 },
        },
        {
          name: "SASMI (India / Teluk Benggala)",
          type: "line",
          data: sasmiVals,
          smooth: true,
          itemStyle: { color: "#10b981" },
          lineStyle: { color: "#10b981", width: 2 },
        },
        {
          name: "EASMI (Asia Timur / Meiyu)",
          type: "line",
          data: easmiVals,
          smooth: true,
          itemStyle: { color: "#a855f7" },
          lineStyle: { color: "#a855f7", width: 2 },
        },
      ],
    };
  }, [dates, wyiVals, sasmiVals, easmiVals, isDarkMode]);

  // 4. BSISO1 & BSISO2 Time Series Line Chart
  const bsisoTimeSeriesOption = useMemo(() => {
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
        data: ["BSISO1 (30–60 Hari / Propagasi Utara)", "BSISO2 (10–23 Hari / Kuasi Dua-Mingguan)"],
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
        name: "Amplitudo Indeks",
        nameTextStyle: { color: isDarkMode ? "#94a3b8" : "#64748b", fontSize: 11 },
        splitLine: { lineStyle: { color: isDarkMode ? "#1e293b" : "#f1f5f9" } },
        axisLabel: {
          color: isDarkMode ? "#94a3b8" : "#64748b",
          fontSize: 10,
          formatter: (v: number) => (v > 0 ? `+${v.toFixed(1)}` : `${v.toFixed(1)}`),
        },
      },
      series: [
        {
          name: "BSISO1 (30–60 Hari / Propagasi Utara)",
          type: "line",
          data: bsiso1Vals,
          smooth: true,
          itemStyle: { color: "#3b82f6" },
          lineStyle: { color: "#3b82f6", width: 2.5 },
          areaStyle: {
            color: isDarkMode ? "rgba(59, 130, 246, 0.15)" : "rgba(59, 130, 246, 0.10)",
          },
        },
        {
          name: "BSISO2 (10–23 Hari / Kuasi Dua-Mingguan)",
          type: "line",
          data: bsiso2Vals,
          smooth: true,
          itemStyle: { color: "#8b5cf6" },
          lineStyle: { color: "#8b5cf6", width: 2.5 },
          areaStyle: {
            color: isDarkMode ? "rgba(139, 92, 246, 0.15)" : "rgba(139, 92, 246, 0.10)",
          },
        },
      ],
    };
  }, [dates, bsiso1Vals, bsiso2Vals, isDarkMode]);

  // 5. BSISO 2D Phase Space Diagram (Wheeler-Hendon 2D Phase with Trajectory & Auto-Scaling)
  const bsisoPhaseOption = useMemo(() => {
    const bs1 = currentBsiso.bsiso1;
    const bs2 = currentBsiso.bsiso2;

    // Collect all trajectory points
    const trajectoryPoints = timeSeries.map((t, idx) => ({
      name: t.date,
      value: [t.bsiso1 ?? 0, t.bsiso2 ?? 0],
      idx,
    }));

    // Auto-scale axis limits dynamically so no points are clipped
    const maxVal = Math.max(
      3.5,
      ...trajectoryPoints.map((p) => Math.abs(p.value[0])),
      ...trajectoryPoints.map((p) => Math.abs(p.value[1])),
      Math.abs(bs1),
      Math.abs(bs2)
    );
    const limit = Math.ceil(maxVal + 0.5);

    return {
      backgroundColor: "transparent",
      tooltip: {
        trigger: "item",
        backgroundColor: isDarkMode ? "#0f172a" : "#ffffff",
        borderColor: isDarkMode ? "#334155" : "#e2e8f0",
        textStyle: { color: isDarkMode ? "#f8fafc" : "#0f172a", fontSize: 12 },
        formatter: (params: any) => {
          if (params.seriesType === "scatter") {
            return `
              <div class="font-bold text-sm text-indigo-600 dark:text-indigo-400">Posisi BSISO Terkini</div>
              <div class="text-xs space-y-1 mt-1">
                <div>Fase: <b>Fase ${currentBsiso.phase}</b></div>
                <div>Amplitudo Total: <b>${currentBsiso.amplitude}</b> (${currentBsiso.amplitude >= 1.0 ? "Aktif Kuat" : "Netral"})</div>
                <div>BSISO1: <b>${bs1}</b> | BSISO2: <b>${bs2}</b></div>
              </div>
            `;
          }
          if (params.seriesType === "line" && params.name) {
            return `<div class="text-xs">Tanggal: <b>${params.name}</b><br/>Posisi: [${params.value[0]}, ${params.value[1]}]</div>`;
          }
          return "";
        },
      },
      grid: {
        top: 25,
        left: 45,
        right: 45,
        bottom: 25,
        containLabel: true,
      },
      xAxis: {
        type: "value",
        min: -limit,
        max: limit,
        name: "BSISO 1 (30–60 Hari)",
        nameLocation: "middle",
        nameGap: 25,
        nameTextStyle: { color: isDarkMode ? "#94a3b8" : "#64748b", fontSize: 11, fontWeight: "bold" },
        axisLine: { lineStyle: { color: isDarkMode ? "#475569" : "#cbd5e1" } },
        splitLine: { lineStyle: { color: isDarkMode ? "#1e293b" : "#f1f5f9" } },
      },
      yAxis: {
        type: "value",
        min: -limit,
        max: limit,
        name: "BSISO 2 (10–23 Hari)",
        nameLocation: "middle",
        nameGap: 25,
        nameTextStyle: { color: isDarkMode ? "#94a3b8" : "#64748b", fontSize: 11, fontWeight: "bold" },
        axisLine: { lineStyle: { color: isDarkMode ? "#475569" : "#cbd5e1" } },
        splitLine: { lineStyle: { color: isDarkMode ? "#1e293b" : "#f1f5f9" } },
      },
      series: [
        // Unit Circle Threshold (Amp = 1.0)
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
        // 30-Day Historical Trajectory Line
        {
          name: "Lintasan Trayektori 30 Hari",
          type: "line",
          data: trajectoryPoints.map((p) => p.value),
          smooth: true,
          showSymbol: true,
          symbol: "circle",
          symbolSize: 4,
          lineStyle: {
            color: isDarkMode ? "rgba(129, 140, 248, 0.6)" : "rgba(99, 102, 241, 0.5)",
            width: 2,
          },
          itemStyle: {
            color: isDarkMode ? "#818cf8" : "#6366f1",
          },
        },
        // Current Position Point (Glowing big circle)
        {
          name: "Posisi Terkini",
          type: "scatter",
          data: [[bs1, bs2]],
          symbolSize: 20,
          itemStyle: {
            color: "#6366f1",
            shadowBlur: 14,
            shadowColor: "rgba(99, 102, 241, 1.0)",
          },
          label: {
            show: true,
            formatter: `Fase ${currentBsiso.phase}\n(Amp: ${currentBsiso.amplitude})`,
            position: "top",
            color: isDarkMode ? "#f8fafc" : "#0f172a",
            fontWeight: "bold",
            fontSize: 11,
          },
        },
      ],
    };
  }, [timeSeries, currentBsiso, isDarkMode]);

  return (
    <Card className="border-none shadow-sm dark:bg-slate-900 bg-white">
      <CardHeader className="pb-2 border-b dark:border-slate-800">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div>
            <CardTitle className="text-base font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
              <Activity className="h-5 w-5 text-teal-500" /> Analisis Visualisasi 7 Indeks Monsun &amp; 2 Modus BSISO
            </CardTitle>
            <CardDescription className="text-xs text-slate-500">
              Eksplorasi deret waktu sirkulasi dua sayap monsun, deteksi seruakan dingin, monsun skala luas Asia, serta grafik &amp; diagram fase 2D BSISO
            </CardDescription>
          </div>
        </div>
      </CardHeader>

      <CardContent className="pt-4">
        <Tabs defaultValue="dipole" value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-2 sm:grid-cols-4 h-auto p-1 bg-slate-100 dark:bg-slate-800 rounded-xl mb-6">
            <TabsTrigger value="dipole" className="py-2.5 font-bold text-xs sm:text-sm flex items-center gap-1.5">
              <Wind className="h-4 w-4 text-cyan-500" /> Dual Dipole: AUSMI vs WNPMI
            </TabsTrigger>
            <TabsTrigger value="surge" className="py-2.5 font-bold text-xs sm:text-sm flex items-center gap-1.5">
              <ShieldAlert className="h-4 w-4 text-rose-500" /> SCSMI &amp; Cold Surge
            </TabsTrigger>
            <TabsTrigger value="broadscale" className="py-2.5 font-bold text-xs sm:text-sm flex items-center gap-1.5">
              <Globe className="h-4 w-4 text-indigo-500" /> Sirkulasi Asia (WYI/SASMI/EASMI)
            </TabsTrigger>
            <TabsTrigger value="bsiso" className="py-2.5 font-bold text-xs sm:text-sm flex items-center gap-1.5">
              <Sparkles className="h-4 w-4 text-indigo-500" /> Osilasi BSISO (Grafik &amp; 2D)
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
              <ReactECharts option={dipoleChartOption} notMerge={true} lazyUpdate={true} style={{ height: "100%", width: "100%" }} />
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
              <ReactECharts option={surgeChartOption} notMerge={true} lazyUpdate={true} style={{ height: "100%", width: "100%" }} />
            </div>
          </TabsContent>

          {/* Tab 3: Broadscale Asian Circulation */}
          <TabsContent value="broadscale" className="mt-0 space-y-3">
            <div className="flex items-center justify-between text-xs">
              <span className="font-semibold text-slate-700 dark:text-slate-300">
                Sirkulasi Skala Luas Asia: Webster-Yang (WYI), South Asian (SASMI), &amp; East Asian (EASMI):
              </span>
              <span className="text-[11px] text-slate-400">Rentang: 30 Hari Terakhir &amp; 16 Hari Prakiraan</span>
            </div>
            <div className="h-[340px] w-full">
              <ReactECharts option={broadscaleChartOption} notMerge={true} lazyUpdate={true} style={{ height: "100%", width: "100%" }} />
            </div>
          </TabsContent>

          {/* Tab 4: BSISO Complete Suite (Time Series + 2D Phase Space) */}
          <TabsContent value="bsiso" className="mt-0 space-y-6">
            {/* Sub-section A: BSISO Time Series Line Chart */}
            <div className="space-y-2">
              <div className="flex items-center justify-between text-xs">
                <span className="font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                  <Layers className="h-4 w-4 text-blue-500" /> Deret Waktu Harian BSISO1 (30–60 Hari) vs BSISO2 (10–23 Hari):
                </span>
                <span className="text-[11px] text-slate-400">Rentang: 30 Hari Terakhir &amp; 16 Hari Prakiraan</span>
              </div>
              <div className="h-[280px] w-full">
                <ReactECharts option={bsisoTimeSeriesOption} notMerge={true} lazyUpdate={true} style={{ height: "100%", width: "100%" }} />
              </div>
            </div>

            {/* Sub-section B: BSISO 2D Phase Space Diagram with 30-Day Trajectory */}
            <div className="space-y-2 pt-2 border-t dark:border-slate-800">
              <div className="flex items-center justify-between text-xs">
                <span className="font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                  <Navigation className="h-4 w-4 text-indigo-500" /> Diagram Ruang Fase 2D BSISO &amp; Lintasan Trayektori 30 Hari:
                </span>
                <Badge variant="outline" className="text-[10px] text-indigo-600 border-indigo-300">
                  Ambang Batas Aktif: Amplitudo ≥ 1.0
                </Badge>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-center">
                <div className="h-[340px] w-full lg:col-span-2">
                  <ReactECharts option={bsisoPhaseOption} notMerge={true} lazyUpdate={true} style={{ height: "100%", width: "100%" }} />
                </div>
                <div className="p-4 rounded-xl border border-indigo-200 dark:border-indigo-900/60 bg-indigo-50/40 dark:bg-indigo-950/20 text-xs space-y-3">
                  <div className="font-bold text-indigo-700 dark:text-indigo-300 text-sm flex items-center gap-1.5">
                    <Sparkles className="h-4 w-4" /> Posisi &amp; Pergerakan BSISO Terkini
                  </div>
                  <div className="p-2.5 rounded-lg bg-white dark:bg-slate-900 border dark:border-slate-800 space-y-1">
                    <div className="text-slate-500 text-[11px]">Fase Aktif:</div>
                    <div className="text-base font-black text-indigo-600 dark:text-indigo-400">
                      Fase {currentBsiso.phase} (Amp: {currentBsiso.amplitude})
                    </div>
                    <div className="text-[11px] font-semibold text-slate-700 dark:text-slate-300">
                      {currentBsiso.name}
                    </div>
                  </div>
                  <p className="text-slate-600 dark:text-slate-300 leading-relaxed text-[11px]">
                    Garis lintasan biru muda menunjukkan pergerakan titik BSISO selama 30 hari terakhir. Titik ungu bercahaya menunjukkan posisi hari ini.
                  </p>
                </div>
              </div>
            </div>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
};
