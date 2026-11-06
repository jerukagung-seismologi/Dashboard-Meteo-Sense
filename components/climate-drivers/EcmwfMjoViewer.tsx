// components/climate-drivers/EcmwfMjoViewer.tsx
"use client";

import React, { useState } from "react";
import useSWR from "swr";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import {
  Compass,
  RefreshCw,
  Download,
  Maximize2,
  ExternalLink,
  Loader2,
  Info,
  Calendar,
  Layers,
  Sparkles,
  AlertTriangle,
  Globe2,
  Activity,
  CheckCircle2,
} from "lucide-react";
import { EcmwfMjoData } from "@/lib/climate-drivers/types";

const fetcher = (url: string) => fetch(url).then((res) => res.json());

interface EcmwfMjoViewerProps {
  initialBaseTime?: string;
}

export const EcmwfMjoViewer: React.FC<EcmwfMjoViewerProps> = ({ initialBaseTime }) => {
  const [selectedBaseTime, setSelectedBaseTime] = useState<string>(initialBaseTime || "");
  const [refreshKey, setRefreshKey] = useState<number>(0);
  const [isZoomOpen, setIsZoomOpen] = useState<boolean>(false);
  const [isDownloading, setIsDownloading] = useState<boolean>(false);

  const queryParams = new URLSearchParams();
  if (selectedBaseTime) queryParams.set("base_time", selectedBaseTime);
  if (refreshKey) queryParams.set("_t", refreshKey.toString());
  const queryString = queryParams.toString() ? `?${queryParams.toString()}` : "";

  const { data, error, isLoading, mutate } = useSWR<EcmwfMjoData>(
    `/api/ecmwf/mjo${queryString}`,
    fetcher,
    {
      revalidateOnFocus: false,
      dedupingInterval: 60000,
    }
  );

  const handleRefresh = () => {
    setRefreshKey(Date.now());
    mutate();
  };

  const handleDownload = async () => {
    if (!data?.imageUrl) return;
    setIsDownloading(true);
    try {
      const response = await fetch(data.imageUrl);
      const blob = await response.blob();
      const blobUrl = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      const dateTag = data.baseTime ? data.baseTime.split("T")[0] : "ecmwf";
      link.href = blobUrl;
      link.download = `ECMWF_MJO_Ensemble_Forecast_${dateTag}.png`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(blobUrl);
    } catch (err) {
      window.open(data.imageUrl, "_blank");
    } finally {
      setIsDownloading(false);
    }
  };

  const currentRunLabel =
    data?.availableTimes?.find(
      (t) => t.iso === data.baseTime || t.value === selectedBaseTime || t.iso === selectedBaseTime
    )?.label || data?.baseTime?.split("T")[0] || "Run Terkini";

  return (
    <Card className="border-none shadow-sm dark:bg-slate-900 bg-white overflow-hidden">
      <CardHeader className="p-4 sm:p-6 border-b border-slate-100 dark:border-slate-800/80">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="space-y-1.5">
            <div className="flex flex-wrap items-center gap-2">
              <Badge
                variant="outline"
                className="bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 border-indigo-200 dark:border-indigo-800 text-[11px] font-semibold"
              >
                <Globe2 className="h-3 w-3 mr-1" />
                ECMWF Extended-Range
              </Badge>
              <Badge
                variant="outline"
                className="bg-purple-50 dark:bg-purple-950/60 text-purple-700 dark:text-purple-300 border-purple-200 dark:border-purple-800 text-[11px] font-semibold"
              >
                100 Anggota Ensemble
              </Badge>
              <Badge
                variant="outline"
                className="bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800 text-[11px] font-semibold"
              >
                Sub-seasonal (46 Hari)
              </Badge>
            </div>
            <CardTitle className="text-lg sm:text-xl font-extrabold tracking-tight text-slate-900 dark:text-slate-100 flex items-center gap-2">
              <Compass className="h-5 w-5 text-indigo-500" />
              Prakiraan Diagram Fase MJO Ensemble ECMWF (Wheeler-Hendon)
            </CardTitle>
            <CardDescription className="text-xs sm:text-sm text-slate-500 dark:text-slate-400">
              Proyeksi perambatan MJO hingga 46 hari ke depan menggunakan model ansambel resolusi tinggi ECMWF (OpenCharts MOFC Multi-Model)
            </CardDescription>
          </div>

          {/* Action Toolbar & Base Time Selector */}
          <div className="flex flex-wrap items-center gap-2 self-start lg:self-center">
            {/* Run Time Selector */}
            {data?.availableTimes && data.availableTimes.length > 0 && (
              <div className="flex items-center gap-1.5">
                <Calendar className="h-4 w-4 text-slate-400 shrink-0 hidden sm:inline-block" />
                <Select
                  value={selectedBaseTime || data.availableTimes[0]?.iso}
                  onValueChange={(val) => setSelectedBaseTime(val)}
                >
                  <SelectTrigger className="w-[180px] sm:w-[210px] h-9 text-xs bg-slate-50 dark:bg-slate-950 dark:border-slate-800">
                    <SelectValue placeholder="Pilih Waktu Inisialisasi" />
                  </SelectTrigger>
                  <SelectContent className="max-h-72">
                    {data.availableTimes.map((item, index) => (
                      <SelectItem key={item.value} value={item.iso} className="text-xs">
                        <div className="flex items-center justify-between w-full gap-2">
                          <span>{item.label}</span>
                          {index === 0 && (
                            <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300">
                              Terkini
                            </span>
                          )}
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            {/* Refresh */}
            <Button
              variant="outline"
              size="sm"
              onClick={handleRefresh}
              disabled={isLoading}
              className="h-9 px-2.5 text-xs dark:bg-slate-950 dark:border-slate-800"
              title="Perbarui data langsung dari server ECMWF"
            >
              <RefreshCw className={`h-3.5 w-3.5 ${isLoading ? "animate-spin text-indigo-500" : ""}`} />
              <span className="ml-1.5 hidden sm:inline">Refresh</span>
            </Button>

            {/* Download */}
            <Button
              variant="outline"
              size="sm"
              onClick={handleDownload}
              disabled={!data?.imageUrl || isDownloading}
              className="h-9 px-2.5 text-xs dark:bg-slate-950 dark:border-slate-800"
              title="Unduh citra diagram resolusi tinggi (PNG)"
            >
              <Download className="h-3.5 w-3.5" />
              <span className="ml-1.5 hidden sm:inline">{isDownloading ? "Mengunduh..." : "Unduh"}</span>
            </Button>

            {/* Fullscreen Zoom */}
            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsZoomOpen(true)}
              disabled={!data?.imageUrl}
              className="h-9 px-2.5 text-xs dark:bg-slate-950 dark:border-slate-800"
              title="Perbesar tampilan penuh"
            >
              <Maximize2 className="h-3.5 w-3.5" />
              <span className="ml-1.5 hidden sm:inline">Perbesar</span>
            </Button>

            {/* External Link to ECMWF Portal */}
            <a
              href="https://charts.ecmwf.int/products/mofc_multi_mjo_family_index"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center justify-center h-9 px-2.5 text-xs font-medium rounded-md border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
              title="Buka portal resmi ECMWF OpenCharts"
            >
              <ExternalLink className="h-3.5 w-3.5" />
              <span className="ml-1.5 hidden md:inline">OpenCharts</span>
            </a>
          </div>
        </div>
      </CardHeader>

      <CardContent className="p-4 sm:p-6 space-y-6">
        {/* Main Chart Display Area */}
        <div className="relative rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950/50 p-2 sm:p-4 overflow-hidden flex flex-col items-center justify-center min-h-[380px] sm:min-h-[480px]">
          {isLoading ? (
            <div className="flex flex-col items-center justify-center py-16 gap-3">
              <Loader2 className="h-8 w-8 animate-spin text-indigo-500" />
              <p className="text-xs sm:text-sm text-slate-500 font-medium animate-pulse">
                Mengambil citra diagram fase MJO dari ECMWF OpenCharts API...
              </p>
            </div>
          ) : error || !data?.imageUrl ? (
            <div className="flex flex-col items-center justify-center py-12 px-4 text-center max-w-md gap-3">
              <AlertTriangle className="h-8 w-8 text-amber-500" />
              <p className="text-sm font-semibold text-slate-800 dark:text-slate-200">
                Gagal memuat citra ECMWF
              </p>
              <p className="text-xs text-slate-500">
                {error?.message || data?.error || "Koneksi ke endpoint opencharts-api.ecmwf.int sedang mengalami kendala."}
              </p>
              <Button size="sm" variant="outline" onClick={handleRefresh} className="mt-2 text-xs">
                Coba Muat Ulang
              </Button>
            </div>
          ) : (
            <div className="w-full flex flex-col items-center">
              {/* Image Container with cursor pointer for zoom */}
              <div
                onClick={() => setIsZoomOpen(true)}
                className="cursor-zoom-in relative group max-w-full rounded-xl overflow-hidden shadow-sm bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800"
              >
                <img
                  src={data.imageUrl}
                  alt="ECMWF MJO Wheeler-Hendon Phase Diagram Forecast"
                  className="max-h-[550px] w-auto object-contain transition-transform duration-200 group-hover:scale-[1.01]"
                  loading="lazy"
                />
                <div className="absolute inset-0 bg-black/0 group-hover:bg-black/5 dark:group-hover:bg-white/5 transition-colors pointer-events-none flex items-center justify-center">
                  <div className="opacity-0 group-hover:opacity-100 transition-opacity bg-slate-900/80 text-white text-xs px-3 py-1.5 rounded-full flex items-center gap-1.5 shadow-lg backdrop-blur-sm">
                    <Maximize2 className="h-3.5 w-3.5" />
                    Klik untuk memperbesar
                  </div>
                </div>
              </div>

              {/* Caption & Metadata Bar */}
              <div className="w-full mt-3 flex flex-wrap items-center justify-between gap-2 text-[11px] text-slate-500 dark:text-slate-400 px-2">
                <div className="flex items-center gap-2">
                  <span className="font-semibold text-slate-700 dark:text-slate-300">
                    Inisialisasi Model: {currentRunLabel}
                  </span>
                  <span>•</span>
                  <span>Produk: mofc_multi_mjo_family_index</span>
                </div>
                <div className="flex items-center gap-2">
                  <span>{data.copyright}</span>
                  <span>•</span>
                  <span className="font-mono">Lisensi: {data.licence}</span>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Scientific Interpretation Guide & Legend */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 pt-1">
          {/* Card 1: Ensemble Color Codes */}
          <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/70 space-y-3">
            <div className="flex items-center gap-2 text-xs font-bold text-slate-800 dark:text-slate-200 uppercase tracking-wider">
              <Layers className="h-4 w-4 text-indigo-500" />
              Kode Warna Anggota Ansambel
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
              Titik-titik lingkaran menggambarkan sebaran (spread) dari <b>100 anggota ansambel</b> prediksi model pada hari-hari kunci ke depan:
            </p>
            <div className="grid grid-cols-2 gap-2 text-xs font-medium">
              <div className="flex items-center gap-2 p-1.5 rounded-lg bg-red-50 dark:bg-red-950/40 text-red-700 dark:text-red-300">
                <span className="h-3 w-3 rounded-full bg-red-500 shrink-0" />
                <span>Hari +1 (Merah)</span>
              </div>
              <div className="flex items-center gap-2 p-1.5 rounded-lg bg-pink-50 dark:bg-pink-950/40 text-pink-700 dark:text-pink-300">
                <span className="h-3 w-3 rounded-full bg-pink-500 shrink-0" />
                <span>Hari +5 (Pink)</span>
              </div>
              <div className="flex items-center gap-2 p-1.5 rounded-lg bg-orange-50 dark:bg-orange-950/40 text-orange-700 dark:text-orange-300">
                <span className="h-3 w-3 rounded-full bg-orange-500 shrink-0" />
                <span>Hari +10 (Oranye)</span>
              </div>
              <div className="flex items-center gap-2 p-1.5 rounded-lg bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300">
                <span className="h-3 w-3 rounded-full bg-blue-500 shrink-0" />
                <span>Hari +15 (Biru)</span>
              </div>
              <div className="flex items-center gap-2 p-1.5 rounded-lg bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 col-span-2">
                <span className="h-3 w-3 rounded-full bg-emerald-500 shrink-0" />
                <span>Hari +20 (Hijau)</span>
              </div>
            </div>
          </div>

          {/* Card 2: Trajectory & Evolution */}
          <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/70 space-y-3">
            <div className="flex items-center gap-2 text-xs font-bold text-slate-800 dark:text-slate-200 uppercase tracking-wider">
              <Activity className="h-4 w-4 text-emerald-500" />
              Garis Trajektori Evolusi
            </div>
            <div className="space-y-2.5 text-xs text-slate-600 dark:text-slate-300">
              <div className="flex items-start gap-2">
                <div className="h-2 w-4 bg-slate-900 dark:bg-white mt-1.5 shrink-0 rounded-full" />
                <div>
                  <b className="text-slate-900 dark:text-slate-100">Garis Hitam Tebal</b>: Nilai Rata-rata Ansambel (<i>Ensemble Mean</i>) untuk hari 0 s/d 46, dengan simbol segitiga hitam pada hari 1, 5, 10, 15, dan 20.
                </div>
              </div>
              <div className="flex items-start gap-2">
                <div className="h-2 w-4 bg-slate-400 mt-1.5 shrink-0 rounded-full" />
                <div>
                  <b className="text-slate-900 dark:text-slate-100">Garis Abu-abu</b>: Nilai analisis observasi 30 hari sebelumnya. Kotak abu-abu menandai titik 0, 5, 10, 15, 20, 25, dan 30 hari lalu.
                </div>
              </div>
              <div className="flex items-start gap-2">
                <div className="h-2 w-4 border border-dashed border-slate-400 mt-1.5 shrink-0" />
                <div>
                  <b className="text-slate-900 dark:text-slate-100">Lingkaran Pusat ($r = 1.0$)</b>: Batas ambang amplitudo. Titik di dalam lingkaran menandakan kondisi MJO lemah/inaktif, sedangkan titik di luar lingkaran menandakan fase MJO aktif.
                </div>
              </div>
            </div>
          </div>

          {/* Card 3: Regional Impact for Indonesia */}
          <div className="p-4 rounded-xl border border-emerald-200 dark:border-emerald-900/60 bg-emerald-50/40 dark:bg-emerald-950/20 space-y-3 md:col-span-2 lg:col-span-1">
            <div className="flex items-center gap-2 text-xs font-bold text-emerald-900 dark:text-emerald-200 uppercase tracking-wider">
              <Sparkles className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
              Signifikansi Fase bagi Indonesia
            </div>
            <div className="space-y-2 text-xs text-emerald-950 dark:text-emerald-200/90 leading-relaxed">
              <p>
                Pergerakan MJO normal berputar <b>berlawanan arah jarum jam</b> (*anti-clockwise*), bergerak ke timur dari Samudra Hindia melintasi wilayah Indonesia:
              </p>
              <ul className="list-disc list-inside space-y-1 pl-1">
                <li>
                  <b>Fase 2 &amp; 3 (Samudra Hindia)</b>: Gelombang konveksi mulai mendekati pesisir barat Sumatra.
                </li>
                <li>
                  <b className="text-red-600 dark:text-red-400">Fase 4 &amp; 5 (Benua Maritim / Indonesia)</b>: Pusat konveksi aktif berada di atas kepulauan Indonesia. Curah hujan meningkat drastis dengan potensi cuaca ekstrem di Jawa, Kebumen, Sumatra, dan Kalimantan.
                </li>
                <li>
                  <b>Fase 6 &amp; 7 (Pasifik Barat)</b>: Konveksi menjauh ke Pasifik barat; Indonesia memasuki fase penurunan hujan (supresi konvektif).
                </li>
              </ul>
            </div>
          </div>
        </div>
      </CardContent>

      {/* Fullscreen Zoom Dialog */}
      <Dialog open={isZoomOpen} onOpenChange={setIsZoomOpen}>
        <DialogContent className="max-w-6xl w-[96vw] max-h-[95vh] p-4 sm:p-6 overflow-y-auto flex flex-col gap-4">
          <DialogHeader className="border-b pb-3">
            <DialogTitle className="text-base sm:text-lg font-bold flex items-center justify-between pr-6">
              <span className="flex items-center gap-2">
                <Compass className="h-5 w-5 text-indigo-500" />
                ECMWF MJO Wheeler-Hendon Phase Diagram ({currentRunLabel})
              </span>
              <Badge variant="outline" className="text-xs font-mono">
                Sub-seasonal 46-Day Ensemble
              </Badge>
            </DialogTitle>
          </DialogHeader>

          {data?.imageUrl && (
            <div className="flex flex-col items-center justify-center p-2 bg-slate-950/5 dark:bg-slate-950 rounded-xl">
              <img
                src={data.imageUrl}
                alt="ECMWF MJO Ensemble Forecast Fullscreen"
                className="max-h-[78vh] w-auto object-contain rounded-lg shadow-md"
              />
            </div>
          )}

          <div className="flex flex-wrap items-center justify-between gap-3 pt-2 text-xs text-slate-500">
            <span>{data?.copyright} • Lisensi {data?.licence}</span>
            <div className="flex items-center gap-2">
              <Button size="sm" variant="outline" onClick={handleDownload} className="text-xs h-8">
                <Download className="h-3.5 w-3.5 mr-1.5" />
                Unduh Gambar
              </Button>
              <Button size="sm" onClick={() => setIsZoomOpen(false)} className="text-xs h-8">
                Tutup
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </Card>
  );
};
