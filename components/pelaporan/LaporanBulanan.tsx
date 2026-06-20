"use client"

import { useEffect, useRef, useState } from "react"
import { Calendar as CalendarIcon, Printer, Download, Thermometer, Droplets, Wind, Gauge, Sun } from "lucide-react"
import { useReactToPrint } from "react-to-print"
import { type DateRange } from "react-day-picker"
import dynamic from "next/dynamic"
import { Calendar } from "@/components/ui/calendar"
import { Popover, PopoverTrigger, PopoverContent } from "@/components/ui/popover"
import { Button } from "@/components/ui/button"
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card"
import { cn } from "@/lib/utils"
import { fetchSensorDataByDateRange, SensorDate } from "@/lib/FetchingSensorData"
import { useToast } from "@/hooks/use-toast"
import {
  WeatherRecord,
  aggregateDaily,
  calculatePeriodStats,
  formatDateTimeForDisplay,
  formatIdDateDash,
  formatIdDateShort,
  formatYMD,
  getDayAtSeven,
  splitIntoWeeks,
  findWeatherExtremes,
  calculateDataQuality,
  exportToCSV,
} from "@/lib/weatherUtils"

// Dynamically import ReactECharts to avoid SSR issues
const ReactECharts = dynamic(() => import("echarts-for-react"), { ssr: false });

// Helper to compute boxplot statistics manually for ECharts
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
    legend: { data: ['Max', 'Avg', 'Min'], top: 0 },
    grid: { left: '3%', right: '3%', bottom: '3%', top: '40px', containLabel: true },
    xAxis: { type: 'category', data: dates, splitLine: { show: false } },
    yAxis: { type: 'value', name: '°C', splitLine: { lineStyle: { color: '#f3f4f6' } } },
    series: [
      { name: 'Max', type: 'line', data: data.map(d => d.temperatureMax), itemStyle: { color: '#ef4444' }, smooth: true },
      { name: 'Avg', type: 'line', data: data.map(d => d.temperatureAvg), itemStyle: { color: '#f59e0b' }, lineStyle: { width: 3 }, smooth: true },
      { name: 'Min', type: 'line', data: data.map(d => d.temperatureMin), itemStyle: { color: '#3b82f6' }, smooth: true }
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
    yAxis: { type: 'value', name: '°C', splitLine: { lineStyle: { color: '#f3f4f6' } } },
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
    grid: { left: '3%', right: '3%', bottom: '3%', top: '20px', containLabel: true },
    xAxis: { type: 'category', data: dates, splitLine: { show: false } },
    yAxis: { type: 'value', name: 'mm', splitLine: { lineStyle: { color: '#f3f4f6' } } },
    series: [
      { name: 'Curah Hujan', type: 'bar', data: data.map(d => d.rainfallTot), itemStyle: { color: '#3b82f6' } }
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
    grid: { left: '3%', right: '3%', bottom: '5%', top: '20px', containLabel: true },
    xAxis: { type: 'category', data: dates, splitLine: { show: false } },
    yAxis: { type: 'value', name: unit, splitLine: { lineStyle: { color: '#f3f4f6' } } },
    series: [
      { name, type: 'line', data: data.map(d => (d[dataKey] as number) ?? 0), itemStyle: { color }, smooth: true }
    ]
  };

  return <ReactECharts option={option} style={{ width: '100%', height: '180px' }} />;
};

// --- HELPER COMPONENTS ---
const SummaryCard = ({ title, value, subtext, icon: Icon, colorClass }: { title: string, value: string, subtext: string, icon: any, colorClass: string }) => (
  <Card className="shadow-sm">
    <CardContent className="p-4 flex items-center gap-4">
      <div className={cn("p-3 rounded-full", colorClass)}>
        <Icon className="w-6 h-6 text-white" />
      </div>
      <div>
        <p className="text-sm font-medium text-muted-foreground">{title}</p>
        <h3 className="text-2xl font-bold">{value}</h3>
        <p className="text-xs text-muted-foreground">{subtext}</p>
      </div>
    </CardContent>
  </Card>
);

