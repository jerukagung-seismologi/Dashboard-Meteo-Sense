// components/air-quality/EcmwfAerosolViewer.tsx
"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import useSWR from "swr";
import {
  Wind,
  Play,
  Pause,
  RotateCcw,
  Download,
  Maximize2,
  Minimize2,
  RefreshCw,
  Calendar,
  Clock,
  Globe,
  Sparkles,
  Info,
  ChevronLeft,
  ChevronRight,
  Loader2,
  ShieldCheck,
  AlertTriangle,
} from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Dialog, DialogContent, DialogTitle, DialogDescription } from "@/components/ui/dialog";

const fetcher = (url: string) => fetch(url).then((res) => res.json());

// Step offsets in hours from base time
const TIME_STEPS = [
  { offset: 0, label: "+0 Jam (Terbaru)" },
  { offset: 3, label: "+3 Jam" },
  { offset: 6, label: "+6 Jam" },
  { offset: 9, label: "+9 Jam" },
  { offset: 12, label: "+12 Jam" },
  { offset: 18, label: "+18 Jam" },
  { offset: 24, label: "+24 Jam (Besok)" },
  { offset: 36, label: "+36 Jam" },
  { offset: 48, label: "+48 Jam (H+2)" },
  { offset: 72, label: "+72 Jam (H+3)" },
  { offset: 96, label: "+96 Jam (H+4)" },
  { offset: 120, label: "+120 Jam (H+5)" },
];

