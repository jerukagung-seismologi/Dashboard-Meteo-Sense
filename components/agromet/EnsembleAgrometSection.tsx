// components/agromet/EnsembleAgrometSection.tsx
"use client";

import React, { useState, useMemo } from "react";
import useSWR from "swr";
import ReactECharts from "echarts-for-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Thermometer,
  Droplets,
  Gauge,
  Sparkles,
  Layers,
  TrendingUp,
  RefreshCw,
  Info,
  CloudRain,
  Wind,
  Sun,
  Sprout,
  Waves,
  Cpu,
} from "lucide-react";

interface EnsembleAgrometSectionProps {
  lat: number;
  lon: number;
  isDarkMode?: boolean;
}

const GLOBAL_MODELS = [
  { id: "ecmwf_ifs025", label: "ECMWF IFS (50 Member)", badge: "Eropa • 50 Skenario", isAI: false },
  { id: "gfs025", label: "NCEP GFS (30 Member)", badge: "USA/NOAA • 30 Skenario", isAI: false },
  { id: "icon_seamless", label: "DWD ICON (40 Member)", badge: "Jerman • 40 Skenario", isAI: false },
  { id: "gem_global", label: "CMC GEM (20 Member)", badge: "Kanada • 20 Skenario", isAI: false },
  { id: "bom_access_global_ensemble", label: "BOM ACCESS-GE (18 Member)", badge: "Australia • 18 Skenario", isAI: false },
  { id: "gfs_graphcast025", label: "Google DeepMind GraphCast AI", badge: "Google AI • 0.25°", isAI: true },
  { id: "ecmwf_aifs025", label: "ECMWF AIFS (AI NWP)", badge: "ECMWF AI • Global", isAI: true },
];

const fetcher = (url: string) => fetch(url).then((res) => res.json());

