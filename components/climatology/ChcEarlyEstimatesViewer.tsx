// components/climatology/ChcEarlyEstimatesViewer.tsx
"use client";

import React, { useState, useMemo } from "react";
import {
  CloudRain,
  Calendar,
  Layers,
  Sparkles,
  ExternalLink,
  Download,
  Maximize2,
  Minimize2,
  RefreshCw,
  Info,
  ShieldCheck,
  TrendingUp,
  Activity,
  Globe2,
  AlertTriangle,
} from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogTitle, DialogDescription } from "@/components/ui/dialog";

// ─── Metrics Config ─────────────────────────────────────────────────────────
export type MetricType = "Total" | "Anomaly" | "POA" | "SPI" | "Rank";

interface MetricOption {
  id: MetricType;
  label: string;
  shortLabel: string;
  unit: string;
  badgeColor: string;
  description: string;
}

export const CHC_METRICS: MetricOption[] = [
  {
    id: "Total",
    label: "Total Akumulasi Presipitasi",
    shortLabel: "Total Curah Hujan",
    unit: "mm",
    badgeColor: "bg-sky-500/10 text-sky-600 dark:text-sky-400 border-sky-400/30",
    description: "Jumlah curah hujan terakumulasi terkini dari observasi satelit inframerah CHIRPS v3 digabung prakiraan 15-hari CHIRPS-GEFS.",
  },
  {
    id: "Anomaly",
    label: "Anomali Curah Hujan",
    shortLabel: "Anomali (mm)",
    unit: "mm selisih",
    badgeColor: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-400/30",
    description: "Deviasi curah hujan terhadap nilai normal rata-rata historis (warna hijau/biru menandakan lebih basah, cokelat menandakan defisit/kering).",
  },
  {
    id: "POA",
    label: "Persentase Terhadap Normal (% of Average)",
    shortLabel: "% Normal",
    unit: "%",
    badgeColor: "bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-400/30",
    description: "Rasio perbandingan akumulasi hujan aktual + prakiraan terhadap normal iklim historis (100% = normal seimbang).",
  },
  {
    id: "SPI",
    label: "Standardized Precipitation Index (SPI)",
    shortLabel: "Indeks SPI",
    unit: "Indeks Z-Score",
    badgeColor: "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-400/30",
    description: "Indikator kekeringan meteorologis baku WMO. Nilai di bawah -1.0 menunjukkan kekeringan moderat hingga ekstrem.",
  },
  {
    id: "Rank",
    label: "Peringkat Historis (Historical Rank)",
    shortLabel: "Peringkat Historis",
    unit: "Rank Persentil",
    badgeColor: "bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-400/30",
    description: "Posisi peringkat curah hujan periode ini dibandingkan dengan catatan arsip 40+ tahun pengamatan satelit CHIRPS.",
  },
];

// ─── Time Windows Config ───────────────────────────────────────────────────
interface WindowOption {
  id: string;
  type: "moving" | "seasonal";
  label: string;
  category: string;
  badge: string;
  folderPath: string;
  filePrefix: string;
  fileSuffix: string;
  daysEstimate: string;
  description: string;
}

