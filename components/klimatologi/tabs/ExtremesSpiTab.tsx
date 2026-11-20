"use client";

import React from "react";
import { ShieldAlert } from "lucide-react";
import { EtccdiExtremesSection } from "@/components/climatology/EtccdiExtremesSection";
import { SpiDroughtSection } from "@/components/climatology/SpiDroughtSection";

export interface ExtremesSpiTabProps {
  locationMode: "station" | "region";
  klimData: any;
  activeLocation: { name: string; [key: string]: any };
  isDarkMode: boolean;
  wmoNormalsData: any;
}

export function ExtremesSpiTab({
  locationMode,
  klimData,
  activeLocation,
  isDarkMode,
  wmoNormalsData,
}: ExtremesSpiTabProps) {
  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 bg-gradient-to-r from-red-50 to-amber-50 dark:from-red-950/30 dark:to-amber-950/30 rounded-xl border border-red-200 dark:border-red-900/50">
        <div>
          <h2 className="text-base font-bold text-red-950 dark:text-red-100 flex items-center gap-2">
            <ShieldAlert className="h-5 w-5 text-red-500" />
            Deteksi Indeks Iklim Ekstrem ETCCDI &amp; Monitoring Kekeringan SPI
          </h2>
          <p className="text-xs text-red-800 dark:text-red-300 mt-0.5">
            Kaidah WMO CCl/CLIVAR (RX1day, RX5day, SDII, R95p, CDD, SU35, DTR) · Standar WMO-No. 1090 SPI-1, SPI-3, SPI-6, SPI-12 untuk <strong>{activeLocation.name}</strong>
          </p>
        </div>
      </div>

      {/* ETCCDI Core Extremes */}
      {locationMode === "station" ? (
        <EtccdiExtremesSection
          points={klimData?.points || []}
          stationName={activeLocation.name}
          isDarkMode={isDarkMode}
        />
      ) : (
        <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 flex items-center justify-between flex-wrap gap-3">
          <div className="flex items-center gap-3">
            <ShieldAlert className="h-5 w-5 text-amber-500 shrink-0" />
            <div className="text-xs text-slate-600 dark:text-slate-300">
              <strong className="text-slate-900 dark:text-slate-100">Indeks Ekstremitas In-Situ (ETCCDI):</strong> Beroperasi menggunakan rekaman telemetri harian stasiun sensor fisik. Untuk wilayah regional <strong>{activeLocation.name}</strong>, evaluasi bahaya kekeringan &amp; kebasahan iklim didasarkan pada Indeks Presipitasi Terstandarisasi (SPI WMO) di bawah.
            </div>
          </div>
        </div>
      )}

      {/* SPI Drought Monitoring */}
      <SpiDroughtSection
        spiData={wmoNormalsData?.spi || null}
        currentPeriodNormals={wmoNormalsData?.currentPeriodNormals || null}
        isDarkMode={isDarkMode}
      />
    </div>
  );
}
