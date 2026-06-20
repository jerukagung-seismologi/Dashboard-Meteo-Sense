// components/climatology/SummaryCards.tsx
import React from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Thermometer, CloudRain, Droplets, Gauge } from "lucide-react";
import { ClimatologyStats } from "@/lib/climatology/climatologyTypes";

interface SummaryCardsProps {
  stats: ClimatologyStats;
}

export const SummaryCards: React.FC<SummaryCardsProps> = ({ stats }) => {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-7 gap-4">
      {/* 1. Average Temperature */}
      <Card className="hover:shadow-md transition-all duration-200 border-none bg-gradient-to-br from-orange-50 to-amber-50/50 dark:from-orange-950/20 dark:to-amber-950/10">
        <CardContent className="p-4 flex flex-col justify-between h-[110px]">
          <div className="flex justify-between items-start">
            <span className="text-xs font-bold uppercase tracking-wider text-orange-600 dark:text-orange-400">Temperatur Rata-Rata</span>
            <Thermometer className="h-4 h-4 text-orange-500" />
          </div>
          <div className="mt-2">
            <span className="text-2xl font-extrabold text-slate-900 dark:text-slate-50">
              {stats.temperature.mean.toFixed(1)}<span className="text-sm font-semibold">°C</span>
            </span>
          </div>
          <div className="text-[10px] text-slate-500 dark:text-slate-400">
            Deviasi: ±{stats.temperature.stdDev.toFixed(1)}°C
          </div>
        </CardContent>
      </Card>

      {/* 2. Maximum Temperature */}
      <Card className="hover:shadow-md transition-all duration-200 border-none bg-gradient-to-br from-red-50 to-orange-50/50 dark:from-red-950/20 dark:to-orange-950/10">
        <CardContent className="p-4 flex flex-col justify-between h-[110px]">
          <div className="flex justify-between items-start">
            <span className="text-xs font-bold uppercase tracking-wider text-red-600 dark:text-red-400">Temperatur Maksimum</span>
            <Thermometer className="h-4 h-4 text-red-500 animate-pulse" />
          </div>
          <div className="mt-2">
            <span className="text-2xl font-extrabold text-slate-900 dark:text-slate-50">
              {stats.temperature.max.toFixed(1)}<span className="text-sm font-semibold">°C</span>
            </span>
          </div>
          <div className="text-[10px] text-slate-500 dark:text-slate-400">
            Suhu Terpanas Stasiun
          </div>
        </CardContent>
      </Card>

      {/* 3. Minimum Temperature */}
      <Card className="hover:shadow-md transition-all duration-200 border-none bg-gradient-to-br from-blue-50 to-cyan-50/50 dark:from-blue-950/20 dark:to-cyan-950/10">
        <CardContent className="p-4 flex flex-col justify-between h-[110px]">
          <div className="flex justify-between items-start">
            <span className="text-xs font-bold uppercase tracking-wider text-blue-600 dark:text-blue-400">Temperatur Minimum</span>
            <Thermometer className="h-4 h-4 text-blue-500" />
          </div>
          <div className="mt-2">
            <span className="text-2xl font-extrabold text-slate-900 dark:text-slate-50">
              {stats.temperature.min.toFixed(1)}<span className="text-sm font-semibold">°C</span>
            </span>
          </div>
          <div className="text-[10px] text-slate-500 dark:text-slate-400">
            Suhu Terdingin Stasiun
          </div>
        </CardContent>
      </Card>

      {/* 4. Total Rainfall */}
      <Card className="hover:shadow-md transition-all duration-200 border-none bg-gradient-to-br from-indigo-50 to-blue-50/50 dark:from-indigo-950/20 dark:to-blue-950/10">
        <CardContent className="p-4 flex flex-col justify-between h-[110px]">
          <div className="flex justify-between items-start">
            <span className="text-xs font-bold uppercase tracking-wider text-indigo-600 dark:text-indigo-400">Total Hujan</span>
            <CloudRain className="h-4 h-4 text-indigo-500" />
          </div>
          <div className="mt-2">
            <span className="text-2xl font-extrabold text-slate-900 dark:text-slate-50">
              {stats.rainfall.total.toFixed(1)}<span className="text-sm font-semibold">mm</span>
            </span>
          </div>
          <div className="text-[10px] text-slate-500 dark:text-slate-400">
            Maks Harian: {stats.rainfall.maxDailyRainfall.toFixed(1)} mm
          </div>
        </CardContent>
      </Card>

      {/* 5. Rainy Days Count */}
      <Card className="hover:shadow-md transition-all duration-200 border-none bg-gradient-to-br from-violet-50 to-indigo-50/50 dark:from-violet-950/20 dark:to-indigo-950/10">
        <CardContent className="p-4 flex flex-col justify-between h-[110px]">
          <div className="flex justify-between items-start">
            <span className="text-xs font-bold uppercase tracking-wider text-violet-600 dark:text-violet-400">Hari Hujan</span>
            <CloudRain className="h-4 h-4 text-violet-500" />
          </div>
          <div className="mt-2">
            <span className="text-2xl font-extrabold text-slate-900 dark:text-slate-50">
              {stats.rainfall.rainDaysCount}<span className="text-sm font-semibold"> hari</span>
            </span>
          </div>
          <div className="text-[10px] text-slate-500 dark:text-slate-400">
            Ambang batas: &gt;0.2 mm
          </div>
        </CardContent>
      </Card>

      {/* 6. Average Humidity */}
      <Card className="hover:shadow-md transition-all duration-200 border-none bg-gradient-to-br from-emerald-50 to-teal-50/50 dark:from-emerald-950/20 dark:to-teal-950/10">
        <CardContent className="p-4 flex flex-col justify-between h-[110px]">
          <div className="flex justify-between items-start">
            <span className="text-xs font-bold uppercase tracking-wider text-emerald-600 dark:text-emerald-400">Kelembapan Rerata</span>
            <Droplets className="h-4 h-4 text-emerald-500" />
          </div>
          <div className="mt-2">
            <span className="text-2xl font-extrabold text-slate-900 dark:text-slate-50">
              {stats.humidity.mean.toFixed(1)}<span className="text-sm font-semibold">%</span>
            </span>
          </div>
          <div className="text-[10px] text-slate-500 dark:text-slate-400">
            Min: {stats.humidity.min.toFixed(0)}% | Max: {stats.humidity.max.toFixed(0)}%
          </div>
        </CardContent>
      </Card>

      {/* 7. Average Pressure */}
      <Card className="hover:shadow-md transition-all duration-200 border-none bg-gradient-to-br from-pink-50 to-rose-50/50 dark:from-pink-950/20 dark:to-rose-950/10">
        <CardContent className="p-4 flex flex-col justify-between h-[110px]">
          <div className="flex justify-between items-start">
            <span className="text-xs font-bold uppercase tracking-wider text-pink-600 dark:text-pink-400">Tekanan Rerata</span>
            <Gauge className="h-4 h-4 text-pink-500" />
          </div>
          <div className="mt-2">
            <span className="text-2xl font-extrabold text-slate-900 dark:text-slate-50">
              {stats.pressure.mean.toFixed(0)}<span className="text-sm font-semibold">hPa</span>
            </span>
          </div>
          <div className="text-[10px] text-slate-500 dark:text-slate-400">
            Min: {stats.pressure.min.toFixed(0)} | Max: {stats.pressure.max.toFixed(0)}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
