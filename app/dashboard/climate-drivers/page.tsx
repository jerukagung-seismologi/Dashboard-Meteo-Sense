// app/dashboard/climate-drivers/page.tsx
"use client";

import React, { useEffect, useState } from "react";
import useSWR from "swr";
import { Loader2, Globe, Sparkles, AlertCircle, Compass, Waves, CloudRain } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { SubpageHeader } from "@/components/climate-drivers/SubpageHeader";
import { SummaryCards } from "@/components/climate-drivers/SummaryCards";
import { getClimateDriversSummary, getEnsoData, getMjoData, getIodData } from "@/lib/climate-drivers/climateData";
import { ENSOCharts } from "@/components/climate-drivers/ENSOCharts";
import { MJOCharts } from "@/components/climate-drivers/MJOCharts";
import { IODCharts } from "@/components/climate-drivers/IODCharts";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

const fetcher = (url: string) => fetch(url).then((res) => res.json());

export default function ClimateDriversPage() {
  const { data: summaryData, isLoading } = useSWR("/api/climate-drivers/summary", fetcher, {
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

  // Use API summary or fallback
  const summary = summaryData && !summaryData.error ? summaryData : getClimateDriversSummary();
  const ensoData = getEnsoData();
  const mjoData = getMjoData();
  const iodData = getIodData();

  if (isLoading && !summaryData) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] gap-3">
        <Loader2 className="h-8 w-8 animate-spin text-indigo-500" />
        <p className="text-sm text-slate-500 font-medium animate-pulse">
          Memuat ringkasan dinamika iklim skala besar...
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-12">
      {/* Subpage Header */}
      <SubpageHeader
        title="Dinamika Iklim Skala Besar (Climate Drivers)"
        subtitle="Analisis fenomena osilasi atmosfer & samudra global yang memengaruhi pola cuaca dan curah hujan Indonesia"
      />

      {/* Hero Educational Intro Card */}
      <Card className="bg-gradient-to-r from-indigo-900 via-slate-900 to-blue-950 text-white border-none shadow-lg overflow-hidden relative">
        <div className="absolute right-0 top-0 w-96 h-96 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />
        <CardContent className="p-6 relative z-10">
          <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
            <div className="space-y-2 max-w-3xl">
              <div className="flex items-center gap-2">
                <Sparkles className="h-5 w-5 text-indigo-400 animate-pulse" />
                <span className="text-xs font-bold uppercase tracking-wider text-indigo-300">
                  Mengapa Cuaca Saat Ini Terjadi?
                </span>
              </div>
              <h2 className="text-xl sm:text-2xl font-bold text-white">
                Memahami Latar Belakang Iklim di Balik Cuaca Harian Indonesia
              </h2>
              <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
                Cuaca di Indonesia tidak hanya dipengaruhi oleh kondisi cuaca lokal, melainkan sangat ditentukan oleh tiga driver iklim utama: <strong>ENSO (Pasifik)</strong>, <strong>MJO (Gelombang Intraseasonal Tropis)</strong>, dan <strong>IOD (Samudra Hindia)</strong>. Halaman ini menyajikan status indikator real-time beserta grafik dan penjelasan ilmiah.
              </p>
            </div>
            <div className="p-4 bg-white/10 backdrop-blur-md rounded-2xl border border-white/10 text-center shrink-0 self-stretch md:self-auto flex flex-col justify-center">
              <span className="text-xs text-slate-300 block">Terakhir Diperbarui</span>
              <span className="text-base font-black text-indigo-200">{summary.lastUpdated}</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 3 Summary Dashboard Cards */}
      <SummaryCards summary={summary} />

      {/* Interactive Tabbed Visualizations Overview */}
      <Card className="border-none shadow-sm dark:bg-slate-900 bg-white">
        <CardHeader className="pb-2">
          <CardTitle className="text-lg font-bold flex items-center gap-2">
            <Globe className="h-5 w-5 text-indigo-500" /> Pratinjau Visualisasi & Grafik Terintegrasi
          </CardTitle>
          <CardDescription>
            Beralih antar tab di bawah untuk melihat grafik deret waktu ENSO, MJO, dan IOD secara langsung
          </CardDescription>
        </CardHeader>
        <CardContent className="pt-2">
          <Tabs defaultValue="enso" className="w-full">
            <TabsList className="grid w-full grid-cols-3 h-auto p-1 bg-slate-100 dark:bg-slate-800 rounded-xl mb-6">
              <TabsTrigger value="enso" className="py-2.5 font-bold text-xs sm:text-sm flex items-center gap-1.5">
                <Waves className="h-4 w-4 text-blue-500" /> ENSO
              </TabsTrigger>
              <TabsTrigger value="mjo" className="py-2.5 font-bold text-xs sm:text-sm flex items-center gap-1.5">
                <CloudRain className="h-4 w-4 text-emerald-500" /> MJO
              </TabsTrigger>
              <TabsTrigger value="iod" className="py-2.5 font-bold text-xs sm:text-sm flex items-center gap-1.5">
                <Compass className="h-4 w-4 text-amber-500" /> IOD
              </TabsTrigger>
            </TabsList>

            <TabsContent value="enso" className="mt-0">
              <ENSOCharts data={ensoData} isDarkMode={isDarkMode} />
            </TabsContent>

            <TabsContent value="mjo" className="mt-0">
              <MJOCharts data={mjoData} isDarkMode={isDarkMode} />
            </TabsContent>

            <TabsContent value="iod" className="mt-0">
              <IODCharts data={iodData} isDarkMode={isDarkMode} />
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
}
