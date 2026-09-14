// components/reanalysis/ForecastDiagnostics.tsx
"use client";

import React, { useState, useMemo } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Activity, Sun, Zap, Compass, Info, AlertTriangle } from "lucide-react";
import dynamic from "next/dynamic";

const ReactECharts = dynamic(() => import("echarts-for-react"), {
  ssr: false,
  loading: () => (
    <div className="h-[300px] w-full flex items-center justify-center text-muted-foreground animate-pulse bg-slate-50 dark:bg-slate-900 rounded-lg border">
      Membuat grafik diagnostik...
    </div>
  ),
});

interface ForecastDiagnosticsProps {
  scatter: {
    pressureVsRainfall: [number, number][];
    tempVsHumidity: [number, number][];
  };
  radiation: {
    dailyTotal: number[];
    diurnalCycle: number[];
  };
  cape: {
    max: number;
    mean: number;
    series: number[];
  };
  diagnostics: {
    meanDewPointDepression: number;
    maxDewPointDepression: number;
    diurnalDewPointDepression: number[];
    meanBarometricTendency3h: number;
    maxBarometricTendency3h: number;
  };
  isDarkMode: boolean;
}

export const ForecastDiagnostics: React.FC<ForecastDiagnosticsProps> = ({
  scatter,
  radiation,
  cape,
  diagnostics,
  isDarkMode,
}) => {
  const [activeSubTab, setActiveSubTab] = useState<"scatter" | "radiation" | "diagnostics">("scatter");

  const textColor = isDarkMode ? "#cbd5e1" : "#475569";
  const gridColor = isDarkMode ? "rgba(71, 85, 105, 0.2)" : "rgba(203, 213, 225, 0.25)";

  const hoursArray = useMemo(() => Array.from({ length: 24 }, (_, i) => `${String(i).padStart(2, "0")}:00`), []);

  // Scatter plot 1 option (Temp vs Humidity)
  const scatterTempHumOption = useMemo(() => ({
    backgroundColor: "transparent",
    title: {
      text: "Korelasi Suhu vs Kelembaban Udara",
      textStyle: { color: textColor, fontSize: 12, fontWeight: "bold" },
      top: 5,
      left: 10,
    },
    tooltip: {
      trigger: "item",
      formatter: (params: any) => `Suhu: ${params.value[0]?.toFixed(1)} °C<br/>Kelembaban: ${params.value[1]?.toFixed(1)} %`,
    },
    grid: {
      top: 45,
      right: 20,
      bottom: 40,
      left: 55,
      containLabel: true,
    },
    xAxis: {
      type: "value",
      scale: true,
      name: "Suhu (°C)",
      nameTextStyle: { color: textColor, fontSize: 10 },
      axisLine: { lineStyle: { color: gridColor } },
      axisLabel: { color: textColor, fontSize: 10 },
      splitLine: { lineStyle: { color: gridColor, type: "dashed" } },
    },
    yAxis: {
      type: "value",
      scale: true,
      name: "RH (%)",
      nameTextStyle: { color: textColor, fontSize: 10 },
      axisLine: { show: false },
      axisLabel: { color: textColor, fontSize: 10 },
      splitLine: { lineStyle: { color: gridColor, type: "dashed" } },
    },
    series: [
      {
        name: "Rata-rata Harian",
        type: "scatter",
        data: scatter.tempVsHumidity,
        symbolSize: 6,
        itemStyle: {
          color: "#f87171",
          borderColor: isDarkMode ? "#ef4444" : "#dc2626",
          borderWidth: 0.5,
          opacity: 0.8,
        },
      },
    ],
  }), [scatter.tempVsHumidity, textColor, gridColor, isDarkMode]);

  // Scatter plot 2 option (Pressure vs Rainfall)
  const scatterPressRainOption = useMemo(() => ({
    backgroundColor: "transparent",
    title: {
      text: "Korelasi Tekanan MSL vs Curah Hujan",
      textStyle: { color: textColor, fontSize: 12, fontWeight: "bold" },
      top: 5,
      left: 10,
    },
    tooltip: {
      trigger: "item",
      formatter: (params: any) => `Tekanan: ${params.value[0]?.toFixed(1)} hPa<br/>Curah Hujan: ${params.value[1]?.toFixed(1)} mm`,
    },
    grid: {
      top: 45,
      right: 20,
      bottom: 40,
      left: 55,
      containLabel: true,
    },
    xAxis: {
      type: "value",
      scale: true,
      name: "Tekanan (hPa)",
      nameTextStyle: { color: textColor, fontSize: 10 },
      axisLine: { lineStyle: { color: gridColor } },
      axisLabel: { color: textColor, fontSize: 10 },
      splitLine: { lineStyle: { color: gridColor, type: "dashed" } },
    },
    yAxis: {
      type: "value",
      name: "Hujan (mm)",
      nameTextStyle: { color: textColor, fontSize: 10 },
      axisLine: { show: false },
      axisLabel: { color: textColor, fontSize: 10 },
      splitLine: { lineStyle: { color: gridColor, type: "dashed" } },
    },
    series: [
      {
        name: "Rata-rata Harian",
        type: "scatter",
        data: scatter.pressureVsRainfall,
        symbolSize: 6,
        itemStyle: {
          color: "#60a5fa",
          borderColor: isDarkMode ? "#3b82f6" : "#2563eb",
          borderWidth: 0.5,
          opacity: 0.8,
        },
      },
    ],
  }), [scatter.pressureVsRainfall, textColor, gridColor, isDarkMode]);

  // Diurnal Solar radiation chart option
  const radiationOption = useMemo(() => ({
    backgroundColor: "transparent",
    tooltip: {
      trigger: "axis",
      axisPointer: { type: "cross" },
      valueFormatter: (val: any) => `${val?.toFixed(1) || 0} W/m²`,
    },
    grid: {
      top: 25,
      right: 20,
      bottom: 35,
      left: 55,
      containLabel: true,
    },
    xAxis: {
      type: "category",
      data: hoursArray,
      axisLine: { lineStyle: { color: gridColor } },
      axisLabel: { color: textColor, fontSize: 10, interval: 2 },
      splitLine: { show: false },
    },
    yAxis: {
      type: "value",
      name: "(W/m²)",
      nameTextStyle: { color: textColor, fontSize: 10 },
      axisLine: { show: false },
      axisLabel: { color: textColor, fontSize: 10 },
      splitLine: { lineStyle: { color: gridColor, type: "dashed" } },
    },
    series: [
      {
        name: "Radiasi Gelombang Pendek",
        type: "line",
        data: radiation.diurnalCycle,
        smooth: true,
        showSymbol: true,
        symbolSize: 5,
        lineStyle: { width: 3, color: "#fbbf24" },
        itemStyle: { color: "#f59e0b" },
        areaStyle: {
          color: {
            type: "linear",
            x: 0,
            y: 0,
            x2: 0,
            y2: 1,
            colorStops: [
              { offset: 0, color: "rgba(251, 191, 36, 0.25)" },
              { offset: 1, color: "rgba(251, 191, 36, 0.0)" },
            ],
          },
        },
      },
    ],
  }), [radiation.diurnalCycle, hoursArray, textColor, gridColor]);

  // Dew point depression chart option
  const dewPointDepressionOption = useMemo(() => ({
    backgroundColor: "transparent",
    tooltip: {
      trigger: "axis",
      axisPointer: { type: "cross" },
      valueFormatter: (val: any) => `${val?.toFixed(1) || 0} °C`,
    },
    grid: {
      top: 25,
      right: 20,
      bottom: 35,
      left: 55,
      containLabel: true,
    },
    xAxis: {
      type: "category",
      data: hoursArray,
      axisLine: { lineStyle: { color: gridColor } },
      axisLabel: { color: textColor, fontSize: 10, interval: 2 },
      splitLine: { show: false },
    },
    yAxis: {
      type: "value",
      name: "(°C)",
      nameTextStyle: { color: textColor, fontSize: 10 },
      axisLine: { show: false },
      axisLabel: { color: textColor, fontSize: 10 },
      splitLine: { lineStyle: { color: gridColor, type: "dashed" } },
    },
    series: [
      {
        name: "Depresi Titik Embun (T - Td)",
        type: "line",
        data: diagnostics.diurnalDewPointDepression,
        smooth: true,
        showSymbol: true,
        symbolSize: 5,
        lineStyle: { width: 3, color: "#06b6d4" },
        itemStyle: { color: "#0891b2" },
        areaStyle: {
          color: {
            type: "linear",
            x: 0,
            y: 0,
            x2: 0,
            y2: 1,
            colorStops: [
              { offset: 0, color: "rgba(6, 182, 212, 0.25)" },
              { offset: 1, color: "rgba(6, 182, 212, 0.0)" },
            ],
          },
        },
      },
    ],
  }), [diagnostics.diurnalDewPointDepression, hoursArray, textColor, gridColor]);

  return (
    <Card className="border-none shadow-sm dark:bg-slate-900 bg-white">
      <CardHeader className="flex flex-col md:flex-row md:items-center justify-between pb-4 gap-4">
        <div className="space-y-1">
          <CardTitle className="text-lg font-bold flex items-center gap-2">
            <Activity className="h-5 w-5 text-indigo-500" /> Diagnostik & Analisis Sinoptik
          </CardTitle>
          <CardDescription>
            Hubungan parameter atmosfer, ketidakstabilan konvektif (CAPE), radiasi solar, dan kestabilan tekanan
          </CardDescription>
        </div>

        {/* Sub-tab Selectors */}
        <div className="flex border rounded-lg p-1 bg-slate-50 dark:bg-slate-950 dark:border-slate-800 text-xs self-start md:self-center">
          <button
            onClick={() => setActiveSubTab("scatter")}
            className={`px-3 py-1.5 font-semibold rounded-md transition-all duration-200 ${
              activeSubTab === "scatter" ? "bg-white dark:bg-slate-800 text-indigo-600 dark:text-indigo-400 shadow-sm" : "text-slate-500 hover:text-slate-800"
            }`}
          >
            Diagram Pencaran
          </button>
          <button
            onClick={() => setActiveSubTab("radiation")}
            className={`px-3 py-1.5 font-semibold rounded-md transition-all duration-200 ${
              activeSubTab === "radiation" ? "bg-white dark:bg-slate-800 text-indigo-600 dark:text-indigo-400 shadow-sm" : "text-slate-500 hover:text-slate-800"
            }`}
          >
            Profil Diurnal Radiasi & Saturasi
          </button>
          <button
            onClick={() => setActiveSubTab("diagnostics")}
            className={`px-3 py-1.5 font-semibold rounded-md transition-all duration-200 ${
              activeSubTab === "diagnostics" ? "bg-white dark:bg-slate-800 text-indigo-600 dark:text-indigo-400 shadow-sm" : "text-slate-500 hover:text-slate-800"
            }`}
          >
            Instabilitas & Tendensi Tekanan
          </button>
        </div>
      </CardHeader>

      <CardContent className="p-4">
        {/* Render Tab Content */}
        {activeSubTab === "scatter" && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="bg-slate-50/50 dark:bg-slate-950/20 p-2 rounded-lg border border-slate-100 dark:border-slate-800">
              <div className="w-full h-[300px]">
                <ReactECharts
                  option={scatterTempHumOption}
                  style={{ width: "100%", height: "100%" }}
                  opts={{ renderer: "canvas" }}
                  notMerge={true}
                />
              </div>
              <div className="text-[10px] text-slate-400 p-2">
                *Diagram pencaran di atas menunjukkan hubungan terbalik antara suhu dan kelembaban udara (RH) harian. Korelasi negatif yang kuat adalah tipikal untuk iklim tropis.
              </div>
            </div>

            <div className="bg-slate-50/50 dark:bg-slate-950/20 p-2 rounded-lg border border-slate-100 dark:border-slate-800">
              <div className="w-full h-[300px]">
                <ReactECharts
                  option={scatterPressRainOption}
                  style={{ width: "100%", height: "100%" }}
                  opts={{ renderer: "canvas" }}
                  notMerge={true}
                />
              </div>
              <div className="text-[10px] text-slate-400 p-2">
                *Menggambarkan korelasi tekanan udara MSL terhadap curah hujan. Secara sinoptik, kejadian curah hujan lebat cenderung berkorelasi dengan area tekanan rendah (palung tekanan rendah).
              </div>
            </div>
          </div>
        )}

        {activeSubTab === "radiation" && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Shortwave Solar radiation */}
            <div className="space-y-2 bg-slate-50/50 dark:bg-slate-950/20 p-4 rounded-lg border border-slate-100 dark:border-slate-800">
              <h3 className="text-sm font-bold flex items-center gap-2 text-amber-500">
                <Sun className="h-4 w-4" /> Radiasi Gelombang Pendek Diurnal
              </h3>
              <p className="text-xs text-slate-500">
                Profil rata-rata insolasi matahari harian yang sampai ke permukaan bumi (W/m²).
              </p>
              <div className="w-full h-[320px]">
                <ReactECharts
                  option={radiationOption}
                  style={{ width: "100%", height: "100%" }}
                  opts={{ renderer: "canvas" }}
                  notMerge={true}
                />
              </div>
            </div>

            {/* Dew Point Depression */}
            <div className="space-y-2 bg-slate-50/50 dark:bg-slate-950/20 p-4 rounded-lg border border-slate-100 dark:border-slate-800">
              <h3 className="text-sm font-bold flex items-center gap-2 text-cyan-500">
                <Compass className="h-4 w-4" /> Depresi Titik Embun Diurnal (T - Td)
              </h3>
              <p className="text-xs text-slate-500">
                Menunjukkan kejenuhan parsel udara. Nilai yang mendekati 0°C menandakan kejenuhan penuh (potensi kondensasi/kabut/hujan tinggi).
              </p>
              <div className="w-full h-[320px]">
                <ReactECharts
                  option={dewPointDepressionOption}
                  style={{ width: "100%", height: "100%" }}
                  opts={{ renderer: "canvas" }}
                  notMerge={true}
                />
              </div>
            </div>
          </div>
        )}

        {activeSubTab === "diagnostics" && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* CAPE Stability Indicators */}
            <div className="bg-gradient-to-br from-amber-50/40 to-yellow-50/10 dark:from-yellow-950/10 dark:to-slate-950/20 p-5 rounded-lg border border-yellow-100/50 dark:border-yellow-950/30 space-y-4">
              <h3 className="text-sm font-extrabold flex items-center gap-2 text-yellow-600 dark:text-yellow-400">
                <Zap className="h-5 w-5" /> Instabilitas Atmosfer (CAPE)
              </h3>
              <p className="text-xs text-slate-500 leading-relaxed">
                Convective Available Potential Energy (CAPE) mengukur jumlah energi pengapungan (buoyancy energy) yang tersedia untuk memicu konveksi udara vertikal.
              </p>

              <div className="grid grid-cols-2 gap-4 border-t border-yellow-100 dark:border-yellow-900/40 pt-4">
                <div>
                  <span className="text-[10px] text-slate-500 uppercase font-semibold">CAPE Rata-rata</span>
                  <p className="text-2xl font-extrabold text-slate-800 dark:text-slate-100">
                    {cape.mean.toFixed(1)} J/kg
                  </p>
                </div>
                <div>
                  <span className="text-[10px] text-slate-500 uppercase font-semibold">CAPE Maksimum</span>
                  <p className="text-2xl font-extrabold text-amber-600 dark:text-amber-400">
                    {cape.max.toFixed(0)} J/kg
                  </p>
                </div>
              </div>

              <div className="bg-yellow-50 dark:bg-yellow-950/30 p-3 rounded text-[11px] text-yellow-800 dark:text-yellow-300 leading-relaxed flex gap-2">
                <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5" />
                <div>
                  <strong>Klasifikasi Instabilitas:</strong>
                  <ul className="list-disc list-inside mt-1 space-y-0.5 text-[10px]">
                    <li>&lt; 1000 J/kg: Lemah (Weak)</li>
                    <li>1000 - 2500 J/kg: Sedang (Moderate)</li>
                    <li>&gt; 2500 J/kg: Kuat (Severe Potential)</li>
                  </ul>
                  <p className="mt-1 font-semibold">
                    Status: {cape.max > 2500 ? "Potensi Badai Petir Kuat" : cape.max > 1000 ? "Potensi Konveksi Sedang" : "Atmosfer Cenderung Stabil"}
                  </p>
                </div>
              </div>
            </div>

            {/* Dew Point Depression Analysis */}
            <div className="bg-slate-50/70 dark:bg-slate-950/40 p-5 rounded-lg border border-slate-100 dark:border-slate-800 space-y-4">
              <h3 className="text-sm font-extrabold flex items-center gap-2 text-cyan-600 dark:text-cyan-400">
                <Compass className="h-5 w-5" /> Kejenuhan Udara (Dew Point Depression)
              </h3>
              <p className="text-xs text-slate-500 leading-relaxed">
                Selisih antara temperatur udara (T) dan titik embun (Td). Semakin kecil selisihnya, semakin jenuh udara tersebut.
              </p>

              <div className="grid grid-cols-2 gap-4 border-t dark:border-slate-800 pt-4">
                <div>
                  <span className="text-[10px] text-slate-500 uppercase font-semibold">Depresi Rata-rata</span>
                  <p className="text-2xl font-extrabold text-slate-800 dark:text-slate-100">
                    {diagnostics.meanDewPointDepression.toFixed(2)}°C
                  </p>
                </div>
                <div>
                  <span className="text-[10px] text-slate-500 uppercase font-semibold">Depresi Maksimum</span>
                  <p className="text-2xl font-extrabold text-slate-800 dark:text-slate-100">
                    {diagnostics.maxDewPointDepression.toFixed(1)}°C
                  </p>
                </div>
              </div>

              <div className="bg-cyan-50/50 dark:bg-cyan-950/20 p-3 rounded text-[11px] text-slate-600 dark:text-slate-300 leading-relaxed">
                <div className="flex gap-2">
                  <Info className="h-4 w-4 shrink-0 text-cyan-500 mt-0.5" />
                  <div>
                    Rata-rata selisih suhu-titik embun sebesar <strong>{diagnostics.meanDewPointDepression.toFixed(1)}°C</strong> menunjukkan kelembaban atmosfer rata-rata. Selisih &lt; 2°C pada profil harian adalah indikator kuat terbentuknya awan konvektif atau kabut basah di permukaan bumi.
                  </div>
                </div>
              </div>
            </div>

            {/* Barometric Tendency Indicator */}
            <div className="bg-slate-50/70 dark:bg-slate-950/40 p-5 rounded-lg border border-slate-100 dark:border-slate-800 space-y-4">
              <h3 className="text-sm font-extrabold flex items-center gap-2 text-rose-600 dark:text-rose-400">
                <Activity className="h-5 w-5" /> Pasang Surut & Tendensi Barometrik
              </h3>
              <p className="text-xs text-slate-500 leading-relaxed">
                Mengukur perubahan absolut tekanan udara dalam rentang 3 jam (ΔP / Δt). Fluktuasi yang drastis dikaitkan dengan kedatangan sistem cuaca frontal.
              </p>

              <div className="grid grid-cols-2 gap-4 border-t dark:border-slate-800 pt-4">
                <div>
                  <span className="text-[10px] text-slate-500 uppercase font-semibold">Tendensi 3 Jam Rerata</span>
                  <p className="text-2xl font-extrabold text-slate-800 dark:text-slate-100">
                    {diagnostics.meanBarometricTendency3h.toFixed(2)} hPa
                  </p>
                </div>
                <div>
                  <span className="text-[10px] text-slate-500 uppercase font-semibold">Tendensi 3 Jam Maks</span>
                  <p className="text-2xl font-extrabold text-rose-600 dark:text-rose-400">
                    {diagnostics.maxBarometricTendency3h.toFixed(1)} hPa
                  </p>
                </div>
              </div>

              <div className="bg-slate-100 dark:bg-slate-950 p-3 rounded text-[11px] text-slate-500 dark:text-slate-400 leading-relaxed">
                Pasang surut atmosfer normal di kawasan khatulistiwa berkisar antara 1 - 2.5 hPa dalam siklus diurnal (semidiurnal tide). Tendensi &gt; 3 hPa per 3 jam merupakan indikasi adanya gangguan badai tropis atau perubahan pola angin regional yang signifikan.
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};
