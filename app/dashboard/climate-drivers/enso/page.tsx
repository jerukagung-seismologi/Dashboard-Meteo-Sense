// app/dashboard/climate-drivers/enso/page.tsx
"use client";

import React, { useEffect, useState } from "react";
import useSWR from "swr";
import { Loader2, Waves, ThermometerSun, Activity, ShieldAlert } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { SubpageHeader } from "@/components/climate-drivers/SubpageHeader";
import { StatusBadge } from "@/components/climate-drivers/StatusBadge";
import { ENSOCharts } from "@/components/climate-drivers/ENSOCharts";
import { EducationalPanel } from "@/components/climate-drivers/EducationalPanel";
import { HistoryTable } from "@/components/climate-drivers/HistoryTable";
import { getEnsoData } from "@/lib/climate-drivers/climateData";

const fetcher = (url: string) => fetch(url).then((res) => res.json());

export default function EnsoSubpage() {
  const { data: ensoApiData, isLoading } = useSWR("/api/climate-drivers/enso", fetcher, {
    revalidateOnFocus: false,
    dedupingInterval: 60000,
  });

  const [ensoYears, setEnsoYears] = useState(5);
  const [loadingMoreEnso, setLoadingMoreEnso] = useState(false);

  const { data: ensoHistoryData } = useSWR(
    `/api/climate-drivers/enso/history?years=${ensoYears}`,
    fetcher,
    { revalidateOnFocus: false, dedupingInterval: 60000 }
  );

  const handleLoadMoreEnso = () => {
    setLoadingMoreEnso(true);
    setEnsoYears((prev) => prev + 5);
  };

  useEffect(() => {
    if (ensoHistoryData) {
      setLoadingMoreEnso(false);
    }
  }, [ensoHistoryData]);

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

  const data = ensoApiData && !ensoApiData.error ? ensoApiData : getEnsoData();

  if (isLoading && !ensoApiData) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] gap-3">
        <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
        <p className="text-sm text-slate-500 font-medium animate-pulse">
          Memuat analisis ENSO (El Niño / La Niña)...
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-12">
      {/* Header */}
      <SubpageHeader
        title="ENSO (El Niño - Southern Oscillation)"
        subtitle="Analisis dinamika suhu permukaan laut dan tekanan udara Pasifik Ekuator"
      />

      {/* Official Data Source Banner */}
      <div className="flex items-center justify-between p-3 bg-blue-50/80 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-900 rounded-xl text-xs text-blue-900 dark:text-blue-200">
        <div className="flex items-center gap-2">
          <span className="font-bold">Sumber Data Resmi:</span>
          <span>{data.dataSource}</span>
          <span className="text-slate-400">|</span>
          <span className="text-slate-500 dark:text-slate-400">Produk: Oceanic Niño Index (ONI) &amp; Niño 3.4 SST</span>
        </div>
        <a
          href={data.sourceUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="font-semibold text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-1"
        >
          <span>Situs NOAA CPC</span> &rarr;
        </a>
      </div>

      {/* Current Status Overview Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
        {/* Status */}
        <Card className="border-none shadow-sm dark:bg-slate-900 bg-white">
          <CardContent className="p-4 flex flex-col justify-between h-[110px]">
            <div className="flex justify-between items-center">
              <span className="text-xs font-semibold text-slate-500">Status ENSO</span>
              <Waves className="h-4 w-4 text-blue-500" />
            </div>
            <div className="mt-1">
              <StatusBadge type="enso" value={data.status} size="md" />
            </div>
            <span className="text-[11px] text-slate-400">Pembaruan: {data.lastUpdated}</span>
          </CardContent>
        </Card>

        {/* ONI */}
        <Card className="border-none shadow-sm dark:bg-slate-900 bg-white">
          <CardContent className="p-4 flex flex-col justify-between h-[110px]">
            <div className="flex justify-between items-center">
              <span className="text-xs font-semibold text-slate-500">Indeks ONI</span>
              <ThermometerSun className="h-4 w-4 text-amber-500" />
            </div>
            <div className="text-2xl font-black text-slate-900 dark:text-slate-100">
              {data.oni >= 0 ? `+${data.oni.toFixed(1)}` : data.oni.toFixed(1)}°C
            </div>
            <span className="text-[11px] text-slate-400">Ambang El Niño: +0.5°C</span>
          </CardContent>
        </Card>

        {/* Niño 3.4 */}
        <Card className="border-none shadow-sm dark:bg-slate-900 bg-white">
          <CardContent className="p-4 flex flex-col justify-between h-[110px]">
            <div className="flex justify-between items-center">
              <span className="text-xs font-semibold text-slate-500">SST Anomali Niño 3.4</span>
              <Activity className="h-4 w-4 text-purple-500" />
            </div>
            <div className="text-2xl font-black text-purple-600 dark:text-purple-400">
              {data.nino34 >= 0 ? `+${data.nino34.toFixed(2)}` : data.nino34.toFixed(2)}°C
            </div>
            <span className="text-[11px] text-slate-400">Kawasan Pasifik Ekuator</span>
          </CardContent>
        </Card>

        {/* SOI */}
        <Card className="border-none shadow-sm dark:bg-slate-900 bg-white">
          <CardContent className="p-4 flex flex-col justify-between h-[110px]">
            <div className="flex justify-between items-center">
              <span className="text-xs font-semibold text-slate-500">Indeks SOI</span>
              <ShieldAlert className="h-4 w-4 text-emerald-500" />
            </div>
            <div className="text-2xl font-black text-emerald-600 dark:text-emerald-400">
              {data.soi >= 0 ? `+${data.soi.toFixed(1)}` : data.soi.toFixed(1)}
            </div>
            <span className="text-[11px] text-slate-400">Tahiti vs Darwin</span>
          </CardContent>
        </Card>
      </div>

      {/* Interactive Visualizations */}
      <ENSOCharts data={data} isDarkMode={isDarkMode} />

      {/* 5-Year Server Historical Data Table with Load More */}
      <HistoryTable
        type="enso"
        title="Riwayat Historis ENSO (El Niño / La Niña)"
        description="Data histori mingguan Anomali SST Niño 3.4 dan klasifikasi status resmi NOAA/BOM"
        data={ensoHistoryData?.data || []}
        yearsLoaded={ensoHistoryData?.yearsLoaded || ensoYears}
        hasMore={ensoHistoryData?.hasMore ?? true}
        onLoadMore={handleLoadMoreEnso}
        isLoadingMore={loadingMoreEnso}
      />

      {/* Educational & Scientific Explanation */}
      <EducationalPanel
        title="ENSO"
        whatIsIt={data.interpretation.whatIsIt}
        indonesiaImpact={data.interpretation.indonesiaImpact}
        phaseComparison={data.interpretation.phaseDifference}
        currentAssessment={data.interpretation.currentAssessment}
      />
    </div>
  );
}
