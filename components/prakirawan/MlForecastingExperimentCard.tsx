// components/prakirawan/MlForecastingExperimentCard.tsx
"use client";

import React, { useState, useEffect, useMemo } from "react";
import dynamic from "next/dynamic";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  BrainCircuit,
  TrendingUp,
  Table as TableIcon,
  Sparkles,
  BarChart3,
  RefreshCw,
  Cpu,
  Layers,
  Sliders,
} from "lucide-react";

// Dynamic import ECharts with skeleton loading for zero SSR hydration flicker
const ReactECharts = dynamic(() => import("echarts-for-react"), {
  ssr: false,
  loading: () => (
    <div className="h-72 w-full flex items-center justify-center bg-slate-50 dark:bg-slate-900/40 rounded-xl border border-slate-200 dark:border-slate-800 text-slate-400 text-sm animate-pulse">
      Memuat visualisasi grafik...
    </div>
  ),
});

export default function MlForecastingExperimentCard() {
  const [activeTab, setActiveTab] = useState("fts");

  // State FTS
  const [ftsMode, setFtsMode] = useState<"dasarian" | "monthly">("monthly");
  const [intervalsCount, setIntervalsCount] = useState<number>(7);
  const [futureSteps, setFutureSteps] = useState<number>(3);
  const [loadingFts, setLoadingFts] = useState<boolean>(false);
  const [ftsResult, setFtsResult] = useState<any>(null);

  // State ML Inference
  const [loadingMl, setLoadingMl] = useState<boolean>(false);
  const [mlResult, setMlResult] = useState<any>(null);
  const [mlFeatures, setMlFeatures] = useState({
    temperature: 28.5,
    humidity: 82.0,
    pressure: 1010.8,
    wind_speed: 3.4,
    pressure_change_3h: -1.4,
    temp_change_3h: -0.6,
    rain_accum_3h: 3.8,
  });

  // State Optuna
  const [loadingOptuna, setLoadingOptuna] = useState<boolean>(false);
  const [optunaResult, setOptunaResult] = useState<any>(null);

  // Fetch initial FTS simulation
  const runFtsSimulation = async () => {
    setLoadingFts(true);
    try {
      const res = await fetch(
        `/api/weather/fts-forecast?mode=${ftsMode}&intervalsCount=${intervalsCount}&futureSteps=${futureSteps}`
      );
      if (res.ok) {
        const json = await res.json();
        if (json.success) {
          setFtsResult(json.data);
        }
      }
    } catch (err) {
      console.error("Gagal menjalankan simulasi FTS:", err);
    } finally {
      setLoadingFts(false);
    }
  };

  // Run ML Inference (XGBoost / Random Forest + SHAP)
  const runMlInference = async () => {
    setLoadingMl(true);
    try {
      const res = await fetch(`/api/weather/ml-model`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "predict",
          features: mlFeatures,
        }),
      });
      if (res.ok) {
        const json = await res.json();
        setMlResult(json);
      }
    } catch (err) {
      console.error("Gagal menjalankan inferensi ML:", err);
    } finally {
      setLoadingMl(false);
    }
  };

  // Run Optuna Bayesian Optimization for LSTM
  const runOptunaOptimization = async () => {
    setLoadingOptuna(true);
    try {
      const res = await fetch(`/api/weather/ml-model`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "optimize",
          nTrials: 15,
        }),
      });
      if (res.ok) {
        const json = await res.json();
        setOptunaResult(json);
      }
    } catch (err) {
      console.error("Gagal menjalankan optimasi Optuna:", err);
    } finally {
      setLoadingOptuna(false);
    }
  };

  useEffect(() => {
    runFtsSimulation();
    runMlInference();
  }, [ftsMode]);

  // ECharts Option for FTS (Actual vs Fitted vs Future Forecast)
  const ftsChartOption = useMemo(() => {
    if (!ftsResult || !ftsResult.fittedSeries) return {};

    const periods: string[] = ftsResult.fittedSeries.map((s: any) => s.period);
    const actualData: (number | null)[] = ftsResult.fittedSeries.map((s: any) => s.actual);
    const fittedData: (number | null)[] = ftsResult.fittedSeries.map((s: any) => s.forecast);

    // Append future forecasts
    const futurePeriods = (ftsResult.futureForecasts || []).map((f: any) => `+${f.step} (${f.fuzzySet})`);
    const allPeriods = [...periods, ...futurePeriods];

    // Align series
    const extendedActual = [...actualData, ...new Array(futurePeriods.length).fill(null)];
    const extendedFitted = [...fittedData, ...new Array(futurePeriods.length).fill(null)];

    const futureData = [
      ...new Array(periods.length - 1).fill(null),
      actualData[actualData.length - 1], // Sambungkan garis dari titik observasi terakhir
      ...(ftsResult.futureForecasts || []).map((f: any) => f.predictedValue),
    ];

    return {
      tooltip: {
        trigger: "axis",
        axisPointer: { type: "cross" },
        formatter: (params: any[]) => {
          let str = `<div class="font-bold mb-1">${params[0]?.axisValue}</div>`;
          params.forEach((p) => {
            if (p.value !== null && p.value !== undefined) {
              str += `<div class="flex items-center gap-2 text-xs">
                <span style="background-color:${p.color};width:8px;height:8px;border-radius:50%;display:inline-block"></span>
                <span>${p.seriesName}: <b>${p.value} mm</b></span>
              </div>`;
            }
          });
          return str;
        },
      },
      legend: {
        bottom: 0,
        textStyle: { color: "#94a3b8" },
      },
      grid: {
        left: "3%",
        right: "4%",
        bottom: "12%",
        top: "8%",
        containLabel: true,
      },
      xAxis: {
        type: "category",
        data: allPeriods,
        axisLine: { lineStyle: { color: "#475569" } },
        axisLabel: {
          color: "#94a3b8",
          rotate: ftsMode === "dasarian" ? 45 : 0,
          fontSize: 10,
        },
      },
      yAxis: {
        type: "value",
        name: "Curah Hujan (mm)",
        nameTextStyle: { color: "#94a3b8", fontSize: 11 },
        splitLine: { lineStyle: { color: "#334155", type: "dashed" } },
        axisLabel: { color: "#94a3b8" },
      },
      series: [
        {
          name: "Observasi Aktual",
          type: "line",
          data: extendedActual,
          smooth: true,
          itemStyle: { color: "#38bdf8" },
          lineStyle: { width: 2.5 },
          symbolSize: 6,
        },
        {
          name: "FTS Chen (Fitted)",
          type: "line",
          data: extendedFitted,
          smooth: true,
          itemStyle: { color: "#fb923c" },
          lineStyle: { width: 2, type: "dashed" },
          symbolSize: 4,
        },
        {
          name: "Ramalan Masa Depan",
          type: "line",
          data: futureData,
          smooth: true,
          itemStyle: { color: "#10b981" },
          lineStyle: { width: 3 },
          symbolSize: 8,
          areaStyle: {
            color: "rgba(16, 185, 129, 0.15)",
          },
        },
      ],
    };
  }, [ftsResult, ftsMode]);

  // ECharts Option for SHAP Feature Contributions
  const shapChartOption = useMemo(() => {
    if (!mlResult || !mlResult.shapContributions) return {};

    const contributions = [...mlResult.shapContributions].reverse();
    const featureLabels = contributions.map((c: any) => c.feature);
    const shapValues = contributions.map((c: any) => c.contribution);

    return {
      tooltip: {
        trigger: "axis",
        axisPointer: { type: "shadow" },
        formatter: (params: any[]) => {
          const item = params[0];
          return `<div class="text-xs">
            <b>${item.name}</b><br/>
            Kontribusi SHAP: <b>${item.value > 0 ? "+" : ""}${item.value}</b><br/>
            <span class="text-slate-400">${item.value > 0 ? "Mendorong terjadinya hujan" : "Menekan potensi hujan"}</span>
          </div>`;
        },
      },
      grid: {
        left: "4%",
        right: "8%",
        bottom: "8%",
        top: "6%",
        containLabel: true,
      },
      xAxis: {
        type: "value",
        name: "Pengaruh SHAP",
        nameTextStyle: { color: "#94a3b8", fontSize: 10 },
        splitLine: { lineStyle: { color: "#334155", type: "dashed" } },
        axisLabel: { color: "#94a3b8" },
      },
      yAxis: {
        type: "category",
        data: featureLabels,
        axisLine: { lineStyle: { color: "#475569" } },
        axisLabel: { color: "#cbd5e1", fontSize: 11 },
      },
      series: [
        {
          name: "Kontribusi Fitur",
          type: "bar",
          data: shapValues.map((val: number) => ({
            value: val,
            itemStyle: {
              color: val >= 0 ? "#f43f5e" : "#0ea5e9",
              borderRadius: [0, 4, 4, 0],
            },
          })),
        },
      ],
    };
  }, [mlResult]);

  return (
    <Card className="w-full border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/90 shadow-sm">
      <CardHeader className="pb-3 border-b border-slate-100 dark:border-slate-800">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-lg bg-sky-500/10 text-sky-500 dark:bg-sky-500/20">
              <BrainCircuit className="h-5 w-5" />
            </div>
            <div>
              <CardTitle className="text-base sm:text-lg font-semibold text-slate-900 dark:text-slate-100">
                Eksperimen Prediksi AI & FTS
              </CardTitle>
              <CardDescription className="text-xs text-slate-500 dark:text-slate-400">
                Simulasi peramalan curah hujan Fuzzy Time Series (Chen) dan inferensi Machine Learning berbasis fisika atmosfer
              </CardDescription>
            </div>
          </div>
          <Badge variant="outline" className="text-xs bg-slate-50 dark:bg-slate-800 border-slate-300 dark:border-slate-700 w-fit">
            Next.js & Python ML Backend
          </Badge>
        </div>
      </CardHeader>

      <CardContent className="pt-4">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid grid-cols-3 mb-4 bg-slate-100 dark:bg-slate-800/80 p-1">
            <TabsTrigger value="fts" className="text-xs sm:text-sm flex items-center gap-1.5">
              <TrendingUp className="h-3.5 w-3.5" />
              <span>Peramalan FTS Chen</span>
            </TabsTrigger>
            <TabsTrigger value="rules" className="text-xs sm:text-sm flex items-center gap-1.5">
              <TableIcon className="h-3.5 w-3.5" />
              <span>Relasi Logika Fuzzy</span>
            </TabsTrigger>
            <TabsTrigger value="ml" className="text-xs sm:text-sm flex items-center gap-1.5">
              <Cpu className="h-3.5 w-3.5" />
              <span>Machine Learning & SHAP</span>
            </TabsTrigger>
          </TabsList>

          {/* TAB 1: PERAMALAN FTS CHEN */}
          <TabsContent value="fts" className="space-y-4 mt-0">
            {/* Control Bar */}
            <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 bg-slate-50 dark:bg-slate-800/40 p-3 rounded-xl border border-slate-200 dark:border-slate-800">
              <div>
                <Label className="text-xs text-slate-500 dark:text-slate-400">Granularitas Waktu</Label>
                <Select value={ftsMode} onValueChange={(v: "dasarian" | "monthly") => setFtsMode(v)}>
                  <SelectTrigger className="h-8 text-xs mt-1">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="monthly">Bulanan (24 Bulan)</SelectItem>
                    <SelectItem value="dasarian">Dasarian (36 Dasarian)</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label className="text-xs text-slate-500 dark:text-slate-400">Jumlah Interval (k)</Label>
                <Input
                  type="number"
                  min={4}
                  max={12}
                  value={intervalsCount}
                  onChange={(e) => setIntervalsCount(Number(e.target.value) || 7)}
                  className="h-8 text-xs mt-1"
                />
              </div>

              <div>
                <Label className="text-xs text-slate-500 dark:text-slate-400">Langkah Ramalan (h)</Label>
                <Input
                  type="number"
                  min={1}
                  max={6}
                  value={futureSteps}
                  onChange={(e) => setFutureSteps(Number(e.target.value) || 3)}
                  className="h-8 text-xs mt-1"
                />
              </div>

              <div className="flex items-end">
                <Button
                  onClick={runFtsSimulation}
                  disabled={loadingFts}
                  className="w-full h-8 text-xs bg-sky-600 hover:bg-sky-500 text-white flex items-center gap-1.5"
                >
                  <RefreshCw className={`h-3.5 w-3.5 ${loadingFts ? "animate-spin" : ""}`} />
                  <span>Jalankan FTS</span>
                </Button>
              </div>
            </div>

            {/* Metric Summary Cards */}
            {ftsResult?.metrics && (
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-800">
                  <span className="text-[11px] text-slate-500 dark:text-slate-400">RMSE Model</span>
                  <div className="text-base sm:text-lg font-bold text-slate-900 dark:text-slate-100">
                    {ftsResult.metrics.rmse} <span className="text-xs font-normal text-slate-400">mm</span>
                  </div>
                </div>

                <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-800">
                  <span className="text-[11px] text-slate-500 dark:text-slate-400">MAPE (Galat Rerata)</span>
                  <div className="text-base sm:text-lg font-bold text-amber-500 dark:text-amber-400">
                    {ftsResult.metrics.mape}%
                  </div>
                </div>

                <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-800">
                  <span className="text-[11px] text-slate-500 dark:text-slate-400">MAE (Absolut)</span>
                  <div className="text-base sm:text-lg font-bold text-slate-900 dark:text-slate-100">
                    {ftsResult.metrics.mae} <span className="text-xs font-normal text-slate-400">mm</span>
                  </div>
                </div>

                <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-800">
                  <span className="text-[11px] text-slate-500 dark:text-slate-400">Semesta U</span>
                  <div className="text-xs sm:text-sm font-semibold text-slate-800 dark:text-slate-200 truncate">
                    [{ftsResult.universeOfDiscourse.uMin}, {ftsResult.universeOfDiscourse.uMax}] mm
                  </div>
                </div>
              </div>
            )}

            {/* ECharts Chart */}
            <div className="p-3 rounded-xl bg-slate-900 border border-slate-800">
              <ReactECharts option={ftsChartOption} style={{ height: 280, width: "100%" }} />
            </div>

            {/* Future Forecast Steps Pill Summary */}
            {ftsResult?.futureForecasts && (
              <div className="p-3 rounded-xl bg-emerald-50/50 dark:bg-emerald-950/20 border border-emerald-200 dark:border-emerald-800/60">
                <span className="text-xs font-semibold text-emerald-800 dark:text-emerald-300 flex items-center gap-1.5 mb-2">
                  <Sparkles className="h-3.5 w-3.5" />
                  Prakiraan Multi-Step Masa Depan ({futureSteps} Periode ke Depan):
                </span>
                <div className="flex flex-wrap gap-2">
                  {ftsResult.futureForecasts.map((fc: any) => (
                    <div
                      key={fc.step}
                      className="px-2.5 py-1 rounded-lg bg-white dark:bg-slate-900 border border-emerald-300 dark:border-emerald-700 text-xs text-slate-800 dark:text-slate-200 shadow-xs"
                    >
                      <span className="text-slate-400 font-mono">T+{fc.step}:</span>{" "}
                      <b className="text-emerald-600 dark:text-emerald-400">{fc.predictedValue} mm</b>{" "}
                      <span className="text-[10px] text-slate-400">({fc.fuzzySet})</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </TabsContent>

          {/* TAB 2: TABEL LOGIKA FUZZY */}
          <TabsContent value="rules" className="space-y-4 mt-0">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Universe Partition Table */}
              <div className="rounded-xl border border-slate-200 dark:border-slate-800 overflow-hidden">
                <div className="p-2.5 bg-slate-50 dark:bg-slate-800/60 border-b border-slate-200 dark:border-slate-800 text-xs font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-2">
                  <Layers className="h-3.5 w-3.5 text-sky-500" />
                  Partisi Interval Semesta Pembicaraan (U)
                </div>
                <div className="overflow-x-auto max-h-64">
                  <table className="w-full text-xs text-left">
                    <thead className="bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
                      <tr>
                        <th className="p-2">Himpunan</th>
                        <th className="p-2">Interval (u)</th>
                        <th className="p-2">Rentang (mm)</th>
                        <th className="p-2">Nilai Tengah (m)</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                      {(ftsResult?.intervals || []).map((itv: any) => (
                        <tr key={itv.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30">
                          <td className="p-2 font-bold text-sky-600 dark:text-sky-400">{itv.fuzzySet}</td>
                          <td className="p-2 font-mono text-slate-500">{itv.id}</td>
                          <td className="p-2">[{itv.lower}, {itv.upper}]</td>
                          <td className="p-2 font-semibold">{itv.midpoint} mm</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* FLRG Table */}
              <div className="rounded-xl border border-slate-200 dark:border-slate-800 overflow-hidden">
                <div className="p-2.5 bg-slate-50 dark:bg-slate-800/60 border-b border-slate-200 dark:border-slate-800 text-xs font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-2">
                  <TableIcon className="h-3.5 w-3.5 text-amber-500" />
                  Grup Relasi Logika Fuzzy (FLRG) & Defuzzifikasi
                </div>
                <div className="overflow-x-auto max-h-64">
                  <table className="w-full text-xs text-left">
                    <thead className="bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
                      <tr>
                        <th className="p-2">Antecedent</th>
                        <th className="p-2">Consequents</th>
                        <th className="p-2">Ramalan Chen</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                      {(ftsResult?.flrgTable || []).map((grp: any) => (
                        <tr key={grp.antecedent} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30">
                          <td className="p-2 font-bold text-amber-600 dark:text-amber-400">{grp.antecedent}</td>
                          <td className="p-2 font-mono text-slate-600 dark:text-slate-300">
                            {grp.consequents.length > 0 ? grp.consequents.join(", ") : "-"}
                          </td>
                          <td className="p-2 font-bold text-slate-800 dark:text-slate-100">
                            {grp.forecastValue} mm
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          </TabsContent>

          {/* TAB 3: MACHINE LEARNING & SHAP */}
          <TabsContent value="ml" className="space-y-4 mt-0">
            {/* Feature Sliders / Controls */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-slate-50 dark:bg-slate-800/40 p-3 rounded-xl border border-slate-200 dark:border-slate-800">
              <div>
                <Label className="text-[11px] text-slate-500">Suhu (°C): {mlFeatures.temperature}</Label>
                <Input
                  type="number"
                  step="0.5"
                  value={mlFeatures.temperature}
                  onChange={(e) => setMlFeatures({ ...mlFeatures, temperature: parseFloat(e.target.value) || 28.5 })}
                  className="h-7 text-xs mt-1"
                />
              </div>

              <div>
                <Label className="text-[11px] text-slate-500">Kelembapan (%): {mlFeatures.humidity}</Label>
                <Input
                  type="number"
                  step="1"
                  value={mlFeatures.humidity}
                  onChange={(e) => setMlFeatures({ ...mlFeatures, humidity: parseFloat(e.target.value) || 80.0 })}
                  className="h-7 text-xs mt-1"
                />
              </div>

              <div>
                <Label className="text-[11px] text-slate-500">Perubahan Pres. 3h (hPa): {mlFeatures.pressure_change_3h}</Label>
                <Input
                  type="number"
                  step="0.2"
                  value={mlFeatures.pressure_change_3h}
                  onChange={(e) => setMlFeatures({ ...mlFeatures, pressure_change_3h: parseFloat(e.target.value) || -1.0 })}
                  className="h-7 text-xs mt-1"
                />
              </div>

              <div>
                <Label className="text-[11px] text-slate-500">Akum. Hujan 3h (mm): {mlFeatures.rain_accum_3h}</Label>
                <Input
                  type="number"
                  step="0.5"
                  value={mlFeatures.rain_accum_3h}
                  onChange={(e) => setMlFeatures({ ...mlFeatures, rain_accum_3h: parseFloat(e.target.value) || 0.0 })}
                  className="h-7 text-xs mt-1"
                />
              </div>

              <div className="col-span-2 sm:col-span-4 flex items-center justify-end gap-2 pt-1">
                <Button
                  onClick={runMlInference}
                  disabled={loadingMl}
                  className="h-8 text-xs bg-sky-600 hover:bg-sky-500 text-white flex items-center gap-1.5"
                >
                  <Cpu className={`h-3.5 w-3.5 ${loadingMl ? "animate-spin" : ""}`} />
                  <span>Jalankan Inferensi ML & SHAP</span>
                </Button>
              </div>
            </div>

            {/* Inference Result & Probabilities */}
            {mlResult && (
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-800 flex flex-col justify-center">
                  <span className="text-[11px] text-slate-400">Hasil Klasifikasi Intensitas Hujan</span>
                  <div className="text-base sm:text-lg font-bold text-sky-600 dark:text-sky-400 mt-0.5">
                    {mlResult.intensityLabel}
                  </div>
                  <span className="text-[11px] text-slate-400 mt-1">
                    Kelas Terprediksi: <b>Kelas {mlResult.predictedClass}</b>
                  </span>
                </div>

                <div className="col-span-1 sm:col-span-2 p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-800">
                  <span className="text-[11px] text-slate-400">Distribusi Probabilitas Ensambel</span>
                  <div className="grid grid-cols-4 gap-2 mt-2 text-center text-xs">
                    <div className="p-1.5 rounded-lg bg-slate-100 dark:bg-slate-800">
                      <span className="text-[10px] text-slate-400 block">Nihil</span>
                      <b>{Math.round((mlResult.probabilities?.nihil || 0) * 100)}%</b>
                    </div>
                    <div className="p-1.5 rounded-lg bg-sky-50 dark:bg-sky-950/40 border border-sky-200 dark:border-sky-800/60">
                      <span className="text-[10px] text-sky-500 block">Ringan</span>
                      <b className="text-sky-600 dark:text-sky-400">{Math.round((mlResult.probabilities?.ringan || 0) * 100)}%</b>
                    </div>
                    <div className="p-1.5 rounded-lg bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800/60">
                      <span className="text-[10px] text-amber-500 block">Sedang</span>
                      <b className="text-amber-600 dark:text-amber-400">{Math.round((mlResult.probabilities?.sedang || 0) * 100)}%</b>
                    </div>
                    <div className="p-1.5 rounded-lg bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800/60">
                      <span className="text-[10px] text-rose-500 block">Lebat</span>
                      <b className="text-rose-600 dark:text-rose-400">{Math.round((mlResult.probabilities?.lebat || 0) * 100)}%</b>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* SHAP Feature Contribution Chart */}
            <div className="p-3 rounded-xl bg-slate-900 border border-slate-800">
              <div className="text-xs font-semibold text-slate-300 mb-1 flex items-center justify-between">
                <span>Atribusi Fitur SHAP (SHapley Additive exPlanations)</span>
                <span className="text-[10px] text-slate-400">Merah: Menaikkan Peluang | Biru: Menekan Peluang</span>
              </div>
              <ReactECharts option={shapChartOption} style={{ height: 240, width: "100%" }} />
            </div>

            {/* Optuna LSTM Bayesian Optimization Section */}
            <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-3">
              <div>
                <span className="text-xs font-semibold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                  <Sliders className="h-3.5 w-3.5 text-purple-500" />
                  Optimasi Hyperparameter LSTM (Optuna TPE / Bayesian)
                </span>
                <span className="text-[11px] text-slate-500 dark:text-slate-400 block mt-0.5">
                  {optunaResult
                    ? `Hasil Terbaik: Units ${optunaResult.bestParams?.n_units}, Dropout ${optunaResult.bestParams?.dropout}, LR ${optunaResult.bestParams?.learning_rate} (RMSE: ${optunaResult.bestLossRmse} mm)`
                    : "Pencarian Bayesian parameter arsitektur recurrent neural network untuk minimasi RMSE"}
                </span>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={runOptunaOptimization}
                disabled={loadingOptuna}
                className="text-xs shrink-0"
              >
                <Sparkles className={`h-3.5 w-3.5 mr-1 ${loadingOptuna ? "animate-spin" : ""}`} />
                Uji Coba Optuna
              </Button>
            </div>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}