export const EnsembleAgrometSection: React.FC<EnsembleAgrometSectionProps> = ({
  lat,
  lon,
  isDarkMode = false,
}) => {
  const [model, setModel] = useState<string>("ecmwf_ifs025");
  const [activeTab, setActiveTab] = useState<string>("temperature");
  const [showSpaghetti, setShowSpaghetti] = useState<boolean>(true);

  const apiUrl = `/api/weather/ensemble?lat=${lat}&lon=${lon}&model=${model}`;
  const { data, error, isLoading, mutate } = useSWR(apiUrl, fetcher, {
    revalidateOnFocus: false,
    dedupingInterval: 60000,
  });

  const times: string[] = data?.times || [];
  const memberCount: number = data?.memberCount || 50;
  const isAIModel: boolean = data?.isAI || false;

  const currentModelMeta = GLOBAL_MODELS.find((m) => m.id === model) || GLOBAL_MODELS[0];

  // Chart Theme Colors
  const textColor = isDarkMode ? "#cbd5e1" : "#475569";
  const gridColor = isDarkMode ? "rgba(71, 85, 105, 0.25)" : "rgba(203, 213, 225, 0.35)";

  // Reusable Chart Generator
  const createEnsembleOption = (
    varData: any,
    varName: string,
    unit: string,
    lineColor: string,
    areaColorLight: string,
    areaColorDark: string,
    isBar: boolean = false
  ) => {
    if (!varData) return {};

    const seriesList: any[] = [];

    if (!isAIModel && varData.members?.length > 1) {
      // Fan Chart / P10-P90 Uncertainty Envelope
      seriesList.push({
        name: "P10 (Batas Bawah 80%)",
        type: "line",
        data: varData.p10,
        lineStyle: { opacity: 0 },
        stack: `confidence-band-${varName}`,
        symbol: "none",
      });

      seriesList.push({
        name: "Rentang Ketidakpastian 80% (P10–P90)",
        type: "line",
        data: varData.p90?.map((v: number, i: number) => Number((v - (varData.p10?.[i] ?? 0)).toFixed(2))),
        lineStyle: { opacity: 0 },
        areaStyle: {
          color: isDarkMode ? areaColorDark : areaColorLight,
        },
        stack: `confidence-band-${varName}`,
        symbol: "none",
      });

      // 50 Spaghetti Member Lines
      if (showSpaghetti && varData.members) {
        varData.members.forEach((mArr: number[], idx: number) => {
          seriesList.push({
            name: `Member ${idx + 1}`,
            type: "line",
            data: mArr,
            smooth: true,
            showSymbol: false,
            lineStyle: {
              color: isDarkMode ? areaColorDark : areaColorLight,
              width: 1,
            },
            silent: true,
          });
        });
      }
    }

    // Deterministic Control Model
    if (varData.control?.length > 0 && !isAIModel) {
      seriesList.push({
        name: "Model Kontrol Deterministik",
        type: "line",
        data: varData.control,
        smooth: true,
        showSymbol: false,
        lineStyle: { color: "#3b82f6", width: 2, type: "dashed" },
        itemStyle: { color: "#3b82f6" },
      });
    }

    // Ensemble Mean / AI Forecast Line
    seriesList.push({
      name: isAIModel ? `Prakiraan ${currentModelMeta.label}` : `Rata-rata Ensemble Mean (${memberCount} Member)`,
      type: isBar ? "bar" : "line",
      data: varData.mean || varData.control,
      smooth: true,
      showSymbol: false,
      lineStyle: { color: lineColor, width: 3 },
      itemStyle: { color: lineColor },
    });

    return {
      backgroundColor: "transparent",
      tooltip: {
        trigger: "axis",
        backgroundColor: isDarkMode ? "#0f172a" : "#ffffff",
        borderColor: isDarkMode ? "#334155" : "#e2e8f0",
        textStyle: { color: isDarkMode ? "#f8fafc" : "#0f172a", fontSize: 12 },
        formatter: (params: any[]) => {
          if (!params || params.length === 0) return "";
          const dateStr = params[0].axisValue;
          const meanItem = params.find((p) => p.seriesName?.includes("Mean") || p.seriesName?.includes("Prakiraan"));
          const ctrlItem = params.find((p) => p.seriesName?.includes("Kontrol"));
          const idx = params[0].dataIndex;

          const p10Val = varData.p10?.[idx];
          const p90Val = varData.p90?.[idx];
          const minVal = varData.min?.[idx];
          const maxVal = varData.max?.[idx];

          return `
            <div class="font-bold text-xs pb-1 border-b mb-1">${dateStr}</div>
            <div class="text-xs space-y-1">
              <div class="flex justify-between gap-4">
                <span class="font-bold" style="color: ${lineColor}">${varName}:</span>
                <span class="font-bold">${meanItem?.value ?? "-"} ${unit}</span>
              </div>
              ${
                ctrlItem
                  ? `<div class="flex justify-between gap-4 text-blue-500">
                      <span>Model Kontrol:</span>
                      <span>${ctrlItem?.value ?? "-"} ${unit}</span>
                    </div>`
                  : ""
              }
              ${
                p10Val !== undefined && p90Val !== undefined
                  ? `<div class="flex justify-between gap-4 text-slate-500">
                      <span>Rentang 80% (P10–P90):</span>
                      <span>${p10Val} – ${p90Val} ${unit}</span>
                    </div>`
                  : ""
              }
              ${
                minVal !== undefined && maxVal !== undefined
                  ? `<div class="flex justify-between gap-4 text-slate-400 text-[11px]">
                      <span>Rentang Ekstrem:</span>
                      <span>${minVal} – ${maxVal} ${unit}</span>
                    </div>`
                  : ""
              }
            </div>
          `;
        },
      },
      legend: {
        top: 0,
        textStyle: { color: textColor, fontSize: 11 },
        data: isAIModel
          ? [`Prakiraan ${currentModelMeta.label}`]
          : [
              `Rata-rata Ensemble Mean (${memberCount} Member)`,
              "Model Kontrol Deterministik",
              "Rentang Ketidakpastian 80% (P10–P90)",
            ],
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
        data: times,
        axisLine: { lineStyle: { color: isDarkMode ? "#334155" : "#cbd5e1" } },
        axisLabel: {
          color: textColor,
          fontSize: 10,
          formatter: (val: string) => {
            const d = new Date(val);
            return `${d.getDate()}/${d.getMonth() + 1} ${String(d.getHours()).padStart(2, "0")}:00`;
          },
        },
      },
      yAxis: {
        type: "value",
        name: `${varName} (${unit})`,
        scale: true, // Dynamic minimum from data
        nameTextStyle: { color: textColor, fontSize: 11 },
        splitLine: { lineStyle: { color: gridColor } },
        axisLabel: {
          color: textColor,
          fontSize: 10,
          formatter: (v: number) => `${v}`,
        },
      },
      series: seriesList,
    };
  };

  // 1. Suhu
  const tempOption = useMemo(
    () => createEnsembleOption(data?.temperature, "Suhu", "°C", "#ef4444", "rgba(239, 68, 68, 0.15)", "rgba(239, 68, 68, 0.22)"),
    [data, showSpaghetti, times, isDarkMode, textColor, gridColor, isAIModel]
  );

  // 2. Titik Embun
  const dewOption = useMemo(
    () => createEnsembleOption(data?.dewPoint, "Titik Embun", "°C", "#0d9488", "rgba(20, 184, 166, 0.15)", "rgba(45, 212, 191, 0.22)"),
    [data, showSpaghetti, times, isDarkMode, textColor, gridColor, isAIModel]
  );

  // 3. Tekanan
  const pressureOption = useMemo(
    () => createEnsembleOption(data?.surfacePressure, "Tekanan", "hPa", "#6366f1", "rgba(99, 102, 241, 0.15)", "rgba(129, 140, 248, 0.22)"),
    [data, showSpaghetti, times, isDarkMode, textColor, gridColor, isAIModel]
  );

  // 4. Hujan / Presipitasi
  const precipOption = useMemo(
    () => createEnsembleOption(data?.precipitation, "Presipitasi", "mm", "#0284c7", "rgba(2, 132, 199, 0.15)", "rgba(56, 189, 248, 0.22)", false),
    [data, showSpaghetti, times, isDarkMode, textColor, gridColor, isAIModel]
  );

  // 5. Kelembapan Relatif (RH)
  const rhOption = useMemo(
    () => createEnsembleOption(data?.relativeHumidity, "Kelembapan", "%", "#3b82f6", "rgba(59, 130, 246, 0.15)", "rgba(96, 165, 250, 0.22)"),
    [data, showSpaghetti, times, isDarkMode, textColor, gridColor, isAIModel]
  );

  // 6. Angin 10m
  const windOption = useMemo(
    () => createEnsembleOption(data?.windSpeed, "Angin 10m", "m/s", "#8b5cf6", "rgba(139, 92, 246, 0.15)", "rgba(167, 139, 250, 0.22)"),
    [data, showSpaghetti, times, isDarkMode, textColor, gridColor, isAIModel]
  );

  // 7. Radiasi Surya
  const solarOption = useMemo(
    () => createEnsembleOption(data?.solarRadiation, "Radiasi Surya", "W/m²", "#f59e0b", "rgba(245, 158, 11, 0.15)", "rgba(251, 191, 36, 0.22)"),
    [data, showSpaghetti, times, isDarkMode, textColor, gridColor, isAIModel]
  );

  // 8. Evapotranspirasi ET0
  const et0Option = useMemo(
    () => createEnsembleOption(data?.et0, "Evapotranspirasi ET0", "mm", "#10b981", "rgba(16, 185, 129, 0.15)", "rgba(52, 211, 153, 0.22)"),
    [data, showSpaghetti, times, isDarkMode, textColor, gridColor, isAIModel]
  );

  // Current Summary Metrics
  const currentTemp = data?.temperature?.mean?.[0] ?? "-";
  const currentDew = data?.dewPoint?.mean?.[0] ?? "-";
  const currentPress = data?.surfacePressure?.mean?.[0] ?? "-";
  const currentPrecip7d = data?.precipitation?.mean ? data.precipitation.mean.reduce((a: number, b: number) => a + b, 0).toFixed(1) : "-";
  const currentRh = data?.relativeHumidity?.mean?.[0] ?? "-";
  const currentWind = data?.windSpeed?.mean?.[0] ?? "-";
  const currentEt07d = data?.et0?.mean ? data.et0.mean.reduce((a: number, b: number) => a + b, 0).toFixed(1) : "-";

  return (
    <Card className="border-none shadow-sm dark:bg-slate-900 bg-white overflow-hidden">
      <CardHeader className="pb-3 border-b dark:border-slate-800">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="p-1.5 rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
                {isAIModel ? <Cpu className="h-5 w-5" /> : <Sparkles className="h-5 w-5" />}
              </span>
              <CardTitle className="text-lg font-bold text-slate-900 dark:text-slate-100">
                Prediksi Ensemble Multi-Model Agrometeorologi (7 Hari)
              </CardTitle>
            </div>
            <CardDescription className="text-xs text-slate-500 mt-1">
              {isAIModel
                ? `Simulasi prakiraan cuaca beresolusi tinggi menggunakan model AI Deep Learning ${currentModelMeta.label}`
                : `Analisis probabilistik ${memberCount} skenario model ensemble ${currentModelMeta.label} untuk mengukur risiko iklim mikro`}
            </CardDescription>
          </div>

          <div className="flex flex-wrap items-center gap-2 self-start md:self-auto">
            {/* Model Selector Dropdown */}
            <Select value={model} onValueChange={setModel}>
              <SelectTrigger className="w-[230px] h-8 text-xs bg-slate-50 dark:bg-slate-800 font-semibold">
                <SelectValue placeholder="Pilih Model Global" />
              </SelectTrigger>
              <SelectContent>
                {GLOBAL_MODELS.map((m) => (
                  <SelectItem key={m.id} value={m.id} className="text-xs">
                    <div className="flex items-center justify-between gap-2">
                      <span>{m.label}</span>
                      <span className="text-[10px] text-slate-400 font-mono">({m.badge})</span>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            {/* Toggle Spaghetti Button (Only for multi-member models) */}
            {!isAIModel && (
              <Button
                variant={showSpaghetti ? "default" : "outline"}
                size="sm"
                className="h-8 text-xs"
                onClick={() => setShowSpaghetti(!showSpaghetti)}
              >
                <Layers className="h-3.5 w-3.5 mr-1" />
                {showSpaghetti ? `${memberCount} Garis (Aktif)` : "Sembunyikan Garis"}
              </Button>
            )}

            <Button
              variant="outline"
              size="sm"
              className="h-8 px-2"
              onClick={() => mutate()}
              disabled={isLoading}
            >
              <RefreshCw className={`h-3.5 w-3.5 ${isLoading ? "animate-spin" : ""}`} />
            </Button>
          </div>
        </div>
      </CardHeader>

      <CardContent className="pt-4 space-y-6">
        {/* Top Mini Summary Metric Chips */}
        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-2.5">
          {/* Suhu */}
          <div className="p-2.5 rounded-xl bg-red-50/60 dark:bg-red-950/20 border border-red-100 dark:border-red-900/40">
            <div className="flex items-center justify-between text-[11px] text-slate-500 font-medium">
              <span>Suhu Udara</span>
              <Thermometer className="h-3.5 w-3.5 text-red-500" />
            </div>
            <div className="text-base font-black text-red-600 dark:text-red-400 font-mono mt-1">{currentTemp}°C</div>
          </div>

          {/* Titik Embun */}
          <div className="p-2.5 rounded-xl bg-teal-50/60 dark:bg-teal-950/20 border border-teal-100 dark:border-teal-900/40">
            <div className="flex items-center justify-between text-[11px] text-slate-500 font-medium">
              <span>Titik Embun</span>
              <Droplets className="h-3.5 w-3.5 text-teal-500" />
            </div>
            <div className="text-base font-black text-teal-600 dark:text-teal-400 font-mono mt-1">{currentDew}°C</div>
          </div>

          {/* Tekanan */}
          <div className="p-2.5 rounded-xl bg-indigo-50/60 dark:bg-indigo-950/20 border border-indigo-100 dark:border-indigo-900/40">
            <div className="flex items-center justify-between text-[11px] text-slate-500 font-medium">
              <span>Tekanan</span>
              <Gauge className="h-3.5 w-3.5 text-indigo-500" />
            </div>
            <div className="text-base font-black text-indigo-600 dark:text-indigo-400 font-mono mt-1">{currentPress} hPa</div>
          </div>

          {/* Hujan 7 Hari */}
          <div className="p-2.5 rounded-xl bg-cyan-50/60 dark:bg-cyan-950/20 border border-cyan-100 dark:border-cyan-900/40">
            <div className="flex items-center justify-between text-[11px] text-slate-500 font-medium">
              <span>Total Hujan 7h</span>
              <CloudRain className="h-3.5 w-3.5 text-cyan-500" />
            </div>
            <div className="text-base font-black text-cyan-600 dark:text-cyan-400 font-mono mt-1">{currentPrecip7d} mm</div>
          </div>

          {/* Kelembapan */}
          <div className="p-2.5 rounded-xl bg-blue-50/60 dark:bg-blue-950/20 border border-blue-100 dark:border-blue-900/40">
            <div className="flex items-center justify-between text-[11px] text-slate-500 font-medium">
              <span>Kelembapan</span>
              <Waves className="h-3.5 w-3.5 text-blue-500" />
            </div>
            <div className="text-base font-black text-blue-600 dark:text-blue-400 font-mono mt-1">{currentRh}%</div>
          </div>

          {/* Angin */}
          <div className="p-2.5 rounded-xl bg-purple-50/60 dark:bg-purple-950/20 border border-purple-100 dark:border-purple-900/40">
            <div className="flex items-center justify-between text-[11px] text-slate-500 font-medium">
              <span>Kecepatan Angin</span>
              <Wind className="h-3.5 w-3.5 text-purple-500" />
            </div>
            <div className="text-base font-black text-purple-600 dark:text-purple-400 font-mono mt-1">{currentWind} m/s</div>
          </div>

          {/* ET0 */}
          <div className="p-2.5 rounded-xl bg-emerald-50/60 dark:bg-emerald-950/20 border border-emerald-100 dark:border-emerald-900/40">
            <div className="flex items-center justify-between text-[11px] text-slate-500 font-medium">
              <span>Total ET0 7h</span>
              <Sprout className="h-3.5 w-3.5 text-emerald-500" />
            </div>
            <div className="text-base font-black text-emerald-600 dark:text-emerald-400 font-mono mt-1">{currentEt07d} mm</div>
          </div>
        </div>

        {/* 8-Variable Unified Responsive Tab Bar */}
        <Tabs defaultValue="temperature" value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 h-auto p-1 bg-slate-100 dark:bg-slate-800 rounded-xl mb-4 gap-1">
            <TabsTrigger value="temperature" className="py-2 text-xs font-bold flex items-center gap-1">
              <Thermometer className="h-3.5 w-3.5 text-red-500" /> Suhu
            </TabsTrigger>
            <TabsTrigger value="dewpoint" className="py-2 text-xs font-bold flex items-center gap-1">
              <Droplets className="h-3.5 w-3.5 text-teal-500" /> T. Embun
            </TabsTrigger>
            <TabsTrigger value="pressure" className="py-2 text-xs font-bold flex items-center gap-1">
              <Gauge className="h-3.5 w-3.5 text-indigo-500" /> Tekanan
            </TabsTrigger>
            <TabsTrigger value="precipitation" className="py-2 text-xs font-bold flex items-center gap-1">
              <CloudRain className="h-3.5 w-3.5 text-sky-500" /> Hujan
            </TabsTrigger>
            <TabsTrigger value="humidity" className="py-2 text-xs font-bold flex items-center gap-1">
              <Waves className="h-3.5 w-3.5 text-blue-500" /> Kel. (RH)
            </TabsTrigger>
            <TabsTrigger value="wind" className="py-2 text-xs font-bold flex items-center gap-1">
              <Wind className="h-3.5 w-3.5 text-purple-500" /> Angin
            </TabsTrigger>
            <TabsTrigger value="solar" className="py-2 text-xs font-bold flex items-center gap-1">
              <Sun className="h-3.5 w-3.5 text-amber-500" /> Radiasi
            </TabsTrigger>
            <TabsTrigger value="et0" className="py-2 text-xs font-bold flex items-center gap-1">
              <Sprout className="h-3.5 w-3.5 text-emerald-500" /> ET0
            </TabsTrigger>
          </TabsList>

          {isLoading ? (
            <div className="h-[360px] flex flex-col items-center justify-center space-y-2">
              <RefreshCw className="h-8 w-8 animate-spin text-emerald-500" />
              <p className="text-xs text-slate-500">Memuat simulasi ensemble model {currentModelMeta.label}...</p>
            </div>
          ) : error ? (
            <div className="h-[360px] flex items-center justify-center text-red-600 text-sm">
              Gagal memuat data ensemble. Silakan periksa koneksi atau klik segarkan.
            </div>
          ) : (
            <>
              {/* 1. Suhu Udara */}
              <TabsContent value="temperature" className="mt-0 space-y-3">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 text-xs">
                  <span className="font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-1">
                    <TrendingUp className="h-3.5 w-3.5 text-red-500" />
                    Pita Probabilitas Suhu Udara 7 Hari ({currentModelMeta.label}):
                  </span>
                  <span className="text-[11px] text-slate-400">
                    Garis Merah: Mean | Bayangan: Rentang 80% (P10–P90)
                  </span>
                </div>
                <div className="h-[360px] w-full">
                  <ReactECharts option={tempOption} notMerge={true} lazyUpdate={true} style={{ height: "100%", width: "100%" }} />
                </div>
                <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border dark:border-slate-800 text-xs text-slate-600 dark:text-slate-300 leading-relaxed flex items-center gap-2">
                  <Info className="h-4 w-4 text-red-500 shrink-0" />
                  <span>
                    <strong>Catatan:</strong> Lebar pita P10–P90 menunjukkan ketidakpastian model. Semakin sempit pita, semakin tinggi kepastian prakiraan suhu.
                  </span>
                </div>
              </TabsContent>

              {/* 2. Titik Embun */}
              <TabsContent value="dewpoint" className="mt-0 space-y-3">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 text-xs">
                  <span className="font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-1">
                    <Droplets className="h-3.5 w-3.5 text-teal-500" />
                    Pita Probabilitas Titik Embun ({currentModelMeta.label}):
                  </span>
                  <span className="text-[11px] text-slate-400">
                    Garis Hijau Kebiruan: Mean | Bayangan: Rentang 80% (P10–P90)
                  </span>
                </div>
                <div className="h-[360px] w-full">
                  <ReactECharts option={dewOption} notMerge={true} lazyUpdate={true} style={{ height: "100%", width: "100%" }} />
                </div>
                <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border dark:border-slate-800 text-xs text-slate-600 dark:text-slate-300 leading-relaxed flex items-center gap-2">
                  <Info className="h-4 w-4 text-teal-500 shrink-0" />
                  <span>
                    <strong>Catatan:</strong> Titik embun mendekati suhu udara malam (selisih &le; 1.5°C) memicu pembentukan embun pekat yang meningkatkan risiko spora jamur daun.
                  </span>
                </div>
              </TabsContent>

              {/* 3. Tekanan Permukaan */}
              <TabsContent value="pressure" className="mt-0 space-y-3">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 text-xs">
                  <span className="font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-1">
                    <Gauge className="h-3.5 w-3.5 text-indigo-500" />
                    Pita Probabilitas Tekanan Udara Permukaan ({currentModelMeta.label}):
                  </span>
                  <span className="text-[11px] text-slate-400">
                    Garis Indigo: Mean | Bayangan: Rentang 80% (P10–P90)
                  </span>
                </div>
                <div className="h-[360px] w-full">
                  <ReactECharts option={pressureOption} notMerge={true} lazyUpdate={true} style={{ height: "100%", width: "100%" }} />
                </div>
                <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border dark:border-slate-800 text-xs text-slate-600 dark:text-slate-300 leading-relaxed flex items-center gap-2">
                  <Info className="h-4 w-4 text-indigo-500 shrink-0" />
                  <span>
                    <strong>Catatan:</strong> Penurunan tekanan tajam (&lt; 1008 hPa) menandakan potensi pertumbuhan sistem awan konvektif dan cuaca basah.
                  </span>
                </div>
              </TabsContent>

              {/* 4. Curah Hujan */}
              <TabsContent value="precipitation" className="mt-0 space-y-3">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 text-xs">
                  <span className="font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-1">
                    <CloudRain className="h-3.5 w-3.5 text-sky-500" />
                    Pita Probabilitas Curah Hujan Per Jam ({currentModelMeta.label}):
                  </span>
                  <span className="text-[11px] text-slate-400">
                    Garis Biru Langit: Mean | Bayangan: Rentang 80% (P10–P90)
                  </span>
                </div>
                <div className="h-[360px] w-full">
                  <ReactECharts option={precipOption} notMerge={true} lazyUpdate={true} style={{ height: "100%", width: "100%" }} />
                </div>
                <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border dark:border-slate-800 text-xs text-slate-600 dark:text-slate-300 leading-relaxed flex items-center gap-2">
                  <Info className="h-4 w-4 text-sky-500 shrink-0" />
                  <span>
                    <strong>Catatan:</strong> Variasi anggota ensemble pada presipitasi mengidentifikasi ketidakpastian onset dan intensitas hujan konvektif lokal.
                  </span>
                </div>
              </TabsContent>

              {/* 5. Kelembapan Relatif */}
              <TabsContent value="humidity" className="mt-0 space-y-3">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 text-xs">
                  <span className="font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-1">
                    <Waves className="h-3.5 w-3.5 text-blue-500" />
                    Pita Probabilitas Kelembapan Udara RH ({currentModelMeta.label}):
                  </span>
                  <span className="text-[11px] text-slate-400">
                    Garis Biru: Mean | Bayangan: Rentang 80% (P10–P90)
                  </span>
                </div>
                <div className="h-[360px] w-full">
                  <ReactECharts option={rhOption} notMerge={true} lazyUpdate={true} style={{ height: "100%", width: "100%" }} />
                </div>
                <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border dark:border-slate-800 text-xs text-slate-600 dark:text-slate-300 leading-relaxed flex items-center gap-2">
                  <Info className="h-4 w-4 text-blue-500 shrink-0" />
                  <span>
                    <strong>Catatan:</strong> Kelembapan relatif &gt; 85% berkepanjangan meningkatkan kelembapan kanopi tanaman dan risiko penyakit bercak daun.
                  </span>
                </div>
              </TabsContent>

              {/* 6. Kecepatan Angin */}
              <TabsContent value="wind" className="mt-0 space-y-3">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 text-xs">
                  <span className="font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-1">
                    <Wind className="h-3.5 w-3.5 text-purple-500" />
                    Pita Probabilitas Kecepatan Angin 10m ({currentModelMeta.label}):
                  </span>
                  <span className="text-[11px] text-slate-400">
                    Garis Ungu: Mean | Bayangan: Rentang 80% (P10–P90)
                  </span>
                </div>
                <div className="h-[360px] w-full">
                  <ReactECharts option={windOption} notMerge={true} lazyUpdate={true} style={{ height: "100%", width: "100%" }} />
                </div>
                <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border dark:border-slate-800 text-xs text-slate-600 dark:text-slate-300 leading-relaxed flex items-center gap-2">
                  <Info className="h-4 w-4 text-purple-500 shrink-0" />
                  <span>
                    <strong>Catatan:</strong> Kecepatan angin &gt; 5 m/s memicu evaporasi cepat dan risiko rebah batang pada tanaman serealia/jagung.
                  </span>
                </div>
              </TabsContent>

              {/* 7. Radiasi Surya */}
              <TabsContent value="solar" className="mt-0 space-y-3">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 text-xs">
                  <span className="font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-1">
                    <Sun className="h-3.5 w-3.5 text-amber-500" />
                    Pita Probabilitas Fluks Radiasi Surya ({currentModelMeta.label}):
                  </span>
                  <span className="text-[11px] text-slate-400">
                    Garis Kuning Amber: Mean | Bayangan: Rentang 80% (P10–P90)
                  </span>
                </div>
                <div className="h-[360px] w-full">
                  <ReactECharts option={solarOption} notMerge={true} lazyUpdate={true} style={{ height: "100%", width: "100%" }} />
                </div>
                <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border dark:border-slate-800 text-xs text-slate-600 dark:text-slate-300 leading-relaxed flex items-center gap-2">
                  <Info className="h-4 w-4 text-amber-500 shrink-0" />
                  <span>
                    <strong>Catatan:</strong> Fluks radiasi gelombang pendek menentukan laju fotosintesis netto dan akumulasi biomassa harian tanaman.
                  </span>
                </div>
              </TabsContent>

              {/* 8. Evapotranspirasi ET0 */}
              <TabsContent value="et0" className="mt-0 space-y-3">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 text-xs">
                  <span className="font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-1">
                    <Sprout className="h-3.5 w-3.5 text-emerald-500" />
                    Pita Probabilitas Evapotranspirasi Potensial FAO Penman-Monteith ({currentModelMeta.label}):
                  </span>
                  <span className="text-[11px] text-slate-400">
                    Garis Hijau Emerald: Mean | Bayangan: Rentang 80% (P10–P90)
                  </span>
                </div>
                <div className="h-[360px] w-full">
                  <ReactECharts option={et0Option} notMerge={true} lazyUpdate={true} style={{ height: "100%", width: "100%" }} />
                </div>
                <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border dark:border-slate-800 text-xs text-slate-600 dark:text-slate-300 leading-relaxed flex items-center gap-2">
                  <Info className="h-4 w-4 text-emerald-500 shrink-0" />
                  <span>
                    <strong>Catatan:</strong> Nilai ET0 menjadi acuan utama estimasi kebutuhan air irigasi harian tanaman untuk mencegah kekeringan zona akar.
                  </span>
                </div>
              </TabsContent>
            </>
          )}
        </Tabs>
      </CardContent>
    </Card>
  );
};
