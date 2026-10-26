// app/dashboard/tropical-dynamics/page.tsx
"use client";

import React, { useEffect, useState, useMemo } from "react";
import useSWR from "swr";
import {
  Loader2,
  Waves,
  CloudRain,
  Activity,
  Compass,
  Zap,
  Layers,
  BookOpen,
  Calendar,
  ShieldCheck,
  TrendingUp,
  ExternalLink,
  Sparkles,
  Printer,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { SubpageHeader } from "@/components/climate-drivers/SubpageHeader";
import { StatusBadge } from "@/components/climate-drivers/StatusBadge";
import { MJOCharts } from "@/components/climate-drivers/MJOCharts";
import { EcmwfMjoViewer } from "@/components/climate-drivers/EcmwfMjoViewer";
import { TropicalWavesViewer } from "@/components/climate-drivers/TropicalWavesViewer";
import { TropicalWavesExportModal } from "@/components/climate-drivers/TropicalWavesExportModal";
import { NcicsMapViewer } from "@/components/climate-drivers/NcicsMapViewer";
import { HistoryTable } from "@/components/climate-drivers/HistoryTable";
import { EducationalPanel } from "@/components/climate-drivers/EducationalPanel";
import { getMjoData } from "@/lib/climate-drivers/climateData";

const fetcher = (url: string) => fetch(url).then((res) => res.json());

export default function TropicalDynamicsPage() {
  const [refreshKey, setRefreshKey] = useState<number>(0);
  const [activeMainTab, setActiveMainTab] = useState<string>("waves");
  const [isExportModalOpen, setIsExportModalOpen] = useState<boolean>(false);

  // Today's date in local YYYY-MM-DD
  const todayStr = useMemo(() => {
    const now = new Date();
    const y = now.getFullYear();
    const m = String(now.getMonth() + 1).padStart(2, "0");
    const d = String(now.getDate()).padStart(2, "0");
    return `${y}-${m}-${d}`;
  }, []);

  const { data: waveDatesData } = useSWR(
    "/api/climate-drivers/tropical-waves?action=dates",
    fetcher,
    { revalidateOnFocus: false, dedupingInterval: 1800000 }
  );

  const { data: mjoApiData, isLoading, mutate: mutateMjo } = useSWR(
    `/api/climate-drivers/mjo${refreshKey ? `?_t=${refreshKey}&refresh=true` : ""}`,
    fetcher,
    { revalidateOnFocus: false, dedupingInterval: 0 }
  );

  const [mjoYears, setMjoYears] = useState(5);
  const [loadingMoreMjo, setLoadingMoreMjo] = useState(false);

  const { data: mjoHistoryData, mutate: mutateHistory } = useSWR(
    `/api/climate-drivers/mjo/history?years=${mjoYears}${refreshKey ? `?_t=${refreshKey}&refresh=true` : ""}`,
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
      {/* Header Banner */}
      <SubpageHeader
        title="Dinamika Atmosfer Tropis"
        subtitle="Analisis terpadu gelombang khatulistiwa ekuatorial: MJO (Madden-Julian Oscillation), Gelombang Kelvin, Rossby Ekuatorial (ER), Mixed Rossby-Gravity (MRG), serta peta diagnostik satelit NCICS."
        onRefresh={handleRefresh}
        isRefreshing={isLoading}
        actions={
          <Button
            size="sm"
            onClick={() => setIsExportModalOpen(true)}
            className="gap-1.5 text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm h-8"
            title="Buka versi cetak atau simpan dokumen PDF / PNG 4 gelombang bertumpuk dengan keterangan"
          >
            <Printer className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">Cetak Laporan 4 Gelombang</span>
          </Button>
        }
      />

      {isLoading && !mjoApiData ? (
        <div className="flex flex-col items-center justify-center min-h-[350px] gap-3 bg-white dark:bg-slate-900 rounded-2xl p-8 border dark:border-slate-800">
          <Loader2 className="h-8 w-8 animate-spin text-emerald-500" />
          <p className="text-sm text-slate-500 font-medium animate-pulse">
            Memuat data dinamika atmosfer tropis...
          </p>
        </div>
      ) : (
        <>
          {/* Data Source & Scope Banner */}
          <div className="flex flex-wrap items-center justify-between p-3 bg-emerald-50/80 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-900 rounded-xl text-xs text-emerald-900 dark:text-emerald-200 gap-2">
            <div className="flex flex-wrap items-center gap-2">
              <span className="font-bold">Domain Observasi:</span>
              <span>Tropis &amp; Benua Maritim Indonesia (20° LU – 20° LS)</span>
              <span className="text-slate-400">|</span>
              <span className="text-slate-600 dark:text-slate-300">Sumber: BoM Australia, NOAA CPC, NCICS &amp; ECMWF</span>
            </div>
            <a
              href="https://www.bom.gov.au/climate/mjo/#tabs=Outlooks"
              target="_blank"
              rel="noopener noreferrer"
              className="font-semibold text-emerald-600 dark:text-emerald-400 hover:underline flex items-center gap-1"
            >
              <span>Portal Resmi BOM</span> &rarr;
            </a>
          </div>

          {/* Quick Metric Cards (Overview) */}
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
            {/* Status MJO */}
            <Card className="border-none shadow-sm dark:bg-slate-900 bg-white">
              <CardContent className="p-4 flex flex-col justify-between h-[115px]">
                <div className="flex justify-between items-center">
                  <span className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                    Status MJO
                  </span>
                  <CloudRain className="h-4 w-4 text-emerald-500 shrink-0" />
                </div>
                <div className="my-1">
                  <StatusBadge type="mjo" value={data.status} size="sm" />
                </div>
                <span className="text-[11px] text-slate-400 font-medium">Pembaruan: {data.lastUpdated}</span>
              </CardContent>
            </Card>

            {/* Fase Berjalan */}
            <Card className="border-none shadow-sm dark:bg-slate-900 bg-white">
              <CardContent className="p-4 flex flex-col justify-between h-[115px]">
                <div className="flex justify-between items-center">
                  <span className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                    Fase Berjalan
                  </span>
                  <Compass className="h-4 w-4 text-indigo-500 shrink-0" />
                </div>
                <div className="text-2xl font-extrabold font-mono tracking-tight tabular-nums text-slate-900 dark:text-slate-100">
                  Fase {data.phase}
                </div>
                <span className="text-[11px] text-emerald-600 dark:text-emerald-400 font-medium">
                  {data.phase === 4 || data.phase === 5 ? "Aktif di Wilayah Indonesia" : "Luar Wilayah Indonesia"}
                </span>
              </CardContent>
            </Card>

            {/* Amplitudo */}
            <Card className="border-none shadow-sm dark:bg-slate-900 bg-white">
              <CardContent className="p-4 flex flex-col justify-between h-[115px]">
                <div className="flex justify-between items-center">
                  <span className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                    Amplitudo RMM
                  </span>
                  <Activity className="h-4 w-4 text-teal-500 shrink-0" />
                </div>
                <div className="text-2xl font-extrabold font-mono tracking-tight tabular-nums text-teal-600 dark:text-teal-400">
                  {data.amplitude.toFixed(2)}
                </div>
                <span className="text-[11px] text-slate-400 font-medium">Ambang Aktif: &ge; 1.0</span>
              </CardContent>
            </Card>

            {/* Konveksi Benua Maritim */}
            <Card className="border-none shadow-sm dark:bg-slate-900 bg-white">
              <CardContent className="p-4 flex flex-col justify-between h-[115px]">
                <div className="flex justify-between items-center">
                  <span className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                    Konveksi Indonesia
                  </span>
                  <Zap className="h-4 w-4 text-amber-500 shrink-0" />
                </div>
                <div className="my-1">
                  <StatusBadge type="convection" value={data.convectionOverMC} size="sm" />
                </div>
                <span className="text-[11px] text-slate-400 font-medium">Benua Maritim (MC)</span>
              </CardContent>
            </Card>
          </div>

          {/* Modular Tab Navigation (Prevents Long Page Overload) */}
          <Tabs value={activeMainTab} onValueChange={setActiveMainTab} className="w-full space-y-4">
            <TabsList className="grid grid-cols-2 md:grid-cols-4 h-auto p-1 bg-slate-100 dark:bg-slate-800 rounded-xl">
              <TabsTrigger
                value="waves"
                className="py-2.5 font-bold text-xs sm:text-sm flex items-center gap-1.5 tracking-tight"
              >
                <Waves className="h-4 w-4 text-emerald-500" />
                <span>Gelombang Tropis (BOM)</span>
              </TabsTrigger>
              <TabsTrigger
                value="phase_ecmwf"
                className="py-2.5 font-bold text-xs sm:text-sm flex items-center gap-1.5 tracking-tight"
              >
                <Compass className="h-4 w-4 text-indigo-500" />
                <span>Fase RMM &amp; ECMWF</span>
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

            {/* TAB 1: PETA GELOMBANG TROPIS OPERASIONAL & SKEMATIK TEORI (BOM) */}
            <TabsContent value="waves" className="mt-0">
              <TropicalWavesViewer
                mjoStatus={{
                  status: data.status,
                  phase: data.phase,
                  amplitude: data.amplitude,
                  convectionOverMC: data.convectionOverMC,
                  lastUpdated: data.lastUpdated,
                }}
                onOpenExportModal={() => setIsExportModalOpen(true)}
              />
            </TabsContent>

            {/* TAB 2: DIAGRAM FASE RMM & PREDIKSI ENSEMBLE ECMWF 46-HARI */}
            <TabsContent value="phase_ecmwf" className="mt-0 space-y-6">
              <MJOCharts data={data} isDarkMode={isDarkMode} />
              <EcmwfMjoViewer />
            </TabsContent>

            {/* TAB 3: DIAGNOSTIK SATELIT NCICS & DIAGRAM HOVMÖLLER */}
            <TabsContent value="ncics" className="mt-0">
              <NcicsMapViewer />
            </TabsContent>

            {/* TAB 4: RIWAYAT HISTORIS MJO & PANDUAN EDUKASI ILMIAH */}
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
                title="MJO &amp; Gelombang Atmosfer Tropis"
                whatIsIt={data.interpretation.whatIsIt}
                indonesiaImpact={data.interpretation.indonesiaImpact}
                phaseMeanings={data.interpretation.phaseMeanings}
                currentAssessment={data.interpretation.currentAssessment}
              />
            </TabsContent>
          </Tabs>

          {/* Tropical Waves 4-Stack Export & Print Modal */}
          <TropicalWavesExportModal
            open={isExportModalOpen}
            onOpenChange={setIsExportModalOpen}
            dates={waveDatesData?.dates || [todayStr]}
            currentDate={todayStr}
            todayStr={todayStr}
            mjoStatus={{
              status: data.status,
              phase: data.phase,
              amplitude: data.amplitude,
              convectionOverMC: data.convectionOverMC,
              lastUpdated: data.lastUpdated,
            }}
          />
        </>
      )}
    </div>
  );
};