export const CHC_WINDOWS: WindowOption[] = [
  {
    id: "moving_02pentad",
    type: "moving",
    label: "2 Pentad (~10 Hari + Prakiraan)",
    category: "Jendela Bergerak Pendek",
    badge: "10 Hari",
    folderPath: "Recent_Rainfall/with_forecast/moving_02pentad/asia_southeast/pngs",
    filePrefix: "",
    fileSuffix: "_05PentAccum_Current.png",
    daysEstimate: "10 hari observasi + 15 hari prakiraan",
    description: "Memantau dinamika basah/kering sub-musiman jangka pendek di Asia Tenggara dan Indonesia.",
  },
  {
    id: "moving_06pentad",
    type: "moving",
    label: "6 Pentad (~30 Hari / 1 Bulan + Prakiraan)",
    category: "Jendela Bergerak Bulanan",
    badge: "30 Hari",
    folderPath: "Recent_Rainfall/with_forecast/moving_06pentad/asia_southeast/pngs",
    filePrefix: "",
    fileSuffix: "_09PentAccum_Current.png",
    daysEstimate: "30 hari observasi + 15 hari prakiraan",
    description: "Analisis akumulasi hujan sebulan terakhir untuk evaluasi kondisi tanah dan awal anomali cuaca.",
  },
  {
    id: "moving_12pentad",
    type: "moving",
    label: "12 Pentad (~60 Hari / 2 Bulan + Prakiraan)",
    category: "Jendela Bergerak 2-Bulanan",
    badge: "60 Hari",
    folderPath: "Recent_Rainfall/with_forecast/moving_12pentad/asia_southeast/pngs",
    filePrefix: "",
    fileSuffix: "_15PentAccum_Current.png",
    daysEstimate: "60 hari observasi + 15 hari prakiraan",
    description: "Evaluasi tren kelembapan tanah bi-bulanan untuk sektor pertanian tanaman pangan dan hidrologi waduk.",
  },
  {
    id: "moving_18pentad",
    type: "moving",
    label: "18 Pentad (~90 Hari / 1 Musim + Prakiraan)",
    category: "Jendela Bergerak Triwulanan",
    badge: "90 Hari",
    folderPath: "Recent_Rainfall/with_forecast/moving_18pentad/asia_southeast/pngs",
    filePrefix: "",
    fileSuffix: "_21PentAccum_Current.png",
    daysEstimate: "90 hari observasi + 15 hari prakiraan",
    description: "Evaluasi 1 musim penuh untuk deteksi dini bahaya kekeringan berkepanjangan atau banjir regional.",
  },
  {
    id: "oct_to_jan",
    type: "seasonal",
    label: "Musim Hujan Indonesia (Oktober – Januari)",
    category: "Musiman Asia Tenggara",
    badge: "Okt–Jan",
    folderPath: "Seasonal_Rainfall/with_forecast/asia_southeast/oct_to_jan/pngs",
    filePrefix: "",
    fileSuffix: "_Current.png",
    daysEstimate: "Siklus Musim Hujan Utama (Okt–Jan)",
    description: "Pemantauan khusus musim hujan aktif Monsun Barat di wilayah kepulauan Indonesia bagian barat dan selatan.",
  },
  {
    id: "dec_to_may",
    type: "seasonal",
    label: "Puncak Hujan hingga Awal Kemarau (Desember – Mei)",
    category: "Musiman Asia Tenggara",
    badge: "Des–Mei",
    folderPath: "Seasonal_Rainfall/with_forecast/asia_southeast/dec_to_may/pngs",
    filePrefix: "",
    fileSuffix: "_Current.png",
    daysEstimate: "Semester Siklus Basah (Des–Mei)",
    description: "Memantau kesinambungan cadangan air dan kesiapan transisi menuju musim kemarau.",
  },
  {
    id: "apr_to_dec",
    type: "seasonal",
    label: "Siklus Musim Pangan (April – Desember)",
    category: "Musiman Asia Tenggara",
    badge: "Apr–Des",
    folderPath: "Seasonal_Rainfall/with_forecast/asia_southeast/apr_to_dec/pngs",
    filePrefix: "",
    fileSuffix: "_Current.png",
    daysEstimate: "Siklus Musim Tanam (Apr–Des)",
    description: "Evaluasi musim kemarau dan periode transisi agroklimatologi di Indonesia dan Asia Tenggara.",
  },
];

const CHC_BASE_URL = "https://data.chc.ucsb.edu/products/Early_Estimates/v3";

