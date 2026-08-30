// app/dashboard/climate-drivers/iod/page.tsx
"use client";

import React, { useEffect, useState } from "react";
import useSWR from "swr";
import { Loader2, Compass, ThermometerSun, Layers, Calendar } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { SubpageHeader } from "@/components/climate-drivers/SubpageHeader";
import { StatusBadge } from "@/components/climate-drivers/StatusBadge";
import { IODCharts } from "@/components/climate-drivers/IODCharts";
import { EducationalPanel } from "@/components/climate-drivers/EducationalPanel";
import { HistoryTable } from "@/components/climate-drivers/HistoryTable";
import { getIodData } from "@/lib/climate-drivers/climateData";

const fetcher = (url: string) => fetch(url).then((res) => res.json());

export default function IodSubpage() {
  const [refreshKey, setRefreshKey] = useState<number>(0);

  const { data: iodApiData, isLoading, mutate: mutateIod } = useSWR(
    `/api/climate-drivers/iod${refreshKey ? `?_t=${refreshKey}&refresh=true` : ""}`,
    fetcher,
    { revalidateOnFocus: false, dedupingInterval: 0 }
  );

  const [iodYears, setIodYears] = useState(5);
  const [loadingMoreIod, setLoadingMoreIod] = useState(false);

  const { data: iodHistoryData, mutate: mutateHistory } = useSWR(
    `/api/climate-drivers/iod/history?years=${iodYears}${refreshKey ? `&_t=${refreshKey}&refresh=true` : ""}`,
    fetcher,
    { revalidateOnFocus: false, dedupingInterval: 0 }
  );

  const handleRefresh = () => {
    setRefreshKey(Date.now());
    mutateIod();
    mutateHistory();
  };

  const handleLoadMoreIod = () => {
    setLoadingMoreIod(true);
    setIodYears((prev) => prev + 5);
  };

  useEffect(() => {
    if (iodHistoryData) {
      setLoadingMoreIod(false);
    }
  }, [iodHistoryData]);

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

  const data = iodApiData && !iodApiData.error ? iodApiData : getIodData();

  return (
    <div className="space-y-6 pb-12">
      {/* Persistent Header Banner (Static on tab switch) */}
      <SubpageHeader
        title="IOD (Indian Ocean Dipole)"
        subtitle="Analisis fenomena dipol suhu permukaan laut Samudra Hindia bagian Barat dan Timur"
        onRefresh={handleRefresh}
        isRefreshing={isLoading}
      />

      {isLoading && !iodApiData ? (
        <div className="flex flex-col items-center justify-center min-h-[350px] gap-3 bg-white dark:bg-slate-900 rounded-2xl p-8 border dark:border-slate-800">
          <Loader2 className="h-8 w-8 animate-spin text-amber-500" />
          <p className="text-sm text-slate-500 font-medium animate-pulse">
            Memuat data analisis IOD (Indian Ocean Dipole)...
          </p>
        </div>
      ) : (
        <>

      {/* Official Data Source Banner */}
      <div className="flex items-center justify-between p-3 bg-amber-50/80 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-900 rounded-xl text-xs text-amber-900 dark:text-amber-200">
        <div className="flex items-center gap-2">
          <span className="font-bold">Sumber Data Resmi:</span>
          <span>{data.dataSource}</span>
          <span className="text-slate-400">|</span>
          <span className="text-slate-500 dark:text-slate-400">Produk: Dipole Mode Index (DMI)</span>
        </div>
        <a
          href={data.sourceUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="font-semibold text-amber-600 dark:text-amber-400 hover:underline flex items-center gap-1"
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
              <span className="text-xs font-semibold text-slate-500">Status IOD</span>
              <Compass className="h-4 w-4 text-amber-500" />
            </div>
            <div className="mt-1">
              <StatusBadge type="iod" value={data.status} size="md" />
            </div>
            <span className="text-[11px] text-slate-400">Pembaruan: {data.lastUpdated}</span>
          </CardContent>
        </Card>

        {/* DMI Index */}
        <Card className="border-none shadow-sm dark:bg-slate-900 bg-white">
          <CardContent className="p-4 flex flex-col justify-between h-[110px]">
            <div className="flex justify-between items-center">
              <span className="text-xs font-semibold text-slate-500">Indeks DMI</span>
              <ThermometerSun className="h-4 w-4 text-amber-600" />
            </div>
            <div className="text-2xl font-black text-amber-600 dark:text-amber-400">
              {data.dmi >= 0 ? `+${data.dmi.toFixed(2)}` : data.dmi.toFixed(2)}°C
            </div>
            <span className="text-[11px] text-slate-400">Ambang Positif: +0.4°C</span>
          </CardContent>
        </Card>

        {/* Impact Area */}
        <Card className="border-none shadow-sm dark:bg-slate-900 bg-white">
          <CardContent className="p-4 flex flex-col justify-between h-[110px]">
            <div className="flex justify-between items-center">
              <span className="text-xs font-semibold text-slate-500">Kawasan Terdampak</span>
              <Layers className="h-4 w-4 text-indigo-500" />
            </div>
            <div className="text-base font-bold text-slate-900 dark:text-slate-100 mt-1">
              Indonesia Barat & Selatan
            </div>
            <span className="text-[11px] text-slate-400">Sumatra, Jawa, Bali, NTB, NTT</span>
          </CardContent>
        </Card>

        {/* Season Peak */}
        <Card className="border-none shadow-sm dark:bg-slate-900 bg-white">
          <CardContent className="p-4 flex flex-col justify-between h-[110px]">
            <div className="flex justify-between items-center">
              <span className="text-xs font-semibold text-slate-500">Puncak Pengaruh</span>
              <Calendar className="h-4 w-4 text-blue-500" />
            </div>
            <div className="text-base font-bold text-slate-900 dark:text-slate-100 mt-1">
              Juli - November
            </div>
            <span className="text-[11px] text-slate-400">Kemarau & Transisi</span>
          </CardContent>
        </Card>
      </div>

      {/* Interactive Visualizations */}
      <IODCharts data={data} isDarkMode={isDarkMode} />

      {/* 5-Year Server Historical Data Table with Load More */}
      <HistoryTable
        type="iod"
        title="Riwayat Historis IOD (Indian Ocean Dipole)"
        description="Data histori mingguan Dipole Mode Index (DMI) dan klasifikasi status resmi BOM Australia"
        data={iodHistoryData?.data || []}
        yearsLoaded={iodHistoryData?.yearsLoaded || iodYears}
        hasMore={iodHistoryData?.hasMore ?? true}
        onLoadMore={handleLoadMoreIod}
        isLoadingMore={loadingMoreIod}
      />

      {/* Educational & Scientific Explanation */}
      <EducationalPanel
        title="IOD"
        whatIsIt={data.interpretation.whatIsIt}
        indonesiaImpact={data.interpretation.indonesiaImpact}
        positiveIod={data.interpretation.positiveIod}
        negativeIod={data.interpretation.negativeIod}
        currentAssessment={data.interpretation.currentAssessment}
      />
        </>
      )}
    </div>
  );
}
