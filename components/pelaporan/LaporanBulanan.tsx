"use client"

import { useEffect, useRef, useState, useMemo } from "react"
import { 
  FileImage, 
  FileType, 
  Printer, 
  Download, 
  Thermometer, 
  Droplets, 
  Wind, 
  Gauge, 
  CalendarIcon,
  LayoutDashboard,
  Eye,
  CheckCircle2,
  CloudRain
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
import type { SensorDate } from "@/lib/FetchingSensorData"
import { useToast } from "@/hooks/use-toast"
import {
  WeatherRecord,
  aggregateDaily,
  calculatePeriodStats,
  formatIdDateDash,
  formatIdDateShort,
  formatYMD,
  getDayAtSeven,
  splitIntoWeeks,
  findWeatherExtremes,
  calculateDataQuality,
  exportToCSV,
} from "@/lib/weatherUtils"
import { format } from "date-fns"
import { id } from "date-fns/locale"
import { PrintLayout } from "./PrintLayout"
import { generateCanvasFromDOM, exportAsPNG, exportAsJPEG, exportAsPDF, printCanvas } from "@/lib/exportUtils"
import { ERA5CorrectionPanel } from "./ERA5CorrectionPanel"
import { CorrectionOffsets, applyCorrectionToDailyRecords } from "@/lib/reanalysis/era5Correction"

const ReactECharts = dynamic(() => import("echarts-for-react"), { ssr: false });

const calculateBoxplotStats = (values: number[]) => {
  if (values.length === 0) return [0, 0, 0, 0, 0];
  const sorted = [...values].sort((a, b) => a - b);
  const min = sorted[0];
  const max = sorted[sorted.length - 1];
  
  const getPercentile = (p: number) => {
    const idx = (sorted.length - 1) * p;
    const low = Math.floor(idx);
    const high = Math.ceil(idx);
    return sorted[low] + (sorted[high] - sorted[low]) * (idx - low);
  };
  
  const q1 = getPercentile(0.25);
  const median = getPercentile(0.5);
  const q3 = getPercentile(0.75);
  
  return [min, q1, median, q3, max];
};

// --- CHARTS ---
const TemperatureTrendChart = ({ data }: { data: WeatherRecord[] }) => {
  const dates = data.map(d => {
    try {
      const parts = d.date.split('-');
      if (parts.length === 3) {
        const dateObj = new Date(Number(parts[0]), Number(parts[1]) - 1, Number(parts[2]));
        return dateObj.toLocaleDateString("id-ID", { day: "numeric", month: "short" });
      }
    } catch {}
    return d.date;
  });

  const option = {
    tooltip: { trigger: 'axis' },
    legend: { data: ['Maksimum', 'Rata-rata', 'Minimum'], top: 0 },
    grid: { left: '3%', right: '3%', bottom: '8%', top: '40px', containLabel: true },
    xAxis: { type: 'category', data: dates, splitLine: { show: false } },
    yAxis: { 
      type: 'value', 
      name: '°C', 
      scale: true,
      splitLine: { lineStyle: { color: '#f3f4f6' } } 
    },
    dataZoom: [
      { type: 'inside', start: 0, end: 100 },
      { type: 'slider', start: 0, end: 100, height: 16, bottom: 0 }
    ],
    series: [
      { name: 'Maksimum', type: 'line', data: data.map(d => d.temperatureMax), itemStyle: { color: '#ef4444' }, smooth: true },
      { name: 'Rata-rata', type: 'line', data: data.map(d => d.temperatureAvg), itemStyle: { color: '#f59e0b' }, lineStyle: { width: 3 }, smooth: true },
      { name: 'Minimum', type: 'line', data: data.map(d => d.temperatureMin), itemStyle: { color: '#3b82f6' }, smooth: true }
    ]
  };

  return <ReactECharts option={option} style={{ width: '100%', height: '260px' }} />;
};

const TemperatureBoxPlot = ({ rawData }: { rawData: SensorDate[] }) => {
  const temps = rawData.map(r => r.temperature).filter(Number.isFinite);
  const stats = calculateBoxplotStats(temps);

  const option = {
    tooltip: { trigger: 'item' },
    grid: { left: '8%', right: '8%', bottom: '15%', top: '10%', containLabel: true },
    xAxis: { type: 'category', data: ['Distribusi Suhu'] },
    yAxis: { 
      type: 'value', 
      name: '°C', 
      scale: true,
      splitLine: { lineStyle: { color: '#f3f4f6' } } 
    },
    series: [
      {
        name: 'Suhu',
        type: 'boxplot',
        data: [stats],
        itemStyle: { color: '#f59e0b', borderColor: '#d97706' }
      }
    ]
  };

  return <ReactECharts option={option} style={{ width: '100%', height: '260px' }} />;
};

const RainfallChart = ({ data }: { data: WeatherRecord[] }) => {
  const dates = data.map(d => {
    try {
      const parts = d.date.split('-');
      if (parts.length === 3) {
        const dateObj = new Date(Number(parts[0]), Number(parts[1]) - 1, Number(parts[2]));
        return dateObj.toLocaleDateString("id-ID", { day: "numeric", month: "short" });
      }
    } catch {}
    return d.date;
  });

  const option = {
    tooltip: { trigger: 'axis' },
    grid: { left: '3%', right: '3%', bottom: '8%', top: '20px', containLabel: true },
    xAxis: { type: 'category', data: dates, splitLine: { show: false } },
    yAxis: { type: 'value', name: 'mm', splitLine: { lineStyle: { color: '#f3f4f6' } } },
    dataZoom: [
      { type: 'inside', start: 0, end: 100 },
      { type: 'slider', start: 0, end: 100, height: 16, bottom: 0 }
    ],
    series: [
      { name: 'Curah Hujan', type: 'bar', data: data.map(d => d.rainfallTot), itemStyle: { color: '#0284C7', borderRadius: [4, 4, 0, 0] } }
    ]
  };

  return <ReactECharts option={option} style={{ width: '100%', height: '240px' }} />;
};

const MetricTrendChart = ({ data, dataKey, name, color, unit }: { data: WeatherRecord[], dataKey: keyof WeatherRecord, name: string, color: string, unit: string }) => {
  const dates = data.map(d => {
    try {
      const parts = d.date.split('-');
      if (parts.length === 3) {
        const dateObj = new Date(Number(parts[0]), Number(parts[1]) - 1, Number(parts[2]));
        return dateObj.toLocaleDateString("id-ID", { day: "numeric", month: "short" });
      }
    } catch {}
    return d.date;
  });

  const option = {
    tooltip: { trigger: 'axis' },
    grid: { left: '3%', right: '3%', bottom: '8%', top: '20px', containLabel: true },
    xAxis: { type: 'category', data: dates, splitLine: { show: false } },
    yAxis: { 
      type: 'value', 
      name: unit, 
      scale: true,
      splitLine: { lineStyle: { color: '#f3f4f6' } } 
    },
    dataZoom: [
      { type: 'inside', start: 0, end: 100 },
      { type: 'slider', start: 0, end: 100, height: 16, bottom: 0 }
    ],
    series: [
      { name, type: 'line', data: data.map(d => d[dataKey]), itemStyle: { color }, lineStyle: { width: 2.5 }, smooth: true }
    ]
  };

  return <ReactECharts option={option} style={{ width: '100%', height: '240px' }} />;
};

interface LaporanBulananProps {
  sensorId: string;
  sensorName: string;
  displayName: string;
}

export default function LaporanBulanan({ sensorId, sensorName, displayName }: LaporanBulananProps) {
  const { toast } = useToast()
  
  const [dateRange, setDateRange] = useState<DateRange | undefined>(() => {
    const end = getDayAtSeven(new Date().toISOString().split('T')[0]);
    const start = new Date(end);
    start.setDate(start.getDate() - 30);
    return { from: start, to: end };
  });

  const [viewMode, setViewMode] = useState<'web' | 'print'>('web');
  const [loading, setLoading] = useState(false)
  const [rawSensorData, setRawSensorData] = useState<SensorDate[]>([])
  const [rawWeatherData, setRawWeatherData] = useState<WeatherRecord[]>([])
  const [error, setError] = useState<string | null>(null)
  const [isExporting, setIsExporting] = useState(false)
  const reportId = "bulanan-print-area";

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

  const stats = useMemo(() => calculatePeriodStats(weatherData, rawSensorData), [weatherData, rawSensorData]);
  const extremes = useMemo(() => findWeatherExtremes(weatherData, rawSensorData), [weatherData, rawSensorData]);
  const weeks = useMemo(() => splitIntoWeeks(weatherData), [weatherData]);
  const daysCount = dateRange?.from && dateRange?.to ? Math.max(1, Math.ceil((dateRange.to.getTime() - dateRange.from.getTime()) / (1000 * 3600 * 24))) : 30;
  const quality = useMemo(() => calculateDataQuality(rawSensorData, daysCount), [rawSensorData, daysCount]);

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

      const filename = `Laporan_Bulanan_${sensorName.replace(/\s+/g, '_')}_${formatYMD(new Date())}`;

      if (type === 'png') exportAsPNG(canvas, filename);
      else if (type === 'jpg') exportAsJPEG(canvas, filename);
      else if (type === 'pdf') exportAsPDF([canvas], filename, 'portrait');
      else if (type === 'print') printCanvas(canvas);

      toast({ title: "✓ Berhasil", description: "Laporan siap diunduh/dicetak." });
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
    setError(null)
    try {
      const start = new Date(dateRange.from)
      start.setHours(0, 0, 0, 0)
      const end = new Date(dateRange.to)
      end.setHours(23, 59, 59, 999)

      const raw = await fetchSensorDataByDateRange(sensorId, start.getTime(), end.getTime());
      
      if (!raw || raw.length === 0) {
        setError("Tidak ada data pada periode tanggal tersebut.");
        setRawSensorData([]);
        setRawWeatherData([]);
        setLoading(false);
        return;
      }

      setRawSensorData(raw);
      const records = aggregateDaily(raw);
      records.sort((a, b) => a.date.localeCompare(b.date));
      setRawWeatherData(records);

    } catch (err: any) {
      console.error(err)
      setError("Gagal menarik data dari server.");
      toast({ title: "Error", description: err.message || "Gagal menarik data dari server", variant: "destructive" })
    } finally {
      setLoading(false)
    }
  }

  const handleDownloadCSV = () => {
    if (weatherData.length === 0) return;
    exportToCSV(weatherData, `Laporan_Bulanan_${sensorName.replace(/\s+/g, '_')}_${formatYMD(new Date())}.csv`);
  }

  const hasInitRef = useRef(false);
  useEffect(() => {
    if (sensorId && !hasInitRef.current) {
      hasInitRef.current = true;
      generateReport();
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sensorId]);

  const startDateStr = dateRange?.from ? format(dateRange.from, 'yyyy-MM-dd') : '';
  const endDateStr = dateRange?.to ? format(dateRange.to, 'yyyy-MM-dd') : '';

  return (
    <div className="space-y-6">
      {/* Control Panel */}
      <Card className="no-print shadow-sm border-slate-200 dark:border-slate-800">
        <CardContent className="p-4 flex flex-col md:flex-row gap-4 items-start md:items-center justify-between">
          <div className="flex flex-col gap-2 flex-grow">
            <div className="flex items-center justify-between gap-2 flex-wrap">
              <label className="text-sm font-semibold text-slate-800 dark:text-slate-200 flex items-center gap-2">
                <CalendarIcon className="w-4 h-4 text-blue-600" />
                Periode Rekapitulasi Bulanan
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

            <div className="flex items-center gap-2 flex-wrap">
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn("w-[280px] justify-start text-left font-normal", !dateRange && "text-muted-foreground")}
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
              <Button onClick={generateReport} disabled={loading} className="bg-blue-600 hover:bg-blue-700 text-white font-semibold">
                {loading ? "Memproses..." : "Proses Laporan"}
              </Button>
            </div>
          </div>

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

      {/* --- PANEL VALIDASI & KOREKSI ERA5 --- */}
      <ERA5CorrectionPanel
        sensorId={sensorId}
        sensorName={sensorName}
        startDate={startDateStr}
        endDate={endDateStr}
        rawAwsData={rawWeatherData}
        offsets={offsets}
        onOffsetsChange={setOffsets}
      />

      {error && <div className="text-red-600 p-4 bg-red-50 dark:bg-red-950/40 rounded-md border border-red-200">{error}</div>}

      {/* --- VIEW MODE 1: DASHBOARD WEB INTERAKTIF --- */}
      {viewMode === 'web' && weatherData.length > 0 && (
        <div className="space-y-6">
          {offsets.enabled && (
            <div className="flex items-center gap-2 p-3 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 rounded-lg text-xs text-emerald-800 dark:text-emerald-200">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>
                <strong>Mode Kalibrasi Aktif:</strong> Laporan bulanan telah dikoreksi dengan offset ERA5 (Suhu: {offsets.tempOffset > 0 ? "+" : ""}{offsets.tempOffset}°C, Kelembapan: {offsets.humOffset > 0 ? "+" : ""}{offsets.humOffset}%, Tekanan: {offsets.pressOffset > 0 ? "+" : ""}{offsets.pressOffset} hPa).
              </span>
            </div>
          )}

          {/* Hero Grid Metrics */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <Card className="border-orange-100 bg-gradient-to-br from-orange-50/50 via-white to-white dark:from-slate-900 dark:to-slate-800">
              <CardContent className="p-4 space-y-1.5">
                <div className="flex justify-between items-center text-xs font-semibold text-orange-700">
                  <span className="flex items-center gap-1.5"><Thermometer className="w-4 h-4 text-orange-500" /> Suhu Rata-rata</span>
                  <Badge variant="outline" className="text-[10px] bg-orange-50 text-orange-700">Bulanan</Badge>
                </div>
                <div className="text-3xl font-black text-slate-900 dark:text-slate-100">
                  {stats.avgTemp} <span className="text-sm font-normal text-slate-500">°C</span>
                </div>
                <div className="flex justify-between text-xs text-slate-500 pt-1 border-t">
                  <span>Maks: <strong className="text-red-600">{stats.maxTemp}°C</strong></span>
                  <span>Min: <strong className="text-blue-600">{stats.minTemp}°C</strong></span>
                </div>
              </CardContent>
            </Card>

            <Card className="border-sky-100 bg-gradient-to-br from-sky-50/50 via-white to-white dark:from-slate-900 dark:to-slate-800">
              <CardContent className="p-4 space-y-1.5">
                <div className="flex justify-between items-center text-xs font-semibold text-sky-700">
                  <span className="flex items-center gap-1.5"><CloudRain className="w-4 h-4 text-sky-500" /> Total Curah Hujan</span>
                  <Badge variant="outline" className="text-[10px] bg-sky-50 text-sky-700">Akumulasi</Badge>
                </div>
                <div className="text-3xl font-black text-sky-600">
                  {stats.totalRain} <span className="text-sm font-normal text-slate-500">mm</span>
                </div>
                <div className="flex justify-between text-xs text-slate-500 pt-1 border-t">
                  <span>Hari Hujan:</span>
                  <strong className="text-slate-700 dark:text-slate-300">{stats.rainyDays} Hari</strong>
                </div>
              </CardContent>
            </Card>

            <Card className="border-teal-100 bg-gradient-to-br from-teal-50/50 via-white to-white dark:from-slate-900 dark:to-slate-800">
              <CardContent className="p-4 space-y-1.5">
                <div className="flex justify-between items-center text-xs font-semibold text-teal-700">
                  <span className="flex items-center gap-1.5"><Wind className="w-4 h-4 text-teal-500" /> Kelembapan Udara</span>
                  <Badge variant="outline" className="text-[10px] bg-teal-50 text-teal-700">Rata-rata</Badge>
                </div>
                <div className="text-3xl font-black text-slate-900 dark:text-slate-100">
                  {stats.avgHum} <span className="text-sm font-normal text-slate-500">%</span>
                </div>
                <div className="text-xs text-slate-500 pt-1 border-t">
                  Rata-rata kelembapan relatif periode
                </div>
              </CardContent>
            </Card>

            <Card className="border-indigo-100 bg-gradient-to-br from-indigo-50/50 via-white to-white dark:from-slate-900 dark:to-slate-800">
              <CardContent className="p-4 space-y-1.5">
                <div className="flex justify-between items-center text-xs font-semibold text-indigo-700">
                  <span className="flex items-center gap-1.5"><Gauge className="w-4 h-4 text-indigo-500" /> Kualitas Data</span>
                  <Badge variant="outline" className="text-[10px] bg-indigo-50 text-indigo-700">Integritas</Badge>
                </div>
                <div className="text-3xl font-black text-indigo-600">
                  {quality.availabilityPercent.toFixed(1)} <span className="text-sm font-normal text-slate-500">%</span>
                </div>
                <div className="flex justify-between text-xs text-slate-500 pt-1 border-t">
                  <span>Data Diterima:</span>
                  <strong className="text-slate-700 dark:text-slate-300">{quality.actualTotal} / {quality.expectedTotal}</strong>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Interactive Web Charts */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card className="shadow-sm">
              <CardHeader className="py-3 px-4 bg-orange-50/60 border-b">
                <CardTitle className="text-sm font-bold text-orange-950">Tren Suhu Udara Bulanan</CardTitle>
              </CardHeader>
              <CardContent className="p-2">
                <TemperatureTrendChart data={weatherData} />
              </CardContent>
            </Card>

            <Card className="shadow-sm">
              <CardHeader className="py-3 px-4 bg-sky-50/60 border-b">
                <CardTitle className="text-sm font-bold text-sky-950">Distribusi Curah Hujan Bulanan</CardTitle>
              </CardHeader>
              <CardContent className="p-2">
                <RainfallChart data={weatherData} />
              </CardContent>
            </Card>

            <Card className="shadow-sm">
              <CardHeader className="py-3 px-4 bg-teal-50/60 border-b">
                <CardTitle className="text-sm font-bold text-teal-950">Tren Kelembapan Udara (%)</CardTitle>
              </CardHeader>
              <CardContent className="p-2">
                <MetricTrendChart data={weatherData} dataKey="humidityAvg" name="Kelembapan" color="#0ea5e9" unit="%" />
              </CardContent>
            </Card>

            <Card className="shadow-sm">
              <CardHeader className="py-3 px-4 bg-violet-50/60 border-b">
                <CardTitle className="text-sm font-bold text-violet-950">Tren Tekanan Udara (hPa)</CardTitle>
              </CardHeader>
              <CardContent className="p-2">
                <MetricTrendChart data={weatherData} dataKey="pressureAvg" name="Tekanan" color="#8b5cf6" unit="hPa" />
              </CardContent>
            </Card>
          </div>
        </div>
      )}

      {/* --- VIEW MODE 2: PRATINJAU LEMBAR CETAK (A4 LAYOUT) --- */}
      {viewMode === 'print' && weatherData.length > 0 && (
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
                id="visible-bulanan-preview"
                title="Laporan Cuaca Bulanan"
                sensorName={sensorName}
                generatedBy={displayName}
                periodLabel={`${dateRange?.from ? formatIdDateShort(dateRange.from) : ''} - ${dateRange?.to ? formatIdDateShort(dateRange.to) : ''}`}
                orientation="portrait"
              >
                <div className="space-y-6 mt-6">
                  {/* 2 Kolom Ringkasan Rata-rata Suhu & Kelembapan Kiri - Kanan */}
                  <div className="grid grid-cols-2 gap-4">
                    <div className="p-3 bg-orange-50/70 border border-orange-200 rounded-lg flex items-center justify-between">
                      <div>
                        <div className="text-xs font-semibold uppercase tracking-wide text-orange-800 flex items-center gap-1.5">
                          <Thermometer className="w-4 h-4 text-orange-600" />
                          Rata-rata Suhu Udara
                        </div>
                        <div className="text-2xl font-black text-orange-950 mt-0.5">
                          {stats.avgTemp} <span className="text-sm font-normal text-orange-700">°C</span>
                        </div>
                      </div>
                      <div className="text-right text-xs text-orange-700 font-medium">
                        <div>Maks: <strong className="text-red-600">{stats.maxTemp}°C</strong></div>
                        <div>Min: <strong className="text-blue-600">{stats.minTemp}°C</strong></div>
                      </div>
                    </div>

                    <div className="p-3 bg-blue-50/70 border border-blue-200 rounded-lg flex items-center justify-between">
                      <div>
                        <div className="text-xs font-semibold uppercase tracking-wide text-blue-800 flex items-center gap-1.5">
                          <Droplets className="w-4 h-4 text-blue-600" />
                          Rata-rata Kelembapan
                        </div>
                        <div className="text-2xl font-black text-blue-950 mt-0.5">
                          {stats.avgHum} <span className="text-sm font-normal text-blue-700">%</span>
                        </div>
                      </div>
                      <div className="text-right text-xs text-blue-700 font-medium">
                        <div>Total Hujan: <strong className="text-sky-700">{stats.totalRain} mm</strong></div>
                        <div>Hari Hujan: <strong className="text-slate-700">{stats.rainyDays} Hari</strong></div>
                      </div>
                    </div>
                  </div>

                  {/* 2 Kolom Grafik Berdampingan: Suhu (Kiri) & Hujan (Kanan) */}
                  <div className="grid grid-cols-2 gap-4 break-inside-avoid">
                    <Card className="border border-slate-200 shadow-sm print:shadow-none">
                      <CardHeader className="py-2.5 px-3 bg-orange-50/60 print:bg-transparent border-b">
                        <CardTitle className="text-xs font-bold flex items-center text-orange-800">
                          <Thermometer className="w-3.5 h-3.5 mr-1.5 text-orange-600" />
                          Tren Suhu Udara (°C)
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="p-0">
                        <TemperatureTrendChart data={weatherData} />
                      </CardContent>
                    </Card>

                    <Card className="border border-slate-200 shadow-sm print:shadow-none">
                      <CardHeader className="py-2.5 px-3 bg-sky-50/60 print:bg-transparent border-b">
                        <CardTitle className="text-xs font-bold flex items-center text-sky-800">
                          <CloudRain className="w-3.5 h-3.5 mr-1.5 text-sky-600" />
                          Curah Hujan Harian (mm)
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="p-0">
                        <RainfallChart data={weatherData} />
                      </CardContent>
                    </Card>
                  </div>

                  {/* Tabel Rekapitulasi Mingguan */}
                  <section className="break-inside-avoid mt-4">
                    <h2 className="text-base font-bold mb-3 border-l-4 border-slate-800 pl-3">Rekapitulasi Fluktuasi Mingguan</h2>
                    <div className="overflow-x-auto border rounded-lg">
                      <table className="w-full text-xs text-left">
                        <thead className="bg-slate-100 text-slate-700">
                          <tr>
                            <th className="px-3 py-2 font-semibold">Periode Minggu</th>
                            <th className="px-3 py-2 text-center font-semibold">Suhu Maksimum (°C)</th>
                            <th className="px-3 py-2 text-center font-semibold">Suhu Minimum (°C)</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-200">
                          {weeks.map((w, idx) => (
                            <tr key={idx} className={idx % 2 === 0 ? "bg-white" : "bg-slate-50"}>
                              <td className="px-3 py-2 font-medium">{w.weekName}</td>
                              <td className="px-3 py-2 text-center text-red-600 font-semibold">{w.maxTemp}°C ({w.maxTempDate})</td>
                              <td className="px-3 py-2 text-center text-blue-600 font-semibold">{w.minTemp}°C ({w.minTempDate})</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </section>
                </div>
              </PrintLayout>
            </div>
          </div>
        </div>
      )}

      {/* Hidden Print Canvas for Export */}
      <div className={cn("overflow-hidden h-0 w-0 absolute opacity-0 pointer-events-none", weatherData.length > 0 && "block")}>
        <PrintLayout 
          id={reportId}
          title="Laporan Cuaca Bulanan"
          sensorName={sensorName}
          generatedBy={displayName}
          periodLabel={`${dateRange?.from ? formatIdDateShort(dateRange.from) : ''} - ${dateRange?.to ? formatIdDateShort(dateRange.to) : ''}`}
          orientation="portrait"
        >
          <div className="space-y-6 mt-6">
            <div className="grid grid-cols-2 gap-4">
              <div className="p-3 bg-orange-50/70 border border-orange-200 rounded-lg flex items-center justify-between">
                <div>
                  <div className="text-xs font-semibold uppercase tracking-wide text-orange-800 flex items-center gap-1.5">
                    <Thermometer className="w-4 h-4 text-orange-600" />
                    Rata-rata Suhu Udara
                  </div>
                  <div className="text-2xl font-black text-orange-950 mt-0.5">
                    {stats.avgTemp} <span className="text-sm font-normal text-orange-700">°C</span>
                  </div>
                </div>
                <div className="text-right text-xs text-orange-700 font-medium">
                  <div>Maks: <strong className="text-red-600">{stats.maxTemp}°C</strong></div>
                  <div>Min: <strong className="text-blue-600">{stats.minTemp}°C</strong></div>
                </div>
              </div>

              <div className="p-3 bg-blue-50/70 border border-blue-200 rounded-lg flex items-center justify-between">
                <div>
                  <div className="text-xs font-semibold uppercase tracking-wide text-blue-800 flex items-center gap-1.5">
                    <Droplets className="w-4 h-4 text-blue-600" />
                    Rata-rata Kelembapan
                  </div>
                  <div className="text-2xl font-black text-blue-950 mt-0.5">
                    {stats.avgHum} <span className="text-sm font-normal text-blue-700">%</span>
                  </div>
                </div>
                <div className="text-right text-xs text-blue-700 font-medium">
                  <div>Total Hujan: <strong className="text-sky-700">{stats.totalRain} mm</strong></div>
                  <div>Hari Hujan: <strong className="text-slate-700">{stats.rainyDays} Hari</strong></div>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4 break-inside-avoid">
              <Card className="border border-slate-200 shadow-sm print:shadow-none">
                <CardHeader className="py-2.5 px-3 bg-orange-50/60 print:bg-transparent border-b">
                  <CardTitle className="text-xs font-bold flex items-center text-orange-800">
                    <Thermometer className="w-3.5 h-3.5 mr-1.5 text-orange-600" />
                    Tren Suhu Udara (°C)
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-0">
                  <TemperatureTrendChart data={weatherData} />
                </CardContent>
              </Card>

              <Card className="border border-slate-200 shadow-sm print:shadow-none">
                <CardHeader className="py-2.5 px-3 bg-sky-50/60 print:bg-transparent border-b">
                  <CardTitle className="text-xs font-bold flex items-center text-sky-800">
                    <CloudRain className="w-3.5 h-3.5 mr-1.5 text-sky-600" />
                    Curah Hujan Harian (mm)
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-0">
                  <RainfallChart data={weatherData} />
                </CardContent>
              </Card>
            </div>

            <section className="break-inside-avoid mt-4">
              <h2 className="text-base font-bold mb-3 border-l-4 border-slate-800 pl-3">Rekapitulasi Fluktuasi Mingguan</h2>
              <div className="overflow-x-auto border rounded-lg">
                <table className="w-full text-xs text-left">
                  <thead className="bg-slate-100 text-slate-700">
                    <tr>
                      <th className="px-3 py-2 font-semibold">Periode Minggu</th>
                      <th className="px-3 py-2 text-center font-semibold">Suhu Maksimum (°C)</th>
                      <th className="px-3 py-2 text-center font-semibold">Suhu Minimum (°C)</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200">
                    {weeks.map((w, idx) => (
                      <tr key={idx} className={idx % 2 === 0 ? "bg-white" : "bg-slate-50"}>
                        <td className="px-3 py-2 font-medium">{w.weekName}</td>
                        <td className="px-3 py-2 text-center text-red-600 font-semibold">{w.maxTemp}°C ({w.maxTempDate})</td>
                        <td className="px-3 py-2 text-center text-blue-600 font-semibold">{w.minTemp}°C ({w.minTempDate})</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>
          </div>
        </PrintLayout>
      </div>
    </div>
  );
}