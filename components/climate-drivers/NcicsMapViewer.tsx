// components/climate-drivers/NcicsMapViewer.tsx
"use client";

import React, { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  CloudRain,
  Wind,
  Droplets,
  Zap,
  Compass,
  Maximize2,
  Download,
  RefreshCw,
  ExternalLink,
  Info,
  Calendar,
  Layers,
  Sparkles,
  BarChart2,
  TrendingUp,
  Activity,
  CheckCircle2,
} from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { cn } from "@/lib/utils";

export interface NcicsVariable {
  id: string;
  name: string;
  category: "konveksi" | "potensi" | "angin" | "shear" | "hovmoller";
  prefix: string;
  unit: string;
  isHovmoller?: boolean;
  icon: any;
  color: string;
  description: string;
  indonesiaImpact: string;
}

const NCICS_CATEGORIES = [
  { id: "all", name: "Semua Variabel" },
  { id: "konveksi", name: "🌧️ Konveksi & Awan" },
  { id: "potensi", name: "🌀 Potensi Kecepatan & Divergensi" },
  { id: "angin", name: "💨 Angin Zonal & Meridional" },
  { id: "shear", name: "🌪️ Geser Angin Vertikal" },
  { id: "hovmoller", name: "📈 Diagram Hovmöller (Waktu vs Ekuator)" },
];

