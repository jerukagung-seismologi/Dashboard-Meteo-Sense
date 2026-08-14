// components/validasi-bias/QCSummaryCard.tsx
"use client";

import React from "react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { CheckCircle2, AlertTriangle, XCircle, HelpCircle, ShieldAlert } from "lucide-react";
import { MeteorologicalVariable } from "@/lib/bias-correction/types";
import { QCSummaryStatistics } from "@/lib/bias-correction/qc/variableQC";

interface QCSummaryCardProps {
  summaries: Record<MeteorologicalVariable, QCSummaryStatistics>;
  selectedVariable: MeteorologicalVariable;
}

const VARIABLE_LABELS: Record<MeteorologicalVariable, string> = {
  air_temperature: "Suhu Udara (2m)",
  relative_humidity: "Kelembapan Relatif (RH)",
  dew_point_temperature: "Titik Embun (Dew Point)",
  surface_pressure: "Tekanan Permukaan (P)",
  wind_speed: "Kecepatan Angin (10m)",
  wind_direction: "Arah Angin (Circular)",
  precipitation: "Presipitasi (Rainfall)",
};

export const QCSummaryCard: React.FC<QCSummaryCardProps> = ({
  summaries,
  selectedVariable,
}) => {
  const current = summaries[selectedVariable] || {
    total: 0,
    good: 0,
    suspect: 0,
    invalid: 0,
    missing: 0,
    notSignificant: 0,
    passRatePercent: 100,
  };

  const goodPct = current.total > 0 ? ((current.good / current.total) * 100).toFixed(1) : "0";
  const suspectPct = current.total > 0 ? ((current.suspect / current.total) * 100).toFixed(1) : "0";
  const invalidPct = current.total > 0 ? ((current.invalid / current.total) * 100).toFixed(1) : "0";
  const missingPct = current.total > 0 ? ((current.missing / current.total) * 100).toFixed(1) : "0";

  return (
    <Card className="border-slate-200 dark:border-slate-800 shadow-sm bg-white dark:bg-slate-900">
      <CardHeader className="pb-3 border-b border-slate-100 dark:border-slate-800">
        <div className="flex justify-between items-center">
          <div>
            <CardTitle className="text-sm font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
              <ShieldAlert className="w-4 h-4 text-emerald-600" />
              Quality Control (QC) & Integritas Observasi
            </CardTitle>
            <p className="text-xs text-slate-500 mt-0.5">
              Layer 2: Evaluasi multi-kriteria (Physical Range, Spike, Persistence, Thermodynamic).
            </p>
          </div>
          <div className="text-right">
            <span className="text-xs text-slate-400 block">QC Pass Rate</span>
            <span className="text-lg font-black text-emerald-600 font-mono">
              {current.passRatePercent}%
            </span>
          </div>
        </div>
      </CardHeader>

      <CardContent className="pt-4 space-y-4">
        {/* Progress Bar Breakdown */}
        <div className="space-y-1.5">
          <div className="flex justify-between text-xs text-slate-600 dark:text-slate-400">
            <span>Variabel Terpilih: <strong>{VARIABLE_LABELS[selectedVariable]}</strong></span>
            <span>Total Observasi: <strong>{current.total.toLocaleString()}</strong></span>
          </div>
          <Progress value={current.passRatePercent} className="h-2 bg-slate-100 dark:bg-slate-800" />
        </div>

        {/* Flag Breakdown Badges */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
          <div className="p-2.5 rounded-lg border border-emerald-200 dark:border-emerald-900/50 bg-emerald-50/50 dark:bg-emerald-950/30 flex items-center justify-between">
            <div className="flex items-center gap-1.5">
              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
              <div>
                <span className="font-semibold text-emerald-900 dark:text-emerald-200 block">GOOD</span>
                <span className="text-[10px] text-emerald-700/80 dark:text-emerald-400">Lolos Uji QC</span>
              </div>
            </div>
            <div className="text-right">
              <span className="font-bold font-mono text-emerald-900 dark:text-emerald-100">{current.good}</span>
              <span className="text-[10px] text-emerald-600 block">{goodPct}%</span>
            </div>
          </div>

          <div className="p-2.5 rounded-lg border border-amber-200 dark:border-amber-900/50 bg-amber-50/50 dark:bg-amber-950/30 flex items-center justify-between">
            <div className="flex items-center gap-1.5">
              <AlertTriangle className="w-4 h-4 text-amber-600" />
              <div>
                <span className="font-semibold text-amber-900 dark:text-amber-200 block">SUSPECT</span>
                <span className="text-[10px] text-amber-700/80 dark:text-amber-400">Spike / Stuck</span>
              </div>
            </div>
            <div className="text-right">
              <span className="font-bold font-mono text-amber-900 dark:text-amber-100">{current.suspect}</span>
              <span className="text-[10px] text-amber-600 block">{suspectPct}%</span>
            </div>
          </div>

          <div className="p-2.5 rounded-lg border border-rose-200 dark:border-rose-900/50 bg-rose-50/50 dark:bg-rose-950/30 flex items-center justify-between">
            <div className="flex items-center gap-1.5">
              <XCircle className="w-4 h-4 text-rose-600" />
              <div>
                <span className="font-semibold text-rose-900 dark:text-rose-200 block">INVALID</span>
                <span className="text-[10px] text-rose-700/80 dark:text-rose-400">Luar Batas Fisik</span>
              </div>
            </div>
            <div className="text-right">
              <span className="font-bold font-mono text-rose-900 dark:text-rose-100">{current.invalid}</span>
              <span className="text-[10px] text-rose-600 block">{invalidPct}%</span>
            </div>
          </div>

          <div className="p-2.5 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/40 flex items-center justify-between">
            <div className="flex items-center gap-1.5">
              <HelpCircle className="w-4 h-4 text-slate-400" />
              <div>
                <span className="font-semibold text-slate-800 dark:text-slate-200 block">MISSING</span>
                <span className="text-[10px] text-slate-500">Nilai Kosong</span>
              </div>
            </div>
            <div className="text-right">
              <span className="font-bold font-mono text-slate-800 dark:text-slate-200">{current.missing}</span>
              <span className="text-[10px] text-slate-500 block">{missingPct}%</span>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
