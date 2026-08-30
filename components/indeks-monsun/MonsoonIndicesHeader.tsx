// components/indeks-monsun/MonsoonIndicesHeader.tsx
"use client";

import React from "react";
import { Wind, RefreshCw, Sparkles, Layers } from "lucide-react";
import { Button } from "@/components/ui/button";

interface MonsoonIndicesHeaderProps {
  onRefresh?: () => void;
  isRefreshing?: boolean;
}

export const MonsoonIndicesHeader: React.FC<MonsoonIndicesHeaderProps> = ({
  onRefresh,
  isRefreshing = false,
}) => {
  return (
    <div className="bg-gradient-to-r from-teal-950 via-slate-900 to-slate-950 text-white rounded-2xl shadow-lg border border-teal-800/40 overflow-hidden relative mb-6">
      {/* Background Ambient Glow */}
      <div className="absolute top-0 right-0 w-64 h-64 bg-teal-500/10 rounded-full blur-3xl pointer-events-none" />

      {/* Main Banner Header Content */}
      <div className="p-6 flex flex-col md:flex-row md:items-center justify-between gap-4 relative z-10">
        <div className="space-y-1.5">
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase tracking-wider bg-teal-500/20 text-teal-300 border border-teal-400/30 flex items-center gap-1">
              <Sparkles className="h-3 w-3 text-teal-300" /> Regional Monsoon Circulation &amp; Teleconnections
            </span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-black tracking-tight flex items-center gap-3">
            <Wind className="h-7 w-7 text-teal-400" /> Indeks Monsun &amp; Sirkulasi Regional
          </h1>
          <p className="text-xs sm:text-sm text-slate-300 max-w-2xl leading-relaxed">
            Pemantauan kuantitatif sirkulasi monsun Asia–Pasifik–Australia: <strong>AUSMI</strong>, <strong>WNPMI</strong>, <strong>SCSMI</strong>, <strong>Cold Surge (CSI)</strong>, dan <strong>BSISO</strong> penentu transisi musim di Indonesia.
          </p>
        </div>

        {/* Action Button */}
        <div className="flex items-center gap-2 self-start md:self-auto">
          {onRefresh && (
            <Button
              variant="outline"
              size="sm"
              onClick={onRefresh}
              disabled={isRefreshing}
              className="bg-white/10 hover:bg-white/20 text-white border-white/20 h-9 font-semibold text-xs gap-1.5 shadow-sm"
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
