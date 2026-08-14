"use client"

import { useEffect, useRef, useState, useMemo } from "react"
import { 
  FileImage, 
  FileType, 
  Printer, 
  CalendarIcon, 
  Clock, 
  Thermometer, 
  Droplets, 
  Gauge, 
  CloudRain, 
  MapPinned,
  Loader2,
  LayoutDashboard,
  Eye,
  CheckCircle2
} from "lucide-react"
import { format, subDays } from "date-fns"
import { id } from "date-fns/locale"
import { Calendar } from "@/components/ui/calendar"
import { Popover, PopoverTrigger, PopoverContent } from "@/components/ui/popover"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"
import { useToast } from "@/hooks/use-toast"
import { formatYMD, formatIdDateDash, WeatherRecord, aggregateDaily } from "@/lib/weatherUtils"
import { generateCanvasFromDOM, exportAsPNG, exportAsPDF, printCanvas } from "@/lib/exportUtils"
import { fetchSensorDataByDateRange } from "@/lib/apiClient"
import { ERA5CorrectionPanel } from "./ERA5CorrectionPanel"
import { CorrectionOffsets, applyCorrectionToDailyRecords } from "@/lib/reanalysis/era5Correction"

interface LaporanHarianProps {
  sensorId: string;
  sensorName: string;
  displayName: string;
}

function getYesterday(): Date {
  return subDays(new Date(), 1);
}

// Category helper for daily rainfall
const getDailyRainfallCategory = (amount: number) => {
  if (amount === 0) return "Tidak Ada Hujan";
  if (amount <= 5) return "Hujan Sangat Ringan";
  if (amount <= 20) return "Hujan Ringan";
  if (amount <= 50) return "Hujan Sedang";
  if (amount <= 100) return "Hujan Lebat";
  if (amount <= 150) return "Hujan Sangat Lebat";
  return "Hujan Ekstrem";
};

// Clean sub-card statistical row with custom styling support
const WeatherStatRow = ({ 
  min, avg, max, unit, labelColor, valColorMin, valColorAvg, valColorMax,
  valSizeMin = "text-3xl",
  valSizeAvg = "text-5xl",
  valSizeMax = "text-3xl"
}: { 
  min: number | undefined; 
  avg: number | undefined; 
  max: number | undefined; 
  unit: string;
  labelColor: string;
  valColorMin: string;
  valColorAvg: string;
  valColorMax: string;
  valSizeMin?: string;
  valSizeAvg?: string;
  valSizeMax?: string;
}) => {
  return (
    <div className="flex gap-4 w-full mt-3 px-1 py-1.5">
      {/* Min Card */}
      <div className="flex flex-col items-center justify-center bg-white/60 py-4 px-2 rounded-2xl border border-white/85 shadow-sm flex-1">
        <span className={cn("text-[10px] uppercase tracking-widest font-black opacity-75", labelColor)}>Minimum</span>
        <span className={cn("font-black mt-1 flex items-baseline gap-0.5", valSizeMin, valColorMin)}>
          {min != null ? min.toFixed(1) : "—"}
          <span className="text-xs font-bold opacity-80 ml-0.5">{unit}</span>
        </span>
      </div>
      
      {/* Avg Card (Highlighted slightly) */}
      <div className="flex flex-col items-center justify-center bg-white/95 py-5 px-2 rounded-2xl border border-white shadow-sm flex-1 transform scale-105 z-10">
        <span className={cn("text-xs uppercase tracking-widest font-black", labelColor)}>Rata-rata</span>
        <span className={cn("font-black mt-0.5 flex items-baseline gap-0.5", valSizeAvg, valColorAvg)}>
          {avg != null ? avg.toFixed(1) : "—"}
          <span className="text-sm font-bold opacity-80 ml-0.5">{unit}</span>
        </span>
      </div>
      
      {/* Max Card */}
      <div className="flex flex-col items-center justify-center bg-white/60 py-4 px-2 rounded-2xl border border-white/85 shadow-sm flex-1">
        <span className={cn("text-[10px] uppercase tracking-widest font-black opacity-75", labelColor)}>Maksimum</span>
        <span className={cn("font-black mt-1 flex items-baseline gap-0.5", valSizeMax, valColorMax)}>
          {max != null ? max.toFixed(1) : "—"}
          <span className="text-xs font-bold opacity-80 ml-0.5">{unit}</span>
        </span>
      </div>
    </div>
  )
};

