"use client";

import React from "react";
import { CalendarDays } from "lucide-react";
import { ZomDynamicsSection } from "@/components/climatology/ZomDynamicsSection";

export interface ZomDynamicsTabProps {
  activeLocation: { name: string; [key: string]: any };
  wmoNormalsData: any;
  isDarkMode: boolean;
}

export function ZomDynamicsTab({
  activeLocation,
  wmoNormalsData,
  isDarkMode,
}: ZomDynamicsTabProps) {
  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 bg-gradient-to-r from-teal-50 to-cyan-50 dark:from-teal-950/30 dark:to-cyan-950/30 rounded-xl border border-teal-200 dark:border-teal-900/50">
        <div>
          <h2 className="text-base font-bold text-teal-950 dark:text-teal-100 flex items-center gap-2">
            <CalendarDays className="h-5 w-5 text-teal-500" />
            Dinamika 36 Dasarian &amp; Prediksi Onset Musim BMKG (Zona Musim)
          </h2>
          <p className="text-xs text-teal-800 dark:text-teal-300 mt-0.5">
            Kaidah Resmi BMKG: Awal Musim Hujan (AMH ≥50 mm × 3 dasarian) &amp; Awal Musim Kemarau (AMK &lt;50 mm × 3 dasarian) untuk <strong>{activeLocation.name}</strong>
          </p>
        </div>
      </div>

      <ZomDynamicsSection
        dasarians={wmoNormalsData?.normals?.dasarians || null}
        seasonalDynamics={wmoNormalsData?.seasonalDynamics || null}
        isDarkMode={isDarkMode}
      />
    </div>
  );
}
