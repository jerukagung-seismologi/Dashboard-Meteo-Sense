// components/peta/KecamatanDetailDrawer.tsx
"use client";

import React, { useState } from "react";
import {
  X,
  MapPin,
  Calendar,
  CloudRain,
  Sprout,
  TrendingUp,
  Droplets,
  AlertCircle,
  Info,
  CheckCircle2,
  CalendarDays,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

export interface KecamatanSeasonalData {
  kecamatan: string;
  code?: string;
  prakiraan_amh?: string;
  normal_amh?: string;
  perbandingan_amh_thd_normal?: string;
  sifat_hujan?: string;
  prakiraan_curah_hujan_total?: number;
  prakiraan_puncak_bulan?: string;
  prakiraan_amk?: string;
  normal_amk?: string;
  perbandingan_amk_thd_normal?: string;
  katam?: {
    rekomendasi_utama?: string;
    jadwal_tanam_optimal?: string;
    varietas_rekomendasi?: string;
    kebutuhan_air_mm_hari?: number;
    potensi_stres_air?: string;
    catatan?: string;
  };
  dasarian_trend?: Array<{
    dasarian: string;
    rain: number;
    normal: number;
  }>;
}

interface KecamatanDetailDrawerProps {
  data: KecamatanSeasonalData | null;
  onClose: () => void;
  isDarkMode?: boolean;
}

export const KecamatanDetailDrawer: React.FC<KecamatanDetailDrawerProps> = ({
  data,
  onClose,
  isDarkMode = false,
}) => {
  const [activeTab, setActiveTab] = useState<"iklim" | "katam" | "dasarian">("iklim");

  if (!data) return null;

  const amhStatus = data.perbandingan_amh_thd_normal || "Sama";
  const sifatHujan = data.sifat_hujan || "Normal";

  const getAmhBadgeColor = (status: string) => {
    const s = status.toLowerCase();
    if (s.includes("maju")) return "bg-blue-600 text-white";
    if (s.includes("mundur")) return "bg-amber-600 text-white";
    return "bg-emerald-600 text-white";
  };

  const getSifatBadgeColor = (sh: string) => {
    const s = sh.toLowerCase();
    if (s.includes("atas")) return "bg-cyan-600 text-white";
    if (s.includes("bawah")) return "bg-rose-600 text-white";
    return "bg-emerald-600 text-white";
  };

  return (
    <div className="absolute inset-x-2 top-2 sm:inset-auto sm:top-4 sm:right-4 z-[1000] w-auto sm:w-[420px] max-w-[calc(100vw-16px)] sm:max-w-md max-h-[calc(100%-16px)] sm:max-h-[calc(100%-32px)] bg-white/95 dark:bg-slate-900/95 backdrop-blur-md rounded-2xl sm:rounded-3xl shadow-2xl border border-slate-200/80 dark:border-slate-800 flex flex-col overflow-hidden animate-in slide-in-from-right-5 duration-200">
      {/* Drawer Header */}
      <div className="p-4 sm:p-5 border-b border-slate-100 dark:border-slate-800 flex items-start justify-between gap-3 bg-gradient-to-r from-sky-50/70 via-transparent to-indigo-50/70 dark:from-sky-950/30 dark:to-transparent">
        <div>
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-sky-500 animate-pulse" />
            <h2 className="text-base sm:text-lg font-black tracking-tight text-slate-900 dark:text-slate-100">
              Kecamatan {data.kecamatan}
            </h2>
          </div>
          <div className="flex items-center gap-2 mt-1 text-xs text-slate-500 dark:text-slate-400">
            <MapPin className="h-3 w-3 text-sky-500" />
            <span>Kabupaten Kebumen {data.code ? `• Kode ${data.code}` : ""}</span>
          </div>
        </div>

        <button
          onClick={onClose}
          className="p-1.5 rounded-full hover:bg-slate-200/60 dark:hover:bg-slate-800 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 transition-colors cursor-pointer"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      {/* Mode Tabs Switcher */}
      <div className="px-4 pt-3 pb-2 border-b border-slate-100 dark:border-slate-800 flex items-center gap-1.5 bg-slate-50/50 dark:bg-slate-900/50">
        <button
          onClick={() => setActiveTab("iklim")}
          className={`flex-1 py-1.5 px-2 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
            activeTab === "iklim"
              ? "bg-white dark:bg-slate-800 text-sky-600 dark:text-sky-400 shadow-xs border border-slate-200 dark:border-slate-700"
              : "text-slate-600 dark:text-slate-400 hover:text-slate-900"
          }`}
        >
          <CloudRain className="h-3.5 w-3.5" />
          <span>Iklim &amp; Musim</span>
        </button>
        <button
          onClick={() => setActiveTab("katam")}
          className={`flex-1 py-1.5 px-2 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
            activeTab === "katam"
              ? "bg-white dark:bg-slate-800 text-emerald-600 dark:text-emerald-400 shadow-xs border border-slate-200 dark:border-slate-700"
              : "text-slate-600 dark:text-slate-400 hover:text-slate-900"
          }`}
        >
          <Sprout className="h-3.5 w-3.5" />
          <span>KATAM AI</span>
        </button>
        {data.dasarian_trend && data.dasarian_trend.length > 0 && (
          <button
            onClick={() => setActiveTab("dasarian")}
            className={`flex-1 py-1.5 px-2 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
              activeTab === "dasarian"
                ? "bg-white dark:bg-slate-800 text-indigo-600 dark:text-indigo-400 shadow-xs border border-slate-200 dark:border-slate-700"
                : "text-slate-600 dark:text-slate-400 hover:text-slate-900"
            }`}
          >
            <TrendingUp className="h-3.5 w-3.5" />
            <span>Dasarian</span>
          </button>
        )}
      </div>

      {/* Drawer Body Scrollable */}
      <div className="p-4 sm:p-5 overflow-y-auto space-y-4 max-h-[calc(100vh-280px)]">
        {/* Tab 1: Iklim & Prakiraan Musim */}
        {activeTab === "iklim" && (
          <div className="space-y-3.5 animate-in fade-in duration-150">
            {/* KPI Cards Grid */}
            <div className="grid grid-cols-2 gap-2.5">
              {/* Awal Musim Hujan */}
              <div className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-800 space-y-1">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                  Awal Musim Hujan
                </span>
                <div className="text-base font-black text-slate-900 dark:text-slate-100 font-mono">
                  {data.prakiraan_amh || "-"}
                </div>
                <div className="flex items-center gap-1 mt-0.5">
                  <Badge className={`text-[9px] px-1.5 py-0 font-bold ${getAmhBadgeColor(amhStatus)}`}>
                    {amhStatus} thd Normal
                  </Badge>
                </div>
                <span className="text-[10px] text-slate-500 block pt-0.5">
                  Normal: {data.normal_amh || "-"}
                </span>
              </div>

              {/* Sifat Hujan */}
              <div className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-800 space-y-1">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                  Sifat Hujan
                </span>
                <div className="text-base font-black text-slate-900 dark:text-slate-100">
                  {sifatHujan}
                </div>
                <div className="flex items-center gap-1 mt-0.5">
                  <Badge className={`text-[9px] px-1.5 py-0 font-bold ${getSifatBadgeColor(sifatHujan)}`}>
                    {sifatHujan}
                  </Badge>
                </div>
                <span className="text-[10px] text-slate-500 block pt-0.5">
                  Kriteria BMKG
                </span>
              </div>

              {/* Total Curah Hujan */}
              <div className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-800 space-y-1">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                  Akumulasi Hujan
                </span>
                <div className="text-base font-black text-sky-600 dark:text-sky-400 font-mono">
                  {data.prakiraan_curah_hujan_total
                    ? `${data.prakiraan_curah_hujan_total.toLocaleString("id-ID")} mm`
                    : "-"}
                </div>
                <span className="text-[10px] text-slate-500 block">
                  Estimasi Musiman
                </span>
              </div>

              {/* Puncak Musim */}
              <div className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-800 space-y-1">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                  Puncak Musim
                </span>
                <div className="text-base font-black text-indigo-600 dark:text-indigo-400">
                  {data.prakiraan_puncak_bulan || "-"}
                </div>
                <span className="text-[10px] text-slate-500 block">
                  Curah Hujan Tertinggi
                </span>
              </div>
            </div>

            {/* Info Box */}
            <div className="p-3 rounded-xl bg-sky-50 dark:bg-sky-950/40 border border-sky-200 dark:border-sky-800/60 text-xs text-sky-900 dark:text-sky-200 space-y-1">
              <div className="flex items-center gap-1.5 font-bold">
                <Info className="h-3.5 w-3.5 text-sky-600 dark:text-sky-400 shrink-0" />
                <span>Rangkuman Klimatologi BMKG</span>
              </div>
              <p className="text-[11px] text-sky-800 dark:text-sky-300 leading-relaxed">
                Prakiraan musim di Kecamatan {data.kecamatan} didasarkan pada model prediksi dasarian BMKG terintegrasi AI, disinkronkan langsung dari Google Cloud Firestore.
              </p>
            </div>
          </div>
        )}

        {/* Tab 2: Rekomendasi KATAM AI */}
        {activeTab === "katam" && (
          <div className="space-y-3.5 animate-in fade-in duration-150">
            {data.katam ? (
              <>
                <div className="p-3.5 rounded-2xl bg-emerald-50/70 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800/60 space-y-2">
                  <div className="flex items-center gap-1.5 text-emerald-800 dark:text-emerald-300 font-bold text-xs">
                    <Sprout className="h-4 w-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
                    <span>Rekomendasi Pola Tanam AI</span>
                  </div>
                  <div className="text-base font-black text-emerald-900 dark:text-emerald-100">
                    {data.katam.rekomendasi_utama || "Padi Sawah Musim Hujan"}
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-800 space-y-0.5">
                    <span className="text-[10px] font-bold text-slate-400 block uppercase">
                      Jadwal Tanam Optimal
                    </span>
                    <span className="font-bold text-slate-800 dark:text-slate-100">
                      {data.katam.jadwal_tanam_optimal || "-"}
                    </span>
                  </div>

                  <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-800 space-y-0.5">
                    <span className="text-[10px] font-bold text-slate-400 block uppercase">
                      Kebutuhan Air Lahan
                    </span>
                    <span className="font-bold text-slate-800 dark:text-slate-100">
                      {data.katam.kebutuhan_air_mm_hari ? `${data.katam.kebutuhan_air_mm_hari} mm/hari` : "-"}
                    </span>
                  </div>

                  <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-800 space-y-0.5 col-span-2">
                    <span className="text-[10px] font-bold text-slate-400 block uppercase">
                      Varietas Rekomendasi
                    </span>
                    <span className="font-semibold text-slate-800 dark:text-slate-100">
                      {data.katam.varietas_rekomendasi || "Inpari 32, Ciherang, Menthik Wangi"}
                    </span>
                  </div>
                </div>

                {data.katam.catatan && (
                  <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-800 text-xs text-slate-600 dark:text-slate-300 space-y-1">
                    <span className="font-bold text-slate-700 dark:text-slate-200 block text-[11px]">
                      Catatan Agronomi:
                    </span>
                    <p className="text-[11px] leading-relaxed">{data.katam.catatan}</p>
                  </div>
                )}
              </>
            ) : (
              <div className="p-6 text-center text-slate-400 text-xs">
                Data Kalender Tanam untuk kecamatan ini sedang disiapkan.
              </div>
            )}
          </div>
        )}

        {/* Tab 3: Tren Dasarian */}
        {activeTab === "dasarian" && data.dasarian_trend && (
          <div className="space-y-3 animate-in fade-in duration-150">
            <div className="flex items-center justify-between text-xs text-slate-500">
              <span>Distribusi Curah Hujan per Dasarian</span>
              <span className="text-[10px] font-bold text-sky-600">Curah Hujan (mm)</span>
            </div>

            <div className="space-y-1.5 max-h-[280px] overflow-y-auto pr-1">
              {data.dasarian_trend.map((d, idx) => {
                const maxVal = Math.max(...data.dasarian_trend!.map((t) => t.rain), 100);
                const pct = Math.min((d.rain / maxVal) * 100, 100);
                const isHeavy = d.rain >= 150;
                const isModerate = d.rain >= 50 && d.rain < 150;

                return (
                  <div key={idx} className="flex items-center gap-2 text-[11px]">
                    <span className="w-14 text-slate-400 font-mono text-[10px] shrink-0">
                      {d.dasarian}
                    </span>
                    <div className="flex-1 h-3.5 bg-slate-100 dark:bg-slate-800 rounded-sm overflow-hidden flex items-center">
                      <div
                        className={`h-full rounded-sm transition-all ${
                          isHeavy
                            ? "bg-rose-500"
                            : isModerate
                            ? "bg-sky-500"
                            : "bg-emerald-500"
                        }`}
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                    <span className="w-12 text-right font-mono font-bold text-slate-700 dark:text-slate-200 shrink-0 text-[10px]">
                      {d.rain} mm
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
