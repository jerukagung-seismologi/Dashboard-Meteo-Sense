"use client"

import { useEffect, useRef, useState, useMemo } from "react"
import { 
  FileImage, 
  FileType, 
  Printer, 
  Download, 
  ThermometerSun, 
  Droplets, 
  Gauge, 
  CalendarIcon, 
  Loader2,
  CloudRain,
  Eye,
  LayoutDashboard,
  Sparkles,
  CheckCircle2,
  AlertCircle
} from "lucide-react"
import { type DateRange } from "react-day-picker"
import dynamic from "next/dynamic"
import { Calendar } from "@/components/ui/calendar"
import { Popover, PopoverTrigger, PopoverContent } from "@/components/ui/popover"
import { Button } from "@/components/ui/button"
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"
import { fetchSensorDataByDateRange } from "@/lib/apiClient"
import { useToast } from "@/hooks/use-toast"
import {
  WeatherRecord,
  aggregateDaily,
  formatIdDateShort,
  formatIdDateDash,
  formatYMD,
  exportToCSV,
} from "@/lib/weatherUtils"
import { format } from "date-fns"
import { id } from "date-fns/locale"
import { PrintLayout } from "./PrintLayout"
import { generateCanvasFromDOM, exportAsPNG, exportAsJPEG, exportAsPDF, printCanvas } from "@/lib/exportUtils"
import { 
  CorrectionOffsets, 
  applyCorrectionToDailyRecords 
} from "@/lib/reanalysis/era5Correction"
import { ERA5CorrectionPanel } from "./ERA5CorrectionPanel"

const ReactECharts = dynamic(() => import("echarts-for-react"), { ssr: false });

// Interactive Triple Line Chart for Web Dashboard
const TripleLineChart = ({ data, dataKeyMax, dataKeyMin, dataKeyAvg, name, colorMax, colorMin, colorAvg, unit, height = "300px" }: any) => {
  const dates = data.map((d: any) => {
    try {
      const parts = d.date.split('-');
      if (parts.length === 3) {
        const dateObj = new Date(Number(parts[0]), Number(parts[1]) - 1, Number(parts[2]));
        return dateObj.toLocaleDateString("id-ID", { day: "numeric", month: "short" });
      }
    } catch { }
    return d.date;
  });

  const option = {
    tooltip: { 
      trigger: 'axis',
      backgroundColor: 'rgba(255, 255, 255, 0.95)',
      borderColor: '#e2e8f0',
      textStyle: { color: '#1e293b', fontSize: 12 },
    },
    legend: { 
      data: ['Maksimum', 'Rata-rata', 'Minimum'], 
      top: 0,
      textStyle: { color: '#64748b' }
    },
    grid: { left: '3%', right: '3%', bottom: '8%', top: '40px', containLabel: true },
    xAxis: { 
      type: 'category', 
      data: dates, 
      axisLine: { lineStyle: { color: '#cbd5e1' } },
      splitLine: { show: false } 
    },
    yAxis: { 
      type: 'value', 
      name: unit, 
      scale: true,
      splitLine: { lineStyle: { color: '#f1f5f9' } } 
    },
    dataZoom: [
      { type: 'inside', start: 0, end: 100 },
      { type: 'slider', start: 0, end: 100, height: 16, bottom: 0 }
    ],
    series: [
      { name: 'Maksimum', type: 'line', data: data.map((d: any) => d[dataKeyMax]), itemStyle: { color: colorMax }, smooth: true, lineStyle: { width: 2.5 } },
      { name: 'Rata-rata', type: 'line', data: data.map((d: any) => d[dataKeyAvg]), itemStyle: { color: colorAvg }, smooth: true, lineStyle: { width: 2.5, type: 'dashed' } },
      { name: 'Minimum', type: 'line', data: data.map((d: any) => d[dataKeyMin]), itemStyle: { color: colorMin }, smooth: true, lineStyle: { width: 2.5 } },
    ]
  };

  return <ReactECharts option={option} style={{ width: '100%', height }} />;
};

// Bar chart for daily precipitation
const PrecipitationBarChart = ({ data, height = "260px" }: { data: WeatherRecord[]; height?: string }) => {
  const dates = data.map((d) => {
    try {
      const parts = d.date.split('-');
      if (parts.length === 3) {
        const dateObj = new Date(Number(parts[0]), Number(parts[1]) - 1, Number(parts[2]));
        return dateObj.toLocaleDateString("id-ID", { day: "numeric", month: "short" });
      }
    } catch { }
    return d.date;
  });

  const option = {
    tooltip: { 
      trigger: 'axis',
      formatter: '{b}: <strong>{c} mm</strong>',
    },
    grid: { left: '3%', right: '3%', bottom: '8%', top: '30px', containLabel: true },
    xAxis: { 
      type: 'category', 
      data: dates, 
      axisLine: { lineStyle: { color: '#cbd5e1' } },
    },
    yAxis: { 
      type: 'value', 
      name: 'mm',
      splitLine: { lineStyle: { color: '#f1f5f9' } } 
    },
    series: [
      {
        name: 'Curah Hujan',
        type: 'bar',
        data: data.map((d) => d.rainfallTot || 0),
        itemStyle: { 
          color: '#0284C7',
          borderRadius: [4, 4, 0, 0]
        },
      }
    ]
  };

  return <ReactECharts option={option} style={{ width: '100%', height }} />;
};

interface LaporanMeteorologiProps {
  sensorId: string;
  sensorName: string;
  displayName: string;
}

type PeriodMode = 'mingguan' | 'dasarian' | 'custom';
type ViewMode = 'web' | 'print';

// Get Monday of the week at offset (0 = current week, -1 = last week, etc.)
function getWeekRange(offset: number): { from: Date; to: Date; label: string } {
  const now = new Date();
  const day = now.getDay();
  const mondayDiff = now.getDate() - day + (day === 0 ? -6 : 1);
  const monday = new Date(now);
  monday.setDate(mondayDiff + offset * 7);
  monday.setHours(0, 0, 0, 0);
  const sunday = new Date(monday);
  sunday.setDate(monday.getDate() + 6);
  sunday.setHours(23, 59, 59, 999);
  return {
    from: monday,
    to: sunday,
    label: offset === 0 ? 'Minggu Ini' : offset === -1 ? 'Minggu Lalu' : `${offset > 0 ? '+' : ''}${offset} Minggu`,
  };
}

// Get range for a specific dasarian (1/2/3) in a given month/year
function getDasarianRange(year: number, month: number, dasarian: 1 | 2 | 3): { from: Date; to: Date; label: string } {
  const start = new Date(year, month - 1, dasarian === 1 ? 1 : dasarian === 2 ? 11 : 21);
  start.setHours(0, 0, 0, 0);
  const end = new Date(year, month - 1,
    dasarian === 1 ? 10 : dasarian === 2 ? 20 : new Date(year, month, 0).getDate()
  );
  end.setHours(23, 59, 59, 999);
  const labels = ['I', 'II', 'III'];
  return { from: start, to: end, label: `Dasarian ${labels[dasarian - 1]}` };
}

