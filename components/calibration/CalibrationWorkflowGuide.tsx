"use client";

import React from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  HelpCircle,
  Layers,
  Trophy,
  Settings2,
  CheckCircle2,
  Cpu,
  Database,
  ArrowRight,
  TrendingDown,
  Sparkles,
  ShieldCheck,
  Activity,
} from "lucide-react";

export function CalibrationWorkflowGuide() {
  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          className="gap-1.5 text-xs font-medium text-slate-200 bg-slate-800/80 hover:bg-slate-700 hover:text-white border-slate-700 shadow-sm h-8"
        >
          <HelpCircle className="w-3.5 h-3.5 text-sky-400" />
          <span>Panduan Alur Kalibrasi</span>
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800">
        <DialogHeader className="border-b border-slate-100 dark:border-slate-800 pb-3">
          <div className="flex items-center gap-2">
            <div className="p-2 bg-blue-100 dark:bg-blue-950/70 text-blue-600 dark:text-blue-400 rounded-lg">
              <Activity className="w-5 h-5" />
            </div>
            <div>
              <DialogTitle className="text-base font-bold text-slate-900 dark:text-slate-100">
                Panduan Sistem Kalibrasi & Validasi Bias Meteorologi
              </DialogTitle>
              <DialogDescription className="text-xs text-slate-500">
                Penyelarasan telemetri sensor AWS IoT dengan referensi reanalisis ECMWF ERA5-Land (WMO &amp; BMKG Standard).
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="space-y-4 pt-2 text-xs text-slate-600 dark:text-slate-300">
          {/* Mengapa Kalibrasi Diperlukan */}
          <div className="p-3 rounded-xl bg-blue-50/70 dark:bg-blue-950/30 border border-blue-200/70 dark:border-blue-900/40 space-y-1.5">
            <h4 className="font-bold text-slate-900 dark:text-slate-100 flex items-center gap-1.5 text-xs">
              <Sparkles className="w-4 h-4 text-blue-600 dark:text-blue-400" />
              Mengapa Kalibrasi Sensor Dibutuhkan?
            </h4>
            <p className="leading-relaxed text-[11px] text-slate-600 dark:text-slate-300">
              Sensor telemetri cuaca IoT di lapangan dapat mengalami <em>sensor drift</em>, efek radiasi matahari pada pelindung sensor (radiation shield), deviasi kalibrasi pabrik, atau bias mikroklimat lokal. Melalui penyandingan data in-situ jam-jamanan dengan data reanalisis atmosfer global <strong>ECMWF ERA5-Land (resolusi grid 0.1°)</strong>, kita dapat mendeteksi galat sistematis dan mengoreksinya secara presisi.
            </p>
          </div>

          {/* 3 Langkah Alur Kerja */}
          <div className="space-y-3">
            <h4 className="font-bold text-slate-900 dark:text-slate-100 text-xs">
              Alur 3 Langkah Kalibrasi Terpadu:
            </h4>

            {/* Step 1 */}
            <div className="flex items-start gap-3 p-3 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/40">
              <div className="w-6 h-6 rounded-full bg-blue-600 text-white flex items-center justify-center font-bold text-xs shrink-0 mt-0.5">
                1
              </div>
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className="font-bold text-slate-900 dark:text-slate-100 text-xs">
                    Validasi &amp; Diagnosis Bias
                  </span>
                  <Badge variant="outline" className="text-[10px] text-blue-600 border-blue-300">
                    Tab 1
                  </Badge>
                </div>
                <p className="text-[11px] leading-relaxed text-slate-500 dark:text-slate-400">
                  Sistem menyandingkan pembacaan sensor stasiun dengan ERA5 berdasarkan waktu yang sama (Quality Control pipeline). Amati grafik <strong>Deret Waktu</strong>, <strong>Siklus Diurnal 24 Jam</strong>, <strong>Scatter 1:1</strong>, dan <strong>Residual Error</strong> untuk melihat apakah sensor cenderung mengukur terlalu tinggi (+MBE) atau terlalu rendah (-MBE).
                </p>
              </div>
            </div>

            {/* Step 2 */}
            <div className="flex items-start gap-3 p-3 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/40">
              <div className="w-6 h-6 rounded-full bg-indigo-600 text-white flex items-center justify-center font-bold text-xs shrink-0 mt-0.5">
                2
              </div>
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className="font-bold text-slate-900 dark:text-slate-100 text-xs">
                    Optimasi Model Kalibrasi &amp; Leaderboard
                  </span>
                  <Badge variant="outline" className="text-[10px] text-indigo-600 border-indigo-300">
                    Tab 2
                  </Badge>
                </div>
                <p className="text-[11px] leading-relaxed text-slate-500 dark:text-slate-400">
                  Mesin bias correction menguji <strong>11 algoritma matematis</strong> secara simultan terhadap data kalibrasi (70% train) dan menguji keandalannya pada data independen (30% test). Algoritma dengan error RMSE terendah dan korelasi R² tertinggi direkomendasikan di puncak Leaderboard. Klik <strong>"Terapkan Parameter ke Sensor"</strong> untuk menyimpan model ke Draf Staging stasiun.
                </p>
              </div>
            </div>

            {/* Step 3 */}
            <div className="flex items-start gap-3 p-3 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/40">
              <div className="w-6 h-6 rounded-full bg-emerald-600 text-white flex items-center justify-center font-bold text-xs shrink-0 mt-0.5">
                3
              </div>
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className="font-bold text-slate-900 dark:text-slate-100 text-xs">
                    Review Parameter &amp; Sinkronisasi IoT Firestore
                  </span>
                  <Badge variant="outline" className="text-[10px] text-emerald-600 border-emerald-300">
                    Tab 3
                  </Badge>
                </div>
                <p className="text-[11px] leading-relaxed text-slate-500 dark:text-slate-400">
                  Semua parameter yang Anda drafkan dari berbagai variabel (mis. Suhu, Kelembapan, Tekanan) terkumpul di <strong>Staging Area</strong>. Anda dapat melihat kurva transfer fungsi matematika, menyimulasikan output, lalu klik <strong>"Simpan &amp; Terapkan ke Firestore"</strong> agar formulasi aktif diterapkan pada seluruh dashboard dan laporan analitis.
                </p>
              </div>
            </div>
          </div>

          {/* Glosarium Metrik */}
          <div className="border-t border-slate-200 dark:border-slate-800 pt-3 space-y-2">
            <h4 className="font-bold text-slate-900 dark:text-slate-100 text-xs">
              Glosarium Metrik Statistik:
            </h4>
            <div className="grid grid-cols-2 gap-2 text-[11px]">
              <div className="p-2 rounded bg-slate-100 dark:bg-slate-800/60">
                <strong className="text-slate-800 dark:text-slate-200">RMSE (Root Mean Square Error):</strong>
                <p className="text-slate-500 dark:text-slate-400 mt-0.5">Mengukur besaran rata-rata galat kuadratik. Semakin mendekati 0, semakin akurat.</p>
              </div>
              <div className="p-2 rounded bg-slate-100 dark:bg-slate-800/60">
                <strong className="text-slate-800 dark:text-slate-200">MAE (Mean Absolute Error):</strong>
                <p className="text-slate-500 dark:text-slate-400 mt-0.5">Rerata selisih mutlak antara data sensor dengan referensi. Tidak terlalu sensitif outlier dibanding RMSE.</p>
              </div>
              <div className="p-2 rounded bg-slate-100 dark:bg-slate-800/60">
                <strong className="text-slate-800 dark:text-slate-200">Korelasi R²:</strong>
                <p className="text-slate-500 dark:text-slate-400 mt-0.5">Proporsi varians yang dapat dijelaskan model. Nilai 1.00 menandakan keselarasan sempurna.</p>
              </div>
              <div className="p-2 rounded bg-slate-100 dark:bg-slate-800/60">
                <strong className="text-slate-800 dark:text-slate-200">MBE (Mean Bias Error):</strong>
                <p className="text-slate-500 dark:text-slate-400 mt-0.5">Arah bias sistematis. Positif (+) berarti sensor mengukur terlalu tinggi, Negatif (-) berarti terlalu rendah.</p>
              </div>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
