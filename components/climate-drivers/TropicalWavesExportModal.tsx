// components/climate-drivers/TropicalWavesExportModal.tsx
"use client";

import React, { useState, useRef, useMemo, useEffect } from "react";
import html2canvas from "html2canvas-pro";
import { jsPDF } from "jspdf";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import {
  Printer,
  Download,
  FileText,
  Calendar,
  Waves,
  RefreshCw,
  Check,
  Compass,
  Layers,
  Info,
  AlertTriangle,
  Wind,
  CloudRain,
  Zap,
  Globe,
  ShieldCheck,
  X,
  FileCheck2,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { formatIdDateDash, formatDateTimeForDisplay } from "@/lib/weatherUtils";

interface WaveReportItem {
  id: "mjo" | "kelvin" | "eq_rossby" | "gravity";
  order: number;
  name: string;
  fullName: string;
  propagation: "Ke Timur (Eastward)" | "Ke Barat (Westward)";
  speed: string;
  period: string;
  scale: string;
  symmetry: string;
  accentColor: string;
  headerBg: string;
  badgeBg: string;
  badgeBorder: string;
  physicalDynamics: string;
  indonesiaImpact: string;
  mathematicalBasis: string;
}

const REPORT_WAVES: WaveReportItem[] = [
  {
    id: "mjo",
    order: 1,
    name: "Madden-Julian Oscillation (MJO)",
    fullName: "Madden-Julian Oscillation (MJO) - Gelombang Konvektif Intramusiman",
    propagation: "Ke Timur (Eastward)",
    speed: "~5 m/s (~18 km/jam)",
    period: "30 – 60 Hari (Intraseasonal)",
    scale: "Skala Planet (Wavenumber Zonal 1–2)",
    symmetry: "Simetris di Ekuator",
    accentColor: "#059669", // emerald-600
    headerBg: "bg-emerald-50 dark:bg-emerald-950/40 border-emerald-200 dark:border-emerald-900/60",
    badgeBg: "bg-emerald-100 text-emerald-800 border-emerald-300",
    badgeBorder: "border-emerald-400",
    physicalDynamics:
      "Fluktuasi atmosferik konvektif skala planet terbesar di lintang rendah. Menjalar perlahan melintasi ekuator dengan anomali divergensi pada paras atas (200 hPa) serta anomali konvergensi pada paras bawah (850 hPa) yang terkopel dengan dinamika sirkulasi Walker.",
    indonesiaImpact:
      "Fase 4 dan 5 menandai pusat konveksi aktif berada tepat di atas Benua Maritim Indonesia. Menstimulasi pembentukan awan cumulonimbus secara masif, melipatgandakan intensitas curah hujan harian, dan menjadi pemicu utama banjir monsunal di kepulauan Nusantara.",
    mathematicalBasis: "Mode intraseasonal konvektif terkopel Matsuno-Gill (1966/1980).",
  },
  {
    id: "kelvin",
    order: 2,
    name: "Convectively Coupled Kelvin Wave (KW)",
    fullName: "Convectively Coupled Kelvin Wave (KW) - Gelombang Gravitasi Ekuatorial",
    propagation: "Ke Timur (Eastward)",
    speed: "12 – 25 m/s (~1000–2000 km/hari, 2–3x lebih cepat dari MJO)",
    period: "3 – 7 Hari (Sinoptik Tropis)",
    scale: "Skala Sinoptik Ekuatorial",
    symmetry: "Simetris Sempurna Ekuator (v = 0)",
    accentColor: "#2563eb", // blue-600
    headerBg: "bg-blue-50 dark:bg-blue-950/40 border-blue-200 dark:border-blue-900/60",
    badgeBg: "bg-blue-100 text-blue-800 border-blue-300",
    badgeBorder: "border-blue-400",
    physicalDynamics:
      "Gelombang gravitasi inersia yang terperangkap di ekuator (Matsuno mode n = -1). Memiliki komponen kecepatan angin meridional nol (v = 0). Daerah konveksi tebal dan curah hujan lebat terbentuk di sisi barat anomali tekanan rendah (L) akibat konvergensi angin zonal.",
    indonesiaImpact:
      "Memicu peningkatan mendadak tutupan awan hujan dan petir selama 2 hingga 4 hari beruntun saat melintasi wilayah barat menuju timur Indonesia. Superposisi konstruktif bersamaan dengan MJO fase 4/5 memicu anomali cuaca sangat ekstrem.",
    mathematicalBasis: "Solusi analitis shallow water: u(y) = u₀ exp(-βy²/2c), v = 0.",
  },
  {
    id: "eq_rossby",
    order: 3,
    name: "Equatorial Rossby Wave (ER)",
    fullName: "Equatorial Rossby Wave (ER) - Gelombang Rossby Ekuatorial Simetris",
    propagation: "Ke Barat (Westward)",
    speed: "4 – 7 m/s",
    period: "10 – 30 Hari (Quasi-Biweekly)",
    scale: "Skala Sinoptik-Submusiman",
    symmetry: "Simetris Ekuator (~10° LU & 10° LS)",
    accentColor: "#d97706", // amber-600
    headerBg: "bg-amber-50 dark:bg-amber-950/40 border-amber-200 dark:border-amber-900/60",
    badgeBg: "bg-amber-100 text-amber-800 border-amber-300",
    badgeBorder: "border-amber-400",
    physicalDynamics:
      "Solusi gelombang vortisitas ekuatorial mode n = 1. Dicirikan oleh sepasang pusaran siklonik kembar (twin cyclonic vortices) yang berpusat di lintang 10° LU dan 10° LS, disertai anomali hembusan angin barat kencang (westerly wind burst) di garis ekuator.",
    indonesiaImpact:
      "Prekursor paling dominan dalam pembentukan bibit siklon tropis kembar (twin tropical cyclogenesis) di Samudra Hindia barat Sumatra, perairan selatan Jawa hingga Nusa Tenggara, dan Samudra Pasifik utara Papua.",
    mathematicalBasis: "Dispersi mode n = 1: ω = -βk / (k² + 3β/c). Penjalaran murni ke barat.",
  },
  {
    id: "gravity",
    order: 4,
    name: "Mixed Rossby-Gravity Wave (MRG / Yanai)",
    fullName: "Mixed Rossby-Gravity Wave (MRG) - Gelombang Yanai Antisimetris",
    propagation: "Ke Barat (Westward)",
    speed: "10 – 15 m/s",
    period: "4 – 8 Hari",
    scale: "Skala Sinoptik Tropis",
    symmetry: "Antisimetris Ekuator (Cross-Equatorial)",
    accentColor: "#e11d48", // rose-600
    headerBg: "bg-rose-50 dark:bg-rose-950/40 border-rose-200 dark:border-rose-900/60",
    badgeBg: "bg-rose-100 text-rose-800 border-rose-300",
    badgeBorder: "border-rose-400",
    physicalDynamics:
      "Gelombang transisi Rossby-Gravitasi mode n = 0. Menghasilkan struktur anomali tekanan berlawanan tanda antar Belahan Bumi Utara dan Selatan, memicu aliran angin lintas ekuator (cross-equatorial flow) yang kuat dan berfluktuasi cepat.",
    indonesiaImpact:
      "Menyebabkan seruakan massa udara lembap lintas khatulistiwa yang memperkuat konveksi lokal dan membentuk gugus badai petir berskala mesoskala (MCC) yang bergerak cepat melintasi selat dan daratan pulau-pulau besar Indonesia.",
    mathematicalBasis: "Dispersi mode n = 0: k/ω - ω/c = β/ω. Hibrida gravitasi dan Rossby.",
  },
];

interface TropicalWavesExportModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  dates: string[];
  currentDate: string;
  todayStr: string;
  mjoStatus?: {
    status?: string;
    phase?: number;
    amplitude?: number;
    convectionOverMC?: string;
    lastUpdated?: string;
  };
}

