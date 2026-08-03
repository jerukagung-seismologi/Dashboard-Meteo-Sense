// components/climate-drivers/SummaryCards.tsx
"use client";

import React from "react";
import Link from "next/link";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Waves, CloudRain, Compass, ArrowRight, Sparkles, AlertCircle } from "lucide-react";
import { StatusBadge } from "./StatusBadge";
import { ClimateDriversSummary } from "@/lib/climate-drivers/types";

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
          <CardTitle className="text-xl font-bold mt-3 text-slate-900 dark:text-slate-100 flex items-center gap-2">
            ENSO <span className="text-xs font-normal text-slate-500 dark:text-slate-400">(El Niño / La Niña)</span>
          </CardTitle>
          <CardDescription className="text-xs text-slate-500 dark:text-slate-400">
            Suhu Permukaan Laut Pasifik Ekuator
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-4 flex-1">
          <div className="p-3 bg-slate-50 dark:bg-slate-800/60 rounded-xl border dark:border-slate-800 flex items-center justify-between">
            <div>
              <span className="text-xs text-slate-500 dark:text-slate-400 block font-medium">Indeks ONI (Oceanic Niño)</span>
              <span className="text-2xl font-black text-slate-900 dark:text-slate-100">
                {summary.enso.oni >= 0 ? `+${summary.enso.oni.toFixed(1)}` : summary.enso.oni.toFixed(1)}°C
              </span>
            </div>
            <div className="text-right">
              <span className="text-xs text-slate-500 dark:text-slate-400 block">Kondisi</span>
              <span className="text-sm font-bold text-blue-600 dark:text-blue-400">{summary.enso.status}</span>
            </div>
          </div>

          <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-300 line-clamp-3 leading-relaxed">
            {summary.enso.description}
          </p>

          <div className="pt-2 text-[10px] text-slate-400 dark:text-slate-500 flex items-center justify-between">
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
          <CardTitle className="text-xl font-bold mt-3 text-slate-900 dark:text-slate-100 flex items-center gap-2">
            MJO <span className="text-xs font-normal text-slate-500 dark:text-slate-400">(Madden-Julian Oscillation)</span>
          </CardTitle>
          <CardDescription className="text-xs text-slate-500 dark:text-slate-400">
            Gelombang Konveksi Intraseasonal Tropis
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-4 flex-1">
          <div className="grid grid-cols-2 gap-2 p-3 bg-slate-50 dark:bg-slate-800/60 rounded-xl border dark:border-slate-800">
            <div>
              <span className="text-xs text-slate-500 dark:text-slate-400 block font-medium">Fase MJO</span>
              <span className="text-2xl font-black text-slate-900 dark:text-slate-100">
                Fase {summary.mjo.phase}
              </span>
            </div>
            <div>
              <span className="text-xs text-slate-500 dark:text-slate-400 block font-medium">Amplitudo</span>
              <span className="text-2xl font-black text-emerald-600 dark:text-emerald-400">
                {summary.mjo.amplitude.toFixed(1)}
              </span>
            </div>
          </div>

          <div className="flex items-center justify-between text-xs p-2 bg-emerald-50/60 dark:bg-emerald-950/30 rounded-lg text-emerald-800 dark:text-emerald-300">
            <span className="flex items-center gap-1 font-medium">
              <Sparkles className="h-3.5 w-3.5 text-emerald-500" /> Konveksi Indonesia:
            </span>
            <StatusBadge type="convection" value={summary.mjo.convectionOverMC} size="sm" />
          </div>

          <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-300 line-clamp-3 leading-relaxed">
            {summary.mjo.description}
          </p>

          <div className="pt-2 text-[10px] text-slate-400 dark:text-slate-500 flex items-center justify-between">
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
          <CardTitle className="text-xl font-bold mt-3 text-slate-900 dark:text-slate-100 flex items-center gap-2">
            IOD <span className="text-xs font-normal text-slate-500 dark:text-slate-400">(Indian Ocean Dipole)</span>
          </CardTitle>
          <CardDescription className="text-xs text-slate-500 dark:text-slate-400">
            Dipol Suhu Permukaan Samudra Hindia
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-4 flex-1">
          <div className="p-3 bg-slate-50 dark:bg-slate-800/60 rounded-xl border dark:border-slate-800 flex items-center justify-between">
            <div>
              <span className="text-xs text-slate-500 dark:text-slate-400 block font-medium">Indeks DMI</span>
              <span className="text-2xl font-black text-slate-900 dark:text-slate-100">
                {summary.iod.dmi >= 0 ? `+${summary.iod.dmi.toFixed(2)}` : summary.iod.dmi.toFixed(2)}°C
              </span>
            </div>
            <div className="text-right">
              <span className="text-xs text-slate-500 dark:text-slate-400 block">Status</span>
              <span className="text-sm font-bold text-amber-600 dark:text-amber-400">{summary.iod.status} IOD</span>
            </div>
          </div>

          <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-300 line-clamp-3 leading-relaxed">
            {summary.iod.description}
          </p>

          <div className="pt-2 text-[10px] text-slate-400 dark:text-slate-500 flex items-center justify-between">
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
