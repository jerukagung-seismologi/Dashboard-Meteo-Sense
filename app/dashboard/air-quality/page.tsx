// app/dashboard/air-quality/page.tsx
"use client";

import React from "react";
import { Wind, ShieldAlert, Sparkles, MapPin } from "lucide-react";
import { EcmwfAerosolViewer } from "@/components/air-quality/EcmwfAerosolViewer";
import { ClimateGlossary } from "@/components/climate-drivers/ClimateGlossary";

export default function AirQualityPage() {
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
            <Wind className="h-7 w-7 text-sky-400" /> Air Quality &amp; Aerosol Forecasts
          </h1>
          <p className="text-xs sm:text-sm text-slate-300 max-w-3xl leading-relaxed">
            Pemantauan dan prakiraan spasial kualitas udara, distribusi debu, serta ketebalan optik aerosol di wilayah Indonesia dan Asia Tenggara secara real-time.
          </p>
        </div>

        <div className="z-10 flex items-center gap-2 self-start md:self-auto bg-slate-800/80 px-3 py-2 rounded-xl border border-slate-700/60 text-xs text-slate-300 font-medium">
          <MapPin className="h-4 w-4 text-sky-400" />
          <span>Fokus Wilayah: Indonesia &amp; Asia Tenggara</span>
        </div>
      </div>

      {/* Main Interactive ECMWF CAMS Viewer Component */}
      <EcmwfAerosolViewer />

      {/* Comprehensive Air Quality & Climate Glossary */}
      <ClimateGlossary initialCategory="cams" />
    </div>
  );
}
