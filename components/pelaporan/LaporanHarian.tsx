"use client"

import { useEffect, useRef, useState } from "react"
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
  Clock3, 
  MapPinned,
  Loader2
} from "lucide-react"
import { format, subDays } from "date-fns"
import { id } from "date-fns/locale"
import { Calendar } from "@/components/ui/calendar"
import { Popover, PopoverTrigger, PopoverContent } from "@/components/ui/popover"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"
import { useToast } from "@/hooks/use-toast"
import { formatYMD, formatIdDateDash } from "@/lib/weatherUtils"
import { generateCanvasFromDOM, exportAsPNG, exportAsPDF, printCanvas } from "@/lib/exportUtils"

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
  const [loading, setLoading] = useState(false)
  const [dayRecord, setDayRecord] = useState<any>(null)
  const [isExporting, setIsExporting] = useState(false)
  const reportId = "harian-print-area";

  // Responsiveness scale
  const [scale, setScale] = useState(1);
  const containerRef = useRef<HTMLDivElement>(null);

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
    toast({ title: "Memproses Laporan...", description: "Mohon tunggu sebentar." });
    setTimeout(async () => {
      const canvas = await generateCanvasFromDOM(reportId);
      if (!canvas) {
        toast({ variant: "destructive", title: "Error", description: "Gagal membuat gambar." });
        setIsExporting(false);
        return;
      }
      const filename = `Infografis_Harian_${sensorName.replace(/\s+/g, '_')}_${formatYMD(selectedDate)}`;
      if (type === 'png') exportAsPNG(canvas, filename);
      else if (type === 'pdf') exportAsPDF([canvas], filename, 'portrait');
      else if (type === 'print') printCanvas(canvas, 'portrait');
      toast({ title: "Berhasil", description: "Laporan siap." });
      setIsExporting(false);
    }, 150);
  };

  const generateReport = async (date: Date) => {
    if (!sensorId) {
      toast({ title: "Peringatan", description: "Pilih sensor terlebih dahulu", variant: "destructive" })
      return
    }
    setLoading(true);
    setDayRecord(null);
    try {
      const dateStr = formatYMD(date);
      const url = `/api/weather/daily-report?sensorId=${sensorId}&date=${dateStr}`;
      const res = await fetch(url);
      if (!res.ok) {
        throw new Error("Gagal mengambil data dari server.");
      }
      const data = await res.json();
      
      if (!data.dayRecord) {
        toast({ title: "Informasi", description: "Tidak ada data untuk tanggal tersebut" });
        setLoading(false);
        return;
      }

      setDayRecord(data.dayRecord);
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

  return (
    <div className="space-y-6">
      {/* Control Panel */}
      <Card className="no-print">
        <CardContent className="p-4 flex flex-col md:flex-row gap-4 items-start justify-between">
          <div className="flex flex-col gap-2">
            <div className="flex items-center gap-2">
              <label className="text-sm font-medium text-slate-700 dark:text-slate-200">Tanggal Pengamatan</label>
              {isYesterdaySelected && isAfter7am && (
                <Badge variant="outline" className="text-xs text-amber-600 border-amber-400 gap-1 bg-amber-500/5">
                  <Clock className="h-3 w-3" /> Siap cetak (≥ 07:00 WIB)
                </Badge>
              )}
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
                    onSelect={d => d && setSelectedDate(d)}
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

          <div className="flex flex-wrap gap-2">
            <Button variant="outline" onClick={() => handleExport('png')} disabled={!dayRecord || isExporting} className="font-medium">
              <FileImage className="mr-2 h-4 w-4 text-green-600" /> PNG
            </Button>
            <Button variant="outline" onClick={() => handleExport('pdf')} disabled={!dayRecord || isExporting} className="font-medium">
              <FileType className="mr-2 h-4 w-4 text-red-600" /> PDF
            </Button>
            <Button className="bg-slate-800 hover:bg-slate-900 text-white font-semibold" onClick={() => handleExport('print')} disabled={!dayRecord || isExporting}>
              <Printer className="mr-2 h-4 w-4" /> Cetak
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Loading Pane */}
      {loading && (
        <div className="h-[400px] w-full flex flex-col items-center justify-center gap-3 bg-white rounded-[32px] border border-slate-200 shadow-sm text-slate-500">
          <Loader2 className="h-10 w-10 animate-spin text-blue-600" />
          <p className="text-sm font-semibold tracking-wide animate-pulse">Sedang memproses laporan harian...</p>
        </div>
      )}

      {/* Live Preview Container (Visual Infographic) */}
      {!loading && dayRecord && (
        <div className="w-full flex flex-col items-center overflow-x-auto p-6 bg-slate-100 rounded-[32px] border border-slate-200/85">
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

              {/* 2. Main Content Stack (Vertical Summary Cards) */}
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

                {/* Relative Humidity Section */}
                <div className="w-full bg-gradient-to-r from-blue-50/80 via-sky-50/40 to-cyan-50/70 border border-blue-100 rounded-3xl p-6 shadow-sm relative overflow-hidden">
                  <div className="flex items-center gap-2.5 text-blue-700 mb-1">
                    <Droplets className="h-6 w-6 text-blue-500" />
                    <span className="text-xs font-black uppercase tracking-widest">Relative Humidity</span>
                  </div>
                  <WeatherStatRow 
                    min={dayRecord.humidityMin} 
                    avg={dayRecord.humidityAvg} 
                    max={dayRecord.humidityMax} 
                    unit="%" 
                    labelColor="text-blue-600/70"
                    valColorMin="text-sky-600"
                    valColorAvg="text-blue-900"
                    valColorMax="text-indigo-600"
                    valSizeMin="text-3xl"
                    valSizeAvg="text-5xl"
                    valSizeMax="text-3xl"
                  />
                </div>

                {/* Atmospheric Pressure Section */}
                <div className="w-full bg-gradient-to-r from-purple-50/80 via-fuchsia-50/40 to-pink-50/70 border border-purple-100 rounded-3xl p-6 shadow-sm relative overflow-hidden">
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
                    valColorMin="text-indigo-600"
                    valColorAvg="text-purple-900"
                    valColorMax="text-pink-600"
                    valSizeMin="text-2xl"
                    valSizeAvg="text-4xl"
                    valSizeMax="text-2xl"
                  />
                </div>

                {/* Highlighted Rainfall Section */}
                <div className="w-full bg-gradient-to-r from-teal-50 via-emerald-50/40 to-teal-50/75 border border-teal-200 rounded-3xl p-6 flex items-center justify-between shadow-sm relative overflow-hidden">
                  <div className="flex flex-col gap-1.5 pl-2">
                    <div className="flex items-center gap-3 text-teal-700">
                      <CloudRain className="h-7 w-7 text-teal-600" />
                      <span className="text-xs font-black uppercase tracking-widest">Total Rainfall</span>
                    </div>
                    <p className="text-teal-600/70 text-sm mt-1 font-medium tracking-wide">
                      Category: <span className="text-teal-900 font-extrabold">{getDailyRainfallCategory(dayRecord.rainfallTot ?? 0)}</span>
                    </p>
                  </div>
                  <div className="bg-white/80 py-4 px-6 rounded-2xl border border-white shadow-sm flex items-center justify-center">
                    <span className="text-4xl font-black text-teal-600 tracking-tight">
                      {(dayRecord.rainfallTot ?? 0).toFixed(1)}
                    </span>
                    <span className="text-lg font-bold text-teal-500 ml-1">mm</span>
                  </div>
                </div>
              </div>

              {/* 3. Footer Section */}
              <div className="flex flex-col items-center text-center mt-4">
                <div className="w-full border-t border-slate-200/80 mb-6" />
                
                <div className="flex items-center justify-between w-full text-slate-400 px-2 text-xs font-semibold tracking-wider uppercase">
                  <div className="flex items-center gap-1.5">
                    <Clock3 className="h-4 w-4 text-slate-400" />
                    <span>Observation Period: 00:00 UTC – 23:59 UTC</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <MapPinned className="h-4 w-4 text-slate-400" />
                    <span>Jerukagung AWS</span>
                  </div>
                </div>

                <p className="text-[10px] text-slate-400 mt-6 tracking-[0.2em] uppercase font-bold">
                  Powered by Jerukagung Automatic Weather Station
                </p>
              </div>

            </div>
          </div>
        </div>
      )}

      {!loading && !dayRecord && (
        <div className="h-[250px] flex items-center justify-center border border-dashed rounded-[24px] text-slate-400 border-slate-800">
          Pilih tanggal pengamatan, lalu klik Tampilkan untuk memuat infografis harian
        </div>
      )}
    </div>
  )
}
