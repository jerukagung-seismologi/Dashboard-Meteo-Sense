// components/climatology/SummaryCardsAnalysis.tsx
import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Thermometer, Droplets, Gauge } from "lucide-react";
import { AnalysisStats } from "@/lib/climatology/analysisTypes";

interface SummaryCardsAnalysisProps {
  stats: AnalysisStats;
  scopeLabel: string; // e.g. "Harian" or "Mingguan"
}

export const SummaryCardsAnalysis: React.FC<SummaryCardsAnalysisProps> = ({
  stats,
  scopeLabel,
}) => {
  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
      {/* 1. Temperature Card */}
      <Card className="border-none shadow-sm bg-gradient-to-br from-orange-50/70 to-amber-50/30 dark:from-orange-950/20 dark:to-amber-950/10">
        <CardHeader className="pb-2 flex flex-row items-center justify-between">
          <CardTitle className="text-sm font-bold uppercase tracking-wider text-orange-600 dark:text-orange-400 flex items-center gap-2">
            <Thermometer className="h-5 w-5 text-orange-500" /> Suhu Udara ({scopeLabel})
          </CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-2 gap-4">
          <div className="flex flex-col">
            <span className="text-[10px] text-slate-500 uppercase tracking-wider font-semibold">Rata-rata</span>
            <span className="text-xl font-extrabold text-slate-800 dark:text-slate-100">
              {stats.temperature.mean.toFixed(1)}°C
            </span>
          </div>
          <div className="flex flex-col">
            <span className="text-[10px] text-slate-500 uppercase tracking-wider font-semibold">Deviasi</span>
            <span className="text-xl font-extrabold text-slate-800 dark:text-slate-100">
              ±{stats.temperature.stdDev.toFixed(1)}°C
            </span>
          </div>
          <div className="flex flex-col">
            <span className="text-[10px] text-slate-500 uppercase tracking-wider font-semibold">Maksimum</span>
            <span className="text-lg font-bold text-red-600 dark:text-red-400">
              {stats.temperature.max.toFixed(1)}°C
            </span>
          </div>
          <div className="flex flex-col">
            <span className="text-[10px] text-slate-500 uppercase tracking-wider font-semibold">Minimum</span>
            <span className="text-lg font-bold text-blue-600 dark:text-blue-400">
              {stats.temperature.min.toFixed(1)}°C
            </span>
          </div>
        </CardContent>
      </Card>

      {/* 2. Humidity Card */}
      <Card className="border-none shadow-sm bg-gradient-to-br from-blue-50/70 to-cyan-50/30 dark:from-blue-950/20 dark:to-cyan-950/10">
        <CardHeader className="pb-2 flex flex-row items-center justify-between">
          <CardTitle className="text-sm font-bold uppercase tracking-wider text-blue-600 dark:text-blue-400 flex items-center gap-2">
            <Droplets className="h-5 w-5 text-blue-500" /> Kelembaban Relatif ({scopeLabel})
          </CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-2 gap-4">
          <div className="flex flex-col">
            <span className="text-[10px] text-slate-500 uppercase tracking-wider font-semibold">Rata-rata</span>
            <span className="text-xl font-extrabold text-slate-800 dark:text-slate-100">
              {stats.humidity.mean.toFixed(1)}%
            </span>
          </div>
          <div className="flex flex-col">
            <span className="text-[10px] text-slate-500 uppercase tracking-wider font-semibold">Deviasi</span>
            <span className="text-xl font-extrabold text-slate-800 dark:text-slate-100">
              ±{stats.humidity.stdDev.toFixed(1)}%
            </span>
          </div>
          <div className="flex flex-col">
            <span className="text-[10px] text-slate-500 uppercase tracking-wider font-semibold">Maksimum</span>
            <span className="text-lg font-bold text-teal-600 dark:text-teal-400">
              {stats.humidity.max.toFixed(1)}%
            </span>
          </div>
          <div className="flex flex-col">
            <span className="text-[10px] text-slate-500 uppercase tracking-wider font-semibold">Minimum</span>
            <span className="text-lg font-bold text-amber-600 dark:text-amber-400">
              {stats.humidity.min.toFixed(1)}%
            </span>
          </div>
        </CardContent>
      </Card>

      {/* 3. Pressure Card */}
      <Card className="border-none shadow-sm bg-gradient-to-br from-pink-50/70 to-rose-50/30 dark:from-pink-950/20 dark:to-rose-950/10">
        <CardHeader className="pb-2 flex flex-row items-center justify-between">
          <CardTitle className="text-sm font-bold uppercase tracking-wider text-pink-600 dark:text-pink-400 flex items-center gap-2">
            <Gauge className="h-5 w-5 text-pink-500" /> Tekanan Udara ({scopeLabel})
          </CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-2 gap-4">
          <div className="flex flex-col">
            <span className="text-[10px] text-slate-500 uppercase tracking-wider font-semibold">Rata-rata</span>
            <span className="text-xl font-extrabold text-slate-800 dark:text-slate-100">
              {stats.pressure.mean.toFixed(0)} hPa
            </span>
          </div>
          <div className="flex flex-col">
            <span className="text-[10px] text-slate-500 uppercase tracking-wider font-semibold">Deviasi</span>
            <span className="text-xl font-extrabold text-slate-800 dark:text-slate-100">
              ±{stats.pressure.stdDev.toFixed(1)} hPa
            </span>
          </div>
          <div className="flex flex-col">
            <span className="text-[10px] text-slate-500 uppercase tracking-wider font-semibold">Maksimum</span>
            <span className="text-lg font-bold text-rose-600 dark:text-rose-400">
              {stats.pressure.max.toFixed(0)} hPa
            </span>
          </div>
          <div className="flex flex-col">
            <span className="text-[10px] text-slate-500 uppercase tracking-wider font-semibold">Minimum</span>
            <span className="text-lg font-bold text-indigo-600 dark:text-indigo-400">
              {stats.pressure.min.toFixed(0)} hPa
            </span>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
