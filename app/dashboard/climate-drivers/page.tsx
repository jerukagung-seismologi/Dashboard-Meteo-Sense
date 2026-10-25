// app/dashboard/climate-drivers/page.tsx
"use client";

import React, { useEffect, useState } from "react";
import useSWR from "swr";
import Link from "next/link";
import { Loader2, Globe, Sparkles, AlertCircle, Compass, Waves, CloudRain, Wind, ArrowRight } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { SubpageHeader } from "@/components/climate-drivers/SubpageHeader";
import { SummaryCards } from "@/components/climate-drivers/SummaryCards";
import { getClimateDriversSummary, getEnsoData, getMjoData, getIodData, getMonsoonData } from "@/lib/climate-drivers/climateData";
import { ENSOCharts } from "@/components/climate-drivers/ENSOCharts";
import { MJOCharts } from "@/components/climate-drivers/MJOCharts";
import { IODCharts } from "@/components/climate-drivers/IODCharts";
import { MonsoonCharts } from "@/components/climate-drivers/MonsoonCharts";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

const fetcher = (url: string) => fetch(url).then((res) => res.json());

export default function ClimateDriversPage() {
  const [refreshKey, setRefreshKey] = useState<number>(0);

  const { data: summaryData, isLoading, mutate } = useSWR(
    `/api/climate-drivers/summary${refreshKey ? `?_t=${refreshKey}&refresh=true` : ""}`,
    fetcher,
    { revalidateOnFocus: false, dedupingInterval: 0 }
  );

  const handleRefresh = () => {
    setRefreshKey(Date.now());
    mutate();
  };

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

  const { data: ensoApiData } = useSWR(
    `/api/climate-drivers/enso${refreshKey ? `?_t=${refreshKey}&refresh=true` : ""}`,
    fetcher,
    { revalidateOnFocus: false, dedupingInterval: 60000 }
  );
  const { data: mjoApiData } = useSWR(
    `/api/climate-drivers/mjo${refreshKey ? `?_t=${refreshKey}&refresh=true` : ""}`,
    fetcher,
    { revalidateOnFocus: false, dedupingInterval: 60000 }
  );
  const { data: iodApiData } = useSWR(
    `/api/climate-drivers/iod${refreshKey ? `?_t=${refreshKey}&refresh=true` : ""}`,
    fetcher,
    { revalidateOnFocus: false, dedupingInterval: 60000 }
  );
  const { data: monsoonApiData } = useSWR(
    `/api/climate-drivers/monsoon${refreshKey ? `?_t=${refreshKey}&refresh=true` : ""}`,
    fetcher,
    { revalidateOnFocus: false, dedupingInterval: 60000 }
  );

  // Use API summary or fallback
  const summary = summaryData && !summaryData.error ? summaryData : getClimateDriversSummary();
  const ensoData = ensoApiData && !ensoApiData.error ? ensoApiData : getEnsoData();
  const mjoData = mjoApiData && !mjoApiData.error ? mjoApiData : getMjoData();
  const iodData = iodApiData && !iodApiData.error ? iodApiData : getIodData();

  return (
    <div className="space-y-6 pb-12">
      {/* Unified Single Header Banner */}
      <SubpageHeader
        title="Indeks Iklim Global"
        subtitle="Analisis 3 pilar telekoneksi laut-atmosfer global di balik cuaca Indonesia: ENSO (Pasifik), MJO (Konveksi Tropis), dan IOD (Samudra Hindia)."
        onRefresh={handleRefresh}
        isRefreshing={isLoading}
        lastUpdated={summary.lastUpdated}
      />

      {isLoading && !summaryData ? (
        <div className="flex flex-col items-center justify-center min-h-[350px] gap-3 bg-white dark:bg-slate-900 rounded-2xl p-8 border dark:border-slate-800">
          <Loader2 className="h-8 w-8 animate-spin text-indigo-500" />
          <p className="text-sm text-slate-500 font-medium animate-pulse">
            Memuat ringkasan dinamika iklim skala besar...
          </p>
        </div>
      ) : (
        <>
      {/* Banner Akses Menu Mandiri Dinamika Atmosfer Tropis */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between p-3.5 bg-gradient-to-r from-emerald-500/10 via-teal-500/10 to-blue-500/10 border border-emerald-200 dark:border-emerald-800 rounded-2xl gap-3">
        <div className="flex items-center gap-2.5">
          <div className="p-2 rounded-xl bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 shrink-0">
            <Waves className="h-5 w-5" />
          </div>
          <div>
            <div className="text-xs sm:text-sm font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
              <span>Menu Mandiri: Dinamika Atmosfer Tropis</span>
              <span className="text-[10px] uppercase font-extrabold px-1.5 py-0.5 rounded bg-emerald-100 dark:bg-emerald-900/60 text-emerald-800 dark:text-emerald-300">
                Menu Baru
              </span>
            </div>
            <p className="text-[11px] sm:text-xs text-slate-500 dark:text-slate-400">
              Analisis Gelombang Kelvin, Rossby (ER), MRG, diagram teori Matsuno, dan diagnostik Hovmöller telah dipisahkan ke menu tersendiri agar halaman ini tetap ringkas dan terfokus.
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

      {/* 3 Summary Dashboard Cards */}
      <SummaryCards summary={summary} />

      {/* Interactive Tabbed Visualizations Overview */}
      <Card className="border-none shadow-sm dark:bg-slate-900 bg-white">
        <CardHeader className="pb-3 border-b dark:border-slate-800">
          <CardTitle className="text-lg font-extrabold tracking-tight flex items-center gap-2 text-slate-900 dark:text-slate-100">
            <Globe className="h-5 w-5 text-indigo-500" /> Pratinjau Indeks Iklim Global &amp; Monsun
          </CardTitle>
          <CardDescription className="text-xs text-slate-500 dark:text-slate-400 font-normal leading-relaxed">
            Beralih antar tab di bawah untuk melihat grafik deret waktu ENSO (Pasifik), IOD (Hindia), Monsun Regional, dan ringkasan MJO.
          </CardDescription>
        </CardHeader>
        <CardContent className="pt-4">
          <Tabs defaultValue="enso" className="w-full">
            <TabsList className="grid w-full grid-cols-2 sm:grid-cols-4 h-auto p-1 bg-slate-100 dark:bg-slate-800 rounded-xl mb-6">
              <TabsTrigger value="enso" className="py-2.5 font-semibold text-xs sm:text-sm flex items-center gap-1.5 tracking-tight">
                <Waves className="h-4 w-4 text-blue-500" /> ENSO (Pasifik)
              </TabsTrigger>
              <TabsTrigger value="iod" className="py-2.5 font-semibold text-xs sm:text-sm flex items-center gap-1.5 tracking-tight">
                <Compass className="h-4 w-4 text-amber-500" /> IOD (Hindia)
              </TabsTrigger>
              <TabsTrigger value="monsoon" className="py-2.5 font-semibold text-xs sm:text-sm flex items-center gap-1.5 tracking-tight">
                <Wind className="h-4 w-4 text-teal-500" /> Monsun (Regional)
              </TabsTrigger>
              <TabsTrigger value="mjo" className="py-2.5 font-semibold text-xs sm:text-sm flex items-center gap-1.5 tracking-tight">
                <CloudRain className="h-4 w-4 text-emerald-500" /> MJO (Ringkas)
              </TabsTrigger>
            </TabsList>

            <TabsContent value="enso" className="mt-0">
              <ENSOCharts data={ensoData} isDarkMode={isDarkMode} />
            </TabsContent>

            <TabsContent value="iod" className="mt-0">
              <IODCharts data={iodData} isDarkMode={isDarkMode} />
            </TabsContent>

            <TabsContent value="monsoon" className="mt-0">
              <MonsoonCharts data={monsoonApiData || getMonsoonData()} isDarkMode={isDarkMode} />
            </TabsContent>

            <TabsContent value="mjo" className="mt-0 space-y-4">
              <MJOCharts data={mjoData} isDarkMode={isDarkMode} />
              <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/40 border dark:border-slate-800 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                <div className="space-y-1">
                  <div className="text-xs sm:text-sm font-bold text-slate-900 dark:text-slate-100">
                    Ingin Memantau Gelombang Kelvin, Rossby (ER), MRG &amp; Hovmöller?
                  </div>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    Seluruh peta operasional harian BOM Australia, diagram fase ECMWF 46-hari, dan diagnostik satelit NCICS dapat diakses di menu mandiri.
                  </p>
                </div>
                <Link
                  href="/dashboard/tropical-dynamics"
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold transition-all shrink-0"
                >
                  <span>Buka Dinamika Tropis Lengkap</span>
                  <ArrowRight className="h-3.5 w-3.5" />
                </Link>
              </div>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
        </>
      )}
    </div>
  );
}
