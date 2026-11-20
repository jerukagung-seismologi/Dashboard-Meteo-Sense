"use client";

import React from "react";
import { CloudSun, RefreshCw, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { WalterLiethClimograph } from "@/components/climatology/WalterLiethClimograph";
import { ClimateClassificationCard } from "@/components/climatology/ClimateClassificationCard";

interface ClimateProfileTabProps {
  activeLocation: { name: string; [key: string]: any };
  handleRefreshKlim: () => void;
  isWmoNormalsLoading: boolean;
  wmoNormalsData: any;
  isDarkMode: boolean;
}

export function ClimateProfileTab({
  activeLocation,
  handleRefreshKlim,
  isWmoNormalsLoading,
  wmoNormalsData,
  isDarkMode,
}: ClimateProfileTabProps) {
  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-950/30 dark:to-indigo-950/30 rounded-xl border border-blue-200 dark:border-blue-900/50">
        <div>
          <h2 className="text-base font-bold text-blue-950 dark:text-blue-100 flex items-center gap-2">
            <CloudSun className="h-5 w-5 text-blue-500" />
            Profil Normal Klimatologis WMO 1991–2020 &amp; Taksonomi Iklim Tropis
          </h2>
          <p className="text-xs text-blue-800 dark:text-blue-300 mt-0.5">
            Diagram Iklim Walter-Lieth resmi WMO ($P=2T$) · Klasifikasi Oldeman Pangan · Mohr/Schmidt-Ferguson Kehutanan · Taksonomi Global Köppen-Geiger untuk <strong>{activeLocation.name}</strong>
          </p>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={handleRefreshKlim}
          disabled={isWmoNormalsLoading}
          className="h-8 px-3 text-xs border-blue-300 dark:border-blue-800 text-blue-700 dark:text-blue-300 hover:bg-blue-50 dark:hover:bg-blue-950/50 shrink-0"
        >
          <RefreshCw className={`h-3.5 w-3.5 mr-1.5 ${isWmoNormalsLoading ? "animate-spin" : ""}`} /> Perbarui Normal
        </Button>
      </div>

      {isWmoNormalsLoading && !wmoNormalsData ? (
        <div className="flex flex-col items-center justify-center h-64 space-y-3 bg-white dark:bg-slate-900 rounded-xl">
          <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
          <p className="text-xs text-slate-500 font-medium">Mengambil 30-tahun arsip WMO 1991–2020 dan menghitung bioklimatologi untuk {activeLocation.name}...</p>
        </div>
      ) : (
        <>
          {/* Walter-Lieth Climograph */}
          <WalterLiethClimograph
            normals={wmoNormalsData?.normals || null}
            stationName={activeLocation.name}
            isDarkMode={isDarkMode}
          />

          {/* Climate Classification Cards (Oldeman, Schmidt-Ferguson, Köppen) */}
          <ClimateClassificationCard
            classification={wmoNormalsData?.classification || null}
            isDarkMode={isDarkMode}
          />
        </>
      )}
    </div>
  );
}
