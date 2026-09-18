// components/climatology/EtccdiExtremesSection.tsx
"use client";

import React, { useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Zap, CloudRain, Thermometer, ShieldAlert, Calendar, Droplets, Sun, Flame } from "lucide-react";
import { calculateEtccdiIndices, EtccdiDailyRecord } from "@/lib/climatology/etccdiIndices";
import type { AggregatedPoint } from "@/lib/climatology/climatologyTypes";

interface EtccdiExtremesSectionProps {
  points?: AggregatedPoint[];
  stationName?: string;
  isDarkMode?: boolean;
}

export function EtccdiExtremesSection({
  points,
  stationName = "Stasiun",
  isDarkMode = false,
}: EtccdiExtremesSectionProps) {
  const records: EtccdiDailyRecord[] = useMemo(() => {
    if (!points || points.length === 0) return [];
    return points.map((p) => ({
      dateStr: p.timeKey || new Date(p.timestamp).toISOString().substring(0, 10),
      tMax: p.temperatureMax,
      tMin: p.temperatureMin,
      tMean: p.temperatureMean,
      precipitation: p.rainfallAccumulation || 0,
    }));
  }, [points]);

  const indices = useMemo(() => {
    return calculateEtccdiIndices(records);
  }, [records]);

  return (
    <Card className="border-none shadow-sm dark:bg-slate-900 bg-white overflow-hidden">
      <CardHeader className="pb-3 border-b dark:border-slate-800 bg-gradient-to-r from-red-50/50 via-slate-50 to-amber-50/50 dark:from-slate-900 dark:to-slate-900/50">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="space-y-1">
            <div className="flex items-center gap-2 flex-wrap">
              <Badge variant="outline" className="bg-red-100 text-red-900 dark:bg-red-950 dark:text-red-200 border-red-300 text-[10px] font-bold">
                WMO CCl/CLIVAR/JCOMM ETCCDI
              </Badge>
              <Badge variant="outline" className="bg-slate-100 text-slate-800 dark:bg-slate-800 dark:text-slate-300 text-[10px]">
                Indeks Deteksi Perubahan Iklim &amp; Ekstremitas
              </Badge>
            </div>
            <CardTitle className="text-base sm:text-lg font-extrabold tracking-tight flex items-center gap-2 text-slate-900 dark:text-slate-100">
              <Zap className="h-5 w-5 text-amber-500" />
              Indeks Iklim Ekstrem Inti ETCCDI ({stationName})
            </CardTitle>
            <CardDescription className="text-xs text-slate-500 dark:text-slate-400">
              Evaluasi parameter presipitasi dan suhu ekstrem berbasis kaidah standar internasional WMO.
            </CardDescription>
          </div>
          <div className="text-xs text-slate-400">
            Total Sampel: <strong>{indices.totalDays} Hari</strong>
          </div>
        </div>
      </CardHeader>

      <CardContent className="p-4 space-y-6">
        {/* Presipitasi Ekstrem */}
        <div className="space-y-3">
          <span className="text-xs font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
            <CloudRain className="h-4 w-4 text-blue-500" /> Presipitasi &amp; Curah Hujan Ekstrem (WMO ETCCDI)
          </span>

          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
            {/* RX1day */}
            <div className="p-3 bg-blue-50/60 dark:bg-blue-950/30 rounded-xl border border-blue-200 dark:border-blue-900/40 space-y-1">
              <span className="text-[10px] font-bold text-blue-700 dark:text-blue-300 block">RX1day (Maks 1 Hari)</span>
              <div className="text-xl font-black font-mono text-blue-900 dark:text-blue-100">
                {indices.rx1day.value} <span className="text-[10px] font-normal">mm</span>
              </div>
              <span className="text-[9px] text-slate-400 block truncate">{indices.rx1day.dateStr}</span>
            </div>

            {/* RX5day */}
            <div className="p-3 bg-blue-50/60 dark:bg-blue-950/30 rounded-xl border border-blue-200 dark:border-blue-900/40 space-y-1">
              <span className="text-[10px] font-bold text-blue-700 dark:text-blue-300 block">RX5day (Maks 5 Hari)</span>
              <div className="text-xl font-black font-mono text-blue-900 dark:text-blue-100">
                {indices.rx5day.value} <span className="text-[10px] font-normal">mm</span>
              </div>
              <span className="text-[9px] text-slate-400 block truncate">{indices.rx5day.dateStr}</span>
            </div>

            {/* SDII */}
            <div className="p-3 bg-cyan-50/60 dark:bg-cyan-950/30 rounded-xl border border-cyan-200 dark:border-cyan-900/40 space-y-1">
              <span className="text-[10px] font-bold text-cyan-700 dark:text-cyan-300 block">SDII (Intensitas Harian)</span>
              <div className="text-xl font-black font-mono text-cyan-900 dark:text-cyan-100">
                {indices.sdii} <span className="text-[10px] font-normal">mm/hari</span>
              </div>
              <span className="text-[9px] text-slate-400 block">{indices.wetDaysCount} Hari Basah</span>
            </div>

            {/* R10mm & R20mm */}
            <div className="p-3 bg-slate-50 dark:bg-slate-800/60 rounded-xl border border-slate-200 dark:border-slate-700 space-y-1">
              <span className="text-[10px] font-bold text-slate-600 dark:text-slate-300 block">R10mm / R20mm</span>
              <div className="text-xl font-black font-mono text-slate-900 dark:text-slate-100">
                {indices.r10mm} / {indices.r20mm} <span className="text-[10px] font-normal">hari</span>
              </div>
              <span className="text-[9px] text-slate-400 block">Hujan Lebat</span>
            </div>

            {/* R50mm */}
            <div className="p-3 bg-amber-50/60 dark:bg-amber-950/30 rounded-xl border border-amber-200 dark:border-amber-900/40 space-y-1">
              <span className="text-[10px] font-bold text-amber-700 dark:text-amber-300 block">R50mm (Sangat Lebat)</span>
              <div className="text-xl font-black font-mono text-amber-900 dark:text-amber-100">
                {indices.r50mm} <span className="text-[10px] font-normal">hari</span>
              </div>
              <span className="text-[9px] text-slate-400 block">Ambang BMKG ≥50mm</span>
            </div>

            {/* R95p */}
            <div className="p-3 bg-purple-50/60 dark:bg-purple-950/30 rounded-xl border border-purple-200 dark:border-purple-900/40 space-y-1">
              <span className="text-[10px] font-bold text-purple-700 dark:text-purple-300 block">R95p (Sangat Basah)</span>
              <div className="text-xl font-black font-mono text-purple-900 dark:text-purple-100">
                {indices.r95p.sumRain} <span className="text-[10px] font-normal">mm</span>
              </div>
              <span className="text-[9px] text-slate-400 block">{indices.r95p.count} hari &gt; P95 ({indices.r95p.threshold}mm)</span>
            </div>
          </div>
        </div>

        {/* Durasi Kekeringan & Kebasahan (CDD & CWD) dan Suhu Ekstrem */}
        <div className="space-y-3">
          <span className="text-xs font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
            <Thermometer className="h-4 w-4 text-red-500" /> Durasi Rentang Suhu &amp; CDD/CWD
          </span>

          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
            {/* CDD */}
            <div className="p-3 bg-amber-50/60 dark:bg-amber-950/30 rounded-xl border border-amber-200 dark:border-amber-900/40 space-y-1">
              <span className="text-[10px] font-bold text-amber-700 dark:text-amber-300 block">CDD (Hari Kering Max)</span>
              <div className="text-xl font-black font-mono text-amber-900 dark:text-amber-100">
                {indices.cdd} <span className="text-[10px] font-normal">hari</span>
              </div>
              <span className="text-[9px] text-slate-400 block">Hari berturut-turut &lt; 1mm</span>
            </div>

            {/* CWD */}
            <div className="p-3 bg-teal-50/60 dark:bg-teal-950/30 rounded-xl border border-teal-200 dark:border-teal-900/40 space-y-1">
              <span className="text-[10px] font-bold text-teal-700 dark:text-teal-300 block">CWD (Hari Basah Max)</span>
              <div className="text-xl font-black font-mono text-teal-900 dark:text-teal-100">
                {indices.cwd} <span className="text-[10px] font-normal">hari</span>
              </div>
              <span className="text-[9px] text-slate-400 block">Hari berturut-turut ≥ 1mm</span>
            </div>

            {/* TXx */}
            <div className="p-3 bg-red-50/60 dark:bg-red-950/30 rounded-xl border border-red-200 dark:border-red-900/40 space-y-1">
              <span className="text-[10px] font-bold text-red-700 dark:text-red-300 block">TXx (Suhu Max Tertinggi)</span>
              <div className="text-xl font-black font-mono text-red-900 dark:text-red-100">
                {indices.txx.value}°C
              </div>
              <span className="text-[9px] text-slate-400 block truncate">{indices.txx.dateStr}</span>
            </div>

            {/* TNn */}
            <div className="p-3 bg-sky-50/60 dark:bg-sky-950/30 rounded-xl border border-sky-200 dark:border-sky-900/40 space-y-1">
              <span className="text-[10px] font-bold text-sky-700 dark:text-sky-300 block">TNn (Suhu Min Terendah)</span>
              <div className="text-xl font-black font-mono text-sky-900 dark:text-sky-100">
                {indices.tnn.value}°C
              </div>
              <span className="text-[9px] text-slate-400 block truncate">{indices.tnn.dateStr}</span>
            </div>

            {/* DTR Mean */}
            <div className="p-3 bg-slate-50 dark:bg-slate-800/60 rounded-xl border border-slate-200 dark:border-slate-700 space-y-1">
              <span className="text-[10px] font-bold text-slate-600 dark:text-slate-300 block">DTR (Rerata Rentang Diurnal)</span>
              <div className="text-xl font-black font-mono text-slate-900 dark:text-slate-100">
                {indices.dtrMean}°C
              </div>
              <span className="text-[9px] text-slate-400 block">Rata-rata Tmax - Tmin</span>
            </div>

            {/* SU35 (Hari Panas Tropis) */}
            <div className="p-3 bg-rose-50/60 dark:bg-rose-950/30 rounded-xl border border-rose-200 dark:border-rose-900/40 space-y-1">
              <span className="text-[10px] font-bold text-rose-700 dark:text-rose-300 block">SU35 (Hari Panas Tropis)</span>
              <div className="text-xl font-black font-mono text-rose-900 dark:text-rose-100">
                {indices.su35} <span className="text-[10px] font-normal">hari</span>
              </div>
              <span className="text-[9px] text-slate-400 block">Tmax ≥ 35°C ({indices.su33} hari ≥33°C)</span>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
