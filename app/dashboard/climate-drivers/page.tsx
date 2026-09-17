// app/dashboard/climate-drivers/page.tsx
"use client";

import React, { useEffect, useState } from "react";
import useSWR from "swr";
import { Loader2, Globe, Sparkles, AlertCircle, Compass, Waves, CloudRain, Wind } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { SubpageHeader } from "@/components/climate-drivers/SubpageHeader";
import { SummaryCards } from "@/components/climate-drivers/SummaryCards";
import { getClimateDriversSummary, getEnsoData, getMjoData, getIodData, getMonsoonData } from "@/lib/climate-drivers/climateData";
import { ENSOCharts } from "@/components/climate-drivers/ENSOCharts";
import { MJOCharts } from "@/components/climate-drivers/MJOCharts";
import { EcmwfMjoViewer } from "@/components/climate-drivers/EcmwfMjoViewer";
import { IODCharts } from "@/components/climate-drivers/IODCharts";
import { MonsoonCharts } from "@/components/climate-drivers/MonsoonCharts";
import { NcicsMapViewer } from "@/components/climate-drivers/NcicsMapViewer";
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
        title="Indeks Iklim Global (Global Climate Drivers)"
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
      {/* 3 Summary Dashboard Cards */}
      <SummaryCards summary={summary} />

      {/* Interactive Tabbed Visualizations Overview */}
      <Card className="border-none shadow-sm dark:bg-slate-900 bg-white">
        <CardHeader className="pb-3 border-b dark:border-slate-800">
          <CardTitle className="text-lg font-extrabold tracking-tight flex items-center gap-2 text-slate-900 dark:text-slate-100">
            <Globe className="h-5 w-5 text-indigo-500" /> Pratinjau Visualisasi &amp; Grafik Terintegrasi
          </CardTitle>
          <CardDescription className="text-xs text-slate-500 dark:text-slate-400 font-normal leading-relaxed">
            Beralih antar tab di bawah untuk melihat grafik deret waktu ENSO, MJO, IOD, serta peta diagnostik satelit NCICS
          </CardDescription>
        </CardHeader>
        <CardContent className="pt-4">
          <Tabs defaultValue="enso" className="w-full">
            <TabsList className="grid w-full grid-cols-2 sm:grid-cols-4 h-auto p-1 bg-slate-100 dark:bg-slate-800 rounded-xl mb-6">
              <TabsTrigger value="enso" className="py-2.5 font-semibold text-xs sm:text-sm flex items-center gap-1.5 tracking-tight">
                <Waves className="h-4 w-4 text-blue-500" /> ENSO
              </TabsTrigger>
              <TabsTrigger value="mjo" className="py-2.5 font-semibold text-xs sm:text-sm flex items-center gap-1.5 tracking-tight">
                <CloudRain className="h-4 w-4 text-emerald-500" /> MJO
              </TabsTrigger>
              <TabsTrigger value="iod" className="py-2.5 font-semibold text-xs sm:text-sm flex items-center gap-1.5 tracking-tight">
                <Compass className="h-4 w-4 text-amber-500" /> IOD
              </TabsTrigger>
              <TabsTrigger value="ncics" className="py-2.5 font-semibold text-xs sm:text-sm flex items-center gap-1.5 tracking-tight">
                <Globe className="h-4 w-4 text-indigo-500" /> Peta NCICS
              </TabsTrigger>
            </TabsList>

            <TabsContent value="enso" className="mt-0">
              <ENSOCharts data={ensoData} isDarkMode={isDarkMode} />
            </TabsContent>

            <TabsContent value="mjo" className="mt-0 space-y-6">
              <MJOCharts data={mjoData} isDarkMode={isDarkMode} />
              <EcmwfMjoViewer />
            </TabsContent>

            <TabsContent value="iod" className="mt-0">
              <IODCharts data={iodData} isDarkMode={isDarkMode} />
            </TabsContent>

            <TabsContent value="ncics" className="mt-0">
              <NcicsMapViewer />
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
        </>
      )}
    </div>
  );
}