const NCICS_VARIABLES: NcicsVariable[] = [
  // 1. Konveksi & Awan
  {
    id: "olr",
    name: "OLR Anomaly (Awan Konvektif)",
    category: "konveksi",
    prefix: "olr",
    unit: "W/m²",
    icon: CloudRain,
    color: "text-blue-500 bg-blue-50 dark:bg-blue-950/60",
    description: "Anomali Radiasi Gelombang Panjang (Outgoing Longwave Radiation). Nilai negatif (biru/hijau) mengindikasikan tutupan awan konvektif tebal dan hujan lebat.",
    indonesiaImpact: "Pola biru di wilayah Indonesia menunjukkan pusat konveksi aktif MJO yang memicu potensi cuaca ekstrem dan hujan intensitas tinggi.",
  },
  {
    id: "pwat",
    name: "Precipitable Water Anomaly",
    category: "konveksi",
    prefix: "pwat",
    unit: "mm",
    icon: Droplets,
    color: "text-teal-500 bg-teal-50 dark:bg-teal-950/60",
    description: "Jumlah kandungan air atmosfer terintegrasi dalam kolom udara. Mengukur ketersediaan cadangan uap air di atmosfer.",
    indonesiaImpact: "Nilai positif (hijau/biru) menandakan atmosfer sangat basah dan berpotensi memicu hujan berdurasi lama.",
  },

  // 2. Potensi Kecepatan & Divergensi
  {
    id: "chi200",
    name: "Velocity Potential 200 hPa (Atas)",
    category: "potensi",
    prefix: "chi200",
    unit: "10⁶ m²/s",
    icon: Zap,
    color: "text-indigo-500 bg-indigo-50 dark:bg-indigo-950/60",
    description: "Potensi Kecepatan Angin Lapisan Atas (200 hPa). Mengidentifikasi daerah divergensi arus udara atas yang mendukung pengangkatan massa udara basah.",
    indonesiaImpact: "Anomali negatif (warna hijau/biru) menandakan wilayah divergensi kuat yang sangat kondusif bagi pertumbuhan badai cumulonimbus.",
  },
  {
    id: "chi850",
    name: "Velocity Potential 850 hPa (Bawah)",
    category: "potensi",
    prefix: "chi850",
    unit: "10⁶ m²/s",
    icon: Zap,
    color: "text-sky-500 bg-sky-50 dark:bg-sky-950/60",
    description: "Potensi Kecepatan Angin Lapisan Bawah (850 hPa). Mengukur daerah konvergensi massa udara permukaan.",
    indonesiaImpact: "Konvergensi lapisan bawah berpasangan dengan divergensi atas menciptakan sel sirkulasi vertikal yang sangat kuat.",
  },
  {
    id: "psi850",
    name: "Stream Function 850 hPa",
    category: "potensi",
    prefix: "psi850",
    unit: "10⁶ m²/s",
    icon: Activity,
    color: "text-cyan-500 bg-cyan-50 dark:bg-cyan-950/60",
    description: "Fungsi Arus Lapisan Bawah (850 hPa). Mengidentifikasi pusat-pusat sirkulasi siklonik dan antisiklonik di sekitar ekuator.",
    indonesiaImpact: "Sirkulasi siklonik ekuatorial ganda menandakan pembentukan pusaran angin yang sering memicu pertumbuhan depresi tropis.",
  },
  {
    id: "psi200",
    name: "Stream Function 200 hPa",
    category: "potensi",
    prefix: "psi200",
    unit: "10⁶ m²/s",
    icon: Activity,
    color: "text-violet-500 bg-violet-50 dark:bg-violet-950/60",
    description: "Fungsi Arus Lapisan Atas (200 hPa). Memantau sirkulasi gelombang antartropis dan gelombang Rossby ekuatorial.",
    indonesiaImpact: "Menggambarkan respons sirkulasi gelombang atmosfer global terhadap pemanasan konvektif di Benua Maritim Indonesia.",
  },

  // 3. Angin Zonal & Meridional
  {
    id: "uwnd850",
    name: "Zonal Wind 850 hPa (Bawah)",
    category: "angin",
    prefix: "uwnd850",
    unit: "m/s",
    icon: Wind,
    color: "text-emerald-500 bg-emerald-50 dark:bg-emerald-950/60",
    description: "Anomali komponen angin Barat-Timur pada lapisan bawah (850 hPa, ~1.5 km). Mengukur dorongan Monsun Barat.",
    indonesiaImpact: "Anomali positif (merah/kuning) menunjukkan tiupan angin barat kuat yang membawa uap air melimpah dari Samudra Hindia.",
  },
  {
    id: "uwnd200",
    name: "Zonal Wind 200 hPa (Atas)",
    category: "angin",
    prefix: "uwnd200",
    unit: "m/s",
    icon: Wind,
    color: "text-purple-500 bg-purple-50 dark:bg-purple-950/60",
    description: "Anomali komponen angin Barat-Timur pada troposfer atas (200 hPa, ~12 km). Mengukur sirkulasi Walker dan Jet Stream.",
    indonesiaImpact: "Pembalikan arah angin troposfer atas menandakan fase aktif MJO dan intensitas sirkulasi konvektif.",
  },
  {
    id: "vwnd850",
    name: "Meridional Wind 850 hPa (Bawah)",
    category: "angin",
    prefix: "vwnd850",
    unit: "m/s",
    icon: Compass,
    color: "text-amber-500 bg-amber-50 dark:bg-amber-950/60",
    description: "Anomali komponen angin Utara-Selatan pada lapisan bawah. Mengukur efek Lintas Ekuator (Cross-Equatorial Surge).",
    indonesiaImpact: "Memantau dorongan massa udara dingin (Cold Surge) dari belahan bumi utara/selatan menuju kawasan Nusantara.",
  },
  {
    id: "vwnd200",
    name: "Meridional Wind 200 hPa (Atas)",
    category: "angin",
    prefix: "vwnd200",
    unit: "m/s",
    icon: Compass,
    color: "text-orange-500 bg-orange-50 dark:bg-orange-950/60",
    description: "Anomali komponen angin Utara-Selatan pada troposfer atas (200 hPa). Memantau aliran keluar ekuatorial.",
    indonesiaImpact: "Mengindikasikan divergensi meridian atas yang mengangkut massa udara hangat menuju lintang menengah.",
  },

  // 4. Geser Angin Vertikal
  {
    id: "shear",
    name: "Vertical Wind Shear (Total)",
    category: "shear",
    prefix: "shear",
    unit: "m/s",
    icon: Layers,
    color: "text-rose-500 bg-rose-50 dark:bg-rose-950/60",
    description: "Perbedaan kecepatan dan arah angin antara lapisan 200 hPa dan 850 hPa. Mengukur stabilitas vertikal atmosfer.",
    indonesiaImpact: "Geser angin vertikal memengaruhi pengorganisasian sistem konvektif mesoskala dan potensi pembentukan siklon tropis.",
  },
  {
    id: "uShear",
    name: "Zonal Wind Shear",
    category: "shear",
    prefix: "uShear",
    unit: "m/s",
    icon: Layers,
    color: "text-pink-500 bg-pink-50 dark:bg-pink-950/60",
    description: "Geser angin komponen zonal (Barat-Timur) antara lapisan troposfer atas dan bawah.",
    indonesiaImpact: "Penting untuk menganalisis penyebaran vertikal energi gelombang Kelvin dan MJO sepanjang garis ekuator.",
  },

  // 5. Diagram Hovmöller Ekuatorial (Waktu vs Bujur)
  {
    id: "hov_olr",
    name: "Diagram Hovmöller OLR Ekuatorial",
    category: "hovmoller",
    prefix: "olr.cfs.eqtr",
    unit: "W/m²",
    isHovmoller: true,
    icon: TrendingUp,
    color: "text-blue-600 bg-blue-100 dark:bg-blue-950",
    description: "Diagram Waktu vs Bujur ($0^\circ-360^\circ\text{E}$) Anomali OLR Ekuatorial. Memvisualisasikan perambatan tutupan awan hujan MJO dari waktu ke waktu.",
    indonesiaImpact: "Menunjukkan dengan jelas kapan gelombang konveksi MJO bergerak melintasi bujur Indonesia ($90^\circ\text{E}-150^\circ\text{E}$) menuju Pasifik.",
  },
  {
    id: "hov_chi200",
    name: "Diagram Hovmöller Chi200 Ekuatorial",
    category: "hovmoller",
    prefix: "chi200.cfs.eqtr",
    unit: "10⁶ m²/s",
    isHovmoller: true,
    icon: BarChart2,
    color: "text-indigo-600 bg-indigo-100 dark:bg-indigo-950",
    description: "Diagram Waktu vs Bujur Velocity Potential 200 hPa Ekuatorial. Memantau sinyal divergensi atas MJO skala global.",
    indonesiaImpact: "Sinyal paling bersih untuk melacak pergerakan fase basah MJO mengelilingi ekuator bumi.",
  },
  {
    id: "hov_uwnd850",
    name: "Diagram Hovmöller U850 Ekuatorial",
    category: "hovmoller",
    prefix: "uwnd850.cfs.eqtr",
    unit: "m/s",
    isHovmoller: true,
    icon: Wind,
    color: "text-emerald-600 bg-emerald-100 dark:bg-emerald-950",
    description: "Diagram Waktu vs Bujur Anomali Angin Zonal 850 hPa. Memantau dorongan angin barat ekuatorial.",
    indonesiaImpact: "Melacak penjalaran tiupan angin barat (westerly wind bursts) yang mendorong uap air ke benua maritim.",
  },
  {
    id: "hov_pwat",
    name: "Diagram Hovmöller PWAT Ekuatorial",
    category: "hovmoller",
    prefix: "pwat.cfs.eqtr",
    unit: "mm",
    isHovmoller: true,
    icon: Droplets,
    color: "text-teal-600 bg-teal-100 dark:bg-teal-950",
    description: "Diagram Waktu vs Bujur Anomali Precipitable Water. Memantau kandungan uap air sepanjang garis ekuator.",
    indonesiaImpact: "Menunjukkan penyebaran massa udara basah di sepanjang Samudra Hindia hingga Pasifik Barat.",
  },
];

