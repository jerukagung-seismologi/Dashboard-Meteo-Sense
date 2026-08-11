"use client"

import { useEffect, useRef, useState } from "react"
import { FileImage, FileType, Printer, Download, ThermometerSun, Droplets, Wind, Gauge, CalendarIcon, Loader2 } from "lucide-react"
import { type DateRange } from "react-day-picker"
import dynamic from "next/dynamic"
import { Calendar } from "@/components/ui/calendar"
import { Popover, PopoverTrigger, PopoverContent } from "@/components/ui/popover"
import { Button } from "@/components/ui/button"
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card"
import { cn } from "@/lib/utils"
import { fetchSensorDataByDateRange } from "@/lib/apiClient"
import type { SensorDate } from "@/lib/FetchingSensorData"
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

const ReactECharts = dynamic(() => import("echarts-for-react"), { ssr: false });

// Chart with Min, Avg, Max lines
const TripleLineChart = ({ data, dataKeyMax, dataKeyMin, dataKeyAvg, name, colorMax, colorMin, colorAvg, unit }: any) => {
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
    tooltip: { trigger: 'axis' },
    legend: { data: ['Maksimum', 'Rata-rata', 'Minimum'], top: 0 },
    grid: { left: '3%', right: '3%', bottom: '3%', top: '40px', containLabel: true },
    xAxis: { type: 'category', data: dates, splitLine: { show: false } },
    yAxis: { 
      type: 'value', 
      name: unit, 
      scale: true, // Do not start at 0, adjust dynamically based on data min/max
      splitLine: { lineStyle: { color: '#f3f4f6' } } 
    },
    series: [
      { name: 'Maksimum', type: 'line', data: data.map((d: any) => d[dataKeyMax]), itemStyle: { color: colorMax }, smooth: true, lineStyle: { width: 2 } },
      { name: 'Rata-rata', type: 'line', data: data.map((d: any) => d[dataKeyAvg]), itemStyle: { color: colorAvg }, smooth: true, lineStyle: { width: 2.5, type: 'dashed' } },
      { name: 'Minimum', type: 'line', data: data.map((d: any) => d[dataKeyMin]), itemStyle: { color: colorMin }, smooth: true, lineStyle: { width: 2 } },
    ]
  };

  return <ReactECharts option={option} style={{ width: '100%', height: '300px' }} />;
};

interface LaporanMeteorologiProps {
  sensorId: string;
  sensorName: string;
  displayName: string;
}

