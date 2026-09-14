"use client"

import { useEffect, useRef, useState, useMemo } from "react"
import { 
  FileImage, 
  FileType, 
  Printer, 
  Download, 
  Thermometer, 
  Droplets, 
  CalendarIcon,
  LayoutDashboard,
  Eye,
  CheckCircle2,
  AlertCircle,
  CloudRain,
  ChevronLeft,
  ChevronRight,
  Sparkles,
  Info
} from "lucide-react"
import dynamic from "next/dynamic"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Switch } from "@/components/ui/switch"
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
  findWeatherExtremes,
  calculateDataQuality,
  exportToCSV,
} from "@/lib/weatherUtils"
import { format } from "date-fns"
import { id } from "date-fns/locale"
import { PrintLayout } from "./PrintLayout"
import { generateCanvasFromDOM, exportAsPNG, exportAsJPEG, exportAsPDF, printCanvas } from "@/lib/exportUtils"
import { ERA5CorrectionPanel } from "./ERA5CorrectionPanel"
import { 
  CorrectionOffsets, 
  applyCorrectionToDailyRecords,
  imputeMonthlyWeatherRecords,
  MonthlyImputationSummary
} from "@/lib/reanalysis/era5Correction"
import { ReportPublicationCard } from "./ReportPublicationCard"

const ReactECharts = dynamic(() => import("echarts-for-react"), { ssr: false });

// --- HELPERS ---
const formatDateLabel = (dateStr: string) => {
  try {
    const parts = dateStr.split('-');
    if (parts.length === 3) {
      const dateObj = new Date(Number(parts[0]), Number(parts[1]) - 1, Number(parts[2]));
      return dateObj.toLocaleDateString("id-ID", { day: "numeric", month: "short" });
    }
  } catch {}
  return dateStr;
};

// --- CHARTS ---
const TemperatureTrendChart = ({ data }: { data: WeatherRecord[] }) => {
  const dates = data.map(d => formatDateLabel(d.date));
  const allTemps = data.flatMap(d => [d.temperatureMax, d.temperatureAvg, d.temperatureMin]).filter((v): v is number => typeof v === 'number' && Number.isFinite(v));
  const tempMin = allTemps.length > 0 ? Math.floor(Math.min(...allTemps)) : undefined;
  const tempMax = allTemps.length > 0 ? Math.ceil(Math.max(...allTemps)) : undefined;

  const option = {
    tooltip: {
      trigger: 'axis',
      formatter: (params: any[]) => {
        if (!params?.length) return '';
        const date = params[0].axisValue;
        let html = `<div style="font-weight:600;margin-bottom:4px;font-size:11px">${date}</div>`;
        params.forEach((p: any) => {
          html += `<div style="display:flex;align-items:center;gap:6px;margin:2px 0">`;
          html += `<span style="display:inline-block;width:8px;height:8px;border-radius:50%;background:${p.color}"></span>`;
          html += `<span>${p.seriesName}: <b>${p.value != null ? Number(p.value).toFixed(2) : '—'}°C</b></span></div>`;
        });
        return html;
      }
    },
    legend: { data: ['Maksimum', 'Rata-rata', 'Minimum'], top: 0, textStyle: { fontSize: 11 } },
    grid: { left: '3%', right: '3%', bottom: '30px', top: '40px', containLabel: true },
    xAxis: { type: 'category', data: dates, splitLine: { show: false }, axisLabel: { fontSize: 10 } },
    yAxis: { 
      type: 'value', 
      name: '°C', 
      scale: true,
      min: tempMin,
      max: tempMax,
      splitLine: { lineStyle: { color: '#f3f4f6' } },
      axisLabel: { fontSize: 10 }
    },
    dataZoom: [
      { type: 'inside', start: 0, end: 100 },
      { type: 'slider', start: 0, end: 100, height: 16, bottom: 4 }
    ],
    series: [
      { name: 'Maksimum', type: 'line', data: data.map(d => d.temperatureMax), itemStyle: { color: '#ef4444' }, lineStyle: { color: '#ef4444' }, showSymbol: false, smooth: true },
      { name: 'Rata-rata', type: 'line', data: data.map(d => d.temperatureAvg), itemStyle: { color: '#f59e0b' }, lineStyle: { color: '#f59e0b', width: 2.5 }, showSymbol: false, smooth: true },
      { name: 'Minimum', type: 'line', data: data.map(d => d.temperatureMin), itemStyle: { color: '#3b82f6' }, lineStyle: { color: '#3b82f6' }, showSymbol: false, smooth: true }
    ]
  };

  return <ReactECharts option={option} style={{ width: '100%', height: '270px' }} notMerge={false} />;
};

const HumidityTrendChart = ({ data }: { data: WeatherRecord[] }) => {
  const dates = data.map(d => formatDateLabel(d.date));
  const allHums = data.flatMap(d => [d.humidityMax, d.humidityAvg, d.humidityMin]).filter((v): v is number => typeof v === 'number' && Number.isFinite(v));
  const humMin = allHums.length > 0 ? Math.max(0, Math.floor(Math.min(...allHums))) : 0;
  const humMax = allHums.length > 0 ? Math.min(100, Math.ceil(Math.max(...allHums))) : 100;

  const option = {
    tooltip: {
      trigger: 'axis',
      formatter: (params: any[]) => {
        if (!params?.length) return '';
        const date = params[0].axisValue;
        let html = `<div style="font-weight:600;margin-bottom:4px;font-size:11px">${date}</div>`;
        params.forEach((p: any) => {
          html += `<div style="display:flex;align-items:center;gap:6px;margin:2px 0">`;
          html += `<span style="display:inline-block;width:8px;height:8px;border-radius:50%;background:${p.color}"></span>`;
          html += `<span>${p.seriesName}: <b>${p.value != null ? Number(p.value).toFixed(2) : '—'}%</b></span></div>`;
        });
        return html;
      }
    },
    legend: { data: ['Maks', 'Rata-rata', 'Min'], top: 0, textStyle: { fontSize: 11 } },
    grid: { left: '3%', right: '3%', bottom: '30px', top: '40px', containLabel: true },
    xAxis: { type: 'category', data: dates, splitLine: { show: false }, axisLabel: { fontSize: 10 } },
    yAxis: {
      type: 'value',
      name: '%',
      min: humMin,
      max: humMax,
      splitLine: { lineStyle: { color: '#f3f4f6' } },
      axisLabel: { fontSize: 10 }
    },
    dataZoom: [
      { type: 'inside', start: 0, end: 100 },
      { type: 'slider', start: 0, end: 100, height: 16, bottom: 4 }
    ],
    series: [
      { name: 'Maks', type: 'line', data: data.map(d => d.humidityMax), itemStyle: { color: '#06b6d4' }, lineStyle: { color: '#06b6d4' }, showSymbol: false, smooth: true },
      { name: 'Rata-rata', type: 'line', data: data.map(d => d.humidityAvg), itemStyle: { color: '#0ea5e9' }, lineStyle: { color: '#0ea5e9', width: 2.5 }, showSymbol: false, smooth: true },
      { name: 'Min', type: 'line', data: data.map(d => d.humidityMin), itemStyle: { color: '#6366f1' }, lineStyle: { color: '#6366f1' }, showSymbol: false, smooth: true }
    ]
  };

  return <ReactECharts option={option} style={{ width: '100%', height: '270px' }} notMerge={false} />;
};

