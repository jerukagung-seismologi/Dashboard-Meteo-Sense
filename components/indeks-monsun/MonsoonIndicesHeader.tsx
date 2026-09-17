// components/indeks-monsun/MonsoonIndicesHeader.tsx
"use client";

import React from "react";
import { Wind, RefreshCw, Sparkles, Layers } from "lucide-react";
import { Button } from "@/components/ui/button";

interface MonsoonIndicesHeaderProps {
  onRefresh?: () => void;
  isRefreshing?: boolean;
  lastUpdated?: string;
}

export const MonsoonIndicesHeader: React.FC<MonsoonIndicesHeaderProps> = ({
  onRefresh,
  isRefreshing = false,
  lastUpdated,
}) => {
  return (
    <div className="bg-gradient-to-r from-teal-950 via-slate-900 to-slate-950 text-white rounded-2xl shadow-md border border-teal-800/40 overflow-hidden relative mb-6">
      {/* Background Ambient Glow */}
      <div className="absolute top-0 right-0 w-64 h-64 bg-teal-500/15 rounded-full blur-3xl pointer-events-none" />

      {/* Main Banner Header Content (Compact: p-4 sm:p-5) */}
      <div className="p-4 sm:p-5 flex flex-col md:flex-row md:items-center justify-between gap-4 relative z-10">
        <div className="space-y-1.5 min-w-0">
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-teal-500/20 text-teal-300 border border-teal-400/30 flex items-center gap-1 shadow-sm">
              <Sparkles className="h-3 w-3 text-teal-300" /> Regional Monsoon Circulation &amp; Teleconnections
            </span>
          </div>
          <h1 className="text-xl sm:text-2xl font-extrabold tracking-tight flex items-center gap-2.5 text-white">
            <Wind className="h-5 w-5 sm:h-6 sm:w-6 text-teal-400 shrink-0" /> Indeks Monsun &amp; Sirkulasi Regional
          </h1>
          <p className="text-xs sm:text-sm text-slate-300 font-normal max-w-3xl leading-relaxed">
            Pemantauan kuantitatif sirkulasi monsun Asia–Pasifik–Australia (AUSMI, WNPMI, SCSMI, Cold Surge CSI, dan BSISO) penentu transisi musim &amp; curah hujan di Indonesia.
          </p>
        </div>

        {/* Action Button & Status Badge */}
        <div className="flex flex-wrap items-center gap-2.5 self-start md:self-auto shrink-0">
          {lastUpdated && (
            <div className="px-3 py-1.5 bg-teal-950/70 backdrop-blur-md rounded-xl border border-teal-500/30 text-left shrink-0">
              <span className="text-[10px] font-semibold uppercase tracking-wider text-teal-300 block">Terakhir Diperbarui</span>
              <span className="text-xs font-bold font-mono tracking-tight text-white tabular-nums">{lastUpdated}</span>
            </div>
          )}
          {onRefresh && (
            <Button
              variant="outline"
              size="sm"
              onClick={onRefresh}
              disabled={isRefreshing}
              className="bg-white/10 hover:bg-white/20 text-white border-white/20 h-8 px-3.5 rounded-xl font-semibold text-xs gap-1.5 shadow-sm transition-colors"
            >
              <RefreshCw className={`h-3.5 w-3.5 ${isRefreshing ? "animate-spin text-teal-300" : ""}`} />
              <span>Perbarui Data</span>
            </Button>
          )}
        </div>
      </div>
    </div>
  );
};
