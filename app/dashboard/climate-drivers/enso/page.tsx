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
  const [refreshKey, setRefreshKey] = useState<number>(0);

  const { data: ensoApiData, isLoading, mutate: mutateEnso } = useSWR(
    `/api/climate-drivers/enso${refreshKey ? `?_t=${refreshKey}&refresh=true` : ""}`,
    fetcher,
    { revalidateOnFocus: false, dedupingInterval: 0 }
  );

  const [ensoYears, setEnsoYears] = useState(5);
  const [loadingMoreEnso, setLoadingMoreEnso] = useState(false);

  const { data: ensoHistoryData, mutate: mutateHistory } = useSWR(
    `/api/climate-drivers/enso/history?years=${ensoYears}${refreshKey ? `&_t=${refreshKey}&refresh=true` : ""}`,
    fetcher,
    { revalidateOnFocus: false, dedupingInterval: 0 }
  );

  const handleRefresh = () => {
    setRefreshKey(Date.now());
    mutateEnso();
    mutateHistory();
  };

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
        onRefresh={handleRefresh}
        isRefreshing={isLoading}
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
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-4">
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
            <span className="text-[11px] text-slate-400">Oceanic Niño Index</span>
          </CardContent>
        </Card>

        {/* Niño 1+2 */}
        <Card className="border-none shadow-sm dark:bg-slate-900 bg-white">
          <CardContent className="p-4 flex flex-col justify-between h-[110px]">
            <div className="flex justify-between items-center">
              <span className="text-xs font-semibold text-slate-500">Niño 1+2 (Pantai)</span>
              <Activity className="h-4 w-4 text-red-500" />
            </div>
            <div className="text-2xl font-black text-red-600 dark:text-red-400">
              {data.nino12 !== undefined && data.nino12 !== null
                ? `${data.nino12 >= 0 ? "+" : ""}${data.nino12.toFixed(2)}°C`
                : "-"}
            </div>
            <span className="text-[11px] text-slate-400">Peru &amp; Ekuador</span>
          </CardContent>
        </Card>

        {/* Niño 3 */}
        <Card className="border-none shadow-sm dark:bg-slate-900 bg-white">
          <CardContent className="p-4 flex flex-col justify-between h-[110px]">
            <div className="flex justify-between items-center">
              <span className="text-xs font-semibold text-slate-500">Niño 3 (Pasifik Timur)</span>
              <Activity className="h-4 w-4 text-orange-500" />
            </div>
            <div className="text-2xl font-black text-orange-600 dark:text-orange-400">
              {data.nino3 !== undefined && data.nino3 !== null
                ? `${data.nino3 >= 0 ? "+" : ""}${data.nino3.toFixed(2)}°C`
                : "-"}
            </div>
            <span className="text-[11px] text-slate-400">150°W - 90°W</span>
          </CardContent>
        </Card>

        {/* Niño 3.4 */}
        <Card className="border-none shadow-sm dark:bg-slate-900 bg-white border-l-4 border-l-indigo-500">
          <CardContent className="p-4 flex flex-col justify-between h-[110px]">
            <div className="flex justify-between items-center">
              <span className="text-xs font-bold text-indigo-600 dark:text-indigo-400">Niño 3.4 (Utama)</span>
              <Activity className="h-4 w-4 text-indigo-500" />
            </div>
            <div className="text-2xl font-black text-indigo-600 dark:text-indigo-400">
              {data.nino34 >= 0 ? `+${data.nino34.toFixed(2)}` : data.nino34.toFixed(2)}°C
            </div>
            <span className="text-[11px] text-slate-400">Indikator Standar ENSO</span>
          </CardContent>
        </Card>

        {/* Niño 4 */}
        <Card className="border-none shadow-sm dark:bg-slate-900 bg-white">
          <CardContent className="p-4 flex flex-col justify-between h-[110px]">
            <div className="flex justify-between items-center">
              <span className="text-xs font-semibold text-slate-500">Niño 4 (Pasifik Barat)</span>
              <ShieldAlert className="h-4 w-4 text-cyan-500" />
            </div>
            <div className="text-2xl font-black text-cyan-600 dark:text-cyan-400">
              {data.nino4 !== undefined && data.nino4 !== null
                ? `${data.nino4 >= 0 ? "+" : ""}${data.nino4.toFixed(2)}°C`
                : "-"}
            </div>
            <span className="text-[11px] text-slate-400">160°E - 150°W</span>
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