const LEAD_TIMES = [
  { id: "1", label: "Minggu 1 (Saat Ini)", desc: "Peta kondisi terkini / Prakiraan Minggu ke-1" },
  { id: "2", label: "Minggu 2", desc: "Prakiraan Minggu ke-2" },
  { id: "3", label: "Minggu 3", desc: "Prakiraan Minggu ke-3" },
  { id: "5", label: "Minggu 5", desc: "Prakiraan Minggu ke-5" },
  { id: "7", label: "Minggu 7", desc: "Prakiraan Minggu ke-7" },
  { id: "10", label: "Minggu 10", desc: "Prakiraan Minggu ke-10" },
];

export const NcicsMapViewer: React.FC = () => {
  const [activeCategory, setActiveCategory] = useState<string>("all");
  const [selectedVarId, setSelectedVarId] = useState<string>("olr");
  const [selectedLeadTime, setSelectedLeadTime] = useState<string>("1");
  const [imageLoading, setImageLoading] = useState<boolean>(true);
  const [imageError, setImageError] = useState<boolean>(false);
  const [lightboxOpen, setLightboxOpen] = useState<boolean>(false);

  const [cacheBuster, setCacheBuster] = useState<number>(0);

  const currentVar = NCICS_VARIABLES.find((v) => v.id === selectedVarId) || NCICS_VARIABLES[0];

  // Construct direct NCICS image URL
  const imageUrl = currentVar.isHovmoller
    ? `https://ncics.org/pub/mjo/v2/hov/${currentVar.prefix}.png${cacheBuster ? `?_t=${cacheBuster}` : ""}`
    : `https://ncics.org/pub/mjo/v2/map/${currentVar.prefix}.cfs.all.indonesia.${selectedLeadTime}.png${cacheBuster ? `?_t=${cacheBuster}` : ""}`;

  const filteredVariables = activeCategory === "all"
    ? NCICS_VARIABLES
    : NCICS_VARIABLES.filter((v) => v.category === activeCategory);

  const handleRefresh = () => {
    setCacheBuster(Date.now());
    setImageLoading(true);
    setImageError(false);
  };

  const handleDownload = () => {
    const a = document.createElement("a");
    a.href = imageUrl;
    a.target = "_blank";
    a.download = currentVar.isHovmoller
      ? `NCICS_${currentVar.prefix}.png`
      : `NCICS_${currentVar.prefix}_Indonesia_Week${selectedLeadTime}.png`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <Card className="border-none shadow-sm dark:bg-slate-900 bg-white overflow-hidden relative">
        <div className="absolute right-0 top-0 w-64 h-64 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />
        <CardHeader className="pb-3">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
            <div>
              <CardTitle className="text-xl font-bold flex items-center gap-2 text-slate-900 dark:text-slate-100">
                <Sparkles className="h-5 w-5 text-indigo-500" /> Peta Diagnostik Satelit & Model NCICS / NOAA
              </CardTitle>
              <CardDescription className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1">
                Visualisasi pemetaan atmosfer real-time kawasan Indonesia (90°E - 150°E) & Diagram Hovmöller Ekuatorial bersumber dari <strong>North Carolina Institute for Climate Studies (NCICS) / NOAA</strong>
              </CardDescription>
            </div>
            <Badge variant="outline" className="bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 border-indigo-200 dark:border-indigo-800 text-xs py-1 px-3 shrink-0">
              🔴 16 Variabel Real-Time
            </Badge>
          </div>
        </CardHeader>

        <CardContent className="space-y-5">
          {/* Category Filter Tabs */}
          <div>
            <label className="text-xs font-bold text-slate-600 dark:text-slate-400 block mb-2 uppercase tracking-wider">
              1. Pilih Kategori Variabel Atmosfer:
            </label>
            <div className="flex items-center gap-1.5 overflow-x-auto pb-1">
              {NCICS_CATEGORIES.map((cat) => (
                <Button
                  key={cat.id}
                  variant={activeCategory === cat.id ? "default" : "outline"}
                  size="sm"
                  onClick={() => setActiveCategory(cat.id)}
                  className={cn(
                    "text-xs font-semibold rounded-lg shrink-0",
                    activeCategory === cat.id
                      ? "bg-indigo-600 hover:bg-indigo-700 text-white shadow-sm"
                      : "text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-800"
                  )}
                >
                  {cat.name}
                </Button>
              ))}
            </div>
          </div>

          {/* Variable Selector Grid */}
          <div>
            <label className="text-xs font-bold text-slate-600 dark:text-slate-400 block mb-2 uppercase tracking-wider">
              2. Pilih Variabel ({filteredVariables.length} Tersedia):
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2">
              {filteredVariables.map((v) => {
                const Icon = v.icon;
                const isSelected = v.id === selectedVarId;

                return (
                  <button
                    key={v.id}
                    onClick={() => {
                      setSelectedVarId(v.id);
                      handleRefresh();
                    }}
                    className={cn(
                      "flex items-center gap-2.5 p-3 rounded-xl border text-left transition-all duration-200",
                      isSelected
                        ? "bg-indigo-600 text-white border-indigo-700 shadow-md ring-2 ring-indigo-400"
                        : "bg-slate-50 dark:bg-slate-800/60 hover:bg-slate-100 dark:hover:bg-slate-800 border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300"
                    )}
                  >
                    <div
                      className={cn(
                        "p-2 rounded-lg shrink-0",
                        isSelected ? "bg-white/20 text-white" : v.color
                      )}
                    >
                      <Icon className="h-4 w-4" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <span className="text-xs font-bold block truncate">{v.name}</span>
                      <span className={cn("text-[10px] block opacity-80", isSelected ? "text-indigo-100" : "text-slate-400")}>
                        {v.prefix.toUpperCase()} ({v.unit})
                      </span>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Lead Time Selector (Only for regional maps, hidden for Hovmoller) */}
          {!currentVar.isHovmoller && (
            <div>
              <label className="text-xs font-bold text-slate-600 dark:text-slate-400 block mb-2 uppercase tracking-wider">
                3. Pilih Waktu Prakiraan (Lead Time):
              </label>

              <div className="flex items-center gap-2 overflow-x-auto pb-1">
                {LEAD_TIMES.map((lt) => {
                  const isSelected = lt.id === selectedLeadTime;

                  return (
                    <Button
                      key={lt.id}
                      variant={isSelected ? "default" : "outline"}
                      size="sm"
                      onClick={() => {
                        setSelectedLeadTime(lt.id);
                        handleRefresh();
                      }}
                      className={cn(
                        "text-xs font-semibold rounded-lg shrink-0 gap-1.5",
                        isSelected
                          ? "bg-indigo-600 hover:bg-indigo-700 text-white shadow-sm"
                          : "text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-800"
                      )}
                    >
                      <Calendar className="h-3.5 w-3.5" />
                      {lt.label}
                    </Button>
                  );
                })}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Main Image Display Card */}
      <Card className="border-none shadow-md dark:bg-slate-900 bg-white overflow-hidden">
        <CardHeader className="pb-3 border-b dark:border-slate-800 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-lg font-bold text-slate-900 dark:text-slate-100">
                Peta {currentVar.name}
              </span>
              <Badge variant="outline" className="text-xs font-mono">
                {currentVar.isHovmoller ? `${currentVar.prefix}.png` : `${currentVar.prefix}.cfs.all.indonesia.${selectedLeadTime}.png`}
              </Badge>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              {currentVar.isHovmoller
                ? "Diagram Hovmöller Ekuatorial Waktu vs Bujur (0° - 360°E)"
                : `Cakupan Wilayah: Indonesia (90°E - 150°E, 20°N - 20°S) • Minggu ${selectedLeadTime}`}
            </p>
          </div>

          <div className="flex items-center gap-2 self-end sm:self-auto">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setLightboxOpen(true)}
              className="text-xs font-semibold gap-1.5"
            >
              <Maximize2 className="h-3.5 w-3.5 text-indigo-500" /> Perbesar Peta
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={handleDownload}
              className="text-xs font-semibold gap-1.5"
            >
              <Download className="h-3.5 w-3.5 text-emerald-500" /> Unduh PNG
            </Button>
            <Button
              variant="ghost"
              size="icon"
              onClick={handleRefresh}
              className="h-8 w-8 text-slate-500"
              title="Refresh Gambar"
            >
              <RefreshCw className={cn("h-4 w-4", imageLoading && "animate-spin")} />
            </Button>
          </div>
        </CardHeader>

        <CardContent className="p-4 flex flex-col items-center justify-center min-h-[420px] bg-slate-950/5 dark:bg-slate-950/40 relative rounded-b-xl">
          {imageLoading && (
            <div className="absolute inset-0 flex flex-col items-center justify-center bg-slate-900/10 backdrop-blur-sm z-10 gap-2">
              <RefreshCw className="h-8 w-8 text-indigo-500 animate-spin" />
              <span className="text-xs text-slate-600 dark:text-slate-400 font-semibold animate-pulse">
                Mengambil peta NCICS terkini...
              </span>
            </div>
          )}

          {imageError ? (
            <div className="flex flex-col items-center justify-center gap-3 p-8 text-center">
              <Info className="h-10 w-10 text-amber-500" />
              <div>
                <p className="text-sm font-bold text-slate-800 dark:text-slate-200">
                  Gagal Memuat Peta Diagnostik NCICS
                </p>
                <p className="text-xs text-slate-500 mt-1">
                  Gambar mungkin sedang dalam pembaruan berkala di server NCICS.
                </p>
              </div>
              <Button size="sm" onClick={handleRefresh} className="text-xs">
                Coba Muat Ulang
              </Button>
            </div>
          ) : (
            <div className="relative max-w-full overflow-hidden rounded-xl shadow-lg border dark:border-slate-800 group bg-white">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={imageUrl}
                alt={`NCICS Map - ${currentVar.name}`}
                onLoad={() => setImageLoading(false)}
                onError={() => {
                  setImageLoading(false);
                  setImageError(true);
                }}
                className={cn(
                  "w-full h-auto max-h-[650px] object-contain transition-all duration-300",
                  imageLoading ? "opacity-30 blur-xs" : "opacity-100"
                )}
              />
              <div
                onClick={() => setLightboxOpen(true)}
                className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-all flex items-center justify-center cursor-pointer opacity-0 group-hover:opacity-100"
              >
                <span className="px-4 py-2 bg-slate-900/80 text-white text-xs font-bold rounded-full shadow-lg backdrop-blur-md flex items-center gap-1.5">
                  <Maximize2 className="h-3.5 w-3.5" /> Klik untuk Perbesar Peta
                </span>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Scientific Explanation & Impact Panel for Current Variable */}
      <Card className="border-l-4 border-l-indigo-500 border-none shadow-sm dark:bg-slate-900 bg-white">
        <CardHeader className="pb-2">
          <CardTitle className="text-base font-bold flex items-center gap-2 text-indigo-700 dark:text-indigo-400">
            <Info className="h-5 w-5 text-indigo-500" /> Panduan Membaca Peta: {currentVar.name}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 pt-1 text-xs sm:text-sm">
          <div>
            <span className="font-bold text-slate-900 dark:text-slate-100 block mb-1">Mekanisme Fisika:</span>
            <p className="text-slate-600 dark:text-slate-300 leading-relaxed">{currentVar.description}</p>
          </div>
          <div className="p-3 bg-indigo-50/60 dark:bg-indigo-950/40 border border-indigo-200 dark:border-indigo-900 rounded-xl text-indigo-950 dark:text-indigo-200">
            <span className="font-bold flex items-center gap-1 mb-1">
              <CheckCircle2 className="h-4 w-4 text-indigo-500" /> Dampak bagi Cuaca Indonesia:
            </span>
            <p className="leading-relaxed">{currentVar.indonesiaImpact}</p>
          </div>
          <div className="pt-2 text-[11px] text-slate-400 flex items-center justify-between border-t dark:border-slate-800">
            <span>Sumber Resmi: NOAA / NCICS MJO Diagnostics</span>
            <a
              href="https://ncics.org/portfolio/monitor/mjo/"
              target="_blank"
              rel="noopener noreferrer"
              className="text-indigo-600 dark:text-indigo-400 hover:underline flex items-center gap-1 font-semibold"
            >
              <span>Kunjungi Portal NCICS</span> <ExternalLink className="h-3 w-3" />
            </a>
          </div>
        </CardContent>
      </Card>

      {/* Fullscreen Lightbox Modal */}
      <Dialog open={lightboxOpen} onOpenChange={setLightboxOpen}>
        <DialogContent className="max-w-5xl w-[95vw] p-4 bg-slate-950 text-white border-slate-800">
          <DialogHeader className="flex flex-row items-center justify-between border-b border-slate-800 pb-3">
            <DialogTitle className="text-base font-bold flex items-center gap-2 text-white">
              Peta Diagnostik NCICS - {currentVar.name} {!currentVar.isHovmoller && `(Minggu ${selectedLeadTime})`}
            </DialogTitle>
          </DialogHeader>

          <div className="flex items-center justify-center p-2 min-h-[500px]">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={imageUrl}
              alt={`Full Map - ${currentVar.name}`}
              className="max-h-[80vh] w-auto object-contain rounded-lg shadow-2xl"
            />
          </div>

          <div className="flex justify-between items-center pt-2 border-t border-slate-800 text-xs text-slate-400">
            <span>NCICS NOAA Equatorial Wave Diagnostics</span>
            <Button size="sm" onClick={handleDownload} className="bg-indigo-600 text-white text-xs gap-1.5">
              <Download className="h-3.5 w-3.5" /> Unduh Gambar
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};
