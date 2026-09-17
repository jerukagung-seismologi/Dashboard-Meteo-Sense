// app/dashboard/air-quality/page.tsx
"use client";

import React, { useState, useEffect } from "react";
import { Wind, Flame, Sparkles, MapPin, Activity } from "lucide-react";
import { GasPollutantsViewer } from "@/components/air-quality/GasPollutantsViewer";
import { EcmwfAerosolViewer } from "@/components/air-quality/EcmwfAerosolViewer";
import { ClimateGlossary } from "@/components/climate-drivers/ClimateGlossary";

import { PageHeaderBanner } from "@/components/ui/PageHeaderBanner";

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
      {/* Subpage Header Banner */}
      <PageHeaderBanner
        gradient="sky"
        badgeText="ECMWF CAMS Atmosphere Monitoring"
        icon={Wind}
        title="Air Quality, Gas Pollutants & Aerosol"
        subtitle="Pemantauan real-time dan prakiraan gas polutan (Karbon Monoksida, Karbon Dioksida, NO2, SO2, Ozon), partikulat PM2.5/PM10, serta distribusi aerosol CAMS di Indonesia."
        actions={
          <div className="flex items-center gap-2 bg-slate-800/80 px-3 py-2 rounded-xl border border-slate-700/60 text-xs text-slate-300 font-medium">
            <MapPin className="h-4 w-4 text-sky-400 shrink-0" />
            <span>Fokus Wilayah: Indonesia &amp; Asia Tenggara</span>
          </div>
        }
      />

      {/* 1. Gas Pollutants & Air Quality Time-Series Plots (CO, CO2, NO2, SO2, O3, PM2.5/PM10) */}
      <GasPollutantsViewer isDarkMode={isDarkMode} />

      {/* 2. Main Interactive ECMWF CAMS Spatial Aerosol Viewer Component */}
      <EcmwfAerosolViewer />

      {/* 3. Comprehensive Air Quality & Climate Glossary */}
      <ClimateGlossary initialCategory="cams" />
    </div>
  );
}