type PeriodMode = 'mingguan' | 'dasarian' | 'custom';

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

  // --- Mingguan state ---
  const [weekOffset, setWeekOffset] = useState<number>(0); // 0 = current week

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
  const [weatherData, setWeatherData] = useState<WeatherRecord[]>([])
  const [isExporting, setIsExporting] = useState(false)
  const reportId = "meteorologi-print-area";

  const handleExport = async (type: 'pdf' | 'png' | 'jpg' | 'print') => {
    if (weatherData.length === 0) return;
    setIsExporting(true);
    toast({ title: "Memproses Laporan...", description: "Mohon tunggu sebentar, sedang merender." });

    // Give UI a moment to show toast before heavy canvas work
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

      toast({ title: "Berhasil", description: "Laporan siap." });
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

      // Fetch from API directly using true (calibrated)
      const raw = await fetchSensorDataByDateRange(sensorId, start.getTime(), end.getTime());

      if (!raw || raw.length === 0) {
        toast({ title: "Informasi", description: "Tidak ada data pada periode tersebut" })
        setWeatherData([])
        setLoading(false)
        return
      }

      const records: WeatherRecord[] = aggregateDaily(raw)
      records.sort((a, b) => a.date.localeCompare(b.date))

      setWeatherData(records)

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

  // Sync dateRange when mode/navigation changes, then auto-fetch
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

  // Auto-fetch whenever dateRange changes (for preset modes)
  const hasInitRef = useRef(false);
  useEffect(() => {
    if (mode === 'custom') return;
    if (!sensorId || !dateRange?.from || !dateRange?.to) return;
    generateReport();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dateRange, sensorId]);

  // Initial auto-load
  useEffect(() => {
    if (sensorId && !hasInitRef.current) {
      hasInitRef.current = true;
    }
  }, [sensorId]);

  const handleSelectMode = (newMode: PeriodMode) => {
    setMode(newMode);
    if (newMode === 'custom') {
      // Keep current dateRange for custom editing
    }
  };

  return (
    <div className="space-y-6">
      {/* Control Panel */}
      <Card className="no-print mb-6">
        <CardContent className="p-4 flex flex-col md:flex-row gap-4 items-end justify-between">
          <div className="flex flex-col gap-3 flex-grow">
            <label className="text-sm font-medium text-slate-700 dark:text-slate-200">Periode Laporan</label>

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
            </div>            {/* Mingguan Navigator */}
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


          <div className="flex flex-wrap gap-2">
            <Button variant="outline" onClick={handleDownloadCSV} disabled={weatherData.length === 0}>
              <Download className="mr-2 h-4 w-4" /> CSV
            </Button>
            <Button variant="outline" onClick={() => handleExport('png')} disabled={weatherData.length === 0 || isExporting}>
              <FileImage className="mr-2 h-4 w-4 text-green-600" /> PNG
            </Button>
            <Button variant="outline" onClick={() => handleExport('pdf')} disabled={weatherData.length === 0 || isExporting}>
              <FileType className="mr-2 h-4 w-4 text-red-600" /> PDF
            </Button>
            <Button className="bg-slate-800 hover:bg-slate-900 text-white" onClick={() => handleExport('print')} disabled={weatherData.length === 0 || isExporting}>
              <Printer className="mr-2 h-4 w-4" /> Cetak
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Printable Area Wrapper (Visually hidden but rendered for canvas) */}
      <div className={cn("overflow-hidden h-0 w-0 absolute opacity-0 pointer-events-none", weatherData.length > 0 && "block")}>
        <PrintLayout
          id={reportId}
          title="Laporan Meteorologi"
          sensorName={sensorName}
          generatedBy={displayName}
          periodLabel={`${dateRange?.from ? formatIdDateShort(dateRange.from) : ''} - ${dateRange?.to ? formatIdDateShort(dateRange.to) : ''}`}
          orientation="portrait"
        >
          {/* Charts Section */}
          <section className="space-y-6 mt-6">
            <h2 className="text-xl print:text-lg font-semibold mb-4 print:mb-2 border-l-4 border-slate-800 pl-3">Visualisasi Fluktuasi Harian</h2>

            <div className="grid grid-cols-1 gap-6 print:gap-4 break-inside-avoid">
              <Card className="border border-slate-200 shadow-sm print:shadow-none">
                <CardHeader className="py-3 print:py-2 bg-orange-50 print:bg-transparent border-b">
                  <CardTitle className="text-sm font-semibold flex items-center text-orange-800">
                    <ThermometerSun className="w-4 h-4 mr-2" />
                    Suhu Udara Harian (Min, Rata-rata & Max)
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
                  />
                </CardContent>
              </Card>

              <Card className="border border-slate-200 shadow-sm print:shadow-none break-inside-avoid">
                <CardHeader className="py-3 print:py-2 bg-blue-50 print:bg-transparent border-b">
                  <CardTitle className="text-sm font-semibold flex items-center text-blue-800">
                    <Droplets className="w-4 h-4 mr-2" />
                    Kelembaban Udara Harian (Min, Rata-rata & Max)
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
                  />
                </CardContent>
              </Card>

              <Card className="border border-slate-200 shadow-sm print:shadow-none break-inside-avoid">
                <CardHeader className="py-3 print:py-2 bg-violet-50 print:bg-transparent border-b">
                  <CardTitle className="text-sm font-semibold flex items-center text-violet-800">
                    <Gauge className="w-4 h-4 mr-2" />
                    Tekanan Udara Harian (Min, Rata-rata & Max)
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-0">
                  <TripleLineChart
                    data={weatherData}
                    dataKeyMax="pressureMax"
                    dataKeyAvg="pressureAvg"
                    dataKeyMin="pressureMin"
                    colorMax="#7c3aed"
                    colorAvg="#a855f7"
                    colorMin="#c084fc"
                    unit="hPa"
                  />
                </CardContent>
              </Card>
            </div>
          </section>

          {/* Table Section */}
          <section className="break-inside-avoid">
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
