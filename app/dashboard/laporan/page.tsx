"use client"

import { useEffect, useRef, useState } from "react"
import { Calendar as CalendarIcon, Printer } from "lucide-react"
import { useReactToPrint } from "react-to-print"
import { type DateRange } from "react-day-picker"

import { Calendar } from "@/components/ui/calendar"
import { Popover, PopoverTrigger, PopoverContent } from "@/components/ui/popover"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { cn } from "@/lib/utils"
import { fetchSensorData, SensorDate } from "@/lib/FetchingSensorData"
import { useAuth } from "@/hooks/useAuth"

type WeatherRecord = {
  date: string;
  sampleCount: number;
  temperatureAvg: number;
  temperatureMin: number;
  temperatureMax: number;
  humidityAvg: number;
  humidityMin: number;
  humidityMax: number;
  pressureAvg: number;
  pressureMin: number;
  pressureMax: number;
  dewPointAvg: number;
  windSpeedAvg: number;
  rainfallTot: number;
};

/* Small UI components */
const Badge = ({ children, className }: { children: React.ReactNode, className?: string }) => (
  <span className={cn(
    "inline-block rounded-full border border-indigo-200 bg-indigo-50 px-2 py-0.5 text-xs text-blue-600",
    className
  )}>
    {children}
  </span>
);

const CardLabel = ({ label, value, hint, className }: { label: string; value: React.ReactNode; hint?: React.ReactNode; className?: string }) => (
  <div className={cn("rounded-md border border-gray-300 p-2", className)}>
    <div className="text-[11px] text-gray-500">{label}</div>
    <div className="mt-0.5 text-base font-semibold">{value}</div>
    {hint ? <div className="mt-0.5 text-[10px] text-gray-500">{hint}</div> : null}
  </div>
);

const MetricCardWithTime = ({ 
  label, 
  unit, 
  avg, 
  max, 
  min,
  className,
}: { 
  label: string; 
  unit: string;
  avg: number; 
  max: number;
  min: number;
  className?: string;
}) => {
  const fmt2 = (n: number) => (Number.isFinite(n) ? n.toFixed(1) : "0.0");
  
  return (
    <div className={cn("rounded-md border border-gray-300 p-2", className)}>
      <div className="border-b border-gray-200 pb-1.5 mb-2">
        <div className="text-[11px] text-gray-500">{label}</div>
      </div>
      
      <table className="w-full text-xs">
        <tbody>
          <tr>
            <td className="w-1/4 font-semibold align-top">Avg</td>
            <td>{fmt2(avg)} {unit}</td>
          </tr>
          <tr>
            <td className="w-1/4 font-semibold pt-1.5">Max</td>
            <td className="pt-1.5">{fmt2(max)} {unit}</td>
          </tr>
          <tr>
            <td className="w-1/4 font-semibold pt-1.5">Min</td>
            <td className="pt-1.5">{fmt2(min)} {unit}</td>
          </tr>
        </tbody>
      </table>
    </div>
  );
};

// Format "dd MMMM yyyy" (id-ID, Asia/Jakarta)
const ID_DATE_FMT = new Intl.DateTimeFormat("id-ID", {
  timeZone: "Asia/Jakarta",
  day: "2-digit",
  month: "long",
  year: "numeric",
});

// Format "dd MMMM" tanpa tahun (id-ID, Asia/Jakarta)
const ID_DATE_SHORT_FMT = new Intl.DateTimeFormat("id-ID", {
  timeZone: "Asia/Jakarta",
  day: "2-digit",
  month: "long",
});

function formatIdDateDash(input: string | Date): string {
  const d =
    typeof input === "string"
      ? (() => {
          const m = input.match(/^(\d{4})-(\d{2})-(\d{2})$/);
          return m ? new Date(Date.UTC(+m[1], +m[2] - 1, +m[3])) : null;
        })()
      : new Date(input);

  return d && !isNaN(d.getTime()) ? ID_DATE_FMT.format(d) : typeof input === "string" ? input : "";
}

function formatIdDateShort(input: string | Date): string {
  const d =
    typeof input === "string"
      ? (() => {
          const m = input.match(/^(\d{4})-(\d{2})-(\d{2})$/);
          return m ? new Date(Date.UTC(+m[1], +m[2] - 1, +m[3])) : null;
        })()
      : new Date(input);

  return d && !isNaN(d.getTime()) ? ID_DATE_SHORT_FMT.format(d) : typeof input === "string" ? input : "";
}

