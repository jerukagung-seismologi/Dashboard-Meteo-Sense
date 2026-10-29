"use client"

import { useEffect, useRef, useState, useCallback, useMemo } from "react"
import { 
  CloudRain, 
  Calendar as CalendarIcon, 
  Clock, 
  Activity, 
  CheckCircle2, 
  ShieldCheck, 
  FileImage, 
  FileType, 
  Printer, 
  Info, 
  CalendarClock, 
  Download,
  Droplets,
  Layers
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card"
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "@/components/ui/table"
import { cn } from "@/lib/utils"
import { fetchSensorDataByDateRange } from "@/lib/apiClient"
import { useToast } from "@/hooks/use-toast"
import { Popover, PopoverTrigger, PopoverContent } from "@/components/ui/popover"
import { Calendar } from "@/components/ui/calendar"
import { format, subDays } from "date-fns"
import { id } from "date-fns/locale"
import { 
  WeatherRecord, 
  HourlyRecord,
  aggregateDaily, 
  aggregateDailyUTC, 
  aggregateHourly, 
  aggregateHourlyUTC, 
  formatIdDateDash,
  formatYMD
} from "@/lib/weatherUtils"
import { getCalibrationDocument } from "@/lib/calibration/calibrationCrud"
import { applyCalibrationToSeries } from "@/lib/calibration/calibrationEngine"
import type { StationCalibrationDocument } from "@/lib/calibration/calibrationTypes"
import { ReportPublicationCard } from "./ReportPublicationCard"
import { APP_CONFIG } from "@/lib/appConfig"
import { generateCanvasFromDOM, exportAsPNG, exportAsPDF, printCanvas } from "@/lib/exportUtils"

// --- Helper UI: Rain Measuring Cup ---
const RainMeasuringCup = ({ value, maxValue = 100 }: { value: number, maxValue?: number }) => {
  const safeValue = isNaN(value) || value <= 0 ? 0 : Number(value.toFixed(2));
  // When zero, bar height is strictly 0. When > 0, min 1.5% so trace rain is visible.
  const visualValue = safeValue <= 0 ? 0 : Math.max(safeValue, 1.5);
  const percentage = safeValue <= 0 ? 0 : Math.min((visualValue / maxValue) * 100, 100);
  const ticks = [100, 75, 50, 25, 0];

  return (
    <div className="flex items-end gap-3 justify-center py-2">
      <div className="flex flex-col justify-between h-56 text-xs text-slate-500 font-mono font-medium py-1 text-right select-none">
        {ticks.map((tick) => (
          <span key={tick} className="leading-none">{tick}</span>
        ))}
      </div>

      <div className="relative w-24 h-56">
        {/* Background measuring cylinder */}
        <div className="absolute inset-0 z-0 bg-slate-100/90 rounded-b-3xl border-2 border-slate-300 shadow-inner"></div>

        {/* Liquid chamber */}
        <div className="absolute inset-[3px] z-10 rounded-b-[22px] overflow-hidden flex items-end">
          {percentage > 0 && (
            <div
              className="liquid-bar w-full relative transition-all duration-1000 ease-in-out bg-gradient-to-t from-blue-600 via-sky-500 to-cyan-300"
              style={{ height: `${percentage}%` }}
            >
              <div className="absolute -top-px left-0 right-0 h-0.5 bg-white/90 shadow-sm"></div>
            </div>
          )}
        </div>

        {/* Graduation lines */}
        <div className="absolute inset-0 z-20 flex flex-col justify-between py-1 px-2 pointer-events-none">
          {ticks.map((tick, index) => (
            <div key={index} className="relative h-px bg-slate-400/40">
              <span className="absolute -left-2 top-1/2 -translate-y-1/2 w-1.5 h-px bg-slate-500/70"></span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

// Daily rainfall intensity classification (Standar BMKG)
const getDailyRainfallCategory = (amount: number) => {
  if (amount === 0) return "Tidak Ada Hujan (Berawan/Cerah)";
  if (amount <= 5) return "Hujan Sangat Ringan (< 5 mm/hari)";
  if (amount <= 20) return "Hujan Ringan (5 – 20 mm/hari)";
  if (amount <= 50) return "Hujan Sedang (20 – 50 mm/hari)";
  if (amount <= 100) return "Hujan Lebat (50 – 100 mm/hari)";
  if (amount <= 150) return "Hujan Sangat Lebat (100 – 150 mm/hari)";
  return "Hujan Ekstrem (> 150 mm/hari)";
};

// Hourly rainfall intensity classification
const getHourlyRainfallCategory = (rate: number) => {
  if (rate <= 0) return "Nihil";
  if (rate <= 1) return "Sangat Ringan";
  if (rate <= 5) return "Ringan";
  if (rate <= 10) return "Sedang";
  if (rate <= 20) return "Lebat";
  return "Sangat Lebat";
};

const getHourlyCategoryBadgeClass = (rate: number) => {
  if (rate <= 0) return "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400 border-slate-200";
  if (rate <= 1) return "bg-sky-50 text-sky-700 dark:bg-sky-950 dark:text-sky-300 border-sky-200";
  if (rate <= 5) return "bg-blue-50 text-blue-700 dark:bg-blue-950 dark:text-blue-300 border-blue-200";
  if (rate <= 10) return "bg-indigo-50 text-indigo-700 dark:bg-indigo-950 dark:text-indigo-300 border-indigo-200";
  if (rate <= 20) return "bg-amber-50 text-amber-800 dark:bg-amber-950 dark:text-amber-300 border-amber-200";
  return "bg-red-50 text-red-700 dark:bg-red-950 dark:text-red-300 border-red-200";
};

export interface HourlyRainItem {
  hourIndex: number;
  timeUTC: string;
  timeWIB: string;
  timeLabel: string;
  rainfall: number;
  cumulativeRain: number;
  category: string;
  hasRain: boolean;
}

export default function LaporanCurahHujan({ 
  sensorId, 
  sensorName, 
  displayName 
}: { 
  sensorId: string; 
  sensorName: string; 
  displayName: string; 
}) {
  const { toast } = useToast();
  
  // Observation Window Mode: 'utc' (00:00 - 24:00 UTC / 07:00 - 07:00 WIB) vs 'calendar' (00:00 - 23:59 WIB)
  const [observationMode, setObservationMode] = useState<"utc" | "calendar">("utc");

  const [reportData, setReportData] = useState<WeatherRecord>({
    date: new Date().toISOString().split('T')[0],
    sampleCount: 0,
    temperatureAvg: 0, temperatureMin: 0, temperatureMax: 0,
    humidityAvg: 0, humidityMin: 0, humidityMax: 0,
    pressureAvg: 0, pressureMin: 0, pressureMax: 0,
    dewPointAvg: 0, windSpeedAvg: 0,
    rainfallTot: 0,
  });

  const [hourlyDistribution, setHourlyDistribution] = useState<HourlyRainItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [isExporting, setIsExporting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [calConfig, setCalConfig] = useState<StationCalibrationDocument | null>(null);
  const [rainStats, setRainStats] = useState<{
    maxRainRate: number;
    peakHour: string;
    rainDurationHours: number;
  }>({ maxRainRate: 0, peakHour: "—", rainDurationHours: 0 });

  const [selectedDate, setSelectedDate] = useState<Date>(() => subDays(new Date(), 1));

  const printableReportRef = useRef<HTMLDivElement>(null);

  // Load calibration config on sensorId change
  useEffect(() => {
    if (sensorId) {
      getCalibrationDocument(sensorId).then((config) => {
        setCalConfig(config);
      });
    }
  }, [sensorId]);

  // Main data fetching & aggregation effect
  useEffect(() => {
    const loadRainfallData = async () => {
      if (!sensorId || !selectedDate) return;
      setLoading(true);
      setError(null);

      try {
        const targetDate = selectedDate;
        const year = targetDate.getFullYear();
        const month = targetDate.getMonth();
        const date = targetDate.getDate();

        let startMs: number;
        let endMs: number;

        if (observationMode === "calendar") {
          // Local day calendar window (00:00:00.000 – 23:59:59.999 WIB)
          const startLocal = new Date(year, month, date, 0, 0, 0, 0);
          const endLocal = new Date(year, month, date, 23, 59, 59, 999);
          startMs = startLocal.getTime();
          endMs = endLocal.getTime();
        } else {
          // BMKG & WMO Standard Synoptic UTC Window (00:00:00.000 – 23:59:59.999 UTC)
          startMs = Date.UTC(year, month, date, 0, 0, 0, 0);
          endMs = Date.UTC(year, month, date, 23, 59, 59, 999);
        }

        let raw = await fetchSensorDataByDateRange(sensorId, startMs, endMs);
        
        // Apply station calibration if active
        if (calConfig && calConfig.enabled && raw && raw.length > 0) {
          raw = applyCalibrationToSeries(raw, calConfig);
        }

        // Advanced Rain Statistics (Peak Intensity, Rain Duration, Peak Time)
        let maxRate = 0;
        let peakTime = "—";

        if (raw && raw.length > 0) {
          raw.forEach((r) => {
            const rRate = r.rainrate != null && Number.isFinite(Number(r.rainrate)) ? Number(r.rainrate) : 0;
            if (rRate > maxRate) {
              maxRate = rRate;
              const d = new Date(r.timestamp);
              if (observationMode === "utc") {
                const utcHourStr = String(d.getUTCHours()).padStart(2, "0");
                const utcMinStr = String(d.getUTCMinutes()).padStart(2, "0");
                const wibHourStr = String(d.getHours()).padStart(2, "0");
                const wibMinStr = String(d.getMinutes()).padStart(2, "0");
                peakTime = `${wibHourStr}:${wibMinStr} WIB (${utcHourStr}:${utcMinStr} UTC)`;
              } else {
                peakTime = `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")} WIB`;
              }
            }
          });
        }

        // Daily and Hourly Aggregations
        const daily = observationMode === "calendar" 
          ? aggregateDaily(raw) 
          : aggregateDailyUTC(raw);

        const hourly = observationMode === "calendar"
          ? aggregateHourly(raw)
          : aggregateHourlyUTC(raw);

        const formattedDateKey = `${year}-${String(month + 1).padStart(2, "0")}-${String(date).padStart(2, "0")}`;

        if (daily.length > 0) {
          const matchedDaily = observationMode === "utc"
            ? daily.find(d => d.date === formattedDateKey) || daily[0]
            : daily[0];
          setReportData(matchedDaily);
        } else {
          const zeroData: WeatherRecord = {
            date: formattedDateKey,
            sampleCount: 0,
            temperatureAvg: 0, temperatureMin: 0, temperatureMax: 0,
            humidityAvg: 0, humidityMin: 0, humidityMax: 0,
            pressureAvg: 0, pressureMin: 0, pressureMax: 0,
            dewPointAvg: 0, windSpeedAvg: 0,
            rainfallTot: 0,
          };
          setReportData(zeroData);
        }

        // Build 24-hour distribution breakdown table
        let runningTotal = 0;
        const distItems: HourlyRainItem[] = [];

        if (observationMode === "calendar") {
          const targetDayKey = formatYMD(targetDate);
          for (let h = 0; h < 24; h++) {
            const hourStr = String(h).padStart(2, "0");
            const nextHourStr = String((h + 1) % 24).padStart(2, "0");
            const hourKey = `${targetDayKey}T${hourStr}`;
            const matched = hourly.find(item => item.hourKey === hourKey);
            const rainAmount = matched ? Math.max(0, matched.rainfallTot) : 0;
            runningTotal += rainAmount;

            const utcHour = (h + 17) % 24;
            const nextUtcHour = (h + 18) % 24;
            const isPrevDayUtc = h < 7;
            const utcLabel = `${String(utcHour).padStart(2, "0")}:00 – ${String(nextUtcHour).padStart(2, "0")}:00 UTC${isPrevDayUtc ? " (H-1)" : ""}`;
            const wibLabel = `${hourStr}:00 – ${nextHourStr}:00 WIB`;

            distItems.push({
              hourIndex: h,
              timeUTC: utcLabel,
              timeWIB: wibLabel,
              timeLabel: `${wibLabel} (${utcLabel})`,
              rainfall: Number(rainAmount.toFixed(2)),
              cumulativeRain: Number(runningTotal.toFixed(2)),
              category: getHourlyRainfallCategory(rainAmount),
              hasRain: rainAmount > 0,
            });
          }
        } else {
          // UTC Synoptic Standard (00:00 – 24:00 UTC / 07:00 – 07:00 WIB H+1)
          for (let h = 0; h < 24; h++) {
            const utcHour = h;
            const nextUtcHour = (h + 1) % 24;
            const wibHour = (h + 7) % 24;
            const nextWibHour = (wibHour + 1) % 24;
            const hourStr = String(utcHour).padStart(2, "0");
            const nextHourStr = String(nextUtcHour).padStart(2, "0");
            const hourKey = `${formattedDateKey}T${hourStr}`;
            const matched = hourly.find(item => item.hourKey === hourKey);
            const rainAmount = matched ? Math.max(0, matched.rainfallTot) : 0;
            runningTotal += rainAmount;

            const isNextDayWib = (h + 7) >= 24;
            const utcLabel = `${hourStr}:00 – ${nextHourStr}:00 UTC`;
            const wibLabel = `${String(wibHour).padStart(2, "0")}:00 – ${String(nextWibHour).padStart(2, "0")}:00 WIB${isNextDayWib ? " (H+1)" : ""}`;

            distItems.push({
              hourIndex: h,
              timeUTC: utcLabel,
              timeWIB: wibLabel,
              timeLabel: `${utcLabel} / ${wibLabel}`,
              rainfall: Number(rainAmount.toFixed(2)),
              cumulativeRain: Number(runningTotal.toFixed(2)),
              category: getHourlyRainfallCategory(rainAmount),
              hasRain: rainAmount > 0,
            });
          }
        }

        const effectiveRainHours = distItems.filter(h => h.rainfall >= 0.1).length;
        setRainStats({
          maxRainRate: Number(maxRate.toFixed(1)),
          peakHour: peakTime,
          rainDurationHours: effectiveRainHours,
        });

        setHourlyDistribution(distItems);
      } catch (e: any) {
        const msg = e?.message || "Gagal memuat data observasi.";
        setError(msg);
        setReportData(prev => ({ ...prev, rainfallTot: 0 }));
        setRainStats({ maxRainRate: 0, peakHour: "—", rainDurationHours: 0 });
        setHourlyDistribution([]);
        toast({ variant: "destructive", title: "Error", description: msg });
      } finally {
        setLoading(false);
      }
    };

    loadRainfallData();
  }, [sensorId, selectedDate, observationMode, calConfig, toast]);

  // Export handlers (PNG, PDF, Print)
  const handleExport = useCallback(async (type: 'png' | 'pdf' | 'print') => {
    const printableId = "laporan-hujan-printable";
    const reportEl = document.getElementById(printableId);
    if (!reportEl) {
      toast({ variant: "destructive", title: "Error", description: "Dokumen laporan belum siap diekspor." });
      return;
    }

    setIsExporting(true);
    toast({ title: "Memproses Dokumen...", description: "Menyiapkan berkas ekspor berkualitas tinggi." });

    try {
      const canvas = await generateCanvasFromDOM(printableId);
      if (!canvas) {
        throw new Error("Gagal merender dokumen ke kanvas gambar.");
      }

      const dateStr = formatYMD(selectedDate);
      const modeSuffix = observationMode === "utc" ? "UTC_00_24Z" : "WIB_Kalender";
      const filename = `Laporan_Curah_Hujan_${sensorName.replace(/\s+/g, '_')}_${dateStr}_${modeSuffix}`;

      if (type === 'png') {
        exportAsPNG(canvas, filename);
        toast({ title: "Berhasil", description: "Gambar laporan curah hujan berhasil diunduh (PNG)." });
      } else if (type === 'pdf') {
        exportAsPDF([canvas], filename, 'portrait');
        toast({ title: "Berhasil", description: "Dokumen PDF A4 laporan curah hujan berhasil disimpan." });
      } else if (type === 'print') {
        printCanvas(canvas, 'portrait');
        toast({ title: "Siap Cetak", description: "Membuka dialog cetak laporan cuaca." });
      }
    } catch (err: any) {
      console.error("Gagal melakukan ekspor laporan curah hujan!", err);
      toast({
        variant: "destructive",
        title: "Ekspor Gagal",
        description: err?.message || "Terjadi kesalahan saat mengekspor dokumen.",
      });
    } finally {
      setIsExporting(false);
    }
  }, [selectedDate, sensorName, observationMode, toast]);

  const rainfall = reportData?.rainfallTot ?? 0;
  const category = getDailyRainfallCategory(rainfall);
  const isRainCalibrated = calConfig && calConfig.enabled && calConfig.rainfall && calConfig.rainfall.enabled;

  const observationWindowLabel = observationMode === "utc"
    ? "00:00 – 24:00 UTC / 07:00 – 07:00 WIB (+1) (Standar Baku BMKG)"
    : "00:00 – 23:59 WIB (Hari Kalender Lokal)";

  // Publication text snippet for social media / bulletin
  const publicationCaption = useMemo(() => {
    if (!selectedDate) return "";
    const dateFormatted = format(selectedDate, "dd MMMM yyyy", { locale: id }).toUpperCase();
    const rainTot = rainfall.toFixed(1);
    const rainDesc = rainfall === 0 ? "Tidak ada hujan" : category;
    const modeDesc = observationMode === "utc" 
      ? "00:00 – 24:00 UTC / 07:00 – 07:00 WIB (+1) (Standar BMKG/WMO)" 
      : "00:00 – 23:59 WIB (Kalender Lokal)";

    return `LAPORAN AKUMULASI CURAH HUJAN HARIAN
Stasiun: ${sensorName}
Tanggal: ${dateFormatted}
Jendela Observasi: ${modeDesc}
Akumulasi 24 Jam: ${rainTot} mm (${rainDesc})
Intensitas Puncak: ${rainStats.maxRainRate.toFixed(1)} mm/jam (${rainStats.peakHour})
Durasi Jam Basah: ${rainStats.rainDurationHours} Jam`;
  }, [sensorName, selectedDate, rainfall, category, observationMode, rainStats]);

  return (
    <div className="space-y-6">
      {/* Top Filter and Observation Mode Toolbar */}
      <div className="no-print flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4 bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded-lg bg-sky-100 dark:bg-sky-950 text-sky-600">
              <CloudRain className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-800 dark:text-slate-100 flex items-center gap-2">
                Laporan Akumulasi Curah Hujan Harian
              </h3>
              <p className="text-xs text-slate-500">
                Analisis presipitasi 24 jam dengan klasifikasi BMKG, distribusi jam-jaman, dan sinkronisasi jendela waktu.
              </p>
            </div>
          </div>
        </div>

        <div className="flex flex-wrap sm:flex-nowrap items-center gap-3 w-full lg:w-auto">
          {/* Observation Window Mode Selector */}
          <div className="w-full sm:w-auto">
            <Select 
              value={observationMode} 
              onValueChange={(val: "utc" | "calendar") => setObservationMode(val)}
            >
              <SelectTrigger className="h-9 text-xs font-medium w-full sm:w-[270px] bg-slate-50 dark:bg-slate-800 border-slate-300 dark:border-slate-700">
                <CalendarClock className="w-3.5 h-3.5 mr-1.5 text-sky-600 shrink-0" />
                <SelectValue placeholder="Pilih Jendela Waktu" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="utc" className="text-xs">
                  Standar UTC (00:00 – 24:00 UTC) • Baku
                </SelectItem>
                <SelectItem value="calendar" className="text-xs">
                  Kalender Lokal (00:00 – 23:59 WIB)
                </SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Date Picker */}
          <Popover>
            <PopoverTrigger asChild>
              <Button
                id="date"
                variant="outline"
                className={cn(
                  "w-full sm:w-[210px] justify-start text-left font-normal h-9 text-xs bg-slate-50 dark:bg-slate-800 border-slate-300 dark:border-slate-700",
                  !selectedDate && "text-muted-foreground"
                )}
              >
                <CalendarIcon className="mr-2 h-3.5 w-3.5 text-slate-500 shrink-0" />
                <span className="truncate">
                  {selectedDate ? formatIdDateDash(selectedDate) : "Pilih tanggal"}
                </span>
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0 max-w-[calc(100vw-1.5rem)] shadow-2xl rounded-2xl border border-slate-200 dark:border-slate-800 overflow-hidden" align="end">
              <Calendar 
                mode="single"
                selected={selectedDate}
                onSelect={(date: Date | undefined) => date && setSelectedDate(date)}
                disabled={(date: Date) => date > new Date() || date < new Date("2000-01-01")}
                autoFocus
              />
            </PopoverContent>
          </Popover>
        </div>
      </div>

      {/* Observation Mode Context Banner */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 p-3 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg text-xs text-slate-600 dark:text-slate-300">
        <div className="flex items-center gap-2">
          <Info className="w-4 h-4 text-sky-600 shrink-0" />
          <span>
            {observationMode === "utc" ? (
              <>
                <strong>Standar Baku UTC (00:00 – 24:00 UTC):</strong> Curah hujan harian (RR) dihitung penuh sebagai total akumulasi 24 jam dalam 1 siklus UTC (07:00 WIB s/d 07:00 WIB H+1), sesuai standar resmi WMO dan BMKG.
              </>
            ) : (
              <>
                <strong>Kalender Lokal (00:00 – 23:59 WIB):</strong> Menghitung akumulasi presipitasi 00:00:00 – 23:59:59 WIB. Tepat sinkron dengan data <em>Laporan Cuaca Harian</em> dan <em>Ringkasan Bulanan</em>.
              </>
            )}
          </span>
        </div>
        <Badge variant="outline" className="text-[10px] font-mono shrink-0 bg-white dark:bg-slate-800 text-sky-700 dark:text-sky-300 border-sky-300">
          {observationMode === "utc" ? "UTC (00:00 – 24:00)" : "WIB (UTC+7)"}
        </Badge>
      </div>

      {isRainCalibrated && (
        <div className="flex items-center gap-2 p-3 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 rounded-lg text-xs text-emerald-800 dark:text-emerald-200">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
          <span>
            <strong>Mode Kalibrasi Aktif:</strong> Akumulasi curah hujan telah disesuaikan dengan faktor kalibrasi sensor ({calConfig?.rainfall?.method || "multiplier"}: {calConfig?.rainfall?.multiplier || calConfig?.rainfall?.scale || calConfig?.rainfall?.offset || 0}).
          </span>
        </div>
      )}

      {error && (
        <div className="no-print mx-auto max-w-xl text-red-700 text-center p-4 bg-red-50 dark:bg-red-950/50 border border-red-200 dark:border-red-800 rounded-md text-xs">
          {error}
        </div>
      )}

      {/* Main Meteorological Metric Overview Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="border-sky-100 bg-gradient-to-br from-sky-50/60 via-white to-white dark:from-slate-900 dark:to-slate-800">
          <CardContent className="p-4 space-y-1.5">
            <div className="flex justify-between items-center text-xs font-semibold text-sky-700 dark:text-sky-400">
              <span className="flex items-center gap-1.5">
                <CloudRain className="w-4 h-4 text-sky-500" /> Akumulasi 24 Jam
              </span>
              <Badge variant="outline" className="text-[10px] bg-sky-50 text-sky-700 dark:bg-sky-950 dark:text-sky-300">
                Presipitasi
              </Badge>
            </div>
            <div className="text-3xl font-black text-sky-600 dark:text-sky-400 font-mono">
              {rainfall.toFixed(1)} <span className="text-sm font-normal text-slate-500">mm</span>
            </div>
            <div className="text-xs text-slate-500 pt-1 border-t border-slate-100 dark:border-slate-800 truncate">
              Kategori: <strong className="text-slate-700 dark:text-slate-300">{category}</strong>
            </div>
          </CardContent>
        </Card>

        <Card className="border-indigo-100 bg-gradient-to-br from-indigo-50/60 via-white to-white dark:from-slate-900 dark:to-slate-800">
          <CardContent className="p-4 space-y-1.5">
            <div className="flex justify-between items-center text-xs font-semibold text-indigo-700 dark:text-indigo-400">
              <span className="flex items-center gap-1.5">
                <Activity className="w-4 h-4 text-indigo-500" /> Intensitas Puncak
              </span>
              <Badge variant="outline" className="text-[10px] bg-indigo-50 text-indigo-700 dark:bg-indigo-950 dark:text-indigo-300">
                Maksimum
              </Badge>
            </div>
            <div className="text-3xl font-black text-indigo-600 dark:text-indigo-400 font-mono">
              {rainStats.maxRainRate.toFixed(1)} <span className="text-sm font-normal text-slate-500">mm/jam</span>
            </div>
            <div className="text-xs text-slate-500 pt-1 border-t border-slate-100 dark:border-slate-800">
              Laju presipitasi tertinggi tercatat
            </div>
          </CardContent>
        </Card>

        <Card className="border-teal-100 bg-gradient-to-br from-teal-50/60 via-white to-white dark:from-slate-900 dark:to-slate-800">
          <CardContent className="p-4 space-y-1.5">
            <div className="flex justify-between items-center text-xs font-semibold text-teal-700 dark:text-teal-400">
              <span className="flex items-center gap-1.5">
                <Clock className="w-4 h-4 text-teal-500" /> Durasi Kejadian
              </span>
              <Badge variant="outline" className="text-[10px] bg-teal-50 text-teal-700 dark:bg-teal-950 dark:text-teal-300">
                Jam Basah
              </Badge>
            </div>
            <div className="text-3xl font-black text-teal-600 dark:text-teal-400 font-mono">
              {rainStats.rainDurationHours} <span className="text-sm font-normal text-slate-500">Jam</span>
            </div>
            <div className="text-xs text-slate-500 pt-1 border-t border-slate-100 dark:border-slate-800">
              Total durasi hujan efektif (≥ 0.05 mm)
            </div>
          </CardContent>
        </Card>

        <Card className="border-amber-100 bg-gradient-to-br from-amber-50/60 via-white to-white dark:from-slate-900 dark:to-slate-800">
          <CardContent className="p-4 space-y-1.5">
            <div className="flex justify-between items-center text-xs font-semibold text-amber-700 dark:text-amber-400">
              <span className="flex items-center gap-1.5">
                <ShieldCheck className="w-4 h-4 text-amber-500" /> Waktu Puncak
              </span>
              <Badge variant="outline" className="text-[10px] bg-amber-50 text-amber-700 dark:bg-amber-950 dark:text-amber-300">
                Terlebat
              </Badge>
            </div>
            <div className="text-2xl font-black text-slate-900 dark:text-slate-100 pt-1 font-mono">
              {rainStats.peakHour}
            </div>
            <div className="text-xs text-slate-500 pt-1 border-t border-slate-100 dark:border-slate-800">
              Waktu kejadian intensitas maksimum
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Tabs Navigation: Ergonomics Anti-Long-Scroll convention (AGENTS.md Section 2) */}
      <Tabs defaultValue="overview" className="w-full">
        <TabsList className="grid grid-cols-3 max-w-md bg-slate-100 dark:bg-slate-800">
          <TabsTrigger value="overview" className="text-xs">
            Ringkasan & Publikasi
          </TabsTrigger>
          <TabsTrigger value="hourly" className="text-xs">
            Distribusi Per Jam
          </TabsTrigger>
          <TabsTrigger value="document" className="text-xs">
            Dokumen Cetak / Poster
          </TabsTrigger>
        </TabsList>

        {/* TAB 1: OVERVIEW & PUBLICATION */}
        <TabsContent value="overview" className="space-y-6 pt-4">
          <ReportPublicationCard 
            title="Ringkasan Teks Publikasi Curah Hujan"
            subtitle="Salin ringkasan presipitasi 24 jam dengan klasifikasi standar BMKG untuk media sosial dan buletin."
            text={publicationCaption} 
          />

          {/* Reference Classification Card */}
          <Card className="border-slate-200 dark:border-slate-800">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-bold flex items-center gap-2">
                <Layers className="w-4 h-4 text-blue-600" />
                Standar Klasifikasi Curah Hujan Harian BMKG
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 text-xs">
                <div className="p-3 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50 space-y-1">
                  <div className="font-semibold text-slate-700 dark:text-slate-300">Tidak Ada Hujan / Cerah</div>
                  <div className="text-slate-500 font-mono">0.0 mm/hari</div>
                  <p className="text-[11px] text-slate-400">Kondisi kering tanpa ada curahan air terukur.</p>
                </div>
                <div className="p-3 rounded-lg border border-sky-200 dark:border-sky-900 bg-sky-50/40 dark:bg-sky-950/30 space-y-1">
                  <div className="font-semibold text-sky-700 dark:text-sky-300">Hujan Sangat Ringan</div>
                  <div className="text-sky-600 font-mono">&lt; 5.0 mm/hari</div>
                  <p className="text-[11px] text-slate-400">Presipitasi rintik-rintik berdurasi singkat.</p>
                </div>
                <div className="p-3 rounded-lg border border-blue-200 dark:border-blue-900 bg-blue-50/40 dark:bg-blue-950/30 space-y-1">
                  <div className="font-semibold text-blue-700 dark:text-blue-300">Hujan Ringan</div>
                  <div className="text-blue-600 font-mono">5.0 – 20.0 mm/hari</div>
                  <p className="text-[11px] text-slate-400">Gerimis stabil atau hujan bertahap ringan.</p>
                </div>
                <div className="p-3 rounded-lg border border-indigo-200 dark:border-indigo-900 bg-indigo-50/40 dark:bg-indigo-950/30 space-y-1">
                  <div className="font-semibold text-indigo-700 dark:text-indigo-300">Hujan Sedang</div>
                  <div className="text-indigo-600 font-mono">20.0 – 50.0 mm/hari</div>
                  <p className="text-[11px] text-slate-400">Hujan cukup basah, pembasahan tanah menyeluruh.</p>
                </div>
                <div className="p-3 rounded-lg border border-amber-200 dark:border-amber-900 bg-amber-50/40 dark:bg-amber-950/30 space-y-1">
                  <div className="font-semibold text-amber-700 dark:text-amber-300">Hujan Lebat</div>
                  <div className="text-amber-600 font-mono">50.0 – 100.0 mm/hari</div>
                  <p className="text-[11px] text-slate-400">Hujan deras terus-menerus, potensi genangan air.</p>
                </div>
                <div className="p-3 rounded-lg border border-red-200 dark:border-red-900 bg-red-50/40 dark:bg-red-950/30 space-y-1">
                  <div className="font-semibold text-red-700 dark:text-red-300">Hujan Sangat Lebat & Ekstrem</div>
                  <div className="text-red-600 font-mono">&gt; 100.0 mm/hari</div>
                  <p className="text-[11px] text-slate-400">Waspada bahaya hidrometeorologi (banjir & longsor).</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* TAB 2: HOURLY BREAKDOWN TABLE */}
        <TabsContent value="hourly" className="space-y-4 pt-4">
          <Card className="border-slate-200 dark:border-slate-800">
            <CardHeader className="pb-3 flex flex-row items-center justify-between">
              <div>
                <CardTitle className="text-sm font-bold flex items-center gap-2">
                  <Clock className="w-4 h-4 text-sky-600" />
                  Distribusi Presipitasi Per Jam (24 Jam)
                </CardTitle>
                <p className="text-xs text-slate-500 mt-0.5">
                  Rincian akumulasi dan laju presipitasi setiap jam untuk mendeteksi awal kejadian dan pola puncak hujan.
                </p>
              </div>
              <Badge variant="outline" className="text-xs font-mono">
                Total: {rainfall.toFixed(1)} mm
              </Badge>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="py-12 text-center text-xs text-slate-500 animate-pulse">
                  Memuat data distribusi presipitasi per jam...
                </div>
              ) : hourlyDistribution.length === 0 ? (
                <div className="py-12 text-center text-xs text-slate-400">
                  Tidak ada rekaman data untuk tanggal yang dipilih.
                </div>
              ) : (
                <div className="border rounded-lg overflow-hidden">
                  <Table>
                    <TableHeader className="bg-slate-50 dark:bg-slate-800/80">
                      <TableRow>
                        <TableHead className="w-[50px] text-center font-bold text-xs">No</TableHead>
                        <TableHead className="font-bold text-xs">Waktu UTC</TableHead>
                        <TableHead className="font-bold text-xs">Waktu Lokal (WIB)</TableHead>
                        <TableHead className="text-right font-bold text-xs">Curah Hujan (mm)</TableHead>
                        <TableHead className="text-right font-bold text-xs">Kumulatif 24 Jam (mm)</TableHead>
                        <TableHead className="text-center font-bold text-xs">Klasifikasi</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {hourlyDistribution.map((item) => (
                        <TableRow 
                          key={item.hourIndex} 
                          className={cn(
                            "text-xs transition-colors",
                            item.hasRain 
                              ? "bg-blue-50/60 dark:bg-blue-950/30 font-medium" 
                              : "hover:bg-slate-50/50 dark:hover:bg-slate-800/40"
                          )}
                        >
                          <TableCell className="text-center font-mono text-slate-400">
                            {String(item.hourIndex + 1).padStart(2, "0")}
                          </TableCell>
                          <TableCell className="font-mono text-slate-800 dark:text-slate-200">
                            {item.timeUTC}
                          </TableCell>
                          <TableCell className="font-mono text-slate-600 dark:text-slate-400">
                            {item.timeWIB}
                          </TableCell>
                          <TableCell className="text-right font-mono font-bold">
                            {item.rainfall > 0 ? (
                              <span className="text-blue-600 dark:text-blue-400">
                                {item.rainfall.toFixed(2)}
                              </span>
                            ) : (
                              <span className="text-slate-400 font-normal">0.00</span>
                            )}
                          </TableCell>
                          <TableCell className="text-right font-mono text-slate-600 dark:text-slate-400">
                            {item.cumulativeRain.toFixed(2)}
                          </TableCell>
                          <TableCell className="text-center">
                            <Badge 
                              variant="outline" 
                              className={cn("text-[10px] font-semibold", getHourlyCategoryBadgeClass(item.rainfall))}
                            >
                              {item.category}
                            </Badge>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* TAB 3: PRINTABLE POSTER / OFFICIAL REPORT */}
        <TabsContent value="document" className="space-y-6 pt-4">
          {/* Export Action Buttons */}
          <div className="flex flex-wrap items-center justify-end gap-2.5">
            <Button
              variant="outline"
              size="sm"
              className="text-xs h-9 gap-1.5 border-slate-300 dark:border-slate-700"
              onClick={() => handleExport('png')}
              disabled={loading || isExporting}
            >
              <FileImage className="w-3.5 h-3.5 text-blue-600" />
              Unduh PNG
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="text-xs h-9 gap-1.5 border-slate-300 dark:border-slate-700"
              onClick={() => handleExport('pdf')}
              disabled={loading || isExporting}
            >
              <FileType className="w-3.5 h-3.5 text-rose-600" />
              Unduh PDF A4
            </Button>
            <Button
              size="sm"
              className="text-xs h-9 gap-1.5 bg-blue-600 hover:bg-blue-700 text-white font-semibold"
              onClick={() => handleExport('print')}
              disabled={loading || isExporting}
            >
              <Printer className="w-3.5 h-3.5" />
              Cetak Laporan
            </Button>
          </div>

          {/* Standard Official Printable Document Container (AGENTS.md Section 5 Compliance) */}
          <div className="flex justify-center p-4 sm:p-6 bg-slate-100 dark:bg-slate-950 rounded-2xl border border-slate-200 dark:border-slate-800 overflow-x-auto shadow-inner">
            <div 
              ref={printableReportRef} 
              id="laporan-hujan-printable"
              className="w-full max-w-[680px] bg-white text-slate-900 shadow-xl rounded-2xl border border-slate-200 p-8 flex flex-col justify-between aspect-square shrink-0"
              style={{ minHeight: '680px' }}
            >
              {/* Kop Surat Resmi Instansi (AGENTS.md Section 5) */}
              <header className="border-b-4 border-slate-800 pb-4">
                <div className="flex items-center justify-between gap-4">
                  <div className="flex items-center gap-3.5">
                    <img 
                      src="/img/logo.webp" 
                      alt="Logo Jerukagung AWS" 
                      width={56} 
                      height={56} 
                      className="h-14 w-14 object-contain shrink-0"
                      crossOrigin="anonymous"
                    />
                    <div>
                      <div className="text-[11px] font-bold tracking-[0.18em] text-slate-600 uppercase">
                        Jerukagung Meteorologi • Automatic Weather Station
                      </div>
                      <h1 className="text-xl font-black tracking-tight text-slate-900 uppercase mt-0.5">
                        Laporan Pengamatan Curah Hujan Harian
                      </h1>
                    </div>
                  </div>

                  {/* Right-side Document Metadata Panel */}
                  <div className="text-right text-[11px] text-slate-500 font-mono hidden sm:block shrink-0">
                    <div>Tanggal: <strong>{format(selectedDate, "dd/MM/yyyy")}</strong></div>
                    <div>Stasiun: <strong>{sensorName}</strong></div>
                    <div>Standar: <strong>{observationMode === "utc" ? "UTC (00-24Z)" : "WIB (00-24)"}</strong></div>
                  </div>
                </div>

                {/* Decorative Color Gradient Stripe (AGENTS.md Section 5) */}
                <div className="w-28 h-1.5 bg-gradient-to-r from-orange-400 via-sky-400 to-blue-500 mt-3 rounded-full" />
              </header>

              {/* Main Body: Rain Gauge Cylinder & Statistics */}
              <div className="flex-grow flex flex-col items-center justify-center my-4 text-center">
                {loading ? (
                  <div className="text-slate-400 text-xs py-12 animate-pulse">
                    Memproses kalkulasi akumulasi presipitasi...
                  </div>
                ) : (
                  <>
                    <div className="text-xs font-bold uppercase tracking-wider text-slate-500">
                      {observationMode === "utc"
                        ? "Total Akumulasi Presipitasi 24 Jam (Standar UTC 00:00 – 24:00 UTC)"
                        : "Total Akumulasi Presipitasi 24 Jam (Standar Kalender Lokal 00:00 – 23:59 WIB)"}
                    </div>
                    <div className="text-xs text-slate-400 font-mono mt-0.5">
                      {format(selectedDate, "EEEE, dd MMMM yyyy", { locale: id })} • {observationWindowLabel}
                    </div>

                    {/* Rain Measuring Cup Cylinder */}
                    <div className="my-4">
                      <RainMeasuringCup value={rainfall} />
                    </div>

                    {/* Big Metric Display */}
                    <div className="text-5xl font-black text-blue-600 font-mono tracking-tight">
                      {rainfall.toFixed(1)} <span className="text-2xl font-semibold text-slate-500 align-middle">mm</span>
                    </div>

                    <div className={cn(
                      "mt-2 text-sm font-bold px-3 py-1 rounded-full border inline-block",
                      rainfall > 0 
                        ? "bg-blue-50 text-blue-800 border-blue-200" 
                        : "bg-slate-50 text-slate-600 border-slate-200"
                    )}>
                      Klasifikasi BMKG: {category}
                    </div>

                    {/* Mini Stat Badges in Printable Container */}
                    <div className="grid grid-cols-3 gap-3 w-full mt-6 pt-4 border-t border-slate-100 text-xs">
                      <div className="p-2 rounded-lg bg-slate-50 border border-slate-100 text-center">
                        <span className="text-[10px] text-slate-400 uppercase font-semibold block">Intensitas Puncak</span>
                        <strong className="text-slate-800 font-mono text-sm">{rainStats.maxRainRate.toFixed(1)} mm/jam</strong>
                      </div>
                      <div className="p-2 rounded-lg bg-slate-50 border border-slate-100 text-center">
                        <span className="text-[10px] text-slate-400 uppercase font-semibold block">Durasi Hujan</span>
                        <strong className="text-slate-800 font-mono text-sm">{rainStats.rainDurationHours} Jam</strong>
                      </div>
                      <div className="p-2 rounded-lg bg-slate-50 border border-slate-100 text-center">
                        <span className="text-[10px] text-slate-400 uppercase font-semibold block">Waktu Terlebat</span>
                        <strong className="text-slate-800 font-mono text-sm">{rainStats.peakHour}</strong>
                      </div>
                    </div>
                  </>
                )}
              </div>

              {/* Standard Document Footer (AGENTS.md Section 5) */}
              <footer className="border-t border-slate-200 pt-3 text-[10px] text-slate-400 flex flex-col sm:flex-row items-center justify-between gap-1 text-center sm:text-left">
                <div>
                  Sumber Data: AWS MeteoSense • Stasiun: <strong>{sensorName}</strong>
                </div>
                <div>
                  Diterbitkan otomatis oleh sistem {APP_CONFIG.name} {APP_CONFIG.version} • Sah tanpa tanda tangan basah
                </div>
              </footer>
            </div>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
