"use client";

import React from "react";
import { Badge } from "@/components/ui/badge";
import { Calendar, Sprout, Wheat, AlertCircle } from "lucide-react";
import type { KatamProfile } from "@/lib/seasonalPredictionTypes";

interface KatamTimelineProps {
  katam?: KatamProfile;
  sifatHujan?: string;
  isDarkMode?: boolean;
}

export default function KatamTimeline({ katam, sifatHujan }: KatamTimelineProps) {
  if (!katam) {
    return (
      <div className="py-4 text-center text-xs text-slate-500">
        Data Kalender Tanam belum tersedia untuk wilayah ini.
      </div>
    );
  }

  const stages = [
    {
      id: "mt1",
      data: katam.mt1,
      icon: <Wheat className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />,
      badgeColor: "bg-emerald-100 text-emerald-900 border-emerald-300 dark:bg-emerald-950/60 dark:text-emerald-200",
      accentBorder: "border-emerald-500/40 bg-emerald-50/50 dark:bg-emerald-950/20",
    },
    {
      id: "mt2",
      data: katam.mt2,
      icon: <Sprout className="h-4 w-4 text-sky-600 dark:text-sky-400" />,
      badgeColor: "bg-sky-100 text-sky-900 border-sky-300 dark:bg-sky-950/60 dark:text-sky-200",
      accentBorder: "border-sky-500/40 bg-sky-50/50 dark:bg-sky-950/20",
    },
    {
      id: "mt3",
      data: katam.mt3,
      icon: <Calendar className="h-4 w-4 text-amber-600 dark:text-amber-400" />,
      badgeColor: "bg-amber-100 text-amber-900 border-amber-300 dark:bg-amber-950/60 dark:text-amber-200",
      accentBorder: "border-amber-500/40 bg-amber-50/50 dark:bg-amber-950/20",
    },
  ];

  return (
    <div className="space-y-2.5 pt-1">
      <div className="flex items-center justify-between text-[11px] text-slate-600 dark:text-slate-400 pb-1 border-b border-slate-200 dark:border-slate-800">
        <span className="font-semibold text-slate-800 dark:text-slate-200">
          Rekomendasi Pola Tanam Berdasarkan Awal Musim & Sifat Hujan ({sifatHujan || "Normal"})
        </span>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
        {stages.map((stage) => {
          const d = stage.data;
          const items = d.varietas || d.komoditas || [];
          return (
            <div
              key={stage.id}
              className={`rounded-lg border p-2.5 flex flex-col justify-between transition-all ${stage.accentBorder}`}
            >
              <div>
                <div className="flex items-center justify-between gap-1.5 mb-1.5">
                  <div className="flex items-center gap-1.5">
                    {stage.icon}
                    <span className="text-xs font-bold text-slate-900 dark:text-slate-100">{d.nama}</span>
                  </div>
                  <Badge className={`text-[10px] px-1.5 py-0 border ${stage.badgeColor}`}>
                    {d.tanam}
                  </Badge>
                </div>

                <div className="space-y-1 text-[11px] text-slate-700 dark:text-slate-300">
                  {d.olah_tanah && (
                    <div className="flex justify-between">
                      <span className="text-slate-500 dark:text-slate-400">Olah Tanah:</span>
                      <span className="font-semibold">{d.olah_tanah}</span>
                    </div>
                  )}
                  <div className="flex justify-between">
                    <span className="text-slate-500 dark:text-slate-400">Periode Tanam:</span>
                    <span className="font-bold text-slate-900 dark:text-slate-100">{d.tanam}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500 dark:text-slate-400">Estimasi Panen:</span>
                    <span className="font-semibold">{d.panen}</span>
                  </div>
                </div>

                {items.length > 0 && (
                  <div className="mt-2 pt-1.5 border-t border-slate-200/60 dark:border-slate-800/60">
                    <p className="text-[10px] font-semibold text-slate-500 dark:text-slate-400 mb-1">
                      {d.varietas ? "Varietas Rekomendasi:" : "Komoditas Pilihan:"}
                    </p>
                    <div className="flex flex-wrap gap-1">
                      {items.map((v, i) => (
                        <span
                          key={i}
                          className="inline-block px-1.5 py-0.5 rounded text-[10px] font-medium bg-white/80 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-200"
                        >
                          {v}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {d.tips && (
                <div className="mt-2 pt-1 text-[10px] text-slate-600 dark:text-slate-400 flex items-start gap-1 italic">
                  <AlertCircle className="h-3 w-3 shrink-0 text-slate-400 mt-0.5" />
                  <span>{d.tips}</span>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