const MONTHS_ID = [
  'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
  'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'
];

export default function LaporanMeteorologi({ sensorId, sensorName, displayName }: LaporanMeteorologiProps) {
  const { toast } = useToast()

  const [mode, setMode] = useState<PeriodMode>('mingguan');
  const [viewMode, setViewMode] = useState<ViewMode>('web');

  // --- Mingguan state ---
  const [weekOffset, setWeekOffset] = useState<number>(0);

  // --- Dasarian state ---
  const now = new Date();
  const [dasarianYear, setDasarianYear] = useState<number>(now.getFullYear());
  const [dasarianMonth, setDasarianMonth] = useState<number>(now.getMonth() + 1);
  const [dasarianNum, setDasarianNum] = useState<1 | 2 | 3>(() => {
    const d = now.getDate();
    return d <= 10 ? 1 : d <= 20 ? 2 : 3;
  });

  // Derived ranges
  const weekRangeData = getWeekRange(weekOffset);
  const dasarianRangeData = getDasarianRange(dasarianYear, dasarianMonth, dasarianNum);

  const [dateRange, setDateRange] = useState<DateRange | undefined>(() => {
    const r = getWeekRange(0);
    return { from: r.from, to: r.to };
  });

  const [loading, setLoading] = useState(false)
  const [rawWeatherData, setRawWeatherData] = useState<WeatherRecord[]>([])
  const [isExporting, setIsExporting] = useState(false)
  const reportId = "meteorologi-print-area";

  // --- ERA5 Calibration & Correction State ---
  const [offsets, setOffsets] = useState<CorrectionOffsets>({
    tempOffset: 0,
    humOffset: 0,
    pressOffset: 0,
    enabled: false,
  });

  // Effective Weather Data (Raw vs Corrected)
  const weatherData = useMemo(() => {
    return applyCorrectionToDailyRecords(rawWeatherData, offsets);
  }, [rawWeatherData, offsets]);

  // Derived statistical summary metrics
  const summaryStats = useMemo(() => {
    if (weatherData.length === 0) return null;

    const temps = weatherData.map((d) => d.temperatureAvg).filter((v): v is number => v != null);
    const maxTemps = weatherData.map((d) => d.temperatureMax).filter((v): v is number => v != null);
    const minTemps = weatherData.map((d) => d.temperatureMin).filter((v): v is number => v != null);

    const hums = weatherData.map((d) => d.humidityAvg).filter((v): v is number => v != null);
    const maxHums = weatherData.map((d) => d.humidityMax).filter((v): v is number => v != null);
    const minHums = weatherData.map((d) => d.humidityMin).filter((v): v is number => v != null);

    const press = weatherData.map((d) => d.pressureAvg).filter((v): v is number => v != null);
    const rains = weatherData.map((d) => d.rainfallTot || 0);

    const avgTemp = temps.length ? temps.reduce((a, b) => a + b, 0) / temps.length : 0;
    const highestTemp = maxTemps.length ? Math.max(...maxTemps) : 0;
    const lowestTemp = minTemps.length ? Math.min(...minTemps) : 0;

    const avgHum = hums.length ? hums.reduce((a, b) => a + b, 0) / hums.length : 0;
    const highestHum = maxHums.length ? Math.max(...maxHums) : 0;
    const lowestHum = minHums.length ? Math.min(...minHums) : 0;

    const avgPress = press.length ? press.reduce((a, b) => a + b, 0) / press.length : 0;
    const totalRain = rains.reduce((a, b) => a + b, 0);
    const rainyDays = rains.filter((r) => r >= 0.5).length;

    return {
      avgTemp: Number(avgTemp.toFixed(1)),
      highestTemp: Number(highestTemp.toFixed(1)),
      lowestTemp: Number(lowestTemp.toFixed(1)),
      avgHum: Number(avgHum.toFixed(0)),
      highestHum: Number(highestHum.toFixed(0)),
      lowestHum: Number(lowestHum.toFixed(0)),
      avgPress: Number(avgPress.toFixed(1)),
      totalRain: Number(totalRain.toFixed(1)),
      rainyDays,
    };
  }, [weatherData]);

  const handleExport = async (type: 'pdf' | 'png' | 'jpg' | 'print') => {
    if (weatherData.length === 0) return;
    setIsExporting(true);
    toast({ title: "Memproses Laporan...", description: "Mohon tunggu sebentar, sedang merender kanvas dokumen." });

    setTimeout(async () => {
      const canvas = await generateCanvasFromDOM(reportId);
      if (!canvas) {
        toast({ variant: "destructive", title: "Error", description: "Gagal membuat gambar dari laporan." });
        setIsExporting(false);
        return;
      }

      const filename = `Laporan_Meteorologi_${sensorName.replace(/\s+/g, '_')}_${formatYMD(new Date())}`;

      if (type === 'png') exportAsPNG(canvas, filename);
      else if (type === 'jpg') exportAsJPEG(canvas, filename);
      else if (type === 'pdf') exportAsPDF([canvas], filename, 'portrait');
      else if (type === 'print') printCanvas(canvas);

      toast({ title: "Berhasil", description: "Dokumen laporan siap diunduh/dicetak." });
      setIsExporting(false);
    }, 100);
  };

  const generateReport = async () => {
    if (!sensorId) {
      toast({ title: "Peringatan", description: "Silakan pilih sensor terlebih dahulu", variant: "destructive" })
      return
    }
    if (!dateRange?.from || !dateRange?.to) {
      toast({ title: "Peringatan", description: "Pilih rentang tanggal yang valid", variant: "destructive" })
      return
    }

    setLoading(true)
    try {
      const start = new Date(dateRange.from)
      start.setHours(0, 0, 0, 0)
      const end = new Date(dateRange.to)
      end.setHours(23, 59, 59, 999)

      const raw = await fetchSensorDataByDateRange(sensorId, start.getTime(), end.getTime());

      if (!raw || raw.length === 0) {
        toast({ title: "Informasi", description: "Tidak ada data pada periode tersebut" })
        setRawWeatherData([])
        setLoading(false)
        return
      }

      const records: WeatherRecord[] = aggregateDaily(raw)
      records.sort((a, b) => a.date.localeCompare(b.date))

      setRawWeatherData(records)

    } catch (err) {
      console.error(err)
      toast({ title: "Error", description: "Gagal menarik data dari server", variant: "destructive" })
    } finally {
      setLoading(false)
    }
  }

  const handleDownloadCSV = () => {
    if (weatherData.length === 0) return;
    exportToCSV(weatherData, `Laporan_Meteorologi_${sensorName.replace(/\s+/g, '_')}_${formatYMD(new Date())}.csv`);
  }

  // Sync dateRange when mode changes
  useEffect(() => {
    if (mode === 'mingguan') {
      const r = getWeekRange(weekOffset);
      setDateRange({ from: r.from, to: r.to });
    }
  }, [mode, weekOffset]);

  useEffect(() => {
    if (mode === 'dasarian') {
      const r = getDasarianRange(dasarianYear, dasarianMonth, dasarianNum);
      setDateRange({ from: r.from, to: r.to });
    }
  }, [mode, dasarianYear, dasarianMonth, dasarianNum]);

  // Auto-fetch whenever dateRange changes
  useEffect(() => {
    if (mode === 'custom') return;
    if (!sensorId || !dateRange?.from || !dateRange?.to) return;
    generateReport();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dateRange, sensorId]);

  const handleSelectMode = (newMode: PeriodMode) => {
    setMode(newMode);
  };

  const startDateStr = dateRange?.from ? format(dateRange.from, 'yyyy-MM-dd') : '';
  const endDateStr = dateRange?.to ? format(dateRange.to, 'yyyy-MM-dd') : '';

  return (
    <div className="space-y-6">
      {/* --- CONTROL TOOLBAR (Period, View Mode Toggle, Export Actions) --- */}
      <Card className="no-print shadow-sm border-slate-200 dark:border-slate-800">
        <CardContent className="p-4 flex flex-col lg:flex-row gap-4 items-start lg:items-end justify-between">
          <div className="flex flex-col gap-3 flex-grow w-full lg:w-auto">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
              <label className="text-sm font-semibold text-slate-800 dark:text-slate-200 flex items-center gap-2">
                <CalendarIcon className="w-4 h-4 text-blue-600" />
                Periode Analisis Laporan
              </label>

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
                  Pratinjau Cetak (A4)
                </Button>
              </div>
            </div>

            {/* Mode selector chips */}
            <div className="flex flex-wrap gap-2">
              <Button
                variant={mode === 'mingguan' ? 'default' : 'outline'}
                size="sm"
                className={cn(mode === 'mingguan' && 'bg-blue-600 hover:bg-blue-700 text-white')}
                onClick={() => handleSelectMode('mingguan')}
              >
                Mingguan (Sen–Min)
              </Button>
              <Button
                variant={mode === 'dasarian' ? 'default' : 'outline'}
                size="sm"
                className={cn(mode === 'dasarian' && 'bg-indigo-600 hover:bg-indigo-700 text-white')}
                onClick={() => handleSelectMode('dasarian')}
              >
                {dasarianRangeData.label}
              </Button>
              <Button
                variant={mode === 'custom' ? 'default' : 'outline'}
                size="sm"
                className={cn(mode === 'custom' && 'bg-slate-700 hover:bg-slate-800 text-white')}
                onClick={() => handleSelectMode('custom')}
              >
                Custom Tanggal
              </Button>
            </div>

            {/* Mingguan Navigator */}
            {mode === 'mingguan' && (
              <div className="flex items-center gap-3 flex-wrap">
                <div className="flex items-center gap-1">
                  <Button variant="outline" size="icon" className="h-8 w-8" onClick={() => setWeekOffset(w => w - 1)} title="Minggu sebelumnya">
                    ‹
                  </Button>
                  <div className="flex items-center gap-2 px-3 py-1.5 rounded-md bg-blue-50 dark:bg-blue-950 border border-blue-200 dark:border-blue-800 min-w-[260px] justify-between">
                    <CalendarIcon className="h-4 w-4 text-blue-400 shrink-0" />
                    <div className="text-center">
                      <span className="text-xs font-semibold text-blue-700 dark:text-blue-300 block">{weekRangeData.label}</span>
                      <span className="text-xs text-blue-500 dark:text-blue-400">
                        {format(weekRangeData.from, 'dd MMM', { locale: id })} – {format(weekRangeData.to, 'dd MMM yyyy', { locale: id })}
                      </span>
                    </div>
                    <span className="w-4" />
                  </div>
                  <Button variant="outline" size="icon" className="h-8 w-8" onClick={() => setWeekOffset(w => w + 1)} disabled={weekOffset >= 0} title="Minggu berikutnya">
                    ›
                  </Button>
                </div>
                {weekOffset !== 0 && (
                  <Button variant="ghost" size="sm" className="text-xs text-blue-600" onClick={() => setWeekOffset(0)}>
                    Kembali ke Minggu Ini
                  </Button>
                )}
                {loading && <Loader2 className="h-4 w-4 animate-spin text-blue-500" />}
              </div>
            )}

            {/* Dasarian Navigator */}
            {mode === 'dasarian' && (
              <div className="flex items-center gap-3 flex-wrap">
                <div className="flex flex-col gap-1">
                  <span className="text-xs text-slate-500">Tahun</span>
                  <div className="flex items-center gap-1">
                    <Button variant="outline" size="icon" className="h-8 w-8" onClick={() => setDasarianYear(y => y - 1)}>‹</Button>
                    <span className="text-sm font-semibold w-12 text-center">{dasarianYear}</span>
                    <Button variant="outline" size="icon" className="h-8 w-8" onClick={() => setDasarianYear(y => y + 1)} disabled={dasarianYear >= new Date().getFullYear()}>›</Button>
                  </div>
                </div>
                <div className="flex flex-col gap-1">
                  <span className="text-xs text-slate-500">Bulan</span>
                  <div className="flex items-center gap-1">
                    <Button variant="outline" size="icon" className="h-8 w-8" onClick={() => {
                      if (dasarianMonth === 1) { setDasarianMonth(12); setDasarianYear(y => y - 1); }
                      else setDasarianMonth(m => m - 1);
                    }}>‹</Button>
                    <span className="text-sm font-semibold w-24 text-center">{MONTHS_ID[dasarianMonth - 1]}</span>
                    <Button variant="outline" size="icon" className="h-8 w-8" onClick={() => {
                      if (dasarianMonth === 12) { setDasarianMonth(1); setDasarianYear(y => y + 1); }
                      else setDasarianMonth(m => m + 1);
                    }} disabled={dasarianYear >= new Date().getFullYear() && dasarianMonth >= new Date().getMonth() + 1}>›</Button>
                  </div>
                </div>
                <div className="flex flex-col gap-1">
                  <span className="text-xs text-slate-500">Periode</span>
                  <div className="flex gap-1">
                    {([1, 2, 3] as const).map(n => (
                      <Button
                        key={n}
                        variant={dasarianNum === n ? 'default' : 'outline'}
                        size="sm"
                        className={cn('h-8 text-xs', dasarianNum === n && 'bg-indigo-600 hover:bg-indigo-700 text-white')}
                        onClick={() => setDasarianNum(n)}
                      >
                        Das. {['I', 'II', 'III'][n - 1]}
                      </Button>
                    ))}
                  </div>
                </div>
                <div className="flex items-center gap-2 px-3 py-1.5 rounded-md bg-indigo-50 dark:bg-indigo-950 border border-indigo-200 dark:border-indigo-800">
                  <CalendarIcon className="h-4 w-4 text-indigo-400" />
                  <div>
                    <span className="text-xs font-semibold text-indigo-700 dark:text-indigo-300 block">
                      {dasarianRangeData.label} – {MONTHS_ID[dasarianMonth - 1]} {dasarianYear}
                    </span>
                    <span className="text-xs text-indigo-500">
                      {format(dasarianRangeData.from, 'dd MMM', { locale: id })} – {format(dasarianRangeData.to, 'dd MMM yyyy', { locale: id })}
                    </span>
                  </div>
                </div>
                {loading && <Loader2 className="h-4 w-4 animate-spin text-indigo-500" />}
              </div>
            )}

            {/* Custom date picker */}
            {mode === 'custom' && (
              <div className="flex items-center gap-2">
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className={cn("w-[300px] justify-start text-left font-normal", !dateRange && "text-muted-foreground")}
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {dateRange?.from ? (
                        dateRange.to ? (
                          <>{format(dateRange.from, 'dd LLL y', { locale: id })} – {format(dateRange.to, 'dd LLL y', { locale: id })}</>
                        ) : format(dateRange.from, 'dd LLL y', { locale: id })
                      ) : <span>Pilih Rentang Tanggal</span>}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      initialFocus
                      mode="range"
                      defaultMonth={dateRange?.from}
                      selected={dateRange}
                      onSelect={setDateRange}
                      numberOfMonths={2}
                    />
                  </PopoverContent>
                </Popover>
                <Button onClick={generateReport} disabled={loading} className="bg-blue-600 hover:bg-blue-700 text-white flex items-center gap-2">
                  {loading ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      <span>Memproses...</span>
                    </>
                  ) : (
                    'Proses Laporan'
                  )}
                </Button>
              </div>
            )}
          </div>

          {/* Export Buttons */}
          <div className="flex flex-wrap gap-2 shrink-0">
            <Button variant="outline" size="sm" onClick={handleDownloadCSV} disabled={weatherData.length === 0} className="h-9">
              <Download className="mr-1.5 h-4 w-4 text-emerald-600" /> CSV
            </Button>
            <Button variant="outline" size="sm" onClick={() => handleExport('png')} disabled={weatherData.length === 0 || isExporting} className="h-9">
              <FileImage className="mr-1.5 h-4 w-4 text-green-600" /> PNG
            </Button>
            <Button variant="outline" size="sm" onClick={() => handleExport('pdf')} disabled={weatherData.length === 0 || isExporting} className="h-9">
              <FileType className="mr-1.5 h-4 w-4 text-red-600" /> PDF
            </Button>
            <Button className="bg-slate-800 hover:bg-slate-900 text-white h-9" size="sm" onClick={() => handleExport('print')} disabled={weatherData.length === 0 || isExporting}>
              <Printer className="mr-1.5 h-4 w-4" /> Cetak
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* --- PANEL VALIDASI & KOREKSI ERA5 (Reanalysis QA/QC) --- */}
      <ERA5CorrectionPanel
        sensorId={sensorId}
        sensorName={sensorName}
        startDate={startDateStr}
        endDate={endDateStr}
        rawAwsData={rawWeatherData}
        offsets={offsets}
        onOffsetsChange={setOffsets}
      />

      {/* --- VIEW MODE 1: DASHBOARD INTERAKTIF WEB (DEFAULT) --- */}
      {viewMode === 'web' && (
        <div className="space-y-6">
          {/* Correction Notice Badge if active */}
          {offsets.enabled && (
            <div className="flex items-center gap-2 p-3 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 rounded-lg text-xs text-emerald-800 dark:text-emerald-200">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>
                <strong>Mode Kalibrasi Aktif:</strong> Nilai pada grafik dan tabel telah dikoreksi dengan offset ERA5-Land (Suhu: {offsets.tempOffset > 0 ? "+" : ""}{offsets.tempOffset}°C, Kelembapan: {offsets.humOffset > 0 ? "+" : ""}{offsets.humOffset}%, Tekanan: {offsets.pressOffset > 0 ? "+" : ""}{offsets.pressOffset} hPa).
              </span>
            </div>
          )}

          {/* Hero Summary Cards */}
          {summaryStats && (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {/* Suhu */}
              <Card className="border-orange-100 bg-gradient-to-br from-orange-50/50 via-white to-white dark:from-slate-900 dark:to-slate-800">
                <CardContent className="p-4 space-y-2">
                  <div className="flex justify-between items-center text-xs font-semibold text-orange-700 dark:text-orange-300">
                    <span className="flex items-center gap-1.5">
                      <ThermometerSun className="w-4 h-4 text-orange-500" /> Suhu Udara
                    </span>
                    <Badge variant="outline" className="text-[10px] bg-orange-50 border-orange-200 text-orange-700">Rata-rata</Badge>
                  </div>
                  <div className="text-2xl font-black text-slate-900 dark:text-slate-100">
                    {summaryStats.avgTemp} <span className="text-sm font-normal text-slate-500">°C</span>
                  </div>
                  <div className="flex justify-between text-xs text-slate-500 pt-1 border-t">
                    <span>Maks: <strong className="text-red-600">{summaryStats.highestTemp}°C</strong></span>
                    <span>Min: <strong className="text-blue-600">{summaryStats.lowestTemp}°C</strong></span>
                  </div>
                </CardContent>
              </Card>

              {/* Kelembapan */}
              <Card className="border-blue-100 bg-gradient-to-br from-blue-50/50 via-white to-white dark:from-slate-900 dark:to-slate-800">
                <CardContent className="p-4 space-y-2">
                  <div className="flex justify-between items-center text-xs font-semibold text-blue-700 dark:text-blue-300">
                    <span className="flex items-center gap-1.5">
                      <Droplets className="w-4 h-4 text-blue-500" /> Kelembapan Udara
                    </span>
                    <Badge variant="outline" className="text-[10px] bg-blue-50 border-blue-200 text-blue-700">Rata-rata</Badge>
                  </div>
                  <div className="text-2xl font-black text-slate-900 dark:text-slate-100">
                    {summaryStats.avgHum} <span className="text-sm font-normal text-slate-500">%</span>
                  </div>
                  <div className="flex justify-between text-xs text-slate-500 pt-1 border-t">
                    <span>Maks: <strong className="text-emerald-600">{summaryStats.highestHum}%</strong></span>
                    <span>Min: <strong className="text-amber-600">{summaryStats.lowestHum}%</strong></span>
                  </div>
                </CardContent>
              </Card>

              {/* Tekanan */}
              <Card className="border-violet-100 bg-gradient-to-br from-violet-50/50 via-white to-white dark:from-slate-900 dark:to-slate-800">
                <CardContent className="p-4 space-y-2">
                  <div className="flex justify-between items-center text-xs font-semibold text-violet-700 dark:text-violet-300">
                    <span className="flex items-center gap-1.5">
                      <Gauge className="w-4 h-4 text-violet-500" /> Tekanan Udara
                    </span>
                    <Badge variant="outline" className="text-[10px] bg-violet-50 border-violet-200 text-violet-700">Rata-rata</Badge>
                  </div>
                  <div className="text-2xl font-black text-slate-900 dark:text-slate-100">
                    {summaryStats.avgPress} <span className="text-sm font-normal text-slate-500">hPa</span>
                  </div>
                  <div className="text-xs text-slate-500 pt-1 border-t">
                    Permukaan Barometrik AWS
                  </div>
                </CardContent>
              </Card>

              {/* Curah Hujan */}
              <Card className="border-sky-100 bg-gradient-to-br from-sky-50/50 via-white to-white dark:from-slate-900 dark:to-slate-800">
                <CardContent className="p-4 space-y-2">
                  <div className="flex justify-between items-center text-xs font-semibold text-sky-700 dark:text-sky-300">
                    <span className="flex items-center gap-1.5">
                      <CloudRain className="w-4 h-4 text-sky-500" /> Akumulasi Hujan
                    </span>
                    <Badge variant="outline" className="text-[10px] bg-sky-50 border-sky-200 text-sky-700">Total Periode</Badge>
                  </div>
                  <div className="text-2xl font-black text-sky-600">
                    {summaryStats.totalRain} <span className="text-sm font-normal text-slate-500">mm</span>
                  </div>
                  <div className="text-xs text-slate-500 pt-1 border-t flex justify-between">
                    <span>Hari Hujan (≥0.5mm):</span>
                    <strong className="text-slate-700 dark:text-slate-300">{summaryStats.rainyDays} Hari</strong>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}

          {/* Interactive Web Charts */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Suhu Udara */}
            <Card className="shadow-sm">
              <CardHeader className="py-3 px-4 bg-orange-50/60 dark:bg-orange-950/20 border-b">
                <CardTitle className="text-sm font-bold flex items-center text-orange-900 dark:text-orange-200">
                  <ThermometerSun className="w-4 h-4 mr-2 text-orange-600" />
                  Fluktuasi Suhu Udara Harian (Min, Rata-rata & Maks)
                </CardTitle>
              </CardHeader>
              <CardContent className="p-2">
                <TripleLineChart
                  data={weatherData}
                  dataKeyMax="temperatureMax"
                  dataKeyAvg="temperatureAvg"
                  dataKeyMin="temperatureMin"
                  colorMax="#dc2626"
                  colorAvg="#f97316"
                  colorMin="#2563eb"
                  unit="°C"
                  height="280px"
                />
              </CardContent>
            </Card>

            {/* Kelembapan Udara */}
            <Card className="shadow-sm">
              <CardHeader className="py-3 px-4 bg-blue-50/60 dark:bg-blue-950/20 border-b">
                <CardTitle className="text-sm font-bold flex items-center text-blue-900 dark:text-blue-200">
                  <Droplets className="w-4 h-4 mr-2 text-blue-600" />
                  Fluktuasi Kelembapan Udara Harian (Min, Rata-rata & Maks)
                </CardTitle>
              </CardHeader>
              <CardContent className="p-2">
                <TripleLineChart
                  data={weatherData}
                  dataKeyMax="humidityMax"
                  dataKeyAvg="humidityAvg"
                  dataKeyMin="humidityMin"
                  colorMax="#059669"
                  colorAvg="#0ea5e9"
                  colorMin="#0284c7"
                  unit="%"
                  height="280px"
                />
              </CardContent>
            </Card>

            {/* Tekanan Udara */}
            <Card className="shadow-sm">
              <CardHeader className="py-3 px-4 bg-violet-50/60 dark:bg-violet-950/20 border-b">
                <CardTitle className="text-sm font-bold flex items-center text-violet-900 dark:text-violet-200">
                  <Gauge className="w-4 h-4 mr-2 text-violet-600" />
                  Tekanan Udara Permukaan (Min, Rata-rata & Maks)
                </CardTitle>
              </CardHeader>
              <CardContent className="p-2">
                <TripleLineChart
                  data={weatherData}
                  dataKeyMax="pressureMax"
                  dataKeyAvg="pressureAvg"
                  dataKeyMin="pressureMin"
                  colorMax="#7c3aed"
                  colorAvg="#a855f7"
                  colorMin="#c084fc"
                  unit="hPa"
                  height="280px"
                />
              </CardContent>
            </Card>

            {/* Curah Hujan */}
            <Card className="shadow-sm">
              <CardHeader className="py-3 px-4 bg-sky-50/60 dark:bg-sky-950/20 border-b">
                <CardTitle className="text-sm font-bold flex items-center text-sky-900 dark:text-sky-200">
                  <CloudRain className="w-4 h-4 mr-2 text-sky-600" />
                  Distribusi Curah Hujan Harian (Akumulasi 24 Jam)
                </CardTitle>
              </CardHeader>
              <CardContent className="p-2">
                <PrecipitationBarChart data={weatherData} height="280px" />
              </CardContent>
            </Card>
          </div>

          {/* Interactive Web Table */}
          <Card className="shadow-sm">
            <CardHeader className="py-3 px-4 border-b flex flex-row justify-between items-center">
              <CardTitle className="text-base font-bold">Tabel Rekapitulasi Meteorologi Harian</CardTitle>
              {offsets.enabled && (
                <Badge variant="outline" className="text-xs bg-emerald-50 text-emerald-700 border-emerald-300">
                  Data Terkalibrasi Aktif
                </Badge>
              )}
            </CardHeader>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <table className="w-full text-sm text-left">
                  <thead className="bg-slate-50 dark:bg-slate-800/60 text-slate-700 dark:text-slate-300 border-b">
                    <tr>
                      <th className="px-4 py-3 font-semibold border-r" rowSpan={2}>Tanggal</th>
                      <th className="px-3 py-2 text-center font-semibold border-r text-orange-600 bg-orange-50/40" colSpan={3}>Suhu (°C)</th>
                      <th className="px-3 py-2 text-center font-semibold border-r text-blue-600 bg-blue-50/40" colSpan={3}>Kelembapan (%)</th>
                      <th className="px-3 py-2 text-center font-semibold border-r text-violet-600 bg-violet-50/40" colSpan={3}>Tekanan (hPa)</th>
                      <th className="px-4 py-2 text-center font-semibold text-teal-600 bg-teal-50/40">Hujan (mm)</th>
                    </tr>
                    <tr className="border-b text-xs">
                      <th className="px-2 py-1.5 text-center text-slate-500 border-r">Maks</th>
                      <th className="px-2 py-1.5 text-center text-slate-500 border-r">Rata²</th>
                      <th className="px-2 py-1.5 text-center text-slate-500 border-r">Min</th>
                      <th className="px-2 py-1.5 text-center text-slate-500 border-r">Maks</th>
                      <th className="px-2 py-1.5 text-center text-slate-500 border-r">Rata²</th>
                      <th className="px-2 py-1.5 text-center text-slate-500 border-r">Min</th>
                      <th className="px-2 py-1.5 text-center text-slate-500 border-r">Maks</th>
                      <th className="px-2 py-1.5 text-center text-slate-500 border-r">Rata²</th>
                      <th className="px-2 py-1.5 text-center text-slate-500 border-r">Min</th>
                      <th className="px-2 py-1.5 text-center text-slate-500">Total</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800 font-mono text-xs">
                    {weatherData.map((day, idx) => (
                      <tr key={idx} className="hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors">
                        <td className="px-4 py-2.5 font-sans font-medium border-r whitespace-nowrap text-slate-900 dark:text-slate-100">
                          {formatIdDateShort(new Date(day.date))}
                        </td>
                        <td className="px-2 py-2 text-center text-red-600 border-r">{day.temperatureMax?.toFixed(1) ?? "-"}</td>
                        <td className="px-2 py-2 text-center font-semibold border-r">{day.temperatureAvg?.toFixed(1) ?? "-"}</td>
                        <td className="px-2 py-2 text-center text-blue-600 border-r">{day.temperatureMin?.toFixed(1) ?? "-"}</td>

                        <td className="px-2 py-2 text-center text-emerald-700 border-r">{day.humidityMax?.toFixed(0) ?? "-"}</td>
                        <td className="px-2 py-2 text-center font-semibold border-r">{day.humidityAvg?.toFixed(0) ?? "-"}</td>
                        <td className="px-2 py-2 text-center text-amber-600 border-r">{day.humidityMin?.toFixed(0) ?? "-"}</td>

                        <td className="px-2 py-2 text-center text-violet-700 border-r">{day.pressureMax?.toFixed(1) ?? "-"}</td>
                        <td className="px-2 py-2 text-center font-semibold border-r">{day.pressureAvg?.toFixed(1) ?? "-"}</td>
                        <td className="px-2 py-2 text-center text-violet-500 border-r">{day.pressureMin?.toFixed(1) ?? "-"}</td>

                        <td className="px-3 py-2 text-center text-teal-700 font-semibold">{day.rainfallTot?.toFixed(1) ?? "0.0"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* --- VIEW MODE 2: PRATINJAU LEMBAR CETAK (A4 LAYOUT) --- */}
      {viewMode === 'print' && (
        <div className="space-y-4">
          <div className="flex justify-between items-center bg-slate-100 dark:bg-slate-800 p-3 rounded-lg border">
            <span className="text-xs text-slate-600 dark:text-slate-300 flex items-center gap-1.5">
              <Eye className="w-4 h-4 text-blue-600" />
              Menampilkan pratinjau lembar cetak standar dokumen A4.
            </span>
            <div className="flex gap-2">
              <Button size="sm" variant="outline" onClick={() => handleExport('pdf')} disabled={isExporting} className="h-8 text-xs">
                <FileType className="w-3.5 h-3.5 mr-1 text-red-600" /> Export PDF
              </Button>
              <Button size="sm" onClick={() => handleExport('print')} disabled={isExporting} className="h-8 text-xs bg-slate-900 text-white">
                <Printer className="w-3.5 h-3.5 mr-1" /> Cetak Lembar Ini
              </Button>
            </div>
          </div>

          <div className="border rounded-xl p-6 bg-slate-200 dark:bg-slate-950 flex justify-center overflow-x-auto shadow-inner">
            <div className="scale-[0.85] origin-top shadow-2xl rounded-md overflow-hidden bg-white">
              <PrintLayout
                id="visible-print-preview"
                title="Laporan Meteorologi"
                sensorName={sensorName}
                generatedBy={displayName}
                periodLabel={`${dateRange?.from ? formatIdDateShort(dateRange.from) : ''} - ${dateRange?.to ? formatIdDateShort(dateRange.to) : ''}`}
                orientation="portrait"
              >
                <section className="space-y-4 mt-6 break-inside-avoid">
                  {/* 2 Kolom Ringkasan Rata-rata Suhu & Kelembapan Kiri - Kanan */}
                  <div className="grid grid-cols-2 gap-4">
                    {/* Kolom Kiri: Suhu Udara */}
                    <div className="p-3 bg-orange-50/70 border border-orange-200 rounded-lg flex items-center justify-between">
                      <div>
                        <div className="text-xs font-semibold uppercase tracking-wide text-orange-800 flex items-center gap-1.5">
                          <ThermometerSun className="w-4 h-4 text-orange-600" />
                          Rata-rata Suhu Udara
                        </div>
                        <div className="text-2xl font-black text-orange-950 mt-0.5">
                          {summaryStats?.avgTemp ?? "-"} <span className="text-sm font-normal text-orange-700">°C</span>
                        </div>
                      </div>
                      <div className="text-right text-xs text-orange-700 font-medium">
                        <div>Maks: <strong className="text-red-600">{summaryStats?.highestTemp ?? "-"}°C</strong></div>
                        <div>Min: <strong className="text-blue-600">{summaryStats?.lowestTemp ?? "-"}°C</strong></div>
                      </div>
                    </div>

                    {/* Kolom Kanan: Kelembapan Udara */}
                    <div className="p-3 bg-blue-50/70 border border-blue-200 rounded-lg flex items-center justify-between">
                      <div>
                        <div className="text-xs font-semibold uppercase tracking-wide text-blue-800 flex items-center gap-1.5">
                          <Droplets className="w-4 h-4 text-blue-600" />
                          Rata-rata Kelembapan Udara
                        </div>
                        <div className="text-2xl font-black text-blue-950 mt-0.5">
                          {summaryStats?.avgHum ?? "-"} <span className="text-sm font-normal text-blue-700">%</span>
                        </div>
                      </div>
                      <div className="text-right text-xs text-blue-700 font-medium">
                        <div>Maks: <strong className="text-emerald-700">{summaryStats?.highestHum ?? "-"}%</strong></div>
                        <div>Min: <strong className="text-amber-700">{summaryStats?.lowestHum ?? "-"}%</strong></div>
                      </div>
                    </div>
                  </div>

                  {/* 2 Kolom Grafik Berdampingan: Suhu (Kiri) & Kelembapan (Kanan) */}
                  <div className="grid grid-cols-2 gap-4 break-inside-avoid">
                    {/* Grafik Kiri: Suhu Udara */}
                    <Card className="border border-slate-200 shadow-sm print:shadow-none">
                      <CardHeader className="py-2.5 px-3 bg-orange-50/60 print:bg-transparent border-b">
                        <CardTitle className="text-xs font-bold flex items-center text-orange-800">
                          <ThermometerSun className="w-3.5 h-3.5 mr-1.5 text-orange-600" />
                          Fluktuasi Suhu Udara (°C)
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="p-0">
                        <TripleLineChart
                          data={weatherData}
                          dataKeyMax="temperatureMax"
                          dataKeyAvg="temperatureAvg"
                          dataKeyMin="temperatureMin"
                          colorMax="#dc2626"
                          colorAvg="#f97316"
                          colorMin="#2563eb"
                          unit="°C"
                          height="230px"
                        />
                      </CardContent>
                    </Card>

                    {/* Grafik Kanan: Kelembapan Udara */}
                    <Card className="border border-slate-200 shadow-sm print:shadow-none">
                      <CardHeader className="py-2.5 px-3 bg-blue-50/60 print:bg-transparent border-b">
                        <CardTitle className="text-xs font-bold flex items-center text-blue-800">
                          <Droplets className="w-3.5 h-3.5 mr-1.5 text-blue-600" />
                          Fluktuasi Kelembapan Udara (%)
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="p-0">
                        <TripleLineChart
                          data={weatherData}
                          dataKeyMax="humidityMax"
                          dataKeyAvg="humidityAvg"
                          dataKeyMin="humidityMin"
                          colorMax="#059669"
                          colorAvg="#0ea5e9"
                          colorMin="#0284c7"
                          unit="%"
                          height="230px"
                        />
                      </CardContent>
                    </Card>
                  </div>
                </section>

                <section className="break-inside-avoid mt-6">
                  <h2 className="text-xl print:text-lg font-semibold mb-4 print:mb-2 border-l-4 border-slate-800 pl-3">Tabel Rekapitulasi Harian</h2>
                  <div className="overflow-x-auto border rounded-lg print:border-none print:rounded-none">
                    <table className="w-full text-sm print:text-xs">
                      <thead className="bg-slate-100 print:bg-slate-200 text-slate-700">
                        <tr>
                          <th className="px-3 py-2 text-left font-semibold border-b border-r" rowSpan={2}>Tanggal</th>
                          <th className="px-3 py-2 text-center font-semibold border-b border-r text-orange-600 bg-orange-50/50" colSpan={3}>Suhu (°C)</th>
                          <th className="px-3 py-2 text-center font-semibold border-b border-r text-blue-600 bg-blue-50/50" colSpan={3}>Kelembaban (%)</th>
                          <th className="px-3 py-2 text-center font-semibold border-b border-r text-violet-600 bg-violet-50/50" colSpan={3}>Tekanan (hPa)</th>
                          <th className="px-3 py-2 text-center font-semibold border-b text-teal-600 bg-teal-50/50">Hujan (mm)</th>
                        </tr>
                        <tr>
                          <th className="px-3 py-2 text-center font-medium border-b border-r text-xs">Maks</th>
                          <th className="px-3 py-2 text-center font-medium border-b border-r text-xs">Rata²</th>
                          <th className="px-3 py-2 text-center font-medium border-b border-r text-xs">Min</th>
                          <th className="px-3 py-2 text-center font-medium border-b border-r text-xs">Maks</th>
                          <th className="px-3 py-2 text-center font-medium border-b border-r text-xs">Rata²</th>
                          <th className="px-3 py-2 text-center font-medium border-b border-r text-xs">Min</th>
                          <th className="px-3 py-2 text-center font-medium border-b border-r text-xs">Maks</th>
                          <th className="px-3 py-2 text-center font-medium border-b border-r text-xs">Rata²</th>
                          <th className="px-3 py-2 text-center font-medium border-b border-r text-xs">Min</th>
                          <th className="px-3 py-2 text-center font-medium border-b text-xs">Total</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-200">
                        {weatherData.map((day, idx) => (
                          <tr key={idx} className={idx % 2 === 0 ? "bg-white" : "bg-slate-50 print:bg-white"}>
                            <td className="px-3 py-2 border-r font-medium whitespace-nowrap">{formatIdDateShort(new Date(day.date))}</td>
                            <td className="px-3 py-2 border-r text-center text-red-600 font-medium">{day.temperatureMax?.toFixed(1)}</td>
                            <td className="px-3 py-2 border-r text-center">{day.temperatureAvg?.toFixed(1)}</td>
                            <td className="px-3 py-2 border-r text-center text-blue-600">{day.temperatureMin?.toFixed(1)}</td>
                            <td className="px-3 py-2 border-r text-center text-emerald-700 font-medium">{day.humidityMax?.toFixed(0)}</td>
                            <td className="px-3 py-2 border-r text-center">{day.humidityAvg?.toFixed(0)}</td>
                            <td className="px-3 py-2 border-r text-center">{day.humidityMin?.toFixed(0)}</td>
                            <td className="px-3 py-2 border-r text-center text-violet-700 font-medium">{day.pressureMax?.toFixed(1)}</td>
                            <td className="px-3 py-2 border-r text-center">{day.pressureAvg?.toFixed(1)}</td>
                            <td className="px-3 py-2 border-r text-center">{day.pressureMin?.toFixed(1)}</td>
                            <td className="px-3 py-2 text-center text-teal-700 font-semibold">{day.rainfallTot?.toFixed(1)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </section>
              </PrintLayout>
            </div>
          </div>
        </div>
      )}

      {/* --- HIDDEN CANVAS RENDER AREA FOR EXPORT (PDF/PNG/PRINT) --- */}
      <div className={cn("overflow-hidden h-0 w-0 absolute opacity-0 pointer-events-none", weatherData.length > 0 && "block")}>
        <PrintLayout
          id={reportId}
          title="Laporan Meteorologi"
          sensorName={sensorName}
          generatedBy={displayName}
          periodLabel={`${dateRange?.from ? formatIdDateShort(dateRange.from) : ''} - ${dateRange?.to ? formatIdDateShort(dateRange.to) : ''}`}
          orientation="portrait"
        >
          <section className="space-y-4 mt-6 break-inside-avoid">
            {/* 2 Kolom Ringkasan Rata-rata Suhu & Kelembapan Kiri - Kanan */}
            <div className="grid grid-cols-2 gap-4">
              {/* Kolom Kiri: Suhu Udara */}
              <div className="p-3 bg-orange-50/70 border border-orange-200 rounded-lg flex items-center justify-between">
                <div>
                  <div className="text-xs font-semibold uppercase tracking-wide text-orange-800 flex items-center gap-1.5">
                    <ThermometerSun className="w-4 h-4 text-orange-600" />
                    Rata-rata Suhu Udara
                  </div>
                  <div className="text-2xl font-black text-orange-950 mt-0.5">
                    {summaryStats?.avgTemp ?? "-"} <span className="text-sm font-normal text-orange-700">°C</span>
                  </div>
                </div>
                <div className="text-right text-xs text-orange-700 font-medium">
                  <div>Maks: <strong className="text-red-600">{summaryStats?.highestTemp ?? "-"}°C</strong></div>
                  <div>Min: <strong className="text-blue-600">{summaryStats?.lowestTemp ?? "-"}°C</strong></div>
                </div>
              </div>

              {/* Kolom Kanan: Kelembapan Udara */}
              <div className="p-3 bg-blue-50/70 border border-blue-200 rounded-lg flex items-center justify-between">
                <div>
                  <div className="text-xs font-semibold uppercase tracking-wide text-blue-800 flex items-center gap-1.5">
                    <Droplets className="w-4 h-4 text-blue-600" />
                    Rata-rata Kelembapan Udara
                  </div>
                  <div className="text-2xl font-black text-blue-950 mt-0.5">
                    {summaryStats?.avgHum ?? "-"} <span className="text-sm font-normal text-blue-700">%</span>
                  </div>
                </div>
                <div className="text-right text-xs text-blue-700 font-medium">
                  <div>Maks: <strong className="text-emerald-700">{summaryStats?.highestHum ?? "-"}%</strong></div>
                  <div>Min: <strong className="text-amber-700">{summaryStats?.lowestHum ?? "-"}%</strong></div>
                </div>
              </div>
            </div>

            {/* 2 Kolom Grafik Berdampingan: Suhu (Kiri) & Kelembapan (Kanan) */}
            <div className="grid grid-cols-2 gap-4 break-inside-avoid">
              {/* Grafik Kiri: Suhu Udara */}
              <Card className="border border-slate-200 shadow-sm print:shadow-none">
                <CardHeader className="py-2.5 px-3 bg-orange-50/60 print:bg-transparent border-b">
                  <CardTitle className="text-xs font-bold flex items-center text-orange-800">
                    <ThermometerSun className="w-3.5 h-3.5 mr-1.5 text-orange-600" />
                    Fluktuasi Suhu Udara (°C)
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-0">
                  <TripleLineChart
                    data={weatherData}
                    dataKeyMax="temperatureMax"
                    dataKeyAvg="temperatureAvg"
                    dataKeyMin="temperatureMin"
                    colorMax="#dc2626"
                    colorAvg="#f97316"
                    colorMin="#2563eb"
                    unit="°C"
                    height="230px"
                  />
                </CardContent>
              </Card>

              {/* Grafik Kanan: Kelembapan Udara */}
              <Card className="border border-slate-200 shadow-sm print:shadow-none">
                <CardHeader className="py-2.5 px-3 bg-blue-50/60 print:bg-transparent border-b">
                  <CardTitle className="text-xs font-bold flex items-center text-blue-800">
                    <Droplets className="w-3.5 h-3.5 mr-1.5 text-blue-600" />
                    Fluktuasi Kelembapan Udara (%)
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-0">
                  <TripleLineChart
                    data={weatherData}
                    dataKeyMax="humidityMax"
                    dataKeyAvg="humidityAvg"
                    dataKeyMin="humidityMin"
                    colorMax="#059669"
                    colorAvg="#0ea5e9"
                    colorMin="#0284c7"
                    unit="%"
                    height="230px"
                  />
                </CardContent>
              </Card>
            </div>
          </section>

          <section className="break-inside-avoid mt-6">
            <h2 className="text-xl print:text-lg font-semibold mb-4 print:mb-2 border-l-4 border-slate-800 pl-3">Tabel Rekapitulasi Harian</h2>
            <div className="overflow-x-auto border rounded-lg print:border-none print:rounded-none">
              <table className="w-full text-sm print:text-xs">
                <thead className="bg-slate-100 print:bg-slate-200 text-slate-700">
                  <tr>
                    <th className="px-3 py-2 text-left font-semibold border-b border-r" rowSpan={2}>Tanggal</th>
                    <th className="px-3 py-2 text-center font-semibold border-b border-r text-orange-600 bg-orange-50/50" colSpan={3}>Suhu (°C)</th>
                    <th className="px-3 py-2 text-center font-semibold border-b border-r text-blue-600 bg-blue-50/50" colSpan={3}>Kelembaban (%)</th>
                    <th className="px-3 py-2 text-center font-semibold border-b border-r text-violet-600 bg-violet-50/50" colSpan={3}>Tekanan (hPa)</th>
                    <th className="px-3 py-2 text-center font-semibold border-b text-teal-600 bg-teal-50/50">Hujan (mm)</th>
                  </tr>
                  <tr>
                    <th className="px-3 py-2 text-center font-medium border-b border-r text-xs">Maks</th>
                    <th className="px-3 py-2 text-center font-medium border-b border-r text-xs">Rata²</th>
                    <th className="px-3 py-2 text-center font-medium border-b border-r text-xs">Min</th>
                    <th className="px-3 py-2 text-center font-medium border-b border-r text-xs">Maks</th>
                    <th className="px-3 py-2 text-center font-medium border-b border-r text-xs">Rata²</th>
                    <th className="px-3 py-2 text-center font-medium border-b border-r text-xs">Min</th>
                    <th className="px-3 py-2 text-center font-medium border-b border-r text-xs">Maks</th>
                    <th className="px-3 py-2 text-center font-medium border-b border-r text-xs">Rata²</th>
                    <th className="px-3 py-2 text-center font-medium border-b border-r text-xs">Min</th>
                    <th className="px-3 py-2 text-center font-medium border-b text-xs">Total</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {weatherData.map((day, idx) => (
                    <tr key={idx} className={idx % 2 === 0 ? "bg-white" : "bg-slate-50 print:bg-white"}>
                      <td className="px-3 py-2 border-r font-medium whitespace-nowrap">{formatIdDateShort(new Date(day.date))}</td>
                      <td className="px-3 py-2 border-r text-center text-red-600 font-medium">{day.temperatureMax?.toFixed(1)}</td>
                      <td className="px-3 py-2 border-r text-center">{day.temperatureAvg?.toFixed(1)}</td>
                      <td className="px-3 py-2 border-r text-center text-blue-600">{day.temperatureMin?.toFixed(1)}</td>
                      <td className="px-3 py-2 border-r text-center text-emerald-700 font-medium">{day.humidityMax?.toFixed(0)}</td>
                      <td className="px-3 py-2 border-r text-center">{day.humidityAvg?.toFixed(0)}</td>
                      <td className="px-3 py-2 border-r text-center">{day.humidityMin?.toFixed(0)}</td>
                      <td className="px-3 py-2 border-r text-center text-violet-700 font-medium">{day.pressureMax?.toFixed(1)}</td>
                      <td className="px-3 py-2 border-r text-center">{day.pressureAvg?.toFixed(1)}</td>
                      <td className="px-3 py-2 border-r text-center">{day.pressureMin?.toFixed(1)}</td>
                      <td className="px-3 py-2 text-center text-teal-700 font-semibold">{day.rainfallTot?.toFixed(1)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        </PrintLayout>
      </div>
    </div>
  )
}