// --- MAIN COMPONENT ---
export default function LaporanBulanan({ sensorId, sensorName, displayName }: { sensorId: string, sensorName: string, displayName: string }) {
  const { toast } = useToast();

  const [dateRange, setDateRange] = useState<DateRange | undefined>(undefined);
  const [weatherData, setWeatherData] = useState<WeatherRecord[]>([]);
  const [rawData, setRawData] = useState<SensorDate[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!dateRange) {
      const now = new Date();
      const start = new Date(now);
      start.setDate(1); // First day of current month
      start.setHours(0, 0, 0, 0);
      const end = new Date(now);
      end.setHours(23, 59, 59, 999);
      setDateRange({ from: start, to: end });
    }
  }, [dateRange]);

  async function loadData() {
    if (!dateRange?.from || !dateRange?.to || !sensorId) return;
    setLoading(true);
    setError(null);

    try {
      const start = new Date(dateRange.from);
      start.setHours(0, 0, 0, 0);
      let end = new Date(dateRange.to);
      end.setHours(23, 59, 59, 999);

      if (end.getTime() <= start.getTime()) {
        end = new Date(start.getTime() + 24 * 60 * 60 * 1000 - 1);
      }

      toast({ title: "Memuat Data", description: `Memproses laporan...` });

      const raw = await fetchSensorDataByDateRange(sensorId, start.getTime(), end.getTime());
      setRawData(raw);

      const daily = aggregateDaily(raw);
      setWeatherData(daily);

      toast({ title: "Sukses", description: `${daily.length} hari data berhasil dimuat.` });
    } catch (e: any) {
      const msg = e?.message || "Gagal memuat data.";
      setError(msg);
      setWeatherData([]);
      toast({ variant: "destructive", title: "Error", description: msg });
    } finally {
      setLoading(false);
    }
  }

  const componentRef = useRef<HTMLElement>(null);
  const handlePrint = useReactToPrint({
    contentRef: componentRef,
    documentTitle: `Laporan Cuaca - ${sensorName}`,
  });

  const handleExportCSV = () => {
    exportToCSV(weatherData, sensorName);
    toast({ title: "Sukses", description: "Laporan CSV berhasil diunduh." });
  };

  function selectQuickRange(n: number, label: string) {
    const now = new Date();
    const start = new Date(now);
    start.setDate(now.getDate() - (n - 1));
    start.setHours(0, 0, 0, 0);
    const end = new Date(now);
    end.setHours(23, 59, 59, 999);
    setDateRange({ from: start, to: end });
  }

  const stats = calculatePeriodStats(weatherData, rawData);
  const weeks = splitIntoWeeks(weatherData);
  const extremes = findWeatherExtremes(weatherData, rawData);
  const dateRangeDays = weatherData.length || 1;
  const quality = calculateDataQuality(rawData, dateRangeDays, 10); // Assume 10 mins interval

  const topRainyDays = [...weatherData].sort((a, b) => b.rainfallTot - a.rainfallTot).slice(0, 10).filter(d => d.rainfallTot > 0);

  // Filter out today from charts if it's incomplete (less than 80% of expected samples)
  // This prevents the steep drop at the end of the line charts.
  const nowStr = formatYMD(new Date());
  const expectedDailySamples = (24 * 60) / 10; // Assumes 10 min intervals = 144 samples
  const chartData = weatherData.filter(d => {
    if (d.date === nowStr && d.sampleCount < expectedDailySamples * 0.8) {
      return false;
    }
    return true;
  });

  return (
    <div className="space-y-6">
      <Card className="no-print mb-6">
        <CardHeader className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 bg-slate-50 dark:bg-slate-900 border-b">
          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium">Rentang Laporan</label>
            <Popover>
              <PopoverTrigger asChild>
                <Button variant={"outline"} className={cn("w-[260px] justify-start text-left font-normal", !dateRange && "text-muted-foreground")}>
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {dateRange?.from ? (
                    dateRange.to ? `${formatIdDateDash(dateRange.from)} - ${formatIdDateDash(dateRange.to)}` : formatIdDateDash(dateRange.from)
                  ) : "Pilih Bulan"}
                </Button>
              </PopoverTrigger>
              <PopoverContent align="start" className="w-auto p-2">
                <Calendar mode="range" numberOfMonths={2} selected={dateRange} onSelect={setDateRange} className="rounded-lg border shadow-sm" />
              </PopoverContent>
            </Popover>
          </div>

          <div className="flex w-full flex-col justify-end gap-2 sm:w-auto sm:flex-row sm:items-end">
            <div className="flex flex-wrap gap-2">
              <Button variant="outline" onClick={() => selectQuickRange(7, "7 Hari")}>7 Hari</Button>
              <Button variant="outline" onClick={() => selectQuickRange(30, "30 Hari")}>30 Hari</Button>
            </div>
            <Button className="bg-blue-600 hover:bg-blue-700 text-white" onClick={loadData} disabled={loading}>
              {loading ? "Memproses..." : "Buat Laporan"}
            </Button>
            <Button className="bg-emerald-600 hover:bg-emerald-700 text-white" onClick={handleExportCSV} disabled={weatherData.length === 0}>
              <Download className="mr-2 h-4 w-4" /> CSV
            </Button>
            <Button className="bg-slate-800 hover:bg-slate-900 text-white" onClick={handlePrint} disabled={weatherData.length === 0}>
              <Printer className="mr-2 h-4 w-4" /> Cetak PDF
            </Button>
          </div>
        </CardHeader>
      </Card>

      {error && <div className="text-red-600 p-4 bg-red-50 rounded-md border border-red-200">{error}</div>}

      <main ref={componentRef} className="mx-auto bg-white text-slate-900 print:shadow-none min-h-screen print:text-sm">
        <style type="text/css" media="print">
          {`
            @page { size: A4 portrait; margin: 15mm; }
          `}
        </style>
        {weatherData.length > 0 && (
          <div className="p-6 print:p-2 space-y-8 print:space-y-4">
            
            {/* Header */}
            <header className="border-b-2 border-slate-800 pb-4 print:pb-2 flex justify-between items-end">
              <div>
                <h1 className="text-3xl print:text-xl font-bold uppercase text-slate-800">Laporan Cuaca Komprehensif</h1>
                <p className="text-slate-600 mt-1 font-medium print:text-xs">Stasiun: {sensorName} | Periode: {dateRange?.from && formatIdDateShort(dateRange.from)} - {dateRange?.to && formatIdDateShort(dateRange.to)}</p>
              </div>
              <div className="text-right">
                <img src="/img/logo.webp" alt="Logo" className="h-14 w-auto object-contain ml-auto mb-2" />
                <p className="text-xs text-slate-500">Dibuat pada: {formatDateTimeForDisplay(new Date())}</p>
              </div>
            </header>

            {/* Section 1: Overview */}
            <section>
              <h2 className="text-xl print:text-lg font-semibold mb-4 print:mb-2 border-l-4 border-blue-600 pl-3">Ringkasan Utama</h2>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 print:grid-cols-4 print:gap-2">
                <SummaryCard title="Suhu Rata-rata" value={`${stats.avgTemp}°C`} subtext={`Max: ${stats.maxTemp}°C | Min: ${stats.minTemp}°C`} icon={Thermometer} colorClass="bg-orange-500" />
                <SummaryCard title="Total Curah Hujan" value={`${stats.totalRain} mm`} subtext={`${stats.rainyDays} Hari Hujan`} icon={Droplets} colorClass="bg-blue-500" />
                <SummaryCard title="Kelembapan" value={`${stats.avgHum}%`} subtext={`Avg Kelembapan Udara`} icon={Wind} colorClass="bg-teal-500" />
                <SummaryCard title="Kualitas Data" value={`${quality.availabilityPercent.toFixed(1)}%`} subtext={`${quality.actualTotal} / ${quality.expectedTotal} Records`} icon={Gauge} colorClass="bg-indigo-500" />
              </div>
            </section>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 break-inside-avoid print:grid-cols-2 print:gap-4">
              {/* Section 2: Temperature */}
              <section>
                <h2 className="text-xl print:text-lg font-semibold mb-4 print:mb-2 border-l-4 border-orange-500 pl-3">Analisis Suhu</h2>
                <Card className="shadow-none border-slate-200">
                  <CardHeader className="pb-0"><CardTitle className="text-sm font-medium">Tren Suhu Harian</CardTitle></CardHeader>
                  <CardContent><TemperatureTrendChart data={chartData} /></CardContent>
                </Card>
              </section>

              <section>
                <h2 className="text-xl print:text-lg font-semibold mb-4 print:mb-2 border-l-4 border-orange-500 pl-3 border-transparent text-transparent select-none">.</h2>
                <Card className="shadow-none border-slate-200">
                  <CardHeader className="pb-0"><CardTitle className="text-sm font-medium">Distribusi Suhu (Box Plot)</CardTitle></CardHeader>
                  <CardContent><TemperatureBoxPlot rawData={rawData} /></CardContent>
                </Card>
              </section>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 break-inside-avoid print:grid-cols-2 print:gap-4">
              {/* Section 3: Weekly Temperature */}
              <section>
                <h2 className="text-xl print:text-lg font-semibold mb-4 print:mb-2 border-l-4 border-amber-500 pl-3">Laporan Suhu Mingguan</h2>
                <Card className="shadow-none border-slate-200 overflow-hidden">
                  <table className="w-full text-sm">
                    <thead className="bg-slate-100">
                      <tr><th className="p-3 text-left">Minggu</th><th className="p-3 text-left">Suhu Tertinggi</th><th className="p-3 text-left">Suhu Terendah</th></tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200">
                      {weeks.map((w, i) => (
                        <tr key={i} className="hover:bg-slate-50">
                          <td className="p-3 font-medium">{w.weekName}</td>
                          <td className="p-3 text-red-600">{w.maxTemp.toFixed(1)}°C <span className="text-xs text-slate-400 block">{formatIdDateShort(w.maxTempDate)}</span></td>
                          <td className="p-3 text-blue-600">{w.minTemp.toFixed(1)}°C <span className="text-xs text-slate-400 block">{formatIdDateShort(w.minTempDate)}</span></td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </Card>
              </section>

              {/* Section 4: Rainfall Top 10 */}
              <section>
                <h2 className="text-xl print:text-lg font-semibold mb-4 print:mb-2 border-l-4 border-blue-500 pl-3">Top 10 Hari Paling Hujan</h2>
                <Card className="shadow-none border-slate-200 overflow-hidden">
                  <table className="w-full text-sm">
                    <thead className="bg-slate-100">
                      <tr><th className="p-3 text-left">Peringkat</th><th className="p-3 text-left">Tanggal</th><th className="p-3 text-left">Curah Hujan (mm)</th></tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200">
                      {topRainyDays.length > 0 ? topRainyDays.map((d, i) => (
                        <tr key={i} className="hover:bg-slate-50">
                          <td className="p-3 text-slate-500">#{i + 1}</td>
                          <td className="p-3">{formatIdDateDash(d.date)}</td>
                          <td className="p-3 font-medium text-blue-600">{d.rainfallTot.toFixed(1)} mm</td>
                        </tr>
                      )) : <tr><td colSpan={3} className="p-4 text-center text-slate-500">Tidak ada hujan tercatat di periode ini.</td></tr>}
                    </tbody>
                  </table>
                </Card>
              </section>
            </div>

            {/* Section 4.5: Rainfall Chart */}
            <section className="break-inside-avoid">
              <h2 className="text-xl print:text-lg font-semibold mb-4 print:mb-2 border-l-4 border-blue-500 pl-3">Analisis Curah Hujan</h2>
              <Card className="shadow-none border-slate-200">
                <CardHeader className="pb-0"><CardTitle className="text-sm font-medium">Grafik Curah Hujan Harian</CardTitle></CardHeader>
                <CardContent><RainfallChart data={chartData} /></CardContent>
              </Card>
            </section>

            {/* Section 5: Humidity & Pressure & Lux */}
            <section className="break-inside-avoid">
              <h2 className="text-xl print:text-lg font-semibold mb-4 print:mb-2 border-l-4 border-teal-500 pl-3">Analisis Lanjutan (Kelembapan, Tekanan, Radiasi)</h2>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 print:grid-cols-3 print:gap-2">
                <Card className="shadow-none border-slate-200">
                  <CardHeader className="pb-0"><CardTitle className="text-xs font-medium">Tren Kelembapan (%)</CardTitle></CardHeader>
                  <CardContent className="p-2"><MetricTrendChart data={chartData} dataKey="humidityAvg" name="Kelembapan" color="#14b8a6" unit="%" /></CardContent>
                </Card>
                <Card className="shadow-none border-slate-200">
                  <CardHeader className="pb-0"><CardTitle className="text-xs font-medium">Tren Tekanan (hPa)</CardTitle></CardHeader>
                  <CardContent className="p-2"><MetricTrendChart data={chartData} dataKey="pressureAvg" name="Tekanan" color="#8b5cf6" unit="hPa" /></CardContent>
                </Card>
                <Card className="shadow-none border-slate-200">
                  <CardHeader className="pb-0"><CardTitle className="text-xs font-medium">Tren Radiasi (Lux)</CardTitle></CardHeader>
                  <CardContent className="p-2"><MetricTrendChart data={chartData} dataKey="luxAvg" name="Radiasi" color="#eab308" unit="Lux" /></CardContent>
                </Card>
              </div>
            </section>

            {/* Section 6: Extremes & Quality */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 break-inside-avoid print:grid-cols-2 print:gap-4">
              <section>
                <h2 className="text-xl print:text-lg font-semibold mb-4 print:mb-2 border-l-4 border-red-500 pl-3">Kejadian Ekstrem</h2>
                <div className="grid grid-cols-2 gap-3 print:grid-cols-2 print:gap-2">
                  <div className="bg-red-50 p-3 rounded border border-red-100 print:p-2">
                    <p className="text-xs text-red-600 font-medium">Hari Terpanas</p>
                    <p className="text-lg font-bold text-slate-800">{extremes.hottestDay.value.toFixed(1)}°C</p>
                    <p className="text-[10px] text-slate-500">{extremes.hottestDay.date}</p>
                  </div>
                  <div className="bg-blue-50 p-3 rounded border border-blue-100 print:p-2">
                    <p className="text-xs text-blue-600 font-medium">Hari Terdingin</p>
                    <p className="text-lg font-bold text-slate-800">{extremes.coldestDay.value.toFixed(1)}°C</p>
                    <p className="text-[10px] text-slate-500">{extremes.coldestDay.date}</p>
                  </div>
                  <div className="bg-cyan-50 p-3 rounded border border-cyan-100 print:p-2">
                    <p className="text-xs text-cyan-600 font-medium">Hari Terbasah (Hujan)</p>
                    <p className="text-lg font-bold text-slate-800">{extremes.wettestDay.value.toFixed(1)} mm</p>
                    <p className="text-[10px] text-slate-500">{extremes.wettestDay.date}</p>
                  </div>
                  <div className="bg-teal-50 p-3 rounded border border-teal-100 print:p-2">
                    <p className="text-xs text-teal-600 font-medium">Hari Paling Lembap</p>
                    <p className="text-lg font-bold text-slate-800">{extremes.mostHumidDay.value.toFixed(1)}%</p>
                    <p className="text-[10px] text-slate-500">{extremes.mostHumidDay.date}</p>
                  </div>
                </div>
              </section>

              <section>
                <h2 className="text-xl print:text-lg font-semibold mb-4 print:mb-2 border-l-4 border-indigo-500 pl-3">Kualitas Data Pengamatan</h2>
                <Card className="shadow-none border-slate-200">
                  <CardContent className="p-0">
                    <table className="w-full text-sm print:text-xs">
                      <tbody className="divide-y divide-slate-100">
                        <tr><td className="p-3 text-slate-500">Total Data Diterima</td><td className="p-3 font-medium text-right">{quality.actualTotal} baris</td></tr>
                        <tr><td className="p-3 text-slate-500">Estimasi Data Ideal (Interval 10 mnt)</td><td className="p-3 font-medium text-right">{quality.expectedTotal} baris</td></tr>
                        <tr><td className="p-3 text-slate-500">Data Hilang / Missed</td><td className="p-3 font-medium text-right text-red-500">{quality.missingRecords} baris</td></tr>
                        <tr><td className="p-3 text-slate-500">Gap Data Terpanjang</td><td className="p-3 font-medium text-right">{quality.longestGapMins > 0 ? `${quality.longestGapMins} menit` : '0 menit'}</td></tr>
                        <tr><td className="p-3 text-slate-500 font-medium">Ketersediaan Data (Availability)</td><td className="p-3 font-bold text-right text-indigo-600">{quality.availabilityPercent.toFixed(2)}%</td></tr>
                      </tbody>
                    </table>
                  </CardContent>
                </Card>
              </section>
            </div>

            <footer className="mt-12 print:mt-6 border-t-2 border-slate-200 pt-6 print:pt-4 text-center break-inside-avoid">
              <div className="flex justify-between items-end max-w-sm mx-auto w-full mb-8">
                <div className="text-center w-full">
                  <p className="text-sm text-slate-500 mb-16">Mengetahui,<br/>Pengamat Cuaca</p>
                  <p className="font-bold underline text-slate-800">{displayName}</p>
                </div>
              </div>
              <p className="text-xs text-slate-400">Dicetak melalui Dashboard Meteo Sense secara otomatis.</p>
            </footer>

          </div>
        )}
      </main>
    </div>
  )
}