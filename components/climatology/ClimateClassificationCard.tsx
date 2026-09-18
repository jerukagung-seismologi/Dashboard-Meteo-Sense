// components/climatology/ClimateClassificationCard.tsx
"use client";

import React from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Sprout, Trees, Globe, CheckCircle2, AlertCircle, Droplet, SunMedium } from "lucide-react";
import type { ComprehensiveClimateClassification } from "@/lib/climatology/climateClassification";

interface ClimateClassificationCardProps {
  classification: ComprehensiveClimateClassification | null;
  isDarkMode?: boolean;
}

export function ClimateClassificationCard({
  classification,
  isDarkMode = false,
}: ClimateClassificationCardProps) {
  if (!classification) return null;

  const { oldeman, schmidtFerguson, koppen, monthlyRainfall, annualRainfall, driestMonthRain } = classification;

  const monthNames = ["Jan", "Feb", "Mar", "Apr", "Mei", "Jun", "Jul", "Agu", "Sep", "Okt", "Nov", "Des"];

  // Oldeman zone colors
  const oldemanBadgeColors: Record<string, string> = {
    A: "bg-blue-600 text-white",
    B: "bg-teal-600 text-white",
    C: "bg-emerald-600 text-white",
    D: "bg-amber-600 text-white",
    E: "bg-rose-600 text-white",
  };

  // Schmidt-Ferguson type colors
  const sfBadgeColors: Record<string, string> = {
    A: "bg-blue-600 text-white",
    B: "bg-cyan-600 text-white",
    C: "bg-emerald-600 text-white",
    D: "bg-teal-600 text-white",
    E: "bg-amber-600 text-white",
    F: "bg-orange-600 text-white",
    G: "bg-red-600 text-white",
    H: "bg-purple-600 text-white",
  };

  return (
    <div className="space-y-6">
      {/* 3 Climate Classification Pillars */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* 1. Oldeman (1975) Card */}
        <Card className="border-none shadow-sm dark:bg-slate-900 bg-white flex flex-col justify-between overflow-hidden">
          <div>
            <CardHeader className="pb-3 border-b dark:border-slate-800 bg-emerald-50/50 dark:bg-emerald-950/20">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="p-2 rounded-lg bg-emerald-100 dark:bg-emerald-900/50 text-emerald-600 dark:text-emerald-400">
                    <Sprout className="h-5 w-5" />
                  </div>
                  <div>
                    <CardTitle className="text-sm font-bold text-slate-900 dark:text-slate-100">
                      Klasifikasi Oldeman (1975)
                    </CardTitle>
                    <CardDescription className="text-[11px] text-slate-500">
                      Standar Agroklimatologi Pangan Indonesia
                    </CardDescription>
                  </div>
                </div>
                <Badge className={`text-base font-black px-3 py-1 ${oldemanBadgeColors[oldeman.zone] || "bg-emerald-600 text-white"}`}>
                  {oldeman.code}
                </Badge>
              </div>
            </CardHeader>

            <CardContent className="p-4 space-y-4 text-xs">
              <div className="space-y-1">
                <div className="font-bold text-slate-800 dark:text-slate-200 text-sm">
                  {oldeman.title}
                </div>
                <p className="text-slate-500 dark:text-slate-400 text-[11px] leading-relaxed">
                  {oldeman.description}
                </p>
              </div>

              {/* Bulan Basah/Kering Oldeman */}
              <div className="grid grid-cols-3 gap-2 p-2.5 bg-slate-50 dark:bg-slate-800/60 rounded-lg text-center">
                <div className="space-y-0.5">
                  <span className="text-[10px] text-blue-600 font-bold block">Bulan Basah</span>
                  <div className="text-base font-black text-slate-800 dark:text-slate-100">{oldeman.wetMonths} bln</div>
                  <span className="text-[9px] text-slate-400">&gt;200 mm</span>
                </div>
                <div className="space-y-0.5">
                  <span className="text-[10px] text-teal-600 font-bold block">Bulan Lembap</span>
                  <div className="text-base font-black text-slate-800 dark:text-slate-100">{oldeman.humidMonths} bln</div>
                  <span className="text-[9px] text-slate-400">100–200 mm</span>
                </div>
                <div className="space-y-0.5">
                  <span className="text-[10px] text-amber-600 font-bold block">Bulan Kering</span>
                  <div className="text-base font-black text-slate-800 dark:text-slate-100">{oldeman.dryMonths} bln</div>
                  <span className="text-[9px] text-slate-400">&lt;100 mm</span>
                </div>
              </div>

              {/* Rekomendasi Pola Tanam */}
              <div className="p-3 bg-emerald-50/70 dark:bg-emerald-950/30 rounded-xl border border-emerald-200 dark:border-emerald-900/50 space-y-1">
                <span className="font-bold text-emerald-900 dark:text-emerald-200 flex items-center gap-1.5 text-[11px]">
                  <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />
                  Rekomendasi Pola Tanam Lahan:
                </span>
                <p className="text-[11px] text-emerald-800 dark:text-emerald-300 leading-relaxed">
                  {oldeman.farmingRecommendation}
                </p>
              </div>
            </CardContent>
          </div>

          <div className="p-3 bg-slate-50 dark:bg-slate-800/40 border-t dark:border-slate-800 text-[10px] text-slate-400 flex items-center justify-between">
            <span>BB Berurutan: <strong>{oldeman.maxConsecutiveWet} bln</strong></span>
            <span>BK Berurutan: <strong>{oldeman.maxConsecutiveDry} bln</strong></span>
          </div>
        </Card>

        {/* 2. Schmidt-Ferguson (1951) Card */}
        <Card className="border-none shadow-sm dark:bg-slate-900 bg-white flex flex-col justify-between overflow-hidden">
          <div>
            <CardHeader className="pb-3 border-b dark:border-slate-800 bg-cyan-50/50 dark:bg-cyan-950/20">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="p-2 rounded-lg bg-cyan-100 dark:bg-cyan-900/50 text-cyan-600 dark:text-cyan-400">
                    <Trees className="h-5 w-5" />
                  </div>
                  <div>
                    <CardTitle className="text-sm font-bold text-slate-900 dark:text-slate-100">
                      Schmidt-Ferguson (1951)
                    </CardTitle>
                    <CardDescription className="text-[11px] text-slate-500">
                      Kriteria Mohr untuk Kehutanan &amp; Perkebunan
                    </CardDescription>
                  </div>
                </div>
                <Badge className={`text-base font-black px-3 py-1 ${sfBadgeColors[schmidtFerguson.type] || "bg-cyan-600 text-white"}`}>
                  Tipe {schmidtFerguson.type}
                </Badge>
              </div>
            </CardHeader>

            <CardContent className="p-4 space-y-4 text-xs">
              <div className="space-y-1">
                <div className="font-bold text-slate-800 dark:text-slate-200 text-sm">
                  {schmidtFerguson.title}
                </div>
                <p className="text-slate-500 dark:text-slate-400 text-[11px] leading-relaxed">
                  {schmidtFerguson.description}
                </p>
              </div>

              {/* Nilai Q dan Kriteria Mohr */}
              <div className="grid grid-cols-3 gap-2 p-2.5 bg-slate-50 dark:bg-slate-800/60 rounded-lg text-center">
                <div className="space-y-0.5">
                  <span className="text-[10px] text-slate-500 font-bold block">Nilai Q (%)</span>
                  <div className="text-base font-black text-cyan-600 dark:text-cyan-400 font-mono">
                    {schmidtFerguson.qValue}%
                  </div>
                  <span className="text-[9px] text-slate-400">(BK/BB)×100%</span>
                </div>
                <div className="space-y-0.5">
                  <span className="text-[10px] text-blue-600 font-bold block">BB Mohr</span>
                  <div className="text-base font-black text-slate-800 dark:text-slate-100 font-mono">
                    {schmidtFerguson.wetMonthsMohr} bln
                  </div>
                  <span className="text-[9px] text-slate-400">&gt;100 mm</span>
                </div>
                <div className="space-y-0.5">
                  <span className="text-[10px] text-amber-600 font-bold block">BK Mohr</span>
                  <div className="text-base font-black text-slate-800 dark:text-slate-100 font-mono">
                    {schmidtFerguson.dryMonthsMohr} bln
                  </div>
                  <span className="text-[9px] text-slate-400">&lt;60 mm</span>
                </div>
              </div>

              {/* Vegetasi & Ekosistem Alami */}
              <div className="p-3 bg-cyan-50/70 dark:bg-cyan-950/30 rounded-xl border border-cyan-200 dark:border-cyan-900/50 space-y-1">
                <span className="font-bold text-cyan-900 dark:text-cyan-200 flex items-center gap-1.5 text-[11px]">
                  <Trees className="h-3.5 w-3.5 text-cyan-600" />
                  Vegetasi Alami &amp; Kesesuaian Hutan:
                </span>
                <p className="text-[11px] text-cyan-800 dark:text-cyan-300 leading-relaxed">
                  {schmidtFerguson.vegetationType}
                </p>
              </div>
            </CardContent>
          </div>

          <div className="p-3 bg-slate-50 dark:bg-slate-800/40 border-t dark:border-slate-800 text-[10px] text-slate-400 flex items-center justify-between">
            <span>Rasio Q Desimal: <strong>{schmidtFerguson.qRatio}</strong></span>
            <span>Bulan Lembap (60–100mm): <strong>{schmidtFerguson.humidMonthsMohr} bln</strong></span>
          </div>
        </Card>

        {/* 3. Köppen-Geiger Card */}
        <Card className="border-none shadow-sm dark:bg-slate-900 bg-white flex flex-col justify-between overflow-hidden">
          <div>
            <CardHeader className="pb-3 border-b dark:border-slate-800 bg-indigo-50/50 dark:bg-indigo-950/20">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="p-2 rounded-lg bg-indigo-100 dark:bg-indigo-900/50 text-indigo-600 dark:text-indigo-400">
                    <Globe className="h-5 w-5" />
                  </div>
                  <div>
                    <CardTitle className="text-sm font-bold text-slate-900 dark:text-slate-100">
                      Köppen-Geiger (WMO)
                    </CardTitle>
                    <CardDescription className="text-[11px] text-slate-500">
                      Standar Taksonomi Iklim Global
                    </CardDescription>
                  </div>
                </div>
                <Badge className="text-base font-black px-3 py-1 bg-indigo-600 text-white">
                  {koppen.code}
                </Badge>
              </div>
            </CardHeader>

            <CardContent className="p-4 space-y-4 text-xs">
              <div className="space-y-1">
                <div className="font-bold text-slate-800 dark:text-slate-200 text-sm">
                  {koppen.name}
                </div>
                <p className="text-slate-500 dark:text-slate-400 text-[11px] leading-relaxed">
                  {koppen.description}
                </p>
              </div>

              {/* Diagnostik Kriteria Köppen */}
              <div className="grid grid-cols-2 gap-2 p-2.5 bg-slate-50 dark:bg-slate-800/60 rounded-lg text-center">
                <div className="space-y-0.5">
                  <span className="text-[10px] text-slate-500 font-bold block">Total Hujan Tahunan</span>
                  <div className="text-base font-black text-indigo-600 dark:text-indigo-400 font-mono">
                    {annualRainfall} mm
                  </div>
                </div>
                <div className="space-y-0.5">
                  <span className="text-[10px] text-slate-500 font-bold block">Bulan Terkering</span>
                  <div className="text-base font-black text-amber-600 dark:text-amber-400 font-mono">
                    {driestMonthRain} mm
                  </div>
                </div>
              </div>

              {/* Aturan Formula Köppen */}
              <div className="p-3 bg-indigo-50/70 dark:bg-indigo-950/30 rounded-xl border border-indigo-200 dark:border-indigo-900/50 space-y-1">
                <span className="font-bold text-indigo-900 dark:text-indigo-200 flex items-center gap-1.5 text-[11px]">
                  <CheckCircle2 className="h-3.5 w-3.5 text-indigo-600" />
                  Kondisi Batas Köppen Tropis:
                </span>
                <p className="text-[11px] text-indigo-800 dark:text-indigo-300 leading-relaxed">
                  {koppen.code === "Af" && "Bulan terkering ≥ 60 mm (Hutan hujan tanpa defisit air)."}
                  {koppen.code === "Am" && `Bulan terkering < 60 mm tetapi ≥ ${Math.round(100 - annualRainfall / 25)} mm (Kompensasi monsun basah).`}
                  {koppen.code === "Aw" && `Bulan terkering < ${Math.round(100 - annualRainfall / 25)} mm (Sabana dengan defisit kering tegas).`}
                </p>
              </div>
            </CardContent>
          </div>

          <div className="p-3 bg-slate-50 dark:bg-slate-800/40 border-t dark:border-slate-800 text-[10px] text-slate-400 flex items-center justify-between">
            <span>Zona Utama: <strong>A (Tropis Lembap)</strong></span>
            <span>Rerata Suhu Bulanan: <strong>&gt;18 °C sepanjang tahun</strong></span>
          </div>
        </Card>
      </div>

      {/* Profil Distribusi Curah Hujan Bulanan Normal & Ambang Batas Klasifikasi */}
      <Card className="border-none shadow-sm dark:bg-slate-900 bg-white">
        <CardHeader className="pb-2 border-b dark:border-slate-800">
          <CardTitle className="text-xs sm:text-sm font-bold flex items-center gap-2">
            <Droplet className="h-4 w-4 text-teal-500" />
            Distribusi 12 Bulan Normal (1991–2020) &amp; Status Ambang Batas Iklim
          </CardTitle>
        </CardHeader>
        <CardContent className="p-4">
          <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-12 gap-2 text-center text-xs">
            {monthlyRainfall.map((rain, idx) => {
              const isOldemanWet = rain > 200;
              const isOldemanHumid = rain >= 100 && rain <= 200;
              const isMohrDry = rain < 60;

              return (
                <div
                  key={idx}
                  className={`p-2.5 rounded-xl border flex flex-col justify-between space-y-1 transition ${
                    isOldemanWet
                      ? "bg-blue-50/70 border-blue-200 dark:bg-blue-950/40 dark:border-blue-900"
                      : isOldemanHumid
                      ? "bg-teal-50/70 border-teal-200 dark:bg-teal-950/40 dark:border-teal-900"
                      : isMohrDry
                      ? "bg-rose-50/70 border-rose-200 dark:bg-rose-950/40 dark:border-rose-900"
                      : "bg-amber-50/70 border-amber-200 dark:bg-amber-950/40 dark:border-amber-900"
                  }`}
                >
                  <span className="font-bold text-slate-700 dark:text-slate-300 text-xs">
                    {monthNames[idx]}
                  </span>
                  <div className="text-sm font-black font-mono text-slate-900 dark:text-slate-100">
                    {rain.toFixed(0)} <span className="text-[9px] font-normal">mm</span>
                  </div>
                  <div className="space-y-0.5 pt-1 border-t dark:border-slate-800/60">
                    <span
                      className={`text-[9px] px-1.5 py-0.5 rounded font-bold block ${
                        isOldemanWet
                          ? "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200"
                          : isOldemanHumid
                          ? "bg-teal-100 text-teal-800 dark:bg-teal-900 dark:text-teal-200"
                          : "bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-200"
                      }`}
                    >
                      Oldeman: {isOldemanWet ? "BB" : isOldemanHumid ? "BL" : "BK"}
                    </span>
                    <span
                      className={`text-[9px] px-1.5 py-0.5 rounded font-medium block ${
                        rain > 100
                          ? "text-blue-700 dark:text-blue-300"
                          : isMohrDry
                          ? "text-red-700 dark:text-red-300 font-bold"
                          : "text-amber-700 dark:text-amber-300"
                      }`}
                    >
                      Mohr: {rain > 100 ? "BB" : isMohrDry ? "BK" : "BL"}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>

          <div className="mt-3 flex items-center justify-center gap-4 flex-wrap text-[11px] text-slate-500">
            <div className="flex items-center gap-1.5">
              <span className="h-2.5 w-2.5 rounded-full bg-blue-500" /> Bulan Basah Oldeman (&gt;200 mm)
            </div>
            <div className="flex items-center gap-1.5">
              <span className="h-2.5 w-2.5 rounded-full bg-teal-500" /> Bulan Lembap (100–200 mm)
            </div>
            <div className="flex items-center gap-1.5">
              <span className="h-2.5 w-2.5 rounded-full bg-amber-500" /> Bulan Kering (&lt;100 mm)
            </div>
            <div className="flex items-center gap-1.5">
              <span className="h-2.5 w-2.5 rounded-full bg-rose-500" /> Bulan Kering Mohr (&lt;60 mm)
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
