// components/indeks-monsun/MonsoonIndicesSummaryCards.tsx
"use client";

import React from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Wind, Compass, CloudRain, ShieldAlert, Sparkles, Activity, Globe, Waves, Zap, Layers } from "lucide-react";

interface MonsoonIndicesSummaryCardsProps {
  current: {
    ausmi: { value: number; unit: string; status: string; description: string };
    wnpmi: { value: number; unit: string; status: string; description: string };
    scsmi: { value: number; unit: string; status: string; description: string };
    csi: { value: number; unit: string; status: string; isSurgeActive: boolean; description: string };
    wyi: { value: number; unit: string; status: string; description: string };
    sasmi: { value: number; unit: string; status: string; description: string };
    easmi: { value: number; unit: string; status: string; description: string };
    bsiso1: { value: number; unit: string; status: string; description: string };
    bsiso2: { value: number; unit: string; status: string; description: string };
    bsiso: { phase: number; amplitude: number; status: string; name: string; activeRegion: string; indonesiaImpact: string };
  };
}

const getStatusBadgeClass = (status: string) => {
  if (status === "Positif") {
    return "bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border-emerald-300 dark:border-emerald-800/80 font-semibold";
  }
  if (status === "Negatif") {
    return "bg-amber-50 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300 border-amber-300 dark:border-amber-800/80 font-semibold";
  }
  if (status === "Waspada") {
    return "bg-rose-50 dark:bg-rose-950/60 text-rose-700 dark:text-rose-300 border-rose-300 dark:border-rose-800/80 font-semibold animate-pulse";
  }
  return "bg-slate-50 dark:bg-slate-800/60 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700 font-medium";
};