export default function LaporanHarian({ sensorId, sensorName, displayName }: LaporanHarianProps) {
  const { toast } = useToast()
  const [selectedDate, setSelectedDate] = useState<Date>(() => getYesterday());
  const [viewMode, setViewMode] = useState<'web' | 'print'>('web');
  const [loading, setLoading] = useState(false)
  const [rawRecords, setRawRecords] = useState<WeatherRecord[]>([])
  const [isExporting, setIsExporting] = useState(false)
  const reportId = "harian-print-area";

  // --- ERA5 Calibration & Correction State ---
  const [offsets, setOffsets] = useState<CorrectionOffsets>({
    tempOffset: 0,
    humOffset: 0,
    pressOffset: 0,
    enabled: false,
  });

  // Responsiveness scale
  const [scale, setScale] = useState(1);
  const containerRef = useRef<HTMLDivElement>(null);

  // Effective Corrected Records
  const correctedRecords = useMemo(() => {
    return applyCorrectionToDailyRecords(rawRecords, offsets);
  }, [rawRecords, offsets]);

  const dayRecord = useMemo(() => {
    return correctedRecords.length > 0 ? correctedRecords[0] : null;
  }, [correctedRecords]);

  useEffect(() => {
    const handleResize = () => {
      if (containerRef.current) {
        const parentWidth = containerRef.current.clientWidth || 1080;
        const newScale = Math.min(parentWidth / 1080, 1);
        setScale(newScale);
      }
    };
    handleResize();

    window.addEventListener("resize", handleResize);
    const timer = setTimeout(handleResize, 100);

    return () => {
      window.removeEventListener("resize", handleResize);
      clearTimeout(timer);
    };
  }, [dayRecord]);

  const handleExport = async (type: 'pdf' | 'png' | 'print') => {
    if (!dayRecord) return;
    setIsExporting(true);
    toast({ title: "Memproses Laporan...", description: "Mohon tunggu sebentar, sedang merender kanvas dokumen." });
    setTimeout(async () => {
      const canvas = await generateCanvasFromDOM(reportId);
      if (!canvas) {
        toast({ variant: "destructive", title: "Error", description: "Gagal membuat gambar dari laporan." });
        setIsExporting(false);
        return;
      }
      const filename = `Infografis_Harian_${sensorName.replace(/\s+/g, '_')}_${formatYMD(selectedDate)}`;
      if (type === 'png') exportAsPNG(canvas, filename);
      else if (type === 'pdf') exportAsPDF([canvas], filename, 'portrait');
      else if (type === 'print') printCanvas(canvas, 'portrait');
      toast({ title: "✓ Berhasil", description: "Laporan siap diunduh/dicetak." });
      setIsExporting(false);
    }, 150);
  };

  const generateReport = async (date: Date) => {
    if (!sensorId) {
      toast({ title: "Peringatan", description: "Pilih sensor terlebih dahulu", variant: "destructive" })
      return
    }
    setLoading(true);
    setRawRecords([]);
    try {
      const start = new Date(date);
      start.setHours(0, 0, 0, 0);
      const end = new Date(date);
      end.setHours(23, 59, 59, 999);

      const raw = await fetchSensorDataByDateRange(sensorId, start.getTime(), end.getTime());

      if (!raw || raw.length === 0) {
        toast({ title: "Informasi", description: "Tidak ada data untuk tanggal tersebut" });
        setLoading(false);
        return;
      }

      const records = aggregateDaily(raw);
      setRawRecords(records);
    } catch (err) {
      console.error(err);
      toast({ title: "Error", description: "Gagal memuat laporan harian", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const initRef = useRef(false);
  useEffect(() => {
    if (sensorId && !initRef.current) {
      initRef.current = true;
      generateReport(getYesterday());
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sensorId]);

  const nowWib = new Date(Date.now() + 7 * 3600_000);
  const isAfter7am = nowWib.getUTCHours() >= 7;
  const isYesterdaySelected = formatYMD(selectedDate) === formatYMD(getYesterday());
  const selectedDateStr = format(selectedDate, 'yyyy-MM-dd');

  return (
    <div className="space-y-6">
      {/* --- CONTROL TOOLBAR --- */}
      <Card className="no-print shadow-sm border-slate-200 dark:border-slate-800">
        <CardContent className="p-4 flex flex-col md:flex-row gap-4 items-start md:items-center justify-between">
          <div className="flex flex-col gap-2 flex-grow">
            <div className="flex items-center justify-between gap-2 flex-wrap">
              <div className="flex items-center gap-2">
                <label className="text-sm font-semibold text-slate-800 dark:text-slate-200">Tanggal Pengamatan</label>
                {isYesterdaySelected && isAfter7am && (
                  <Badge variant="outline" className="text-xs text-amber-600 border-amber-400 gap-1 bg-amber-500/5">
                    <Clock className="h-3 w-3" /> Siap cetak (≥ 07:00 WIB)
                  </Badge>
                )}
              </div>

              {/* View Mode Toggle */}
              <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-800 p-1 rounded-lg border">
                <Button
                  variant={viewMode === 'web' ? 'default' : 'ghost'}
                  size="sm"
                  onClick={() => setViewMode('web')}
                  className={cn("h-7 text-xs px-3 font-medium", viewMode === 'web' && "bg-white dark:bg-slate-900 text-blue-600 shadow-sm")}
                >
                  <LayoutDashboard className="w-3.5 h-3.5 mr-1.5" />
                  Dashboard Web
                </Button>
                <Button
                  variant={viewMode === 'print' ? 'default' : 'ghost'}
                  size="sm"
                  onClick={() => setViewMode('print')}
                  className={cn("h-7 text-xs px-3 font-medium", viewMode === 'print' && "bg-white dark:bg-slate-900 text-indigo-600 shadow-sm")}
                >
                  <Eye className="w-3.5 h-3.5 mr-1.5" />
                  Pratinjau Infografis
                </Button>
              </div>
            </div>

            <div className="flex items-center gap-2 flex-wrap">
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" className={cn("w-[240px] justify-start text-left font-normal", !selectedDate && "text-muted-foreground")}>
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {selectedDate ? format(selectedDate, 'EEEE, dd MMMM yyyy', { locale: id }) : <span>Pilih Tanggal</span>}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    initialFocus
                    mode="single"
                    selected={selectedDate}
                    onSelect={d => {
                      if (d) {
                        setSelectedDate(d);
                        generateReport(d);
                      }
                    }}
                    disabled={d => d > new Date()}
                  />
                </PopoverContent>
              </Popover>
              <Button onClick={() => generateReport(selectedDate)} disabled={loading} className="bg-blue-600 hover:bg-blue-700 text-white font-semibold flex items-center gap-2">
                {loading ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    <span>Memproses...</span>
                  </>
                ) : (
                  'Proses Laporan'
                )}
              </Button>
              <Button variant="outline" onClick={() => { const y = getYesterday(); setSelectedDate(y); generateReport(y); }}>
                Kemarin
              </Button>
            </div>
          </div>

          <div className="flex flex-wrap gap-2 shrink-0">
            <Button variant="outline" onClick={() => handleExport('png')} disabled={!dayRecord || isExporting} className="font-medium h-9">
              <FileImage className="mr-1.5 h-4 w-4 text-green-600" /> PNG
            </Button>
            <Button variant="outline" onClick={() => handleExport('pdf')} disabled={!dayRecord || isExporting} className="font-medium h-9">
              <FileType className="mr-1.5 h-4 w-4 text-red-600" /> PDF
            </Button>
            <Button className="bg-slate-800 hover:bg-slate-900 text-white h-9 font-medium" onClick={() => handleExport('print')} disabled={!dayRecord || isExporting}>
              <Printer className="mr-1.5 h-4 w-4" /> Cetak
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* --- PANEL VALIDASI & KOREKSI ERA5 --- */}
      <ERA5CorrectionPanel
        sensorId={sensorId}
        sensorName={sensorName}
        startDate={selectedDateStr}
        endDate={selectedDateStr}
        rawAwsData={rawRecords}
        offsets={offsets}
        onOffsetsChange={setOffsets}
      />

      {loading && (
        <div className="h-[300px] w-full flex flex-col items-center justify-center gap-3 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 text-slate-500 shadow-sm">
          <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
          <p className="text-sm font-semibold tracking-wide animate-pulse">Sedang memproses laporan harian...</p>
        </div>
      )}

      {/* --- VIEW MODE 1: DASHBOARD WEB INTERAKTIF --- */}
      {viewMode === 'web' && !loading && dayRecord && (
        <div className="space-y-6">
          {offsets.enabled && (
            <div className="flex items-center gap-2 p-3 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 rounded-lg text-xs text-emerald-800 dark:text-emerald-200">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>
                <strong>Mode Kalibrasi Aktif:</strong> Laporan harian telah disesuaikan dengan offset koreksi ERA5-Land (Suhu: {offsets.tempOffset > 0 ? "+" : ""}{offsets.tempOffset}°C, Kelembapan: {offsets.humOffset > 0 ? "+" : ""}{offsets.humOffset}%, Tekanan: {offsets.pressOffset > 0 ? "+" : ""}{offsets.pressOffset} hPa).
              </span>
            </div>
          )}

          {/* Hero Grid 4 Metrics */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Suhu */}
            <Card className="border-orange-100 bg-gradient-to-br from-orange-50/50 via-white to-white dark:from-slate-900 dark:to-slate-800">
              <CardContent className="p-4 space-y-2">
                <div className="flex justify-between items-center text-xs font-semibold text-orange-700">
                  <span className="flex items-center gap-1.5"><Thermometer className="w-4 h-4 text-orange-500" /> Suhu Udara</span>
                  <Badge variant="outline" className="text-[10px] bg-orange-50 text-orange-700">24 Jam</Badge>
                </div>
                <div className="text-3xl font-black text-slate-900 dark:text-slate-100">
                  {dayRecord.temperatureAvg?.toFixed(1) ?? "-"} <span className="text-sm font-normal text-slate-500">°C</span>
                </div>
                <div className="flex justify-between text-xs text-slate-500 pt-1 border-t">
                  <span>Maks: <strong className="text-red-600">{dayRecord.temperatureMax?.toFixed(1) ?? "-"}°C</strong></span>
                  <span>Min: <strong className="text-blue-600">{dayRecord.temperatureMin?.toFixed(1) ?? "-"}°C</strong></span>
                </div>
              </CardContent>
            </Card>

            {/* Kelembapan */}
            <Card className="border-blue-100 bg-gradient-to-br from-blue-50/50 via-white to-white dark:from-slate-900 dark:to-slate-800">
              <CardContent className="p-4 space-y-2">
                <div className="flex justify-between items-center text-xs font-semibold text-blue-700">
                  <span className="flex items-center gap-1.5"><Droplets className="w-4 h-4 text-blue-500" /> Kelembapan</span>
                  <Badge variant="outline" className="text-[10px] bg-blue-50 text-blue-700">24 Jam</Badge>
                </div>
                <div className="text-3xl font-black text-slate-900 dark:text-slate-100">
                  {dayRecord.humidityAvg?.toFixed(0) ?? "-"} <span className="text-sm font-normal text-slate-500">%</span>
                </div>
                <div className="flex justify-between text-xs text-slate-500 pt-1 border-t">
                  <span>Maks: <strong className="text-emerald-600">{dayRecord.humidityMax?.toFixed(0) ?? "-"}%</strong></span>
                  <span>Min: <strong className="text-amber-600">{dayRecord.humidityMin?.toFixed(0) ?? "-"}%</strong></span>
                </div>
              </CardContent>
            </Card>

            {/* Tekanan */}
            <Card className="border-violet-100 bg-gradient-to-br from-violet-50/50 via-white to-white dark:from-slate-900 dark:to-slate-800">
              <CardContent className="p-4 space-y-2">
                <div className="flex justify-between items-center text-xs font-semibold text-violet-700">
                  <span className="flex items-center gap-1.5"><Gauge className="w-4 h-4 text-violet-500" /> Tekanan Barometrik</span>
                  <Badge variant="outline" className="text-[10px] bg-violet-50 text-violet-700">24 Jam</Badge>
                </div>
                <div className="text-3xl font-black text-slate-900 dark:text-slate-100">
                  {dayRecord.pressureAvg?.toFixed(1) ?? "-"} <span className="text-sm font-normal text-slate-500">hPa</span>
                </div>
                <div className="flex justify-between text-xs text-slate-500 pt-1 border-t">
                  <span>Maks: <strong className="text-violet-600">{dayRecord.pressureMax?.toFixed(1) ?? "-"} hPa</strong></span>
                  <span>Min: <strong className="text-violet-400">{dayRecord.pressureMin?.toFixed(1) ?? "-"} hPa</strong></span>
                </div>
              </CardContent>
            </Card>

            {/* Curah Hujan */}
            <Card className="border-sky-100 bg-gradient-to-br from-sky-50/50 via-white to-white dark:from-slate-900 dark:to-slate-800">
              <CardContent className="p-4 space-y-2">
                <div className="flex justify-between items-center text-xs font-semibold text-sky-700">
                  <span className="flex items-center gap-1.5"><CloudRain className="w-4 h-4 text-sky-500" /> Curah Hujan</span>
                  <Badge variant="outline" className="text-[10px] bg-sky-50 text-sky-700">Akumulasi</Badge>
                </div>
                <div className="text-3xl font-black text-sky-600">
                  {dayRecord.rainfallTot?.toFixed(1) ?? "0.0"} <span className="text-sm font-normal text-slate-500">mm</span>
                </div>
                <div className="text-xs text-slate-500 pt-1 border-t">
                  Kategori: <strong className="text-slate-700 dark:text-slate-300">{getDailyRainfallCategory(dayRecord.rainfallTot || 0)}</strong>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      )}

      {/* --- VIEW MODE 2: PRATINJAU POSTER INFOGRAFIS LENGKAP --- */}
      {viewMode === 'print' && !loading && dayRecord && (
        <div className="w-full flex flex-col items-center overflow-x-auto p-6 bg-slate-100 dark:bg-slate-950 rounded-[32px] border border-slate-200/85 shadow-inner">
          <div ref={containerRef} className="w-full max-w-[1080px] flex justify-center items-center overflow-hidden">
            <div 
              id={reportId}
              className="w-[1080px] h-[1350px] bg-white text-slate-800 flex flex-col justify-between p-20 relative rounded-[40px] shadow-2xl origin-top shrink-0 border border-slate-200"
              style={{ 
                transform: `scale(${scale})`, 
                marginBottom: `${(scale - 1) * 1350}px` 
              }}
            >
              {/* 1. Header Section */}
              <div className="flex flex-col items-center text-center mt-4">
                <div className="flex items-center gap-5">
                  <img src="/img/logo.webp" alt="Logo" className="h-16 w-16 object-contain" />
                  <div className="text-left">
                    <h1 className="text-4xl font-black tracking-[0.15em] text-slate-800 uppercase leading-none">
                      Jerukagung Meteorologi
                    </h1>
                    <p className="text-sm font-semibold tracking-[0.25em] text-slate-500 uppercase mt-1.5">
                      Automatic Weather Station
                    </p>
                  </div>
                </div>

                <div className="w-24 h-1 bg-gradient-to-r from-orange-400 via-sky-400 to-blue-500 my-8 rounded-full" />

                <h2 className="text-2xl font-bold tracking-[0.2em] text-slate-400 uppercase">
                  Daily Weather Report
                </h2>
                <p className="text-6xl font-black text-sky-600 mt-3 tracking-wide">
                  {selectedDate ? format(selectedDate, "dd MMMM yyyy") : ""}
                </p>
              </div>

              {/* 2. Main Content Stack */}
              <div className="flex flex-col gap-6 w-full my-auto">
                {/* Temperature Section */}
                <div className="w-full bg-gradient-to-r from-orange-50/80 via-amber-50/40 to-rose-50/70 border border-orange-100 rounded-3xl p-6 shadow-sm relative overflow-hidden">
                  <div className="flex items-center gap-2.5 text-orange-700 mb-1">
                    <Thermometer className="h-6 w-6 text-orange-500" />
                    <span className="text-xs font-black uppercase tracking-widest">Temperature</span>
                  </div>
                  <WeatherStatRow 
                    min={dayRecord.temperatureMin} 
                    avg={dayRecord.temperatureAvg} 
                    max={dayRecord.temperatureMax} 
                    unit="°C" 
                    labelColor="text-orange-600/70"
                    valColorMin="text-blue-600"
                    valColorAvg="text-orange-900"
                    valColorMax="text-red-600"
                    valSizeMin="text-3xl"
                    valSizeAvg="text-5xl"
                    valSizeMax="text-3xl"
                  />
                </div>

                {/* Humidity Section */}
                <div className="w-full bg-gradient-to-r from-sky-50/80 via-blue-50/40 to-indigo-50/70 border border-blue-100 rounded-3xl p-6 shadow-sm relative overflow-hidden">
                  <div className="flex items-center gap-2.5 text-sky-700 mb-1">
                    <Droplets className="h-6 w-6 text-sky-500" />
                    <span className="text-xs font-black uppercase tracking-widest">Relative Humidity</span>
                  </div>
                  <WeatherStatRow 
                    min={dayRecord.humidityMin} 
                    avg={dayRecord.humidityAvg} 
                    max={dayRecord.humidityMax} 
                    unit="%" 
                    labelColor="text-sky-600/70"
                    valColorMin="text-amber-600"
                    valColorAvg="text-sky-900"
                    valColorMax="text-emerald-600"
                    valSizeMin="text-3xl"
                    valSizeAvg="text-5xl"
                    valSizeMax="text-3xl"
                  />
                </div>

                {/* Pressure Section */}
                <div className="w-full bg-gradient-to-r from-slate-50/80 via-purple-50/40 to-violet-50/70 border border-purple-100 rounded-3xl p-6 shadow-sm relative overflow-hidden">
                  <div className="flex items-center gap-2.5 text-purple-700 mb-1">
                    <Gauge className="h-6 w-6 text-purple-500" />
                    <span className="text-xs font-black uppercase tracking-widest">Atmospheric Pressure</span>
                  </div>
                  <WeatherStatRow 
                    min={dayRecord.pressureMin} 
                    avg={dayRecord.pressureAvg} 
                    max={dayRecord.pressureMax} 
                    unit="hPa" 
                    labelColor="text-purple-600/70"
                    valColorMin="text-slate-600"
                    valColorAvg="text-purple-900"
                    valColorMax="text-indigo-600"
                    valSizeMin="text-2xl"
                    valSizeAvg="text-4xl"
                    valSizeMax="text-2xl"
                  />
                </div>

                {/* Rain Bottom Card */}
                <div className="flex items-center justify-between bg-gradient-to-r from-blue-600 via-indigo-600 to-sky-700 text-white rounded-3xl p-6 shadow-md">
                  <div className="flex items-center gap-4">
                    <div className="p-3 bg-white/10 rounded-2xl border border-white/20">
                      <CloudRain className="h-8 w-8 text-sky-200" />
                    </div>
                    <div>
                      <span className="text-xs font-bold uppercase tracking-widest text-sky-200/80">Daily Total Rainfall</span>
                      <p className="text-sm font-semibold text-white/90 mt-0.5">
                        {getDailyRainfallCategory(dayRecord.rainfallTot || 0)}
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <span className="text-5xl font-black tracking-tight">{dayRecord.rainfallTot != null ? dayRecord.rainfallTot.toFixed(1) : "0.0"}</span>
                    <span className="text-lg font-bold text-sky-200 ml-1.5">mm</span>
                  </div>
                </div>
              </div>

              {/* 3. Footer Meta Info */}
              <div className="flex items-end justify-between border-t border-slate-100 pt-6 text-xs text-slate-400 font-semibold uppercase tracking-wider">
                <div className="flex items-center gap-2 text-slate-500">
                  <MapPinned className="h-4 w-4 text-slate-400" />
                  <span>Stasiun: {sensorName}</span>
                </div>
                <div className="flex items-center gap-2 text-slate-400">
                  <Clock className="h-4 w-4" />
                  <span>Meteo Sense 4.0.0</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Hidden print area for canvas if in web view */}
      {viewMode === 'web' && dayRecord && (
        <div className="overflow-hidden h-0 w-0 absolute opacity-0 pointer-events-none">
          <div 
            id={reportId}
            className="w-[1080px] h-[1350px] bg-white text-slate-800 flex flex-col justify-between p-20 relative rounded-[40px] shadow-2xl origin-top shrink-0 border border-slate-200"
          >
            {/* Header */}
            <div className="flex flex-col items-center text-center mt-4">
              <div className="flex items-center gap-5">
                <img src="/img/logo.webp" alt="Logo" className="h-16 w-16 object-contain" />
                <div className="text-left">
                  <h1 className="text-4xl font-black tracking-[0.15em] text-slate-800 uppercase leading-none">
                    Jerukagung Meteorologi
                  </h1>
                  <p className="text-sm font-semibold tracking-[0.25em] text-slate-500 uppercase mt-1.5">
                    Automatic Weather Station
                  </p>
                </div>
              </div>

              <div className="w-24 h-1 bg-gradient-to-r from-orange-400 via-sky-400 to-blue-500 my-8 rounded-full" />

              <h2 className="text-2xl font-bold tracking-[0.2em] text-slate-400 uppercase">
                Daily Weather Report
              </h2>
              <p className="text-6xl font-black text-sky-600 mt-3 tracking-wide">
                {selectedDate ? format(selectedDate, "dd MMMM yyyy") : ""}
              </p>
            </div>

            {/* Main Content */}
            <div className="flex flex-col gap-6 w-full my-auto">
              <div className="w-full bg-gradient-to-r from-orange-50/80 via-amber-50/40 to-rose-50/70 border border-orange-100 rounded-3xl p-6 shadow-sm relative overflow-hidden">
                <div className="flex items-center gap-2.5 text-orange-700 mb-1">
                  <Thermometer className="h-6 w-6 text-orange-500" />
                  <span className="text-xs font-black uppercase tracking-widest">Temperature</span>
                </div>
                <WeatherStatRow 
                  min={dayRecord.temperatureMin} 
                  avg={dayRecord.temperatureAvg} 
                  max={dayRecord.temperatureMax} 
                  unit="°C" 
                  labelColor="text-orange-600/70"
                  valColorMin="text-blue-600"
                  valColorAvg="text-orange-900"
                  valColorMax="text-red-600"
                />
              </div>

              <div className="w-full bg-gradient-to-r from-sky-50/80 via-blue-50/40 to-indigo-50/70 border border-blue-100 rounded-3xl p-6 shadow-sm relative overflow-hidden">
                <div className="flex items-center gap-2.5 text-sky-700 mb-1">
                  <Droplets className="h-6 w-6 text-sky-500" />
                  <span className="text-xs font-black uppercase tracking-widest">Relative Humidity</span>
                </div>
                <WeatherStatRow 
                  min={dayRecord.humidityMin} 
                  avg={dayRecord.humidityAvg} 
                  max={dayRecord.humidityMax} 
                  unit="%" 
                  labelColor="text-sky-600/70"
                  valColorMin="text-amber-600"
                  valColorAvg="text-sky-900"
                  valColorMax="text-emerald-600"
                />
              </div>

              <div className="w-full bg-gradient-to-r from-slate-50/80 via-purple-50/40 to-violet-50/70 border border-purple-100 rounded-3xl p-6 shadow-sm relative overflow-hidden">
                <div className="flex items-center gap-2.5 text-purple-700 mb-1">
                  <Gauge className="h-6 w-6 text-purple-500" />
                  <span className="text-xs font-black uppercase tracking-widest">Atmospheric Pressure</span>
                </div>
                <WeatherStatRow 
                  min={dayRecord.pressureMin} 
                  avg={dayRecord.pressureAvg} 
                  max={dayRecord.pressureMax} 
                  unit="hPa" 
                  labelColor="text-purple-600/70"
                  valColorMin="text-slate-600"
                  valColorAvg="text-purple-900"
                  valColorMax="text-indigo-600"
                  valSizeMin="text-2xl"
                  valSizeAvg="text-4xl"
                  valSizeMax="text-2xl"
                />
              </div>

              <div className="flex items-center justify-between bg-gradient-to-r from-blue-600 via-indigo-600 to-sky-700 text-white rounded-3xl p-6 shadow-md">
                <div className="flex items-center gap-4">
                  <div className="p-3 bg-white/10 rounded-2xl border border-white/20">
                    <CloudRain className="h-8 w-8 text-sky-200" />
                  </div>
                  <div>
                    <span className="text-xs font-bold uppercase tracking-widest text-sky-200/80">Daily Total Rainfall</span>
                    <p className="text-sm font-semibold text-white/90 mt-0.5">
                      {getDailyRainfallCategory(dayRecord.rainfallTot || 0)}
                    </p>
                  </div>
                </div>
                <div className="text-right">
                  <span className="text-5xl font-black tracking-tight">{dayRecord.rainfallTot != null ? dayRecord.rainfallTot.toFixed(1) : "0.0"}</span>
                  <span className="text-lg font-bold text-sky-200 ml-1.5">mm</span>
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="flex items-end justify-between border-t border-slate-100 pt-6 text-xs text-slate-400 font-semibold uppercase tracking-wider">
              <div className="flex items-center gap-2 text-slate-500">
                <MapPinned className="h-4 w-4 text-slate-400" />
                <span>Stasiun: {sensorName}</span>
              </div>
              <div className="flex items-center gap-2 text-slate-400">
                <Clock className="h-4 w-4" />
                <span>Meteo Sense 4.0.0</span>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
