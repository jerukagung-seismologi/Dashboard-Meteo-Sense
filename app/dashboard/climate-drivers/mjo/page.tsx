// app/dashboard/climate-drivers/mjo/page.tsx
"use client";

import React, { useEffect, useState } from "react";
import useSWR from "swr";
import { Loader2, CloudRain, Activity, Compass, Zap } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { SubpageHeader } from "@/components/climate-drivers/SubpageHeader";
import { StatusBadge } from "@/components/climate-drivers/StatusBadge";
import { MJOCharts } from "@/components/climate-drivers/MJOCharts";
import { EducationalPanel } from "@/components/climate-drivers/EducationalPanel";
import { NcicsMapViewer } from "@/components/climate-drivers/NcicsMapViewer";
import { getMjoData } from "@/lib/climate-drivers/climateData";

const fetcher = (url: string) => fetch(url).then((res) => res.json());

export default function MjoSubpage() {
  const { data: mjoApiData, isLoading } = useSWR("/api/climate-drivers/mjo", fetcher, {
    revalidateOnFocus: false,
    dedupingInterval: 60000,
  });

  const [isDarkMode, setIsDarkMode] = useState(false);

  useEffect(() => {
    const checkDarkMode = () => {
      setIsDarkMode(document.documentElement.classList.contains("dark"));
    };
    checkDarkMode();
    const observer = new MutationObserver(checkDarkMode);
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ["class"] });
    return () => observer.disconnect();
  }, []);

  const data = mjoApiData && !mjoApiData.error ? mjoApiData : getMjoData();

  if (isLoading && !mjoApiData) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] gap-3">
        <Loader2 className="h-8 w-8 animate-spin text-emerald-500" />
        <p className="text-sm text-slate-500 font-medium animate-pulse">
          Memuat analisis MJO (Madden-Julian Oscillation)...
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-12">
      {/* Header */}
      <SubpageHeader
        title="MJO (Madden-Julian Oscillation)"
        subtitle="Analisis perambatan gelombang konveksi intraseasonal tropis di Samudra Hindia dan Indonesia"
      />

      {/* Official Data Source Banner */}
      <div className="flex items-center justify-between p-3 bg-emerald-50/80 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-900 rounded-xl text-xs text-emerald-900 dark:text-emerald-200">
        <div className="flex items-center gap-2">
          <span className="font-bold">Sumber Data Resmi:</span>
          <span>{data.dataSource}</span>
          <span className="text-slate-400">|</span>
          <span className="text-slate-500 dark:text-slate-400">Produk: Real-time Multivariate MJO (RMM1 &amp; RMM2)</span>
        </div>
        <a
          href={data.sourceUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="font-semibold text-emerald-600 dark:text-emerald-400 hover:underline flex items-center gap-1"
        >
          <span>Situs BOM Australia</span> &rarr;
        </a>
      </div>

      {/* Current Status Overview Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
        {/* Status */}
        <Card className="border-none shadow-sm dark:bg-slate-900 bg-white">
          <CardContent className="p-4 flex flex-col justify-between h-[110px]">
            <div className="flex justify-between items-center">
              <span className="text-xs font-semibold text-slate-500">Status MJO</span>
              <CloudRain className="h-4 w-4 text-emerald-500" />
            </div>
            <div className="mt-1">
              <StatusBadge type="mjo" value={data.status} size="md" />
            </div>
            <span className="text-[11px] text-slate-400">Pembaruan: {data.lastUpdated}</span>
          </CardContent>
        </Card>

        {/* Phase */}
        <Card className="border-none shadow-sm dark:bg-slate-900 bg-white">
          <CardContent className="p-4 flex flex-col justify-between h-[110px]">
            <div className="flex justify-between items-center">
              <span className="text-xs font-semibold text-slate-500">Fase Berjalan</span>
              <Compass className="h-4 w-4 text-indigo-500" />
            </div>
            <div className="text-2xl font-black text-slate-900 dark:text-slate-100">
              Fase {data.phase}
            </div>
            <span className="text-[11px] text-emerald-600 dark:text-emerald-400 font-medium">
              {data.phase === 4 || data.phase === 5 ? "🔴 Berada di Indonesia" : "Luar Indonesia"}
            </span>
          </CardContent>
        </Card>

        {/* Amplitude */}
        <Card className="border-none shadow-sm dark:bg-slate-900 bg-white">
          <CardContent className="p-4 flex flex-col justify-between h-[110px]">
            <div className="flex justify-between items-center">
              <span className="text-xs font-semibold text-slate-500">Amplitudo</span>
              <Activity className="h-4 w-4 text-teal-500" />
            </div>
            <div className="text-2xl font-black text-teal-600 dark:text-teal-400">
              {data.amplitude.toFixed(2)}
            </div>
            <span className="text-[11px] text-slate-400">Ambang Aktif: &ge; 1.0</span>
          </CardContent>
        </Card>

        {/* Convection over Maritime Continent */}
        <Card className="border-none shadow-sm dark:bg-slate-900 bg-white">
          <CardContent className="p-4 flex flex-col justify-between h-[110px]">
            <div className="flex justify-between items-center">
              <span className="text-xs font-semibold text-slate-500">Konveksi Indonesia</span>
              <Zap className="h-4 w-4 text-amber-500" />
            </div>
            <div className="mt-1">
              <StatusBadge type="convection" value={data.convectionOverMC} size="md" />
            </div>
            <span className="text-[11px] text-slate-400">Maritime Continent</span>
          </CardContent>
        </Card>
      </div>

      {/* Interactive Visualizations */}
      <MJOCharts data={data} isDarkMode={isDarkMode} />

      {/* NCICS Satellite & Wave Diagnostics Map Section */}
      <div className="pt-2">
        <NcicsMapViewer />
      </div>

      {/* Educational & Scientific Explanation */}
      <EducationalPanel
        title="MJO"
        whatIsIt={data.interpretation.whatIsIt}
        indonesiaImpact={data.interpretation.indonesiaImpact}
        phaseMeanings={data.interpretation.phaseMeanings}
        currentAssessment={data.interpretation.currentAssessment}
      />
    </div>
  );
}
