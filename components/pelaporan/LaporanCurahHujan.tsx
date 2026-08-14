"use client"

import { useEffect, useRef, useState, useCallback } from "react"
import { Download, Calendar as CalendarIcon, CloudRain, Clock, Activity, CheckCircle2, ShieldCheck } from "lucide-react"
import html2canvas from 'html2canvas';
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card"
import { cn } from "@/lib/utils"
import { fetchSensorDataByDateRange } from "@/lib/apiClient"
import { useToast } from "@/hooks/use-toast"
import { WeatherRecord, aggregateDailyUTC, formatIdDateDash } from "@/lib/weatherUtils"
import { Popover, PopoverTrigger, PopoverContent } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { getCalibrationDocument } from "@/lib/calibration/calibrationCrud";
import { applyCalibrationToSeries } from "@/lib/calibration/calibrationEngine";
import type { StationCalibrationDocument } from "@/lib/calibration/calibrationTypes";

// --- Helper UI: Rain Measuring Cup ---
const RainMeasuringCup = ({ value, maxValue = 100, unit = "mm" }: { value: number, maxValue?: number, unit?: string }) => {
  const safeValue = isNaN(value) || value < 0 ? 0 : value;
  const visualValue = (safeValue >= 0 && safeValue < 1) ? 1 : safeValue;
  const percentage = Math.min((visualValue / maxValue) * 100, 100);
  const ticks = [100, 75, 50, 25, 0];

  return (
    <div className="flex items-end gap-4 py-2">
      <div className="flex flex-col justify-between h-56 text-sm text-slate-500 font-mono font-medium py-1 text-right">
        {ticks.map((tick) => <span key={tick} className="leading-none">{tick}</span>)}
      </div>

      <div className="relative w-24 h-56">
        <div className="absolute inset-0 z-0 bg-slate-100/50 rounded-b-3xl border-2 border-slate-300 dark:border-slate-700 dark:bg-slate-800/40"></div>
        <div className="absolute inset-[3px] z-10 rounded-b-[22px] overflow-hidden flex items-end">
          <div
            className="liquid-bar w-full relative transition-all duration-1000 ease-in-out bg-gradient-to-t from-blue-600 via-sky-500 to-cyan-300"
            style={{ height: `${percentage}%` }}
          >
            <div className="absolute -top-px left-0 right-0 h-0.5 bg-white/90"></div>
          </div>
        </div>

        <div className="absolute inset-0 z-20 flex flex-col justify-between py-1 px-2 pointer-events-none">
          {ticks.map((tick, index) => (
            <div key={index} className="relative h-px bg-slate-400/30">
              <span className="absolute -left-2 top-1/2 -translate-y-1/2 w-1.5 h-px bg-slate-500/60"></span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

const getDailyRainfallCategory = (amount: number) => {
  if (amount === 0) return "Tidak Ada Hujan";
  if (amount <= 5) return "Hujan Sangat Ringan";
  if (amount <= 20) return "Hujan Ringan";
  if (amount <= 50) return "Hujan Sedang";
  if (amount <= 100) return "Hujan Lebat";
  if (amount <= 150) return "Hujan Sangat Lebat";
  return "Hujan Ekstrem";
};

export default function LaporanCurahHujan({ sensorId, sensorName, displayName }: { sensorId: string, sensorName: string, displayName: string }) {
  const { toast } = useToast();
  
  const [reportData, setReportData] = useState<WeatherRecord>({
    date: new Date().toISOString().split('T')[0],
    sampleCount: 0,
    temperatureAvg: 0, temperatureMin: 0, temperatureMax: 0,
    humidityAvg: 0, humidityMin: 0, humidityMax: 0,
    pressureAvg: 0, pressureMin: 0, pressureMax: 0,
    dewPointAvg: 0, windSpeedAvg: 0,
    rainfallTot: 0,
  });

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [calConfig, setCalConfig] = useState<StationCalibrationDocument | null>(null);
  const [rainStats, setRainStats] = useState<{
    maxRainRate: number;
    peakHour: string;
    rainDurationHours: number;
  }>({ maxRainRate: 0, peakHour: "—", rainDurationHours: 0 });

  const [selectedDate, setSelectedDate] = useState<Date>(() => {
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    return yesterday;
  });

  // Load calibration doc on sensorId change
  useEffect(() => {
    if (sensorId) {
      getCalibrationDocument(sensorId).then((config) => {
        setCalConfig(config);
      });
    }
  }, [sensorId]);

  useEffect(() => {
    const loadRainfallData = async () => {
      if (!sensorId || !selectedDate) return;
      setLoading(true);
      setError(null);

      try {
        const targetDate = selectedDate;
        const startUTC = new Date(Date.UTC(targetDate.getFullYear(), targetDate.getMonth(), targetDate.getDate(), 0, 0, 0, 0));
        const endUTC = new Date(Date.UTC(targetDate.getFullYear(), targetDate.getMonth(), targetDate.getDate(), 23, 59, 59, 999));

        let raw = await fetchSensorDataByDateRange(sensorId, startUTC.getTime(), endUTC.getTime());
        
        // Apply calibration if active
        if (calConfig && calConfig.enabled && raw && raw.length > 0) {
          raw = applyCalibrationToSeries(raw, calConfig);
        }

        // Calculate advanced rain stats (Max Rainrate, Duration, Peak Hour)
        if (raw && raw.length > 0) {
          let maxRate = 0;
          let peakTime = "—";
          const rainyHourSet = new Set<number>();

          raw.forEach((r) => {
            const rRate = r.rainrate || r.rainfall || 0;
            if (rRate > maxRate) {
              maxRate = rRate;
              const d = new Date(r.timestamp);
              peakTime = `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")} WIB`;
            }
            if ((r.rainfall || 0) > 0.05 || (r.rainrate || 0) > 0.05) {
              rainyHourSet.add(new Date(r.timestamp).getHours());
            }
          });

          setRainStats({
            maxRainRate: Number(maxRate.toFixed(1)),
            peakHour: peakTime,
            rainDurationHours: rainyHourSet.size,
          });
        } else {
          setRainStats({ maxRainRate: 0, peakHour: "—", rainDurationHours: 0 });
        }

        const daily = aggregateDailyUTC(raw);

        if (daily.length > 0) {
          setReportData(daily[0]);
        } else {
          const zeroData: WeatherRecord = {
            date: targetDate.toISOString().split('T')[0],
            sampleCount: 0,
            temperatureAvg: 0, temperatureMin: 0, temperatureMax: 0,
            humidityAvg: 0, humidityMin: 0, humidityMax: 0,
            pressureAvg: 0, pressureMin: 0, pressureMax: 0,
            dewPointAvg: 0, windSpeedAvg: 0,
            rainfallTot: 0,
          };
          setReportData(zeroData);
        }
      } catch (e: any) {
        const msg = e?.message || "Gagal memuat data.";
        setError(msg);
        setReportData(prev => ({ ...prev, rainfallTot: 0 }));
        toast({ variant: "destructive", title: "Error", description: msg });
      } finally {
        setLoading(false);
      }
    };

    loadRainfallData();
  }, [sensorId, selectedDate, calConfig, toast]);

  const componentRef = useRef<HTMLElement>(null);

  const handleDownloadImage = useCallback(() => {
    if (componentRef.current === null) {
      toast({ variant: "destructive", title: "Error", description: "Komponen laporan tidak ditemukan." });
      return;
    }

    toast({ title: "Membuat Gambar...", description: "Mohon tunggu sebentar." });

    setTimeout(() => {
      html2canvas(componentRef.current as HTMLElement, {
        useCORS: true,
        scale: 3,
        backgroundColor: null,
        onclone: (clonedDoc) => {
          const liquidBars = clonedDoc.getElementsByClassName('liquid-bar');
          for (let i = 0; i < liquidBars.length; i++) {
            (liquidBars[i] as HTMLElement).style.transition = 'none';
          }
        }
      })
      .then((canvas) => {
        const dataUrl = canvas.toDataURL('image/png');
        const link = document.createElement('a');
        const dateStr = selectedDate.toISOString().split('T')[0];
        link.download = `laporan-hujan-${sensorName.replace(/\s+/g, '_')}-${dateStr}.png`;
        link.href = dataUrl;
        link.click();
        toast({ 
          title: "Berhasil", 
          description: "Gambar laporan curah hujan berhasil diunduh." 
        });
      })
      .catch((err) => {
        console.error('Gagal membuat gambar!', err);
        toast({
          variant: "destructive",
          title: "Gagal Mengunduh Gambar",
          description: "Terjadi kesalahan saat membuat gambar.",
        });
      });
    }, 100);
  }, [componentRef, selectedDate, sensorName, toast]);

  const rainfall = reportData?.rainfallTot ?? 0;
  const category = getDailyRainfallCategory(rainfall);
  const isRainCalibrated = calConfig && calConfig.enabled && calConfig.rainfall && calConfig.rainfall.enabled;

  return (
    <div className="space-y-6">
      {/* Top Filter Bar */}
      <div className="no-print flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200 dark:border-slate-800">
        <div>
          <h3 className="text-sm font-bold text-slate-800 dark:text-slate-200 flex items-center gap-2">
            <CloudRain className="w-4 h-4 text-sky-600" />
            Laporan Akumulasi Curah Hujan Harian
          </h3>
          <p className="text-xs text-slate-500 mt-0.5">
            Analisis presipitasi 24 jam dengan klasifikasi standar BMKG dan metrik intensitas puncak.
          </p>
        </div>

        <div className="flex items-center gap-3 w-full sm:w-auto justify-end">
          <Popover>
            <PopoverTrigger asChild>
              <Button
                id="date"
                variant={"outline"}
                className={cn("w-full sm:w-[220px] justify-start text-left font-normal h-9 text-xs", !selectedDate && "text-muted-foreground")}
              >
                <CalendarIcon className="mr-2 h-3.5 w-3.5 text-slate-500" />
                {selectedDate ? formatIdDateDash(selectedDate) : <span>Pilih tanggal</span>}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="end">
              <Calendar 
                mode="single"
                selected={selectedDate}
                onSelect={(date: Date | undefined) => date && setSelectedDate(date)}
                disabled={(date: Date) => date > new Date() || date < new Date("2000-01-01")}
                autoFocus
              />
            </PopoverContent>
          </Popover>

          <Button className="bg-blue-600 hover:bg-blue-700 text-white h-9 text-xs font-semibold" onClick={handleDownloadImage} disabled={loading}>
            <Download className="mr-1.5 h-3.5 w-3.5" /> Unduh Gambar
          </Button>
        </div>
      </div>

      {isRainCalibrated && (
        <div className="flex items-center gap-2 p-3 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 rounded-lg text-xs text-emerald-800 dark:text-emerald-200">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
          <span>
            <strong>Mode Kalibrasi Aktif:</strong> Akumulasi curah hujan telah disesuaikan dengan faktor kalibrasi sensor ({calConfig.rainfall?.method}: {calConfig.rainfall?.multiplier || calConfig.rainfall?.scale || calConfig.rainfall?.offset || 0}).
          </span>
        </div>
      )}

      {error && <div className="no-print mx-auto mb-3 max-w-xl text-red-700 text-center p-4 bg-red-50 rounded-md text-xs">{error}</div>}

      {/* Meteorological Statistics Summary Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="border-sky-100 bg-gradient-to-br from-sky-50/50 via-white to-white dark:from-slate-900 dark:to-slate-800">
          <CardContent className="p-4 space-y-1.5">
            <div className="flex justify-between items-center text-xs font-semibold text-sky-700">
              <span className="flex items-center gap-1.5"><CloudRain className="w-4 h-4 text-sky-500" /> Akumulasi 24 Jam</span>
              <Badge variant="outline" className="text-[10px] bg-sky-50 text-sky-700">Presipitasi</Badge>
            </div>
            <div className="text-3xl font-black text-sky-600">
              {rainfall.toFixed(1)} <span className="text-sm font-normal text-slate-500">mm</span>
            </div>
            <div className="text-xs text-slate-500 pt-1 border-t">
              Kategori: <strong className="text-slate-700 dark:text-slate-300">{category}</strong>
            </div>
          </CardContent>
        </Card>

        <Card className="border-indigo-100 bg-gradient-to-br from-indigo-50/50 via-white to-white dark:from-slate-900 dark:to-slate-800">
          <CardContent className="p-4 space-y-1.5">
            <div className="flex justify-between items-center text-xs font-semibold text-indigo-700">
              <span className="flex items-center gap-1.5"><Activity className="w-4 h-4 text-indigo-500" /> Intensitas Puncak</span>
              <Badge variant="outline" className="text-[10px] bg-indigo-50 text-indigo-700">Maksimum</Badge>
            </div>
            <div className="text-3xl font-black text-indigo-600">
              {rainStats.maxRainRate.toFixed(1)} <span className="text-sm font-normal text-slate-500">mm/jam</span>
            </div>
            <div className="text-xs text-slate-500 pt-1 border-t">
              Laju presipitasi maksimum tercatat
            </div>
          </CardContent>
        </Card>

        <Card className="border-teal-100 bg-gradient-to-br from-teal-50/50 via-white to-white dark:from-slate-900 dark:to-slate-800">
          <CardContent className="p-4 space-y-1.5">
            <div className="flex justify-between items-center text-xs font-semibold text-teal-700">
              <span className="flex items-center gap-1.5"><Clock className="w-4 h-4 text-teal-500" /> Durasi Kejadian</span>
              <Badge variant="outline" className="text-[10px] bg-teal-50 text-teal-700">Jam Basah</Badge>
            </div>
            <div className="text-3xl font-black text-teal-600">
              {rainStats.rainDurationHours} <span className="text-sm font-normal text-slate-500">Jam</span>
            </div>
            <div className="text-xs text-slate-500 pt-1 border-t">
              Total durasi hujan efektif (≥ 0.1 mm)
            </div>
          </CardContent>
        </Card>

        <Card className="border-amber-100 bg-gradient-to-br from-amber-50/50 via-white to-white dark:from-slate-900 dark:to-slate-800">
          <CardContent className="p-4 space-y-1.5">
            <div className="flex justify-between items-center text-xs font-semibold text-amber-700">
              <span className="flex items-center gap-1.5"><ShieldCheck className="w-4 h-4 text-amber-500" /> Waktu Puncak</span>
              <Badge variant="outline" className="text-[10px] bg-amber-50 text-amber-700">Maksimal</Badge>
            </div>
            <div className="text-2xl font-black text-slate-900 dark:text-slate-100 pt-1">
              {rainStats.peakHour}
            </div>
            <div className="text-xs text-slate-500 pt-1 border-t">
              Waktu kejadian intensitas terlebat
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Main Visual Infographic Canvas */}
      <main ref={componentRef} className="mx-auto my-0 mb-6 w-full max-w-xl aspect-square bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 shadow-lg print:shadow-none relative overflow-hidden flex flex-col justify-between p-6 rounded-2xl border border-slate-200 dark:border-slate-800">
        <header className="relative z-10 border-b border-slate-100 dark:border-slate-800 pb-3">
          <div className="flex items-center gap-4">
            <img 
              src="/img/logo.webp" 
              alt="Logo" 
              width={52} 
              height={52} 
              className="h-12 w-12 object-contain" 
            />
            <div>
              <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Laporan Pengamatan Curah Hujan Harian</div>
              <div className="text-lg font-bold text-slate-900 dark:text-slate-100 uppercase tracking-wide">Stasiun Meteorologi Jerukagung</div>
            </div>
          </div>
        </header>

        <div className="relative z-10 flex-grow flex flex-col items-center justify-center text-center my-4">
          {loading ? (
            <section className="text-center text-slate-500 py-10 animate-pulse text-xs">Memproses data observasi...</section>
          ) : (
            <>
              <h2 className="text-sm font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">Akumulasi Presipitasi 24 Jam</h2>
              <p className="text-xs text-slate-500 mt-0.5">{formatIdDateDash(selectedDate)} (00:00 – 23:59 UTC)</p>
              <div className="my-5">
                <RainMeasuringCup value={rainfall} />
              </div>
              <div className="text-5xl font-black text-blue-600 dark:text-blue-400 font-mono">
                {rainfall.toFixed(2)} <span className="text-3xl font-medium text-slate-500 align-middle">mm</span>
              </div>
              <div className={cn("mt-2 text-base font-bold", rainfall > 0 ? "text-blue-800 dark:text-blue-300" : "text-slate-600 dark:text-slate-400")}>
                Klasifikasi BMKG: {category}
              </div>
            </>
          )}
        </div>

        <footer className="relative z-10 text-center border-t border-slate-100 dark:border-slate-800 pt-3">
          <p className="text-xs text-slate-400 font-medium">
            Stasiun: {sensorName} • Meteo Sense 4.0.0
          </p>
        </footer>
      </main>
    </div>
  );
}