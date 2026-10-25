// components/climate-drivers/TropicalWavesViewer.tsx
"use client";

import React, { useState, useEffect, useRef, useMemo } from "react";
import useSWR from "swr";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Waves,
  Play,
  Pause,
  SkipBack,
  SkipForward,
  ChevronLeft,
  ChevronRight,
  Maximize2,
  Download,
  RefreshCw,
  ExternalLink,
  Info,
  Calendar,
  Layers,
  Compass,
  Wind,
  CloudRain,
  Zap,
  Activity,
  AlertTriangle,
  BookOpen,
  ArrowRight,
  ShieldCheck,
} from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";

const fetcher = (url: string) => fetch(url).then((res) => res.json());

interface WaveDefinition {
  id: "mjo" | "kelvin" | "eq_rossby" | "gravity";
  name: string;
  shortName: string;
  propagation: "Ke Timur (Eastward)" | "Ke Barat (Westward)";
  speed: string;
  period: string;
  symmetry: string;
  color: string;
  badgeBg: string;
  description: string;
  indonesiaImpact: string;
  schematicUrl: string;
  schematicCaption: string;
  mathematicalSolution: string;
}

const TROPICAL_WAVES: WaveDefinition[] = [
  {
    id: "mjo",
    name: "Madden-Julian Oscillation (MJO)",
    shortName: "MJO (30-60 Hari)",
    propagation: "Ke Timur (Eastward)",
    speed: "~5 m/s (~18 km/jam)",
    period: "30 – 60 Hari (Intraseasonal)",
    symmetry: "Simetris di Ekuator (Skala Planet)",
    color: "text-emerald-500",
    badgeBg: "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300 border-emerald-200",
    description:
      "Fluktuasi cuaca tropis skala planet terbesar pada rentang waktu mingguan hingga bulanan. Berupa 'pulsa' konveksi awan dan hujan lebat yang menjalar dari Samudra Hindia melintasi Benua Maritim Indonesia menuju Samudra Pasifik Barat.",
    indonesiaImpact:
      "Fase 4 dan 5 menandakan pusat konveksi MJO melintas tepat di atas wilayah Nusantara, melipatgandakan intensitas curah hujan, memicu banjir monsunal, dan mengintensifkan pembentukan awan cumulonimbus.",
    schematicUrl: "/api/climate-drivers/tropical-waves?type=schematic&wave=kelvin", // generic reference or direct BOM
    schematicCaption:
      "Skematik sirkulasi vertikal konvektif MJO di troposfer: anomali divergensi atas (200 hPa) dan konvergensi bawah (850 hPa).",
    mathematicalSolution:
      "Gelombang konvektif skala global k=1-2 terkopel dengan dinamika atmosfer ekuatorial skala sirkulasi Walker.",
  },
  {
    id: "kelvin",
    name: "Convectively Coupled Kelvin Wave (KW)",
    shortName: "Gelombang Kelvin",
    propagation: "Ke Timur (Eastward)",
    speed: "12 – 25 m/s (2 hingga 3 kali lebih cepat dari MJO)",
    period: "3 – 7 Hari (Sinoptik Tropis)",
    symmetry: "Simetris Sempurna di Ekuator ($v = 0$)",
    color: "text-blue-500",
    badgeBg: "bg-blue-50 text-blue-700 dark:bg-blue-950/60 dark:text-blue-300 border-blue-200",
    description:
      "Gelombang gravitasi ekuatorial yang terperangkap di lintang rendah (Equatorially Trapped Kelvin Wave). Memiliki kecepatan fase sangat cepat dan bergerak searah dengan MJO ke arah timur. Kecepatan angin meridionalnya bernilai nol ($v = 0$).",
    indonesiaImpact:
      "Ketika gelombang Kelvin aktif melintasi perairan Indonesia, terjadi peningkatan mendadak tutupan awan hujan selama 2-4 hari berturut-turut. Jika beririsan dengan MJO Fase 4/5, memicu anomali cuaca sangat ekstrem.",
    schematicUrl: "/api/climate-drivers/tropical-waves?type=schematic&wave=kelvin",
    schematicCaption:
      "Solusi analitis teoritis Gelombang Kelvin Ekuatorial pada atmosfer inkompresibel kering (Matsuno, 1966). Zona konveksi dan hujan lebat berada di sisi barat daerah bertekanan rendah (L).",
    mathematicalSolution:
      "Solusi persamaan shallow-water Matsuno (1966) untuk mode n = -1: u(y) = u₀ exp(-βy² / 2c), v = 0.",
  },
  {
    id: "eq_rossby",
    name: "Equatorial Rossby Wave (ER)",
    shortName: "Gelombang Rossby Ekuatorial",
    propagation: "Ke Barat (Westward)",
    speed: "4 – 7 m/s (Bergerak berlawanan arah dengan MJO)",
    period: "10 – 30 Hari (Quasi-Biweekly)",
    symmetry: "Simetris terhadap Ekuator (~10° LU & 10° LS)",
    color: "text-amber-500",
    badgeBg: "bg-amber-50 text-amber-700 dark:bg-amber-950/60 dark:text-amber-300 border-amber-200",
    description:
      "Gelombang Rossby ekuatorial mode n = 1 yang menjalar ke arah barat. Dicirikan oleh sepasang pusat pusaran siklonik/antisiklonik kembar yang berpusat di sekitar lintang 10° LU dan 10° LS dengan tiupan angin barat di garis ekuator.",
    indonesiaImpact:
      "Pusaran siklonik kembar di utara dan selatan ekuator adalah pemicu utama terbentuknya bibit siklon tropis (twin tropical cyclogenesis) di Samudra Hindia barat Sumatra, selatan Jawa/Nusa Tenggara, dan Samudra Pasifik utara Papua.",
    schematicUrl: "/api/climate-drivers/tropical-waves?type=schematic&wave=eq_rossby",
    schematicCaption:
      "Solusi teoritis Gelombang Rossby Ekuatorial (Matsuno 1966 / COMET Program). Menampilkan pasangan vorteks siklonik kembar simetris ekuator dengan anomali konvergensi angin barat.",
    mathematicalSolution:
      "Solusi mode n = 1: frekuensi dispersi ω = -βk / (k² + (2n+1)β/c). Penjalaran selalu ke arah barat.",
  },
  {
    id: "gravity",
    name: "Mixed Rossby-Gravity Wave (MRG / Yanai Wave)",
    shortName: "Gelombang MRG (Yanai)",
    propagation: "Ke Barat (Westward)",
    speed: "~10 – 15 m/s (Lebih cepat dari Gelombang Rossby)",
    period: "4 – 8 Hari",
    symmetry: "Antisimetris terhadap Ekuator",
    color: "text-rose-500",
    badgeBg: "bg-rose-50 text-rose-700 dark:bg-rose-950/60 dark:text-rose-300 border-rose-200",
    description:
      "Gelombang gabungan Rossby-Gravitasi (Yanai Wave, mode n = 0). Memiliki struktur tekanan dan angin meridional yang berlawanan tanda (antisimetris) di antara Belahan Bumi Utara dan Selatan, menciptakan aliran angin lintas ekuator (cross-equatorial flow).",
    indonesiaImpact:
      "Mendorong fluks massa udara lembap lintas ekuator dan membentuk klaster badai petir berskala mesoskala yang berpindah cepat di atas pulau-pulau besar Indonesia.",
    schematicUrl: "/api/climate-drivers/tropical-waves?type=schematic&wave=gravity",
    schematicCaption:
      "Solusi teoritis Gelombang Mixed Rossby-Gravity (MRG) pada atmosfer kering (atas) dan terkopel konveksi basah (bawah) dari The COMET® Program / UCAR / NOAA.",
    mathematicalSolution:
      "Solusi mode n = 0: dispersi k/ω - ω/c = β/ω. Berperilaku seperti gelombang Rossby untuk k negatif dan gelombang gravitasi untuk k positif.",
  },
];

