"use client";

import React from "react";
import { Badge } from "@/components/ui/badge";
import { AlertTriangle, Droplets, ShieldCheck, Sun, Waves } from "lucide-react";
import type { CewsMetrics } from "@/lib/seasonalPredictionTypes";

interface CewsAlertCardProps {
  cews?: CewsMetrics;
}

export default function CewsAlertCard({ cews }: CewsAlertCardProps) {
  if (!cews) {
    return (
      <div className="py-4 text-center text-xs text-slate-500">
        Data indikator CEWS / peringatan dini belum tersedia untuk wilayah ini.
      </div>
    );
  }

  const isHthWarning = (cews.hth_hari || 0) >= 11;
  const isSpiDry = (cews.spi_1_bulan || 0) <= -1.0 || (cews.spi_3_bulan || 0) <= -1.0;

  return (
    <div className="space-y-2.5 pt-1">
      <div className="flex items-center justify-between text-[11px] text-slate-600 dark:text-slate-400 pb-1 border-b border-slate-200 dark:border-slate-800">
        <span className="font-semibold text-slate-800 dark:text-slate-200">
          Climate Early Warning System (CEWS) & Status Hidrometeorologi Terkini
        </span>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-2">
        {/* Card 1: Hari Tanpa Hujan (HTH) */}
        <div className="rounded-lg border border-slate-200 dark:border-slate-800 p-2.5 bg-slate-50/50 dark:bg-slate-900/40 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-1">
              <span className="text-[11px] font-medium text-slate-500 dark:text-slate-400">Hari Tanpa Hujan (HTH)</span>
              <Sun className={`h-4 w-4 ${isHthWarning ? "text-amber-500" : "text-emerald-500"}`} />
            </div>
            <div className="flex items-baseline gap-1.5">
              <span className="text-xl font-extrabold text-slate-900 dark:text-slate-100">{cews.hth_hari}</span>
              <span className="text-xs font-semibold text-slate-600 dark:text-slate-400">Hari</span>
            </div>
            <p className="text-[11px] font-semibold text-slate-700 dark:text-slate-300 mt-0.5">
              {cews.hth_kategori}
            </p>
          </div>
          <div className="mt-2 pt-1 border-t border-slate-200/60 dark:border-slate-800/60">
            <Badge
              className={`text-[10px] px-1.5 py-0 border ${
                cews.hth_status === "Aman"
                  ? "bg-emerald-100 text-emerald-900 border-emerald-300 dark:bg-emerald-950/60 dark:text-emerald-200"
                  : "bg-amber-100 text-amber-900 border-amber-300 dark:bg-amber-950/60 dark:text-amber-200"
              }`}
            >
              Status: {cews.hth_status}
            </Badge>
          </div>
        </div>

        {/* Card 2: Peringatan Curah Hujan Tinggi (PDCHT) */}
        <div className="rounded-lg border border-slate-200 dark:border-slate-800 p-2.5 bg-slate-50/50 dark:bg-slate-900/40 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-1">
              <span className="text-[11px] font-medium text-slate-500 dark:text-slate-400">Peringatan Hujan Tinggi</span>
              <Droplets className="h-4 w-4 text-sky-500" />
            </div>
            <div className="flex items-baseline gap-1">
              <span className="text-sm font-bold text-slate-900 dark:text-slate-100">{cews.pdcht_status}</span>
            </div>
            <p className="text-[10px] text-slate-500 dark:text-slate-400 mt-1">
              Prakiraan akumulasi per dasarian &lt; 150 mm (Kategori Normal)
            </p>
          </div>
          <div className="mt-2 pt-1 border-t border-slate-200/60 dark:border-slate-800/60">
            <Badge className="text-[10px] px-1.5 py-0 bg-sky-100 text-sky-900 border border-sky-300 dark:bg-sky-950/60 dark:text-sky-200">
              <ShieldCheck className="h-3 w-3 mr-1 inline" /> Risiko Rendah
            </Badge>
          </div>
        </div>

        {/* Card 3: SPI 1-Bulan (Oktober) */}
        <div className="rounded-lg border border-slate-200 dark:border-slate-800 p-2.5 bg-slate-50/50 dark:bg-slate-900/40 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-1">
              <span className="text-[11px] font-medium text-slate-500 dark:text-slate-400">SPI 1-Bulan (Oktober)</span>
              <Waves className="h-4 w-4 text-indigo-500" />
            </div>
            <div className="flex items-baseline gap-1.5">
              <span className="text-xl font-extrabold text-slate-900 dark:text-slate-100">
                {cews.spi_1_bulan != null ? (cews.spi_1_bulan > 0 ? `+${cews.spi_1_bulan.toFixed(2)}` : cews.spi_1_bulan.toFixed(2)) : "0.00"}
              </span>
            </div>
            <p className="text-[11px] font-semibold text-slate-700 dark:text-slate-300 mt-0.5">
              Kategori: {cews.spi_1_kategori}
            </p>
          </div>
          <div className="mt-2 pt-1 border-t border-slate-200/60 dark:border-slate-800/60">
            <span className="text-[10px] text-slate-500 dark:text-slate-400">
              Deviasi anomali curah hujan 30 hari
            </span>
          </div>
        </div>

        {/* Card 4: SPI 3-Bulan (Agustus-Oktober) */}
        <div className="rounded-lg border border-slate-200 dark:border-slate-800 p-2.5 bg-slate-50/50 dark:bg-slate-900/40 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-1">
              <span className="text-[11px] font-medium text-slate-500 dark:text-slate-400">SPI 3-Bulan (Musiman)</span>
              <AlertTriangle className={`h-4 w-4 ${isSpiDry ? "text-amber-500" : "text-emerald-500"}`} />
            </div>
            <div className="flex items-baseline gap-1.5">
              <span className="text-xl font-extrabold text-slate-900 dark:text-slate-100">
                {cews.spi_3_bulan != null ? (cews.spi_3_bulan > 0 ? `+${cews.spi_3_bulan.toFixed(2)}` : cews.spi_3_bulan.toFixed(2)) : "0.00"}
              </span>
            </div>
            <p className="text-[11px] font-semibold text-slate-700 dark:text-slate-300 mt-0.5">
              Kategori: {cews.spi_3_kategori}
            </p>
          </div>
          <div className="mt-2 pt-1 border-t border-slate-200/60 dark:border-slate-800/60">
            <span className="text-[10px] text-slate-500 dark:text-slate-400">
              Evaluasi neraca air 90 hari terakhir
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}