export function ChcEarlyEstimatesViewer() {
  const [selectedMetric, setSelectedMetric] = useState<MetricType>("Total");
  const [selectedWindowId, setSelectedWindowId] = useState<string>("moving_02pentad");
  const [refreshKey, setRefreshKey] = useState<number>(Date.now());
  const [isZoomOpen, setIsZoomOpen] = useState(false);
  const [imageLoaded, setImageLoaded] = useState(false);
  const [hasError, setHasError] = useState(false);

  const activeMetric = useMemo(() => {
    return CHC_METRICS.find((m) => m.id === selectedMetric) || CHC_METRICS[0];
  }, [selectedMetric]);

  const activeWindow = useMemo(() => {
    return CHC_WINDOWS.find((w) => w.id === selectedWindowId) || CHC_WINDOWS[0];
  }, [selectedWindowId]);

  // Construct official CHC direct image URL
  const imageUrl = useMemo(() => {
    const filename = `${activeMetric.id}${activeWindow.fileSuffix}`;
    return `${CHC_BASE_URL}/${activeWindow.folderPath}/${filename}?_t=${refreshKey}`;
  }, [activeMetric, activeWindow, refreshKey]);

  const handleRefresh = () => {
    setImageLoaded(false);
    setHasError(false);
    setRefreshKey(Date.now());
  };

  return (
    <div className="space-y-6">
      {/* ── Header Banner Card ──────────────────────────────────────────────── */}
      <Card className="border-none shadow-md bg-gradient-to-r from-cyan-950 via-slate-900 to-slate-950 text-white rounded-2xl overflow-hidden relative">
        <div className="absolute top-0 right-0 w-80 h-80 bg-cyan-500/10 rounded-full blur-3xl pointer-events-none" />
        <CardHeader className="pb-3 relative z-10">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-cyan-500/20 text-cyan-300 border border-cyan-400/30 flex items-center gap-1 shadow-sm">
                  <Sparkles className="h-3 w-3 text-cyan-300" /> UC Santa Barbara · Climate Hazards Center
                </span>
                <Badge variant="outline" className="text-[10px] border-slate-700 text-slate-300">
                  CHIRPS v3 + GEFS
                </Badge>
              </div>
              <CardTitle className="text-xl sm:text-2xl font-extrabold tracking-tight flex items-center gap-2.5 text-white">
                <CloudRain className="h-6 w-6 text-cyan-400 shrink-0" />
                Satelit CHC Early Estimates — Wilayah Asia Tenggara
              </CardTitle>
              <CardDescription className="text-xs sm:text-sm text-slate-300 max-w-4xl font-normal leading-relaxed">
                Estimasi presipitasi satelit resolusi tinggi termutakhir dari <strong>Climate Hazards Center (CHC) UC Santa Barbara</strong>. 
                Mengintegrasikan observasi inframerah presipitasi stasiun <strong>CHIRPS v3</strong> dan prakiraan 15-hari <strong>CHIRPS-GEFS (+Forecast)</strong> untuk peringatan dini kekeringan dan anomali iklim di kawasan Asia Tenggara &amp; Indonesia.
              </CardDescription>
            </div>

            <div className="flex items-center gap-2 self-start sm:self-auto shrink-0">
              <Button
                variant="outline"
                size="sm"
                onClick={handleRefresh}
                className="bg-white/10 hover:bg-white/20 text-white border-white/20 h-8 px-3.5 rounded-xl font-semibold text-xs gap-1.5 shadow-sm transition-colors"
              >
                <RefreshCw className="h-3.5 w-3.5 text-cyan-300" />
                <span>Muat Ulang Citra</span>
              </Button>
              <Button
                size="sm"
                asChild
                className="bg-cyan-600 hover:bg-cyan-700 text-white font-semibold text-xs h-8 px-3.5 rounded-xl shadow-sm gap-1.5"
              >
                <a href="https://www.chc.ucsb.edu/monitoring/early-estimates" target="_blank" rel="noopener noreferrer">
                  <span>Portal CHC</span>
                  <ExternalLink className="h-3.5 w-3.5" />
                </a>
              </Button>
            </div>
          </div>
        </CardHeader>
      </Card>

      {/* ── Control Navigation & Selectors ───────────────────────────────────── */}
      <Card className="border border-slate-200 dark:border-slate-800 shadow-sm dark:bg-slate-900 bg-white">
        <CardContent className="p-4 space-y-4">
          {/* Baris 1: Pemilih Metrik Analisis */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 flex items-center gap-1.5 font-mono">
              <Activity className="h-3.5 w-3.5 text-cyan-500" />
              1. Pilih Parameter Metrik Presipitasi:
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2">
              {CHC_METRICS.map((m) => {
                const isSelected = selectedMetric === m.id;
                return (
                  <button
                    key={m.id}
                    onClick={() => {
                      setImageLoaded(false);
                      setSelectedMetric(m.id);
                    }}
                    className={`p-2.5 rounded-xl border text-left transition-all flex flex-col justify-between ${
                      isSelected
                        ? "bg-cyan-500/10 border-cyan-500 text-cyan-900 dark:text-cyan-100 shadow-sm ring-1 ring-cyan-500/30"
                        : "bg-slate-50 dark:bg-slate-800/60 border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800"
                    }`}
                  >
                    <span className="text-xs font-bold block">{m.shortLabel}</span>
                    <span className="text-[10px] text-slate-500 dark:text-slate-400 font-mono mt-0.5">
                      Satuan: {m.unit}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Baris 2: Pemilih Jendela Waktu (Moving Pentads & Seasonal) */}
          <div className="space-y-1.5 pt-2 border-t dark:border-slate-800">
            <label className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 flex items-center gap-1.5 font-mono">
              <Calendar className="h-3.5 w-3.5 text-indigo-500" />
              2. Pilih Rentang Waktu Akumulasi / Periode Musiman:
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2">
              {CHC_WINDOWS.map((w) => {
                const isSelected = selectedWindowId === w.id;
                return (
                  <button
                    key={w.id}
                    onClick={() => {
                      setImageLoaded(false);
                      setSelectedWindowId(w.id);
                    }}
                    className={`p-2.5 rounded-xl border text-left transition-all ${
                      isSelected
                        ? "bg-indigo-500/10 border-indigo-500 text-indigo-900 dark:text-indigo-100 shadow-sm ring-1 ring-indigo-500/30"
                        : "bg-slate-50 dark:bg-slate-800/60 border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800"
                    }`}
                  >
                    <div className="flex items-center justify-between gap-1 mb-1">
                      <span className="text-[10px] font-mono px-1.5 py-0.5 rounded font-bold uppercase tracking-wider bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300">
                        {w.badge}
                      </span>
                      <span className="text-[10px] text-slate-400">{w.category}</span>
                    </div>
                    <span className="text-xs font-bold block leading-snug">{w.label}</span>
                  </button>
                );
              })}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* ── Active Status Info Strip ────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 p-3.5 bg-slate-100 dark:bg-slate-800/80 rounded-xl border border-slate-200 dark:border-slate-700/80 text-xs">
        <div className="flex items-center gap-2 flex-wrap">
          <Badge className={activeMetric.badgeColor} variant="outline">
            {activeMetric.label}
          </Badge>
          <span className="text-slate-400">·</span>
          <span className="font-semibold text-slate-700 dark:text-slate-300">
            {activeWindow.daysEstimate}
          </span>
          <span className="text-slate-400">·</span>
          <span className="text-slate-500 dark:text-slate-400">
            {activeWindow.description}
          </span>
        </div>

        <div className="flex items-center gap-2 shrink-0 self-end sm:self-auto">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setIsZoomOpen(true)}
            className="h-7 text-xs px-2.5 gap-1 text-slate-700 dark:text-slate-200 border-slate-300 dark:border-slate-600"
          >
            <Maximize2 className="h-3 w-3 text-cyan-600" />
            <span>Perbesar Peta</span>
          </Button>
          <Button
            variant="outline"
            size="sm"
            asChild
            className="h-7 text-xs px-2.5 gap-1 text-slate-700 dark:text-slate-200 border-slate-300 dark:border-slate-600"
          >
            <a href={imageUrl} target="_blank" rel="noopener noreferrer" download>
              <Download className="h-3 w-3 text-emerald-600" />
              <span>Unduh PNG</span>
            </a>
          </Button>
        </div>
      </div>

      {/* ── Map Canvas Viewer ──────────────────────────────────────────────── */}
      <Card className="border border-slate-200 dark:border-slate-800 shadow-sm dark:bg-slate-900 bg-white overflow-hidden rounded-2xl">
        <CardHeader className="py-3 px-4 border-b dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50 flex flex-row items-center justify-between">
          <div className="flex items-center gap-2">
            <Globe2 className="h-4 w-4 text-cyan-500" />
            <CardTitle className="text-sm font-bold text-slate-900 dark:text-slate-100">
              Peta Diagnostik Early Estimates: {activeMetric.shortLabel} — {activeWindow.label}
            </CardTitle>
          </div>
          <span className="text-[11px] font-mono text-slate-500 dark:text-slate-400">
            Domain: Asia Tenggara (90°E–155°E, 15°S–25°N)
          </span>
        </CardHeader>

        <CardContent className="p-3 sm:p-5 flex flex-col items-center justify-center min-h-[420px] bg-slate-950/5 dark:bg-slate-950/40 relative">
          {!imageLoaded && !hasError && (
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-2.5 z-10 bg-white/70 dark:bg-slate-900/70 backdrop-blur-xs">
              <RefreshCw className="h-8 w-8 animate-spin text-cyan-500" />
              <p className="text-xs font-semibold text-slate-600 dark:text-slate-300">
                Memuat citra peta presipitasi dari server CHC UC Santa Barbara...
              </p>
            </div>
          )}

          {hasError ? (
            <div className="p-6 text-center space-y-3 max-w-md bg-rose-50 dark:bg-rose-950/30 rounded-2xl border border-rose-200 dark:border-rose-900 text-rose-800 dark:text-rose-200">
              <AlertTriangle className="h-8 w-8 text-rose-500 mx-auto" />
              <p className="text-xs font-bold">Gagal memuat citra peta CHC Early Estimates</p>
              <p className="text-[11px] text-rose-600 dark:text-rose-400">
                Citra untuk jendela ini sedang dalam siklus kalkulasi berkala di server UCSB atau koneksi terputus. Silakan coba pilih jendela waktu lainnya atau muat ulang.
              </p>
              <Button size="sm" variant="outline" onClick={handleRefresh} className="h-7 text-xs">
                Coba Lagi
              </Button>
            </div>
          ) : (
            <div
              className="relative cursor-pointer group max-w-full overflow-hidden rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm"
              onClick={() => setIsZoomOpen(true)}
              title="Klik untuk memperbesar peta resolusi tinggi"
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={imageUrl}
                alt={`CHC Early Estimates ${activeMetric.label} ${activeWindow.label}`}
                className="w-full max-h-[680px] object-contain transition-transform duration-300 group-hover:scale-[1.01]"
                onLoad={() => setImageLoaded(true)}
                onError={() => {
                  setHasError(true);
                  setImageLoaded(true);
                }}
              />
              <div className="absolute bottom-3 right-3 bg-slate-900/80 hover:bg-slate-900 text-white p-2 rounded-xl text-xs flex items-center gap-1.5 backdrop-blur-sm opacity-90 group-hover:opacity-100 transition-opacity shadow-md">
                <Maximize2 className="h-3.5 w-3.5 text-cyan-400" />
                <span>Klik untuk Memperbesar</span>
              </div>
            </div>
          )}
        </CardContent>

        <CardFooter className="py-2.5 px-4 bg-slate-50 dark:bg-slate-900/80 border-t dark:border-slate-800 text-[11px] text-slate-500 dark:text-slate-400 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
          <div className="flex items-center gap-1.5">
            <Info className="h-3.5 w-3.5 text-cyan-500 shrink-0" />
            <span>
              <strong>Sumber Data:</strong> UCSB Climate Hazards Center (CHC) · CHIRPS-GEFS Operational Products
            </span>
          </div>
          <div className="flex items-center gap-3">
            <a
              href="https://ewx3.chc.ucsb.edu/ewx/index.html"
              target="_blank"
              rel="noopener noreferrer"
              className="text-cyan-600 hover:text-cyan-700 dark:text-cyan-400 hover:underline flex items-center gap-1"
            >
              <span>Buka Early Warning Explorer (EWX)</span>
              <ExternalLink className="h-3 w-3" />
            </a>
            <span className="text-slate-300 dark:text-slate-700">|</span>
            <a
              href="https://data.chc.ucsb.edu/products/Early_Estimates/v3/"
              target="_blank"
              rel="noopener noreferrer"
              className="text-cyan-600 hover:text-cyan-700 dark:text-cyan-400 hover:underline flex items-center gap-1"
            >
              <span>Repositori GeoTIFF Data</span>
              <ExternalLink className="h-3 w-3" />
            </a>
          </div>
        </CardFooter>
      </Card>

      {/* ── Dialog Zoom Fullscreen Modal ────────────────────────────────────── */}
      <Dialog open={isZoomOpen} onOpenChange={setIsZoomOpen}>
        <DialogContent className="max-w-[95vw] lg:max-w-6xl max-h-[92vh] p-4 flex flex-col justify-between overflow-y-auto">
          <div className="flex items-center justify-between pb-2 border-b dark:border-slate-800">
            <div>
              <DialogTitle className="text-base font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                <CloudRain className="h-4 w-4 text-cyan-500" />
                CHC Early Estimates: {activeMetric.label} ({activeWindow.label})
              </DialogTitle>
              <DialogDescription className="text-xs text-slate-500 mt-0.5">
                Kawasan Asia Tenggara (Indonesia, Malaysia, Filipina, Thailand, Vietnam). Resolusi penuh CHIRPS v3 + GEFS Forecast.
              </DialogDescription>
            </div>
          </div>

          <div className="flex items-center justify-center p-2 my-2 overflow-auto max-h-[72vh] bg-slate-950/20 rounded-xl">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={imageUrl}
              alt={`Fullscreen ${activeMetric.label}`}
              className="max-w-full max-h-[70vh] object-contain rounded-lg shadow-md"
            />
          </div>

          <div className="flex justify-between items-center pt-2 border-t dark:border-slate-800 text-xs text-slate-500">
            <span>Climate Hazards Center — UC Santa Barbara</span>
            <div className="flex items-center gap-2">
              <Button size="sm" asChild variant="outline" className="h-8 text-xs gap-1">
                <a href={imageUrl} target="_blank" rel="noopener noreferrer" download>
                  <Download className="h-3.5 w-3.5 text-emerald-600" />
                  <span>Unduh File Asli</span>
                </a>
              </Button>
              <Button size="sm" onClick={() => setIsZoomOpen(false)} className="h-8 text-xs">
                Tutup
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