export const MonsoonIndicesSummaryCards: React.FC<MonsoonIndicesSummaryCardsProps> = ({ current }) => {
  return (
    <div className="space-y-7">
      {/* 1. Kategori: 4 Indeks Pengaruh Langsung ke Indonesia */}
      <div className="space-y-3.5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <span className="p-2 rounded-xl bg-teal-500/10 text-teal-600 dark:text-teal-400">
              <Zap className="h-4 w-4" />
            </span>
            <div>
              <span className="text-[11px] font-bold uppercase tracking-wider text-teal-600 dark:text-teal-400 font-mono block">
                Wilayah Maritim Indonesia
              </span>
              <h3 className="text-base sm:text-lg font-extrabold tracking-tight text-slate-900 dark:text-slate-100">
                4 Indeks Monsun Berpengaruh Langsung
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 font-normal">
                Indikator pendorong utama musim hujan, kemarau, dan risiko seruakan dingin ekstrem
              </p>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* 1. AUSMI Card */}
          <Card className="flex flex-col justify-between border-slate-200/80 dark:border-slate-800 shadow-sm hover:shadow-md transition-all duration-300 dark:bg-slate-900 bg-white group overflow-hidden relative rounded-2xl">
            <div className="absolute top-0 right-0 w-24 h-24 bg-cyan-500/10 rounded-full blur-2xl group-hover:bg-cyan-500/20 transition-all pointer-events-none" />
            <CardHeader className="pb-2.5">
              <div className="flex items-center justify-between">
                <div className="p-2 bg-cyan-50 dark:bg-cyan-950/60 rounded-xl text-cyan-600 dark:text-cyan-400">
                  <Wind className="h-5 w-5" />
                </div>
                <Badge variant="outline" className={`text-xs px-2.5 py-0.5 rounded-full ${getStatusBadgeClass(current.ausmi.status)}`}>
                  {current.ausmi.status}
                </Badge>
              </div>
              <div className="mt-2.5 space-y-0.5">
                <div className="flex items-center justify-between">
                  <span className="text-lg font-extrabold tracking-tight text-slate-900 dark:text-slate-100">
                    AUSMI
                  </span>
                  <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-500 font-semibold">
                    #1
                  </span>
                </div>
                <p className="text-xs font-medium text-slate-500 dark:text-slate-400">
                  Australian Monsoon Index
                </p>
                <p className="text-[11px] font-mono text-slate-400 dark:text-slate-500 pt-0.5">
                  5°S–15°S, 110°E–130°E
                </p>
              </div>
            </CardHeader>

            <CardContent className="space-y-3 flex-1 pt-1">
              <div className="p-3 bg-slate-50 dark:bg-slate-800/60 rounded-xl border border-slate-100 dark:border-slate-800 flex items-center justify-between">
                <div>
                  <span className="text-[10px] uppercase tracking-wider text-slate-500 dark:text-slate-400 block font-semibold">
                    Nilai U850
                  </span>
                  <span className="text-2xl font-extrabold text-slate-900 dark:text-slate-100 font-mono tracking-tight tabular-nums">
                    {current.ausmi.value > 0 ? `+${current.ausmi.value}` : current.ausmi.value} <span className="text-xs font-sans font-medium text-slate-500">m/s</span>
                  </span>
                </div>
                <span className="text-[11px] font-semibold text-cyan-700 dark:text-cyan-300 text-right bg-cyan-50 dark:bg-cyan-950/60 px-2.5 py-1 rounded-lg border border-cyan-200/80 dark:border-cyan-800/60">
                  {current.ausmi.value > 0 ? "Baratan (Hujan)" : current.ausmi.value < 0 ? "Timuran (Kemarau)" : "Netral"}
                </span>
              </div>
              <p className="text-xs text-slate-600 dark:text-slate-300 line-clamp-2 leading-relaxed font-normal">
                {current.ausmi.description}
              </p>
            </CardContent>
          </Card>

          {/* 2. WNPMI Card */}
          <Card className="flex flex-col justify-between border-slate-200/80 dark:border-slate-800 shadow-sm hover:shadow-md transition-all duration-300 dark:bg-slate-900 bg-white group overflow-hidden relative rounded-2xl">
            <div className="absolute top-0 right-0 w-24 h-24 bg-amber-500/10 rounded-full blur-2xl group-hover:bg-amber-500/20 transition-all pointer-events-none" />
            <CardHeader className="pb-2.5">
              <div className="flex items-center justify-between">
                <div className="p-2 bg-amber-50 dark:bg-amber-950/60 rounded-xl text-amber-600 dark:text-amber-400">
                  <Compass className="h-5 w-5" />
                </div>
                <Badge variant="outline" className={`text-xs px-2.5 py-0.5 rounded-full ${getStatusBadgeClass(current.wnpmi.status)}`}>
                  {current.wnpmi.status}
                </Badge>
              </div>
              <div className="mt-2.5 space-y-0.5">
                <div className="flex items-center justify-between">
                  <span className="text-lg font-extrabold tracking-tight text-slate-900 dark:text-slate-100">
                    WNPMI
                  </span>
                  <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-500 font-semibold">
                    #2
                  </span>
                </div>
                <p className="text-xs font-medium text-slate-500 dark:text-slate-400">
                  Western North Pacific Monsoon
                </p>
                <p className="text-[11px] font-mono text-slate-400 dark:text-slate-500 pt-0.5">
                  5°–15°N vs 20°–30°N
                </p>
              </div>
            </CardHeader>

            <CardContent className="space-y-3 flex-1 pt-1">
              <div className="p-3 bg-slate-50 dark:bg-slate-800/60 rounded-xl border border-slate-100 dark:border-slate-800 flex items-center justify-between">
                <div>
                  <span className="text-[10px] uppercase tracking-wider text-slate-500 dark:text-slate-400 block font-semibold">
                    Geser Zonal
                  </span>
                  <span className="text-2xl font-extrabold text-slate-900 dark:text-slate-100 font-mono tracking-tight tabular-nums">
                    {current.wnpmi.value > 0 ? `+${current.wnpmi.value}` : current.wnpmi.value} <span className="text-xs font-sans font-medium text-slate-500">m/s</span>
                  </span>
                </div>
                <span className="text-[11px] font-semibold text-amber-700 dark:text-amber-300 text-right bg-amber-50 dark:bg-amber-950/60 px-2.5 py-1 rounded-lg border border-amber-200/80 dark:border-amber-800/60">
                  {current.wnpmi.value > 0 ? "Palung Kuat" : "Palung Tenang"}
                </span>
              </div>
              <p className="text-xs text-slate-600 dark:text-slate-300 line-clamp-2 leading-relaxed font-normal">
                {current.wnpmi.description}
              </p>
            </CardContent>
          </Card>

          {/* 3. SCSMI Card */}
          <Card className="flex flex-col justify-between border-slate-200/80 dark:border-slate-800 shadow-sm hover:shadow-md transition-all duration-300 dark:bg-slate-900 bg-white group overflow-hidden relative rounded-2xl">
            <div className="absolute top-0 right-0 w-24 h-24 bg-teal-500/10 rounded-full blur-2xl group-hover:bg-teal-500/20 transition-all pointer-events-none" />
            <CardHeader className="pb-2.5">
              <div className="flex items-center justify-between">
                <div className="p-2 bg-teal-50 dark:bg-teal-950/60 rounded-xl text-teal-600 dark:text-teal-400">
                  <Activity className="h-5 w-5" />
                </div>
                <Badge variant="outline" className={`text-xs px-2.5 py-0.5 rounded-full ${getStatusBadgeClass(current.scsmi.status)}`}>
                  {current.scsmi.status}
                </Badge>
              </div>
              <div className="mt-2.5 space-y-0.5">
                <div className="flex items-center justify-between">
                  <span className="text-lg font-extrabold tracking-tight text-slate-900 dark:text-slate-100">
                    SCSMI
                  </span>
                  <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-500 font-semibold">
                    #3
                  </span>
                </div>
                <p className="text-xs font-medium text-slate-500 dark:text-slate-400">
                  South China Sea Monsoon
                </p>
                <p className="text-[11px] font-mono text-slate-400 dark:text-slate-500 pt-0.5">
                  5°N–15°N, 110°E–120°E
                </p>
              </div>
            </CardHeader>

            <CardContent className="space-y-3 flex-1 pt-1">
              <div className="p-3 bg-slate-50 dark:bg-slate-800/60 rounded-xl border border-slate-100 dark:border-slate-800 flex items-center justify-between">
                <div>
                  <span className="text-[10px] uppercase tracking-wider text-slate-500 dark:text-slate-400 block font-semibold">
                    Angin Baratan LCS
                  </span>
                  <span className="text-2xl font-extrabold text-slate-900 dark:text-slate-100 font-mono tracking-tight tabular-nums">
                    {current.scsmi.value > 0 ? `+${current.scsmi.value}` : current.scsmi.value} <span className="text-xs font-sans font-medium text-slate-500">m/s</span>
                  </span>
                </div>
                <span className="text-[11px] font-semibold text-teal-700 dark:text-teal-300 text-right bg-teal-50 dark:bg-teal-950/60 px-2.5 py-1 rounded-lg border border-teal-200/80 dark:border-teal-800/60">
                  {current.scsmi.value > 2 ? "Onset Aktif" : "Pra-Onset"}
                </span>
              </div>
              <p className="text-xs text-slate-600 dark:text-slate-300 line-clamp-2 leading-relaxed font-normal">
                {current.scsmi.description}
              </p>
            </CardContent>
          </Card>

          {/* 4. Cold Surge Index (CSI) Card */}
          <Card className={`flex flex-col justify-between shadow-sm hover:shadow-md transition-all duration-300 dark:bg-slate-900 bg-white group overflow-hidden relative rounded-2xl ${
            current.csi.isSurgeActive
              ? "border-2 border-rose-500 shadow-rose-500/20"
              : "border border-slate-200/80 dark:border-slate-800"
          }`}>
            <div className="absolute top-0 right-0 w-24 h-24 bg-rose-500/10 rounded-full blur-2xl group-hover:bg-rose-500/20 transition-all pointer-events-none" />
            <CardHeader className="pb-2.5">
              <div className="flex items-center justify-between">
                <div className={`p-2 rounded-xl ${current.csi.isSurgeActive ? "bg-rose-500 text-white animate-pulse" : "bg-rose-50 dark:bg-rose-950/60 text-rose-600 dark:text-rose-400"}`}>
                  <ShieldAlert className="h-5 w-5" />
                </div>
                <Badge variant="outline" className={`text-xs px-2.5 py-0.5 rounded-full ${getStatusBadgeClass(current.csi.status)}`}>
                  {current.csi.status}
                </Badge>
              </div>
              <div className="mt-2.5 space-y-0.5">
                <div className="flex items-center justify-between">
                  <span className="text-lg font-extrabold tracking-tight text-slate-900 dark:text-slate-100">
                    CSI
                  </span>
                  <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-500 font-semibold">
                    #4
                  </span>
                </div>
                <p className="text-xs font-medium text-slate-500 dark:text-slate-400">
                  Cold Surge Index
                </p>
                <p className="text-[11px] font-mono text-slate-400 dark:text-slate-500 pt-0.5">
                  Angin Utara V di 12.5°N
                </p>
              </div>
            </CardHeader>

            <CardContent className="space-y-3 flex-1 pt-1">
              <div className="p-3 bg-slate-50 dark:bg-slate-800/60 rounded-xl border border-slate-100 dark:border-slate-800 flex items-center justify-between">
                <div>
                  <span className="text-[10px] uppercase tracking-wider text-slate-500 dark:text-slate-400 block font-semibold">
                    Angin Utara (V)
                  </span>
                  <span className="text-2xl font-extrabold text-slate-900 dark:text-slate-100 font-mono tracking-tight tabular-nums">
                    {current.csi.value} <span className="text-xs font-sans font-medium text-slate-500">m/s</span>
                  </span>
                </div>
                <span className="text-[11px] font-semibold text-rose-700 dark:text-rose-300 text-right bg-rose-50 dark:bg-rose-950/60 px-2.5 py-1 rounded-lg border border-rose-200/80 dark:border-rose-800/60">
                  {current.csi.isSurgeActive ? "⚠️ Seruakan Aktif" : "Aliran Tenang"}
                </span>
              </div>
              <p className="text-xs text-slate-600 dark:text-slate-300 line-clamp-2 leading-relaxed font-normal">
                {current.csi.description}
              </p>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* 2. Kategori: 3 Indeks Sirkulasi Skala Luas Asia & 2 Modus BSISO */}
      <div className="space-y-3.5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <span className="p-2 rounded-xl bg-indigo-500/10 text-indigo-600 dark:text-indigo-400">
              <Globe className="h-4 w-4" />
            </span>
            <div>
              <span className="text-[11px] font-bold uppercase tracking-wider text-indigo-600 dark:text-indigo-400 font-mono block">
                Skala Luas Asia &amp; Intraseasonal
              </span>
              <h3 className="text-base sm:text-lg font-extrabold tracking-tight text-slate-900 dark:text-slate-100">
                3 Indeks Makro Asia &amp; 2 Modus BSISO
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 font-normal">
                Sirkulasi benua Asia–Samudra Hindia dan propagasi konveksi intraseasonal 30–60 &amp; 10–23 hari
              </p>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
          {/* 5. WYI Card */}
          <Card className="flex flex-col justify-between border-slate-200/80 dark:border-slate-800 shadow-sm hover:shadow-md transition-all duration-300 dark:bg-slate-900 bg-white group overflow-hidden relative rounded-2xl">
            <div className="absolute top-0 right-0 w-24 h-24 bg-indigo-500/10 rounded-full blur-2xl group-hover:bg-indigo-500/20 transition-all pointer-events-none" />
            <CardHeader className="pb-2.5">
              <div className="flex items-center justify-between">
                <div className="p-2 bg-indigo-50 dark:bg-indigo-950/60 rounded-xl text-indigo-600 dark:text-indigo-400">
                  <Globe className="h-5 w-5" />
                </div>
                <Badge variant="outline" className={`text-xs px-2.5 py-0.5 rounded-full ${getStatusBadgeClass(current.wyi.status)}`}>
                  {current.wyi.status}
                </Badge>
              </div>
              <div className="mt-2.5 space-y-0.5">
                <div className="flex items-center justify-between">
                  <span className="text-lg font-extrabold tracking-tight text-slate-900 dark:text-slate-100">
                    WYI
                  </span>
                  <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-500 font-semibold">
                    #5
                  </span>
                </div>
                <p className="text-xs font-medium text-slate-500 dark:text-slate-400">
                  Webster-Yang Monsoon Index
                </p>
                <p className="text-[11px] font-mono text-slate-400 dark:text-slate-500 pt-0.5">
                  Asia Selatan–Samudra Hindia
                </p>
              </div>
            </CardHeader>

            <CardContent className="space-y-3 flex-1 pt-1">
              <div className="p-3 bg-slate-50 dark:bg-slate-800/60 rounded-xl border border-slate-100 dark:border-slate-800 flex items-center justify-between">
                <div>
                  <span className="text-[10px] uppercase tracking-wider text-slate-500 dark:text-slate-400 block font-semibold">
                    Geser Zonal
                  </span>
                  <span className="text-xl font-extrabold text-slate-900 dark:text-slate-100 font-mono tracking-tight tabular-nums">
                    {current.wyi.value > 0 ? `+${current.wyi.value}` : current.wyi.value} <span className="text-xs font-sans font-medium text-slate-500">m/s</span>
                  </span>
                </div>
                <span className="text-[11px] font-semibold text-indigo-700 dark:text-indigo-300 text-right bg-indigo-50 dark:bg-indigo-950/60 px-2.5 py-1 rounded-lg border border-indigo-200/80 dark:border-indigo-800/60">
                  Makro Asia
                </span>
              </div>
              <p className="text-xs text-slate-600 dark:text-slate-300 line-clamp-2 leading-relaxed font-normal">
                {current.wyi.description}
              </p>
            </CardContent>
          </Card>

          {/* 6. SASMI Card */}
          <Card className="flex flex-col justify-between border-slate-200/80 dark:border-slate-800 shadow-sm hover:shadow-md transition-all duration-300 dark:bg-slate-900 bg-white group overflow-hidden relative rounded-2xl">
            <div className="absolute top-0 right-0 w-24 h-24 bg-emerald-500/10 rounded-full blur-2xl group-hover:bg-emerald-500/20 transition-all pointer-events-none" />
            <CardHeader className="pb-2.5">
              <div className="flex items-center justify-between">
                <div className="p-2 bg-emerald-50 dark:bg-emerald-950/60 rounded-xl text-emerald-600 dark:text-emerald-400">
                  <CloudRain className="h-5 w-5" />
                </div>
                <Badge variant="outline" className={`text-xs px-2.5 py-0.5 rounded-full ${getStatusBadgeClass(current.sasmi.status)}`}>
                  {current.sasmi.status}
                </Badge>
              </div>
              <div className="mt-2.5 space-y-0.5">
                <div className="flex items-center justify-between">
                  <span className="text-lg font-extrabold tracking-tight text-slate-900 dark:text-slate-100">
                    SASMI
                  </span>
                  <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-500 font-semibold">
                    #6
                  </span>
                </div>
                <p className="text-xs font-medium text-slate-500 dark:text-slate-400">
                  South Asian Summer Monsoon
                </p>
                <p className="text-[11px] font-mono text-slate-400 dark:text-slate-500 pt-0.5">
                  Teluk Benggala–India
                </p>
              </div>
            </CardHeader>

            <CardContent className="space-y-3 flex-1 pt-1">
              <div className="p-3 bg-slate-50 dark:bg-slate-800/60 rounded-xl border border-slate-100 dark:border-slate-800 flex items-center justify-between">
                <div>
                  <span className="text-[10px] uppercase tracking-wider text-slate-500 dark:text-slate-400 block font-semibold">
                    Komponen V
                  </span>
                  <span className="text-xl font-extrabold text-slate-900 dark:text-slate-100 font-mono tracking-tight tabular-nums">
                    {current.sasmi.value > 0 ? `+${current.sasmi.value}` : current.sasmi.value} <span className="text-xs font-sans font-medium text-slate-500">m/s</span>
                  </span>
                </div>
                <span className="text-[11px] font-semibold text-emerald-700 dark:text-emerald-300 text-right bg-emerald-50 dark:bg-emerald-950/60 px-2.5 py-1 rounded-lg border border-emerald-200/80 dark:border-emerald-800/60">
                  Sumatra Utara
                </span>
              </div>
              <p className="text-xs text-slate-600 dark:text-slate-300 line-clamp-2 leading-relaxed font-normal">
                {current.sasmi.description}
              </p>
            </CardContent>
          </Card>

          {/* 7. EASMI Card */}
          <Card className="flex flex-col justify-between border-slate-200/80 dark:border-slate-800 shadow-sm hover:shadow-md transition-all duration-300 dark:bg-slate-900 bg-white group overflow-hidden relative rounded-2xl">
            <div className="absolute top-0 right-0 w-24 h-24 bg-purple-500/10 rounded-full blur-2xl group-hover:bg-purple-500/20 transition-all pointer-events-none" />
            <CardHeader className="pb-2.5">
              <div className="flex items-center justify-between">
                <div className="p-2 bg-purple-50 dark:bg-purple-950/60 rounded-xl text-purple-600 dark:text-purple-400">
                  <Waves className="h-5 w-5" />
                </div>
                <Badge variant="outline" className={`text-xs px-2.5 py-0.5 rounded-full ${getStatusBadgeClass(current.easmi.status)}`}>
                  {current.easmi.status}
                </Badge>
              </div>
              <div className="mt-2.5 space-y-0.5">
                <div className="flex items-center justify-between">
                  <span className="text-lg font-extrabold tracking-tight text-slate-900 dark:text-slate-100">
                    EASMI
                  </span>
                  <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-500 font-semibold">
                    #7
                  </span>
                </div>
                <p className="text-xs font-medium text-slate-500 dark:text-slate-400">
                  East Asian Summer Monsoon
                </p>
                <p className="text-[11px] font-mono text-slate-400 dark:text-slate-500 pt-0.5">
                  Laut Cina Timur &amp; Front Meiyu
                </p>
              </div>
            </CardHeader>

            <CardContent className="space-y-3 flex-1 pt-1">
              <div className="p-3 bg-slate-50 dark:bg-slate-800/60 rounded-xl border border-slate-100 dark:border-slate-800 flex items-center justify-between">
                <div>
                  <span className="text-[10px] uppercase tracking-wider text-slate-500 dark:text-slate-400 block font-semibold">
                    Angin Musiman
                  </span>
                  <span className="text-xl font-extrabold text-slate-900 dark:text-slate-100 font-mono tracking-tight tabular-nums">
                    {current.easmi.value > 0 ? `+${current.easmi.value}` : current.easmi.value} <span className="text-xs font-sans font-medium text-slate-500">m/s</span>
                  </span>
                </div>
                <span className="text-[11px] font-semibold text-purple-700 dark:text-purple-300 text-right bg-purple-50 dark:bg-purple-950/60 px-2.5 py-1 rounded-lg border border-purple-200/80 dark:border-purple-800/60">
                  Front Meiyu-Baiu
                </span>
              </div>
              <p className="text-xs text-slate-600 dark:text-slate-300 line-clamp-2 leading-relaxed font-normal">
                {current.easmi.description}
              </p>
            </CardContent>
          </Card>

          {/* 8. BSISO1 Card */}
          <Card className="flex flex-col justify-between border-slate-200/80 dark:border-slate-800 shadow-sm hover:shadow-md transition-all duration-300 dark:bg-slate-900 bg-white group overflow-hidden relative rounded-2xl">
            <div className="absolute top-0 right-0 w-24 h-24 bg-blue-500/10 rounded-full blur-2xl group-hover:bg-blue-500/20 transition-all pointer-events-none" />
            <CardHeader className="pb-2.5">
              <div className="flex items-center justify-between">
                <div className="p-2 bg-blue-50 dark:bg-blue-950/60 rounded-xl text-blue-600 dark:text-blue-400">
                  <Layers className="h-5 w-5" />
                </div>
                <Badge variant="outline" className={`text-xs px-2.5 py-0.5 rounded-full ${getStatusBadgeClass(current.bsiso1.status)}`}>
                  {current.bsiso1.status}
                </Badge>
              </div>
              <div className="mt-2.5 space-y-0.5">
                <div className="flex items-center justify-between">
                  <span className="text-lg font-extrabold tracking-tight text-slate-900 dark:text-slate-100">
                    BSISO1
                  </span>
                  <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-500 font-semibold">
                    #8
                  </span>
                </div>
                <p className="text-xs font-medium text-slate-500 dark:text-slate-400">
                  Boreal Summer Intraseasonal 1
                </p>
                <p className="text-[11px] font-mono text-slate-400 dark:text-slate-500 pt-0.5">
                  Siklus Panjang 30–60 Hari
                </p>
              </div>
            </CardHeader>

            <CardContent className="space-y-3 flex-1 pt-1">
              <div className="p-3 bg-slate-50 dark:bg-slate-800/60 rounded-xl border border-slate-100 dark:border-slate-800 flex items-center justify-between">
                <div>
                  <span className="text-[10px] uppercase tracking-wider text-slate-500 dark:text-slate-400 block font-semibold">
                    Nilai Indeks
                  </span>
                  <span className="text-xl font-extrabold text-slate-900 dark:text-slate-100 font-mono tracking-tight tabular-nums">
                    {current.bsiso1.value > 0 ? `+${current.bsiso1.value}` : current.bsiso1.value}
                  </span>
                </div>
                <span className="text-[11px] font-semibold text-blue-700 dark:text-blue-300 text-right bg-blue-50 dark:bg-blue-950/60 px-2.5 py-1 rounded-lg border border-blue-200/80 dark:border-blue-800/60">
                  30–60 Hari
                </span>
              </div>
              <p className="text-xs text-slate-600 dark:text-slate-300 line-clamp-2 leading-relaxed font-normal">
                {current.bsiso1.description}
              </p>
            </CardContent>
          </Card>

          {/* 9. BSISO2 Card */}
          <Card className="flex flex-col justify-between border-slate-200/80 dark:border-slate-800 shadow-sm hover:shadow-md transition-all duration-300 dark:bg-slate-900 bg-white group overflow-hidden relative rounded-2xl">
            <div className="absolute top-0 right-0 w-24 h-24 bg-indigo-500/10 rounded-full blur-2xl group-hover:bg-indigo-500/20 transition-all pointer-events-none" />
            <CardHeader className="pb-2.5">
              <div className="flex items-center justify-between">
                <div className="p-2 bg-indigo-50 dark:bg-indigo-950/60 rounded-xl text-indigo-600 dark:text-indigo-400">
                  <Sparkles className="h-5 w-5" />
                </div>
                <Badge variant="outline" className={`text-xs px-2.5 py-0.5 rounded-full ${getStatusBadgeClass(current.bsiso2.status)}`}>
                  {current.bsiso2.status}
                </Badge>
              </div>
              <div className="mt-2.5 space-y-0.5">
                <div className="flex items-center justify-between">
                  <span className="text-lg font-extrabold tracking-tight text-slate-900 dark:text-slate-100">
                    BSISO2
                  </span>
                  <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-500 font-semibold">
                    #9
                  </span>
                </div>
                <p className="text-xs font-medium text-slate-500 dark:text-slate-400">
                  Boreal Summer Intraseasonal 2
                </p>
                <p className="text-[11px] font-mono text-slate-400 dark:text-slate-500 pt-0.5">
                  Kuasi Dua-Mingguan 10–23 Hari
                </p>
              </div>
            </CardHeader>

            <CardContent className="space-y-3 flex-1 pt-1">
              <div className="p-3 bg-slate-50 dark:bg-slate-800/60 rounded-xl border border-slate-100 dark:border-slate-800 flex items-center justify-between">
                <div>
                  <span className="text-[10px] uppercase tracking-wider text-slate-500 dark:text-slate-400 block font-semibold">
                    Nilai Indeks
                  </span>
                  <span className="text-xl font-extrabold text-slate-900 dark:text-slate-100 font-mono tracking-tight tabular-nums">
                    {current.bsiso2.value > 0 ? `+${current.bsiso2.value}` : current.bsiso2.value}
                  </span>
                </div>
                <span className="text-[11px] font-semibold text-indigo-700 dark:text-indigo-300 text-right bg-indigo-50 dark:bg-indigo-950/60 px-2.5 py-1 rounded-lg border border-indigo-200/80 dark:border-indigo-800/60">
                  10–23 Hari
                </span>
              </div>
              <p className="text-xs text-slate-600 dark:text-slate-300 line-clamp-2 leading-relaxed font-normal">
                {current.bsiso2.description}
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};
