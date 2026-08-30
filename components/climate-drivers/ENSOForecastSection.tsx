// components/climate-drivers/ENSOForecastSection.tsx
"use client";

import React, { useState, useMemo } from "react";
import useSWR from "swr";
import ReactECharts from "echarts-for-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import {
  TrendingUp,
  Sparkles,
  RefreshCw,
  Info,
  Waves,
  Calendar,
  Layers,
  Loader2,
  HelpCircle,
  BarChart3,
  Flame,
  Snowflake,
  Activity,
} from "lucide-react";
import { EnsoForecastData } from "@/lib/climate-drivers/types";

const fetcher = async (url: string) => {
  const res = await fetch(url);
  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.error || "Gagal memuat data prakiraan musiman");
  }
  return res.json();
};

interface ENSOForecastSectionProps {
  isDarkMode?: boolean;
}

export const ENSOForecastSection: React.FC<ENSOForecastSectionProps> = ({
  isDarkMode = false,
}) => {
  const [selectedRegion, setSelectedRegion] = useState<"nino34" | "nino3" | "nino4" | "nino12">("nino34");
  const [viewMode, setViewMode] = useState<"plume" | "prob">("plume");

  const { data, error, isLoading, mutate } = useSWR<EnsoForecastData>(
    `/api/climate-drivers/enso/forecast?region=${selectedRegion}`,
    fetcher,
    { revalidateOnFocus: false, dedupingInterval: 60000 }
  );

  const regionOptions = [
    { id: "nino34", label: "Niño 3.4 (Utama)", desc: "Pasifik Tengah-Timur (5°N-5°S, 170°W-120°W)" },
    { id: "nino3", label: "Niño 3", desc: "Pasifik Timur (5°N-5°S, 150°W-90°W)" },
    { id: "nino4", label: "Niño 4", desc: "Pasifik Barat (5°N-5°S, 160°E-150°W)" },
    { id: "nino12", label: "Niño 1+2", desc: "Pesisir Amerika Selatan (0°-10°S, 90°W-80°W)" },
  ];

  // ECharts Multi-Member Plume Forecast Configuration
  const plumeChartOption = useMemo(() => {
    if (!data || !data.months || data.months.length === 0) return {};

    const labels = data.months.map((m) => m.label);
    const meanAnomalies = data.months.map((m) => m.meanAnomaly);
    const p25Anomalies = data.months.map((m) => m.p25Anomaly);
    const p75Anomalies = data.months.map((m) => m.p75Anomaly);
    const minAnomalies = data.months.map((m) => m.minAnomaly);
    const maxAnomalies = data.months.map((m) => m.maxAnomaly);

    // Build series for individual ensemble members (51 lines)
    const memberCount = data.months[0]?.members?.length || 0;
    const memberSeries: any[] = [];

    for (let memberIdx = 0; memberIdx < memberCount; memberIdx++) {
      const seriesData = data.months.map((m) => m.members[memberIdx] ?? m.meanAnomaly);
      memberSeries.push({
        name: `Member ${memberIdx + 1}`,
        type: "line",
        data: seriesData,
        smooth: true,
        showSymbol: false,
        lineStyle: {
          color: isDarkMode ? "rgba(129, 140, 248, 0.15)" : "rgba(99, 102, 241, 0.15)",
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
          html += `<div class="flex justify-between gap-4"><span class="text-slate-400">Rata-rata Ensemble:</span> <b class="${monthObj.meanAnomaly >= 0.5 ? "text-rose-500" : monthObj.meanAnomaly <= -0.5 ? "text-blue-500" : "text-emerald-500"}">${monthObj.meanAnomaly > 0 ? "+" : ""}${monthObj.meanAnomaly}°C</b></div>`;
          html += `<div class="flex justify-between gap-4"><span class="text-slate-400">Rentang (IQR 25%-75%):</span> <b>${monthObj.p25Anomaly > 0 ? "+" : ""}${monthObj.p25Anomaly}°C s/d ${monthObj.p75Anomaly > 0 ? "+" : ""}${monthObj.p75Anomaly}°C</b></div>`;
          html += `<div class="flex justify-between gap-4"><span class="text-slate-400">SST Rata-rata:</span> <b>${monthObj.meanSst}°C</b></div>`;
          html += `<div class="mt-1 pt-1 border-t border-slate-700/50 flex justify-between gap-2">`;
          html += `<span class="text-rose-400">El Niño: ${monthObj.probability.elNino}%</span> | `;
          html += `<span class="text-slate-300">Netral: ${monthObj.probability.neutral}%</span> | `;
          html += `<span class="text-blue-400">La Niña: ${monthObj.probability.laNina}%</span>`;
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
        name: "SST Anomali (°C)",
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
          data: p25Anomalies,
          lineStyle: { opacity: 0 },
          stack: "confidence-band",
          symbol: "none",
          z: 3,
        },
        {
          name: "Rentang Keyakinan 50% (P25 - P75)",
          type: "line",
          data: p75Anomalies.map((val, i) => Number((val - p25Anomalies[i]).toFixed(2))),
          lineStyle: { opacity: 0 },
          areaStyle: {
            color: isDarkMode ? "rgba(99, 102, 241, 0.25)" : "rgba(99, 102, 241, 0.20)",
          },
          stack: "confidence-band",
          symbol: "none",
          z: 3,
        },
        // Ensemble Mean Line
        {
          name: "Ensemble Mean (Rata-rata)",
          type: "line",
          data: meanAnomalies,
          smooth: true,
          symbol: "circle",
          symbolSize: 7,
          itemStyle: { color: "#6366f1" },
          lineStyle: { color: "#6366f1", width: 3.5, shadowColor: "rgba(99, 102, 241, 0.4)", shadowBlur: 8 },
          z: 10,
          markLine: {
            symbol: "none",
            data: [
              {
                yAxis: 0.5,
                lineStyle: { color: "#ef4444", type: "dashed", width: 1.5 },
                label: { formatter: "Ambang El Niño (+0.5°C)", position: "insideEndTop", color: "#ef4444", fontSize: 10 },
              },
              {
                yAxis: 0,
                lineStyle: { color: isDarkMode ? "#64748b" : "#94a3b8", type: "solid", width: 1 },
                label: { formatter: "Baseline Normal (0.0°C)", position: "insideEndTop", color: isDarkMode ? "#64748b" : "#94a3b8", fontSize: 10 },
              },
              {
                yAxis: -0.5,
                lineStyle: { color: "#3b82f6", type: "dashed", width: 1.5 },
                label: { formatter: "Ambang La Niña (-0.5°C)", position: "insideEndBottom", color: "#3b82f6", fontSize: 10 },
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
    const elNinoProbs = data.months.map((m) => m.probability.elNino);
    const neutralProbs = data.months.map((m) => m.probability.neutral);
    const laNinaProbs = data.months.map((m) => m.probability.laNina);

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
        data: ["El Niño", "Netral", "La Niña"],
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
          name: "El Niño",
          type: "bar",
          stack: "total",
          data: elNinoProbs,
          itemStyle: { color: "#ef4444" },
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
          name: "La Niña",
          type: "bar",
          stack: "total",
          data: laNinaProbs,
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
                <TrendingUp className="h-5 w-5 text-indigo-500" /> Prakiraan &amp; Proyeksi Musiman ENSO (6-7 Bulan)
              </CardTitle>
              <Badge className="bg-indigo-100 dark:bg-indigo-950/80 text-indigo-700 dark:text-indigo-300 border-indigo-300 dark:border-indigo-800 text-[10px] font-bold">
                ECMWF SEAS5 Ensemble (51 Members)
              </Badge>
            </div>
            <CardDescription className="text-xs text-slate-500 dark:text-slate-400">
              Proyeksi evolusi suhu permukaan laut (SST Anomaly) dan probabilitas fase El Niño / La Niña jangka panjang
            </CardDescription>
          </div>

          {/* Action & View Switcher */}
          <div className="flex items-center gap-2 self-start md:self-auto">
            <div className="flex items-center p-1 bg-slate-100 dark:bg-slate-800 rounded-lg text-xs">
              <button
                onClick={() => setViewMode("plume")}
                className={`px-3 py-1.5 rounded-md font-semibold transition flex items-center gap-1.5 ${
                  viewMode === "plume"
                    ? "bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 shadow-sm"
                    : "text-slate-600 dark:text-slate-400 hover:text-slate-900"
                }`}
              >
                <Activity className="h-3.5 w-3.5" /> Ensemble Plume
              </button>
              <button
                onClick={() => setViewMode("prob")}
                className={`px-3 py-1.5 rounded-md font-semibold transition flex items-center gap-1.5 ${
                  viewMode === "prob"
                    ? "bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 shadow-sm"
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
              title="Perbarui data prakiraan"
            >
              <RefreshCw className={`h-3.5 w-3.5 text-slate-600 dark:text-slate-300 ${isLoading ? "animate-spin" : ""}`} />
            </Button>
          </div>
        </div>

        {/* Region Selector Pills */}
        <div className="flex items-center gap-1.5 pt-3 overflow-x-auto no-scrollbar">
          {regionOptions.map((reg) => {
            const isActive = selectedRegion === reg.id;
            return (
              <button
                key={reg.id}
                onClick={() => setSelectedRegion(reg.id as any)}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition border ${
                  isActive
                    ? "bg-indigo-600 text-white border-indigo-600 shadow-sm"
                    : "bg-slate-50 dark:bg-slate-950/60 text-slate-600 dark:text-slate-400 border-slate-200 dark:border-slate-800 hover:bg-slate-100"
                }`}
              >
                {reg.label}
              </button>
            );
          })}
        </div>
      </CardHeader>

      <CardContent className="pt-4 space-y-6">
        {isLoading && !data ? (
          <div className="flex flex-col items-center justify-center min-h-[300px] gap-3">
            <Loader2 className="h-7 w-7 animate-spin text-indigo-500" />
            <p className="text-xs text-slate-500 font-medium animate-pulse">
              Mengambil 51 ensemble members dari Open-Meteo ECMWF SEAS5...
            </p>
          </div>
        ) : error ? (
          <div className="p-4 rounded-xl bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-300 text-xs border border-rose-200 dark:border-rose-900">
            Terjadi kesalahan saat memuat data proyeksi ENSO: {error.message}
          </div>
        ) : data ? (
          <>
            {/* Summary Highlights Metric Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-950/40 flex items-center gap-3">
                <div className={`p-2.5 rounded-xl ${data.summary.peakAnomaly >= 0.5 ? "bg-rose-100 text-rose-600 dark:bg-rose-950/60 dark:text-rose-400" : data.summary.peakAnomaly <= -0.5 ? "bg-blue-100 text-blue-600 dark:bg-blue-950/60 dark:text-blue-400" : "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300"}`}>
                  {data.summary.peakAnomaly >= 0.5 ? <Flame className="h-5 w-5" /> : data.summary.peakAnomaly <= -0.5 ? <Snowflake className="h-5 w-5" /> : <Activity className="h-5 w-5" />}
                </div>
                <div>
                  <div className="text-[11px] text-slate-500 dark:text-slate-400 font-medium">Proyeksi Fase Dominan</div>
                  <div className="text-sm font-bold text-slate-900 dark:text-slate-100 flex items-center gap-1.5">
                    {data.summary.dominantPhase}
                    <span className="text-[11px] font-mono text-indigo-500 font-normal">
                      ({data.summary.peakAnomaly > 0 ? "+" : ""}{data.summary.peakAnomaly}°C)
                    </span>
                  </div>
                </div>
              </div>

              <div className="p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-950/40 flex items-center gap-3">
                <div className="p-2.5 rounded-xl bg-indigo-100 text-indigo-600 dark:bg-indigo-950/60 dark:text-indigo-400">
                  <Calendar className="h-5 w-5" />
                </div>
                <div>
                  <div className="text-[11px] text-slate-500 dark:text-slate-400 font-medium">Puncak Anomali Model</div>
                  <div className="text-sm font-bold text-slate-900 dark:text-slate-100">
                    {data.summary.peakMonth || "-"}
                  </div>
                </div>
              </div>

              <div className="p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-950/40 flex items-center gap-3">
                <div className="p-2.5 rounded-xl bg-amber-100 text-amber-600 dark:bg-amber-950/60 dark:text-amber-400">
                  <Waves className="h-5 w-5" />
                </div>
                <div>
                  <div className="text-[11px] text-slate-500 dark:text-slate-400 font-medium">Wilayah Terpilih</div>
                  <div className="text-xs font-bold text-slate-900 dark:text-slate-100 truncate max-w-[180px]">
                    {data.regionName}
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
                      <Activity className="h-4 w-4 text-indigo-500" /> Proyeksi Ensemble Plume 51 Anggota (ECMWF SEAS5)
                    </>
                  ) : (
                    <>
                      <BarChart3 className="h-4 w-4 text-indigo-500" /> Probabilitas Fase Iklim Bulanan (%)
                    </>
                  )}
                </h4>
                <div className="text-[10px] text-slate-400">
                  {viewMode === "plume" ? "Garis tebal: Ensemble Mean | Bayangan: Rentang Keyakinan 50%" : "Berdasarkan sebaran 51 ensemble members"}
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

            {/* Official NOAA CPC & IRI Consensus Matrix Card */}
            <div className="p-5 rounded-2xl border border-indigo-200 dark:border-indigo-900/60 bg-gradient-to-r from-indigo-50/50 via-white to-slate-50/60 dark:from-indigo-950/30 dark:via-slate-900/40 dark:to-slate-950/50 space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-indigo-100 dark:border-indigo-900/40 pb-3">
                <div className="space-y-0.5">
                  <div className="flex items-center gap-2">
                    <Sparkles className="h-4 w-4 text-indigo-500" />
                    <span className="text-xs font-bold text-slate-900 dark:text-slate-100 uppercase tracking-wider">
                      Konsensus Resmi NOAA CPC &amp; IRI Multi-Model
                    </span>
                    <Badge variant="outline" className="text-[9px] font-semibold bg-indigo-100/50 dark:bg-indigo-900/50 text-indigo-700 dark:text-indigo-300 border-indigo-300">
                      Rilis: {data.officialConsensus.issuedDate}
                    </Badge>
                  </div>
                  <div className="text-xs text-indigo-900 dark:text-indigo-300 font-semibold">
                    Status: {data.officialConsensus.status}
                  </div>
                </div>
                <div className="text-[10px] text-slate-400">
                  Sumber: NOAA Climate Prediction Center &amp; Columbia IRI
                </div>
              </div>

              <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
                {data.officialConsensus.discussion}
              </p>

              {/* Multi-Season Probability Grid */}
              <div className="space-y-2">
                <div className="text-[11px] font-bold text-slate-700 dark:text-slate-300">
                  Distribusi Probabilitas Musiman Konsensus Global (Tercile Probabilities):
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2">
                  {data.officialConsensus.seasons.map((s, idx) => (
                    <div
                      key={idx}
                      className="p-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white/80 dark:bg-slate-900/80 text-center space-y-1.5"
                    >
                      <div className="text-[11px] font-bold text-slate-800 dark:text-slate-200">{s.season}</div>
                      <div className="space-y-1 text-[10px]">
                        <div className="flex justify-between text-rose-600 dark:text-rose-400 font-semibold">
                          <span>El Niño:</span> <span>{s.elNinoProb}%</span>
                        </div>
                        <div className="flex justify-between text-slate-500 font-medium">
                          <span>Netral:</span> <span>{s.neutralProb}%</span>
                        </div>
                        <div className="flex justify-between text-blue-600 dark:text-blue-400 font-semibold">
                          <span>La Niña:</span> <span>{s.laNinaProb}%</span>
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
