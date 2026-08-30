// components/climate-drivers/IODForecastSection.tsx
"use client";

import React, { useState, useMemo } from "react";
import useSWR from "swr";
import ReactECharts from "echarts-for-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  TrendingUp,
  Sparkles,
  RefreshCw,
  Compass,
  Calendar,
  Layers,
  Loader2,
  BarChart3,
  Flame,
  Droplets,
  Activity,
} from "lucide-react";
import { IodForecastData } from "@/lib/climate-drivers/types";

const fetcher = async (url: string) => {
  const res = await fetch(url);
  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.error || "Gagal memuat data prakiraan musiman IOD");
  }
  return res.json();
};

interface IODForecastSectionProps {
  isDarkMode?: boolean;
}

export const IODForecastSection: React.FC<IODForecastSectionProps> = ({
  isDarkMode = false,
}) => {
  const [viewMode, setViewMode] = useState<"plume" | "prob">("plume");

  const { data, error, isLoading, mutate } = useSWR<IodForecastData>(
    `/api/climate-drivers/iod/forecast`,
    fetcher,
    { revalidateOnFocus: false, dedupingInterval: 60000 }
  );

  // ECharts Multi-Member Plume Forecast Configuration for DMI
  const plumeChartOption = useMemo(() => {
    if (!data || !data.months || data.months.length === 0) return {};

    const labels = data.months.map((m) => m.label);
    const meanDmis = data.months.map((m) => m.meanDmi);
    const p25Dmis = data.months.map((m) => m.p25Dmi);
    const p75Dmis = data.months.map((m) => m.p75Dmi);

    const memberCount = data.months[0]?.dmiMembers?.length || 0;
    const memberSeries: any[] = [];

    for (let memberIdx = 0; memberIdx < memberCount; memberIdx++) {
      const seriesData = data.months.map((m) => m.dmiMembers[memberIdx] ?? m.meanDmi);
      memberSeries.push({
        name: `Member ${memberIdx + 1}`,
        type: "line",
        data: seriesData,
        smooth: true,
        showSymbol: false,
        lineStyle: {
          color: isDarkMode ? "rgba(251, 191, 36, 0.15)" : "rgba(245, 158, 11, 0.15)",
          width: 1,
        },
        z: 2,
      });
    }

    return {
      backgroundColor: "transparent",
      tooltip: {
        trigger: "axis",
        backgroundColor: isDarkMode ? "#0f172a" : "#ffffff",
        borderColor: isDarkMode ? "#334155" : "#e2e8f0",
        textStyle: { color: isDarkMode ? "#f8fafc" : "#0f172a", fontSize: 12 },
        formatter: (params: any[]) => {
          const monthIdx = params[0]?.dataIndex ?? 0;
          const monthObj = data.months[monthIdx];
          if (!monthObj) return "";

          let html = `<div class="font-bold text-sm mb-1">${monthObj.label} (${monthObj.season})</div>`;
          html += `<div class="text-xs space-y-1">`;
          html += `<div class="flex justify-between gap-4"><span class="text-slate-400">Rata-rata DMI:</span> <b class="${monthObj.meanDmi >= 0.40 ? "text-amber-500" : monthObj.meanDmi <= -0.40 ? "text-blue-500" : "text-emerald-500"}">${monthObj.meanDmi > 0 ? "+" : ""}${monthObj.meanDmi}°C</b></div>`;
          html += `<div class="flex justify-between gap-4"><span class="text-slate-400">Rentang (IQR 25%-75%):</span> <b>${monthObj.p25Dmi > 0 ? "+" : ""}${monthObj.p25Dmi}°C s/d ${monthObj.p75Dmi > 0 ? "+" : ""}${monthObj.p75Dmi}°C</b></div>`;
          html += `<div class="flex justify-between gap-4"><span class="text-slate-400">Anomali WTIO (Barat):</span> <b>${monthObj.wtioAnomaly > 0 ? "+" : ""}${monthObj.wtioAnomaly}°C</b></div>`;
          html += `<div class="flex justify-between gap-4"><span class="text-slate-400">Anomali SETIO (Timur):</span> <b>${monthObj.setioAnomaly > 0 ? "+" : ""}${monthObj.setioAnomaly}°C</b></div>`;
          html += `<div class="mt-1 pt-1 border-t border-slate-700/50 flex justify-between gap-2">`;
          html += `<span class="text-amber-400">IOD Positif: ${monthObj.probability.positiveIod}%</span> | `;
          html += `<span class="text-slate-300">Netral: ${monthObj.probability.neutral}%</span> | `;
          html += `<span class="text-blue-400">IOD Negatif: ${monthObj.probability.negativeIod}%</span>`;
          html += `</div></div>`;
          return html;
        },
      },
      grid: {
        top: 40,
        left: 55,
        right: 25,
        bottom: 35,
        containLabel: false,
      },
      xAxis: {
        type: "category",
        data: labels,
        axisLine: { lineStyle: { color: isDarkMode ? "#334155" : "#cbd5e1" } },
        axisLabel: { color: isDarkMode ? "#94a3b8" : "#64748b", fontSize: 11 },
      },
      yAxis: {
        type: "value",
        name: "DMI Anomali (°C)",
        nameTextStyle: { color: isDarkMode ? "#94a3b8" : "#64748b", fontSize: 11 },
        splitLine: { lineStyle: { color: isDarkMode ? "#1e293b" : "#f1f5f9" } },
        axisLabel: {
          color: isDarkMode ? "#94a3b8" : "#64748b",
          fontSize: 11,
          formatter: (v: number) => (v > 0 ? `+${v}°C` : `${v}°C`),
        },
      },
      series: [
        ...memberSeries,
        // Confidence Ribbon (IQR 25% - 75%)
        {
          name: "IQR Lower (25%)",
          type: "line",
          data: p25Dmis,
          lineStyle: { opacity: 0 },
          stack: "confidence-band-iod",
          symbol: "none",
          z: 3,
        },
        {
          name: "Rentang Keyakinan 50% (P25 - P75)",
          type: "line",
          data: p75Dmis.map((val, i) => Number((val - p25Dmis[i]).toFixed(2))),
          lineStyle: { opacity: 0 },
          areaStyle: {
            color: isDarkMode ? "rgba(245, 158, 11, 0.25)" : "rgba(245, 158, 11, 0.20)",
          },
          stack: "confidence-band-iod",
          symbol: "none",
          z: 3,
        },
        // Ensemble Mean Line
        {
          name: "Ensemble Mean DMI",
          type: "line",
          data: meanDmis,
          smooth: true,
          symbol: "circle",
          symbolSize: 7,
          itemStyle: { color: "#f59e0b" },
          lineStyle: { color: "#f59e0b", width: 3.5, shadowColor: "rgba(245, 158, 11, 0.4)", shadowBlur: 8 },
          z: 10,
          markLine: {
            symbol: "none",
            data: [
              {
                yAxis: 0.40,
                lineStyle: { color: "#f59e0b", type: "dashed", width: 1.5 },
                label: { formatter: "Ambang IOD Positif (+0.40°C)", position: "insideEndTop", color: "#f59e0b", fontSize: 10 },
              },
              {
                yAxis: 0,
                lineStyle: { color: isDarkMode ? "#64748b" : "#94a3b8", type: "solid", width: 1 },
                label: { formatter: "Baseline Normal (0.0°C)", position: "insideEndTop", color: isDarkMode ? "#64748b" : "#94a3b8", fontSize: 10 },
              },
              {
                yAxis: -0.40,
                lineStyle: { color: "#3b82f6", type: "dashed", width: 1.5 },
                label: { formatter: "Ambang IOD Negatif (-0.40°C)", position: "insideEndBottom", color: "#3b82f6", fontSize: 10 },
              },
            ],
          },
        },
      ],
    };
  }, [data, isDarkMode]);

  // ECharts Seasonal Probability Stacked Bar Chart Configuration
  const probabilityChartOption = useMemo(() => {
    if (!data || !data.months || data.months.length === 0) return {};

    const labels = data.months.map((m) => `${m.label}\n(${m.season})`);
    const posProbs = data.months.map((m) => m.probability.positiveIod);
    const neutralProbs = data.months.map((m) => m.probability.neutral);
    const negProbs = data.months.map((m) => m.probability.negativeIod);

    return {
      backgroundColor: "transparent",
      tooltip: {
        trigger: "axis",
        axisPointer: { type: "shadow" },
        backgroundColor: isDarkMode ? "#0f172a" : "#ffffff",
        borderColor: isDarkMode ? "#334155" : "#e2e8f0",
        textStyle: { color: isDarkMode ? "#f8fafc" : "#0f172a", fontSize: 12 },
      },
      legend: {
        top: 0,
        textStyle: { color: isDarkMode ? "#cbd5e1" : "#475569", fontSize: 11 },
        data: ["IOD Positif", "Netral", "IOD Negatif"],
      },
      grid: {
        top: 40,
        left: 45,
        right: 20,
        bottom: 45,
        containLabel: false,
      },
      xAxis: {
        type: "category",
        data: labels,
        axisLine: { lineStyle: { color: isDarkMode ? "#334155" : "#cbd5e1" } },
        axisLabel: { color: isDarkMode ? "#94a3b8" : "#64748b", fontSize: 10, interval: 0 },
      },
      yAxis: {
        type: "value",
        max: 100,
        name: "Probabilitas (%)",
        nameTextStyle: { color: isDarkMode ? "#94a3b8" : "#64748b", fontSize: 11 },
        splitLine: { lineStyle: { color: isDarkMode ? "#1e293b" : "#f1f5f9" } },
        axisLabel: { color: isDarkMode ? "#94a3b8" : "#64748b", fontSize: 11, formatter: "{value}%" },
      },
      series: [
        {
          name: "IOD Positif",
          type: "bar",
          stack: "total",
          data: posProbs,
          itemStyle: { color: "#f59e0b" },
          label: {
            show: true,
            position: "inside",
            formatter: (p: any) => (p.value >= 12 ? `${p.value}%` : ""),
            color: "#ffffff",
            fontSize: 10,
            fontWeight: "bold",
          },
        },
        {
          name: "Netral",
          type: "bar",
          stack: "total",
          data: neutralProbs,
          itemStyle: { color: isDarkMode ? "#475569" : "#94a3b8" },
          label: {
            show: true,
            position: "inside",
            formatter: (p: any) => (p.value >= 12 ? `${p.value}%` : ""),
            color: "#ffffff",
            fontSize: 10,
            fontWeight: "bold",
          },
        },
        {
          name: "IOD Negatif",
          type: "bar",
          stack: "total",
          data: negProbs,
          itemStyle: { color: "#3b82f6" },
          label: {
            show: true,
            position: "inside",
            formatter: (p: any) => (p.value >= 12 ? `${p.value}%` : ""),
            color: "#ffffff",
            fontSize: 10,
            fontWeight: "bold",
          },
        },
      ],
    };
  }, [data, isDarkMode]);

  return (
    <Card className="border-none shadow-sm dark:bg-slate-900 bg-white overflow-hidden">
      <CardHeader className="pb-4 border-b dark:border-slate-800">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2 flex-wrap">
              <CardTitle className="text-lg font-extrabold flex items-center gap-2 text-slate-900 dark:text-slate-100">
                <TrendingUp className="h-5 w-5 text-amber-500" /> Prakiraan &amp; Proyeksi Musiman IOD (DMI)
              </CardTitle>
              <Badge className="bg-amber-100 dark:bg-amber-950/80 text-amber-700 dark:text-amber-300 border-amber-300 dark:border-amber-800 text-[10px] font-bold">
                ECMWF SEAS5 Ensemble (51 Members)
              </Badge>
            </div>
            <CardDescription className="text-xs text-slate-500 dark:text-slate-400">
              Proyeksi evolusi Dipole Mode Index (DMI) Samudra Hindia Barat (WTIO) vs Timur (SETIO) 6-7 bulan ke depan
            </CardDescription>
          </div>

          {/* Action & View Switcher */}
          <div className="flex items-center gap-2 self-start md:self-auto">
            <div className="flex items-center p-1 bg-slate-100 dark:bg-slate-800 rounded-lg text-xs">
              <button
                onClick={() => setViewMode("plume")}
                className={`px-3 py-1.5 rounded-md font-semibold transition flex items-center gap-1.5 ${
                  viewMode === "plume"
                    ? "bg-white dark:bg-slate-900 text-amber-600 dark:text-amber-400 shadow-sm"
                    : "text-slate-600 dark:text-slate-400 hover:text-slate-900"
                }`}
              >
                <Activity className="h-3.5 w-3.5" /> DMI Plume
              </button>
              <button
                onClick={() => setViewMode("prob")}
                className={`px-3 py-1.5 rounded-md font-semibold transition flex items-center gap-1.5 ${
                  viewMode === "prob"
                    ? "bg-white dark:bg-slate-900 text-amber-600 dark:text-amber-400 shadow-sm"
                    : "text-slate-600 dark:text-slate-400 hover:text-slate-900"
                }`}
              >
                <BarChart3 className="h-3.5 w-3.5" /> Probabilitas Fase
              </button>
            </div>

            <Button
              variant="outline"
              size="sm"
              onClick={() => mutate()}
              disabled={isLoading}
              className="h-8 w-8 p-0"
              title="Perbarui data prakiraan IOD"
            >
              <RefreshCw className={`h-3.5 w-3.5 text-slate-600 dark:text-slate-300 ${isLoading ? "animate-spin" : ""}`} />
            </Button>
          </div>
        </div>
      </CardHeader>

      <CardContent className="pt-4 space-y-6">
        {isLoading && !data ? (
          <div className="flex flex-col items-center justify-center min-h-[300px] gap-3">
            <Loader2 className="h-7 w-7 animate-spin text-amber-500" />
            <p className="text-xs text-slate-500 font-medium animate-pulse">
              Menghitung selisih anomali WTIO vs SETIO dari 51 ensemble members SEAS5...
            </p>
          </div>
        ) : error ? (
          <div className="p-4 rounded-xl bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-300 text-xs border border-rose-200 dark:border-rose-900">
            Terjadi kesalahan saat memuat data proyeksi IOD: {error.message}
          </div>
        ) : data ? (
          <>
            {/* Metric Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-950/40 flex items-center gap-3">
                <div className={`p-2.5 rounded-xl ${data.summary.peakDmi >= 0.40 ? "bg-amber-100 text-amber-600 dark:bg-amber-950/60 dark:text-amber-400" : data.summary.peakDmi <= -0.40 ? "bg-blue-100 text-blue-600 dark:bg-blue-950/60 dark:text-blue-400" : "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300"}`}>
                  {data.summary.peakDmi >= 0.40 ? <Flame className="h-5 w-5" /> : data.summary.peakDmi <= -0.40 ? <Droplets className="h-5 w-5" /> : <Compass className="h-5 w-5" />}
                </div>
                <div>
                  <div className="text-[11px] text-slate-500 dark:text-slate-400 font-medium">Proyeksi Fase IOD Dominan</div>
                  <div className="text-sm font-bold text-slate-900 dark:text-slate-100 flex items-center gap-1.5">
                    {data.summary.dominantPhase}
                    <span className="text-[11px] font-mono text-amber-500 font-normal">
                      ({data.summary.peakDmi > 0 ? "+" : ""}{data.summary.peakDmi}°C)
                    </span>
                  </div>
                </div>
              </div>

              <div className="p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-950/40 flex items-center gap-3">
                <div className="p-2.5 rounded-xl bg-amber-100 text-amber-600 dark:bg-amber-950/60 dark:text-amber-400">
                  <Calendar className="h-5 w-5" />
                </div>
                <div>
                  <div className="text-[11px] text-slate-500 dark:text-slate-400 font-medium">Puncak Anomali DMI</div>
                  <div className="text-sm font-bold text-slate-900 dark:text-slate-100">
                    {data.summary.peakMonth || "-"}
                  </div>
                </div>
              </div>

              <div className="p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-950/40 flex items-center gap-3">
                <div className="p-2.5 rounded-xl bg-indigo-100 text-indigo-600 dark:bg-indigo-950/60 dark:text-indigo-400">
                  <Layers className="h-5 w-5" />
                </div>
                <div>
                  <div className="text-[11px] text-slate-500 dark:text-slate-400 font-medium">Kotak Pemantauan</div>
                  <div className="text-xs font-bold text-slate-900 dark:text-slate-100 truncate max-w-[180px]">
                    WTIO (60°E) vs SETIO (100°E)
                  </div>
                </div>
              </div>
            </div>

            {/* Main Interactive Chart View */}
            <div className="p-4 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950/50">
              <div className="flex items-center justify-between mb-2">
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-300 flex items-center gap-2">
                  {viewMode === "plume" ? (
                    <>
                      <Activity className="h-4 w-4 text-amber-500" /> Proyeksi DMI Ensemble Plume 51 Anggota (ECMWF SEAS5)
                    </>
                  ) : (
                    <>
                      <BarChart3 className="h-4 w-4 text-amber-500" /> Probabilitas Fase IOD Bulanan (%)
                    </>
                  )}
                </h4>
                <div className="text-[10px] text-slate-400">
                  {viewMode === "plume" ? "Garis tebal: Ensemble Mean | Ambang Batas: ±0.40°C" : "Berdasarkan sebaran 51 ensemble members"}
                </div>
              </div>

              <div className="h-[320px] w-full">
                {viewMode === "plume" ? (
                  <ReactECharts option={plumeChartOption} style={{ height: "100%", width: "100%" }} />
                ) : (
                  <ReactECharts option={probabilityChartOption} style={{ height: "100%", width: "100%" }} />
                )}
              </div>
            </div>

            {/* Official BOM ACCESS-S Consensus Outlook Card */}
            <div className="p-5 rounded-2xl border border-amber-200 dark:border-amber-900/60 bg-gradient-to-r from-amber-50/50 via-white to-slate-50/60 dark:from-amber-950/30 dark:via-slate-900/40 dark:to-slate-950/50 space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-amber-100 dark:border-amber-900/40 pb-3">
                <div className="space-y-0.5">
                  <div className="flex items-center gap-2">
                    <Sparkles className="h-4 w-4 text-amber-500" />
                    <span className="text-xs font-bold text-slate-900 dark:text-slate-100 uppercase tracking-wider">
                      Konsensus Resmi BOM Australia ACCESS-S IOD Outlook
                    </span>
                    <Badge variant="outline" className="text-[9px] font-semibold bg-amber-100/50 dark:bg-amber-900/50 text-amber-700 dark:text-amber-300 border-amber-300">
                      Rilis: {data.officialConsensus.issuedDate}
                    </Badge>
                  </div>
                  <div className="text-xs text-amber-900 dark:text-amber-300 font-semibold">
                    Status: {data.officialConsensus.status}
                  </div>
                </div>
                <div className="text-[10px] text-slate-400">
                  Sumber: Bureau of Meteorology (BOM) Australia
                </div>
              </div>

              <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
                {data.officialConsensus.discussion}
              </p>

              {/* Multi-Season Probability Grid */}
              <div className="space-y-2">
                <div className="text-[11px] font-bold text-slate-700 dark:text-slate-300">
                  Distribusi Probabilitas Fase IOD Musiman Konsensus Model:
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2">
                  {data.officialConsensus.seasons.map((s, idx) => (
                    <div
                      key={idx}
                      className="p-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white/80 dark:bg-slate-900/80 text-center space-y-1.5"
                    >
                      <div className="text-[11px] font-bold text-slate-800 dark:text-slate-200">{s.season}</div>
                      <div className="space-y-1 text-[10px]">
                        <div className="flex justify-between text-amber-600 dark:text-amber-400 font-semibold">
                          <span>Positif:</span> <span>{s.positiveProb}%</span>
                        </div>
                        <div className="flex justify-between text-slate-500 font-medium">
                          <span>Netral:</span> <span>{s.neutralProb}%</span>
                        </div>
                        <div className="flex justify-between text-blue-600 dark:text-blue-400 font-semibold">
                          <span>Negatif:</span> <span>{s.negativeProb}%</span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </>
        ) : null}
      </CardContent>
    </Card>
  );
};
