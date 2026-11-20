// components/climatology/workspaces/ReanalysisWorkspace.tsx
"use client";

import React, { useState } from "react";
import dynamic from "next/dynamic";
import {
  Globe,
  Compass,
  CalendarDays,
  CloudRain,
  Sparkles,
  Layers,
  Activity,
} from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { ClimatologyWorkspaceHook } from "@/hooks/climatology/useClimatologyWorkspace";

const Era5ClimatologyCharts = dynamic(
  () => import("@/components/climatology/Era5ClimatologyCharts").then((m) => m.Era5ClimatologyCharts),
  { ssr: false, loading: () => <Skeleton className="w-full h-96 rounded-xl" /> }
);
const Era5ReanalysisTab = dynamic(
  () => import("@/components/klimatologi/tabs/Era5ReanalysisTab").then((m) => m.Era5ReanalysisTab),
  { ssr: false, loading: () => <Skeleton className="w-full h-96 rounded-xl" /> }
);
const ZomDynamicsSection = dynamic(
  () => import("@/components/climatology/ZomDynamicsSection").then((m) => m.ZomDynamicsSection),
  { ssr: false, loading: () => <Skeleton className="w-full h-80 rounded-xl" /> }
);
const ChcEarlyEstimatesViewer = dynamic(
  () => import("@/components/climatology/ChcEarlyEstimatesViewer").then((m) => m.ChcEarlyEstimatesViewer),
  { ssr: false, loading: () => <Skeleton className="w-full h-96 rounded-xl" /> }
);

export type ReanalysisSubTab = "grid-era5" | "diagnostik" | "zom-onset" | "satelit-chc";

interface ReanalysisWorkspaceProps {
  ws: ClimatologyWorkspaceHook;
}

export default function ReanalysisWorkspace({ ws }: ReanalysisWorkspaceProps) {
  const [activeSubTab, setActiveSubTab] = useState<ReanalysisSubTab>("grid-era5");

  const {
    activeLocation,
    activeCoords,
    era5BaselineData,
    isEra5BaselineLoading,
    era5Data,
    era5Error,
    isEra5Loading,
    mutateEra5,
    timePreset,
    setTimePreset,
    customStartDate,
    setCustomStartDate,
    customEndDate,
    setCustomEndDate,
    maxEndDate,
    dateRangeValidation,
    isDarkMode,
    selectedYear,
    wmoNormalsData,
    klimData,
  } = ws;

  return (
    <div className="space-y-6">
      {/* ── SUB-TABS NAVIGATION ── */}
      <div className="flex items-center gap-1.5 p-1 bg-slate-100 dark:bg-slate-800/80 rounded-xl overflow-x-auto border border-slate-200 dark:border-slate-800 scrollbar-none">
        <button
          onClick={() => setActiveSubTab("grid-era5")}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition ${
            activeSubTab === "grid-era5"
              ? "bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 shadow-xs font-bold"
              : "text-slate-600 dark:text-slate-400 hover:text-slate-900"
          }`}
        >
          <Globe className="h-3.5 w-3.5 text-indigo-500" />
          <span>Grid Multidekade &amp; Persentil WMO</span>
        </button>

        <button
          onClick={() => setActiveSubTab("diagnostik")}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition ${
            activeSubTab === "diagnostik"
              ? "bg-white dark:bg-slate-900 text-purple-600 dark:text-purple-400 shadow-xs font-bold"
              : "text-slate-600 dark:text-slate-400 hover:text-slate-900"
          }`}
        >
          <Compass className="h-3.5 w-3.5 text-purple-500" />
          <span>Diagnostik Atmosfer &amp; Hovmöller</span>
        </button>

        <button
          onClick={() => setActiveSubTab("zom-onset")}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition ${
            activeSubTab === "zom-onset"
              ? "bg-white dark:bg-slate-900 text-teal-600 dark:text-teal-400 shadow-xs font-bold"
              : "text-slate-600 dark:text-slate-400 hover:text-slate-900"
          }`}
        >
          <CalendarDays className="h-3.5 w-3.5 text-teal-500" />
          <span>Dinamika 36 Dasarian &amp; ZOM BMKG</span>
        </button>

        <button
          onClick={() => setActiveSubTab("satelit-chc")}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition ${
            activeSubTab === "satelit-chc"
              ? "bg-white dark:bg-slate-900 text-cyan-600 dark:text-cyan-400 shadow-xs font-bold"
              : "text-slate-600 dark:text-slate-400 hover:text-slate-900"
          }`}
        >
          <CloudRain className="h-3.5 w-3.5 text-cyan-500" />
          <span>Satelit CHC CHIRPS</span>
        </button>
      </div>

      {/* ── ON-DEMAND SUB-TAB CONTENT ── */}
      <div className="space-y-6">
        {/* 1. ERA5 CLIMATOLOGY GRID & PERCENTILE PLOTS */}
        {activeSubTab === "grid-era5" && (
          <Era5ClimatologyCharts
            era5Data={era5BaselineData}
            isLoading={isEra5BaselineLoading}
            stationPoints={klimData?.points || []}
            stationName={activeLocation.name}
            coordinates={activeCoords}
            isDarkMode={isDarkMode}
            selectedYear={selectedYear}
          />
        )}

        {/* 2. DIAGNOSTIK REANALISIS ATMOSFERIK */}
        {activeSubTab === "diagnostik" && (
          <Era5ReanalysisTab
            activeLocation={activeLocation}
            timePreset={timePreset}
            setTimePreset={setTimePreset}
            mutateEra5={mutateEra5}
            isEra5Loading={isEra5Loading}
            customStartDate={customStartDate}
            setCustomStartDate={setCustomStartDate}
            customEndDate={customEndDate}
            setCustomEndDate={setCustomEndDate}
            maxEndDate={maxEndDate}
            dateRangeValidation={dateRangeValidation}
            era5Data={era5Data}
            era5Error={era5Error}
            isDarkMode={isDarkMode}
            renderEra5Loading={() => (
              <div className="p-12 flex flex-col items-center justify-center gap-3">
                <Skeleton className="w-full h-80 rounded-xl" />
              </div>
            )}
          />
        )}

        {/* 3. ZOM BMKG & DINAMIKA 36 DASARIAN */}
        {activeSubTab === "zom-onset" && (
          <ZomDynamicsSection
            dasarians={wmoNormalsData?.normals?.dasarians || null}
            seasonalDynamics={wmoNormalsData?.seasonalDynamics || null}
            isDarkMode={isDarkMode}
          />
        )}

        {/* 4. CHC CHIRPS SATELLITE ESTIMATES */}
        {activeSubTab === "satelit-chc" && (
          <ChcEarlyEstimatesViewer />
        )}
      </div>
    </div>
  );
}
