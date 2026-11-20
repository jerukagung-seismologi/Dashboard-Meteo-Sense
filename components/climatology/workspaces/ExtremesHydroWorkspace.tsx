// components/climatology/workspaces/ExtremesHydroWorkspace.tsx
"use client";

import React, { useState } from "react";
import dynamic from "next/dynamic";
import {
  ShieldAlert,
  Droplets,
  Flame,
  AlertTriangle,
  Waves,
} from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { ClimatologyWorkspaceHook } from "@/hooks/climatology/useClimatologyWorkspace";

const DesignRainfallSection = dynamic(
  () => import("@/components/climatology/DesignRainfallSection").then((m) => m.DesignRainfallSection),
  { ssr: false, loading: () => <Skeleton className="w-full h-96 rounded-xl" /> }
);
const EtccdiExtremesSection = dynamic(
  () => import("@/components/climatology/EtccdiExtremesSection").then((m) => m.EtccdiExtremesSection),
  { ssr: false, loading: () => <Skeleton className="w-full h-80 rounded-xl" /> }
);
const SpiDroughtSection = dynamic(
  () => import("@/components/climatology/SpiDroughtSection").then((m) => m.SpiDroughtSection),
  { ssr: false, loading: () => <Skeleton className="w-full h-80 rounded-xl" /> }
);
const ClimateExtremesCards = dynamic(
  () => import("@/components/climatology/ClimateExtremesCards").then((m) => m.ClimateExtremesCards),
  { ssr: false, loading: () => <Skeleton className="w-full h-36 rounded-xl" /> }
);

export type ExtremesHydroSubTab = "hujan-rencana" | "etccdi" | "spi";

interface ExtremesHydroWorkspaceProps {
  ws: ClimatologyWorkspaceHook;
}

export default function ExtremesHydroWorkspace({ ws }: ExtremesHydroWorkspaceProps) {
  const [activeSubTab, setActiveSubTab] = useState<ExtremesHydroSubTab>("hujan-rencana");

  const {
    locationMode,
    activeLocation,
    klimData,
    isDarkMode,
    wmoNormalsData,
    climateExtremes,
  } = ws;

  return (
    <div className="space-y-6">
      {/* ── SUB-TABS NAVIGATION ── */}
      <div className="flex items-center gap-1.5 p-1 bg-slate-100 dark:bg-slate-800/80 rounded-xl overflow-x-auto border border-slate-200 dark:border-slate-800 scrollbar-none">
        <button
          onClick={() => setActiveSubTab("hujan-rencana")}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition ${
            activeSubTab === "hujan-rencana"
              ? "bg-white dark:bg-slate-900 text-sky-600 dark:text-sky-400 shadow-xs font-bold"
              : "text-slate-600 dark:text-slate-400 hover:text-slate-900"
          }`}
        >
          <Droplets className="h-3.5 w-3.5 text-sky-500" />
          <span>Hujan Rencana &amp; Poligon Thiessen</span>
        </button>

        <button
          onClick={() => setActiveSubTab("etccdi")}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition ${
            activeSubTab === "etccdi"
              ? "bg-white dark:bg-slate-900 text-rose-600 dark:text-rose-400 shadow-xs font-bold"
              : "text-slate-600 dark:text-slate-400 hover:text-slate-900"
          }`}
        >
          <ShieldAlert className="h-3.5 w-3.5 text-rose-500" />
          <span>Indeks Ekstrem ETCCDI (WMO)</span>
        </button>

        <button
          onClick={() => setActiveSubTab("spi")}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition ${
            activeSubTab === "spi"
              ? "bg-white dark:bg-slate-900 text-amber-600 dark:text-amber-400 shadow-xs font-bold"
              : "text-slate-600 dark:text-slate-400 hover:text-slate-900"
          }`}
        >
          <Flame className="h-3.5 w-3.5 text-amber-500" />
          <span>Monitoring Kekeringan SPI WMO</span>
        </button>
      </div>

      {/* ── ON-DEMAND SUB-TAB CONTENT ── */}
      <div className="space-y-6">
        {/* 1. CURAH HUJAN RENCANA & THIESSEN POLYGON */}
        {activeSubTab === "hujan-rencana" && (
          <DesignRainfallSection
            initialStationId={
              activeLocation?.mode === "station" && activeLocation.sensorId
                ? activeLocation.sensorId
                : "stasiun-jerukagung-klirong"
            }
          />
        )}

        {/* 2. ETCCDI CORE CLIMATE EXTREMES */}
        {activeSubTab === "etccdi" && (
          <div className="space-y-6">
            {climateExtremes && klimData?.stats && (
              <ClimateExtremesCards extremes={climateExtremes} stats={klimData.stats} />
            )}

            {locationMode === "station" ? (
              <EtccdiExtremesSection
                points={klimData?.points || []}
                stationName={activeLocation.name}
                isDarkMode={isDarkMode}
              />
            ) : (
              <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 flex items-center gap-3">
                <ShieldAlert className="h-5 w-5 text-amber-500 shrink-0" />
                <div className="text-xs text-slate-600 dark:text-slate-300">
                  <strong className="text-slate-900 dark:text-slate-100">Indeks Ekstremitas In-Situ (ETCCDI):</strong> Beroperasi menggunakan rekaman telemetri harian stasiun sensor fisik. Untuk wilayah regional <strong>{activeLocation.name}</strong>, evaluasi bahaya kekeringan &amp; kebasahan iklim didasarkan pada Indeks Presipitasi Terstandarisasi (SPI WMO).
                </div>
              </div>
            )}
          </div>
        )}

        {/* 3. SPI DROUGHT MONITORING */}
        {activeSubTab === "spi" && (
          <SpiDroughtSection
            spiData={wmoNormalsData?.spi || null}
            currentPeriodNormals={wmoNormalsData?.currentPeriodNormals || null}
            isDarkMode={isDarkMode}
          />
        )}
      </div>
    </div>
  );
}
