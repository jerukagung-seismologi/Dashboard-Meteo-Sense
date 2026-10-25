// app/dashboard/climate-drivers/mjo/page.tsx
"use client";

import React, { useEffect, useState } from "react";
import useSWR from "swr";
import Link from "next/link";
import { Loader2, CloudRain, Activity, Compass, Zap, ArrowRight, Waves, Layers, BookOpen, TrendingUp } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { SubpageHeader } from "@/components/climate-drivers/SubpageHeader";
import { StatusBadge } from "@/components/climate-drivers/StatusBadge";
import { MJOCharts } from "@/components/climate-drivers/MJOCharts";
import { EcmwfMjoViewer } from "@/components/climate-drivers/EcmwfMjoViewer";
import { TropicalWavesViewer } from "@/components/climate-drivers/TropicalWavesViewer";
import { EducationalPanel } from "@/components/climate-drivers/EducationalPanel";
import { NcicsMapViewer } from "@/components/climate-drivers/NcicsMapViewer";
import { HistoryTable } from "@/components/climate-drivers/HistoryTable";
import { getMjoData } from "@/lib/climate-drivers/climateData";

const fetcher = (url: string) => fetch(url).then((res) => res.json());

export default function MjoSubpage() {
  const [refreshKey, setRefreshKey] = useState<number>(0);

  const { data: mjoApiData, isLoading, mutate: mutateMjo } = useSWR(
    `/api/climate-drivers/mjo${refreshKey ? `?_t=${refreshKey}&refresh=true` : ""}`,
    fetcher,
    { revalidateOnFocus: false, dedupingInterval: 0 }
  );

  const [mjoYears, setMjoYears] = useState(5);
  const [loadingMoreMjo, setLoadingMoreMjo] = useState(false);

  const { data: mjoHistoryData, mutate: mutateHistory } = useSWR(
    `/api/climate-drivers/mjo/history?years=${mjoYears}${refreshKey ? `&_t=${refreshKey}&refresh=true` : ""}`,
    fetcher,
    { revalidateOnFocus: false, dedupingInterval: 0 }
  );

  const handleRefresh = () => {
    setRefreshKey(Date.now());
    mutateMjo();
    mutateHistory();
  };

  const handleLoadMoreMjo = () => {
    setLoadingMoreMjo(true);
    setMjoYears((prev) => prev + 5);
  };

  useEffect(() => {
    if (mjoHistoryData) {
      setLoadingMoreMjo(false);
    }
  }, [mjoHistoryData]);

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

  return (
    <div className="space-y-6 pb-12">
      {/* Persistent Header Banner (Static on tab switch) */}
      <SubpageHeader
        title="MJO (Madden-Julian Oscillation)"
        subtitle="Analisis perambatan gelombang konveksi intraseasonal tropis di Samudra Hindia dan Indonesia"
        onRefresh={handleRefresh}
        isRefreshing={isLoading}
      />

      {isLoading && !mjoApiData ? (
        <div className="flex flex-col items-center justify-center min-h-[350px] gap-3 bg-white dark:bg-slate-900 rounded-2xl p-8 border dark:border-slate-800">
          <Loader2 className="h-8 w-8 animate-spin text-emerald-500" />
          <p className="text-sm text-slate-500 font-medium animate-pulse">
            Memuat data analisis MJO (Madden-Julian Oscillation)...
          </p>
        </div>
      ) : (
        <>

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
          <CardContent className="p-4 flex flex-col justify-between h-[115px]">
            <div className="flex justify-between items-center">
              <span className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Status MJO</span>
              <CloudRain className="h-4 w-4 text-emerald-500 shrink-0" />
            </div>
            <div className="my-1">
              <StatusBadge type="mjo" value={data.status} size="sm" />
            </div>
            <span className="text-[11px] text-slate-400 font-medium">Pembaruan: {data.lastUpdated}</span>
          </CardContent>
        </Card>

        {/* Phase */}
        <Card className="border-none shadow-sm dark:bg-slate-900 bg-white">
          <CardContent className="p-4 flex flex-col justify-between h-[115px]">
            <div className="flex justify-between items-center">
              <span className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Fase Berjalan</span>
              <Compass className="h-4 w-4 text-indigo-500 shrink-0" />
            </div>
            <div className="text-2xl font-extrabold font-mono tracking-tight tabular-nums text-slate-900 dark:text-slate-100">
              Fase {data.phase}
            </div>
            <span className="text-[11px] text-emerald-600 dark:text-emerald-400 font-medium">
              {data.phase === 4 || data.phase === 5 ? "🔴 Berada di Indonesia" : "Luar Indonesia"}
            </span>
          </CardContent>
        </Card>

        {/* Amplitude */}
        <Card className="border-none shadow-sm dark:bg-slate-900 bg-white">
          <CardContent className="p-4 flex flex-col justify-between h-[115px]">
            <div className="flex justify-between items-center">
              <span className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Amplitudo</span>
              <Activity className="h-4 w-4 text-teal-500 shrink-0" />
            </div>
            <div className="text-2xl font-extrabold font-mono tracking-tight tabular-nums text-teal-600 dark:text-teal-400">
              {data.amplitude.toFixed(2)}
            </div>
            <span className="text-[11px] text-slate-400 font-medium">Ambang Aktif: &ge; 1.0</span>
          </CardContent>
        </Card>

        {/* Convection over Maritime Continent */}
        <Card className="border-none shadow-sm dark:bg-slate-900 bg-white">
          <CardContent className="p-4 flex flex-col justify-between h-[115px]">
            <div className="flex justify-between items-center">
              <span className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Konveksi Indonesia</span>
              <Zap className="h-4 w-4 text-amber-500 shrink-0" />
            </div>
            <div className="my-1">
              <StatusBadge type="convection" value={data.convectionOverMC} size="sm" />
            </div>
            <span className="text-[11px] text-slate-400 font-medium">Benua Maritim (MC)</span>
          </CardContent>
        </Card>
      </div>

      {/* Banner Rekomendasi Menu Mandiri Dinamika Tropis */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between p-3.5 bg-gradient-to-r from-emerald-500/10 via-teal-500/10 to-blue-500/10 border border-emerald-200 dark:border-emerald-800 rounded-2xl gap-3">
        <div className="flex items-center gap-2.5">
          <div className="p-2 rounded-xl bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 shrink-0">
            <Waves className="h-5 w-5" />
          </div>
          <div>
            <div className="text-xs sm:text-sm font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
              <span>Tersedia Menu Khusus: Dinamika Atmosfer Tropis</span>
              <span className="text-[10px] uppercase font-extrabold px-1.5 py-0.5 rounded bg-emerald-100 dark:bg-emerald-900/60 text-emerald-800 dark:text-emerald-300">
                Menu Baru
              </span>
            </div>
            <p className="text-[11px] sm:text-xs text-slate-500 dark:text-slate-400">
              Analisis gelombang ekuatorial (Kelvin, Rossby, MRG, Hovmöller) kini dapat diakses langsung dari menu bilah sisi kiri secara mandiri.
            </p>
          </div>
        </div>
        <Link
          href="/dashboard/tropical-dynamics"
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold transition-all shrink-0 shadow-xs"
        >
          <span>Buka Dinamika Tropis</span>
          <ArrowRight className="h-3.5 w-3.5" />
        </Link>
      </div>

      {/* Modular Tab Navigation (Anti-Long-Scroll) */}
      <Tabs defaultValue="overview" className="w-full space-y-4">
        <TabsList className="grid grid-cols-2 md:grid-cols-4 h-auto p-1 bg-slate-100 dark:bg-slate-800 rounded-xl">
          <TabsTrigger
            value="overview"
            className="py-2.5 font-bold text-xs sm:text-sm flex items-center gap-1.5 tracking-tight"
          >
            <Compass className="h-4 w-4 text-indigo-500" />
            <span>Fase RMM &amp; ECMWF</span>
          </TabsTrigger>
          <TabsTrigger
            value="waves"
            className="py-2.5 font-bold text-xs sm:text-sm flex items-center gap-1.5 tracking-tight"
          >
            <Waves className="h-4 w-4 text-emerald-500" />
            <span>Gelombang Tropis BOM</span>
          </TabsTrigger>
          <TabsTrigger
            value="ncics"
            className="py-2.5 font-bold text-xs sm:text-sm flex items-center gap-1.5 tracking-tight"
          >
            <Layers className="h-4 w-4 text-blue-500" />
            <span>Satelit NCICS &amp; Hovmöller</span>
          </TabsTrigger>
          <TabsTrigger
            value="history"
            className="py-2.5 font-bold text-xs sm:text-sm flex items-center gap-1.5 tracking-tight"
          >
            <TrendingUp className="h-4 w-4 text-amber-500" />
            <span>Riwayat &amp; Edukasi</span>
          </TabsTrigger>
        </TabsList>

        {/* Tab 1: MJO RMM & ECMWF 46-Days */}
        <TabsContent value="overview" className="mt-0 space-y-6">
          <MJOCharts data={data} isDarkMode={isDarkMode} />
          <EcmwfMjoViewer />
        </TabsContent>

        {/* Tab 2: BOM Tropical Waves */}
        <TabsContent value="waves" className="mt-0">
          <TropicalWavesViewer />
        </TabsContent>

        {/* Tab 3: NCICS Satellite Maps */}
        <TabsContent value="ncics" className="mt-0">
          <NcicsMapViewer />
        </TabsContent>

        {/* Tab 4: History Table & Education */}
        <TabsContent value="history" className="mt-0 space-y-6">
          <HistoryTable
            type="mjo"
            title="Riwayat Historis MJO (Wheeler-Hendon RMM Index)"
            description="Data histori harian RMM1, RMM2, Fase MJO, Amplitudo, dan dampak terhadap konveksi Indonesia"
            data={mjoHistoryData?.data || []}
            yearsLoaded={mjoHistoryData?.daysLoaded ? Math.round(mjoHistoryData.daysLoaded / 365) : mjoYears}
            hasMore={mjoHistoryData?.hasMore ?? true}
            onLoadMore={handleLoadMoreMjo}
            isLoadingMore={loadingMoreMjo}
          />

          <EducationalPanel
            title="MJO"
            whatIsIt={data.interpretation.whatIsIt}
            indonesiaImpact={data.interpretation.indonesiaImpact}
            phaseMeanings={data.interpretation.phaseMeanings}
            currentAssessment={data.interpretation.currentAssessment}
          />
        </TabsContent>
      </Tabs>
        </>
      )}
    </div>
  );
}