function DataTable({ rows }: { rows: WeatherRecord[] }) {
  const fmt2 = (n: number) => (Number.isFinite(n) ? n.toFixed(2) : "0.00");
  const cellClass = "border border-gray-300 px-1.5 py-1 text-center";
  const headerGroupClass = "border-x border-t border-gray-300 p-1.5";
  const subHeaderClass = "border border-gray-300 p-1 font-normal text-[10px]";
  
  return (
    <table className="w-full border-collapse text-xs">
      <thead>
        <tr>
          <th className={cn(headerGroupClass, "border-b-0")} rowSpan={2}>Tanggal</th>
          <th className={cn(headerGroupClass, "border-b-0")} colSpan={3}>Suhu (°C)</th>
          <th className={cn(headerGroupClass, "border-b-0")} colSpan={3}>Kelembapan (%)</th>
          <th className={cn(headerGroupClass, "border-b-0")} colSpan={3}>Tekanan (hPa)</th>
          <th className={cn(headerGroupClass, "border-b-0")} rowSpan={2}>Titik Embun (°C)</th>
          <th className={cn(headerGroupClass, "border-b-0")} rowSpan={2}>Curah Hujan (mm)</th>
        </tr>
        <tr>
          <th className={subHeaderClass}>Min</th>
          <th className={subHeaderClass}>Avg</th>
          <th className={subHeaderClass}>Max</th>
          <th className={subHeaderClass}>Min</th>
          <th className={subHeaderClass}>Avg</th>
          <th className={subHeaderClass}>Max</th>
          <th className={subHeaderClass}>Min</th>
          <th className={subHeaderClass}>Avg</th>
          <th className={subHeaderClass}>Max</th>
        </tr>
      </thead>
      <tbody>
        {rows.map((r, idx) => (
          <tr key={r.date} className={idx % 2 ? "bg-gray-50" : ""}>
            <td className={cn(cellClass, "whitespace-nowrap")}>{formatIdDateShort(r.date)}</td>
            <td className={cellClass}>{fmt2(r.temperatureMin)}</td>
            <td className={cellClass}>{fmt2(r.temperatureAvg)}</td>
            <td className={cellClass}>{fmt2(r.temperatureMax)}</td>
            <td className={cellClass}>{fmt2(r.humidityMin)}</td>
            <td className={cellClass}>{fmt2(r.humidityAvg)}</td>
            <td className={cellClass}>{fmt2(r.humidityMax)}</td>
            <td className={cellClass}>{fmt2(r.pressureMin)}</td>
            <td className={cellClass}>{fmt2(r.pressureAvg)}</td>
            <td className={cellClass}>{fmt2(r.pressureMax)}</td>
            <td className={cellClass}>{fmt2(r.dewPointAvg)}</td>
            <td className={cellClass}>{fmt2(r.rainfallTot)}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
 
export default function PelaporanPage() {
  const { user, profile } = useAuth();
  const displayName = profile?.displayName || user?.displayName || "Petugas Meteorologi";

  // State: sensor, date range, data, loading, error
  const [sensorId, setSensorId] = useState("id-05");

  // NEW: date range (YYYY-MM-DD)
  const [startDate, setStartDate] = useState<string>("")
  const [endDate, setEndDate] = useState<string>("")
  // NEW: UI date range (Calendar)
  const [dateRange, setDateRange] = useState<DateRange | undefined>(undefined)

  const [weatherData, setWeatherData] = useState<WeatherRecord[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [rawData, setRawData] = useState<SensorDate[]>([]);

  // Helper format "YYYY-MM-DD" pada zona waktu Asia/Jakarta
  const fmtYMD = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Jakarta",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });

  // Tambahan: formatter jam "HH" pada zona waktu Asia/Jakarta
  const fmtHour = new Intl.DateTimeFormat("id-ID", {
    timeZone: "Asia/Jakarta",
    hour: "2-digit",
    hour12: false,
  });

  // Helper display format DD-MM-YYYY
  const toDDMMYYYY = (d: Date) => {
    const dd = String(d.getDate()).padStart(2, "0")
    const mm = String(d.getMonth() + 1).padStart(2, "0")
    const yyyy = d.getFullYear()
    return `${dd}-${mm}-${yyyy}`
  }

    type HourlyRecord = {
    hourKey: string;   // "YYYY-MM-DDTHH" (Asia/Jakarta)
    dateKey: string;   // "YYYY-MM-DD" (Asia/Jakarta)
    sampleCount: number;
    temperatureAvg: number;
    humidityAvg: number;
    pressureAvg: number;
    dewPointAvg: number;
    rainfallTot: number; // mm pada jam tsb (≈ rata-rata rainrate mm/h × 1 jam)
  };


  // Agregasi harian dari data mentah
  function aggregateHourly(rows: SensorDate[]): HourlyRecord[] {
    const byHour = new Map<string, SensorDate[]>();
    for (const r of rows) {
      const d = new Date(r.timestamp);
      const dayKey = fmtYMD.format(d);
      const hour = fmtHour.format(d);
      const hourKey = `${dayKey}T${hour}`;
      if (!byHour.has(hourKey)) byHour.set(hourKey, []);
      byHour.get(hourKey)!.push(r);
    }

    const hours: HourlyRecord[] = [];
    for (const [hourKey, items] of byHour) {
      const n = items.length || 1;
      const sum = (ns: number[]) => ns.reduce((a, b) => a + (Number.isFinite(b) ? b : 0), 0);

      const tAvg = sum(items.map(i => i.temperature)) / n;
      const hAvg = sum(items.map(i => i.humidity)) / n;
      const pAvg = sum(items.map(i => i.pressure)) / n;
      const dAvg = sum(items.map(i => i.dew)) / n;

      const maxRainrate = Math.max(...items.map(i => i.rainrate).filter(Number.isFinite), 0);

      hours.push({
        hourKey,
        dateKey: hourKey.slice(0, 10),
        sampleCount: n,
        temperatureAvg: tAvg,
        humidityAvg: hAvg,
        pressureAvg: pAvg,
        dewPointAvg: dAvg,
        rainfallTot: maxRainrate,
      });
    }
    hours.sort((a, b) => a.hourKey.localeCompare(b.hourKey));
    return hours;
  }

  function aggregateDaily(rows: SensorDate[]): WeatherRecord[] {
    const hourly = aggregateHourly(rows);

    const byDay = new Map<string, HourlyRecord[]>();
    for (const h of hourly) {
      if (!byDay.has(h.dateKey)) byDay.set(h.dateKey, []);
      byDay.get(h.dateKey)!.push(h);
    }

    const byDayRaw = new Map<string, SensorDate[]>();
    for (const r of rows) {
      const d = new Date(r.timestamp);
      const dayKey = fmtYMD.format(d);
      if (!byDayRaw.has(dayKey)) byDayRaw.set(dayKey, []);
      byDayRaw.get(dayKey)!.push(r);
    }

    const result: WeatherRecord[] = [];
    for (const [date, items] of byDay) {
      const totalSamples = items.reduce((acc, it) => acc + it.sampleCount, 0) || 1;
      const wsum = (pick: (h: HourlyRecord) => number) =>
        items.reduce((acc, it) => acc + pick(it) * it.sampleCount, 0);

      const rawData = byDayRaw.get(date) || [];
      
      const temps = rawData.map(r => r.temperature).filter(Number.isFinite);
      const humis = rawData.map(r => r.humidity).filter(Number.isFinite);
      const press = rawData.map(r => r.pressure).filter(Number.isFinite);
      
      const tempMin = temps.length ? Math.min(...temps) : 0;
      const tempMax = temps.length ? Math.max(...temps) : 0;
      const humiMin = humis.length ? Math.min(...humis) : 0;
      const humiMax = humis.length ? Math.max(...humis) : 0;
      const pressMin = press.length ? Math.min(...press) : 0;
      const pressMax = press.length ? Math.max(...press) : 0;

      result.push({
        date,
        sampleCount: totalSamples,
        temperatureAvg: wsum(i => i.temperatureAvg) / totalSamples,
        temperatureMin: tempMin,
        temperatureMax: tempMax,
        humidityAvg: wsum(i => i.humidityAvg) / totalSamples,
        humidityMin: humiMin,
        humidityMax: humiMax,
        pressureAvg: wsum(i => i.pressureAvg) / totalSamples,
        pressureMin: pressMin,
        pressureMax: pressMax,
        dewPointAvg: wsum(i => i.dewPointAvg) / totalSamples,
        windSpeedAvg: 0,
        rainfallTot: items.reduce((acc, it) => acc + it.rainfallTot, 0),
      });
    }
    result.sort((a, b) => a.date.localeCompare(b.date));
    return result;
  }

  useEffect(() => {
    if (!dateRange) {
      const now = new Date()
      const start = new Date(now)
      start.setDate(now.getDate() - 2)
      start.setHours(0, 0, 0, 0)
      const end = new Date(now)
      end.setHours(23, 59, 59, 999)
      setDateRange({ from: start, to: end })
      setStartDate(fmtYMD.format(start))
      setEndDate(fmtYMD.format(end))
    }
  }, [dateRange])

  useEffect(() => {
    if (dateRange?.from) setStartDate(fmtYMD.format(dateRange.from))
    if (dateRange?.to) setEndDate(fmtYMD.format(dateRange.to))
  }, [dateRange])

  async function loadData() {
    if (!startDate || !endDate) return

    setLoading(true);
    setError(null);
    try {
      const start = new Date(`${startDate}T00:00:00+07:00`);
      const end = new Date(`${endDate}T23:59:59+07:00`);
      const minutes = Math.max(1, Math.ceil((end.getTime() - start.getTime()) / 60000));

      const raw = await fetchSensorData(sensorId, minutes);
      setRawData(raw);
      const daily = aggregateDaily(raw);
      setWeatherData(daily);
    } catch (e: any) {
      setError(e?.message || "Gagal memuat data.");
      setRawData([]);
      setWeatherData([]);
    } finally {
      setLoading(false);
    }
  }

  const dates = weatherData.map(w => new Date(w.date));
  const startDateCalc = dates.length ? new Date(Math.min(...dates.map(d => d.getTime()))) : new Date();
  const endDateCalc = dates.length ? new Date(Math.max(...dates.map(d => d.getTime()))) : new Date();

  const temps = weatherData.map(w => w.temperatureAvg);
  const humi = weatherData.map(w => w.humidityAvg);
  const pres = weatherData.map(w => w.pressureAvg);
  const dewpoint = weatherData.map(w => w.dewPointAvg);
  const rains = weatherData.map(w => w.rainfallTot);

  const rawTemps = rawData.map(r => r.temperature).filter(Number.isFinite);
  const rawHumi = rawData.map(r => r.humidity).filter(Number.isFinite);
  const rawPres = rawData.map(r => r.pressure).filter(Number.isFinite);
  const rawDews = rawData.map(r => r.dew).filter(Number.isFinite);

  function sum(ns: number[]) { return ns.reduce((a, b) => a + b, 0); }
  function round(n: number, d = 2) { return +n.toFixed(d); }
  function fmtDate(d: Date | string) {
    return formatIdDateDash(d);
  }
  
  function median(ns: number[]) {
    if (ns.length === 0) return 0;
    const a = [...ns].sort((x, y) => x - y);
    const mid = Math.floor(a.length / 2);
    return a.length % 2 ? a[mid] : (a[mid - 1] + a[mid]) / 2;
  }

  const avgTemp = temps.length ? round(sum(temps) / temps.length, 2) : 0;
  const minTemp = rawTemps.length ? Math.min(...rawTemps) : 0;
  const maxTemp = rawTemps.length ? Math.max(...rawTemps) : 0;

  const avgHum = humi.length ? round(sum(humi) / humi.length, 2) : 0;
  const minHum = rawHumi.length ? Math.min(...rawHumi) : 0;
  const maxHum = rawHumi.length ? Math.max(...rawHumi) : 0;

  const avgPressure = pres.length ? round(sum(pres) / pres.length, 2) : 0;
  const minPressure = rawPres.length ? Math.min(...rawPres) : 0;
  const maxPressure = rawPres.length ? Math.max(...rawPres) : 0;

  const avgDewPoint = dewpoint.length ? round(sum(dewpoint) / dewpoint.length, 2) : 0;
  const minDewPoint = rawDews.length ? Math.min(...rawDews) : 0;
  const maxDewPoint = rawDews.length ? Math.max(...rawDews) : 0;

  const totalRain = rains.length ? round(sum(rains), 2) : 0;
  const avgRain = rains.length ? round(sum(rains) / rains.length, 2) : 0;

  const rainyDays = rains.filter(r => r > 0).length;
  const dryDays = rains.filter(r => r === 0).length;

  const fmt2 = (n: number) => Number.isFinite(n) ? n.toFixed(2) : "0.00";

  const printedAt = new Date();

  // react-to-print using componentRef
  const componentRef = useRef<HTMLElement>(null);
  const handlePrint = useReactToPrint({
    contentRef: componentRef,
    documentTitle: "Laporan Data Cuaca",
    pageStyle: `
      @page { 
        size: A4 portrait; 
        margin: 5mm 8mm 12mm;
      }
      @media print {
        html, body { 
          -webkit-print-color-adjust: exact; 
          print-color-adjust: exact;
          margin: 0;
          padding: 0;
        }
        .no-print { display: none !important; }

        header, section, footer { 
          break-inside: avoid-page; 
          page-break-inside: avoid; 
        }

        table { 
          break-inside: auto; 
          page-break-inside: auto; 
        }
        tr, img { 
          break-inside: avoid; 
          page-break-inside: avoid; 
        }

        @page :first { margin-top: 0; }
      }
    `,
  });

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-semibold text-gray-900 dark:text-gray-50">Pelaporan</h2>
          <p className="text-muted-foreground dark:text-gray-50">Pelaporan data sensor</p>
        </div>
      </div>

      <Card className=" no-print mb-6">
        <CardHeader className={`flex flex-col md:flex-row items-start md:items-center justify-between gap-4 dark:bg-slate-800 bg-slate-100 border-b`}>
          {/* Kolom Kiri: Sensor dan Rentang Tanggal */}
          <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:gap-6">
            {/* Pilih Sensor */}
            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Pilih Sensor</label>
              <Select value={sensorId} onValueChange={setSensorId}>
                <SelectTrigger className="w-full sm:w-[200px]">
                  <SelectValue placeholder="Pilih Sensor" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="id-01">Sensor 1</SelectItem>
                  <SelectItem value="id-02">Sensor 2</SelectItem>
                  <SelectItem value="id-03">Sensor 3</SelectItem>
                  <SelectItem value="id-04">Sensor 4</SelectItem>
                  <SelectItem value="id-05">Sensor 5</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Pilih Rentang Tanggal */}
            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Rentang Tanggal</label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" className="w-full sm:w-[280px] justify-start text-left font-normal">
                    <CalendarIcon className="mr-2 h-4 w-4 opacity-60" />
                    <span className="truncate">
                      {dateRange?.from
                        ? dateRange?.to
                          ? `${toDDMMYYYY(dateRange.from)} s/d ${toDDMMYYYY(dateRange.to)}`
                          : `${toDDMMYYYY(dateRange.from)}`
                        : "Pilih rentang tanggal"}
                    </span>
                  </Button>
                </PopoverTrigger>
                <PopoverContent align="start" className="w-auto p-2" sideOffset={6}>
                  <Calendar
                    mode="range"
                    numberOfMonths={2}
                    showOutsideDays
                    captionLayout="dropdown"
                    selected={dateRange}
                    onSelect={setDateRange}
                    className="rounded-lg border shadow-sm"
                  />
                </PopoverContent>
              </Popover>
            </div>
          </div>
          
          {/* Kolom Kanan: Actions */}
          <div className="flex w-full flex-col justify-end gap-2 sm:w-auto sm:flex-row sm:items-end">
            <Button
              variant="outline"
              className="w-full sm:w-auto"
              onClick={() => {
                const now = new Date();
                const start = new Date(now);
                start.setDate(now.getDate() - 2);
                start.setHours(0, 0, 0, 0);
                const end = new Date(now);
                end.setHours(23, 59, 59, 999);
                setDateRange({ from: start, to: end });
              }}
            >
              3 Hari Terakhir
            </Button>
            <Button className="w-full bg-blue-500 text-white hover:bg-blue-600 sm:w-auto" onClick={loadData}>Muat Data</Button>
            <Button className="flex w-full items-center bg-green-700 text-white hover:bg-green-800 sm:w-auto" onClick={handlePrint}>
              <Printer className="mr-2 h-4 w-4" />
              Cetak
            </Button>
          </div>
        </CardHeader>
      </Card>
      {/* Info error sederhana */}
      {error ? (
        <div className="no-print mx-auto mb-3 max-w-[210mm] text-red-700">
          {error}
        </div>
      ) : null}

      {/* Area cetak */}
      <main ref={componentRef} className="mx-auto my-0 mb-6 min-h-[calc(297mm-24mm)] max-w-[210mm] bg-white text-gray-900 shadow-md print:shadow-none">
        {/* Header */}
        <header className="mb-2 border-b border-gray-300 px-5 py-4 print:pb-2">
          <div className="flex items-center gap-3">
            <img 
              src="/img/logo.png" 
              alt="Logo Meteorologi Jerukagung" 
              className="h-16 w-16 object-contain" 
            />
            <div>
              <div className="text-sm font-medium text-gray-500">Departemen Penelitian Sains Atmosfer</div>
              <div className="text-xl font-bold">JERUKAGUNG METEOROLOGI</div>
            </div>
          </div>
          
          <div className="mt-4 flex items-start justify-between">
            <div>
              <h1 className="text-lg font-bold">Laporan Data Cuaca</h1>
              <p className="text-sm text-gray-500">
                Sensor: {sensorId}
                {weatherData.length > 0 ? <> • Periode: {fmtDate(startDateCalc)} — {fmtDate(endDateCalc)}</> : null}
              </p>
            </div>
            <div className="text-right text-xs text-gray-500">
              <div><strong>Tanggal Cetak:</strong> {fmtDate(printedAt)}</div>
              <div><Badge>Halaman: 1</Badge></div>
            </div>
          </div>
        </header>

        {/* Konten */}
        <div className="p-5 print:p-2">
          {loading ? (
            <section className="text-gray-600">Memuat data...</section>
          ) : weatherData.length === 0 ? (
            <section className="text-gray-600">Tidak ada data untuk ditampilkan.</section>
          ) : (
            <>
              {/* Ringkasan Statistik */}
              <section className="mb-4">
                <div className="grid grid-cols-4 gap-2 sm:grid-cols-4 md:grid-cols-4">
                  <MetricCardWithTime 
                    label="Suhu" 
                    unit="°C" 
                    avg={avgTemp} 
                    max={maxTemp} 
                    min={minTemp} 
                  />
                  <MetricCardWithTime 
                    label="Kelembapan" 
                    unit="%" 
                    avg={avgHum} 
                    max={maxHum} 
                    min={minHum} 
                  />
                  <MetricCardWithTime 
                    label="Tekanan Udara" 
                    unit="hPa" 
                    avg={avgPressure} 
                    max={maxPressure} 
                    min={minPressure} 
                  />
                  <CardLabel label="Total Curah Hujan" value={`${fmt2(totalRain)} mm`} />
                </div>
                
                <div className="mt-2 grid grid-cols-2 gap-2 sm:grid-cols-2 md:grid-cols-2">
                  <CardLabel label="Hari Hujan" value={`${rainyDays} hari`} hint={`Rata-rata ${fmt2(avgRain)} mm/hari`} />
                  <CardLabel label="Hari Tanpa Hujan" value={`${dryDays} hari`} />
                </div>
              </section>

              {/* Rincian Harian */}
              <section className="mb-4">
                <h2 className="mb-2 text-sm font-semibold">Rincian Harian</h2>
                <DataTable rows={weatherData} />
              </section>

              {/* Footer */}
              <footer className="mt-8 flex items-end justify-between gap-3">
                <div className="text-sm">
                  <div className="text-xs text-gray-500">Disusun oleh,</div>
                  <div className="h-10" />
                  <div className="text-base font-semibold">________________________</div>
                  <div className="mt-1 text-sm text-gray-500">{displayName}</div>
                </div>
                <div className="flex-1 text-right text-[10px] text-gray-500">
                  Catatan: Data di atas merupakan ringkasan periode yang dipilih.
                </div>
              </footer>
            </>
          )}
        </div>
      </main>
    </div>
  )
}