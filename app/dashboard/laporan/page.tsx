"use client"

import { useEffect, useRef, useState } from "react"
import { Calendar as CalendarIcon, Printer } from "lucide-react"
import { useReactToPrint } from "react-to-print"
import { type DateRange } from "react-day-picker"
import { Calendar } from "@/components/ui/calendar"
import { Popover, PopoverTrigger, PopoverContent } from "@/components/ui/popover"
import { Button } from "@/components/ui/button"
import { Card, CardHeader } from "@/components/ui/card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { cn } from "@/lib/utils"
import { fetchSensorDataByDateRange, SensorDate } from "@/lib/FetchingSensorData"
import { useAuth } from "@/hooks/useAuth"
import ChartComponent from "@/components/ChartComponent"
import { ToastProvider, ToastViewport } from "@/components/ui/toast"
import { useToast } from "@/hooks/use-toast"

// --- IMPORT DARI UTILS (RUMUS DI PISAH) ---
import { 
  WeatherRecord, 
  aggregateDaily, 
  getDayAtSeven, 
  calculatePeriodStats,
  formatIdDateShort,
  toDDMMYYYY,
  formatYMD,
  formatDateTimeForDisplay,
  formatIdDateDash
} from "@/lib/weatherUtils"; // Pastikan path ini benar

// --- Helper UI Components (Tetap disini karena ini murni UI) ---
const CardLabel = ({ label, value, hint, className }: { label: string; value: React.ReactNode; hint?: React.ReactNode; className?: string }) => (
  <div className={cn("rounded-md border border-gray-300 p-2", className)}>
    <div className="text-[11px] text-gray-500">{label}</div>
    <div className="mt-0.5 text-base font-semibold">{value}</div>
    {hint ? <div className="mt-0.5 text-[10px] text-gray-500">{hint}</div> : null}
  </div>
);