const RainfallChart = ({ data }: { data: WeatherRecord[] }) => {
  const dates = data.map(d => formatDateLabel(d.date));
  const dailyRain = data.map(d => d.rainfallTot ?? 0);

  // Build cumulative accumulation
  const accumulation: number[] = [];
  let cum = 0;
  for (const r of dailyRain) {
    cum += r;
    accumulation.push(Number(cum.toFixed(2)));
  }

  const option = {
    tooltip: {
      trigger: 'axis',
      formatter: (params: any[]) => {
        if (!params?.length) return '';
        const date = params[0].axisValue;
        let html = `<div style="font-weight:600;margin-bottom:4px;font-size:11px">${date}</div>`;
        params.forEach((p: any) => {
          html += `<div style="display:flex;align-items:center;gap:6px;margin:2px 0">`;
          html += `<span style="display:inline-block;width:8px;height:8px;border-radius:${p.seriesType === 'bar' ? '2px' : '50%'};background:${p.color}"></span>`;
          html += `<span>${p.seriesName}: <b>${p.value != null ? Number(p.value).toFixed(2) : '0'} mm</b></span></div>`;
        });
        return html;
      }
    },
    legend: { data: ['Hujan Harian', 'Akumulasi'], top: 0, textStyle: { fontSize: 11 } },
    grid: { left: '3%', right: '8%', bottom: '30px', top: '40px', containLabel: true },
    xAxis: { type: 'category', data: dates, splitLine: { show: false }, axisLabel: { fontSize: 10 } },
    yAxis: [
      { type: 'value', name: 'Harian (mm)', splitLine: { lineStyle: { color: '#f3f4f6' } }, axisLabel: { fontSize: 10 } },
      { type: 'value', name: 'Akum. (mm)', position: 'right', splitLine: { show: false }, axisLabel: { fontSize: 10 } }
    ],
    dataZoom: [
      { type: 'inside', start: 0, end: 100 },
      { type: 'slider', start: 0, end: 100, height: 16, bottom: 4 }
    ],
    series: [
      {
        name: 'Hujan Harian',
        type: 'bar',
        yAxisIndex: 0,
        data: dailyRain,
        itemStyle: { color: '#0ea5e9', borderRadius: [3, 3, 0, 0] }
      },
      {
        name: 'Akumulasi',
        type: 'line',
        yAxisIndex: 1,
        data: accumulation,
        smooth: true,
        showSymbol: false,
        lineStyle: { color: '#7c3aed', width: 2 },
        itemStyle: { color: '#7c3aed' },
        areaStyle: { color: 'rgba(124,58,237,0.08)' }
      }
    ]
  };

  return <ReactECharts option={option} style={{ width: '100%', height: '270px' }} notMerge={false} />;
};

interface LaporanBulananProps {
  sensorId: string;
  sensorName: string;
  displayName: string;
  lat?: number;
  lng?: number;
}

const MONTH_OPTIONS = [
  { value: 1, label: "Januari" },
  { value: 2, label: "Februari" },
  { value: 3, label: "Maret" },
  { value: 4, label: "April" },
  { value: 5, label: "Mei" },
  { value: 6, label: "Juni" },
  { value: 7, label: "Juli" },
  { value: 8, label: "Agustus" },
  { value: 9, label: "September" },
  { value: 10, label: "Oktober" },
  { value: 11, label: "November" },
  { value: 12, label: "Desember" },
];

