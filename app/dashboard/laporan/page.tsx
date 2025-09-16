"use client";

import { useEffect, useRef, useState } from "react"
import { Calendar as CalendarIcon } from "lucide-react"
import { Calendar } from "@/components/ui/calendar"
import { Popover, PopoverTrigger, PopoverContent } from "@/components/ui/popover"
import type { DateRange } from "react-day-picker"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { fetchSensorData, SensorDate } from "@/lib/FetchingSensorData"
import { useAuth } from "@/hooks/useAuth"
import { Printer } from "lucide-react"
import { useReactToPrint } from "react-to-print";

type WeatherRecord = {
  date: string;
  sampleCount: number; // jumlah sampel per hari
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


/* Inline styles */
const styles = {
  sheet: {
    background: "#fff",
    width: "210mm",
    minHeight: "calc(297mm - 24mm)",
    margin: "0 auto 24px",
    boxShadow: "0 2px 16px rgba(0,0,0,0.08)",
    padding: "3mm 5mm 8mm", // Reduced top padding from 8mm to 3mm
    color: "#111",
    fontFamily:
      'system-ui, -apple-system, "Segoe UI", Roboto, Helvetica, Arial, "Noto Sans", "Apple Color Emoji", "Segoe UI Emoji"',
  } as React.CSSProperties,
  actions: { display: "flex", justifyContent: "flex-end", maxWidth: "210mm", margin: "16px auto" } as React.CSSProperties,
  button: { background: "#0b5fff", color: "#fff", border: "none", borderRadius: 6, padding: "8px 14px", cursor: "pointer" } as React.CSSProperties,
  header: {
    display: "flex", 
    justifyContent: "space-between", 
    alignItems: "flex-start", 
    gap: 12,
    borderBottom: "1px solid #ccc", 
    paddingBottom: 8, 
    marginBottom: 10,
  } as React.CSSProperties,
  logoContainer: {
    display: "flex",
    alignItems: "center",
    gap: 12,
    marginBottom: 6,
    marginTop: 0, // Ensure no top margin
  } as React.CSSProperties,
  logoImage: {
    width: 64,
    height: 64,
    objectFit: "contain",
  } as React.CSSProperties,
  title: { fontSize: 18, margin: "0 0 4px 0" } as React.CSSProperties,
  h2: { fontSize: 14, margin: "16px 0 8px 0" } as React.CSSProperties,
  subtitle: { color: "#555", margin: 0 } as React.CSSProperties,
  meta: { textAlign: "right" as const, fontSize: 11, color: "#555" } as React.CSSProperties,
  grid: { display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 8, margin: "8px 0 4px" } as React.CSSProperties,
  card: { border: "1px solid #ccc", borderRadius: 6, padding: 8 } as React.CSSProperties,
  label: { fontSize: 11, color: "#555" } as React.CSSProperties,
  value: { fontSize: 16, fontWeight: 600 as const, marginTop: 2 } as React.CSSProperties,
  hint: { fontSize: 10, color: "#555", marginTop: 2 } as React.CSSProperties,
  table: { width: "100%", borderCollapse: "collapse" as const, fontSize: 11 } as React.CSSProperties,
  cell: { border: "1px solid #ccc", padding: "6px 8px", textAlign: "left" as const } as React.CSSProperties,
  zebra: { background: "#fafbfc" } as React.CSSProperties,
  theadCell: { background: "#f6f7f9", border: "1px solid #ccc", padding: "6px 8px", textAlign: "left" as const } as React.CSSProperties,
  footer: { display: "flex", justifyContent: "space-between", alignItems: "flex-end", gap: 12, marginTop: 16 } as React.CSSProperties,
  sign: { width: 220, fontSize: 11 } as React.CSSProperties,
  line: { height: 48 } as React.CSSProperties,
  name: { marginTop: 8 } as React.CSSProperties,
  role: { color: "#555" } as React.CSSProperties,
  notes: { flex: 1, fontSize: 10, color: "#555", textAlign: "right" as const } as React.CSSProperties,
};

/* Small UI components */
const Badge = ({ children }: { children: React.ReactNode }) => (
  <span style={{ display: "inline-block", background: "#eef2ff", color: "#1e40af", border: "1px solid #c7d2fe", borderRadius: 9999, padding: "2px 8px", fontSize: 11 }}>
    {children}
  </span>
);

const Card = ({ label, value, hint }: { label: string; value: React.ReactNode; hint?: React.ReactNode }) => (
  <div style={styles.card}>
    <div style={styles.label}>{label}</div>
    <div style={styles.value}>{value}</div>
    {hint ? <div style={styles.hint}>{hint}</div> : null}
  </div>
);

// New component for metrics with tabular display of avg/max/min values
const MetricCardWithTime = ({ 
  label, 
  unit, 
  avg, 
  max, 
  min
}: { 
  label: string; 
  unit: string;
  avg: number; 
  max: number;
  min: number;
}) => {
  const fmt2 = (n: number) => (Number.isFinite(n) ? n.toFixed(1) : "0.0");
  
  return (
    <div style={styles.card}>
      <div style={{ borderBottom: "1px solid #eee", paddingBottom: 4, marginBottom: 8 }}>
        <div style={styles.label}>{label}</div>
      </div>
      
      <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
        <tbody>
          <tr>
            <td style={{ fontWeight: 600, width: "25%" }}>Avg</td>
            <td>{fmt2(avg)} {unit}</td>
          </tr>
          <tr>
            <td style={{ fontWeight: 600, paddingTop: 6 }}>Max</td>
            <td style={{ paddingTop: 6 }}>{fmt2(max)} {unit}</td>
          </tr>
          <tr>
            <td style={{ fontWeight: 600, paddingTop: 6 }}>Min</td>
            <td style={{ paddingTop: 6 }}>{fmt2(min)} {unit}</td>
          </tr>
        </tbody>
      </table>
    </div>
  );
};

// Tambahan: UI components untuk kontrol pemilihan
const UIButton = ({
  children,
  onClick,
  disabled,
  variant = "primary",
  style,
}: {
  children: React.ReactNode;
  onClick?: () => void;
  disabled?: boolean;
  variant?: "primary" | "ghost";
  style?: React.CSSProperties;
}) => {
  const base: React.CSSProperties = {
    borderRadius: 8,
    padding: "8px 12px",
    fontSize: 13,
    cursor: disabled ? "not-allowed" : "pointer",
    border: "1px solid transparent",
    transition: "background 120ms, border-color 120ms, color 120ms, opacity 120ms",
    opacity: disabled ? 0.6 : 1,
  };
  const variants: Record<string, React.CSSProperties> = {
    primary: { background: "#0b5fff", color: "#fff" },
    ghost: { background: "#fff", color: "#111", borderColor: "#d1d5db" },
  };
  return (
    <button onClick={onClick} disabled={disabled} style={{ ...base, ...variants[variant], ...style }}>
      {children}
    </button>
  );
};

const Field = ({ label, children }: { label: string; children: React.ReactNode }) => (
  <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
    <span style={{ fontSize: 12, color: "#374151" }}>{label}</span>
    {children}
  </div>
);

const SelectBox = ({
  value,
  onChange,
  children,
  style,
}: {
  value: string;
  onChange: (v: string) => void;
  children: React.ReactNode;
  style?: React.CSSProperties;
}) => (
  <div style={{ position: "relative" }}>
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      style={{
        appearance: "none",
        WebkitAppearance: "none",
        MozAppearance: "none",
        background: "#fff",
        border: "1px solid #d1d5db",
        borderRadius: 8,
        padding: "8px 36px 8px 12px",
        fontSize: 13,
        color: "#111",
        minWidth: 160,
        ...style,
      }}
    >
      {children}
    </select>
    <span
      aria-hidden
      style={{
        position: "absolute",
        right: 10,
        top: "50%",
        transform: "translateY(-50%)",
        pointerEvents: "none",
        color: "#6b7280",
        fontSize: 12,
      }}
    >
      ▼
    </span>
  </div>
);

const SegmentedControl = <T extends string | number>({
  options,
  value,
  onChange,
}: {
  options: { label: string; value: T }[];
  value: T;
  onChange: (v: T) => void;
}) => (
  <div
    role="tablist"
    style={{
      display: "inline-flex",
      background: "#f3f4f6",
      border: "1px solid #e5e7eb",
      borderRadius: 10,
      padding: 4,
      gap: 4,
    }}
  >
    {options.map((opt) => {
      const active = opt.value === value;
      return (
        <button
          key={`${opt.value}`}
          role="tab"
          aria-selected={active}
          onClick={() => onChange(opt.value)}
          style={{
            padding: "6px 10px",
            borderRadius: 8,
            fontSize: 12,
            border: "1px solid transparent",
            background: active ? "#fff" : "transparent",
            color: active ? "#111" : "#374151",
            cursor: "pointer",
          }}
        >
          {opt.label}
        </button>
      );
    })}
  </div>
);

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
  const cellStyle = {
    ...styles.cell,
    textAlign: "center" as const,
    padding: "4px 6px",
  };
  const headerGroup = {
    ...styles.theadCell,
    borderBottom: "none",
    padding: "6px 2px 2px 2px",
  };
  const subHeader = {
    ...styles.theadCell,
    fontSize: 10,
    padding: "2px 4px 4px 4px",
    fontWeight: "normal" as const,
  };
  
  return (
    <table style={styles.table}>
      <thead>
        <tr>
          <th style={styles.theadCell} rowSpan={2}>Tanggal</th>
          <th style={headerGroup} colSpan={3}>Suhu (°C)</th>
          <th style={headerGroup} colSpan={3}>Kelembapan (%)</th>
          <th style={headerGroup} colSpan={3}>Tekanan (hPa)</th>
          <th style={styles.theadCell} rowSpan={2}>Titik Embun (°C)</th>
          <th style={styles.theadCell} rowSpan={2}>Curah Hujan (mm)</th>
        </tr>
        <tr>
          <th style={subHeader}>Min</th>
          <th style={subHeader}>Avg</th>
          <th style={subHeader}>Max</th>
          <th style={subHeader}>Min</th>
          <th style={subHeader}>Avg</th>
          <th style={subHeader}>Max</th>
          <th style={subHeader}>Min</th>
          <th style={subHeader}>Avg</th>
          <th style={subHeader}>Max</th>
        </tr>
      </thead>
      <tbody>
        {rows.map((r, idx) => (
          <tr key={r.date} style={idx % 2 ? styles.zebra : undefined}>
            <td style={styles.cell}>{formatIdDateShort(r.date)}</td>
            {/* Temperature */}
            <td style={cellStyle}>{fmt2(r.temperatureMin)}</td>
            <td style={cellStyle}>{fmt2(r.temperatureAvg)}</td>
            <td style={cellStyle}>{fmt2(r.temperatureMax)}</td>
            {/* Humidity */}
            <td style={cellStyle}>{fmt2(r.humidityMin)}</td>
            <td style={cellStyle}>{fmt2(r.humidityAvg)}</td>
            <td style={cellStyle}>{fmt2(r.humidityMax)}</td>
            {/* Pressure */}
            <td style={cellStyle}>{fmt2(r.pressureMin)}</td>
            <td style={cellStyle}>{fmt2(r.pressureAvg)}</td>
            <td style={cellStyle}>{fmt2(r.pressureMax)}</td>
            {/* Dew Point */}
            <td style={cellStyle}>{fmt2(r.dewPointAvg)}</td>
            {/* Rainfall */}
            <td style={cellStyle}>{fmt2(r.rainfallTot)}</td>
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

  // Agregasi harian dari data mentah
  // 1) Agregasi per jam terlebih dahulu (khususnya untuk hujan)
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

      // rainrate (mm/h) -> curah hujan per jam (mm) = nilai rainrate terbesar dalam jam tersebut
      const maxRainrate = Math.max(...items.map(i => i.rainrate).filter(Number.isFinite), 0);

      hours.push({
        hourKey,
        dateKey: hourKey.slice(0, 10), // "YYYY-MM-DD"
        sampleCount: n,
        temperatureAvg: tAvg,
        humidityAvg: hAvg,
        pressureAvg: pAvg,
        dewPointAvg: dAvg,
        rainfallTot: maxRainrate, // Menggunakan nilai maksimum, bukan rata-rata
      });
    }
    hours.sort((a, b) => a.hourKey.localeCompare(b.hourKey));
    return hours;
  }

  function aggregateDaily(rows: SensorDate[]): WeatherRecord[] {
    // Agregasi per jam dahulu
    const hourly = aggregateHourly(rows);

    // Lalu agregasi harian dari hasil per jam
    const byDay = new Map<string, HourlyRecord[]>();
    for (const h of hourly) {
      if (!byDay.has(h.dateKey)) byDay.set(h.dateKey, []);
      byDay.get(h.dateKey)!.push(h);
    }

    // Untuk min/max, kita perlu original data juga
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

      // Get raw data for this day to calculate min/max
      const rawData = byDayRaw.get(date) || [];
      
      // Calculate min/max from raw data
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
        windSpeedAvg: 0, // tidak tersedia di sumber data
        rainfallTot: items.reduce((acc, it) => acc + it.rainfallTot, 0), // Σ curah hujan per jam
      });
    }
    result.sort((a, b) => a.date.localeCompare(b.date));
    return result;
  }

  // INIT: default to last 3 days (do not auto-fetch)
  useEffect(() => {
    if (!dateRange) {
      const now = new Date()
      const start = new Date(now)
      start.setDate(now.getDate() - 2) // 3 hari terakhir: D-2..D
      start.setHours(0, 0, 0, 0)
      const end = new Date(now)
      end.setHours(23, 59, 59, 999)
      setDateRange({ from: start, to: end })
      setStartDate(fmtYMD.format(start))
      setEndDate(fmtYMD.format(end))
    }
  }, [dateRange])

  // Sync internal YYYY-MM-DD when user picks range
  useEffect(() => {
    if (dateRange?.from) setStartDate(fmtYMD.format(dateRange.from))
    if (dateRange?.to) setEndDate(fmtYMD.format(dateRange.to))
  }, [dateRange])

  async function loadData() {
    // Guard if date not ready yet
    if (!startDate || !endDate) return

    setLoading(true);
    setError(null);
    try {
      // Build Asia/Jakarta range (inclusive day end)
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

  // NOTE: disable auto-loading on date/sensor change
  // useEffect(() => {
  //   loadData();
  // }, [sensorId, startDate, endDate]);

  const dates = weatherData.map(w => new Date(w.date));
  const startDateCalc = dates.length ? new Date(Math.min(...dates.map(d => d.getTime()))) : new Date();
  const endDateCalc = dates.length ? new Date(Math.max(...dates.map(d => d.getTime()))) : new Date();

  // Averages tetap dari agregasi harian
  const temps = weatherData.map(w => w.temperatureAvg);
  const humi = weatherData.map(w => w.humidityAvg);
  const pres = weatherData.map(w => w.pressureAvg);
  const dewpoint = weatherData.map(w => w.dewPointAvg);
  const rains = weatherData.map(w => w.rainfallTot);

  // Min/Max dari data mentah (bukan hasil agregasi)
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

        /* Hindari pecah di dalam komponen besar */
        header, section, footer { 
          break-inside: avoid-page; 
          page-break-inside: avoid; 
        }

        /* Tabel dapat terpecah antar baris tapi tidak di dalam baris */
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
    <>
      {/* Kontrol pemilihan (tidak ikut tercetak) */}
      <div
        className="no-print"
        style={{
          maxWidth: "210mm",
          margin: "16px auto",
          background: "#f8fafc",
          border: "1px solid #e5e7eb",
          borderRadius: 10,
          padding: 12,
        }}
      >
        <div className="flex flex-wrap items-end justify-between gap-3">
          {/* Sensor Select (shadcn) */}
          <div className="flex flex-col gap-1.5">
            <span className="text-sm text-gray-700">Pilih Sensor</span>
            <Select value={sensorId} onValueChange={setSensorId}>
              <SelectTrigger className="w-[200px]">
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

          {/* Date Range selector with Calendar */}
          <div className="flex flex-col gap-1.5">
            <span className="text-[12px] text-gray-700">Rentang Tanggal (DD-MM-YYYY)</span>
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" className="justify-between w-[280px]">
                  <span className="truncate">
                    {dateRange?.from
                      ? dateRange?.to
                        ? `${toDDMMYYYY(dateRange.from)} s/d ${toDDMMYYYY(dateRange.to)}`
                        : `${toDDMMYYYY(dateRange.from)}`
                      : "Pilih rentang tanggal"}
                  </span>
                  <CalendarIcon className="h-4 w-4 opacity-60" />
                </Button>
              </PopoverTrigger>
              <PopoverContent align="start" className="p-2 w-auto" sideOffset={6}>
                <Calendar
                  mode="range"
                  numberOfMonths={2}
                  showOutsideDays
                  captionLayout="dropdown"
                  selected={dateRange}
                  onSelect={(range) => setDateRange(range)}
                  className="rounded-lg border shadow-sm"
                />
              </PopoverContent>
            </Popover>
          </div>

          {/* Actions */}
          <div style={{ display: "flex", gap: 8 }}>
            <Button className="bg-blue-500 text-white" onClick={loadData}>Muat Data</Button>
            <Button
              variant="outline"
              onClick={() => {
                const now = new Date()
                const start = new Date(now)
                start.setDate(now.getDate() - 2)
                start.setHours(0, 0, 0, 0)
                const end = new Date(now)
                end.setHours(23, 59, 59, 999)
                setDateRange({ from: start, to: end })
                setStartDate(fmtYMD.format(start))
                setEndDate(fmtYMD.format(end))
              }}
            >
              3 Hari Terakhir
            </Button>
            {/* NEW: Print A4 */}
            <Button variant="default" className="flex items-center bg-green-700" onClick={handlePrint}>
              <Printer className="h-4 w-4 mr-2" />
              Cetak
            </Button>
          </div>
        </div>
      </div>

      {/* Info error sederhana */}
      {error ? (
        <div className="no-print" style={{ maxWidth: "210mm", margin: "0 auto 12px", color: "#b91c1c" }}>
          {error}
        </div>
      ) : null}

      {/* Area cetak */}
      <main ref={componentRef} style={styles.sheet}>
        <header>
          <div style={styles.logoContainer}>
            <img 
              src="/img/logo.png" 
              alt="Logo Meteorologi Jerukagung" 
              style={styles.logoImage} 
            />
            <div>
              <div style={{ fontSize: 11, fontWeight: 500, color: "#555" }}>Departemen Penelitian Sains Atmosfer</div>
              <div style={{ fontSize: 16, fontWeight: 600, marginBottom: 2 }}>JERUKAGUNG METEOROLOGI</div>
            </div>
          </div>
          
          <div style={styles.header}>
            <div>
              <h1 style={styles.title}>Laporan Data Cuaca</h1>
              <p style={styles.subtitle}>
                Sensor: {sensorId}
                {weatherData.length > 0 ? <> • Periode: {fmtDate(startDateCalc)} — {fmtDate(endDateCalc)}</> : null}
              </p>
            </div>
            <div style={styles.meta}>
              <div><strong>Tanggal Cetak:</strong> {fmtDate(printedAt)}</div>
              <div><Badge>Halaman: 1</Badge></div>
            </div>
          </div>
        </header>

        {loading ? (
          <section>
            <div className="text-gray-600">Memuat data...</div>
          </section>
        ) : weatherData.length === 0 ? (
          <section>
            <div className="text-gray-600">Tidak ada data untuk ditampilkan.</div>
          </section>
        ) : (
          <>
            <section>
              <div style={styles.grid}>
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
                <Card label="Total Curah Hujan" value={`${fmt2(totalRain)} mm`} />
              </div>
              

              <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: 8, margin: "8px 0 4px" }}>
                <Card label="Hari Hujan" value={`${rainyDays} hari`} hint={`Rata-rata ${fmt2(avgRain)} mm/hari`} />
                <Card label="Hari Tanpa Hujan" value={`${dryDays} hari`} />
              </div>
            </section>

            <section>
              <h2 style={styles.h2}>Rincian Harian</h2>
              <DataTable rows={weatherData} />
            </section>

            <footer style={styles.footer}>
              <div style={styles.sign}>
                <div>Disusun oleh,</div>
                <div style={styles.line} />
                <div style={styles.name}>________________________</div>
                <div style={styles.role}>{displayName}</div>
              </div>
              <div style={styles.notes}>
                Catatan: Data di atas merupakan ringkasan periode yang dipilih.
              </div>
            </footer>
          </>
        )}
      </main>
    </>
  );
}