const MetricCardWithTime = ({ label, unit, avg, max, min, className }: { label: string; unit: string; avg: number; max: number; min: number; className?: string; }) => {
  const fmt2 = (n: number) => (Number.isFinite(n) ? n.toFixed(1) : "0.0");
  return (
    <div className={cn("rounded-md border border-gray-300 p-2", className)}>
      <div className="border-b border-gray-200 pb-1.5 mb-2">
        <div className="text-[11px] text-gray-500">{label}</div>
      </div>
      <table className="w-full text-xs">
        <tbody>
          <tr><td className="w-1/4 font-semibold align-top">Avg</td><td>{fmt2(avg)} {unit}</td></tr>
          <tr><td className="w-1/4 font-semibold pt-1.5">Max</td><td className="pt-1.5">{fmt2(max)} {unit}</td></tr>
          <tr><td className="w-1/4 font-semibold pt-1.5">Min</td><td className="pt-1.5">{fmt2(min)} {unit}</td></tr>
        </tbody>
      </table>
    </div>
  );
};

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
          <th className={subHeaderClass}>Min</th><th className={subHeaderClass}>Avg</th><th className={subHeaderClass}>Max</th>
          <th className={subHeaderClass}>Min</th><th className={subHeaderClass}>Avg</th><th className={subHeaderClass}>Max</th>
          <th className={subHeaderClass}>Min</th><th className={subHeaderClass}>Avg</th><th className={subHeaderClass}>Max</th>
        </tr>
      </thead>
      <tbody>
        {rows.map((r, idx) => (
          <tr key={r.date} className={idx % 2 ? "bg-gray-50" : ""}>
            <td className={cn(cellClass, "whitespace-nowrap")}>{formatIdDateShort(r.date)}</td>
            <td className={cellClass}>{fmt2(r.temperatureMin)}</td><td className={cellClass}>{fmt2(r.temperatureAvg)}</td><td className={cellClass}>{fmt2(r.temperatureMax)}</td>
            <td className={cellClass}>{fmt2(r.humidityMin)}</td><td className={cellClass}>{fmt2(r.humidityAvg)}</td><td className={cellClass}>{fmt2(r.humidityMax)}</td>
            <td className={cellClass}>{fmt2(r.pressureMin)}</td><td className={cellClass}>{fmt2(r.pressureAvg)}</td><td className={cellClass}>{fmt2(r.pressureMax)}</td>
            <td className={cellClass}>{fmt2(r.dewPointAvg)}</td>
            <td className={cellClass}>{fmt2(r.rainfallTot)}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

// --- MAIN PAGE COMPONENT ---
export default function PelaporanPage() {
  const { user, profile } = useAuth();
  const displayName = profile?.displayName || user?.displayName || "Pengamat Cuaca";
  const { toast } = useToast();

  const [sensorId, setSensorId] = useState("id-05");
  const [startDate, setStartDate] = useState<string>("");
  const [endDate, setEndDate] = useState<string>("");
  const [dateRange, setDateRange] = useState<DateRange | undefined>(undefined);
  const [weatherData, setWeatherData] = useState<WeatherRecord[]>([]);
  const [rawData, setRawData] = useState<SensorDate[]>([]); // Masih butuh raw data untuk hitung Min/Max absolut
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Init Date Range
  useEffect(() => {
    if (!dateRange) {
      const now = new Date();
      const start = new Date(now);
      start.setDate(now.getDate() - 2);
      start.setHours(0, 0, 0, 0);
      const end = new Date(now);
      end.setHours(23, 59, 59, 999);
      setDateRange({ from: start, to: end });
      setStartDate(formatYMD(start));
      setEndDate(formatYMD(end));
    }
  }, [dateRange]);

  useEffect(() => {
    if (dateRange?.from) setStartDate(formatYMD(dateRange.from));
    if (dateRange?.to) setEndDate(formatYMD(dateRange.to));
  }, [dateRange]);

  // Load Data Handler
  async function loadData() {
    if (!startDate || !endDate) return;
    setLoading(true);
    setError(null);
    
    try {
      const start = getDayAtSeven(startDate);
      let end = getDayAtSeven(endDate);

      toast({ title: "Memuat Data", description: `${formatDateTimeForDisplay(start)} — ${formatDateTimeForDisplay(end)}` });

      if (end.getTime() <= start.getTime()) {
        end = new Date(end.getTime() + 24 * 60 * 60 * 1000);
      }

      const raw = await fetchSensorDataByDateRange(sensorId, start.getTime(), end.getTime());
      setRawData(raw); // Simpan raw untuk kalkulasi min/max akurat
      
      const daily = aggregateDaily(raw); // Panggil fungsi dari Utils
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

  // Hitung Statistik Periode menggunakan Helper Utils
  const stats = calculatePeriodStats(weatherData, rawData);
  const fmt2 = (n: number) => Number.isFinite(n) ? n.toFixed(2) : "0.00";
  const printedAt = new Date();

  // Print Logic
  const componentRef = useRef<HTMLElement>(null);
  const handlePrint = useReactToPrint({
    contentRef: componentRef,
    documentTitle: "Laporan Data Cuaca",
    pageStyle: `
      @page { size: A4 portrait; margin: 5mm 8mm 12mm; }
      @media print {
        html, body { -webkit-print-color-adjust: exact; margin: 0; padding: 0; }
        .no-print { display: none !important; }
        header, section, footer { break-inside: avoid-page; page-break-inside: avoid; }
        table { break-inside: auto; page-break-inside: auto; }
        tr, img { break-inside: avoid; page-break-inside: avoid; }
        @page :first { margin-top: 0; }
      }
    `,
  });

  function selectQuickRange(n: number, label: string) {
    const now = new Date();
    const start = new Date(now);
    start.setDate(now.getDate() - (n - 1));
    start.setHours(0, 0, 0, 0);
    const end = new Date(now);
    end.setHours(0, 0, 0, 0);
    setDateRange({ from: start, to: end });
    toast({ title: "Rentang Tanggal", description: label });
  }

  return (
    <ToastProvider>
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <div>
            <h2 className="text-2xl font-semibold text-gray-900 dark:text-gray-50">Pelaporan</h2>
            <p className="text-muted-foreground dark:text-gray-50">Pelaporan data sensor</p>
          </div>
        </div>

        {/* Filter Card */}
        <Card className="no-print mb-6">
          <CardHeader className={`flex flex-col md:flex-row items-start md:items-center justify-between gap-4 dark:bg-slate-800 bg-slate-100 border-b`}>
            <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:gap-6">
              <div className="flex flex-col gap-1.5">
                <label className="text-sm font-medium">Pilih Sensor</label>
                <Select value={sensorId} onValueChange={setSensorId}>
                  <SelectTrigger className="w-full sm:w-[200px]"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="id-01">Sensor 1</SelectItem>
                    <SelectItem value="id-02">Sensor 2</SelectItem>
                    <SelectItem value="id-03">Sensor 3</SelectItem>
                    <SelectItem value="id-04">Sensor 4</SelectItem>
                    <SelectItem value="id-05">Sensor 5</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="flex flex-col gap-1.5">
                <label className="text-sm font-medium">Rentang Tanggal</label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button id="date" variant="outline" className="w-full sm:w-auto justify-start text-left font-normal">
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {dateRange?.from ? (dateRange.to ? `${toDDMMYYYY(dateRange.from)} - ${toDDMMYYYY(dateRange.to)}` : toDDMMYYYY(dateRange.from)) : <span>Pilih tanggal</span>}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent align="start" className="w-auto p-2">
                    <Calendar mode="range" numberOfMonths={2} selected={dateRange} onSelect={setDateRange} className="rounded-lg border shadow-sm" />
                  </PopoverContent>
                </Popover>
              </div>
            </div>
            
            <div className="flex w-full flex-col justify-end gap-2 sm:w-auto sm:flex-row sm:items-end">
              <div className="flex flex-wrap gap-2">
                <Button variant="outline" onClick={() => selectQuickRange(3, "3 Hari")}>3 Hari</Button>
                <Button variant="outline" onClick={() => selectQuickRange(7, "7 Hari")}>7 Hari</Button>
                <Button variant="outline" onClick={() => selectQuickRange(30, "30 Hari")}>30 Hari</Button>
              </div>
              <Button className="bg-blue-500 hover:bg-blue-600 text-white" onClick={loadData}>Muat Data</Button>
              <Button className="bg-green-700 hover:bg-green-800 text-white" onClick={handlePrint}><Printer className="mr-2 h-4 w-4" /> Cetak</Button>
            </div>
          </CardHeader>
        </Card>

        {error && <div className="no-print mx-auto mb-3 max-w-[210mm] text-red-700">{error}</div>}

        {/* --- Area Cetak (Kertas A4) --- */}
        <main ref={componentRef} className="mx-auto my-0 mb-6 min-h-[calc(297mm-24mm)] max-w-[210mm] bg-white text-gray-900 shadow-md print:shadow-none">
          <header className="mb-2 border-b border-gray-300 px-5 py-4 print:pb-2">
            <div className="flex items-center gap-3">
              <img src="/img/logo.webp" alt="Logo" className="h-16 w-16 object-contain" />
              <div>
                <div className="text-sm font-medium text-gray-500">Departemen Penelitian Sains Atmosfer</div>
                <div className="text-xl font-bold">JERUKAGUNG METEOROLOGI</div>
              </div>
            </div>
            <div className="mt-4 flex items-start justify-between">
              <div>
                <h1 className="text-lg font-bold">Laporan Data Cuaca</h1>
                <p className="text-sm text-gray-500">Sensor: {sensorId} {weatherData.length > 0 && `• ${formatIdDateDash(dateRange?.from!)} — ${formatIdDateDash(dateRange?.to!)}`}</p>
              </div>
              <div className="text-right text-xs text-gray-500">
                <div><strong>Tanggal Cetak:</strong> {formatIdDateDash(printedAt)}</div>
              </div>
            </div>
          </header>

          <div className="p-5 print:p-2">
            {loading ? <section className="text-gray-600">Memuat data...</section> : weatherData.length === 0 ? <section className="text-gray-600">Tidak ada data.</section> : (
              <>
                {/* Stats Grid */}
                <section className="mb-4">
                  <div className="grid grid-cols-4 gap-2">
                    <MetricCardWithTime label="Suhu" unit="°C" avg={stats.avgTemp} max={stats.maxTemp} min={stats.minTemp} />
                    <MetricCardWithTime label="Kelembapan" unit="%" avg={stats.avgHum} max={stats.maxHum} min={stats.minHum} />
                    <MetricCardWithTime label="Tekanan Udara" unit="hPa" avg={stats.avgPres} max={stats.maxPres} min={stats.minPres} />
                    <CardLabel label="Total Curah Hujan" value={`${fmt2(stats.totalRain)} mm`} />
                  </div>
                  <div className="mt-2 grid grid-cols-2 gap-2">
                    <CardLabel label="Hari Hujan" value={`${stats.rainyDays} hari`} hint={`Rata-rata ${fmt2(stats.avgRain)} mm/hari`} />
                    <CardLabel label="Hari Tanpa Hujan" value={`${stats.dryDays} hari`} />
                  </div>
                </section>

                {/* Chart Section */}
                <section className="mb-6">
                  <h2 className="mb-2 text-sm font-semibold">Grafik Suhu & Titik Embun</h2>
                  <div className="rounded-md border border-gray-300 p-2">
                    <ChartComponent
                      data={[
                        {
                          x: weatherData.map(w => formatIdDateShort(w.date)),
                          y: weatherData.map(w => w.temperatureAvg),
                          type: "scatter", mode: "lines+markers", name: "Suhu Avg",
                          line: { color: "#ef4444", width: 2 }, marker: { color: "#ef4444", size: 5 }
                        },
                        {
                          x: weatherData.map(w => formatIdDateShort(w.date)),
                          y: weatherData.map(w => w.dewPointAvg),
                          type: "scatter", mode: "lines+markers", name: "Dew Point",
                          line: { color: "#0ea5e9", width: 2 }, marker: { color: "#0ea5e9", size: 5 }
                        }
                      ]}
                      layout={{
                        autosize: true, height: 340, margin: { l: 50, r: 20, t: 30, b: 50 },
                        font: { size: 11 }, legend: { orientation: "h", y: -0.25 },
                        xaxis: { tickangle: -30, showgrid: true, gridcolor: "rgba(0,0,0,0.06)" },
                        yaxis: { title: "°C", showgrid: true, gridcolor: "rgba(0,0,0,0.06)" }
                      }}
                    />
                  </div>
                </section>

                {/* Table Section */}
                <section className="mb-4">
                  <h2 className="mb-2 text-sm font-semibold">Rincian Harian</h2>
                  <DataTable rows={weatherData} />
                </section>

                {/* Signature */}
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
      <ToastViewport />
    </ToastProvider>
  )
}