export default function LaporanBulanan({
  sensorId,
  sensorName,
  displayName,
  lat = -7.67,
  lng = 109.65
}: LaporanBulananProps) {
  const { toast } = useToast()
  
  const now = new Date();
  const [selectedMonth, setSelectedMonth] = useState<number>(() => now.getMonth() + 1); // 1 - 12
  const [selectedYear, setSelectedYear] = useState<number>(() => now.getFullYear());

  const [viewMode, setViewMode] = useState<'web' | 'print'>('web');
  const [loading, setLoading] = useState(false);
  const [rawSensorData, setRawSensorData] = useState<SensorDate[]>([]);
  const [rawWeatherData, setRawWeatherData] = useState<WeatherRecord[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [isExporting, setIsExporting] = useState(false);
  const reportId = "bulanan-print-area";

  // --- Imputation State ---
  const [enableImputation, setEnableImputation] = useState<boolean>(true);
  const [era5Data, setEra5Data] = useState<any | null>(null);
  const [loadingEra5, setLoadingEra5] = useState<boolean>(false);

  // --- ERA5 Calibration & Correction State ---
  const [offsets, setOffsets] = useState<CorrectionOffsets>({
    tempOffset: 0,
    humOffset: 0,
    pressOffset: 0,
    enabled: false,
  });

  const daysInMonth = useMemo(() => {
    return new Date(selectedYear, selectedMonth, 0).getDate();
  }, [selectedYear, selectedMonth]);

  const monthLabel = useMemo(() => {
    return MONTH_OPTIONS.find(m => m.value === selectedMonth)?.label || "Bulan";
  }, [selectedMonth]);

  const startDateStr = useMemo(() => {
    return `${selectedYear}-${String(selectedMonth).padStart(2, '0')}-01`;
  }, [selectedYear, selectedMonth]);

  const endDateStr = useMemo(() => {
    return `${selectedYear}-${String(selectedMonth).padStart(2, '0')}-${String(daysInMonth).padStart(2, '0')}`;
  }, [selectedYear, selectedMonth, daysInMonth]);

  const yearsList = useMemo(() => {
    const curr = new Date().getFullYear();
    const arr: number[] = [];
    for (let y = curr; y >= 2020; y--) {
      arr.push(y);
    }
    return arr;
  }, []);

  // Merge AWS observed records with ERA5 imputation
  const { imputedRecords, imputationSummary } = useMemo(() => {
    const res = imputeMonthlyWeatherRecords(
      rawWeatherData,
      era5Data,
      selectedYear,
      selectedMonth,
      enableImputation,
      offsets
    );
    return {
      imputedRecords: res.records,
      imputationSummary: res.summary,
    };
  }, [rawWeatherData, era5Data, selectedYear, selectedMonth, enableImputation, offsets]);

  // Effective Weather Data (Raw vs Corrected)
  const weatherData = useMemo(() => {
    return applyCorrectionToDailyRecords(imputedRecords, offsets);
  }, [imputedRecords, offsets]);

  const stats = useMemo(() => calculatePeriodStats(weatherData, rawSensorData), [weatherData, rawSensorData]);
  const extremes = useMemo(() => findWeatherExtremes(weatherData, rawSensorData), [weatherData, rawSensorData]);
  const quality = useMemo(() => calculateDataQuality(rawSensorData, daysInMonth), [rawSensorData, daysInMonth]);

  const advancedStats = useMemo(() => {
    if (weatherData.length === 0) return null;
    const temps = weatherData.map(d => d.temperatureAvg).filter((v): v is number => v != null && !isNaN(v));
    const hums = weatherData.map(d => d.humidityAvg).filter((v): v is number => v != null && !isNaN(v));
    const presses = weatherData.map(d => d.pressureAvg).filter((v): v is number => v != null && !isNaN(v));
    const rains = weatherData.map(d => d.rainfallTot || 0);

    const calcStd = (arr: number[]) => {
      if (arr.length <= 1) return 0;
      const mean = arr.reduce((a, b) => a + b, 0) / arr.length;
      const variance = arr.reduce((a, b) => a + Math.pow(b - mean, 2), 0) / (arr.length - 1);
      return Math.sqrt(variance);
    };

    const diurnalRanges = weatherData
      .map(d => (d.temperatureMax != null && d.temperatureMin != null ? d.temperatureMax - d.temperatureMin : null))
      .filter((v): v is number => v != null);

    const avgDiurnalRange = diurnalRanges.length > 0 ? diurnalRanges.reduce((a, b) => a + b, 0) / diurnalRanges.length : 0;
    const maxDiurnalRange = diurnalRanges.length > 0 ? Math.max(...diurnalRanges) : 0;

    const dryDays = rains.filter(r => r < 1.0).length;
    const lightRainDays = rains.filter(r => r >= 1.0 && r <= 20.0).length;
    const moderateRainDays = rains.filter(r => r > 20.0 && r <= 50.0).length;
    const heavyRainDays = rains.filter(r => r > 50.0).length;
    const maxDailyRain = rains.length > 0 ? Math.max(...rains) : 0;

    return {
      stdTemp: Number(calcStd(temps).toFixed(2)),
      stdHum: Number(calcStd(hums).toFixed(2)),
      stdPress: Number(calcStd(presses).toFixed(2)),
      avgDiurnalRange: Number(avgDiurnalRange.toFixed(1)),
      maxDiurnalRange: Number(maxDiurnalRange.toFixed(1)),
      dryDays,
      lightRainDays,
      moderateRainDays,
      heavyRainDays,
      maxDailyRain: Number(maxDailyRain.toFixed(1)),
    };
  }, [weatherData]);

  const publicationCaption = useMemo(() => {
    if (weatherData.length === 0) return "";
    const headerTitle = `LAPORAN CUACA BULANAN (${monthLabel.toUpperCase()} ${selectedYear})`;

    const rainTot = (stats.totalRain || 0).toFixed(1);
    const rainDays = stats.rainyDays || 0;
    const rainDesc = stats.totalRain === 0 ? "Tidak ada hujan" : `${rainDays} hari hujan`;

    const tempAvg = stats.avgTemp != null ? `${stats.avgTemp.toFixed(1)}°C` : "—";
    const tempMax = extremes.hottestDay.value != null ? `${extremes.hottestDay.value.toFixed(1)}°C` : "—";
    const tempMin = extremes.coldestDay.value != null ? `${extremes.coldestDay.value.toFixed(1)}°C` : "—";

    const humAvg = stats.avgHum != null ? `${Math.round(stats.avgHum)}%` : "—";
    const humMin = stats.minHum != null ? `${Math.round(stats.minHum)}%` : "—";
    const humMax = extremes.mostHumidDay.value != null ? `${Math.round(extremes.mostHumidDay.value)}%` : "—";

    const pressMin = stats.minPres != null ? stats.minPres.toFixed(1) : "—";
    const pressMax = stats.maxPres != null ? stats.maxPres.toFixed(1) : "—";

    let provenanceNote = "";
    if (imputationSummary.imputedDays > 0) {
      provenanceNote = `\n(Integritas Data: ${imputationSummary.observedDays} hari AWS + ${imputationSummary.imputedDays} hari terimputasi ${imputationSummary.sourceModel})`;
    }

    return `${headerTitle}
Curah Hujan: ${rainTot} mm (${rainDesc})
Suhu Udara Rata-Rata: ${tempAvg} (Min: ${tempMin}, Maks: ${tempMax})
Kelembapan Udara Rata-Rata: ${humAvg} (Min: ${humMin}, Maks: ${humMax})
Tekanan Udara Rata-Rata: ${pressMin} - ${pressMax} hPa${provenanceNote}`;
  }, [weatherData, monthLabel, selectedYear, stats, extremes, imputationSummary]);

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

      const filename = `Laporan_Bulanan_${sensorName.replace(/\s+/g, '_')}_${selectedYear}_${String(selectedMonth).padStart(2, '0')}`;

      if (type === 'png') exportAsPNG(canvas, filename);
      else if (type === 'jpg') exportAsJPEG(canvas, filename);
      else if (type === 'pdf') exportAsPDF([canvas], filename, 'portrait');
      else if (type === 'print') printCanvas(canvas);

      toast({ title: "Berhasil", description: "Laporan siap diunduh/dicetak." });
      setIsExporting(false);
    }, 100);
  };

  const fetchEra5Data = async (sDate: string, eDate: string) => {
    setLoadingEra5(true);
    try {
      const url = `/api/reanalysis/data?latitude=${lat}&longitude=${lng}&startDate=${sDate}&endDate=${eDate}&model=auto`;
      const res = await fetch(url);
      if (res.ok) {
        const json = await res.json();
        setEra5Data(json);
      }
    } catch (e) {
      console.warn("Gagal menarik data ERA5 untuk imputasi bulanan:", e);
    } finally {
      setLoadingEra5(false);
    }
  };

  const generateReport = async () => {
    if (!sensorId) {
      toast({ title: "Peringatan", description: "Silakan pilih sensor terlebih dahulu", variant: "destructive" });
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const start = new Date(selectedYear, selectedMonth - 1, 1, 0, 0, 0, 0);
      const end = new Date(selectedYear, selectedMonth, 0, 23, 59, 59, 999);

      const raw = await fetchSensorDataByDateRange(sensorId, start.getTime(), end.getTime(), true, false, "hourly");
      
      if (!raw || raw.length === 0) {
        setRawSensorData([]);
        setRawWeatherData([]);
      } else {
        setRawSensorData(raw);
        const records = aggregateDaily(raw);
        records.sort((a, b) => a.date.localeCompare(b.date));
        setRawWeatherData(records);
      }

      // Fetch ERA5 reanalysis data for this month
      await fetchEra5Data(startDateStr, endDateStr);

    } catch (err: any) {
      console.error(err);
      setError("Gagal menarik data dari server.");
      toast({ title: "Error", description: err.message || "Gagal menarik data dari server", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const handleDownloadCSV = () => {
    if (weatherData.length === 0) return;
    exportToCSV(weatherData, `Laporan_Bulanan_${sensorName.replace(/\s+/g, '_')}_${selectedYear}_${String(selectedMonth).padStart(2, '0')}.csv`);
  };

  const handlePrevMonth = () => {
    if (selectedMonth === 1) {
      setSelectedMonth(12);
      setSelectedYear(y => y - 1);
    } else {
      setSelectedMonth(m => m - 1);
    }
  };

  const handleNextMonth = () => {
    if (selectedMonth === 12) {
      setSelectedMonth(1);
      setSelectedYear(y => y + 1);
    } else {
      setSelectedMonth(m => m + 1);
    }
  };

  const handleCurrentMonth = () => {
    const d = new Date();
    setSelectedMonth(d.getMonth() + 1);
    setSelectedYear(d.getFullYear());
  };

  const hasInitRef = useRef(false);
  useEffect(() => {
    if (sensorId) {
      generateReport();
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sensorId, selectedMonth, selectedYear]);

  return (
    <div className="space-y-6">
      {/* Control Panel */}
      <Card className="no-print shadow-sm border-slate-200 dark:border-slate-800">
        <CardContent className="p-4 space-y-4">
          <div className="flex flex-col lg:flex-row gap-4 items-start lg:items-center justify-between">
            <div className="flex flex-col gap-2 flex-grow w-full lg:w-auto">
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
                    className={cn("h-7 text-xs px-2 sm:px-3 font-medium", viewMode === 'web' && "bg-white dark:bg-slate-900 text-blue-600 shadow-sm")}
                  >
                    <LayoutDashboard className="w-3.5 h-3.5 mr-1 sm:mr-1.5" />
                    <span className="hidden min-[400px]:inline">Dashboard Web</span>
                    <span className="min-[400px]:hidden">Web</span>
                  </Button>
                  <Button
                    variant={viewMode === 'print' ? 'default' : 'ghost'}
                    size="sm"
                    onClick={() => setViewMode('print')}
                    className={cn("h-7 text-xs px-2 sm:px-3 font-medium", viewMode === 'print' && "bg-white dark:bg-slate-900 text-indigo-600 shadow-sm")}
                  >
                    <Eye className="w-3.5 h-3.5 mr-1 sm:mr-1.5" />
                    <span className="hidden min-[400px]:inline">Pratinjau Cetak (A4)</span>
                    <span className="min-[400px]:hidden">Cetak</span>
                  </Button>
                </div>
              </div>

              {/* Month & Year Discretized Selector */}
              <div className="flex items-center gap-2 flex-wrap">
                {/* Month Dropdown */}
                <div className="w-[140px] sm:w-[160px]">
                  <Select
                    value={String(selectedMonth)}
                    onValueChange={(val) => setSelectedMonth(Number(val))}
                  >
                    <SelectTrigger className="h-9 bg-white dark:bg-slate-900 font-medium text-xs sm:text-sm">
                      <SelectValue placeholder="Pilih Bulan" />
                    </SelectTrigger>
                    <SelectContent>
                      {MONTH_OPTIONS.map((m) => (
                        <SelectItem key={m.value} value={String(m.value)}>
                          {m.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Year Dropdown */}
                <div className="w-[95px] sm:w-[110px]">
                  <Select
                    value={String(selectedYear)}
                    onValueChange={(val) => setSelectedYear(Number(val))}
                  >
                    <SelectTrigger className="h-9 bg-white dark:bg-slate-900 font-medium text-xs sm:text-sm">
                      <SelectValue placeholder="Tahun" />
                    </SelectTrigger>
                    <SelectContent>
                      {yearsList.map((y) => (
                        <SelectItem key={y} value={String(y)}>
                          {y}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Quick Prev / Next Month Steppers */}
                <div className="flex items-center gap-1">
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={handlePrevMonth}
                    title="Bulan Sebelumnya"
                    className="h-9 w-9 shrink-0"
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={handleNextMonth}
                    title="Bulan Berikutnya"
                    className="h-9 w-9 shrink-0"
                  >
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleCurrentMonth}
                    className="h-9 text-xs px-2.5"
                  >
                    Bulan Ini
                  </Button>
                </div>

                <Button
                  onClick={generateReport}
                  disabled={loading}
                  className="bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs sm:text-sm h-9 px-3"
                >
                  {loading ? "Memproses..." : "Muat Laporan"}
                </Button>
              </div>
            </div>

            {/* Export Buttons */}
            <div className="flex flex-wrap gap-2 w-full lg:w-auto shrink-0 justify-start sm:justify-end">
              <Button variant="outline" size="sm" onClick={handleDownloadCSV} disabled={weatherData.length === 0} className="h-9 text-xs flex-1 sm:flex-none">
                <Download className="mr-1.5 h-4 w-4 text-emerald-600" /> CSV
              </Button>
              <Button variant="outline" size="sm" onClick={() => handleExport('png')} disabled={weatherData.length === 0 || isExporting} className="h-9 text-xs flex-1 sm:flex-none">
                <FileImage className="mr-1.5 h-4 w-4 text-green-600" /> PNG
              </Button>
              <Button variant="outline" size="sm" onClick={() => handleExport('pdf')} disabled={weatherData.length === 0 || isExporting} className="h-9 text-xs flex-1 sm:flex-none">
                <FileType className="mr-1.5 h-4 w-4 text-red-600" /> PDF
              </Button>
              <Button className="bg-slate-800 hover:bg-slate-900 text-white h-9 text-xs flex-1 sm:flex-none" size="sm" onClick={() => handleExport('print')} disabled={weatherData.length === 0 || isExporting}>
                <Printer className="mr-1.5 h-4 w-4" /> Cetak
              </Button>
            </div>
          </div>

          {/* Sub-bar: Periode Info & ERA5 Imputation Toggle */}
          <div className="pt-2 border-t border-slate-100 dark:border-slate-800 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 text-xs">
            <div className="flex items-center gap-2 flex-wrap">
              <Badge variant="outline" className="bg-slate-50 dark:bg-slate-800/60 font-medium py-1">
                Kalender: 1 – {daysInMonth} {monthLabel} {selectedYear} ({daysInMonth} Hari)
              </Badge>
              {loadingEra5 && (
                <span className="text-[11px] text-slate-500 animate-pulse flex items-center gap-1">
                  <Sparkles className="w-3 h-3 text-amber-500" /> Sinkronisasi data reanalisis ECMWF...
                </span>
              )}
            </div>

            {/* Imputation Toggle */}
            <div className="flex items-center gap-2 px-3 py-1 bg-slate-50 dark:bg-slate-800/80 rounded-lg border border-slate-200 dark:border-slate-700">
              <Switch
                id="impute-toggle"
                checked={enableImputation}
                onCheckedChange={setEnableImputation}
              />
              <label htmlFor="impute-toggle" className="text-xs font-medium cursor-pointer flex items-center gap-1.5 text-slate-700 dark:text-slate-300">
                <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                Imputasi Data Kosong (ECMWF ERA5)
              </label>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Banner Status Integritas & Imputasi Data */}
      {weatherData.length > 0 && (
        <div className={cn(
          "p-3 rounded-lg border text-xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-xs",
          imputationSummary.imputedDays > 0
            ? "bg-amber-50/90 dark:bg-amber-950/40 border-amber-200 dark:border-amber-800 text-amber-900 dark:text-amber-200"
            : "bg-blue-50/70 dark:bg-blue-950/30 border-blue-200 dark:border-blue-800 text-blue-900 dark:text-blue-200"
        )}>
          <div className="flex items-start sm:items-center gap-2.5">
            {imputationSummary.imputedDays > 0 ? (
              <AlertCircle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5 sm:mt-0" />
            ) : (
              <CheckCircle2 className="w-4 h-4 text-blue-600 shrink-0 mt-0.5 sm:mt-0" />
            )}
            <div>
              <span className="font-bold">Integritas Observasi Bulanan:</span>{" "}
              {imputationSummary.observedDays} dari {imputationSummary.totalDays} hari kalender terobservasi AWS ({imputationSummary.completenessRawPercent}%).
              {imputationSummary.imputedDays > 0 ? (
                <span>
                  {" "}Sebanyak <strong className="text-amber-700 dark:text-amber-300 font-bold">{imputationSummary.imputedDays} hari kosong berhasil diimputasi</strong> menggunakan reanalisis atmosferik {imputationSummary.sourceModel} (Total data kontinu: {imputationSummary.completenessFinalPercent}%).
                </span>
              ) : (
                <span> Seluruh hari dalam bulan kalender ini terisi penuh oleh stasiun cuaca AWS tanpa celah data.</span>
              )}
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            {imputationSummary.imputedDays > 0 ? (
              <Badge className="bg-amber-500 hover:bg-amber-600 text-white text-[11px] font-medium shadow-xs">
                {imputationSummary.imputedDays} Hari Diimputasi ERA5
              </Badge>
            ) : (
              <Badge className="bg-blue-600 hover:bg-blue-700 text-white text-[11px] font-medium shadow-xs">
                100% Observasi AWS
              </Badge>
            )}
          </div>
        </div>
      )}

      {/* --- PANEL VALIDASI & KOREKSI ERA5 --- */}
      <ERA5CorrectionPanel
        sensorId={sensorId}
        sensorName={sensorName}
        lat={lat}
        lon={lng}
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
                <strong>Mode Kalibrasi Aktif:</strong> Laporan bulanan telah dikoreksi dengan offset ERA5-Land (Suhu: {offsets.tempOffset > 0 ? "+" : ""}{offsets.tempOffset}°C, Kelembapan: {offsets.humOffset > 0 ? "+" : ""}{offsets.humOffset}%, Tekanan: {offsets.pressOffset > 0 ? "+" : ""}{offsets.pressOffset} hPa).
              </span>
            </div>
          )}

          {/* Social Media / Publication Summary Caption */}
          <ReportPublicationCard 
            title="Ringkasan Teks Publikasi Media Sosial"
            subtitle="Salin ringkasan laporan cuaca bulanan / periodik dengan satu klik."
            text={publicationCaption} 
          />

          {/* Hero Grid Metrics — 3 summary cards */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {/* Suhu */}
            <Card className="border-orange-100 bg-gradient-to-br from-orange-50/60 via-white to-white dark:from-slate-900 dark:to-slate-800">
              <CardContent className="p-4 space-y-2">
                <div className="flex justify-between items-center text-xs font-semibold text-orange-700">
                  <span className="flex items-center gap-1.5"><Thermometer className="w-4 h-4 text-orange-500" /> Suhu Udara</span>
                  <Badge variant="outline" className="text-[10px] bg-orange-50 text-orange-700">Bulanan</Badge>
                </div>
                <div className="text-3xl font-black text-slate-900 dark:text-slate-100">
                  {stats.avgTemp != null ? `${stats.avgTemp}` : '—'} <span className="text-sm font-normal text-slate-500">°C rata-rata</span>
                </div>
                <div className="grid grid-cols-2 gap-1 text-xs pt-1 border-t">
                  <div className="flex flex-col items-center p-1.5 bg-red-50 dark:bg-red-950/30 rounded">
                    <span className="text-red-500 font-bold text-base">{stats.maxTemp ?? '—'}°C</span>
                    <span className="text-slate-500">Tertinggi</span>
                  </div>
                  <div className="flex flex-col items-center p-1.5 bg-blue-50 dark:bg-blue-950/30 rounded">
                    <span className="text-blue-600 font-bold text-base">{stats.minTemp ?? '—'}°C</span>
                    <span className="text-slate-500">Terendah</span>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Kelembapan */}
            <Card className="border-sky-100 bg-gradient-to-br from-sky-50/60 via-white to-white dark:from-slate-900 dark:to-slate-800">
              <CardContent className="p-4 space-y-2">
                <div className="flex justify-between items-center text-xs font-semibold text-sky-700">
                  <span className="flex items-center gap-1.5"><Droplets className="w-4 h-4 text-sky-500" /> Kelembapan Udara</span>
                  <Badge variant="outline" className="text-[10px] bg-sky-50 text-sky-700">Relatif</Badge>
                </div>
                <div className="text-3xl font-black text-slate-900 dark:text-slate-100">
                  {stats.avgHum != null ? `${Math.round(stats.avgHum)}` : '—'} <span className="text-sm font-normal text-slate-500">% rata-rata</span>
                </div>
                <div className="grid grid-cols-2 gap-1 text-xs pt-1 border-t">
                  <div className="flex flex-col items-center p-1.5 bg-cyan-50 dark:bg-cyan-950/30 rounded">
                    <span className="text-cyan-600 font-bold text-base">{stats.maxHum != null ? `${Math.round(stats.maxHum)}` : '—'}%</span>
                    <span className="text-slate-500">Tertinggi</span>
                  </div>
                  <div className="flex flex-col items-center p-1.5 bg-indigo-50 dark:bg-indigo-950/30 rounded">
                    <span className="text-indigo-600 font-bold text-base">{stats.minHum != null ? `${Math.round(stats.minHum)}` : '—'}%</span>
                    <span className="text-slate-500">Terendah</span>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Curah Hujan */}
            <Card className="border-violet-100 bg-gradient-to-br from-violet-50/60 via-white to-white dark:from-slate-900 dark:to-slate-800">
              <CardContent className="p-4 space-y-2">
                <div className="flex justify-between items-center text-xs font-semibold text-violet-700">
                  <span className="flex items-center gap-1.5"><CloudRain className="w-4 h-4 text-violet-500" /> Curah Hujan</span>
                  <Badge variant="outline" className="text-[10px] bg-violet-50 text-violet-700">Akumulasi</Badge>
                </div>
                <div className="text-3xl font-black text-violet-700">
                  {stats.totalRain ?? 0} <span className="text-sm font-normal text-slate-500">mm</span>
                </div>
                <div className="grid grid-cols-2 gap-1 text-xs pt-1 border-t">
                  <div className="flex flex-col items-center p-1.5 bg-sky-50 dark:bg-sky-950/30 rounded">
                    <span className="text-sky-700 font-bold text-base">{stats.rainyDays ?? 0}</span>
                    <span className="text-slate-500">Hari Hujan</span>
                  </div>
                  <div className="flex flex-col items-center p-1.5 bg-slate-50 dark:bg-slate-800/50 rounded">
                    <span className="text-slate-700 dark:text-slate-300 font-bold text-base">{advancedStats?.maxDailyRain ?? 0}</span>
                    <span className="text-slate-500">Maks Harian</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Advanced Meteorological Statistics Summary Table */}
          {advancedStats && (
            <Card className="border-slate-200 dark:border-slate-800 shadow-xs bg-white dark:bg-slate-900">
              <CardHeader className="py-3 px-4 border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/30">
                <CardTitle className="text-sm font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                  <Thermometer className="w-4 h-4 text-indigo-600" />
                  Statistik Parameter Meteorologi Periode Pengamatan
                </CardTitle>
              </CardHeader>
              <CardContent className="p-4">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
                  {/* Kolom Termodinamika */}
                  <div className="p-3 bg-slate-50 dark:bg-slate-800/50 rounded-lg space-y-2 border border-slate-200/60 dark:border-slate-700/60">
                    <span className="font-bold text-orange-600 dark:text-orange-400 block border-b pb-1">Termodinamika Suhu</span>
                    <div className="flex justify-between">
                      <span className="text-slate-500">Deviasi Standar (σ):</span>
                      <strong className="font-mono">{advancedStats.stdTemp} °C</strong>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-500">Rata-rata Variabilitas Diurnal:</span>
                      <strong className="font-mono">{advancedStats.avgDiurnalRange} °C</strong>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-500">Rentang Diurnal Maksimal:</span>
                      <strong className="font-mono">{advancedStats.maxDiurnalRange} °C</strong>
                    </div>
                  </div>

                  {/* Kolom Kelembapan & Tekanan */}
                  <div className="p-3 bg-slate-50 dark:bg-slate-800/50 rounded-lg space-y-2 border border-slate-200/60 dark:border-slate-700/60">
                    <span className="font-bold text-blue-600 dark:text-blue-400 block border-b pb-1">Kelembapan & Tekanan</span>
                    <div className="flex justify-between">
                      <span className="text-slate-500">Deviasi Kelembapan (σ):</span>
                      <strong className="font-mono">{advancedStats.stdHum} %</strong>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-500">Deviasi Tekanan (σ):</span>
                      <strong className="font-mono">{advancedStats.stdPress} hPa</strong>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-500">Ketersediaan Data:</span>
                      <strong className="font-mono">{quality.availabilityPercent.toFixed(1)}% ({quality.actualTotal} obs)</strong>
                    </div>
                  </div>

                  {/* Kolom Distribusi Hujan */}
                  <div className="p-3 bg-slate-50 dark:bg-slate-800/50 rounded-lg space-y-2 border border-slate-200/60 dark:border-slate-700/60">
                    <span className="font-bold text-teal-600 dark:text-teal-400 block border-b pb-1">Distribusi Hari Hujan</span>
                    <div className="flex justify-between">
                      <span className="text-slate-500">Hari Kering (&lt; 1 mm):</span>
                      <strong className="font-mono">{advancedStats.dryDays} Hari</strong>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-500">Hujan Ringan (1–20 mm):</span>
                      <strong className="font-mono">{advancedStats.lightRainDays} Hari</strong>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-500">Hujan Sedang / Lebat (&gt;20 mm):</span>
                      <strong className="font-mono">{advancedStats.moderateRainDays + advancedStats.heavyRainDays} Hari</strong>
                    </div>
                    <div className="flex justify-between pt-0.5 border-t">
                      <span className="text-slate-500">Hujan Harian Terbesar:</span>
                      <strong className="font-mono text-sky-600">{advancedStats.maxDailyRain} mm</strong>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Interactive Web Charts — 2x2 grid */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card className="shadow-sm">
              <CardHeader className="py-3 px-4 bg-orange-50/60 border-b">
                <CardTitle className="text-sm font-bold text-orange-950">Tren Suhu Udara — Min / Rata-rata / Maks (°C)</CardTitle>
              </CardHeader>
              <CardContent className="p-2">
                <TemperatureTrendChart data={weatherData} />
              </CardContent>
            </Card>

            <Card className="shadow-sm">
              <CardHeader className="py-3 px-4 bg-sky-50/60 border-b">
                <CardTitle className="text-sm font-bold text-sky-950">Tren Kelembapan — Min / Rata-rata / Maks (%)</CardTitle>
              </CardHeader>
              <CardContent className="p-2">
                <HumidityTrendChart data={weatherData} />
              </CardContent>
            </Card>

            <Card className="shadow-sm col-span-1 lg:col-span-2">
              <CardHeader className="py-3 px-4 bg-violet-50/60 border-b">
                <CardTitle className="text-sm font-bold text-violet-950">Curah Hujan Harian & Akumulasi Bulanan (mm)</CardTitle>
              </CardHeader>
              <CardContent className="p-2">
                <RainfallChart data={weatherData} />
              </CardContent>
            </Card>
          </div>

          {/* Daily Calendar Summary Table */}
          <Card className="border-slate-200 dark:border-slate-800 shadow-xs">
            <CardHeader className="py-3 px-4 bg-slate-50/70 dark:bg-slate-800/40 border-b flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <CardTitle className="text-sm font-bold flex items-center gap-2 text-slate-800 dark:text-slate-200">
                <LayoutDashboard className="w-4 h-4 text-blue-600" />
                Daftar Observasi & Imputasi Harian Kalender ({monthLabel} {selectedYear})
              </CardTitle>
              <div className="flex items-center gap-3 text-xs">
                <span className="flex items-center gap-1.5 text-slate-600 dark:text-slate-400">
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 inline-block" /> Observasi AWS ({imputationSummary.observedDays} hari)
                </span>
                {imputationSummary.imputedDays > 0 && (
                  <span className="flex items-center gap-1.5 text-slate-600 dark:text-slate-400">
                    <span className="w-2.5 h-2.5 rounded-full bg-amber-500 inline-block" /> Imputasi ERA5 ({imputationSummary.imputedDays} hari)
                  </span>
                )}
              </div>
            </CardHeader>
            <CardContent className="p-0">
              <div className="overflow-x-auto max-h-[420px] overflow-y-auto">
                <table className="w-full text-xs text-left">
                  <thead className="bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 sticky top-0 z-10">
                    <tr>
                      <th className="px-3 py-2 font-semibold">Tanggal</th>
                      <th className="px-3 py-2 text-center font-semibold">Suhu Rata-rata</th>
                      <th className="px-3 py-2 text-center font-semibold">Suhu Min - Maks</th>
                      <th className="px-3 py-2 text-center font-semibold">Kelembapan</th>
                      <th className="px-3 py-2 text-center font-semibold">Tekanan</th>
                      <th className="px-3 py-2 text-center font-semibold">Curah Hujan</th>
                      <th className="px-3 py-2 text-center font-semibold">Sumber Data</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
                    {weatherData.map((d, idx) => (
                      <tr 
                        key={d.date} 
                        className={cn(
                          idx % 2 === 0 ? "bg-white dark:bg-slate-900" : "bg-slate-50/60 dark:bg-slate-800/30",
                          d.isImputed && "bg-amber-50/50 dark:bg-amber-950/20"
                        )}
                      >
                        <td className="px-3 py-2 font-medium font-mono">
                          {d.date}
                        </td>
                        <td className="px-3 py-2 text-center font-mono font-semibold">
                          {d.temperatureAvg != null ? `${d.temperatureAvg.toFixed(1)}°C` : "—"}
                        </td>
                        <td className="px-3 py-2 text-center font-mono text-slate-600 dark:text-slate-400">
                          <span className="text-blue-600 font-semibold">{d.temperatureMin != null ? `${d.temperatureMin.toFixed(1)}` : "—"}</span>
                          {" - "}
                          <span className="text-red-600 font-semibold">{d.temperatureMax != null ? `${d.temperatureMax.toFixed(1)}` : "—"}</span>
                          {" °C"}
                        </td>
                        <td className="px-3 py-2 text-center font-mono">
                          {d.humidityAvg != null ? `${Math.round(d.humidityAvg)}%` : "—"}
                        </td>
                        <td className="px-3 py-2 text-center font-mono">
                          {d.pressureAvg != null ? `${d.pressureAvg.toFixed(1)} hPa` : "—"}
                        </td>
                        <td className="px-3 py-2 text-center font-mono">
                          <span className={d.rainfallTot > 0 ? "text-sky-600 font-bold" : "text-slate-400"}>
                            {d.rainfallTot != null ? `${d.rainfallTot.toFixed(1)} mm` : "0 mm"}
                          </span>
                        </td>
                        <td className="px-3 py-2 text-center">
                          {d.isImputed ? (
                            <Badge variant="outline" className="text-[10px] bg-amber-100 dark:bg-amber-900/50 text-amber-800 dark:text-amber-200 border-amber-300 font-medium">
                              Imputasi {d.imputedSource?.includes("IFS") ? "ECMWF IFS" : "ERA5-Land"}
                            </Badge>
                          ) : (
                            <Badge variant="outline" className="text-[10px] bg-emerald-50 dark:bg-emerald-950/30 text-emerald-700 dark:text-emerald-300 border-emerald-300 font-medium">
                              AWS Observasi
                            </Badge>
                          )}
                        </td>
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
      {viewMode === 'print' && weatherData.length > 0 && (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 bg-slate-100 dark:bg-slate-800 p-3 rounded-lg border">
            <span className="text-xs text-slate-600 dark:text-slate-300 flex items-center gap-1.5">
              <Eye className="w-4 h-4 text-blue-600 shrink-0" />
              Menampilkan pratinjau lembar cetak standar dokumen A4.
            </span>
            <div className="flex flex-wrap gap-2 w-full sm:w-auto">
              <Button size="sm" variant="outline" onClick={() => handleExport('pdf')} disabled={isExporting} className="h-8 text-xs flex-1 sm:flex-none">
                <FileType className="w-3.5 h-3.5 mr-1 text-red-600" /> Export PDF
              </Button>
              <Button size="sm" onClick={() => handleExport('print')} disabled={isExporting} className="h-8 text-xs bg-slate-900 text-white flex-1 sm:flex-none">
                <Printer className="w-3.5 h-3.5 mr-1" /> Cetak Lembar Ini
              </Button>
            </div>
          </div>

          <div className="border rounded-xl p-2 sm:p-6 bg-slate-200 dark:bg-slate-950 flex justify-center overflow-x-auto shadow-inner">
            <div className="scale-[0.85] origin-top shadow-2xl rounded-md overflow-hidden bg-white">
              <PrintLayout 
                id="visible-bulanan-preview"
                title="Laporan Cuaca Bulanan"
                sensorName={sensorName}
                generatedBy={displayName}
                periodLabel={`Bulan ${monthLabel} ${selectedYear} (1 - ${daysInMonth} ${monthLabel} ${selectedYear})`}
                orientation="portrait"
              >
                <div className="space-y-6 mt-6">
                  {/* 3 Ringkasan Kartu: Suhu / Kelembapan / Curah Hujan */}
                  <div className="grid grid-cols-3 gap-3">
                    <div className="p-3 bg-orange-50/80 border border-orange-200 rounded-lg">
                      <div className="text-[10px] font-semibold uppercase tracking-wide text-orange-800 flex items-center gap-1 mb-1">
                        <Thermometer className="w-3.5 h-3.5 text-orange-600" /> Suhu Udara
                      </div>
                      <div className="text-xl font-black text-orange-950">{stats.avgTemp}<span className="text-xs font-normal text-orange-700"> °C rata-rata</span></div>
                      <div className="flex justify-between text-[10px] text-slate-600 mt-1 pt-1 border-t border-orange-100">
                        <span>Maks: <strong className="text-red-600">{stats.maxTemp}°C</strong></span>
                        <span>Min: <strong className="text-blue-600">{stats.minTemp}°C</strong></span>
                      </div>
                    </div>

                    <div className="p-3 bg-sky-50/80 border border-sky-200 rounded-lg">
                      <div className="text-[10px] font-semibold uppercase tracking-wide text-sky-800 flex items-center gap-1 mb-1">
                        <Droplets className="w-3.5 h-3.5 text-sky-600" /> Kelembapan
                      </div>
                      <div className="text-xl font-black text-sky-950">{stats.avgHum != null ? Math.round(stats.avgHum) : '—'}<span className="text-xs font-normal text-sky-700"> % rata-rata</span></div>
                      <div className="flex justify-between text-[10px] text-slate-600 mt-1 pt-1 border-t border-sky-100">
                        <span>Maks: <strong className="text-cyan-600">{stats.maxHum != null ? Math.round(stats.maxHum) : '—'}%</strong></span>
                        <span>Min: <strong className="text-indigo-600">{stats.minHum != null ? Math.round(stats.minHum) : '—'}%</strong></span>
                      </div>
                    </div>

                    <div className="p-3 bg-violet-50/80 border border-violet-200 rounded-lg">
                      <div className="text-[10px] font-semibold uppercase tracking-wide text-violet-800 flex items-center gap-1 mb-1">
                        <CloudRain className="w-3.5 h-3.5 text-violet-600" /> Curah Hujan
                      </div>
                      <div className="text-xl font-black text-violet-700">{stats.totalRain}<span className="text-xs font-normal text-violet-700"> mm total</span></div>
                      <div className="flex justify-between text-[10px] text-slate-600 mt-1 pt-1 border-t border-violet-100">
                        <span>Hari Hujan: <strong className="text-sky-700">{stats.rainyDays}</strong></span>
                        <span>Maks: <strong className="text-slate-700">{advancedStats?.maxDailyRain ?? 0} mm</strong></span>
                      </div>
                    </div>
                  </div>

                  {/* Grafik Suhu & Kelembapan (berdampingan) */}
                  <div className="grid grid-cols-2 gap-4 break-inside-avoid">
                    <Card className="border border-slate-200 shadow-sm print:shadow-none">
                      <CardHeader className="py-2.5 px-3 bg-orange-50/60 print:bg-transparent border-b">
                        <CardTitle className="text-xs font-bold flex items-center text-orange-800">
                          <Thermometer className="w-3.5 h-3.5 mr-1.5 text-orange-600" />
                          Tren Suhu — Min / Rata-rata / Maks (°C)
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="p-0">
                        <TemperatureTrendChart data={weatherData} />
                      </CardContent>
                    </Card>

                    <Card className="border border-slate-200 shadow-sm print:shadow-none">
                      <CardHeader className="py-2.5 px-3 bg-sky-50/60 print:bg-transparent border-b">
                        <CardTitle className="text-xs font-bold flex items-center text-sky-800">
                          <Droplets className="w-3.5 h-3.5 mr-1.5 text-sky-600" />
                          Tren Kelembapan — Min / Rata-rata / Maks (%)
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="p-0">
                        <HumidityTrendChart data={weatherData} />
                      </CardContent>
                    </Card>
                  </div>

                  {/* Grafik Curah Hujan Harian & Akumulasi */}
                  <Card className="border border-slate-200 shadow-sm print:shadow-none break-inside-avoid">
                    <CardHeader className="py-2.5 px-3 bg-violet-50/60 print:bg-transparent border-b">
                      <CardTitle className="text-xs font-bold flex items-center text-violet-800">
                        <CloudRain className="w-3.5 h-3.5 mr-1.5 text-violet-600" />
                        Curah Hujan Harian & Akumulasi Bulanan (mm)
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="p-0">
                      <RainfallChart data={weatherData} />
                    </CardContent>
                  </Card>

                  {/* Catatan Kaki Provenansi & Integritas Data (WMO No. 100) */}
                  {imputationSummary.imputedDays > 0 && (
                    <div className="mt-4 p-3 bg-slate-50 border border-slate-200 rounded text-[10px] text-slate-600 break-inside-avoid">
                      <div className="font-bold text-slate-800 mb-0.5">Catatan Provenansi & Integritas Data (WMO No. 100):</div>
                      <p>
                        Sebanyak {imputationSummary.imputedDays} hari data pada periode ini ({imputationSummary.imputedDates.slice(0, 10).join(", ")}{imputationSummary.imputedDates.length > 10 ? "..." : ""}) merupakan hasil estimasi imputasi saintifik berbasis reanalisis atmosferik {imputationSummary.sourceModel} untuk mengisi kekosongan telemetri sensor stasiun cuaca otomatis.
                      </p>
                    </div>
                  )}
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
          periodLabel={`Bulan ${monthLabel} ${selectedYear} (1 - ${daysInMonth} ${monthLabel} ${selectedYear})`}
          orientation="portrait"
        >
          <div className="space-y-6 mt-6">
            {/* 3 Ringkasan Kartu: Suhu / Kelembapan / Curah Hujan */}
            <div className="grid grid-cols-3 gap-3">
              <div className="p-3 bg-orange-50/80 border border-orange-200 rounded-lg">
                <div className="text-[10px] font-semibold uppercase tracking-wide text-orange-800 flex items-center gap-1 mb-1">
                  <Thermometer className="w-3.5 h-3.5 text-orange-600" /> Suhu Udara
                </div>
                <div className="text-xl font-black text-orange-950">{stats.avgTemp}<span className="text-xs font-normal text-orange-700"> °C rata-rata</span></div>
                <div className="flex justify-between text-[10px] text-slate-600 mt-1 pt-1 border-t border-orange-100">
                  <span>Maks: <strong className="text-red-600">{stats.maxTemp}°C</strong></span>
                  <span>Min: <strong className="text-blue-600">{stats.minTemp}°C</strong></span>
                </div>
              </div>

              <div className="p-3 bg-sky-50/80 border border-sky-200 rounded-lg">
                <div className="text-[10px] font-semibold uppercase tracking-wide text-sky-800 flex items-center gap-1 mb-1">
                  <Droplets className="w-3.5 h-3.5 text-sky-600" /> Kelembapan
                </div>
                <div className="text-xl font-black text-sky-950">{stats.avgHum != null ? Math.round(stats.avgHum) : '—'}<span className="text-xs font-normal text-sky-700"> % rata-rata</span></div>
                <div className="flex justify-between text-[10px] text-slate-600 mt-1 pt-1 border-t border-sky-100">
                  <span>Maks: <strong className="text-cyan-600">{stats.maxHum != null ? Math.round(stats.maxHum) : '—'}%</strong></span>
                  <span>Min: <strong className="text-indigo-600">{stats.minHum != null ? Math.round(stats.minHum) : '—'}%</strong></span>
                </div>
              </div>

              <div className="p-3 bg-violet-50/80 border border-violet-200 rounded-lg">
                <div className="text-[10px] font-semibold uppercase tracking-wide text-violet-800 flex items-center gap-1 mb-1">
                  <CloudRain className="w-3.5 h-3.5 text-violet-600" /> Curah Hujan
                </div>
                <div className="text-xl font-black text-violet-700">{stats.totalRain}<span className="text-xs font-normal text-violet-700"> mm total</span></div>
                <div className="flex justify-between text-[10px] text-slate-600 mt-1 pt-1 border-t border-violet-100">
                  <span>Hari Hujan: <strong className="text-sky-700">{stats.rainyDays}</strong></span>
                  <span>Maks: <strong className="text-slate-700">{advancedStats?.maxDailyRain ?? 0} mm</strong></span>
                </div>
              </div>
            </div>

            {/* Grafik Suhu & Kelembapan berdampingan */}
            <div className="grid grid-cols-2 gap-4 break-inside-avoid">
              <Card className="border border-slate-200 shadow-sm print:shadow-none">
                <CardHeader className="py-2.5 px-3 bg-orange-50/60 print:bg-transparent border-b">
                  <CardTitle className="text-xs font-bold flex items-center text-orange-800">
                    <Thermometer className="w-3.5 h-3.5 mr-1.5 text-orange-600" />
                    Tren Suhu — Min / Rata-rata / Maks (°C)
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-0">
                  <TemperatureTrendChart data={weatherData} />
                </CardContent>
              </Card>

              <Card className="border border-slate-200 shadow-sm print:shadow-none">
                <CardHeader className="py-2.5 px-3 bg-sky-50/60 print:bg-transparent border-b">
                  <CardTitle className="text-xs font-bold flex items-center text-sky-800">
                    <Droplets className="w-3.5 h-3.5 mr-1.5 text-sky-600" />
                    Tren Kelembapan — Min / Rata-rata / Maks (%)
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-0">
                  <HumidityTrendChart data={weatherData} />
                </CardContent>
              </Card>
            </div>

            {/* Grafik Curah Hujan Harian & Akumulasi */}
            <Card className="border border-slate-200 shadow-sm print:shadow-none break-inside-avoid">
              <CardHeader className="py-2.5 px-3 bg-violet-50/60 print:bg-transparent border-b">
                <CardTitle className="text-xs font-bold flex items-center text-violet-800">
                  <CloudRain className="w-3.5 h-3.5 mr-1.5 text-violet-600" />
                  Curah Hujan Harian & Akumulasi Bulanan (mm)
                </CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                <RainfallChart data={weatherData} />
              </CardContent>
            </Card>

            {/* Catatan Kaki Provenansi & Integritas Data (WMO No. 100) */}
            {imputationSummary.imputedDays > 0 && (
              <div className="mt-4 p-3 bg-slate-50 border border-slate-200 rounded text-[10px] text-slate-600 break-inside-avoid">
                <div className="font-bold text-slate-800 mb-0.5">Catatan Provenansi & Integritas Data (WMO No. 100):</div>
                <p>
                  Sebanyak {imputationSummary.imputedDays} hari data pada periode ini ({imputationSummary.imputedDates.slice(0, 10).join(", ")}{imputationSummary.imputedDates.length > 10 ? "..." : ""}) merupakan hasil estimasi imputasi saintifik berbasis reanalisis atmosferik {imputationSummary.sourceModel} untuk mengisi kekosongan telemetri sensor stasiun cuaca otomatis.
                </p>
              </div>
            )}
          </div>
        </PrintLayout>
      </div>
    </div>
  );
}