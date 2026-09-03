// components/air-quality/EcmwfAerosolViewer.tsx
"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import useSWR from "swr";
import {
  Wind,
  Flame,
  Globe2,
  Factory,
  Sun,
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
  Layers,
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

export const CAMS_PRODUCT_LIST = [
  {
    id: "aerosol-forecasts",
    label: "Aerosol & Debu Optik",
    fullName: "Ketebalan Optik Aerosol (AOD 550nm) & Debu",
    icon: Wind,
    color: "text-sky-500",
    bgColor: "bg-sky-500/10",
    borderColor: "border-sky-500/30",
    unit: "AOD (550nm)",
    description: "Distribusi ketebalan optik aerosol total, partikel debu halus gurun, dan materi organik pembakaran.",
  },
  {
    id: "carbon-monoxide-forecasts",
    label: "Karbon Monoksida (CO)",
    fullName: "Kolom Total Karbon Monoksida (CO)",
    icon: Flame,
    color: "text-orange-500",
    bgColor: "bg-orange-500/10",
    borderColor: "border-orange-500/30",
    unit: "10¹⁸ molekul/cm²",
    description: "Konsentrasi kolom atmosfer gas karbon monoksida hasil pembakaran tidak sempurna kendaraan dan kebakaran hutan.",
  },
  {
    id: "carbon-dioxide-forecasts",
    label: "Karbon Dioksida (CO2)",
    fullName: "Fraksi Molar Rerata Kolom Karbon Dioksida (CO2)",
    icon: Globe2,
    color: "text-cyan-500",
    bgColor: "bg-cyan-500/10",
    borderColor: "border-cyan-500/30",
    unit: "ppmv",
    description: "Sebaran konsentrasi gas rumah kaca karbon dioksida di atmosfer regional dan global.",
  },
  {
    id: "nitrogen-dioxide-forecasts",
    label: "Nitrogen Dioksida (NO2)",
    fullName: "Kolom Total Nitrogen Dioksida (NO2)",
    icon: Factory,
    color: "text-red-500",
    bgColor: "bg-red-500/10",
    borderColor: "border-red-500/30",
    unit: "10¹⁵ molekul/cm²",
    description: "Gas polutan asam dari emisi kendaraan bermotor berkecepatan tinggi, transportasi, dan pembangkit listrik.",
  },
  {
    id: "ozone-forecasts",
    label: "Ozon Total (O3)",
    fullName: "Kolom Total Ozon Atmosfer (O3)",
    icon: Sun,
    color: "text-purple-500",
    bgColor: "bg-purple-500/10",
    borderColor: "border-purple-500/30",
    unit: "Dobson Units (DU)",
    description: "Konsentrasi ozon total atmosfer sebagai indikator dinamika stratosfer dan pelindung radiasi ultraviolet surya.",
  },
  {
    id: "sulphur-dioxide-forecasts",
    label: "Sulfur Dioksida (SO2)",
    fullName: "Kolom Total Sulfur Dioksida (SO2)",
    icon: AlertTriangle,
    color: "text-yellow-500",
    bgColor: "bg-yellow-500/10",
    borderColor: "border-yellow-500/30",
    unit: "10¹⁵ molekul/cm²",
    description: "Gas polutan sulfur dari proses pembakaran batubara industri, smelter, dan letusan gunung berapi aktif.",
  },
];

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
  const [selectedProduct, setSelectedProduct] = useState<string>("aerosol-forecasts");
  const [projection, setProjection] = useState<string>("classical_south_east_asia_and_indonesia");
  const [stepIndex, setStepIndex] = useState<number>(1); // Default +3h
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [refreshKey, setRefreshKey] = useState<number>(0);
  const [isFullscreen, setIsFullscreen] = useState<boolean>(false);
  const [imageLoaded, setImageLoaded] = useState<boolean>(false);

  const currentStep = TIME_STEPS[stepIndex];
  const activeProduct = CAMS_PRODUCT_LIST.find((p) => p.id === selectedProduct) || CAMS_PRODUCT_LIST[0];
  const IconComponent = activeProduct.icon;

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

  const apiUrl = `/api/ecmwf/cams?product=${encodeURIComponent(selectedProduct)}&projection=${encodeURIComponent(
    projection
  )}&base_time=${encodeURIComponent(baseTime)}&valid_time=${encodeURIComponent(validTime)}${
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
      }, 2500);
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
      const regionSlug =
        projection === "classical_south_east_asia_and_indonesia"
          ? "Indonesia-SEAsia"
          : projection === "classical_asia"
          ? "Asia"
          : "Global";

      const cleanBase = baseTime.replace(/[-:]/g, "");
      const baseDateTag = `${cleanBase.substring(0, 8)}_${cleanBase.substring(9, 11)}UTC`;

      const cleanValid = validTime.replace(/[-:]/g, "");
      const validDateTag = `${cleanValid.substring(0, 8)}_${cleanValid.substring(9, 11)}UTC`;

      const offsetTag = `+${String(currentStep.offset).padStart(3, "0")}h`;

      const filename = `ECMWF_CAMS_${selectedProduct}_${regionSlug}_Init_${baseDateTag}_Valid_${validDateTag}_${offsetTag}.png`;

      const response = await fetch(data.imageUrl);
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
    } catch (err) {
      console.error("Gagal mengunduh gambar peta:", err);
    }
  };

  return (
    <Card className="border-none shadow-md overflow-hidden bg-slate-900 text-white rounded-3xl border border-slate-800">
      {/* Header & Controls */}
      <CardHeader className="p-5 sm:p-6 border-b border-slate-800/80 bg-slate-950/60">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className={`p-1.5 rounded-lg ${activeProduct.bgColor} ${activeProduct.color}`}>
                <IconComponent className="h-4 w-4" />
              </span>
              <Badge className={`${activeProduct.bgColor} ${activeProduct.color} ${activeProduct.borderColor} text-[10px] uppercase font-bold tracking-wider`}>
                CAMS Copernicus Atmosphere Monitoring
              </Badge>
              {data?.isFallback && (
                <Badge variant="outline" className="border-amber-500/40 text-amber-300 text-[10px] bg-amber-500/10">
                  <AlertTriangle className="h-3 w-3 mr-1" /> Data Acuan Operasional
                </Badge>
              )}
            </div>
            <CardTitle className="text-xl sm:text-2xl font-black tracking-tight text-white flex items-center gap-2">
              {activeProduct.fullName}
            </CardTitle>
            <CardDescription className="text-xs text-slate-400">
              {activeProduct.description} (Satuan: {activeProduct.unit})
            </CardDescription>
          </div>

          {/* Product & Region Selectors */}
          <div className="flex flex-wrap items-center gap-2.5">
            {/* 1. CAMS Product Selector */}
            <Select
              value={selectedProduct}
              onValueChange={(val) => {
                setImageLoaded(false);
                setSelectedProduct(val);
              }}
            >
              <SelectTrigger className="w-[210px] h-9 bg-slate-800 border-slate-700 text-white text-xs font-semibold focus:ring-1 focus:ring-sky-500">
                <Layers className="h-3.5 w-3.5 mr-1.5 text-sky-400 shrink-0" />
                <SelectValue placeholder="Pilih Cemaran CAMS" />
              </SelectTrigger>
              <SelectContent className="bg-slate-800 border-slate-700 text-white">
                {CAMS_PRODUCT_LIST.map((prod) => (
                  <SelectItem key={prod.id} value={prod.id} className="text-xs focus:bg-slate-700 focus:text-white">
                    {prod.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            {/* 2. Region Projection Selector */}
            <Select
              value={projection}
              onValueChange={(val) => {
                setImageLoaded(false);
                setProjection(val);
              }}
            >
              <SelectTrigger className="w-[180px] h-9 bg-slate-800 border-slate-700 text-white text-xs focus:ring-1 focus:ring-sky-500">
                <Globe className="h-3.5 w-3.5 mr-1.5 text-sky-400 shrink-0" />
                <SelectValue placeholder="Pilih Wilayah" />
              </SelectTrigger>
              <SelectContent className="bg-slate-800 border-slate-700 text-white">
                <SelectItem value="classical_south_east_asia_and_indonesia" className="text-xs focus:bg-slate-700 focus:text-white">
                  Indonesia &amp; Asia Tenggara
                </SelectItem>
                <SelectItem value="classical_asia" className="text-xs focus:bg-slate-700 focus:text-white">
                  Benua Asia
                </SelectItem>
                <SelectItem value="classical_global" className="text-xs focus:bg-slate-700 focus:text-white">
                  Global (Seluruh Dunia)
                </SelectItem>
              </SelectContent>
            </Select>

            {/* Refresh Button */}
            <Button
              variant="outline"
              size="sm"
              className="h-9 px-3 bg-slate-800 border-slate-700 text-slate-200 hover:bg-slate-700 hover:text-white text-xs"
              onClick={handleManualRefresh}
              disabled={isLoading || isValidating}
            >
              <RefreshCw className={`h-3.5 w-3.5 mr-1.5 ${isLoading || isValidating ? "animate-spin" : ""}`} />
              Segarkan
            </Button>
          </div>
        </div>
      </CardHeader>

      {/* Main Map Viewer Canvas */}
      <CardContent className="p-4 sm:p-6 space-y-4">
        <div className="relative w-full aspect-[16/9] sm:aspect-[16/10] max-h-[620px] bg-slate-950 rounded-2xl overflow-hidden border border-slate-800 flex items-center justify-center shadow-inner group">
          {/* Loading Indicator Overlay */}
          {(isLoading || !imageLoaded) && (
            <div className="absolute inset-0 z-20 bg-slate-950/80 backdrop-blur-sm flex flex-col items-center justify-center space-y-3">
              <Loader2 className="h-10 w-10 text-sky-400 animate-spin" />
              <div className="text-center space-y-1">
                <p className="text-sm font-bold text-white">Merender Peta Spasial CAMS {activeProduct.label}...</p>
                <p className="text-xs text-slate-400">
                  Langkah Prediksi {currentStep.label} • Proyeksi: {projection.replace(/_/g, " ")}
                </p>
              </div>
            </div>
          )}

          {/* Map Image Render */}
          {data?.imageUrl ? (
            <img
              src={data.imageUrl}
              alt={`ECMWF CAMS ${activeProduct.label} Map`}
              className="w-full h-full object-contain select-none transition-opacity duration-300"
              style={{ opacity: imageLoaded ? 1 : 0 }}
              onLoad={() => setImageLoaded(true)}
              onError={() => setImageLoaded(true)}
            />
          ) : (
            !isLoading && (
              <div className="flex flex-col items-center justify-center p-8 text-center space-y-3">
                <AlertTriangle className="h-10 w-10 text-amber-400" />
                <p className="text-sm font-semibold text-slate-300">
                  Gambar peta spasial belum tersedia untuk parameter ini.
                </p>
                <Button variant="secondary" size="sm" onClick={handleManualRefresh} className="text-xs">
                  Coba Muat Ulang
                </Button>
              </div>
            )
          )}

          {/* Action Overlay Floating Buttons */}
          <div className="absolute top-3 right-3 z-30 flex items-center gap-1.5 opacity-90 group-hover:opacity-100 transition-opacity bg-slate-900/80 backdrop-blur-md p-1 rounded-xl border border-slate-700/60 shadow-lg">
            <Button
              variant="ghost"
              size="sm"
              className="h-7 px-2 text-slate-200 hover:text-white hover:bg-slate-800 text-xs"
              onClick={() => setIsFullscreen(true)}
              disabled={!data?.imageUrl}
              title="Perbesar Layar Penuh"
            >
              <Maximize2 className="h-3.5 w-3.5 mr-1" /> Layar Penuh
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className="h-7 px-2 text-slate-200 hover:text-white hover:bg-slate-800 text-xs"
              onClick={handleDownload}
              disabled={!data?.imageUrl}
              title="Unduh Peta PNG"
            >
              <Download className="h-3.5 w-3.5 mr-1" /> Unduh
            </Button>
          </div>

          {/* Bottom Left Timestamp Tag */}
          <div className="absolute bottom-3 left-3 z-30 bg-slate-900/85 backdrop-blur-md px-3 py-1.5 rounded-xl border border-slate-700/60 text-[11px] text-slate-300 flex items-center gap-3">
            <div className="flex items-center gap-1 font-mono text-sky-300">
              <Clock className="h-3 w-3 text-sky-400" />
              <span>Prakiraan: {currentStep.label}</span>
            </div>
            <span className="text-slate-600">|</span>
            <div className="flex items-center gap-1 text-slate-400">
              <span>Resolusi: ECMWF OpenCharts CAMS (0.4° Global)</span>
            </div>
          </div>
        </div>

        {/* Playback & Timeline Controls */}
        <div className="bg-slate-950/70 p-4 rounded-2xl border border-slate-800/80 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              {/* Previous Button */}
              <Button
                variant="outline"
                size="sm"
                className="h-8 w-8 p-0 bg-slate-800 border-slate-700 text-slate-200 hover:bg-slate-700 hover:text-white"
                onClick={handlePrevStep}
                title="Langkah Sebelumnya"
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>

              {/* Play / Pause Toggle Button */}
              <Button
                variant="default"
                size="sm"
                className={`h-8 px-3 text-xs font-bold ${
                  isPlaying ? "bg-amber-600 hover:bg-amber-700 text-white" : "bg-sky-600 hover:bg-sky-700 text-white"
                }`}
                onClick={() => setIsPlaying(!isPlaying)}
              >
                {isPlaying ? (
                  <>
                    <Pause className="h-3.5 w-3.5 mr-1.5" /> Jeda Animasi
                  </>
                ) : (
                  <>
                    <Play className="h-3.5 w-3.5 mr-1.5" /> Putar Loop
                  </>
                )}
              </Button>

              {/* Next Button */}
              <Button
                variant="outline"
                size="sm"
                className="h-8 w-8 p-0 bg-slate-800 border-slate-700 text-slate-200 hover:bg-slate-700 hover:text-white"
                onClick={handleNextStep}
                title="Langkah Berikutnya"
              >
                <ChevronRight className="h-4 w-4" />
              </Button>

              {/* Reset to 0h */}
              <Button
                variant="ghost"
                size="sm"
                className="h-8 px-2 text-xs text-slate-400 hover:text-white hover:bg-slate-800"
                onClick={() => {
                  setIsPlaying(false);
                  setStepIndex(0);
                }}
              >
                <RotateCcw className="h-3.5 w-3.5 mr-1" /> Reset
              </Button>
            </div>

            <div className="flex items-center gap-2 text-xs text-slate-300">
              <span className="text-slate-500">Prakiraan Terpilih:</span>
              <Badge variant="secondary" className="bg-sky-500/20 text-sky-300 border-sky-500/30 font-bold">
                {currentStep.label}
              </Badge>
            </div>
          </div>

          {/* Time Steps Horizontal Scroller */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 pt-1 no-scrollbar">
            {TIME_STEPS.map((step, idx) => {
              const isSelected = idx === stepIndex;
              return (
                <button
                  key={step.offset}
                  onClick={() => {
                    setIsPlaying(false);
                    setImageLoaded(false);
                    setStepIndex(idx);
                  }}
                  className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all flex items-center gap-1.5 ${
                    isSelected
                      ? "bg-sky-500 text-white shadow-md shadow-sky-500/20 scale-105"
                      : "bg-slate-900 text-slate-400 hover:bg-slate-800 hover:text-slate-200 border border-slate-800"
                  }`}
                >
                  <span className={`w-1.5 h-1.5 rounded-full ${isSelected ? "bg-white" : "bg-slate-600"}`} />
                  {step.label}
                </button>
              );
            })}
          </div>
        </div>
      </CardContent>

      {/* Fullscreen Dialog Modal */}
      <Dialog open={isFullscreen} onOpenChange={setIsFullscreen}>
        <DialogContent className="max-w-[95vw] h-[92vh] p-4 bg-slate-950 border-slate-800 text-white flex flex-col justify-between">
          <div className="flex items-center justify-between pb-3 border-b border-slate-800">
            <div>
              <DialogTitle className="text-base font-bold text-white flex items-center gap-2">
                <IconComponent className={`h-4 w-4 ${activeProduct.color}`} />
                {activeProduct.fullName} ({currentStep.label})
              </DialogTitle>
              <DialogDescription className="text-xs text-slate-400 mt-0.5">
                ECMWF CAMS Atmosphere Monitoring • Satuan: {activeProduct.unit}
              </DialogDescription>
            </div>
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" className="h-8 text-xs bg-slate-800 border-slate-700" onClick={handleDownload}>
                <Download className="h-3.5 w-3.5 mr-1" /> Unduh Peta
              </Button>
              <Button variant="secondary" size="sm" className="h-8 text-xs" onClick={() => setIsFullscreen(false)}>
                Tutup
              </Button>
            </div>
          </div>

          <div className="flex-grow flex items-center justify-center overflow-hidden my-2 relative">
            {data?.imageUrl && (
              <img
                src={data.imageUrl}
                alt="ECMWF CAMS Fullscreen Map"
                className="max-h-full max-w-full object-contain rounded-xl"
              />
            )}
          </div>

          {/* Dialog Timeline Slider */}
          <div className="flex items-center gap-1.5 overflow-x-auto pt-2 border-t border-slate-800">
            {TIME_STEPS.map((step, idx) => (
              <button
                key={step.offset}
                onClick={() => setStepIndex(idx)}
                className={`px-3 py-1 rounded-lg text-xs font-medium whitespace-nowrap transition-colors ${
                  idx === stepIndex ? "bg-sky-500 text-white font-bold" : "bg-slate-900 text-slate-400 hover:bg-slate-800"
                }`}
              >
                {step.label}
              </button>
            ))}
          </div>
        </DialogContent>
      </Dialog>
    </Card>
  );
};