export const TropicalWavesExportModal: React.FC<TropicalWavesExportModalProps> = ({
  open,
  onOpenChange,
  dates,
  currentDate,
  todayStr,
  mjoStatus,
}) => {
  const { toast } = useToast();
  const [selectedDate, setSelectedDate] = useState<string>(currentDate || todayStr);
  const [isExporting, setIsExporting] = useState<"png" | "pdf" | "print" | null>(null);
  const [includeNotes, setIncludeNotes] = useState<boolean>(true);
  const [notesText, setNotesText] = useState<string>(
    "Analisis Superposisi Gelombang Ekuatorial: Pola anomali Outgoing Longwave Radiation (OLR) terpantau aktif. Rekomendasi kesiapsiagaan peningkatan intensitas hujan, petir, dan potensi genangan di wilayah rentan."
  );

  // Sync selectedDate with currentDate if modal is opened with new prop
  useEffect(() => {
    if (currentDate) {
      setSelectedDate(currentDate);
    }
  }, [currentDate]);

  const cleanDate = selectedDate.replace(/-/g, "");

  const dateCategory = useMemo(() => {
    if (selectedDate === todayStr) {
      return {
        label: "Analisis Observasi Hari Ini (Terkini)",
        color: "text-emerald-700 bg-emerald-100 border-emerald-300",
      };
    }
    if (selectedDate > todayStr) {
      const diffTime = Math.abs(new Date(selectedDate).getTime() - new Date(todayStr).getTime());
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      return {
        label: `Proyeksi Prediksi Numerik (+${diffDays} Hari)`,
        color: "text-amber-800 bg-amber-100 border-amber-300",
      };
    }
    const diffTime = Math.abs(new Date(todayStr).getTime() - new Date(selectedDate).getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return {
      label: `Arsip Analisis Historis (${diffDays} Hari Lalu)`,
      color: "text-blue-800 bg-blue-100 border-blue-300",
    };
  }, [selectedDate, todayStr]);

  const analysisDates = useMemo(() => dates.filter((d) => d <= todayStr), [dates, todayStr]);
  const forecastDates = useMemo(() => dates.filter((d) => d > todayStr), [dates, todayStr]);

  const continuousSheetRef = useRef<HTMLDivElement>(null);
  const page1Ref = useRef<HTMLDivElement>(null);
  const page2Ref = useRef<HTMLDivElement>(null);

  // Helper: wait for all images inside container to finish loading
  const waitForImagesToLoad = async (container: HTMLElement): Promise<void> => {
    const images = Array.from(container.querySelectorAll("img"));
    const promises = images.map((img) => {
      if (img.complete && img.naturalWidth > 0) return Promise.resolve();
      return new Promise<void>((resolve) => {
        img.onload = () => resolve();
        img.onerror = () => resolve(); // don't hang if an image errors
      });
    });
    await Promise.all(promises);
  };

  // 1. Ekspor ke PNG (Continuous 4-Wave Vertical Composite)
  const handleExportPNG = async () => {
    if (!continuousSheetRef.current) return;
    setIsExporting("png");

    try {
      toast({
        title: "Menyiapkan Gambar PNG...",
        description: "Merender komposit 4 gelombang bertumpuk resolusi tinggi...",
      });

      await waitForImagesToLoad(continuousSheetRef.current);
      await new Promise((resolve) => setTimeout(resolve, 350));

      const canvas = await html2canvas(continuousSheetRef.current, {
        scale: 2.2, // High DPI retina
        useCORS: true,
        backgroundColor: "#ffffff",
        logging: false,
        width: 1000,
        windowWidth: 1200,
      });

      const dataUrl = canvas.toDataURL("image/png");
      const link = document.createElement("a");
      const filename = `Laporan_Dinamika_Tropis_4Gelombang_${cleanDate}.png`;
      link.href = dataUrl;
      link.download = filename;
      link.click();

      toast({
        title: "✓ Berhasil Menyimpan Gambar Laporan!",
        description: `Berkas ${filename} telah diunduh.`,
      });
    } catch (err: any) {
      console.error("Gagal ekspor PNG:", err);
      toast({
        title: "Gagal Mengunduh PNG Laporan",
        description: err?.message || "Terjadi kesalahan saat merender kanvas.",
        variant: "destructive",
      });
    } finally {
      setIsExporting(null);
    }
  };

  // 2. Ekspor ke PDF (A4 Multi-page: Page 1 for Wave 1 & 2, Page 2 for Wave 3 & 4 + Notes)
  const handleExportPDF = async () => {
    if (!page1Ref.current || !page2Ref.current) return;
    setIsExporting("pdf");

    try {
      toast({
        title: "Menyiapkan Dokumen PDF Laporan...",
        description: "Menghasilkan lembar A4 proporsional dengan kop resmi dan tata letak rapi...",
      });

      await waitForImagesToLoad(page1Ref.current);
      await waitForImagesToLoad(page2Ref.current);
      await new Promise((resolve) => setTimeout(resolve, 350));

      // Render Page 1 (Waves 1 & 2)
      const canvas1 = await html2canvas(page1Ref.current, {
        scale: 2,
        useCORS: true,
        backgroundColor: "#ffffff",
        logging: false,
        width: 1000,
        windowWidth: 1200,
      });

      // Render Page 2 (Waves 3 & 4 + Notes + Footer)
      const canvas2 = await html2canvas(page2Ref.current, {
        scale: 2,
        useCORS: true,
        backgroundColor: "#ffffff",
        logging: false,
        width: 1000,
        windowWidth: 1200,
      });

      const doc = new jsPDF({
        orientation: "portrait",
        unit: "mm",
        format: "a4",
      });

      const a4Width = 210;
      const a4Height = 297;

      // Add Page 1
      const imgData1 = canvas1.toDataURL("image/jpeg", 0.98);
      doc.addImage(imgData1, "JPEG", 0, 0, a4Width, a4Height);

      // Add Page 2
      doc.addPage();
      const imgData2 = canvas2.toDataURL("image/jpeg", 0.98);
      doc.addImage(imgData2, "JPEG", 0, 0, a4Width, a4Height);

      const filename = `Laporan_Dinamika_Tropis_4Gelombang_${cleanDate}.pdf`;
      doc.save(filename);

      toast({
        title: "✓ Berhasil Menyimpan Dokumen Laporan PDF!",
        description: `Dokumen ${filename} (2 Halaman A4) telah tersimpan.`,
      });
    } catch (err: any) {
      console.error("Gagal ekspor PDF:", err);
      toast({
        title: "Gagal Mengunduh PDF",
        description: err?.message || "Terjadi kesalahan saat mengonversi dokumen.",
        variant: "destructive",
      });
    } finally {
      setIsExporting(null);
    }
  };

  // 3. Cetak Langsung (Direct Print Dialog via Browser)
  const handlePrint = () => {
    setIsExporting("print");
    toast({
      title: "Membuka Dialog Cetak...",
      description: "Menyiapkan tata letak cetak dokumen...",
    });

    setTimeout(() => {
      window.print();
      setIsExporting(null);
    }, 400);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-5xl w-[96vw] max-h-[94vh] p-0 overflow-hidden flex flex-col bg-slate-100 dark:bg-slate-900 border-none shadow-2xl">
        {/* Modal Header */}
        <DialogHeader className="p-4 bg-white dark:bg-slate-950 border-b dark:border-slate-800 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 shrink-0">
          <div className="space-y-0.5">
            <div className="flex items-center gap-2">
              <Badge variant="outline" className="bg-indigo-50 text-indigo-700 dark:bg-indigo-950/60 dark:text-indigo-300 border-indigo-200 text-[10px] font-bold">
                Versi Cetak &amp; Simpan Dokumen
              </Badge>
              <Badge variant="outline" className="bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300 border-emerald-200 text-[10px] font-bold">
                4 Gelombang Bertumpuk
              </Badge>
            </div>
            <DialogTitle className="text-lg sm:text-xl font-extrabold flex items-center gap-2 text-slate-900 dark:text-slate-100">
              <FileCheck2 className="h-5 w-5 text-indigo-600 dark:text-indigo-400" />
              <span>Laporan Dinamika Gelombang Atmosfer Tropis</span>
            </DialogTitle>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Dokumen komprehensif 4 gelombang khatulistiwa ekuatorial (MJO, Kelvin, Rossby, &amp; MRG) dengan peta anomali OLR dan penjelasan fisis meteorologis.
            </p>
          </div>

          {/* Action Export Buttons */}
          <div className="flex items-center gap-2 flex-wrap shrink-0">
            <Button
              variant="outline"
              size="sm"
              onClick={handlePrint}
              disabled={isExporting !== null}
              className="h-8 gap-1.5 text-xs font-bold text-slate-700 dark:text-slate-200 bg-white dark:bg-slate-800 hover:bg-slate-100 border-slate-300 dark:border-slate-700 shadow-sm"
              title="Cetak langsung menggunakan printer atau print-to-PDF browser"
            >
              <Printer className="h-3.5 w-3.5 text-indigo-500" />
              <span>Cetak</span>
            </Button>

            <Button
              variant="outline"
              size="sm"
              onClick={handleExportPDF}
              disabled={isExporting !== null}
              className="h-8 gap-1.5 text-xs font-bold text-slate-700 dark:text-slate-200 bg-white dark:bg-slate-800 hover:bg-slate-100 border-slate-300 dark:border-slate-700 shadow-sm"
              title="Simpan sebagai dokumen PDF 2 halaman A4 siap cetak"
            >
              {isExporting === "pdf" ? (
                <RefreshCw className="h-3.5 w-3.5 animate-spin text-rose-500" />
              ) : (
                <FileText className="h-3.5 w-3.5 text-rose-500" />
              )}
              <span>Simpan PDF</span>
            </Button>

            <Button
              size="sm"
              onClick={handleExportPNG}
              disabled={isExporting !== null}
              className="h-8 gap-1.5 text-xs font-bold bg-indigo-600 hover:bg-indigo-700 text-white shadow-sm"
              title="Simpan sebagai gambar PNG resolusi tinggi komposit 4 gelombang bertumpuk"
            >
              {isExporting === "png" ? (
                <RefreshCw className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <Download className="h-3.5 w-3.5" />
              )}
              <span>Simpan PNG</span>
            </Button>
          </div>
        </DialogHeader>

        {/* Modal Controls Toolbar (Date & Notes) */}
        <div className="p-3 bg-slate-50 dark:bg-slate-900 border-b dark:border-slate-800 flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3 shrink-0">
          {/* Date Selector */}
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-xs font-bold text-slate-600 dark:text-slate-300 flex items-center gap-1.5">
              <Calendar className="h-4 w-4 text-emerald-500" />
              <span>Pilih Tanggal Data:</span>
            </span>
            <select
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-100 text-xs font-bold font-mono px-3 py-1.5 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 shadow-sm"
            >
              {analysisDates.length > 0 && (
                <optgroup label="Analisis & Observasi (Historis & Hari Ini)">
                  {analysisDates.map((d) => (
                    <option key={d} value={d}>
                      {d} {d === todayStr ? "(Hari Ini - Terkini)" : "(Observasi)"}
                    </option>
                  ))}
                </optgroup>
              )}
              {forecastDates.length > 0 && (
                <optgroup label="Prediksi Numerik Model (Forecast)">
                  {forecastDates.map((d, fIdx) => (
                    <option key={d} value={d}>
                      {d} (Prediksi +{fIdx + 1} Hari)
                    </option>
                  ))}
                </optgroup>
              )}
            </select>

            <span className={`text-[11px] font-bold px-2.5 py-1 rounded-md border ${dateCategory.color}`}>
              {dateCategory.label}
            </span>
          </div>

          {/* Quick Notes Toggle */}
          <div className="flex items-center gap-2">
            <label className="text-xs font-medium text-slate-600 dark:text-slate-300 flex items-center gap-1.5 cursor-pointer">
              <input
                type="checkbox"
                checked={includeNotes}
                onChange={(e) => setIncludeNotes(e.target.checked)}
                className="rounded text-indigo-600 focus:ring-indigo-500 h-3.5 w-3.5 cursor-pointer"
              />
              <span>Sertakan Catatan Analisis Prakirawan</span>
            </label>
          </div>
        </div>

        {/* Forecaster Notes Editor (if enabled) */}
        {includeNotes && (
          <div className="px-4 py-2 bg-indigo-50/50 dark:bg-indigo-950/20 border-b dark:border-slate-800 shrink-0">
            <div className="flex items-center justify-between mb-1">
              <span className="text-[11px] font-bold text-indigo-900 dark:text-indigo-200 uppercase tracking-wider flex items-center gap-1">
                <Info className="h-3 w-3 text-indigo-500" />
                <span>Isi Catatan Analisis Sinoptik / Rekomendasi (Dapat Diedit Langsung):</span>
              </span>
            </div>
            <Textarea
              value={notesText}
              onChange={(e) => setNotesText(e.target.value)}
              placeholder="Tuliskan catatan analisis tambahan dari prakirawan cuaca di sini..."
              rows={2}
              className="text-xs bg-white dark:bg-slate-950 border-indigo-200 dark:border-indigo-900/60 resize-none font-sans"
            />
          </div>
        )}

        {/* Live Document Preview Container (Scrollable) */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 bg-slate-200/60 dark:bg-slate-950/60 flex flex-col items-center gap-6">
          <div className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 bg-white/80 dark:bg-slate-900/80 px-3 py-1 rounded-full border border-slate-300/80 dark:border-slate-700/80 shadow-xs">
            Pratinjau Lembar Laporan Cetak (4 Gelombang Bertumpuk Atas sampai Bawah)
          </div>

          {/* =================================================================== */}
          {/* CONTINUOUS 4-WAVE STACK SHEET (Used for Continuous PNG & Preview)   */}
          {/* =================================================================== */}
          <div
            ref={continuousSheetRef}
            id="tropical-waves-report-continuous"
            className="w-full max-w-[900px] bg-white text-slate-900 shadow-xl rounded-xl border border-slate-300/80 p-8 space-y-6 print:shadow-none print:border-none print:p-0 print:max-w-none print:w-full"
            style={{ fontFamily: "'Inter', sans-serif" }}
          >
            {/* Header Instansi & Dokumen (Standar Laporan Cuaca Jerukagung Meteorologi) */}
            <header className="border-b-4 border-slate-800 pb-5 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
              <div className="flex items-center gap-4">
                <img
                  src="/img/logo.webp"
                  alt="Logo Jerukagung Seismologi & Meteorologi"
                  className="h-16 w-16 object-contain shrink-0"
                  crossOrigin="anonymous"
                />
                <div>
                  <div className="text-[11px] font-black tracking-[0.2em] text-slate-500 uppercase leading-none">
                    Jerukagung Meteorologi • Automatic Weather Station
                  </div>
                  <h1 className="text-2xl sm:text-3xl font-black uppercase tracking-tight text-slate-900 mt-1.5 leading-none">
                    Laporan Dinamika Gelombang Atmosfer Tropis
                  </h1>
                  <p className="text-xs font-semibold text-slate-600 mt-1.5 flex flex-wrap items-center gap-2">
                    <span className="text-slate-700">Domain: Benua Maritim Indonesia (20° LU – 20° LS)</span>
                    <span className="text-slate-300">•</span>
                    <span className="text-slate-500">Analisis Operasional 4 Gelombang Ekuatorial (MJO, Kelvin, ER, MRG)</span>
                  </p>
                </div>
              </div>

              {/* Document Meta Pill */}
              <div className="text-left sm:text-right text-xs space-y-1 shrink-0 bg-slate-50 border border-slate-200 p-3 rounded-xl min-w-[210px] shadow-xs">
                <div>
                  <span className="text-[10px] text-slate-400 uppercase font-bold block">Tanggal Data:</span>
                  <span className="font-mono font-black text-slate-900 text-sm">
                    {formatIdDateDash(selectedDate)}
                  </span>
                </div>
                <div className="text-[10px] text-slate-600 font-medium">
                  Status: <strong className="text-indigo-700">{dateCategory.label}</strong>
                </div>
                <div className="text-[10px] text-slate-400">
                  Dicetak: <span className="font-mono text-slate-600">{formatDateTimeForDisplay(new Date())}</span>
                </div>
              </div>
            </header>

            {/* Decorative Color Bar matching Laporan Harian */}
            <div className="w-full h-1 bg-gradient-to-r from-orange-400 via-sky-400 to-blue-500 rounded-full" />

            {/* Quick Meteorological Drivers Summary (MJO Status) */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 bg-slate-50 border border-slate-200 p-3 rounded-lg text-xs">
              <div>
                <span className="text-[10px] font-bold text-slate-400 uppercase block">Status MJO:</span>
                <span className="font-extrabold text-emerald-700 text-sm">
                  {mjoStatus?.status || "Active (Aktif)"}
                </span>
              </div>
              <div>
                <span className="text-[10px] font-bold text-slate-400 uppercase block">Fase RMM Berjalan:</span>
                <span className="font-extrabold text-indigo-700 text-sm">
                  Fase {mjoStatus?.phase ?? 4}
                </span>
              </div>
              <div>
                <span className="text-[10px] font-bold text-slate-400 uppercase block">Amplitudo RMM:</span>
                <span className="font-extrabold text-teal-700 text-sm font-mono">
                  {(mjoStatus?.amplitude ?? 1.25).toFixed(2)} (&ge; 1.0 Signifikan)
                </span>
              </div>
              <div>
                <span className="text-[10px] font-bold text-slate-400 uppercase block">Konveksi Benua Maritim:</span>
                <span className="font-extrabold text-emerald-700 text-sm">
                  {mjoStatus?.convectionOverMC || "Enhanced (Meningkat)"}
                </span>
              </div>
            </div>

            {/* THE 4 STACKED WAVES (Vertical from Top to Bottom) */}
            <div className="space-y-6">
              {REPORT_WAVES.map((w) => {
                const imgProxyUrl = `/api/climate-drivers/tropical-waves?wave=${w.id}&date=${cleanDate}`;

                return (
                  <div
                    key={w.id}
                    className="border-2 border-slate-300 rounded-xl overflow-hidden bg-white shadow-xs break-inside-avoid print:break-inside-avoid"
                  >
                    {/* Wave Header Banner */}
                    <div className="px-3.5 py-2.5 bg-slate-100 border-b border-slate-300 flex flex-wrap items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <span
                          className="w-6 h-6 rounded-full text-white flex items-center justify-center font-black text-xs shrink-0"
                          style={{ backgroundColor: w.accentColor }}
                        >
                          {w.order}
                        </span>
                        <h2 className="font-extrabold text-sm sm:text-base text-slate-900 tracking-tight">
                          {w.fullName}
                        </h2>
                      </div>

                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className={`text-[10px] font-extrabold px-2 py-0.5 rounded border ${w.badgeBg}`}>
                          {w.propagation}
                        </span>
                        <span className="text-[10px] font-semibold text-slate-600 bg-white px-2 py-0.5 rounded border border-slate-200">
                          Kecepatan: {w.speed}
                        </span>
                        <span className="text-[10px] font-semibold text-slate-600 bg-white px-2 py-0.5 rounded border border-slate-200">
                          Periode: {w.period}
                        </span>
                      </div>
                    </div>

                    {/* Map Image Section */}
                    <div className="p-2.5 bg-slate-950 flex flex-col items-center justify-center min-h-[170px]">
                      <img
                        src={imgProxyUrl}
                        alt={`${w.name} - ${selectedDate}`}
                        crossOrigin="anonymous"
                        className="w-full max-w-[850px] object-contain rounded"
                        loading="eager"
                      />
                    </div>

                    {/* Explanatory Caption Panels (Keterangan Masing-masing Gelombang) */}
                    <div className="p-3.5 grid grid-cols-1 md:grid-cols-2 gap-3 text-xs bg-slate-50/70 border-t border-slate-200">
                      {/* Left: Dinamika Fisis & Teori */}
                      <div className="space-y-1 bg-white p-2.5 rounded-lg border border-slate-200/80">
                        <div className="font-bold text-slate-900 flex items-center gap-1.5 text-[11px]">
                          <Info className="h-3.5 w-3.5 text-indigo-600" />
                          <span>Karakteristik &amp; Solusi Dinamika Fisis:</span>
                        </div>
                        <p className="text-[11px] text-slate-600 leading-relaxed">
                          {w.physicalDynamics}
                        </p>
                        <div className="text-[10px] font-mono text-indigo-700 pt-0.5">
                          Dasar Teori: {w.mathematicalBasis}
                        </div>
                      </div>

                      {/* Right: Dampak Cuaca Indonesia */}
                      <div className="space-y-1 bg-amber-50/60 p-2.5 rounded-lg border border-amber-200">
                        <div className="font-bold text-amber-900 flex items-center gap-1.5 text-[11px]">
                          <AlertTriangle className="h-3.5 w-3.5 text-amber-600" />
                          <span>Dampak Sinoptik terhadap Cuaca Indonesia:</span>
                        </div>
                        <p className="text-[11px] text-amber-900 leading-relaxed font-medium">
                          {w.indonesiaImpact}
                        </p>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Forecaster Notes (if included) */}
            {includeNotes && notesText.trim() && (
              <div className="border border-indigo-200 bg-indigo-50/60 p-3.5 rounded-xl space-y-1 break-inside-avoid print:break-inside-avoid">
                <div className="font-bold text-indigo-900 text-xs flex items-center gap-1.5 uppercase tracking-wide">
                  <ShieldCheck className="h-4 w-4 text-indigo-600" />
                  <span>Catatan Analisis &amp; Rekomendasi Prakirawan Cuaca:</span>
                </div>
                <p className="text-xs text-indigo-950 leading-relaxed whitespace-pre-line font-medium">
                  {notesText}
                </p>
              </div>
            )}

            {/* OLR Contour & Color Legend Guide */}
            <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl text-[10px] text-slate-600 space-y-1 break-inside-avoid print:break-inside-avoid">
              <span className="font-bold text-slate-800 uppercase block">Panduan Interpretasi Kontur Anomali OLR Satelit:</span>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-[10px] leading-relaxed">
                <div className="flex items-start gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 shrink-0 mt-0.5" />
                  <span>
                    <strong>Kontur Hijau / Biru (Anomali Negatif):</strong> Menunjukkan konveksi aktif, tutupan awan tebal, dan potensi peningkatan curah hujan di atas normal.
                  </span>
                </div>
                <div className="flex items-start gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-amber-500 shrink-0 mt-0.5" />
                  <span>
                    <strong>Kontur Kuning / Cokelat (Anomali Positif):</strong> Menunjukkan konveksi tertekan (supresi awan), subsidensi massa udara kering, dan penurunan curah hujan.
                  </span>
                </div>
              </div>
            </div>

            {/* Official Report Footer (Standar Laporan Cuaca MeteoSense) */}
            <footer className="mt-8 border-t-2 border-slate-200 pt-5 text-center shrink-0 break-inside-avoid print:break-inside-avoid">
              <div className="flex flex-col sm:flex-row justify-between items-center text-xs text-slate-500 gap-2">
                <span>
                  Sumber Data: BoM Australia IDCK000080, NOAA CPC &amp; NCICS • Dihasilkan otomatis oleh sistem <strong className="text-slate-800">MeteoSense Dashboard</strong> (Stasiun Meteorologi Jerukagung)
                </span>
                <span className="font-mono text-slate-400">
                  Waktu Cetak: {formatDateTimeForDisplay(new Date())}
                </span>
              </div>
              <p className="text-slate-400 text-[11px] mt-1.5">
                Dokumen resmi analisis dinamika atmosfer tropis. Tanda tangan digital tidak diperlukan, validitas data dijamin oleh sistem.
              </p>
            </footer>
          </div>

          {/* =================================================================== */}
          {/* A4 TWO-PAGE TEMPLATES (Hidden in DOM, used for clean jsPDF Export)   */}
          {/* =================================================================== */}
          <div className="hidden">
            {/* PAGE 1: Header + Summary + Wave 1 (MJO) + Wave 2 (KW) */}
            <div
              ref={page1Ref}
              id="report-page-1"
              className="w-[1000px] h-[1414px] bg-white text-slate-900 p-10 flex flex-col justify-between"
              style={{ boxSizing: "border-box", fontFamily: "'Inter', sans-serif" }}
            >
              <div className="space-y-5">
                {/* Header Page 1 (Formal Official Kop Standar Laporan Cuaca) */}
                <div className="border-b-4 border-slate-800 pb-4 flex justify-between items-center">
                  <div className="flex items-center gap-4">
                    <img
                      src="/img/logo.webp"
                      alt="Logo Jerukagung Seismologi & Meteorologi"
                      className="h-14 w-14 object-contain shrink-0"
                      crossOrigin="anonymous"
                    />
                    <div>
                      <div className="text-[10px] font-black tracking-[0.2em] text-slate-500 uppercase leading-none">
                        Jerukagung Meteorologi • Automatic Weather Station
                      </div>
                      <h1 className="text-xl font-black uppercase text-slate-950 tracking-tight mt-1 leading-none">
                        Laporan Dinamika Gelombang Atmosfer Tropis
                      </h1>
                      <p className="text-[11px] font-semibold text-slate-600 mt-1">
                        Halaman 1 dari 2: Gelombang Intramusiman (MJO) &amp; Gelombang Kelvin (KW)
                      </p>
                    </div>
                  </div>
                  <div className="text-right text-xs bg-slate-50 border border-slate-200 p-2.5 rounded-lg min-w-[180px]">
                    <div className="text-[9px] text-slate-400 uppercase font-bold">Tanggal Data:</div>
                    <div className="font-mono font-bold text-sm text-slate-900">{formatIdDateDash(selectedDate)}</div>
                    <div className="text-[10px] text-indigo-700 font-semibold">{dateCategory.label}</div>
                  </div>
                </div>

                <div className="w-full h-1 bg-gradient-to-r from-orange-400 via-sky-400 to-blue-500 rounded-full" />

                {/* Quick Summary Pill */}
                <div className="grid grid-cols-4 gap-2 bg-slate-50 border border-slate-200 p-2.5 rounded text-xs">
                  <div>
                    <span className="text-[9px] font-bold text-slate-400 uppercase block">Status MJO:</span>
                    <span className="font-bold text-emerald-700 text-xs">{mjoStatus?.status || "Active (Aktif)"}</span>
                  </div>
                  <div>
                    <span className="text-[9px] font-bold text-slate-400 uppercase block">Fase RMM:</span>
                    <span className="font-bold text-indigo-700 text-xs">Fase {mjoStatus?.phase ?? 4}</span>
                  </div>
                  <div>
                    <span className="text-[9px] font-bold text-slate-400 uppercase block">Amplitudo RMM:</span>
                    <span className="font-bold text-teal-700 text-xs font-mono">{(mjoStatus?.amplitude ?? 1.25).toFixed(2)}</span>
                  </div>
                  <div>
                    <span className="text-[9px] font-bold text-slate-400 uppercase block">Konveksi Indonesia:</span>
                    <span className="font-bold text-emerald-700 text-xs">{mjoStatus?.convectionOverMC || "Enhanced (Meningkat)"}</span>
                  </div>
                </div>

                {/* Wave 1: MJO */}
                {REPORT_WAVES.slice(0, 1).map((w) => (
                  <div key={w.id} className="border border-slate-300 rounded-lg overflow-hidden bg-white">
                    <div className="px-3 py-2 bg-slate-100 border-b border-slate-300 flex justify-between items-center">
                      <span className="font-extrabold text-sm text-slate-900">{w.order}. {w.fullName}</span>
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded border ${w.badgeBg}`}>{w.propagation} • {w.speed} • {w.period}</span>
                    </div>
                    <div className="p-2 bg-slate-950 flex justify-center">
                      <img src={`/api/climate-drivers/tropical-waves?wave=${w.id}&date=${cleanDate}`} crossOrigin="anonymous" className="max-h-[220px] object-contain rounded" />
                    </div>
                    <div className="p-3 grid grid-cols-2 gap-3 text-xs bg-slate-50 border-t border-slate-200">
                      <div>
                        <strong className="text-slate-900 block text-[11px] mb-0.5">Dinamika Fisis:</strong>
                        <p className="text-[10px] text-slate-600 leading-tight">{w.physicalDynamics}</p>
                      </div>
                      <div className="bg-amber-50/70 p-2 rounded border border-amber-200">
                        <strong className="text-amber-900 block text-[11px] mb-0.5">Dampak Cuaca Indonesia:</strong>
                        <p className="text-[10px] text-amber-900 leading-tight font-medium">{w.indonesiaImpact}</p>
                      </div>
                    </div>
                  </div>
                ))}

                {/* Wave 2: Kelvin */}
                {REPORT_WAVES.slice(1, 2).map((w) => (
                  <div key={w.id} className="border border-slate-300 rounded-lg overflow-hidden bg-white">
                    <div className="px-3 py-2 bg-slate-100 border-b border-slate-300 flex justify-between items-center">
                      <span className="font-extrabold text-sm text-slate-900">{w.order}. {w.fullName}</span>
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded border ${w.badgeBg}`}>{w.propagation} • {w.speed} • {w.period}</span>
                    </div>
                    <div className="p-2 bg-slate-950 flex justify-center">
                      <img src={`/api/climate-drivers/tropical-waves?wave=${w.id}&date=${cleanDate}`} crossOrigin="anonymous" className="max-h-[220px] object-contain rounded" />
                    </div>
                    <div className="p-3 grid grid-cols-2 gap-3 text-xs bg-slate-50 border-t border-slate-200">
                      <div>
                        <strong className="text-slate-900 block text-[11px] mb-0.5">Dinamika Fisis:</strong>
                        <p className="text-[10px] text-slate-600 leading-tight">{w.physicalDynamics}</p>
                      </div>
                      <div className="bg-amber-50/70 p-2 rounded border border-amber-200">
                        <strong className="text-amber-900 block text-[11px] mb-0.5">Dampak Cuaca Indonesia:</strong>
                        <p className="text-[10px] text-amber-900 leading-tight font-medium">{w.indonesiaImpact}</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {/* Page 1 Footer */}
              <div className="border-t-2 border-slate-200 pt-3 flex justify-between text-[10px] text-slate-500">
                <span>Dokumen Resmi MeteoSense Dashboard • Stasiun Meteorologi Jerukagung • Bersambung ke Halaman 2</span>
                <span className="font-bold">Halaman 1 / 2</span>
              </div>
            </div>

            {/* PAGE 2: Header 2 + Wave 3 (ER) + Wave 4 (MRG) + Forecaster Notes + Footer */}
            <div
              ref={page2Ref}
              id="report-page-2"
              className="w-[1000px] h-[1414px] bg-white text-slate-900 p-10 flex flex-col justify-between"
              style={{ boxSizing: "border-box", fontFamily: "'Inter', sans-serif" }}
            >
              <div className="space-y-5">
                {/* Header Page 2 */}
                <div className="border-b-4 border-slate-800 pb-3 flex justify-between items-center">
                  <div className="flex items-center gap-3">
                    <img
                      src="/img/logo.webp"
                      alt="Logo Jerukagung Seismologi & Meteorologi"
                      className="h-11 w-11 object-contain shrink-0"
                      crossOrigin="anonymous"
                    />
                    <div>
                      <div className="text-[9px] font-black tracking-widest text-slate-400 uppercase leading-none">
                        Jerukagung Meteorologi • MeteoSense
                      </div>
                      <h2 className="text-base font-black uppercase text-slate-950 mt-1 leading-none">
                        Laporan Dinamika Gelombang Atmosfer Tropis (Lanjutan)
                      </h2>
                      <p className="text-[10px] font-semibold text-slate-600 mt-0.5">
                        Halaman 2 dari 2: Gelombang Rossby Ekuatorial (ER) &amp; Mixed Rossby-Gravity (MRG)
                      </p>
                    </div>
                  </div>
                  <div className="text-right text-xs">
                    <span className="font-mono font-bold text-sm text-slate-900">{formatIdDateDash(selectedDate)}</span>
                  </div>
                </div>

                <div className="w-full h-0.5 bg-gradient-to-r from-orange-400 via-sky-400 to-blue-500 rounded-full" />

                {/* Wave 3: ER */}
                {REPORT_WAVES.slice(2, 3).map((w) => (
                  <div key={w.id} className="border border-slate-300 rounded-lg overflow-hidden bg-white">
                    <div className="px-3 py-2 bg-slate-100 border-b border-slate-300 flex justify-between items-center">
                      <span className="font-extrabold text-sm text-slate-900">{w.order}. {w.fullName}</span>
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded border ${w.badgeBg}`}>{w.propagation} • {w.speed} • {w.period}</span>
                    </div>
                    <div className="p-2 bg-slate-950 flex justify-center">
                      <img src={`/api/climate-drivers/tropical-waves?wave=${w.id}&date=${cleanDate}`} crossOrigin="anonymous" className="max-h-[220px] object-contain rounded" />
                    </div>
                    <div className="p-3 grid grid-cols-2 gap-3 text-xs bg-slate-50 border-t border-slate-200">
                      <div>
                        <strong className="text-slate-900 block text-[11px] mb-0.5">Dinamika Fisis:</strong>
                        <p className="text-[10px] text-slate-600 leading-tight">{w.physicalDynamics}</p>
                      </div>
                      <div className="bg-amber-50/70 p-2 rounded border border-amber-200">
                        <strong className="text-amber-900 block text-[11px] mb-0.5">Dampak Cuaca Indonesia:</strong>
                        <p className="text-[10px] text-amber-900 leading-tight font-medium">{w.indonesiaImpact}</p>
                      </div>
                    </div>
                  </div>
                ))}

                {/* Wave 4: MRG */}
                {REPORT_WAVES.slice(3, 4).map((w) => (
                  <div key={w.id} className="border border-slate-300 rounded-lg overflow-hidden bg-white">
                    <div className="px-3 py-2 bg-slate-100 border-b border-slate-300 flex justify-between items-center">
                      <span className="font-extrabold text-sm text-slate-900">{w.order}. {w.fullName}</span>
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded border ${w.badgeBg}`}>{w.propagation} • {w.speed} • {w.period}</span>
                    </div>
                    <div className="p-2 bg-slate-950 flex justify-center">
                      <img src={`/api/climate-drivers/tropical-waves?wave=${w.id}&date=${cleanDate}`} crossOrigin="anonymous" className="max-h-[220px] object-contain rounded" />
                    </div>
                    <div className="p-3 grid grid-cols-2 gap-3 text-xs bg-slate-50 border-t border-slate-200">
                      <div>
                        <strong className="text-slate-900 block text-[11px] mb-0.5">Dinamika Fisis:</strong>
                        <p className="text-[10px] text-slate-600 leading-tight">{w.physicalDynamics}</p>
                      </div>
                      <div className="bg-amber-50/70 p-2 rounded border border-amber-200">
                        <strong className="text-amber-900 block text-[11px] mb-0.5">Dampak Cuaca Indonesia:</strong>
                        <p className="text-[10px] text-amber-900 leading-tight font-medium">{w.indonesiaImpact}</p>
                      </div>
                    </div>
                  </div>
                ))}

                {/* Forecaster Notes */}
                {includeNotes && notesText.trim() && (
                  <div className="border border-indigo-200 bg-indigo-50/60 p-3 rounded-lg text-xs space-y-1">
                    <strong className="text-indigo-900 block text-[11px] uppercase tracking-wide">
                      Catatan Analisis &amp; Rekomendasi Prakirawan:
                    </strong>
                    <p className="text-[11px] text-indigo-950 leading-normal whitespace-pre-line font-medium">
                      {notesText}
                    </p>
                  </div>
                )}

                {/* Legend Guide */}
                <div className="p-2.5 bg-slate-50 border border-slate-200 rounded text-[9px] text-slate-600 space-y-0.5">
                  <strong className="text-slate-800 uppercase block">Legenda Anomali OLR Satelit:</strong>
                  <div>• Kontur Hijau/Biru: Anomali OLR Negatif (&lt; 0 W/m²) &rarr; Konveksi aktif &amp; curah hujan tinggi.</div>
                  <div>• Kontur Kuning/Cokelat: Anomali OLR Positif (&gt; 0 W/m²) &rarr; Konveksi tertekan &amp; udara kering.</div>
                </div>
              </div>

              {/* Page 2 Official Footer */}
              <div className="border-t-2 border-slate-200 pt-3 flex justify-between items-center text-[10px] text-slate-500">
                <div>
                  Sumber Data: BoM Australia IDCK000080, NOAA CPC &amp; NCICS • Dihasilkan otomatis oleh sistem <strong>MeteoSense Dashboard</strong> (Stasiun Meteorologi Jerukagung)
                </div>
                <div className="font-mono">
                  Halaman 2 / 2 • Waktu Cetak: {formatDateTimeForDisplay(new Date())}
                </div>
              </div>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
