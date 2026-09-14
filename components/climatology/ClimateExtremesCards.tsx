// components/climatology/ClimateExtremesCards.tsx
"use client";

import React, { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  ThermometerSun,
  ThermometerSnowflake,
  CloudRain,
  Wind,
  Gauge,
  Droplets,
  AlertTriangle,
  Flame,
  ChevronDown,
  ChevronUp,
  Activity,
  Layers,
} from "lucide-react";
import type { ClimateExtremesResult } from "@/lib/climatology/climateExtremes";
import type { ClimatologyStats } from "@/lib/climatology/climatologyTypes";

interface ClimateExtremesCardsProps {
  extremes: ClimateExtremesResult;
  stats?: ClimatologyStats;
}

export const ClimateExtremesCards: React.FC<ClimateExtremesCardsProps> = ({
  extremes,
  stats,
}) => {
  const [showAverages, setShowAverages] = useState(false);

  // Helper for BMKG Rain Badge styling
  const getRainBadge = (category: string) => {
    switch (category) {
      case "Ekstrem":
        return {
          bg: "bg-purple-100 dark:bg-purple-950/50 text-purple-700 dark:text-purple-300 border-purple-300 dark:border-purple-800",
          text: "Hujan Ekstrem (≥150mm)",
        };
      case "Sangat Lebat":
        return {
          bg: "bg-rose-100 dark:bg-rose-950/50 text-rose-700 dark:text-rose-300 border-rose-300 dark:border-rose-800",
          text: "Sangat Lebat (100–150mm)",
        };
      case "Lebat":
        return {
          bg: "bg-amber-100 dark:bg-amber-950/50 text-amber-700 dark:text-amber-300 border-amber-300 dark:border-amber-800",
          text: "Hujan Lebat (50–100mm)",
        };
      case "Sedang":
        return {
          bg: "bg-blue-100 dark:bg-blue-950/50 text-blue-700 dark:text-blue-300 border-blue-300 dark:border-blue-800",
          text: "Hujan Sedang (20–50mm)",
        };
      case "Ringan":
        return {
          bg: "bg-emerald-100 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-300 border-emerald-300 dark:border-emerald-800",
          text: "Hujan Ringan (0.5–20mm)",
        };
      default:
        return {
          bg: "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border-slate-200 dark:border-slate-700",
          text: "Nihil / Berawan",
        };
    }
  };

  const rainBadge = getRainBadge(extremes.rainfall.bmkgCategory);

  return (
    <div className="space-y-4">
      {/* Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 p-3 bg-gradient-to-r from-red-500/10 via-amber-500/10 to-indigo-500/10 dark:from-red-950/30 dark:via-amber-950/30 dark:to-indigo-950/30 rounded-xl border border-red-200/50 dark:border-red-900/40">
        <div className="flex items-center gap-2.5">
          <div className="p-2 rounded-lg bg-red-500 text-white shadow-sm">
            <Flame className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
              Analisis Nilai-Nilai Ekstrem Klimatologi
              <Badge variant="outline" className="text-[10px] font-semibold bg-white dark:bg-slate-900 text-red-600 dark:text-red-400 border-red-200 dark:border-red-800">
                Stasiun & ERA5
              </Badge>
            </h3>
            <p className="text-[11px] text-slate-500 dark:text-slate-400">
              Deteksi rekor puncak dan ambang batas cuaca ekstrem (WMO/BMKG) skala Dasarian, Bulanan, dan Tahunan.
            </p>
          </div>
        </div>

        {stats && (
          <button
            type="button"
            onClick={() => setShowAverages(!showAverages)}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800 transition shadow-xs self-start sm:self-auto"
          >
            <Activity className="w-3.5 h-3.5 text-indigo-500" />
            <span>{showAverages ? "Sembunyikan Rerata" : "Tampilkan Rerata"}</span>
            {showAverages ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
          </button>
        )}
      </div>

      {/* 6 Extreme Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-3.5">
        {/* 1. Rekor Suhu Maksimum (Tmax) */}
        <Card className="hover:shadow-md transition-all duration-200 border-red-200/80 dark:border-red-950 bg-gradient-to-br from-red-50/70 to-orange-50/40 dark:from-red-950/20 dark:to-orange-950/10">
          <CardContent className="p-3.5 flex flex-col justify-between h-[155px]">
            <div className="flex justify-between items-start">
              <span className="text-[11px] font-bold uppercase tracking-wider text-red-700 dark:text-red-400">
                Suhu Maks (Tmax)
              </span>
              <ThermometerSun className="h-4 w-4 text-red-500 animate-pulse" />
            </div>

            <div>
              <div className="flex items-baseline gap-1">
                <span className="text-2xl font-black text-slate-900 dark:text-slate-50">
                  {extremes.temperature.maxObserved
                    ? extremes.temperature.maxObserved.value.toFixed(2)
                    : extremes.temperature.maxEra5
                    ? extremes.temperature.maxEra5.value.toFixed(2)
                    : "–"}
                </span>
                <span className="text-xs font-bold text-slate-500">°C</span>
              </div>
              <div className="text-[10px] text-slate-600 dark:text-slate-400 font-medium truncate mt-0.5">
                {extremes.temperature.maxObserved?.dateStr || "Rekor ERA5"}
              </div>
            </div>

            <div className="pt-1.5 border-t border-red-200/50 dark:border-red-900/30 flex flex-col gap-0.5">
              {extremes.temperature.extremeHotDaysCount > 0 ? (
                <Badge variant="outline" className="text-[9px] px-1 py-0 bg-red-100 dark:bg-red-950/50 text-red-700 dark:text-red-300 border-red-300 justify-center">
                  ⚠️ {extremes.temperature.extremeHotDaysCount} Hari Sangat Panas (≥35°C)
                </Badge>
              ) : extremes.temperature.hotDaysCount > 0 ? (
                <Badge variant="outline" className="text-[9px] px-1 py-0 bg-amber-100 dark:bg-amber-950/50 text-amber-700 dark:text-amber-300 border-amber-300 justify-center">
                  {extremes.temperature.hotDaysCount} Hari Panas (≥33°C)
                </Badge>
              ) : (
                <span className="text-[10px] text-slate-500 dark:text-slate-400">
                  ERA5 Maks: {extremes.temperature.maxEra5 ? `${extremes.temperature.maxEra5.value.toFixed(2)}°C` : "–"}
                </span>
              )}
            </div>
          </CardContent>
        </Card>

        {/* 2. Rekor Suhu Minimum (Tmin) */}
        <Card className="hover:shadow-md transition-all duration-200 border-blue-200/80 dark:border-blue-950 bg-gradient-to-br from-blue-50/70 to-cyan-50/40 dark:from-blue-950/20 dark:to-cyan-950/10">
          <CardContent className="p-3.5 flex flex-col justify-between h-[155px]">
            <div className="flex justify-between items-start">
              <span className="text-[11px] font-bold uppercase tracking-wider text-blue-700 dark:text-blue-400">
                Suhu Min (Tmin)
              </span>
              <ThermometerSnowflake className="h-4 w-4 text-blue-500" />
            </div>

            <div>
              <div className="flex items-baseline gap-1">
                <span className="text-2xl font-black text-slate-900 dark:text-slate-50">
                  {extremes.temperature.minObserved
                    ? extremes.temperature.minObserved.value.toFixed(2)
                    : extremes.temperature.minEra5
                    ? extremes.temperature.minEra5.value.toFixed(2)
                    : "–"}
                </span>
                <span className="text-xs font-bold text-slate-500">°C</span>
              </div>
              <div className="text-[10px] text-slate-600 dark:text-slate-400 font-medium truncate mt-0.5">
                {extremes.temperature.minObserved?.dateStr || "Rekor ERA5"}
              </div>
            </div>

            <div className="pt-1.5 border-t border-blue-200/50 dark:border-blue-900/30 flex flex-col gap-0.5">
              {extremes.temperature.coldDaysCount > 0 ? (
                <Badge variant="outline" className="text-[9px] px-1 py-0 bg-blue-100 dark:bg-blue-950/50 text-blue-700 dark:text-blue-300 border-blue-300 justify-center">
                  ❄️ {extremes.temperature.coldDaysCount} Malam Dingin (≤20°C)
                </Badge>
              ) : (
                <span className="text-[10px] text-slate-500 dark:text-slate-400">
                  DTR Maks: {extremes.temperature.maxDiurnalRange ? `±${extremes.temperature.maxDiurnalRange.value.toFixed(2)}°C` : "–"}
                </span>
              )}
            </div>
          </CardContent>
        </Card>

        {/* 3. Curah Hujan Harian Tertinggi (Rx1day) */}
        <Card className="hover:shadow-md transition-all duration-200 border-indigo-200/80 dark:border-indigo-950 bg-gradient-to-br from-indigo-50/70 to-sky-50/40 dark:from-indigo-950/20 dark:to-sky-950/10">
          <CardContent className="p-3.5 flex flex-col justify-between h-[155px]">
            <div className="flex justify-between items-start">
              <span className="text-[11px] font-bold uppercase tracking-wider text-indigo-700 dark:text-indigo-400">
                Hujan Harian Maks (Rx1day)
              </span>
              <CloudRain className="h-4 w-4 text-indigo-500" />
            </div>

            <div>
              <div className="flex items-baseline gap-1">
                <span className="text-2xl font-black text-slate-900 dark:text-slate-50">
                  {extremes.rainfall.maxDailyRain
                    ? extremes.rainfall.maxDailyRain.value.toFixed(2)
                    : extremes.rainfall.maxEra5Daily
                    ? extremes.rainfall.maxEra5Daily.value.toFixed(2)
                    : "0.00"}
                </span>
                <span className="text-xs font-bold text-slate-500">mm</span>
              </div>
              <div className="text-[10px] text-slate-600 dark:text-slate-400 font-medium truncate mt-0.5">
                {extremes.rainfall.maxDailyRain?.dateStr || "Rekor ERA5"}
              </div>
            </div>

            <div className="pt-1.5 border-t border-indigo-200/50 dark:border-indigo-900/30 flex flex-col gap-0.5">
              <Badge variant="outline" className={`text-[9px] px-1 py-0 justify-center truncate ${rainBadge.bg}`}>
                {rainBadge.text}
              </Badge>
            </div>
          </CardContent>
        </Card>

        {/* 4. Hembusan Angin Puncak (Gust ERA5) */}
        <Card className="hover:shadow-md transition-all duration-200 border-violet-200/80 dark:border-violet-950 bg-gradient-to-br from-violet-50/70 to-purple-50/40 dark:from-violet-950/20 dark:to-purple-950/10">
          <CardContent className="p-3.5 flex flex-col justify-between h-[155px]">
            <div className="flex justify-between items-start">
              <span className="text-[11px] font-bold uppercase tracking-wider text-violet-700 dark:text-violet-400">
                Puncak Hembusan (Gust ERA5)
              </span>
              <Wind className="h-4 w-4 text-violet-500" />
            </div>

            <div>
              <div className="flex items-baseline gap-1">
                <span className="text-2xl font-black text-slate-900 dark:text-slate-50">
                  {extremes.wind.maxGustEra5
                    ? extremes.wind.maxGustEra5.value.toFixed(2)
                    : extremes.wind.maxSpeedEra5
                    ? extremes.wind.maxSpeedEra5.value.toFixed(2)
                    : "–"}
                </span>
                <span className="text-xs font-bold text-slate-500">m/s</span>
              </div>
              <div className="text-[10px] text-slate-600 dark:text-slate-400 font-medium truncate mt-0.5">
                {extremes.wind.maxGustEra5
                  ? `${extremes.wind.maxGustEra5.kmh.toFixed(1)} km/h • ${extremes.wind.maxGustEra5.dateStr}`
                  : extremes.wind.maxSpeedEra5
                  ? `${extremes.wind.maxSpeedEra5.kmh.toFixed(1)} km/h`
                  : "Data ERA5"}
              </div>
            </div>

            <div className="pt-1.5 border-t border-violet-200/50 dark:border-violet-900/30 flex flex-col gap-0.5">
              {extremes.wind.isHighWindWarning ? (
                <Badge variant="outline" className="text-[9px] px-1 py-0 bg-amber-100 dark:bg-amber-950/50 text-amber-700 dark:text-amber-300 border-amber-300 justify-center">
                  ⚠️ Peringatan Angin Kencang (≥25 kts)
                </Badge>
              ) : (
                <span className="text-[10px] text-slate-500 dark:text-slate-400">
                  Angin Maks: {extremes.wind.maxSpeedEra5 ? `${extremes.wind.maxSpeedEra5.value.toFixed(2)} m/s` : "–"}
                </span>
              )}
            </div>
          </CardContent>
        </Card>

        {/* 5. Tekanan Udara Terendah (Pmin) */}
        <Card className="hover:shadow-md transition-all duration-200 border-pink-200/80 dark:border-pink-950 bg-gradient-to-br from-pink-50/70 to-rose-50/40 dark:from-pink-950/20 dark:to-rose-950/10">
          <CardContent className="p-3.5 flex flex-col justify-between h-[155px]">
            <div className="flex justify-between items-start">
              <span className="text-[11px] font-bold uppercase tracking-wider text-pink-700 dark:text-pink-400">
                Tekanan Min (Pmin)
              </span>
              <Gauge className="h-4 w-4 text-pink-500" />
            </div>

            <div>
              <div className="flex items-baseline gap-1">
                <span className="text-2xl font-black text-slate-900 dark:text-slate-50">
                  {extremes.pressure.minObserved
                    ? extremes.pressure.minObserved.value.toFixed(2)
                    : extremes.pressure.minEra5
                    ? extremes.pressure.minEra5.value.toFixed(2)
                    : "–"}
                </span>
                <span className="text-xs font-bold text-slate-500">hPa</span>
              </div>
              <div className="text-[10px] text-slate-600 dark:text-slate-400 font-medium truncate mt-0.5">
                {extremes.pressure.minObserved?.dateStr || "Rekor ERA5"}
              </div>
            </div>

            <div className="pt-1.5 border-t border-pink-200/50 dark:border-pink-900/30 flex flex-col gap-0.5">
              {extremes.pressure.isLowPressureTrough ? (
                <Badge variant="outline" className="text-[9px] px-1 py-0 bg-rose-100 dark:bg-rose-950/50 text-rose-700 dark:text-rose-300 border-rose-300 justify-center">
                  ⚠️ Palung Tekanan Rendah (&lt;1008 hPa)
                </Badge>
              ) : (
                <span className="text-[10px] text-slate-500 dark:text-slate-400">
                  P. Maks: {extremes.pressure.maxObserved ? `${extremes.pressure.maxObserved.value.toFixed(2)} hPa` : "–"}
                </span>
              )}
            </div>
          </CardContent>
        </Card>

        {/* 6. Kelembaban Relatif Terendah (RHmin) */}
        <Card className="hover:shadow-md transition-all duration-200 border-emerald-200/80 dark:border-emerald-950 bg-gradient-to-br from-emerald-50/70 to-teal-50/40 dark:from-emerald-950/20 dark:to-teal-950/10">
          <CardContent className="p-3.5 flex flex-col justify-between h-[155px]">
            <div className="flex justify-between items-start">
              <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-700 dark:text-emerald-400">
                Kelembaban Min (RHmin)
              </span>
              <Droplets className="h-4 w-4 text-emerald-500" />
            </div>

            <div>
              <div className="flex items-baseline gap-1">
                <span className="text-2xl font-black text-slate-900 dark:text-slate-50">
                  {extremes.humidity.minObserved
                    ? extremes.humidity.minObserved.value.toFixed(2)
                    : extremes.humidity.minEra5
                    ? extremes.humidity.minEra5.value.toFixed(2)
                    : "–"}
                </span>
                <span className="text-xs font-bold text-slate-500">%</span>
              </div>
              <div className="text-[10px] text-slate-600 dark:text-slate-400 font-medium truncate mt-0.5">
                {extremes.humidity.minObserved?.dateStr || "Rekor ERA5"}
              </div>
            </div>

            <div className="pt-1.5 border-t border-emerald-200/50 dark:border-emerald-900/30 flex flex-col gap-0.5">
              {extremes.humidity.isSevereDryAir ? (
                <Badge variant="outline" className="text-[9px] px-1 py-0 bg-amber-100 dark:bg-amber-950/50 text-amber-700 dark:text-amber-300 border-amber-300 justify-center">
                  ⚠️ Udara Kering Ekstrem (&lt;45%)
                </Badge>
              ) : (
                <span className="text-[10px] text-slate-500 dark:text-slate-400">
                  RH Maks: {extremes.humidity.maxObserved ? `${extremes.humidity.maxObserved.value.toFixed(2)}%` : "–"}
                </span>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Optional Collapsible Climatological Averages Sub-Panel */}
      {showAverages && stats && (
        <div className="p-4 bg-slate-50 dark:bg-slate-900/60 rounded-xl border border-slate-200/80 dark:border-slate-800 transition duration-300 animate-in fade-in">
          <div className="flex items-center gap-2 mb-3">
            <Layers className="w-4 h-4 text-indigo-500" />
            <h4 className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
              Rerata Klimatologis Periode (Observasi Stasiun)
            </h4>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 text-xs">
            <div className="p-2.5 bg-white dark:bg-slate-900 rounded-lg border border-slate-200/60 dark:border-slate-800">
              <span className="text-slate-500 dark:text-slate-400">Suhu Rerata</span>
              <div className="text-base font-extrabold text-slate-900 dark:text-slate-100 mt-0.5">
                {stats.temperature.mean.toFixed(2)} °C
              </div>
              <span className="text-[10px] text-slate-400">±{stats.temperature.stdDev.toFixed(2)}°C std</span>
            </div>
            <div className="p-2.5 bg-white dark:bg-slate-900 rounded-lg border border-slate-200/60 dark:border-slate-800">
              <span className="text-slate-500 dark:text-slate-400">Kelembaban Rerata</span>
              <div className="text-base font-extrabold text-slate-900 dark:text-slate-100 mt-0.5">
                {stats.humidity.mean.toFixed(2)} %
              </div>
              <span className="text-[10px] text-slate-400">±{stats.humidity.stdDev.toFixed(2)}% std</span>
            </div>
            <div className="p-2.5 bg-white dark:bg-slate-900 rounded-lg border border-slate-200/60 dark:border-slate-800">
              <span className="text-slate-500 dark:text-slate-400">Tekanan Rerata</span>
              <div className="text-base font-extrabold text-slate-900 dark:text-slate-100 mt-0.5">
                {stats.pressure.mean.toFixed(2)} hPa
              </div>
              <span className="text-[10px] text-slate-400">±{stats.pressure.stdDev.toFixed(2)} hPa std</span>
            </div>
            <div className="p-2.5 bg-white dark:bg-slate-900 rounded-lg border border-slate-200/60 dark:border-slate-800">
              <span className="text-slate-500 dark:text-slate-400">Total Akumulasi Hujan</span>
              <div className="text-base font-extrabold text-slate-900 dark:text-slate-100 mt-0.5">
                {stats.rainfall.total.toFixed(2)} mm
              </div>
              <span className="text-[10px] text-slate-400">{stats.rainfall.rainDaysCount} hari hujan</span>
            </div>
            <div className="p-2.5 bg-white dark:bg-slate-900 rounded-lg border border-slate-200/60 dark:border-slate-800">
              <span className="text-slate-500 dark:text-slate-400">CDD (Hari Kering Berurutan)</span>
              <div className="text-base font-extrabold text-slate-900 dark:text-slate-100 mt-0.5">
                {extremes.rainfall.consecutiveDryDays} Hari
              </div>
              <span className="text-[10px] text-slate-400">CWD: {extremes.rainfall.consecutiveWetDays} hari basah</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
