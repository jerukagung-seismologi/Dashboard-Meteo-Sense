// components/climate-drivers/SummaryCards.tsx
"use client";

import React from "react";
import Link from "next/link";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Waves, CloudRain, Compass, Wind, ArrowRight, Sparkles } from "lucide-react";
import { StatusBadge } from "./StatusBadge";
import { ClimateDriversSummary, MonsoonData } from "@/lib/climate-drivers/types";
import { getMonsoonData } from "@/lib/climate-drivers/climateData";

interface SummaryCardsProps {
  summary: ClimateDriversSummary;
}

export const SummaryCards: React.FC<SummaryCardsProps> = ({ summary }) => {
  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
      {/* 1. ENSO Card */}
      <Card className="flex flex-col justify-between border-none shadow-md hover:shadow-lg transition-all duration-300 dark:bg-slate-900 bg-white group overflow-hidden relative">
        <div className="absolute top-0 right-0 w-24 h-24 bg-blue-500/10 rounded-full blur-2xl group-hover:bg-blue-500/20 transition-all pointer-events-none" />
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div className="p-2.5 bg-blue-50 dark:bg-blue-950/60 rounded-xl text-blue-600 dark:text-blue-400">
              <Waves className="h-6 w-6" />
            </div>
            <StatusBadge type="enso" value={summary.enso.status} size="md" />
          </div>
          <div className="mt-3 space-y-1">
            <div className="flex items-center gap-2">
              <span className="px-2 py-0.5 rounded-md text-[10px] font-bold font-mono uppercase tracking-wider bg-blue-100 text-blue-800 dark:bg-blue-950/80 dark:text-blue-200 border border-blue-200 dark:border-blue-800">
                ENSO
              </span>
              <CardTitle className="text-lg font-bold tracking-tight text-slate-900 dark:text-slate-100">
                El Niño / La Niña
              </CardTitle>
            </div>
            <CardDescription className="text-xs text-slate-500 dark:text-slate-400 font-medium">
              Suhu Permukaan Laut Pasifik Ekuator
            </CardDescription>
          </div>
        </CardHeader>

        <CardContent className="space-y-4 flex-1">
          <div className="p-3 bg-slate-50 dark:bg-slate-800/60 rounded-xl border border-slate-200 dark:border-slate-800 flex items-center justify-between">
            <div>
              <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400 block">Indeks ONI (Oceanic Niño)</span>
              <span className="text-2xl sm:text-3xl font-extrabold font-mono tracking-tight tabular-nums text-slate-900 dark:text-slate-100">
                {summary.enso.oni >= 0 ? `+${summary.enso.oni.toFixed(1)}` : summary.enso.oni.toFixed(1)}°C
              </span>
            </div>
            <div className="text-right">
              <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400 block">Kondisi</span>
              <span className="text-xs sm:text-sm font-bold text-blue-600 dark:text-blue-400">{summary.enso.status}</span>
            </div>
          </div>

          <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-300 line-clamp-3 leading-relaxed font-normal">
            {summary.enso.description}
          </p>

          <div className="pt-2 text-[11px] text-slate-500 dark:text-slate-400 flex items-center justify-between font-medium">
            <span>Sumber Data Resmi:</span>
            <span className="font-semibold text-blue-600 dark:text-blue-400">{summary.enso.dataSource}</span>
          </div>
        </CardContent>

        <CardFooter className="pt-2 border-t dark:border-slate-800/80">
          <Button asChild className="w-full justify-between bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs sm:text-sm shadow-sm group-hover:translate-x-0.5 transition-all">
            <Link href="/dashboard/climate-drivers/enso">
              <span>Lihat Detail ENSO</span>
              <ArrowRight className="h-4 w-4 ml-1" />
            </Link>
          </Button>
        </CardFooter>
      </Card>

      {/* 2. MJO Card */}
      <Card className="flex flex-col justify-between border-none shadow-md hover:shadow-lg transition-all duration-300 dark:bg-slate-900 bg-white group overflow-hidden relative">
        <div className="absolute top-0 right-0 w-24 h-24 bg-emerald-500/10 rounded-full blur-2xl group-hover:bg-emerald-500/20 transition-all pointer-events-none" />
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div className="p-2.5 bg-emerald-50 dark:bg-emerald-950/60 rounded-xl text-emerald-600 dark:text-emerald-400">
              <CloudRain className="h-6 w-6" />
            </div>
            <StatusBadge type="mjo" value={summary.mjo.status} size="md" />
          </div>
          <div className="mt-3 space-y-1">
            <div className="flex items-center gap-2">
              <span className="px-2 py-0.5 rounded-md text-[10px] font-bold font-mono uppercase tracking-wider bg-emerald-100 text-emerald-800 dark:bg-emerald-950/80 dark:text-emerald-200 border border-emerald-200 dark:border-emerald-800">
                MJO
              </span>
              <CardTitle className="text-lg font-bold tracking-tight text-slate-900 dark:text-slate-100">
                Madden-Julian Oscillation
              </CardTitle>
            </div>
            <CardDescription className="text-xs text-slate-500 dark:text-slate-400 font-medium">
              Gelombang Konveksi Intraseasonal Tropis
            </CardDescription>
          </div>
        </CardHeader>

        <CardContent className="space-y-4 flex-1">
          <div className="grid grid-cols-2 gap-2 p-3 bg-slate-50 dark:bg-slate-800/60 rounded-xl border border-slate-200 dark:border-slate-800">
            <div>
              <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400 block">Fase MJO</span>
              <span className="text-2xl sm:text-3xl font-extrabold font-mono tracking-tight tabular-nums text-slate-900 dark:text-slate-100">
                Fase {summary.mjo.phase}
              </span>
            </div>
            <div>
              <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400 block">Amplitudo</span>
              <span className="text-2xl sm:text-3xl font-extrabold font-mono tracking-tight tabular-nums text-emerald-600 dark:text-emerald-400">
                {summary.mjo.amplitude.toFixed(1)}
              </span>
            </div>
          </div>

          <div className="flex items-center justify-between text-xs p-2.5 bg-emerald-50/60 dark:bg-emerald-950/30 rounded-lg text-emerald-800 dark:text-emerald-300 border border-emerald-200/50 dark:border-emerald-900/40">
            <span className="flex items-center gap-1.5 font-semibold text-xs">
              <Sparkles className="h-3.5 w-3.5 text-emerald-500 shrink-0" /> Konveksi Indonesia:
            </span>
            <StatusBadge type="convection" value={summary.mjo.convectionOverMC} size="sm" />
          </div>

          <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-300 line-clamp-3 leading-relaxed font-normal">
            {summary.mjo.description}
          </p>

          <div className="pt-2 text-[11px] text-slate-500 dark:text-slate-400 flex items-center justify-between font-medium">
            <span>Sumber Data Resmi:</span>
            <span className="font-semibold text-emerald-600 dark:text-emerald-400">{summary.mjo.dataSource}</span>
          </div>
        </CardContent>

        <CardFooter className="pt-2 border-t dark:border-slate-800/80">
          <Button asChild className="w-full justify-between bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs sm:text-sm shadow-sm group-hover:translate-x-0.5 transition-all">
            <Link href="/dashboard/climate-drivers/mjo">
              <span>Lihat Detail MJO</span>
              <ArrowRight className="h-4 w-4 ml-1" />
            </Link>
          </Button>
        </CardFooter>
      </Card>

      {/* 3. IOD Card */}
      <Card className="flex flex-col justify-between border-none shadow-md hover:shadow-lg transition-all duration-300 dark:bg-slate-900 bg-white group overflow-hidden relative">
        <div className="absolute top-0 right-0 w-24 h-24 bg-amber-500/10 rounded-full blur-2xl group-hover:bg-amber-500/20 transition-all pointer-events-none" />
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div className="p-2.5 bg-amber-50 dark:bg-amber-950/60 rounded-xl text-amber-600 dark:text-amber-400">
              <Compass className="h-6 w-6" />
            </div>
            <StatusBadge type="iod" value={summary.iod.status} size="md" />
          </div>
          <div className="mt-3 space-y-1">
            <div className="flex items-center gap-2">
              <span className="px-2 py-0.5 rounded-md text-[10px] font-bold font-mono uppercase tracking-wider bg-amber-100 text-amber-800 dark:bg-amber-950/80 dark:text-amber-200 border border-amber-200 dark:border-amber-800">
                IOD
              </span>
              <CardTitle className="text-lg font-bold tracking-tight text-slate-900 dark:text-slate-100">
                Indian Ocean Dipole
              </CardTitle>
            </div>
            <CardDescription className="text-xs text-slate-500 dark:text-slate-400 font-medium">
              Dipol Suhu Permukaan Samudra Hindia
            </CardDescription>
          </div>
        </CardHeader>

        <CardContent className="space-y-4 flex-1">
          <div className="p-3 bg-slate-50 dark:bg-slate-800/60 rounded-xl border border-slate-200 dark:border-slate-800 flex items-center justify-between">
            <div>
              <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400 block">Indeks DMI</span>
              <span className="text-2xl sm:text-3xl font-extrabold font-mono tracking-tight tabular-nums text-slate-900 dark:text-slate-100">
                {summary.iod.dmi >= 0 ? `+${summary.iod.dmi.toFixed(2)}` : summary.iod.dmi.toFixed(2)}°C
              </span>
            </div>
            <div className="text-right">
              <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400 block">Status</span>
              <span className="text-xs sm:text-sm font-bold text-amber-600 dark:text-amber-400">{summary.iod.status} IOD</span>
            </div>
          </div>

          <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-300 line-clamp-3 leading-relaxed font-normal">
            {summary.iod.description}
          </p>

          <div className="pt-2 text-[11px] text-slate-500 dark:text-slate-400 flex items-center justify-between font-medium">
            <span>Sumber Data Resmi:</span>
            <span className="font-semibold text-amber-600 dark:text-amber-400">{summary.iod.dataSource}</span>
          </div>
        </CardContent>

        <CardFooter className="pt-2 border-t dark:border-slate-800/80">
          <Button asChild className="w-full justify-between bg-amber-600 hover:bg-amber-700 text-white font-semibold text-xs sm:text-sm shadow-sm group-hover:translate-x-0.5 transition-all">
            <Link href="/dashboard/climate-drivers/iod">
              <span>Lihat Detail IOD</span>
              <ArrowRight className="h-4 w-4 ml-1" />
            </Link>
          </Button>
        </CardFooter>
      </Card>
    </div>
  );
};

