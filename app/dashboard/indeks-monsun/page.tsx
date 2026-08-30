// app/dashboard/indeks-monsun/page.tsx
"use client";

import React, { useEffect, useState } from "react";
import useSWR from "swr";
import { Loader2, Wind, Sparkles, BookOpen, Layers } from "lucide-react";
import { MonsoonIndicesHeader } from "@/components/indeks-monsun/MonsoonIndicesHeader";
import { MonsoonIndicesSummaryCards } from "@/components/indeks-monsun/MonsoonIndicesSummaryCards";
import { MonsoonIndicesCharts } from "@/components/indeks-monsun/MonsoonIndicesCharts";
import { ClimateGlossary } from "@/components/climate-drivers/ClimateGlossary";
import { Card, CardContent } from "@/components/ui/card";

const fetcher = (url: string) => fetch(url).then((res) => res.json());

export default function IndeksMonsunPage() {
  const [refreshKey, setRefreshKey] = useState<number>(0);
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

  const { data, isLoading, mutate } = useSWR(
    `/api/monsoon-indices${refreshKey ? `?_t=${refreshKey}` : ""}`,
    fetcher,
    { revalidateOnFocus: false, dedupingInterval: 60000 }
  );

  const handleRefresh = () => {
    setRefreshKey(Date.now());
    mutate();
  };

  return (
    <div className="space-y-6 pb-12">
      {/* Header Banner */}
      <MonsoonIndicesHeader onRefresh={handleRefresh} isRefreshing={isLoading} />

      {isLoading && !data ? (
        <div className="flex flex-col items-center justify-center min-h-[350px] gap-3 bg-white dark:bg-slate-900 rounded-2xl p-8 border dark:border-slate-800">
          <Loader2 className="h-8 w-8 animate-spin text-teal-500" />
          <p className="text-sm text-slate-500 font-medium animate-pulse">
            Memuat data sirkulasi indeks monsun &amp; BSISO regional...
          </p>
        </div>
      ) : data?.error ? (
        <div className="p-6 bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-300 rounded-2xl border border-rose-200 dark:border-rose-900">
          <p className="font-bold text-sm">Gagal memuat data:</p>
          <p className="text-xs mt-1">{data.error}</p>
        </div>
      ) : (
        <>
          {/* Educational Intro Hero Card */}
          <Card className="bg-gradient-to-r from-teal-950 via-slate-900 to-slate-950 text-white border-none shadow-md overflow-hidden relative">
            <div className="absolute right-0 top-0 w-80 h-80 bg-teal-500/10 rounded-full blur-3xl pointer-events-none" />
            <CardContent className="p-6 relative z-10">
              <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
                <div className="space-y-2 max-w-3xl">
                  <div className="flex items-center gap-2">
                    <Sparkles className="h-4 w-4 text-teal-400 animate-pulse" />
                    <span className="text-xs font-bold uppercase tracking-wider text-teal-300">
                      Sirkulasi Monsun Multi-Regional
                    </span>
                  </div>
                  <h2 className="text-xl sm:text-2xl font-bold text-white">
                    Memantau Sayap Monsun Australia, Pasifik, dan Laut Cina Selatan
                  </h2>
                  <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
                    Kepulauan Indonesia diapit oleh dua sistem monsun raksasa: <strong>Monsun Musim Dingin/Panas Asia (WNPMI &amp; SCSMI)</strong> di utara dan <strong>Monsun Musim Panas Australia (AUSMI)</strong> di selatan. Halaman ini menghitung indeks sirkulasi kuantitatif resmi Wang &amp; Fan (2001) serta pemantau seruakan dingin (Cold Surge) dan osilasi intraseasonal musim panas (BSISO).
                  </p>
                </div>
                <div className="p-4 bg-white/10 backdrop-blur-md rounded-2xl border border-white/10 text-center shrink-0 self-stretch md:self-auto flex flex-col justify-center">
                  <span className="text-xs text-slate-300 block">Terakhir Diperbarui</span>
                  <span className="text-base font-black text-teal-200">{data?.lastUpdated || "-"}</span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* 5 Summary Cards */}
          {data?.current && <MonsoonIndicesSummaryCards current={data.current} />}

          {/* Visualizations & Charts */}
          {data?.timeSeries && (
            <MonsoonIndicesCharts
              timeSeries={data.timeSeries}
              currentBsiso={data.current.bsiso}
              isDarkMode={isDarkMode}
            />
          )}

          {/* Integrated Climate Glossary */}
          <div className="space-y-3 pt-4">
            <div className="flex items-center gap-2">
              <BookOpen className="h-5 w-5 text-teal-500" />
              <h3 className="text-lg font-bold text-slate-900 dark:text-slate-100">
                Glosarium &amp; Rujukan Sains Monsun
              </h3>
            </div>
            <ClimateGlossary defaultCategory="monsoon" />
          </div>
        </>
      )}
    </div>
  );
}
