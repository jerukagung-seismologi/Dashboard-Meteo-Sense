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
          <Tabs defaultValue="enso" className="w-full space-y-6">
            <div className="flex items-center justify-start border-b border-slate-200 dark:border-slate-800 w-full overflow-x-auto">
              <TabsList className="bg-transparent gap-1.5 sm:gap-2 h-auto p-0 border-none flex justify-start -mb-px">
                <TabsTrigger
                  value="enso"
                  className="px-3.5 py-2.5 rounded-t-lg rounded-b-none border border-transparent border-b-2 text-sm font-semibold text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200 data-[state=active]:border-slate-200 dark:data-[state=active]:border-slate-800 data-[state=active]:border-b-orange-500 dark:data-[state=active]:border-b-orange-500 data-[state=active]:bg-white dark:data-[state=active]:bg-slate-900 data-[state=active]:text-orange-600 dark:data-[state=active]:text-orange-400 data-[state=active]:font-bold data-[state=active]:shadow-xs transition-all cursor-pointer flex items-center gap-2"
                >
                  <Waves className="h-4 w-4 text-blue-500 shrink-0" /> ENSO (Pasifik)
                </TabsTrigger>
                <TabsTrigger
                  value="iod"
                  className="px-3.5 py-2.5 rounded-t-lg rounded-b-none border border-transparent border-b-2 text-sm font-semibold text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200 data-[state=active]:border-slate-200 dark:data-[state=active]:border-slate-800 data-[state=active]:border-b-orange-500 dark:data-[state=active]:border-b-orange-500 data-[state=active]:bg-white dark:data-[state=active]:bg-slate-900 data-[state=active]:text-orange-600 dark:data-[state=active]:text-orange-400 data-[state=active]:font-bold data-[state=active]:shadow-xs transition-all cursor-pointer flex items-center gap-2"
                >
                  <Compass className="h-4 w-4 text-amber-500 shrink-0" /> IOD (Hindia)
                </TabsTrigger>
                <TabsTrigger
                  value="monsoon"
                  className="px-3.5 py-2.5 rounded-t-lg rounded-b-none border border-transparent border-b-2 text-sm font-semibold text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200 data-[state=active]:border-slate-200 dark:data-[state=active]:border-slate-800 data-[state=active]:border-b-orange-500 dark:data-[state=active]:border-b-orange-500 data-[state=active]:bg-white dark:data-[state=active]:bg-slate-900 data-[state=active]:text-orange-600 dark:data-[state=active]:text-orange-400 data-[state=active]:font-bold data-[state=active]:shadow-xs transition-all cursor-pointer flex items-center gap-2"
                >
                  <Wind className="h-4 w-4 text-teal-500 shrink-0" /> Monsun (Regional)
                </TabsTrigger>
                <TabsTrigger
                  value="mjo"
                  className="px-3.5 py-2.5 rounded-t-lg rounded-b-none border border-transparent border-b-2 text-sm font-semibold text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200 data-[state=active]:border-slate-200 dark:data-[state=active]:border-slate-800 data-[state=active]:border-b-orange-500 dark:data-[state=active]:border-b-orange-500 data-[state=active]:bg-white dark:data-[state=active]:bg-slate-900 data-[state=active]:text-orange-600 dark:data-[state=active]:text-orange-400 data-[state=active]:font-bold data-[state=active]:shadow-xs transition-all cursor-pointer flex items-center gap-2"
                >
                  <CloudRain className="h-4 w-4 text-emerald-500 shrink-0" /> MJO (Ringkas)
                </TabsTrigger>
              </TabsList>
            </div>

            <TabsContent value="enso" className="mt-0">
              <ENSOCharts data={ensoData} isDarkMode={isDarkMode} />
            </TabsContent>

            <TabsContent value="iod" className="mt-0">
              <IODCharts data={iodData} isDarkMode={isDarkMode} />
            </TabsContent>

            <TabsContent value="monsoon" className="mt-0">
              <MonsoonCharts data={monsoonApiData || getMonsoonData()} isDarkMode={isDarkMode} />
            </TabsContent>

            <TabsContent value="mjo" className="mt-0">
              <MJOCharts data={mjoData} isDarkMode={isDarkMode} />
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
        </>
      )}
    </div>
  );
}
