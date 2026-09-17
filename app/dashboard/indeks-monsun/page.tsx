// app/dashboard/indeks-monsun/page.tsx
"use client";

import React, { useEffect, useState } from "react";
import useSWR from "swr";
import { Loader2, Wind, Sparkles, BookOpen, Layers } from "lucide-react";
import { MonsoonIndicesHeader } from "@/components/indeks-monsun/MonsoonIndicesHeader";
import { MonsoonIndicesSummaryCards } from "@/components/indeks-monsun/MonsoonIndicesSummaryCards";
import { MonsoonIndicesCharts } from "@/components/indeks-monsun/MonsoonIndicesCharts";
import { ItczTrackerSection } from "@/components/indeks-monsun/ItczTrackerSection";
import { MonsoonScientificGuide } from "@/components/indeks-monsun/MonsoonScientificGuide";
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
      {/* Unified Single Header Banner */}
      <MonsoonIndicesHeader
        onRefresh={handleRefresh}
        isRefreshing={isLoading}
        lastUpdated={data?.lastUpdated}
      />

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

          {/* ITCZ (Intertropical Convergence Zone) Tracker & Seasonal Migration Section */}
          <ItczTrackerSection isDarkMode={isDarkMode} />

          {/* Contextual Scientific Guide & Dual-Polarity Point-by-Point Reference */}
          <div className="pt-2">
            <MonsoonScientificGuide />
          </div>
        </>
      )}
    </div>
  );
}
