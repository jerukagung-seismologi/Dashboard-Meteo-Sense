// components/indeks-monsun/MonsoonIndicesSummaryCards.tsx
"use client";

import React from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Wind, Compass, CloudRain, ShieldAlert, Sparkles, Activity, AlertTriangle } from "lucide-react";

interface MonsoonIndicesSummaryCardsProps {
  current: {
    ausmi: { value: number; unit: string; status: string; description: string };
    wnpmi: { value: number; unit: string; status: string; description: string };
    scsmi: { value: number; unit: string; status: string; description: string };
    csi: { value: number; unit: string; status: string; isSurgeActive: boolean; description: string };
    bsiso: { phase: number; amplitude: number; status: string; name: string; activeRegion: string; indonesiaImpact: string };
  };
}

export const MonsoonIndicesSummaryCards: React.FC<MonsoonIndicesSummaryCardsProps> = ({ current }) => {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
      {/* 1. AUSMI Card */}
      <Card className="flex flex-col justify-between border-none shadow-sm hover:shadow-md transition-all duration-300 dark:bg-slate-900 bg-white group overflow-hidden relative">
        <div className="absolute top-0 right-0 w-20 h-20 bg-blue-500/10 rounded-full blur-2xl group-hover:bg-blue-500/20 transition-all pointer-events-none" />
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <div className="p-2 bg-blue-50 dark:bg-blue-950/60 rounded-xl text-blue-600 dark:text-blue-400">
              <Wind className="h-5 w-5" />
            </div>
            <Badge variant="outline" className={`text-[10px] font-bold ${
              current.ausmi.value > 2 ? "bg-cyan-100 dark:bg-cyan-950/60 text-cyan-700 dark:text-cyan-300 border-cyan-300" :
              current.ausmi.value < -2 ? "bg-amber-100 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300 border-amber-300" :
              "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300"
            }`}>
              {current.ausmi.status}
            </Badge>
          </div>
          <CardTitle className="text-base font-bold mt-2 text-slate-900 dark:text-slate-100">
            AUSMI <span className="text-[11px] font-normal text-slate-500">(Australian)</span>
          </CardTitle>
          <CardDescription className="text-[11px] text-slate-500">
            Angin Zonal 5°-15°S, 110°-130°E
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-3 flex-1 pt-1">
          <div className="p-2.5 bg-slate-50 dark:bg-slate-800/60 rounded-xl border dark:border-slate-800 flex items-center justify-between">
            <div>
              <span className="text-[10px] text-slate-500 block font-medium">Nilai U850</span>
              <span className="text-xl font-black text-slate-900 dark:text-slate-100 font-mono">
                {current.ausmi.value > 0 ? `+${current.ausmi.value}` : current.ausmi.value} m/s
              </span>
            </div>
            <span className="text-[10px] font-semibold text-blue-600 dark:text-blue-400 text-right">
              {current.ausmi.value > 0 ? "Puncak Hujan" : "Musim Kemarau"}
            </span>
          </div>
          <p className="text-[11px] text-slate-600 dark:text-slate-300 line-clamp-3 leading-relaxed">
            {current.ausmi.description}
          </p>
        </CardContent>
      </Card>

      {/* 2. WNPMI Card */}
      <Card className="flex flex-col justify-between border-none shadow-sm hover:shadow-md transition-all duration-300 dark:bg-slate-900 bg-white group overflow-hidden relative">
        <div className="absolute top-0 right-0 w-20 h-20 bg-amber-500/10 rounded-full blur-2xl group-hover:bg-amber-500/20 transition-all pointer-events-none" />
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <div className="p-2 bg-amber-50 dark:bg-amber-950/60 rounded-xl text-amber-600 dark:text-amber-400">
              <Compass className="h-5 w-5" />
            </div>
            <Badge variant="outline" className="text-[10px] font-bold bg-amber-100 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300 border-amber-300">
              {current.wnpmi.status}
            </Badge>
          </div>
          <CardTitle className="text-base font-bold mt-2 text-slate-900 dark:text-slate-100">
            WNPMI <span className="text-[11px] font-normal text-slate-500">(W. North Pacific)</span>
          </CardTitle>
          <CardDescription className="text-[11px] text-slate-500">
            Palung Monsun 5°-15°N vs 20°-30°N
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-3 flex-1 pt-1">
          <div className="p-2.5 bg-slate-50 dark:bg-slate-800/60 rounded-xl border dark:border-slate-800 flex items-center justify-between">
            <div>
              <span className="text-[10px] text-slate-500 block font-medium">Geser Zonal</span>
              <span className="text-xl font-black text-slate-900 dark:text-slate-100 font-mono">
                {current.wnpmi.value > 0 ? `+${current.wnpmi.value}` : current.wnpmi.value} m/s
              </span>
            </div>
            <span className="text-[10px] font-semibold text-amber-600 dark:text-amber-400 text-right">
              {current.wnpmi.value > 0 ? "Tarikan Utara Kuat" : "Palung Tenang"}
            </span>
          </div>
          <p className="text-[11px] text-slate-600 dark:text-slate-300 line-clamp-3 leading-relaxed">
            {current.wnpmi.description}
          </p>
        </CardContent>
      </Card>

      {/* 3. SCSMI Card */}
      <Card className="flex flex-col justify-between border-none shadow-sm hover:shadow-md transition-all duration-300 dark:bg-slate-900 bg-white group overflow-hidden relative">
        <div className="absolute top-0 right-0 w-20 h-20 bg-teal-500/10 rounded-full blur-2xl group-hover:bg-teal-500/20 transition-all pointer-events-none" />
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <div className="p-2 bg-teal-50 dark:bg-teal-950/60 rounded-xl text-teal-600 dark:text-teal-400">
              <Activity className="h-5 w-5" />
            </div>
            <Badge variant="outline" className="text-[10px] font-bold bg-teal-100 dark:bg-teal-950/60 text-teal-700 dark:text-teal-300 border-teal-300">
              {current.scsmi.status}
            </Badge>
          </div>
          <CardTitle className="text-base font-bold mt-2 text-slate-900 dark:text-slate-100">
            SCSMI <span className="text-[11px] font-normal text-slate-500">(South China Sea)</span>
          </CardTitle>
          <CardDescription className="text-[11px] text-slate-500">
            Angin Zonal 5°-15°N, 110°-120°E
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-3 flex-1 pt-1">
          <div className="p-2.5 bg-slate-50 dark:bg-slate-800/60 rounded-xl border dark:border-slate-800 flex items-center justify-between">
            <div>
              <span className="text-[10px] text-slate-500 block font-medium">Angin Baratan LCS</span>
              <span className="text-xl font-black text-slate-900 dark:text-slate-100 font-mono">
                {current.scsmi.value > 0 ? `+${current.scsmi.value}` : current.scsmi.value} m/s
              </span>
            </div>
            <span className="text-[10px] font-semibold text-teal-600 dark:text-teal-400 text-right">
              {current.scsmi.value > 2 ? "Onset Aktif" : "Belum Onset"}
            </span>
          </div>
          <p className="text-[11px] text-slate-600 dark:text-slate-300 line-clamp-3 leading-relaxed">
            {current.scsmi.description}
          </p>
        </CardContent>
      </Card>

      {/* 4. Cold Surge Index (CSI) Card */}
      <Card className={`flex flex-col justify-between border shadow-sm hover:shadow-md transition-all duration-300 dark:bg-slate-900 bg-white group overflow-hidden relative ${
        current.csi.isSurgeActive ? "border-rose-500 shadow-rose-500/20" : "border-none"
      }`}>
        <div className="absolute top-0 right-0 w-20 h-20 bg-rose-500/10 rounded-full blur-2xl group-hover:bg-rose-500/20 transition-all pointer-events-none" />
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <div className={`p-2 rounded-xl ${current.csi.isSurgeActive ? "bg-rose-500 text-white animate-pulse" : "bg-rose-50 dark:bg-rose-950/60 text-rose-600 dark:text-rose-400"}`}>
              <ShieldAlert className="h-5 w-5" />
            </div>
            <Badge variant="outline" className={`text-[10px] font-bold ${
              current.csi.isSurgeActive ? "bg-rose-100 text-rose-800 border-rose-500" : "bg-slate-100 text-slate-600 border-slate-300"
            }`}>
              {current.csi.status}
            </Badge>
          </div>
          <CardTitle className="text-base font-bold mt-2 text-slate-900 dark:text-slate-100">
            Cold Surge <span className="text-[11px] font-normal text-slate-500">(CSI)</span>
          </CardTitle>
          <CardDescription className="text-[11px] text-slate-500">
            Angin Meridional V di 12.5°N
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-3 flex-1 pt-1">
          <div className="p-2.5 bg-slate-50 dark:bg-slate-800/60 rounded-xl border dark:border-slate-800 flex items-center justify-between">
            <div>
              <span className="text-[10px] text-slate-500 block font-medium">Angin Utara (V)</span>
              <span className="text-xl font-black text-slate-900 dark:text-slate-100 font-mono">
                {current.csi.value} m/s
              </span>
            </div>
            <span className="text-[10px] font-semibold text-rose-600 dark:text-rose-400 text-right">
              {current.csi.isSurgeActive ? "⚠️ Banjir Jawa" : "Tenang"}
            </span>
          </div>
          <p className="text-[11px] text-slate-600 dark:text-slate-300 line-clamp-3 leading-relaxed">
            {current.csi.description}
          </p>
        </CardContent>
      </Card>

      {/* 5. BSISO Card */}
      <Card className="flex flex-col justify-between border-none shadow-sm hover:shadow-md transition-all duration-300 dark:bg-slate-900 bg-white group overflow-hidden relative">
        <div className="absolute top-0 right-0 w-20 h-20 bg-indigo-500/10 rounded-full blur-2xl group-hover:bg-indigo-500/20 transition-all pointer-events-none" />
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <div className="p-2 bg-indigo-50 dark:bg-indigo-950/60 rounded-xl text-indigo-600 dark:text-indigo-400">
              <Sparkles className="h-5 w-5" />
            </div>
            <Badge variant="outline" className="text-[10px] font-bold bg-indigo-100 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 border-indigo-300">
              {current.bsiso.status}
            </Badge>
          </div>
          <CardTitle className="text-base font-bold mt-2 text-slate-900 dark:text-slate-100">
            BSISO <span className="text-[11px] font-normal text-slate-500">(Boreal Summer)</span>
          </CardTitle>
          <CardDescription className="text-[11px] text-slate-500">
            Propagasi Konveksi Musim Panas
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-3 flex-1 pt-1">
          <div className="p-2.5 bg-slate-50 dark:bg-slate-800/60 rounded-xl border dark:border-slate-800 flex items-center justify-between">
            <div>
              <span className="text-[10px] text-slate-500 block font-medium">Fase &amp; Amplitudo</span>
              <span className="text-base font-black text-slate-900 dark:text-slate-100 font-mono">
                Fase {current.bsiso.phase} (Amp: {current.bsiso.amplitude})
              </span>
            </div>
            <span className="text-[10px] font-semibold text-indigo-600 dark:text-indigo-400 text-right">
              {current.bsiso.name}
            </span>
          </div>
          <p className="text-[11px] text-slate-600 dark:text-slate-300 line-clamp-3 leading-relaxed">
            {current.bsiso.indonesiaImpact}
          </p>
        </CardContent>
      </Card>
    </div>
  );
};
