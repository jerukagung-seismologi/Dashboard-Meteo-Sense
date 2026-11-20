// components/climatology/workspaces/OverviewWorkspace.tsx
"use client";

import React from "react";
import dynamic from "next/dynamic";
import {
  Thermometer,
  CloudRain,
  Waves,
  Gauge,
  Calendar,
  Sprout,
  Info,
  Sparkles,
  CloudSun,
  Loader2,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { ClimatologyWorkspaceHook } from "@/hooks/climatology/useClimatologyWorkspace";
import { ClimateRepresentativenessOverview } from "@/components/climatology/ClimateRepresentativenessOverview";

const WalterLiethClimograph = dynamic(
  () => import("@/components/climatology/WalterLiethClimograph").then((m) => m.WalterLiethClimograph),
  {
    ssr: false,
    loading: () => <Skeleton className="w-full h-80 rounded-xl" />,
  }
);

const ClimateClassificationCard = dynamic(
  () => import("@/components/climatology/ClimateClassificationCard").then((m) => m.ClimateClassificationCard),
  {
    ssr: false,
    loading: () => <Skeleton className="w-full h-64 rounded-xl" />,
  }
);

interface OverviewWorkspaceProps {
  ws: ClimatologyWorkspaceHook;
}

export default function OverviewWorkspace({ ws }: OverviewWorkspaceProps) {
  const {
    activeLocation,
    activeCoords,
    klimData,
    periodNormals,
    climateExtremes,
    wmoNormalsData,
    isWmoNormalsLoading,
    era5BaselineData,
    isDarkMode,
    locationMode,
    preset,
    selectedMonth,
    selectedYear,
    selectedDasarian,
    temp,
    rainToday,
    soilMoistureRoot,
    vpd,
    waterDeficit,
  } = ws;

  // Compute 6 Core Consolidated KPIs
  const obsTemp = klimData?.stats?.temperature?.mean ?? (typeof temp === "number" ? temp : null);
  const normTemp = periodNormals?.temperature?.mean ?? null;
  const tempAnomaly = obsTemp !== null && normTemp !== null ? obsTemp - normTemp : null;

  const obsRain = klimData?.stats?.rainfall?.total ?? (typeof rainToday === "number" ? rainToday : 0);
  const normRain = periodNormals?.rainfall?.normal ?? null;
  const rainRatio = normRain && normRain > 0 ? (obsRain / normRain) * 100 : null;

  const obsHum = klimData?.stats?.humidity?.mean ?? ws.rh;
  const normHum = periodNormals?.humidity?.mean ?? null;

  const obsPress = klimData?.stats?.pressure?.mean ?? ws.surfacePressure;
  const normPress = periodNormals?.pressure?.mean ?? null;

  const cdd = climateExtremes?.rainfall?.consecutiveDryDays ?? 0;

  return (
    <div className="space-y-6">
      {/* ── 1. CONSOLIDATED 6 CORE EXECUTIVE KPIS ── */}
      <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-3.5">
        {/* KPI 1: Suhu Udara vs WMO */}
        <Card className="border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900/90 shadow-2xs">
          <CardContent className="p-3.5 flex flex-col justify-between h-full space-y-2">
            <div className="flex justify-between items-start">
              <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                Suhu Rerata
              </span>
              <Thermometer className="h-4 w-4 text-rose-500 shrink-0" />
            </div>
            <div>
              <div className="text-xl sm:text-2xl font-black text-slate-900 dark:text-slate-50 font-mono">
                {obsTemp !== null ? `${obsTemp.toFixed(1)}°C` : "-"}
              </div>
              <div className="text-[10px] text-slate-500 mt-0.5">
                Normal WMO: <strong className="text-slate-700 dark:text-slate-300">{normTemp ? `${normTemp.toFixed(1)}°` : "-"}</strong>
                {tempAnomaly !== null && (
                  <span className={`ml-1 font-bold ${tempAnomaly > 0 ? "text-rose-500" : "text-sky-500"}`}>
                    ({tempAnomaly > 0 ? "+" : ""}{tempAnomaly.toFixed(1)}°)
                  </span>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* KPI 2: Akumulasi Hujan vs WMO */}
        <Card className="border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900/90 shadow-2xs">
          <CardContent className="p-3.5 flex flex-col justify-between h-full space-y-2">
            <div className="flex justify-between items-start">
              <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                Curah Hujan
              </span>
              <CloudRain className="h-4 w-4 text-cyan-500 shrink-0" />
            </div>
            <div>
              <div className="text-xl sm:text-2xl font-black text-slate-900 dark:text-slate-50 font-mono">
                {typeof obsRain === "number" ? `${obsRain.toFixed(1)} mm` : "-"}
              </div>
              <div className="text-[10px] text-slate-500 mt-0.5">
                Normal: <strong className="text-slate-700 dark:text-slate-300">{normRain ? `${normRain.toFixed(1)}` : "-"}</strong>
                {rainRatio !== null && (
                  <span className="ml-1 font-bold text-cyan-600 dark:text-cyan-400">
                    ({rainRatio.toFixed(0)}%)
                  </span>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* KPI 3: Kelembapan Relatif */}
        <Card className="border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900/90 shadow-2xs">
          <CardContent className="p-3.5 flex flex-col justify-between h-full space-y-2">
            <div className="flex justify-between items-start">
              <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                Kelembaban
              </span>
              <Waves className="h-4 w-4 text-blue-500 shrink-0" />
            </div>
            <div>
              <div className="text-xl sm:text-2xl font-black text-slate-900 dark:text-slate-50 font-mono">
                {typeof obsHum === "number" ? `${obsHum.toFixed(1)}%` : `${obsHum}%`}
              </div>
              <div className="text-[10px] text-slate-500 mt-0.5">
                Normal ERA5: <strong className="text-slate-700 dark:text-slate-300">{normHum ? `${normHum.toFixed(1)}%` : "-"}</strong>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* KPI 4: Tekanan Udara Barometrik */}
        <Card className="border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900/90 shadow-2xs">
          <CardContent className="p-3.5 flex flex-col justify-between h-full space-y-2">
            <div className="flex justify-between items-start">
              <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                Tekanan Udara
              </span>
              <Gauge className="h-4 w-4 text-indigo-500 shrink-0" />
            </div>
            <div>
              <div className="text-xl sm:text-2xl font-black text-slate-900 dark:text-slate-50 font-mono">
                {typeof obsPress === "number" ? `${obsPress.toFixed(1)} hPa` : "-"}
              </div>
              <div className="text-[10px] text-slate-500 mt-0.5">
                Normal: <strong className="text-slate-700 dark:text-slate-300">{normPress ? `${normPress.toFixed(0)} hPa` : "-"}</strong>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* KPI 5: Hari Kering Berturut-turut (CDD) */}
        <Card className="border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900/90 shadow-2xs">
          <CardContent className="p-3.5 flex flex-col justify-between h-full space-y-2">
            <div className="flex justify-between items-start">
              <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                Hari Kering (CDD)
              </span>
              <Calendar className="h-4 w-4 text-amber-500 shrink-0" />
            </div>
            <div>
              <div className="text-xl sm:text-2xl font-black text-amber-600 dark:text-amber-400 font-mono">
                {cdd} <span className="text-xs font-normal text-slate-400">hari</span>
              </div>
              <div className="text-[10px] text-slate-500 mt-0.5">
                {cdd >= 21 ? "Kekeringan Ekstrem" : cdd >= 11 ? "Sangat Panjang" : cdd >= 6 ? "Sedang" : "Pendek / Aman"}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* KPI 6: Neraca Air Lahan */}
        <Card className="border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900/90 shadow-2xs">
          <CardContent className="p-3.5 flex flex-col justify-between h-full space-y-2">
            <div className="flex justify-between items-start">
              <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                Neraca Air Lahan
              </span>
              <Sprout className="h-4 w-4 text-emerald-500 shrink-0" />
            </div>
            <div>
              <div className={`text-xl sm:text-2xl font-black font-mono ${waterDeficit < 0 ? "text-amber-600 dark:text-amber-400" : "text-emerald-600 dark:text-emerald-400"}`}>
                {waterDeficit > 0 ? "+" : ""}{waterDeficit.toFixed(1)} <span className="text-xs font-normal text-slate-400">mm</span>
              </div>
              <div className="text-[10px] text-slate-500 mt-0.5">
                {waterDeficit < 0 ? "Defisit (Perlu Irigasi)" : "Surplus (Lembap)"}
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* ── 2. EXECUTIVE CLIMATE REPRESENTATIVENESS OVERVIEW ── */}
      <ClimateRepresentativenessOverview
        coordinates={activeCoords}
        stationName={activeLocation.name}
        preset={preset}
        selectedMonth={selectedMonth}
        selectedYear={selectedYear}
        selectedDasarian={selectedDasarian}
        observedRainTotal={klimData?.stats?.rainfall?.total ?? (typeof rainToday === "number" ? rainToday : 0)}
        normalRainTotal={periodNormals?.rainfall?.normal}
        observedTempMean={klimData?.stats?.temperature?.mean ?? (typeof temp === "number" ? temp : 28)}
        normalTempMean={periodNormals?.temperature?.mean}
        pointsCount={klimData?.points?.length ?? 0}
        consecutiveDryDays={cdd}
        consecutiveWetDays={climateExtremes?.rainfall?.consecutiveWetDays ?? 0}
        waterDeficit={waterDeficit}
        soilMoistureRoot={soilMoistureRoot}
        vpd={typeof vpd === "number" ? vpd : 0.8}
        era5Elevation={era5BaselineData?.elevation}
        locationMode={locationMode}
      />

      {/* ── 3. BIOKLIMATOLOGI: WALTER-LIETH & KLASIFIKASI IKLIM ── */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        {/* Walter-Lieth Climograph */}
        <Card className="border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900/90 shadow-sm overflow-hidden">
          <CardContent className="p-4 sm:p-5">
            {isWmoNormalsLoading && !wmoNormalsData ? (
              <div className="h-80 flex flex-col items-center justify-center gap-2">
                <Loader2 className="h-6 w-6 animate-spin text-blue-500" />
                <span className="text-xs text-slate-400">Menghitung Klimograf Walter-Lieth 30-tahun...</span>
              </div>
            ) : (
              <WalterLiethClimograph
                normals={wmoNormalsData?.normals || null}
                stationName={activeLocation.name}
                isDarkMode={isDarkMode}
              />
            )}
          </CardContent>
        </Card>

        {/* Climate Classification Card */}
        <Card className="border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900/90 shadow-sm overflow-hidden">
          <CardContent className="p-4 sm:p-5">
            {isWmoNormalsLoading && !wmoNormalsData ? (
              <div className="h-80 flex flex-col items-center justify-center gap-2">
                <Loader2 className="h-6 w-6 animate-spin text-teal-500" />
                <span className="text-xs text-slate-400">Memuat Taksonomi Iklim Oldeman &amp; Köppen...</span>
              </div>
            ) : (
              <ClimateClassificationCard
                classification={wmoNormalsData?.classification || null}
                isDarkMode={isDarkMode}
              />
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
