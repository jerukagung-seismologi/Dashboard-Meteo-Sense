// app/dashboard/climate-drivers/monsoon/page.tsx
"use client";

import React, { useEffect, useState } from "react";
import useSWR from "swr";
import { Loader2 } from "lucide-react";
import { SubpageHeader } from "@/components/climate-drivers/SubpageHeader";
import { MonsoonCharts } from "@/components/climate-drivers/MonsoonCharts";
import { EducationalPanel } from "@/components/climate-drivers/EducationalPanel";
import { getMonsoonData } from "@/lib/climate-drivers/climateData";
import { MonsoonData } from "@/lib/climate-drivers/types";

const fetcher = (url: string) => fetch(url).then((res) => res.json());

export default function MonsoonSubpage() {
  const [refreshKey, setRefreshKey] = useState<number>(0);

  const { data: monsoonApiData, isLoading, mutate } = useSWR<MonsoonData>(
    `/api/climate-drivers/monsoon${refreshKey ? `?_t=${refreshKey}&refresh=true` : ""}`,
    fetcher,
    { revalidateOnFocus: false, dedupingInterval: 60000 }
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

  const data = monsoonApiData && !("error" in monsoonApiData) ? monsoonApiData : getMonsoonData();

  return (
    <div className="space-y-6 pb-12">
      {/* Persistent Header Banner */}
      <SubpageHeader
        title="Indeks Monsun Indonesia (IMI)"
        subtitle="Pemantauan sirkulasi angin musiman skala regional antara Benua Asia dan Benua Australia penentu siklus musim hujan dan kemarau"
        onRefresh={handleRefresh}
        isRefreshing={isLoading}
      />

      {isLoading && !monsoonApiData ? (
        <div className="flex flex-col items-center justify-center min-h-[400px] gap-3">
          <Loader2 className="h-8 w-8 animate-spin text-indigo-500" />
          <p className="text-sm text-slate-500 font-medium">Memuat data sirkulasi angin monsun Indonesia...</p>
        </div>
      ) : (
        <>
          {/* Main Visualizations & Metrics */}
          <MonsoonCharts data={data} isDarkMode={isDarkMode} />

          {/* Educational Explanation & Meteorological FAQ */}
          <EducationalPanel
            title="Monsun"
            whatIsIt={data.interpretation.whatIsIt}
            indonesiaImpact={data.interpretation.indonesiaImpact}
            positiveIod={data.interpretation.westMonsoon}
            negativeIod={data.interpretation.eastMonsoon}
            currentAssessment={data.interpretation.currentAssessment}
          />
        </>
      )}
    </div>
  );
}
