// components/climatology/workspaces/ObservationWorkspace.tsx
"use client";

import React, { useState, useMemo } from "react";
import dynamic from "next/dynamic";
import {
  Thermometer,
  CloudRain,
  Waves,
  Gauge,
  Clock,
  BarChart3,
  Calendar,
  Layers,
  Radio,
  Globe,
  Loader2,
  Activity,
  Info,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { ClimatologyWorkspaceHook } from "@/hooks/climatology/useClimatologyWorkspace";
import { AnalysisPoint } from "@/lib/climatology/analysisTypes";

// Dynamic imports with Skeleton loading
const TemperatureCharts = dynamic(
  () => import("@/components/climatology/TemperatureCharts").then((m) => m.TemperatureCharts),
  { ssr: false, loading: () => <Skeleton className="w-full h-80 rounded-xl" /> }
);
const TempDewComparisonCharts = dynamic(
  () => import("@/components/climatology/TempDewComparisonCharts").then((m) => m.TempDewComparisonCharts),
  { ssr: false, loading: () => <Skeleton className="w-full h-80 rounded-xl" /> }
);
const RainfallCharts = dynamic(
  () => import("@/components/climatology/RainfallCharts").then((m) => m.RainfallCharts),
  { ssr: false, loading: () => <Skeleton className="w-full h-80 rounded-xl" /> }
);
const HumidityCharts = dynamic(
  () => import("@/components/climatology/HumidityCharts").then((m) => m.HumidityCharts),
  { ssr: false, loading: () => <Skeleton className="w-full h-80 rounded-xl" /> }
);
const PressureCharts = dynamic(
  () => import("@/components/climatology/PressureCharts").then((m) => m.PressureCharts),
  { ssr: false, loading: () => <Skeleton className="w-full h-80 rounded-xl" /> }
);
const DailyAnalysis = dynamic(
  () => import("@/components/climatology/DailyAnalysis").then((m) => m.DailyAnalysis),
  { ssr: false, loading: () => <Skeleton className="w-full h-80 rounded-xl" /> }
);
const WeeklyAnalysis = dynamic(
  () => import("@/components/climatology/WeeklyAnalysis").then((m) => m.WeeklyAnalysis),
  { ssr: false, loading: () => <Skeleton className="w-full h-80 rounded-xl" /> }
);
const DistributionAnalysis = dynamic(
  () => import("@/components/climatology/DistributionAnalysis").then((m) => m.DistributionAnalysis),
  { ssr: false, loading: () => <Skeleton className="w-full h-80 rounded-xl" /> }
);
const HeatmapAnalysis = dynamic(
  () => import("@/components/climatology/HeatmapAnalysis").then((m) => m.HeatmapAnalysis),
  { ssr: false, loading: () => <Skeleton className="w-full h-80 rounded-xl" /> }
);
const Era5ClimatologyCharts = dynamic(
  () => import("@/components/climatology/Era5ClimatologyCharts").then((m) => m.Era5ClimatologyCharts),
  { ssr: false, loading: () => <Skeleton className="w-full h-96 rounded-xl" /> }
);

export type ObservationPill =
  | "suhu-embun"
  | "hujan"
  | "kelembapan-tekanan"
  | "harian-mingguan"
  | "distribusi-heatmap";

interface ObservationWorkspaceProps {
  ws: ClimatologyWorkspaceHook;
}

export default function ObservationWorkspace({ ws }: ObservationWorkspaceProps) {
  const [activePill, setActivePill] = useState<ObservationPill>("suhu-embun");

  const {
    locationMode,
    setLocationMode,
    activeLocation,
    activeCoords,
    klimData,
    klimError,
    isKlimLoading,
    preset,
    periodNormals,
    era5BaselineData,
    isEra5BaselineLoading,
    isDarkMode,
    selectedYear,
    devices,
  } = ws;

  // Transform station points to AnalysisPoint format for Daily/Weekly/Distribution if available
  const analysisPoints: AnalysisPoint[] = useMemo(() => {
    if (!klimData?.points) return [];
    return klimData.points.map((p: any) => {
      const d = new Date(p.timestamp);
      const hourUtc = d.getUTCHours();
      const hourWib = (hourUtc + 7) % 24;
      const timeKeyWib = `${String(hourWib).padStart(2, "0")}:00`;
      const timeKeyUtc = `${String(hourUtc).padStart(2, "0")}:00`;

      return {
        hourUtc,
        timeKeyWib,
        timeKeyUtc,
        timeKey: timeKeyWib,
        timestamp: p.timestamp,
        sampleCount: p.sampleCount || 1,
        temperatureMean: p.temperatureMean ?? 0,
        temperatureMax: p.temperatureMax ?? p.temperatureMean ?? 0,
        temperatureMin: p.temperatureMin ?? p.temperatureMin ?? 0,
        humidityMean: p.humidityMean ?? 0,
        humidityMax: p.humidityMax ?? p.humidityMean ?? 0,
        humidityMin: p.humidityMin ?? p.humidityMean ?? 0,
        pressureMean: p.pressureMean ?? 0,
        pressureMax: p.pressureMax ?? p.pressureMean ?? 0,
        pressureMin: p.pressureMin ?? p.pressureMean ?? 0,
      };
    });
  }, [klimData?.points]);

  // Heatmap 2D data synthesizer from station observations
  const heatmapData = useMemo(() => {
    if (!klimData?.points || klimData.points.length === 0) {
      return {
        temperature: { days: [], hours: [], z: [] },
        humidity: { days: [], hours: [], z: [] },
        pressure: { days: [], hours: [], z: [] },
      };
    }

    const dayMap = new Map<string, Map<number, { temp?: number; hum?: number; press?: number }>>();
    klimData.points.forEach((p: any) => {
      const d = new Date(p.timestamp);
      const dayStr = d.toISOString().substring(0, 10);
      const hour = (d.getUTCHours() + 7) % 24;

      if (!dayMap.has(dayStr)) dayMap.set(dayStr, new Map());
      const hourMap = dayMap.get(dayStr)!;
      hourMap.set(hour, {
        temp: p.temperatureMean,
        hum: p.humidityMean,
        press: p.pressureMean,
      });
    });

    const days = Array.from(dayMap.keys()).sort();
    const hours = Array.from({ length: 24 }, (_, i) => `${String(i).padStart(2, "0")}:00`);

    const zTemp: (number | null)[][] = hours.map((_, hIdx) =>
      days.map((day) => dayMap.get(day)?.get(hIdx)?.temp ?? null)
    );
    const zHum: (number | null)[][] = hours.map((_, hIdx) =>
      days.map((day) => dayMap.get(day)?.get(hIdx)?.hum ?? null)
    );
    const zPress: (number | null)[][] = hours.map((_, hIdx) =>
      days.map((day) => dayMap.get(day)?.get(hIdx)?.press ?? null)
    );

    return {
      temperature: { days, hours, z: zTemp },
      humidity: { days, hours, z: zHum },
      pressure: { days, hours, z: zPress },
    };
  }, [klimData?.points]);

  // Distribution histograms synthesizer
  const distributionStats = useMemo(() => {
    if (!klimData?.stats) {
      return {
        temperature: { min: 20, mean: 27, max: 34, stdDev: 2.1, median: 27 },
        humidity: { min: 50, mean: 80, max: 100, stdDev: 8.5, median: 81 },
        pressure: { min: 1005, mean: 1011, max: 1016, stdDev: 1.8, median: 1011 },
      };
    }
    return {
      temperature: {
        min: klimData.stats.temperature.min,
        mean: klimData.stats.temperature.mean,
        max: klimData.stats.temperature.max,
        stdDev: klimData.stats.temperature.stdDev,
        median: klimData.stats.temperature.median ?? klimData.stats.temperature.mean,
      },
      humidity: {
        min: klimData.stats.humidity.min,
        mean: klimData.stats.humidity.mean,
        max: klimData.stats.humidity.max,
        stdDev: klimData.stats.humidity.stdDev,
        median: klimData.stats.humidity.median ?? klimData.stats.humidity.mean,
      },
      pressure: {
        min: klimData.stats.pressure.min,
        mean: klimData.stats.pressure.mean,
        max: klimData.stats.pressure.max,
        stdDev: klimData.stats.pressure.stdDev,
        median: klimData.stats.pressure.median ?? klimData.stats.pressure.mean,
      },
    };
  }, [klimData?.stats]);

  // If in regional mode (no physical station selected)
  if (locationMode === "region") {
    return (
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 bg-gradient-to-r from-indigo-50 via-slate-50 to-blue-50 dark:from-indigo-950/40 dark:via-slate-900 dark:to-blue-950/40 rounded-xl border border-indigo-200 dark:border-indigo-900/60">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <Badge variant="outline" className="bg-indigo-100 text-indigo-800 dark:bg-indigo-950 dark:text-indigo-300 border-indigo-300 text-[10px] font-bold">
                <Globe className="h-3 w-3 mr-1 text-indigo-500" /> Mode Analisis Wilayah
              </Badge>
              <span className="text-xs text-slate-500 font-mono">[{activeCoords.lat.toFixed(3)}°, {activeCoords.lng.toFixed(3)}°]</span>
            </div>
            <h2 className="text-base font-bold text-slate-900 dark:text-slate-100">
              Klimatologi Grid Reanalisis ERA5: {activeLocation.name}
            </h2>
            <p className="text-xs text-slate-600 dark:text-slate-400 mt-0.5">
              Anda berada dalam mode pencarian wilayah bebas. Analisis dihitung dari grid reanalisis atmosfer ERA5 (~9-25 km).
            </p>
          </div>
          {devices.length > 0 && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => setLocationMode("station")}
              className="h-8 text-xs shrink-0 border-teal-300 dark:border-teal-800 text-teal-700 dark:text-teal-300"
            >
              <Radio className="h-3.5 w-3.5 mr-1.5 text-teal-500" /> Beralih ke Stasiun Sensor IoT
            </Button>
          )}
        </div>

        <Era5ClimatologyCharts
          era5Data={era5BaselineData}
          isLoading={isEra5BaselineLoading}
          stationPoints={[]}
          stationName={activeLocation.name}
          coordinates={activeCoords}
          isDarkMode={isDarkMode}
          selectedYear={selectedYear}
        />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* ── ON-DEMAND SUB-FILTER PILLS NAVIGATION ── */}
      <div className="flex items-center gap-1.5 p-1 bg-slate-100 dark:bg-slate-800/80 rounded-xl overflow-x-auto border border-slate-200 dark:border-slate-800 scrollbar-none">
        <button
          onClick={() => setActivePill("suhu-embun")}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition ${
            activePill === "suhu-embun"
              ? "bg-white dark:bg-slate-900 text-rose-600 dark:text-rose-400 shadow-xs font-bold"
              : "text-slate-600 dark:text-slate-400 hover:text-slate-900"
          }`}
        >
          <Thermometer className="h-3.5 w-3.5 text-rose-500" />
          <span>Suhu &amp; Titik Embun</span>
        </button>

        <button
          onClick={() => setActivePill("hujan")}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition ${
            activePill === "hujan"
              ? "bg-white dark:bg-slate-900 text-cyan-600 dark:text-cyan-400 shadow-xs font-bold"
              : "text-slate-600 dark:text-slate-400 hover:text-slate-900"
          }`}
        >
          <CloudRain className="h-3.5 w-3.5 text-cyan-500" />
          <span>Curah Hujan</span>
        </button>

        <button
          onClick={() => setActivePill("kelembapan-tekanan")}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition ${
            activePill === "kelembapan-tekanan"
              ? "bg-white dark:bg-slate-900 text-blue-600 dark:text-blue-400 shadow-xs font-bold"
              : "text-slate-600 dark:text-slate-400 hover:text-slate-900"
          }`}
        >
          <Waves className="h-3.5 w-3.5 text-blue-500" />
          <span>Kelembapan &amp; Tekanan</span>
        </button>

        <button
          onClick={() => setActivePill("harian-mingguan")}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition ${
            activePill === "harian-mingguan"
              ? "bg-white dark:bg-slate-900 text-amber-600 dark:text-amber-400 shadow-xs font-bold"
              : "text-slate-600 dark:text-slate-400 hover:text-slate-900"
          }`}
        >
          <Clock className="h-3.5 w-3.5 text-amber-500" />
          <span>Harian &amp; Mingguan</span>
        </button>

        <button
          onClick={() => setActivePill("distribusi-heatmap")}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition ${
            activePill === "distribusi-heatmap"
              ? "bg-white dark:bg-slate-900 text-purple-600 dark:text-purple-400 shadow-xs font-bold"
              : "text-slate-600 dark:text-slate-400 hover:text-slate-900"
          }`}
        >
          <BarChart3 className="h-3.5 w-3.5 text-purple-500" />
          <span>Distribusi &amp; Heatmap</span>
        </button>
      </div>

      {/* ── DATA LOADING & ERROR STATES ── */}
      {isKlimLoading ? (
        <div className="space-y-4">
          <Skeleton className="w-full h-80 rounded-xl" />
          <Skeleton className="w-full h-80 rounded-xl" />
        </div>
      ) : klimError ? (
        <Card className="border-red-200 bg-red-50/50 dark:bg-red-950/20">
          <CardContent className="p-6 text-center text-xs text-red-600 font-semibold">
            {klimError.message || "Gagal memuat observasi iklim stasiun."}
          </CardContent>
        </Card>
      ) : !klimData || !klimData.points || klimData.points.length === 0 ? (
        <div className="p-8 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-center space-y-2">
          <Activity className="h-8 w-8 text-slate-400 mx-auto" />
          <div className="text-sm font-bold text-slate-800 dark:text-slate-200">
            Tidak Ada Data Telemetri untuk Periode Ini
          </div>
          <p className="text-xs text-slate-500 max-w-md mx-auto">
            Stasiun {activeLocation.name} tidak memiliki catatan telemetri pada rentang waktu yang dipilih ({preset}). Silakan pilih periode lain pada bilah kontrol.
          </p>
        </div>
      ) : (
        /* ── ON-DEMAND MOUNTED SECTIONS ── */
        <div className="space-y-6">
          {/* 1. SUHU & TITIK EMBUN */}
          {activePill === "suhu-embun" && (
            <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
              <TemperatureCharts
                points={klimData.points}
                preset={preset}
                isDarkMode={isDarkMode}
                stdDev={klimData.stats.temperature.stdDev}
                observedMean={klimData.stats.temperature.mean}
                era5NormalTemp={periodNormals?.temperature.mean}
                monthlyNormals={periodNormals?.temperature.monthly}
              />
              <TempDewComparisonCharts
                points={klimData.points}
                preset={preset}
                isDarkMode={isDarkMode}
              />
            </div>
          )}

          {/* 2. CURAH HUJAN */}
          {activePill === "hujan" && (
            <div className="space-y-6">
              <RainfallCharts
                points={klimData.points}
                preset={preset}
                isDarkMode={isDarkMode}
                totalRainfall={klimData.stats.rainfall.total}
                era5NormalRain={periodNormals?.rainfall.normal}
                monthlyNormals={periodNormals?.rainfall.monthly}
              />
            </div>
          )}

          {/* 3. KELEMBAPAN & TEKANAN */}
          {activePill === "kelembapan-tekanan" && (
            <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
              <HumidityCharts
                points={klimData.points}
                preset={preset}
                isDarkMode={isDarkMode}
                stdDev={klimData.stats.humidity.stdDev}
                observedMean={klimData.stats.humidity.mean}
                era5NormalHum={periodNormals?.humidity.mean}
                monthlyNormals={periodNormals?.humidity.monthly}
              />
              <PressureCharts
                points={klimData.points}
                preset={preset}
                isDarkMode={isDarkMode}
                stdDev={klimData.stats.pressure.stdDev}
                observedMean={klimData.stats.pressure.mean}
                era5NormalPress={periodNormals?.pressure.mean}
                monthlyNormals={periodNormals?.pressure.monthly}
              />
            </div>
          )}

          {/* 4. HARIAN & MINGGUAN */}
          {activePill === "harian-mingguan" && (
            <div className="space-y-6">
              <DailyAnalysis
                points={analysisPoints}
                isDarkMode={isDarkMode}
              />
              <WeeklyAnalysis
                points={analysisPoints}
                isDarkMode={isDarkMode}
              />
            </div>
          )}

          {/* 5. DISTRIBUSI & HEATMAP */}
          {activePill === "distribusi-heatmap" && (
            <div className="space-y-6">
              <HeatmapAnalysis
                heatmaps={heatmapData}
                isDarkMode={isDarkMode}
              />
              <DistributionAnalysis
                stats={distributionStats}
                isDarkMode={isDarkMode}
              />
            </div>
          )}
        </div>
      )}
    </div>
  );
}