export const EcmwfAerosolViewer: React.FC = () => {
  const [projection, setProjection] = useState<string>("classical_south_east_asia_and_indonesia");
  const [stepIndex, setStepIndex] = useState<number>(1); // Default +3h
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [refreshKey, setRefreshKey] = useState<number>(0);
  const [isFullscreen, setIsFullscreen] = useState<boolean>(false);
  const [imageLoaded, setImageLoaded] = useState<boolean>(false);

  const currentStep = TIME_STEPS[stepIndex];

  // Compute ISO string for base time (yesterday 00Z) and valid time
  const getTimeParameters = useCallback(() => {
    const now = new Date();
    // Default base time to 00:00 UTC of 1 day ago
    const baseDate = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() - 1, 0, 0, 0));
    const validDate = new Date(baseDate.getTime() + currentStep.offset * 3600 * 1000);

    return {
      baseTime: baseDate.toISOString().replace(/\.\d{3}Z$/, "Z"),
      validTime: validDate.toISOString().replace(/\.\d{3}Z$/, "Z"),
    };
  }, [currentStep.offset]);

  const { baseTime, validTime } = getTimeParameters();

  const apiUrl = `/api/ecmwf/aerosol?projection=${encodeURIComponent(projection)}&base_time=${encodeURIComponent(baseTime)}&valid_time=${encodeURIComponent(validTime)}${
    refreshKey ? `&_t=${refreshKey}&refresh=true` : ""
  }`;

  const { data, isLoading, isValidating, mutate } = useSWR(apiUrl, fetcher, {
    revalidateOnFocus: false,
    dedupingInterval: 60000,
  });

  // Handle Play/Pause Animation Loop
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (isPlaying) {
      timerRef.current = setInterval(() => {
        setStepIndex((prev) => (prev + 1) % TIME_STEPS.length);
      }, 2500); // Step every 2.5 seconds
    } else {
      if (timerRef.current) clearInterval(timerRef.current);
    }
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [isPlaying]);

  const handlePrevStep = () => {
    setIsPlaying(false);
    setStepIndex((prev) => (prev > 0 ? prev - 1 : TIME_STEPS.length - 1));
  };

  const handleNextStep = () => {
    setIsPlaying(false);
    setStepIndex((prev) => (prev < TIME_STEPS.length - 1 ? prev + 1 : 0));
  };

  const handleManualRefresh = () => {
    setImageLoaded(false);
    setRefreshKey(Date.now());
    mutate();
  };

  const handleDownload = async () => {
    if (!data?.imageUrl) return;
    try {
      const response = await fetch(data.imageUrl);
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `ECMWF-Aerosol-Forecast-${projection}-${currentStep.offset}h.png`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
    } catch {
      window.open(data.imageUrl, "_blank");
    }
  };

  const imageUrl = data?.imageUrl;
  const description = data?.description || "";
  const title = data?.title || "Peta Prakiraan Aerosol ECMWF CAMS";

  return (
    <div className="space-y-6">
      {/* Top Banner Control Bar */}
      <Card className="border-none shadow-sm dark:bg-slate-900 bg-white overflow-hidden">
        <CardHeader className="pb-3 border-b border-slate-100 dark:border-slate-800">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <CardTitle className="text-xl font-bold flex items-center gap-2.5 text-slate-900 dark:text-slate-100">
                <div className="p-2 bg-sky-500/10 dark:bg-sky-500/20 text-sky-600 dark:text-sky-400 rounded-xl">
                  <Wind className="h-5 w-5" />
                </div>
                <span>Air Quality &amp; Aerosol ECMWF CAMS</span>
              </CardTitle>
              <CardDescription className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                Visualisasi spasial ketebalan optik aerosol (AOD Total) dari model atmosfer resmi Copernicus Atmosphere Monitoring Service (ECMWF)
              </CardDescription>
            </div>

            <div className="flex items-center gap-3 flex-wrap">
              {/* Projection Selector */}
              <div className="flex items-center gap-2">
                <Globe className="h-4 w-4 text-slate-400" />
                <Select value={projection} onValueChange={(val) => { setImageLoaded(false); setProjection(val); }}>
                  <SelectTrigger className="w-[230px] text-xs h-9 font-semibold bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700">
                    <SelectValue placeholder="Pilih Proyeksi Wilayah" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="classical_south_east_asia_and_indonesia">
                      🇮🇩 Indonesia &amp; Asia Tenggara
                    </SelectItem>
                    <SelectItem value="global">🌐 Global (Seluruh Dunia)</SelectItem>
                    <SelectItem value="classical_asia">🌏 Seluruh Asia</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Refresh Button */}
              <Button
                variant="outline"
                size="sm"
                onClick={handleManualRefresh}
                disabled={isLoading || isValidating}
                className="h-9 text-xs font-semibold gap-1.5 border-slate-200 dark:border-slate-700"
              >
                <RefreshCw className={`h-3.5 w-3.5 ${isLoading || isValidating ? "animate-spin text-sky-500" : ""}`} />
                <span>Perbarui Data</span>
              </Button>
            </div>
          </div>
        </CardHeader>

        <CardContent className="p-4 bg-slate-50/50 dark:bg-slate-900/50">
          {/* Timeline Animation & Step Controls */}
          <div className="space-y-3">
            <div className="flex items-center justify-between flex-wrap gap-2 text-xs">
              <div className="flex items-center gap-2">
                <Badge variant="secondary" className="bg-sky-100 dark:bg-sky-950/60 text-sky-700 dark:text-sky-300 border border-sky-200 dark:border-sky-800 font-bold px-2.5 py-1">
                  <Clock className="h-3.5 w-3.5 mr-1" />
                  Prakiraan Jam: {currentStep.label}
                </Badge>
                {description && (
                  <span className="text-slate-500 dark:text-slate-400 font-mono text-[11px] truncate max-w-[500px]">
                    {description}
                  </span>
                )}
              </div>

              <div className="flex items-center gap-1.5">
                <Button
                  variant="outline"
                  size="icon"
                  className="h-8 w-8 text-slate-700 dark:text-slate-300"
                  onClick={handlePrevStep}
                  title="Langkah Sebelumnya"
                >
                  <ChevronLeft className="h-4 w-4" />
                </Button>

                <Button
                  variant={isPlaying ? "destructive" : "default"}
                  size="sm"
                  className="h-8 text-xs font-semibold gap-1.5 px-3 bg-sky-600 hover:bg-sky-700 text-white"
                  onClick={() => setIsPlaying(!isPlaying)}
                >
                  {isPlaying ? (
                    <>
                      <Pause className="h-3.5 w-3.5 fill-current" />
                      <span>Jeda Animasi</span>
                    </>
                  ) : (
                    <>
                      <Play className="h-3.5 w-3.5 fill-current ml-0.5" />
                      <span>Putar Animasi</span>
                    </>
                  )}
                </Button>

                <Button
                  variant="outline"
                  size="icon"
                  className="h-8 w-8 text-slate-700 dark:text-slate-300"
                  onClick={handleNextStep}
                  title="Langkah Berikutnya"
                >
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>

            {/* Step Selection Buttons Grid */}
            <div className="grid grid-cols-3 sm:grid-cols-6 lg:grid-cols-12 gap-1.5 pt-1">
              {TIME_STEPS.map((step, idx) => (
                <button
                  key={step.offset}
                  onClick={() => {
                    setIsPlaying(false);
                    setImageLoaded(false);
                    setStepIndex(idx);
                  }}
                  className={`px-2 py-1.5 rounded-lg text-[11px] font-bold transition-all text-center border ${
                    stepIndex === idx
                      ? "bg-sky-600 text-white border-sky-600 shadow-sm scale-105"
                      : "bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:bg-sky-50 dark:hover:bg-sky-950/40"
                  }`}
                >
                  {step.offset === 0 ? "0h (Live)" : `+${step.offset}h`}
                </button>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Main Image Display Card */}
      <Card className="border-none shadow-md dark:bg-slate-900 bg-white overflow-hidden relative group">
        <CardHeader className="pb-2 border-b border-slate-100 dark:border-slate-800 flex flex-row items-center justify-between">
          <div>
            <CardTitle className="text-base font-bold text-slate-900 dark:text-slate-100">
              {title}
            </CardTitle>
            <CardDescription className="text-xs text-slate-500">
              Kawasan: {projection === "classical_south_east_asia_and_indonesia" ? "Indonesia & Asia Tenggara" : projection}
            </CardDescription>
          </div>

          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setIsFullscreen(true)}
              className="h-8 text-xs font-semibold gap-1 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800"
            >
              <Maximize2 className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">Layar Penuh</span>
            </Button>

            <Button
              variant="outline"
              size="sm"
              onClick={handleDownload}
              disabled={!imageUrl}
              className="h-8 text-xs font-semibold gap-1 text-sky-600 dark:text-sky-400 border-sky-200 dark:border-sky-900 hover:bg-sky-50 dark:hover:bg-sky-950/50"
            >
              <Download className="h-3.5 w-3.5" />
              <span>Unduh PNG</span>
            </Button>
          </div>
        </CardHeader>

        <CardContent className="p-4 flex items-center justify-center min-h-[420px] bg-slate-950 relative">
          {(isLoading || isValidating || !imageLoaded) && (
            <div className="absolute inset-0 flex flex-col items-center justify-center bg-slate-950/80 backdrop-blur-sm z-10 gap-3 text-sky-400">
              <Loader2 className="h-10 w-10 animate-spin" />
              <span className="text-xs font-semibold tracking-wide animate-pulse">
                Memuat Peta Aerosol ECMWF CAMS (+{currentStep.offset}h)...
              </span>
            </div>
          )}

          {imageUrl ? (
            <img
              src={imageUrl}
              alt={`ECMWF Aerosol Forecast ${currentStep.label}`}
              onLoad={() => setImageLoaded(true)}
              onError={() => setImageLoaded(true)}
              className="max-h-[600px] w-auto object-contain rounded-lg shadow-xl transition-all duration-300 hover:scale-[1.01]"
            />
          ) : (
            <div className="text-center p-8 text-slate-400">
              <AlertTriangle className="h-10 w-10 mx-auto mb-2 text-amber-500" />
              <p className="text-sm font-semibold">Gagal memuat peta dari server ECMWF OpenCharts.</p>
              <Button size="sm" variant="outline" className="mt-4 text-xs" onClick={handleManualRefresh}>
                Coba Lagi
              </Button>
            </div>
          )}
        </CardContent>

        <CardFooter className="p-3 bg-slate-50 dark:bg-slate-900/80 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-xs text-slate-500">
          <span className="flex items-center gap-1.5">
            <ShieldCheck className="h-4 w-4 text-emerald-500" />
            <span>Lisensi Data: Open Data ECMWF / Copernicus CAMS</span>
          </span>
          <span className="font-mono text-[11px]">
            Updated: {new Date().toLocaleTimeString("id-ID")} WIB
          </span>
        </CardFooter>
      </Card>

      {/* Educational & Aerosol Guidance Panel */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="border-none shadow-sm dark:bg-slate-900 bg-white">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-bold flex items-center gap-2 text-sky-600 dark:text-sky-400">
              <Info className="h-4 w-4" /> Apa itu Total Aerosol Optical Depth (AOD)?
            </CardTitle>
          </CardHeader>
          <CardContent className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed space-y-2">
            <p>
              **Aerosol Optical Depth (AOD)** adalah ukuran kuantitatif seberapa banyak cahaya matahari yang terserap atau dipantulkan oleh partikel suspended (aerosol) di kolom atmosfer.
            </p>
            <p>
              Makin tinggi nilai AOD, makin banyak kandungan asap, debu, atau partikel polusi di udara yang menghalangi pandangan dan mempengaruhi kualitas udara.
            </p>
          </CardContent>
        </Card>

        <Card className="border-none shadow-sm dark:bg-slate-900 bg-white">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-bold flex items-center gap-2 text-amber-600 dark:text-amber-400">
              <AlertTriangle className="h-4 w-4" /> Sumber Aerosol di Indonesia
            </CardTitle>
          </CardHeader>
          <CardContent className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed space-y-2">
            <ul className="list-disc pl-4 space-y-1">
              <li>**Asap Kebakaran Hutan &amp; Lahan (Karhutla)**: Mengandung *black carbon* dan *organic matter* tinggi.</li>
              <li>**Abu Volkanik Letusan Gunung Berpi**: Aerosol sulfat dan abu halus yang menyebar cepat.</li>
              <li>**Emisi Kendaraan &amp; Industri**: Partikel halus PM2.5 dan PM10 di perkotaan.</li>
            </ul>
          </CardContent>
        </Card>

        <Card className="border-none shadow-sm dark:bg-slate-900 bg-white">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-bold flex items-center gap-2 text-emerald-600 dark:text-emerald-400">
              <Sparkles className="h-4 w-4" /> Panduan Klasifikasi Nilai AOD
            </CardTitle>
          </CardHeader>
          <CardContent className="text-xs space-y-1.5">
            <div className="flex items-center justify-between p-1.5 rounded bg-emerald-50 dark:bg-emerald-950/40 text-emerald-800 dark:text-emerald-300 font-semibold">
              <span>AOD &lt; 0.10</span>
              <span>Udara Bersih / Sangat Baik</span>
            </div>
            <div className="flex items-center justify-between p-1.5 rounded bg-blue-50 dark:bg-blue-950/40 text-blue-800 dark:text-blue-300 font-semibold">
              <span>0.10 - 0.30</span>
              <span>Kondisi Normal / Sedang</span>
            </div>
            <div className="flex items-center justify-between p-1.5 rounded bg-amber-50 dark:bg-amber-950/40 text-amber-800 dark:text-amber-300 font-semibold">
              <span>0.30 - 0.50</span>
              <span>Sedikit Kabut / Agak Keruh</span>
            </div>
            <div className="flex items-center justify-between p-1.5 rounded bg-red-50 dark:bg-red-950/40 text-red-800 dark:text-red-300 font-bold">
              <span>AOD &gt; 0.50</span>
              <span>Kabut Asap Pekat / Bahaya</span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Fullscreen Image Lightbox Dialog */}
      <Dialog open={isFullscreen} onOpenChange={setIsFullscreen}>
        <DialogContent className="max-w-[95vw] max-h-[95vh] p-4 bg-slate-950 border-slate-800 flex flex-col items-center justify-center">
          <DialogTitle className="sr-only">ECMWF OpenCharts Fullscreen Viewer</DialogTitle>
          <DialogDescription className="sr-only">Menampilkan peta prakiraan aerosol ECMWF CAMS dalam ukuran penuh</DialogDescription>
          <div className="w-full flex justify-between items-center mb-2 text-white text-xs">
            <span className="font-bold">{title} - {currentStep.label}</span>
            <Button size="sm" variant="ghost" className="text-white hover:bg-slate-800" onClick={() => setIsFullscreen(false)}>
              <Minimize2 className="h-4 w-4 mr-1" /> Tutup
            </Button>
          </div>
          {imageUrl && (
            <img src={imageUrl} alt="ECMWF Aerosol Fullscreen" className="max-h-[85vh] w-auto object-contain rounded" />
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};
