// app/dashboard/air-quality/page.tsx
"use client";

import React, { useState, useEffect } from "react";
import { Wind, Flame, Sparkles, MapPin, Activity } from "lucide-react";
import { GasPollutantsViewer } from "@/components/air-quality/GasPollutantsViewer";
import { EcmwfAerosolViewer } from "@/components/air-quality/EcmwfAerosolViewer";
import { ClimateGlossary } from "@/components/climate-drivers/ClimateGlossary";

export default function AirQualityPage() {
  const [isDarkMode, setIsDarkMode] = useState(false);

  useEffect(() => {
    const checkDarkMode = () => {
      setIsDarkMode(document.documentElement.classList.contains("dark"));
    };
    checkDarkMode();
    window.addEventListener("resize", checkDarkMode);
    const observer = new MutationObserver(checkDarkMode);
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ["class"] });
    return () => {
      window.removeEventListener("resize", checkDarkMode);
      observer.disconnect();
    };
  }, []);

  return (
    <div className="space-y-6 pb-12">
      {/* Subpage Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-6 bg-gradient-to-r from-sky-900 via-slate-900 to-slate-950 text-white rounded-2xl shadow-lg border border-sky-800/40 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-64 h-64 bg-sky-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="space-y-1.5 z-10">
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase tracking-wider bg-sky-500/20 text-sky-300 border border-sky-400/30 flex items-center gap-1">
              <Sparkles className="h-3 w-3" /> ECMWF CAMS Atmosphere Monitoring
            </span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-black tracking-tight flex items-center gap-3">
            <Wind className="h-7 w-7 text-sky-400" /> Air Quality, Gas Pollutants &amp; Aerosol
          </h1>
          <p className="text-xs sm:text-sm text-slate-300 max-w-3xl leading-relaxed">
            Pemantauan real-time dan prakiraan gas polutan (Karbon Monoksida, Karbon Dioksida, NO2, SO2, Ozon), partikulat PM2.5/PM10, serta distribusi aerosol CAMS di Indonesia.
          </p>
        </div>

        <div className="z-10 flex items-center gap-2 self-start md:self-auto bg-slate-800/80 px-3 py-2 rounded-xl border border-slate-700/60 text-xs text-slate-300 font-medium">
          <MapPin className="h-4 w-4 text-sky-400" />
          <span>Fokus Wilayah: Indonesia &amp; Asia Tenggara</span>
        </div>
      </div>

      {/* 1. Gas Pollutants & Air Quality Time-Series Plots (CO, CO2, NO2, SO2, O3, PM2.5/PM10) */}
      <GasPollutantsViewer isDarkMode={isDarkMode} />

      {/* 2. Main Interactive ECMWF CAMS Spatial Aerosol Viewer Component */}
      <EcmwfAerosolViewer />

      {/* 3. Comprehensive Air Quality & Climate Glossary */}
      <ClimateGlossary initialCategory="cams" />
    </div>
  );
}
