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
  Activity,
  Calendar,
} from "lucide-react";

interface EnsembleAgrometSectionProps {
  lat: number;
  lon: number;
  isDarkMode?: boolean;
}

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

  // Chart Theme Colors
  const textColor = isDarkMode ? "#cbd5e1" : "#475569";
  const gridColor = isDarkMode ? "rgba(71, 85, 105, 0.25)" : "rgba(203, 213, 225, 0.35)";

  // 1. Temperature Ensemble Chart Option
  const temperatureChartOption = useMemo(() => {
    if (!data?.temperature) return {};

    const temp = data.temperature;
    const seriesList: any[] = [];

    // Fan Chart / P10-P90 Uncertainty Envelope
    seriesList.push({
      name: "P10 (Batas Bawah 80%)",
      type: "line",
      data: temp.p10,
      lineStyle: { opacity: 0 },
      stack: "confidence-band",
      symbol: "none",
    });

    seriesList.push({
      name: "Rentang Ketidakpastian 80% (P10–P90)",
      type: "line",
      data: temp.p90.map((v: number, i: number) => Number((v - temp.p10[i]).toFixed(2))),
      lineStyle: { opacity: 0 },
      areaStyle: {
        color: isDarkMode ? "rgba(239, 68, 68, 0.18)" : "rgba(239, 68, 68, 0.12)",
      },
      stack: "confidence-band",
      symbol: "none",
    });

    // 50 Spaghetti Member Lines
    if (showSpaghetti && temp.members) {
      temp.members.forEach((mArr: number[], idx: number) => {
        seriesList.push({
          name: `Member ${idx + 1}`,
          type: "line",
          data: mArr,
          smooth: true,
          showSymbol: false,
          lineStyle: {
            color: isDarkMode ? "rgba(248, 113, 113, 0.22)" : "rgba(239, 68, 68, 0.18)",
            width: 1,
          },
          silent: true,
        });
      });
    }

    // Deterministic Control Model
    if (temp.control?.length > 0) {
      seriesList.push({
        name: "Model Kontrol Deterministik",
        type: "line",
        data: temp.control,
        smooth: true,
        showSymbol: false,
        lineStyle: { color: "#3b82f6", width: 2, type: "dashed" },
        itemStyle: { color: "#3b82f6" },
      });
    }

    // Ensemble Mean Line (Thick glowing red)
    seriesList.push({
      name: "Rata-rata Ensemble Mean (50 Member)",
      type: "line",
      data: temp.mean,
      smooth: true,
      showSymbol: false,
      lineStyle: { color: "#ef4444", width: 3 },
      itemStyle: { color: "#ef4444" },
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
          const meanItem = params.find((p) => p.seriesName?.includes("Mean"));
          const ctrlItem = params.find((p) => p.seriesName?.includes("Kontrol"));
          const idx = params[0].dataIndex;

          const p10Val = temp.p10[idx];
          const p90Val = temp.p90[idx];
          const minVal = temp.min[idx];
          const maxVal = temp.max[idx];

          return `
            <div class="font-bold text-xs pb-1 border-b mb-1">${dateStr}</div>
            <div class="text-xs space-y-1">
              <div class="flex justify-between gap-4">
                <span class="text-red-500 font-bold">Ensemble Mean:</span>
                <span class="font-bold">${meanItem?.value ?? "-"}°C</span>
              </div>
              <div class="flex justify-between gap-4">
                <span class="text-blue-500">Model Kontrol:</span>
                <span>${ctrlItem?.value ?? "-"}°C</span>
              </div>
              <div class="flex justify-between gap-4 text-slate-500">
                <span>Rentang 80% (P10–P90):</span>
                <span>${p10Val}°C – ${p90Val}°C</span>
              </div>
              <div class="flex justify-between gap-4 text-slate-400 text-[11px]">
                <span>Rentang Ekstrem (Min–Max):</span>
                <span>${minVal}°C – ${maxVal}°C</span>
              </div>
            </div>
          `;
        },
      },
      legend: {
        top: 0,
        textStyle: { color: textColor, fontSize: 11 },
        data: [
          "Rata-rata Ensemble Mean (50 Member)",
          "Model Kontrol Deterministik",
          "Rentang Ketidakpastian 80% (P10–P90)",
        ],
      },
      grid: {
        top: 40,
        left: 45,
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
        name: "Suhu (°C)",
        nameTextStyle: { color: textColor, fontSize: 11 },
        splitLine: { lineStyle: { color: gridColor } },
        axisLabel: {
          color: textColor,
          fontSize: 10,
          formatter: (v: number) => `${v}°`,
        },
      },
      series: seriesList,
    };
  }, [data, showSpaghetti, times, isDarkMode, textColor, gridColor]);

  // 2. Dew Point Ensemble Chart Option
  const dewPointChartOption = useMemo(() => {
    if (!data?.dewPoint) return {};

    const dp = data.dewPoint;
    const seriesList: any[] = [];

    // Fan Chart / P10-P90 Uncertainty Envelope
    seriesList.push({
      name: "P10 (Batas Bawah 80%)",
      type: "line",
      data: dp.p10,
      lineStyle: { opacity: 0 },
      stack: "confidence-band-dp",
      symbol: "none",
    });

    seriesList.push({
      name: "Rentang Ketidakpastian 80% (P10–P90)",
      type: "line",
      data: dp.p90.map((v: number, i: number) => Number((v - dp.p10[i]).toFixed(2))),
      lineStyle: { opacity: 0 },
      areaStyle: {
        color: isDarkMode ? "rgba(20, 184, 166, 0.18)" : "rgba(20, 184, 166, 0.12)",
      },
      stack: "confidence-band-dp",
      symbol: "none",
    });

    // 50 Spaghetti Member Lines
    if (showSpaghetti && dp.members) {
      dp.members.forEach((mArr: number[], idx: number) => {
        seriesList.push({
          name: `Member ${idx + 1}`,
          type: "line",
          data: mArr,
          smooth: true,
          showSymbol: false,
          lineStyle: {
            color: isDarkMode ? "rgba(45, 212, 191, 0.22)" : "rgba(20, 184, 166, 0.18)",
            width: 1,
          },
          silent: true,
        });
      });
    }

    // Deterministic Control Model
    if (dp.control?.length > 0) {
      seriesList.push({
        name: "Model Kontrol Deterministik",
        type: "line",
        data: dp.control,
        smooth: true,
        showSymbol: false,
        lineStyle: { color: "#0284c7", width: 2, type: "dashed" },
        itemStyle: { color: "#0284c7" },
      });
    }

    // Ensemble Mean Line (Thick glowing teal)
    seriesList.push({
      name: "Rata-rata Ensemble Mean (50 Member)",
      type: "line",
      data: dp.mean,
      smooth: true,
      showSymbol: false,
      lineStyle: { color: "#0d9488", width: 3 },
      itemStyle: { color: "#0d9488" },
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
          const meanItem = params.find((p) => p.seriesName?.includes("Mean"));
          const ctrlItem = params.find((p) => p.seriesName?.includes("Kontrol"));
          const idx = params[0].dataIndex;

          const p10Val = dp.p10[idx];
          const p90Val = dp.p90[idx];
          const minVal = dp.min[idx];
          const maxVal = dp.max[idx];

          return `
            <div class="font-bold text-xs pb-1 border-b mb-1">${dateStr}</div>
            <div class="text-xs space-y-1">
              <div class="flex justify-between gap-4">
                <span class="text-teal-600 font-bold">Titik Embun (Mean):</span>
                <span class="font-bold">${meanItem?.value ?? "-"}°C</span>
              </div>
              <div class="flex justify-between gap-4">
                <span class="text-sky-600">Model Kontrol:</span>
                <span>${ctrlItem?.value ?? "-"}°C</span>
              </div>
              <div class="flex justify-between gap-4 text-slate-500">
                <span>Rentang 80% (P10–P90):</span>
                <span>${p10Val}°C – ${p90Val}°C</span>
              </div>
              <div class="flex justify-between gap-4 text-slate-400 text-[11px]">
                <span>Rentang Ekstrem (Min–Max):</span>
                <span>${minVal}°C – ${maxVal}°C</span>
              </div>
            </div>
          `;
        },
      },
      legend: {
        top: 0,
        textStyle: { color: textColor, fontSize: 11 },
        data: [
          "Rata-rata Ensemble Mean (50 Member)",
          "Model Kontrol Deterministik",
          "Rentang Ketidakpastian 80% (P10–P90)",
        ],
      },
      grid: {
        top: 40,
        left: 45,
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
        name: "Titik Embun (°C)",
        nameTextStyle: { color: textColor, fontSize: 11 },
        splitLine: { lineStyle: { color: gridColor } },
        axisLabel: {
          color: textColor,
          fontSize: 10,
          formatter: (v: number) => `${v}°`,
        },
      },
      series: seriesList,
    };
  }, [data, showSpaghetti, times, isDarkMode, textColor, gridColor]);

  // 3. Surface Pressure Ensemble Chart Option
  const pressureChartOption = useMemo(() => {
    if (!data?.surfacePressure) return {};

    const press = data.surfacePressure;
    const seriesList: any[] = [];

    // Fan Chart / P10-P90 Uncertainty Envelope
    seriesList.push({
      name: "P10 (Batas Bawah 80%)",
      type: "line",
      data: press.p10,
      lineStyle: { opacity: 0 },
      stack: "confidence-band-p",
      symbol: "none",
    });

    seriesList.push({
      name: "Rentang Ketidakpastian 80% (P10–P90)",
      type: "line",
      data: press.p90.map((v: number, i: number) => Number((v - press.p10[i]).toFixed(2))),
      lineStyle: { opacity: 0 },
      areaStyle: {
        color: isDarkMode ? "rgba(99, 102, 241, 0.18)" : "rgba(99, 102, 241, 0.12)",
      },
      stack: "confidence-band-p",
      symbol: "none",
    });

    // 50 Spaghetti Member Lines
    if (showSpaghetti && press.members) {
      press.members.forEach((mArr: number[], idx: number) => {
        seriesList.push({
          name: `Member ${idx + 1}`,
          type: "line",
          data: mArr,
          smooth: true,
          showSymbol: false,
          lineStyle: {
            color: isDarkMode ? "rgba(129, 140, 248, 0.22)" : "rgba(99, 102, 241, 0.18)",
            width: 1,
          },
          silent: true,
        });
      });
    }

    // Deterministic Control Model
    if (press.control?.length > 0) {
      seriesList.push({
        name: "Model Kontrol Deterministik",
        type: "line",
        data: press.control,
        smooth: true,
        showSymbol: false,
        lineStyle: { color: "#8b5cf6", width: 2, type: "dashed" },
        itemStyle: { color: "#8b5cf6" },
      });
    }

    // Ensemble Mean Line (Thick glowing indigo)
    seriesList.push({
      name: "Rata-rata Ensemble Mean (50 Member)",
      type: "line",
      data: press.mean,
      smooth: true,
      showSymbol: false,
      lineStyle: { color: "#6366f1", width: 3 },
      itemStyle: { color: "#6366f1" },
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
          const meanItem = params.find((p) => p.seriesName?.includes("Mean"));
          const ctrlItem = params.find((p) => p.seriesName?.includes("Kontrol"));
          const idx = params[0].dataIndex;

          const p10Val = press.p10[idx];
          const p90Val = press.p90[idx];
          const minVal = press.min[idx];
          const maxVal = press.max[idx];

          return `
            <div class="font-bold text-xs pb-1 border-b mb-1">${dateStr}</div>
            <div class="text-xs space-y-1">
              <div class="flex justify-between gap-4">
                <span class="text-indigo-600 font-bold">Tekanan Udara (Mean):</span>
                <span class="font-bold">${meanItem?.value ?? "-"} hPa</span>
              </div>
              <div class="flex justify-between gap-4">
                <span class="text-purple-600">Model Kontrol:</span>
                <span>${ctrlItem?.value ?? "-"} hPa</span>
              </div>
              <div class="flex justify-between gap-4 text-slate-500">
                <span>Rentang 80% (P10–P90):</span>
                <span>${p10Val} – ${p90Val} hPa</span>
              </div>
              <div class="flex justify-between gap-4 text-slate-400 text-[11px]">
                <span>Rentang Ekstrem (Min–Max):</span>
                <span>${minVal} – ${maxVal} hPa</span>
              </div>
            </div>
          `;
        },
      },
      legend: {
        top: 0,
        textStyle: { color: textColor, fontSize: 11 },
        data: [
          "Rata-rata Ensemble Mean (50 Member)",
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
        name: "Tekanan (hPa)",
        nameTextStyle: { color: textColor, fontSize: 11 },
        scale: true,
        splitLine: { lineStyle: { color: gridColor } },
        axisLabel: {
          color: textColor,
          fontSize: 10,
          formatter: (v: number) => `${v}`,
        },
      },
      series: seriesList,
    };
  }, [data, showSpaghetti, times, isDarkMode, textColor, gridColor]);

  // Current Latest Stats
  const currentTempMean = data?.temperature?.mean?.[0] ?? "-";
  const currentDpMean = data?.dewPoint?.mean?.[0] ?? "-";
  const currentPressMean = data?.surfacePressure?.mean?.[0] ?? "-";

  return (
    <Card className="border-none shadow-sm dark:bg-slate-900 bg-white overflow-hidden">
      <CardHeader className="pb-3 border-b dark:border-slate-800">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="p-1.5 rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
                <Sparkles className="h-5 w-5" />
              </span>
              <CardTitle className="text-lg font-bold text-slate-900 dark:text-slate-100">
                Prediksi Probabilistik 50 Anggota Ensemble (7 Hari ke Depan)
              </CardTitle>
            </div>
            <CardDescription className="text-xs text-slate-500 mt-1">
              Visualisasi prediksi 50 skenario model numerik cuaca resolusi tinggi untuk menganalisis rentang ketidakpastian iklim mikro lahan
            </CardDescription>
          </div>

          <div className="flex flex-wrap items-center gap-2 self-start md:self-auto">
            {/* Model Selector */}
            <Select value={model} onValueChange={setModel}>
              <SelectTrigger className="w-[180px] h-8 text-xs bg-slate-50 dark:bg-slate-800">
                <SelectValue placeholder="Pilih Model Ensemble" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ecmwf_ifs025" className="text-xs">
                  ECMWF IFS (50 Member)
                </SelectItem>
                <SelectItem value="gfs025" className="text-xs">
                  GFS Ensemble (30 Member)
                </SelectItem>
                <SelectItem value="icon_seamless" className="text-xs">
                  DWD ICON (40 Member)
                </SelectItem>
              </SelectContent>
            </Select>

            {/* Toggle Spaghetti Button */}
            <Button
              variant={showSpaghetti ? "default" : "outline"}
              size="sm"
              className="h-8 text-xs"
              onClick={() => setShowSpaghetti(!showSpaghetti)}
            >
              <Layers className="h-3.5 w-3.5 mr-1" />
              {showSpaghetti ? "Spaghetti 50 Line (Aktif)" : "Sembunyikan Garis Member"}
            </Button>

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
        {/* Top Mini Summary Chips */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div className="p-3 rounded-xl bg-red-50/50 dark:bg-red-950/20 border border-red-100 dark:border-red-900/40 flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="p-2 rounded-lg bg-red-100 dark:bg-red-900/50 text-red-600 dark:text-red-300">
                <Thermometer className="h-4 w-4" />
              </div>
              <div>
                <span className="text-[10px] text-slate-500 block font-medium">Prediksi Suhu Mean Hari Ini</span>
                <span className="text-base font-black text-red-600 dark:text-red-400">{currentTempMean}°C</span>
              </div>
            </div>
            <Badge variant="outline" className="text-[10px] bg-red-100 text-red-700 border-red-300">
              50 Skenario
            </Badge>
          </div>

          <div className="p-3 rounded-xl bg-teal-50/50 dark:bg-teal-950/20 border border-teal-100 dark:border-teal-900/40 flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="p-2 rounded-lg bg-teal-100 dark:bg-teal-900/50 text-teal-600 dark:text-teal-300">
                <Droplets className="h-4 w-4" />
              </div>
              <div>
                <span className="text-[10px] text-slate-500 block font-medium">Prediksi Titik Embun (Dew Point)</span>
                <span className="text-base font-black text-teal-600 dark:text-teal-400">{currentDpMean}°C</span>
              </div>
            </div>
            <Badge variant="outline" className="text-[10px] bg-teal-100 text-teal-700 border-teal-300">
              Embun Daun
            </Badge>
          </div>

          <div className="p-3 rounded-xl bg-indigo-50/50 dark:bg-indigo-950/20 border border-indigo-100 dark:border-indigo-900/40 flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="p-2 rounded-lg bg-indigo-100 dark:bg-indigo-900/50 text-indigo-600 dark:text-indigo-300">
                <Gauge className="h-4 w-4" />
              </div>
              <div>
                <span className="text-[10px] text-slate-500 block font-medium">Prediksi Tekanan Permukaan</span>
                <span className="text-base font-black text-indigo-600 dark:text-indigo-400">{currentPressMean} hPa</span>
              </div>
            </div>
            <Badge variant="outline" className="text-[10px] bg-indigo-100 text-indigo-700 border-indigo-300">
              Barometrik
            </Badge>
          </div>
        </div>

        {/* Multi-variable Ensemble Tabs */}
        <Tabs defaultValue="temperature" value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-3 h-auto p-1 bg-slate-100 dark:bg-slate-800 rounded-xl mb-4">
            <TabsTrigger value="temperature" className="py-2 font-bold text-xs sm:text-sm flex items-center gap-1.5">
              <Thermometer className="h-4 w-4 text-red-500" /> Suhu Udara (50 Ensemble)
            </TabsTrigger>
            <TabsTrigger value="dewpoint" className="py-2 font-bold text-xs sm:text-sm flex items-center gap-1.5">
              <Droplets className="h-4 w-4 text-teal-500" /> Titik Embun (Dew Point 50)
            </TabsTrigger>
            <TabsTrigger value="pressure" className="py-2 font-bold text-xs sm:text-sm flex items-center gap-1.5">
              <Gauge className="h-4 w-4 text-indigo-500" /> Tekanan Udara (Surface Pressure 50)
            </TabsTrigger>
          </TabsList>

          {isLoading ? (
            <div className="h-[360px] flex flex-col items-center justify-center space-y-2">
              <RefreshCw className="h-8 w-8 animate-spin text-emerald-500" />
              <p className="text-xs text-slate-500">Memuat dan menghitung 50 skenario ensemble model {model}...</p>
            </div>
          ) : error ? (
            <div className="h-[360px] flex items-center justify-center text-red-600 text-sm">
              Gagal memuat data ensemble prediksi cuaca. Silakan klik tombol refresh.
            </div>
          ) : (
            <>
              {/* Tab 1: Temperature Ensemble */}
              <TabsContent value="temperature" className="mt-0 space-y-3">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 text-xs">
                  <span className="font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-1">
                    <TrendingUp className="h-3.5 w-3.5 text-red-500" />
                    Pita Probabilitas Suhu Udara 7 Hari ({memberCount} Anggota Ensemble ECMWF/GFS):
                  </span>
                  <span className="text-[11px] text-slate-400">
                    Garis Merah: Ensemble Mean | Area Bayangan: Rentang 80% (P10–P90)
                  </span>
                </div>
                <div className="h-[360px] w-full">
                  <ReactECharts
                    option={temperatureChartOption}
                    notMerge={true}
                    lazyUpdate={true}
                    style={{ height: "100%", width: "100%" }}
                  />
                </div>
                <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 border dark:border-slate-800 text-xs text-slate-600 dark:text-slate-300 leading-relaxed flex items-start gap-2">
                  <Info className="h-4 w-4 text-red-500 shrink-0 mt-0.5" />
                  <span>
                    <strong>Manfaat Agronomis:</strong> Semakin sempit pita persentil (P10–P90), semakin tinggi kepastian prakiraan cuaca. Garis sebaran yang melebar setelah hari ke-4 menandakan peningkatan dinamika cuaca yang membutuhkan pemantauan berkala untuk mitigasi stres panas tanaman.
                  </span>
                </div>
              </TabsContent>

              {/* Tab 2: Dew Point Ensemble */}
              <TabsContent value="dewpoint" className="mt-0 space-y-3">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 text-xs">
                  <span className="font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-1">
                    <Droplets className="h-3.5 w-3.5 text-teal-500" />
                    Pita Probabilitas Titik Embun ({memberCount} Anggota Ensemble):
                  </span>
                  <span className="text-[11px] text-slate-400">
                    Garis Hijau Kebiruan: Ensemble Mean | Area Bayangan: Rentang 80% (P10–P90)
                  </span>
                </div>
                <div className="h-[360px] w-full">
                  <ReactECharts
                    option={dewPointChartOption}
                    notMerge={true}
                    lazyUpdate={true}
                    style={{ height: "100%", width: "100%" }}
                  />
                </div>
                <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 border dark:border-slate-800 text-xs text-slate-600 dark:text-slate-300 leading-relaxed flex items-start gap-2">
                  <Info className="h-4 w-4 text-teal-500 shrink-0 mt-0.5" />
                  <span>
                    <strong>Manfaat Agronomis:</strong> Titik embun (Dew Point) menunjukkan suhu saat uap air di udara mulai mengembun pada permukaan daun. Jika suhu udara malam turun mendekati titik embun (selisih T - Td &le; 1.5°C), durasi kebasahan daun (leaf wetness) meningkat drastis yang mempercepat perkembangan spora jamur tanaman.
                  </span>
                </div>
              </TabsContent>

              {/* Tab 3: Surface Pressure Ensemble */}
              <TabsContent value="pressure" className="mt-0 space-y-3">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 text-xs">
                  <span className="font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-1">
                    <Gauge className="h-3.5 w-3.5 text-indigo-500" />
                    Pita Probabilitas Tekanan Udara Permukaan ({memberCount} Anggota Ensemble):
                  </span>
                  <span className="text-[11px] text-slate-400">
                    Garis Indigo: Ensemble Mean | Area Bayangan: Rentang 80% (P10–P90)
                  </span>
                </div>
                <div className="h-[360px] w-full">
                  <ReactECharts
                    option={pressureChartOption}
                    notMerge={true}
                    lazyUpdate={true}
                    style={{ height: "100%", width: "100%" }}
                  />
                </div>
                <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 border dark:border-slate-800 text-xs text-slate-600 dark:text-slate-300 leading-relaxed flex items-start gap-2">
                  <Info className="h-4 w-4 text-indigo-500 shrink-0 mt-0.5" />
                  <span>
                    <strong>Manfaat Agronomis:</strong> Penurunan tajam tekanan udara permukaan dalam skenario ensemble (&lt; 1008 hPa) menjadi tanda awal terbentuknya palung konvergensi monsun atau pembentukan awan badai konvektif lebat di atas lahan pertanian.
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