export const TropicalWavesViewer: React.FC = () => {
  const [activeTab, setActiveTab] = useState<string>("operational");
  const [selectedWave, setSelectedWave] = useState<"mjo" | "kelvin" | "eq_rossby" | "gravity">("mjo");
  const [viewMode, setViewMode] = useState<"stacked" | "focused">("stacked");
  const [selectedDateIndex, setSelectedDateIndex] = useState<number>(0);
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [lightboxImage, setLightboxImage] = useState<{ url: string; title: string; subtitle?: string } | null>(null);
  const [phasePeriod, setPhasePeriod] = useState<"40" | "90">("40");


  // Today's date in local YYYY-MM-DD
  const todayStr = useMemo(() => {
    const now = new Date();
    const y = now.getFullYear();
    const m = String(now.getMonth() + 1).padStart(2, "0");
    const d = String(now.getDate()).padStart(2, "0");
    return `${y}-${m}-${d}`;
  }, []);

  // Fetch available dates from API
  const { data: datesData, isLoading: datesLoading } = useSWR(
    "/api/climate-drivers/tropical-waves?action=dates",
    fetcher,
    { revalidateOnFocus: false, dedupingInterval: 1800000 }
  );

  const dates: string[] = datesData?.dates || [todayStr];

  // Helper to find today or the latest available analysis date (<= today)
  const defaultDateIndex = useMemo(() => {
    if (!dates || dates.length === 0) return 0;
    const exactToday = dates.indexOf(todayStr);
    if (exactToday !== -1) return exactToday;

    // Find the latest date <= today
    for (let i = dates.length - 1; i >= 0; i--) {
      if (dates[i] <= todayStr) {
        return i;
      }
    }
    return 0;
  }, [dates, todayStr]);

  // Default to today's date (or latest analysis date <= today) instead of the furthest forecast date!
  useEffect(() => {
    if (dates.length > 0) {
      setSelectedDateIndex(defaultDateIndex);
    }
  }, [dates.length, defaultDateIndex]);

  const currentDateStr = dates[selectedDateIndex] || dates[defaultDateIndex] || todayStr;
  const cleanDate = currentDateStr.replace(/-/g, "");

  // Partition dates into analysis (<= today) and forecast (> today)
  const analysisDates = useMemo(() => dates.filter((d) => d <= todayStr), [dates, todayStr]);
  const forecastDates = useMemo(() => dates.filter((d) => d > todayStr), [dates, todayStr]);

  const dateCategory = useMemo(() => {
    if (currentDateStr === todayStr) {
      return {
        type: "today",
        label: "Analisis Observasi Hari Ini (Terkini)",
        badgeBg: "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300 border-emerald-300 dark:border-emerald-800",
        indicator: "bg-emerald-500 animate-pulse",
      };
    }
    if (currentDateStr > todayStr) {
      const diffTime = Math.abs(new Date(currentDateStr).getTime() - new Date(todayStr).getTime());
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      return {
        type: "forecast",
        label: `Prediksi Model Numerik (+${diffDays} Hari ke Depan)`,
        badgeBg: "bg-amber-50 text-amber-700 dark:bg-amber-950/60 dark:text-amber-300 border-amber-300 dark:border-amber-800",
        indicator: "bg-amber-500",
      };
    }
    const diffTime = Math.abs(new Date(todayStr).getTime() - new Date(currentDateStr).getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return {
      type: "past",
      label: `Arsip Analisis Observasi (${diffDays} Hari Lalu)`,
      badgeBg: "bg-blue-50 text-blue-700 dark:bg-blue-950/60 dark:text-blue-300 border-blue-300 dark:border-blue-800",
      indicator: "bg-blue-500",
    };
  }, [currentDateStr, todayStr]);

  // Auto-play animation timer
  const animIntervalRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (isPlaying) {
      animIntervalRef.current = setInterval(() => {
        setSelectedDateIndex((prev) => (prev + 1 >= dates.length ? 0 : prev + 1));
      }, 1200);
    } else if (animIntervalRef.current) {
      clearInterval(animIntervalRef.current);
    }
    return () => {
      if (animIntervalRef.current) clearInterval(animIntervalRef.current);
    };
  }, [isPlaying, dates.length]);

  const handleStepPrev = () => {
    setIsPlaying(false);
    setSelectedDateIndex((prev) => (prev > 0 ? prev - 1 : dates.length - 1));
  };

  const handleStepNext = () => {
    setIsPlaying(false);
    setSelectedDateIndex((prev) => (prev + 1 < dates.length ? prev + 1 : 0));
  };

  const handleStepFirst = () => {
    setIsPlaying(false);
    setSelectedDateIndex(0);
  };

  const handleStepToday = () => {
    setIsPlaying(false);
    setSelectedDateIndex(defaultDateIndex);
  };

  const handleStepLatest = () => {
    setIsPlaying(false);
    setSelectedDateIndex(dates.length - 1);
  };

  const currentWaveDef = TROPICAL_WAVES.find((w) => w.id === selectedWave) || TROPICAL_WAVES[0];

  return (
    <div className="space-y-6">
      {/* Official BOM Header Banner */}
      <Card className="border-none shadow-sm dark:bg-slate-900 bg-white overflow-hidden relative">
        <div className="absolute right-0 top-0 w-96 h-96 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />
        <CardHeader className="pb-3">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <Badge variant="outline" className="bg-emerald-50 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-300 border-emerald-200 text-[10px] font-bold">
                  BOM Australia Climate Monitoring
                </Badge>
                <Badge variant="outline" className="bg-blue-50 dark:bg-blue-950/50 text-blue-700 dark:text-blue-300 border-blue-200 text-[10px] font-bold">
                  Convectively Coupled Equatorial Waves
                </Badge>
              </div>
              <CardTitle className="text-xl sm:text-2xl font-extrabold flex items-center gap-2 text-slate-900 dark:text-slate-100">
                <Waves className="h-6 w-6 text-emerald-500" />
                Pemantauan Gelombang Atmosfer Tropis
              </CardTitle>
              <CardDescription className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1">
                Visualisasi terpadu dinamika gelombang atmosfer ekuatorial: MJO, Gelombang Kelvin, Rossby Ekuatorial (ER), Mixed Rossby-Gravity (MRG), dan Diagram Fase RMM Wheeler-Hendon.
              </CardDescription>
            </div>

            <div className="flex items-center gap-2">
              <a
                href="https://www.bom.gov.au/climate/mjo/#tabs=Outlooks"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-lg bg-emerald-100/70 hover:bg-emerald-200/80 dark:bg-emerald-950/80 dark:hover:bg-emerald-900 text-emerald-800 dark:text-emerald-200 transition-colors"
              >
                <span>Portal Resmi BOM</span>
                <ExternalLink className="h-3.5 w-3.5" />
              </a>
            </div>
          </div>
        </CardHeader>
      </Card>

      {/* Main Navigation Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full space-y-4">
        <TabsList className="grid grid-cols-2 sm:grid-cols-4 bg-slate-100 dark:bg-slate-800/80 p-1 rounded-xl">
          <TabsTrigger value="operational" className="text-xs sm:text-sm font-semibold flex items-center gap-1.5">
            <Layers className="h-4 w-4" />
            <span>Peta Operasional Harian</span>
          </TabsTrigger>
          <TabsTrigger value="schematics" className="text-xs sm:text-sm font-semibold flex items-center gap-1.5">
            <BookOpen className="h-4 w-4" />
            <span>Diagram Teori Gelombang</span>
          </TabsTrigger>
          <TabsTrigger value="phase" className="text-xs sm:text-sm font-semibold flex items-center gap-1.5">
            <Compass className="h-4 w-4" />
            <span>Diagram Fase RMM (BOM)</span>
          </TabsTrigger>
          <TabsTrigger value="bmkg_guide" className="text-xs sm:text-sm font-semibold flex items-center gap-1.5">
            <ShieldCheck className="h-4 w-4" />
            <span>Dampak Cuaca Indonesia</span>
          </TabsTrigger>
        </TabsList>

        {/* ========================================================= */}
        {/* TAB 1: PETA OPERASIONAL HARIAN (BOM DAILY WAVE MAPS)       */}
        {/* ========================================================= */}
        <TabsContent value="operational" className="space-y-4 mt-0">
          {/* Timeline & Playback Controller */}
          <Card className="border-none shadow-sm dark:bg-slate-900 bg-white">
            <CardContent className="p-4">
              <div className="flex flex-col md:flex-row items-center justify-between gap-4">
                {/* Left: Date Display & Selector */}
                <div className="flex flex-col sm:flex-row sm:items-center gap-2.5 w-full lg:w-auto">
                  <div className="flex items-center gap-2">
                    <Calendar className="h-4 w-4 text-emerald-500 shrink-0" />
                    <span className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                      Tanggal:
                    </span>
                  </div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <select
                      value={currentDateStr}
                      onChange={(e) => {
                        setIsPlaying(false);
                        const idx = dates.indexOf(e.target.value);
                        if (idx !== -1) setSelectedDateIndex(idx);
                      }}
                      className="bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-100 text-xs sm:text-sm font-bold font-mono px-3 py-1.5 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    >
                      {analysisDates.length > 0 && (
                        <optgroup label="Analisis & Observasi (Historis & Hari Ini)">
                          {analysisDates.map((d) => (
                            <option key={d} value={d}>
                              {d} {d === todayStr ? "(Hari Ini - Analisis Terkini)" : "(Observasi)"}
                            </option>
                          ))}
                        </optgroup>
                      )}
                      {forecastDates.length > 0 && (
                        <optgroup label="Prediksi Model Numerik (Forecast / Outlook)">
                          {forecastDates.map((d, fIdx) => (
                            <option key={d} value={d}>
                              {d} (Prediksi +{fIdx + 1} Hari){fIdx === forecastDates.length - 1 ? " [Prediksi Terjauh]" : ""}
                            </option>
                          ))}
                        </optgroup>
                      )}
                    </select>

                    <Badge variant="outline" className={`text-xs font-bold gap-1.5 py-1 px-2.5 ${dateCategory.badgeBg}`}>
                      <span className={`w-2 h-2 rounded-full ${dateCategory.indicator}`} />
                      <span>{dateCategory.label}</span>
                    </Badge>
                  </div>
                </div>

                {/* Center: Playback Controls */}
                <div className="flex items-center gap-1.5 bg-slate-100 dark:bg-slate-800/60 p-1 rounded-xl">
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 text-slate-600 dark:text-slate-300"
                    title="Arsip Terlama (Awal)"
                    onClick={handleStepFirst}
                  >
                    <SkipBack className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 text-slate-600 dark:text-slate-300"
                    title="Mundur 1 Hari"
                    onClick={handleStepPrev}
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </Button>
                  <Button
                    variant={isPlaying ? "destructive" : "default"}
                    size="sm"
                    className={`h-8 px-3 text-xs font-bold gap-1.5 rounded-lg ${
                      isPlaying
                        ? "bg-rose-600 hover:bg-rose-700 text-white"
                        : "bg-emerald-600 hover:bg-emerald-700 text-white"
                    }`}
                    onClick={() => setIsPlaying(!isPlaying)}
                  >
                    {isPlaying ? (
                      <>
                        <Pause className="h-3.5 w-3.5 fill-current" />
                        <span>Jeda</span>
                      </>
                    ) : (
                      <>
                        <Play className="h-3.5 w-3.5 fill-current" />
                        <span>Animasi</span>
                      </>
                    )}
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 text-slate-600 dark:text-slate-300"
                    title="Maju 1 Hari"
                    onClick={handleStepNext}
                  >
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                  <Button
                    variant={selectedDateIndex === defaultDateIndex ? "default" : "outline"}
                    size="sm"
                    className={`h-8 px-2.5 text-xs font-bold gap-1 rounded-lg ${
                      selectedDateIndex === defaultDateIndex
                        ? "bg-emerald-600 text-white hover:bg-emerald-700"
                        : "border-emerald-300 dark:border-emerald-700 text-emerald-700 dark:text-emerald-300 hover:bg-emerald-50 dark:hover:bg-emerald-950"
                    }`}
                    title="Kembali ke Tanggal Hari Ini (Analisis Terkini)"
                    onClick={handleStepToday}
                  >
                    <Calendar className="h-3.5 w-3.5" />
                    <span>Hari Ini</span>
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 text-slate-600 dark:text-slate-300"
                    title="Prediksi Terjauh (+27 Hari)"
                    onClick={handleStepLatest}
                  >
                    <SkipForward className="h-4 w-4" />
                  </Button>
                </div>

                {/* Right: Layout Switcher */}
                <div className="flex items-center gap-2">
                  <div className="flex bg-slate-100 dark:bg-slate-800 p-0.5 rounded-lg text-xs font-semibold">
                    <button
                      type="button"
                      onClick={() => setViewMode("stacked")}
                      className={`px-3 py-1 rounded-md transition-all ${
                        viewMode === "stacked"
                          ? "bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 shadow-sm"
                          : "text-slate-500 hover:text-slate-900 dark:hover:text-slate-200"
                      }`}
                    >
                      Bersusun (4 Gelombang)
                    </button>
                    <button
                      type="button"
                      onClick={() => setViewMode("focused")}
                      className={`px-3 py-1 rounded-md transition-all ${
                        viewMode === "focused"
                          ? "bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 shadow-sm"
                          : "text-slate-500 hover:text-slate-900 dark:hover:text-slate-200"
                      }`}
                    >
                      Detail Satuan
                    </button>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Mode 1: Stacked 4 Waves Layout (Exactly matching BOM Australia official display) */}
          {viewMode === "stacked" ? (
            <div className="space-y-4">
              {TROPICAL_WAVES.map((w, index) => {
                const imgProxyUrl = `/api/climate-drivers/tropical-waves?wave=${w.id}&date=${cleanDate}`;
                return (
                  <Card key={w.id} className="border-none shadow-sm dark:bg-slate-900 bg-white overflow-hidden">
                    <div className="p-3 bg-slate-50/70 dark:bg-slate-800/50 border-b dark:border-slate-800 flex flex-wrap items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <span className="font-extrabold text-sm text-slate-900 dark:text-slate-100">
                          {index + 1}. {w.name}
                        </span>
                        <Badge variant="outline" className={`text-[10px] font-bold ${w.badgeBg}`}>
                          {w.propagation}
                        </Badge>
                        <span className="text-xs text-slate-400 font-mono hidden sm:inline">
                          | Kecepatan: {w.speed}
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-7 text-xs font-semibold gap-1 text-slate-600 dark:text-slate-300"
                          onClick={() => {
                            setSelectedWave(w.id);
                            setViewMode("focused");
                          }}
                        >
                          <span>Fokus</span>
                          <ArrowRight className="h-3 w-3" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7 text-slate-500"
                          title="Perbesar Peta"
                          onClick={() =>
                            setLightboxImage({
                              url: imgProxyUrl,
                              title: `${w.name} (${currentDateStr}${currentDateStr > todayStr ? " - Prediksi Model" : " - Analisis"})`,
                              subtitle: `${w.propagation} • Kecepatan: ${w.speed} • Periode: ${w.period}`,
                            })
                          }
                        >
                          <Maximize2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </div>

                    <div className="p-3 bg-slate-950 flex flex-col items-center justify-center min-h-[180px] sm:min-h-[220px]">
                      <img
                        src={imgProxyUrl}
                        alt={`${w.name} - ${currentDateStr}`}
                        className="w-full max-w-5xl rounded object-contain shadow-md transition-transform duration-200 hover:scale-[1.01]"
                        loading="lazy"
                      />
                    </div>
                  </Card>
                );
              })}
            </div>
          ) : (
            /* Mode 2: Focused Single Wave with In-depth Explanations */
            <div className="space-y-4">
              {/* Wave Selector Bar */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                {TROPICAL_WAVES.map((w) => {
                  const isSelected = selectedWave === w.id;
                  return (
                    <button
                      key={w.id}
                      type="button"
                      onClick={() => setSelectedWave(w.id)}
                      className={`p-3 rounded-xl border text-left transition-all ${
                        isSelected
                          ? "bg-emerald-50/80 dark:bg-emerald-950/40 border-emerald-500 dark:border-emerald-500 shadow-sm ring-1 ring-emerald-500"
                          : "bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700"
                      }`}
                    >
                      <div className="text-xs font-extrabold text-slate-900 dark:text-slate-100 mb-1">
                        {w.shortName}
                      </div>
                      <div className="text-[11px] text-slate-500 dark:text-slate-400">
                        {w.propagation}
                      </div>
                    </button>
                  );
                })}
              </div>

              {/* Single Wave Inspection Card */}
              <Card className="border-none shadow-sm dark:bg-slate-900 bg-white overflow-hidden">
                <CardHeader className="pb-3 border-b dark:border-slate-800">
                  <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
                    <div>
                      <CardTitle className="text-lg font-bold flex items-center gap-2 text-slate-900 dark:text-slate-100">
                        <span>{currentWaveDef.name}</span>
                        <Badge variant="outline" className={`text-xs font-bold ${currentWaveDef.badgeBg}`}>
                          {currentWaveDef.propagation}
                        </Badge>
                      </CardTitle>
                      <CardDescription className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                        {dateCategory.label}: {currentDateStr} • Kecepatan: {currentWaveDef.speed} • Periode: {currentWaveDef.period}
                      </CardDescription>
                    </div>

                    <div className="flex items-center gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        className="h-8 text-xs font-semibold gap-1.5"
                        onClick={() =>
                          setLightboxImage({
                            url: `/api/climate-drivers/tropical-waves?wave=${selectedWave}&date=${cleanDate}`,
                            title: `${currentWaveDef.name} (${currentDateStr}${currentDateStr > todayStr ? " - Prediksi Model" : " - Analisis"})`,
                            subtitle: `${currentWaveDef.propagation} • ${currentWaveDef.speed}`,
                          })
                        }
                      >
                        <Maximize2 className="h-3.5 w-3.5" />
                        <span>Perbesar Peta</span>
                      </Button>
                    </div>
                  </div>
                </CardHeader>

                <CardContent className="p-4 space-y-4">
                  {/* Image Display */}
                  <div className="bg-slate-950 rounded-xl p-3 flex flex-col items-center justify-center">
                    <img
                      src={`/api/climate-drivers/tropical-waves?wave=${selectedWave}&date=${cleanDate}`}
                      alt={`${currentWaveDef.name} - ${currentDateStr}`}
                      className="w-full max-w-5xl rounded object-contain shadow-lg"
                    />
                  </div>

                  {/* Physics & Meteorology Guide */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
                    <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/50 border dark:border-slate-800 space-y-1.5">
                      <div className="text-xs font-bold text-slate-900 dark:text-slate-100 flex items-center gap-1.5">
                        <Info className="h-4 w-4 text-emerald-500" />
                        <span>Karakteristik Fisis Gelombang</span>
                      </div>
                      <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
                        {currentWaveDef.description}
                      </p>
                      <div className="text-[11px] font-mono text-emerald-600 dark:text-emerald-400 pt-1">
                        Solusi Dispersi: {currentWaveDef.mathematicalSolution}
                      </div>
                    </div>

                    <div className="p-3.5 rounded-xl bg-amber-50/70 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900/60 space-y-1.5">
                      <div className="text-xs font-bold text-amber-900 dark:text-amber-200 flex items-center gap-1.5">
                        <AlertTriangle className="h-4 w-4 text-amber-500" />
                        <span>Signifikansi &amp; Dampak terhadap Indonesia</span>
                      </div>
                      <p className="text-xs text-amber-800 dark:text-amber-300 leading-relaxed">
                        {currentWaveDef.indonesiaImpact}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}
        </TabsContent>

        {/* ========================================================= */}
        {/* TAB 2: DIAGRAM STRUKTUR TEORI GELOMBANG (SCHEMATICS)       */}
        {/* ========================================================= */}
        <TabsContent value="schematics" className="space-y-4 mt-0">
          <Card className="border-none shadow-sm dark:bg-slate-900 bg-white">
            <CardHeader className="pb-3 border-b dark:border-slate-800">
              <CardTitle className="text-lg font-bold flex items-center gap-2 text-slate-900 dark:text-slate-100">
                <BookOpen className="h-5 w-5 text-indigo-500" />
                Diagram Skematik Struktur Teori Gelombang Atmosfer Tropis
              </CardTitle>
              <CardDescription className="text-xs sm:text-sm text-slate-500 dark:text-slate-400">
                Diagram solusi teoritis analitis (The COMET® Program / UCAR / NOAA &amp; BOM Australia) untuk pemodelan gelombang khatulistiwa dalam dinamika fluida geofisika.
              </CardDescription>
            </CardHeader>

            <CardContent className="p-4 space-y-6">
              {/* 1. Kelvin Wave Schematic */}
              <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/40 space-y-3">
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
                  <div>
                    <h3 className="font-extrabold text-sm sm:text-base text-slate-900 dark:text-slate-100 flex items-center gap-2">
                      <span className="w-2.5 h-2.5 rounded-full bg-blue-500" />
                      1. Gelombang Kelvin Ekuatorial (Equatorial Kelvin Wave)
                    </h3>
                    <p className="text-xs text-slate-500 dark:text-slate-400">
                      Solusi analitis atmosfer inkompresibel kering (Matsuno, 1966)
                    </p>
                  </div>
                  <Badge variant="outline" className="bg-blue-50 text-blue-700 dark:bg-blue-950/60 dark:text-blue-300 text-xs font-bold">
                    Penjalaran: Ke Timur (Eastward) • v = 0
                  </Badge>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-center">
                  <div className="lg:col-span-7 bg-white dark:bg-slate-950 p-2 rounded-xl border dark:border-slate-800 flex justify-center">
                    <img
                      src="/api/climate-drivers/tropical-waves?type=schematic&wave=kelvin"
                      alt="Schematic of Equatorial Kelvin Wave"
                      className="max-h-[280px] object-contain rounded cursor-pointer hover:opacity-95 transition-opacity"
                      onClick={() =>
                        setLightboxImage({
                          url: "/api/climate-drivers/tropical-waves?type=schematic&wave=kelvin",
                          title: "Skematik Teori Gelombang Kelvin Ekuatorial",
                          subtitle: "The COMET® Program / UCAR / NOAA / BOM Australia",
                        })
                      }
                    />
                  </div>
                  <div className="lg:col-span-5 space-y-2 text-xs text-slate-600 dark:text-slate-300">
                    <p className="leading-relaxed">
                      <strong>Mekanisme Fisis:</strong> Gelombang Kelvin adalah pusat tekanan rendah (Low) dan tinggi (High) berselang-seling sepanjang garis khatulistiwa. Karena gaya Coriolis bernilai nol di ekuator, tidak ada komponen angin utara-selatan ($v = 0$).
                    </p>
                    <p className="leading-relaxed">
                      <strong>Pola Awan &amp; Hujan:</strong> Konveksi tebal dan curah hujan lebat terbentuk di <em>sisi barat pusat tekanan rendah</em> (akibat konvergensi angin zonal). Sebaliknya, sisi timur merupakan daerah subsidensi massa udara kering dengan langit cerah.
                    </p>
                    <div className="p-2.5 rounded-lg bg-blue-50/80 dark:bg-blue-950/50 border border-blue-200 dark:border-blue-900 text-blue-900 dark:text-blue-200 text-[11px]">
                      <strong>Kecepatan Penjalaran:</strong> 12–25 m/s (~1000–2000 km/hari), melintasi seluruh kepulauan Indonesia dalam rentang waktu 3–5 hari.
                    </div>
                  </div>
                </div>
              </div>

              {/* 2. Equatorial Rossby Wave Schematic */}
              <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/40 space-y-3">
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
                  <div>
                    <h3 className="font-extrabold text-sm sm:text-base text-slate-900 dark:text-slate-100 flex items-center gap-2">
                      <span className="w-2.5 h-2.5 rounded-full bg-amber-500" />
                      2. Gelombang Rossby Ekuatorial (Equatorial Rossby Wave / ER)
                    </h3>
                    <p className="text-xs text-slate-500 dark:text-slate-400">
                      Solusi mode n = 1 dengan sepasang vorteks siklonik simetris
                    </p>
                  </div>
                  <Badge variant="outline" className="bg-amber-50 text-amber-700 dark:bg-amber-950/60 dark:text-amber-300 text-xs font-bold">
                    Penjalaran: Ke Barat (Westward) • Simetris Ekuator
                  </Badge>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-center">
                  <div className="lg:col-span-7 bg-white dark:bg-slate-950 p-2 rounded-xl border dark:border-slate-800 flex justify-center">
                    <img
                      src="/api/climate-drivers/tropical-waves?type=schematic&wave=eq_rossby"
                      alt="Schematic of Equatorial Rossby Wave"
                      className="max-h-[280px] object-contain rounded cursor-pointer hover:opacity-95 transition-opacity"
                      onClick={() =>
                        setLightboxImage({
                          url: "/api/climate-drivers/tropical-waves?type=schematic&wave=eq_rossby",
                          title: "Skematik Teori Gelombang Rossby Ekuatorial",
                          subtitle: "The COMET® Program / UCAR / NOAA / BOM Australia",
                        })
                      }
                    />
                  </div>
                  <div className="lg:col-span-5 space-y-2 text-xs text-slate-600 dark:text-slate-300">
                    <p className="leading-relaxed">
                      <strong>Mekanisme Fisis:</strong> Memiliki pusat pusaran tekanan rendah (siklon) dan tekanan tinggi (antisiklon) yang simetris di sekitar lintang 10° LU dan 10° LS. Angin barat ekuatorial berhembus kuat di antara kedua pusat siklon.
                    </p>
                    <p className="leading-relaxed">
                      <strong>Pemicu Bibit Siklon Kembar (Twin Cyclogenesis):</strong> Pusaran siklonik di kedua belahan bumi pada bujur yang sama sering kali menjadi prekursor langsung pembentukan depresi tropis atau siklon tropis kembar di Samudra Hindia dan Pasifik Barat.
                    </p>
                    <div className="p-2.5 rounded-lg bg-amber-50/80 dark:bg-amber-950/50 border border-amber-200 dark:border-amber-900 text-amber-900 dark:text-amber-200 text-[11px]">
                      <strong>Arah Penjalaran:</strong> Menjalar dari timur ke barat dengan kecepatan ~4–7 m/s (berlawanan dengan pergerakan MJO).
                    </div>
                  </div>
                </div>
              </div>

              {/* 3. Mixed Rossby-Gravity Wave Schematic */}
              <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/40 space-y-3">
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
                  <div>
                    <h3 className="font-extrabold text-sm sm:text-base text-slate-900 dark:text-slate-100 flex items-center gap-2">
                      <span className="w-2.5 h-2.5 rounded-full bg-rose-500" />
                      3. Gelombang Mixed Rossby-Gravity (MRG / Yanai Wave)
                    </h3>
                    <p className="text-xs text-slate-500 dark:text-slate-400">
                      Solusi mode n = 0 dengan struktur tekanan antisimetris
                    </p>
                  </div>
                  <Badge variant="outline" className="bg-rose-50 text-rose-700 dark:bg-rose-950/60 dark:text-rose-300 text-xs font-bold">
                    Penjalaran: Ke Barat (Westward) • Antisimetris
                  </Badge>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-center">
                  <div className="lg:col-span-7 bg-white dark:bg-slate-950 p-2 rounded-xl border dark:border-slate-800 flex justify-center">
                    <img
                      src="/api/climate-drivers/tropical-waves?type=schematic&wave=gravity"
                      alt="Schematic of Mixed Rossby-Gravity Wave"
                      className="max-h-[300px] object-contain rounded cursor-pointer hover:opacity-95 transition-opacity"
                      onClick={() =>
                        setLightboxImage({
                          url: "/api/climate-drivers/tropical-waves?type=schematic&wave=gravity",
                          title: "Skematik Teori Gelombang Mixed Rossby-Gravity (Yanai Wave)",
                          subtitle: "The COMET® Program / UCAR / NOAA / BOM Australia",
                        })
                      }
                    />
                  </div>
                  <div className="lg:col-span-5 space-y-2 text-xs text-slate-600 dark:text-slate-300">
                    <p className="leading-relaxed">
                      <strong>Mekanisme Fisis:</strong> Gelombang MRG memiliki sel tekanan yang bertolak belakang (antisimetris). Tekanan rendah di Belahan Bumi Utara akan berhadapan langsung dengan tekanan tinggi di Belahan Bumi Selatan, menghasilkan angin lintang ekuator yang intens.
                    </p>
                    <p className="leading-relaxed">
                      <strong>Karakteristik Konveksi:</strong> Pola deep convection tersusun secara berselang-seling miring terhadap garis ekuator. Kecepatan geraknya ke barat lebih cepat daripada gelombang Rossby murni.
                    </p>
                    <div className="p-2.5 rounded-lg bg-rose-50/80 dark:bg-rose-950/50 border border-rose-200 dark:border-rose-900 text-rose-900 dark:text-rose-200 text-[11px]">
                      <strong>Atmosfer Terkopel Konveksi (Bawah):</strong> Panel bawah menampilkan modifikasi aliran angin saat panas laten kondensasi (latent heat) dari konveksi basah terintegrasi dengan medan vortisitas.
                    </div>
                  </div>
                </div>
              </div>

              {/* Attribution Footer */}
              <div className="p-3 bg-slate-50 dark:bg-slate-800/40 rounded-xl text-[11px] text-slate-500 dark:text-slate-400 leading-relaxed border dark:border-slate-800">
                <strong>Referensi &amp; Hak Cipta Ilmiah:</strong> Diagram struktur teori diambil dari modul <em>Introduction to Tropical Meteorology</em> oleh The COMET® Program (University Corporation for Atmospheric Research / UCAR), disponsori oleh National Oceanic and Atmospheric Administration (NOAA) dan diadopsi oleh Bureau of Meteorology (BOM) Australia.
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ========================================================= */}
        {/* TAB 3: DIAGRAM FASE RMM WHEELER-HENDON (BOM OFFICIAL)      */}
        {/* ========================================================= */}
        <TabsContent value="phase" className="space-y-4 mt-0">
          <Card className="border-none shadow-sm dark:bg-slate-900 bg-white">
            <CardHeader className="pb-3 border-b dark:border-slate-800">
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
                <div>
                  <CardTitle className="text-lg font-bold flex items-center gap-2 text-slate-900 dark:text-slate-100">
                    <Compass className="h-5 w-5 text-indigo-500" />
                    Diagram Fase RMM MJO Resmi (BOM Australia)
                  </CardTitle>
                  <CardDescription className="text-xs sm:text-sm text-slate-500 dark:text-slate-400">
                    Lintasan ruang fase RMM1 vs RMM2 (Wheeler &amp; Hendon 2004, Gottschalck et al. 2010).
                  </CardDescription>
                </div>

                <div className="flex items-center gap-2">
                  <div className="flex bg-slate-100 dark:bg-slate-800 p-0.5 rounded-lg text-xs font-semibold">
                    <button
                      type="button"
                      onClick={() => setPhasePeriod("40")}
                      className={`px-3 py-1 rounded-md transition-all ${
                        phasePeriod === "40"
                          ? "bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 shadow-sm"
                          : "text-slate-500 hover:text-slate-900 dark:hover:text-slate-200"
                      }`}
                    >
                      40 Hari Terakhir
                    </button>
                    <button
                      type="button"
                      onClick={() => setPhasePeriod("90")}
                      className={`px-3 py-1 rounded-md transition-all ${
                        phasePeriod === "90"
                          ? "bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 shadow-sm"
                          : "text-slate-500 hover:text-slate-900 dark:hover:text-slate-200"
                      }`}
                    >
                      90 Hari Terakhir
                    </button>
                  </div>
                </div>
              </div>
            </CardHeader>

            <CardContent className="p-4 space-y-6">
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-center">
                {/* Official BOM GIF Diagram */}
                <div className="lg:col-span-6 bg-slate-950 p-3 rounded-2xl flex flex-col items-center justify-center">
                  <img
                    src={`/api/climate-drivers/tropical-waves?type=phase_diagram&days=${phasePeriod}`}
                    alt={`MJO RMM Phase Diagram Last ${phasePeriod} Days`}
                    className="max-h-[380px] w-auto object-contain rounded-lg shadow-lg cursor-pointer hover:scale-[1.01] transition-transform"
                    onClick={() =>
                      setLightboxImage({
                        url: `/api/climate-drivers/tropical-waves?type=phase_diagram&days=${phasePeriod}`,
                        title: `Diagram Fase MJO Wheeler-Hendon (${phasePeriod} Hari Terakhir)`,
                        subtitle: "BOM Australia Operational RMM Product",
                      })
                    }
                  />
                  <span className="text-[11px] text-slate-400 font-medium mt-2">
                    Sumber: BOM Australia IDCKGEM000 (Diperbarui Setiap Hari)
                  </span>
                </div>

                {/* Interpretation & Phase Meanings */}
                <div className="lg:col-span-6 space-y-3">
                  <div className="p-3 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-900 text-emerald-900 dark:text-emerald-200 text-xs">
                    <div className="font-bold mb-1 flex items-center gap-1.5">
                      <Zap className="h-4 w-4 text-emerald-500" />
                      <span>Aturan Amplitudo &amp; Perambatan Berlawanan Jarum Jam:</span>
                    </div>
                    <ul className="list-disc list-inside space-y-1 text-slate-700 dark:text-slate-300">
                      <li>
                        <strong>Lingkaran Tengah (Amplitudo &lt; 1.0):</strong> MJO dalam kondisi lemah atau tidak aktif.
                      </li>
                      <li>
                        <strong>Di Luar Lingkaran (Amplitudo &ge; 1.0):</strong> MJO dalam kondisi aktif terorganisir.
                      </li>
                      <li>
                        Arah rotasi normal adalah <strong>berlawanan arah jarum jam (anti-clockwise)</strong>, mencerminkan perambatan dari Samudra Hindia ke Pasifik (Barat ke Timur).
                      </li>
                    </ul>
                  </div>

                  {/* Quadrant Breakdown */}
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <div className="p-2.5 rounded-lg border dark:border-slate-800 bg-slate-50 dark:bg-slate-800/40">
                      <div className="font-bold text-slate-900 dark:text-slate-100 mb-0.5">Fase 1</div>
                      <div className="text-slate-500 dark:text-slate-400">Belahan Barat &amp; Afrika</div>
                    </div>
                    <div className="p-2.5 rounded-lg border dark:border-slate-800 bg-slate-50 dark:bg-slate-800/40">
                      <div className="font-bold text-slate-900 dark:text-slate-100 mb-0.5">Fase 2 &amp; 3</div>
                      <div className="text-slate-500 dark:text-slate-400">Samudra Hindia (Indian Ocean)</div>
                    </div>
                    <div className="p-2.5 rounded-lg border-2 border-emerald-500 bg-emerald-50/50 dark:bg-emerald-950/30">
                      <div className="font-bold text-emerald-700 dark:text-emerald-300 mb-0.5">
                        Fase 4 &amp; 5 (Indonesia)
                      </div>
                      <div className="text-emerald-800 dark:text-emerald-200 font-medium text-[11px]">
                        Benua Maritim: Konveksi &amp; Hujan Maksimum
                      </div>
                    </div>
                    <div className="p-2.5 rounded-lg border dark:border-slate-800 bg-slate-50 dark:bg-slate-800/40">
                      <div className="font-bold text-slate-900 dark:text-slate-100 mb-0.5">Fase 6 &amp; 7</div>
                      <div className="text-slate-500 dark:text-slate-400">Samudra Pasifik Barat</div>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ========================================================= */}
        {/* TAB 4: DAMPAK CUACA & PANDUAN PRAKIRAWAN BMKG               */}
        {/* ========================================================= */}
        <TabsContent value="bmkg_guide" className="space-y-4 mt-0">
          <Card className="border-none shadow-sm dark:bg-slate-900 bg-white">
            <CardHeader className="pb-3 border-b dark:border-slate-800">
              <CardTitle className="text-lg font-bold flex items-center gap-2 text-slate-900 dark:text-slate-100">
                <ShieldCheck className="h-5 w-5 text-indigo-500" />
                Panduan Operasional Prakirawan BMKG: Superposisi Gelombang Atmosfer
              </CardTitle>
              <CardDescription className="text-xs sm:text-sm text-slate-500 dark:text-slate-400">
                Memahami bagaimana interferensi konstruktif antar gelombang memicu cuaca ekstrem di kepulauan Indonesia.
              </CardDescription>
            </CardHeader>

            <CardContent className="p-4 space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {/* 1. Superposisi Konstruktif */}
                <div className="p-4 rounded-xl border border-rose-200 dark:border-rose-900 bg-rose-50/50 dark:bg-rose-950/30 space-y-2">
                  <div className="flex items-center gap-2 text-rose-700 dark:text-rose-300 font-bold text-xs uppercase tracking-wider">
                    <AlertTriangle className="h-4 w-4" />
                    <span>Multiplikasi Cuaca Ekstrem</span>
                  </div>
                  <h4 className="font-bold text-sm text-slate-900 dark:text-slate-100">
                    MJO (Fase 4/5) + Gelombang Kelvin
                  </h4>
                  <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
                    Terjadi fenomena <strong>superposisi konstruktif</strong> (interferensi saling menguatkan). Peningkatan kecepatan angin barat (Westerly Wind Burst) memicu pembentukan awan cumulonimbus masif yang berlangsung lebih dari 3 hari, meningkatkan risiko banjir bandang di Jawa, Sumatra, dan Kalimantan.
                  </p>
                </div>

                {/* 2. Siklonogenesis Ekuatorial */}
                <div className="p-4 rounded-xl border border-amber-200 dark:border-amber-900 bg-amber-50/50 dark:bg-amber-950/30 space-y-2">
                  <div className="flex items-center gap-2 text-amber-700 dark:text-amber-300 font-bold text-xs uppercase tracking-wider">
                    <Wind className="h-4 w-4" />
                    <span>Bibit Siklon Tropis</span>
                  </div>
                  <h4 className="font-bold text-sm text-slate-900 dark:text-slate-100">
                    Gelombang Rossby Ekuatorial (ER)
                  </h4>
                  <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
                    Pasangan vorteks siklonik di Samudra Hindia dan Pasifik Barat memusatkan vortisitas absolut. Sangat sering berkembang menjadi <strong>Tropical Cyclone Warning Center (TCWC) seeds</strong> di selatan Jawa, Nusa Tenggara, atau perairan Timor.
                  </p>
                </div>

                {/* 3. Cross-Equatorial Surge */}
                <div className="p-4 rounded-xl border border-blue-200 dark:border-blue-900 bg-blue-50/50 dark:bg-blue-950/30 space-y-2">
                  <div className="flex items-center gap-2 text-blue-700 dark:text-blue-300 font-bold text-xs uppercase tracking-wider">
                    <CloudRain className="h-4 w-4" />
                    <span>Seruakan Dingin &amp; MRG</span>
                  </div>
                  <h4 className="font-bold text-sm text-slate-900 dark:text-slate-100">
                    Gelombang MRG + Cold Surge
                  </h4>
                  <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
                    Aliran angin lintas khatulistiwa dari belahan bumi utara diperkuat oleh gelombang Mixed Rossby-Gravity, mengangkut uap air tebal melintasi Laut Natuna dan Selat Karimata menuju wilayah barat Indonesia.
                  </p>
                </div>
              </div>

              {/* Table of Wave Summary for Forecasters */}
              <div className="border dark:border-slate-800 rounded-xl overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-bold">
                      <th className="p-3">Jenis Gelombang</th>
                      <th className="p-3">Arah Rambat</th>
                      <th className="p-3">Kecepatan Fase</th>
                      <th className="p-3">Periode Tipikal</th>
                      <th className="p-3">Karakteristik Awan / Konveksi</th>
                      <th className="p-3">Pola Angin Tropis</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y dark:divide-slate-800 text-slate-600 dark:text-slate-300">
                    <tr>
                      <td className="p-3 font-bold text-slate-900 dark:text-slate-100">MJO</td>
                      <td className="p-3 text-emerald-600 font-semibold">Ke Timur</td>
                      <td className="p-3 font-mono">~5 m/s</td>
                      <td className="p-3">30–60 Hari</td>
                      <td className="p-3">Kluster awan konvektif skala benua</td>
                      <td className="p-3">Divergensi atas (200 hPa), konvergensi bawah (850 hPa)</td>
                    </tr>
                    <tr>
                      <td className="p-3 font-bold text-slate-900 dark:text-slate-100">Kelvin (KW)</td>
                      <td className="p-3 text-blue-600 font-semibold">Ke Timur</td>
                      <td className="p-3 font-mono">12–25 m/s</td>
                      <td className="p-3">3–7 Hari</td>
                      <td className="p-3">Awan tebal di barat pusat tekanan rendah</td>
                      <td className="p-3 font-mono">v = 0 (angin meridional nol)</td>
                    </tr>
                    <tr>
                      <td className="p-3 font-bold text-slate-900 dark:text-slate-100">Equatorial Rossby (ER)</td>
                      <td className="p-3 text-amber-600 font-semibold">Ke Barat</td>
                      <td className="p-3 font-mono">4–7 m/s</td>
                      <td className="p-3">10–30 Hari</td>
                      <td className="p-3">Simetris di kedua sisi ekuator (~10° LU/LS)</td>
                      <td className="p-3">Pusaran siklonik kembar dengan angin barat kuat</td>
                    </tr>
                    <tr>
                      <td className="p-3 font-bold text-slate-900 dark:text-slate-100">MRG (Yanai Wave)</td>
                      <td className="p-3 text-rose-600 font-semibold">Ke Barat</td>
                      <td className="p-3 font-mono">10–15 m/s</td>
                      <td className="p-3">4–8 Hari</td>
                      <td className="p-3">Kluster badai petir antisimetris ekuator</td>
                      <td className="p-3">Aliran angin lintas ekuator (cross-equatorial)</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Lightbox Modal */}
      {lightboxImage && (
        <Dialog open={!!lightboxImage} onOpenChange={() => setLightboxImage(null)}>
          <DialogContent className="max-w-4xl p-4 bg-white dark:bg-slate-900 border-none shadow-2xl">
            <DialogHeader className="pb-2 border-b dark:border-slate-800">
              <DialogTitle className="text-base font-extrabold text-slate-900 dark:text-slate-100 flex items-center justify-between">
                <span>{lightboxImage.title}</span>
                <Button
                  variant="outline"
                  size="sm"
                  className="h-7 text-xs font-semibold gap-1 mr-6"
                  onClick={() => {
                    const a = document.createElement("a");
                    a.href = lightboxImage.url;
                    a.target = "_blank";
                    a.download = "tropical_wave_diagram.png";
                    a.click();
                  }}
                >
                  <Download className="h-3.5 w-3.5" />
                  <span>Unduh</span>
                </Button>
              </DialogTitle>
              {lightboxImage.subtitle && (
                <p className="text-xs text-slate-500 dark:text-slate-400">{lightboxImage.subtitle}</p>
              )}
            </DialogHeader>

            <div className="bg-slate-950 p-2 rounded-xl flex items-center justify-center min-h-[300px]">
              <img
                src={lightboxImage.url}
                alt={lightboxImage.title}
                className="max-h-[75vh] w-auto object-contain rounded"
              />
            </div>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
};
