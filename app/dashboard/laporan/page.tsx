"use client";
import { useAuth } from "@/hooks/useAuth";
import { useRef, useEffect, useState } from "react";
import { useReactToPrint } from "react-to-print";
import { fetchSensorData, SensorDate } from "@/lib/FetchingSensorData";
import Image from "next/image";

type WeatherRecord = {
  date: string;
  sampleCount: number; // jumlah sampel per hari
  temperatureAvg: number;
  humidityAvg: number;
  pressureAvg: number;
  dewPointAvg: number;
  windSpeedAvg: number;
  rainfallTot: number;
};

// Tambahkan pilihan interval analisis (menit)
interface Period { label: string; valueInMinutes: number; }
const periods: Period[] = [
    { label: "1 Hari", valueInMinutes: 24 * 60 },
    { label: "3 Hari", valueInMinutes: 3 * 24 * 60 },
    { label: "7 Hari", valueInMinutes: 7 * 24 * 60 },
    { label: "14 Hari", valueInMinutes: 14 * 24 * 60 },
    { label: "30 Hari", valueInMinutes: 30 * 24 * 60 },
];

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

function DataTable({ rows }: { rows: WeatherRecord[] }) {
  const fmt2 = (n: number) => (Number.isFinite(n) ? n.toFixed(2) : "0.00");
  return (
    <table style={styles.table}>
      <thead>
        <tr>
          <th style={styles.theadCell}>Tanggal</th>
          <th style={styles.theadCell}>Suhu (°C)</th>
          <th style={styles.theadCell}>Kelembapan (%)</th>
          <th style={styles.theadCell}>Tekanan (hPa)</th>
          <th style={styles.theadCell}>Titik Embun (°C)</th>
          <th style={styles.theadCell}>Curah Hujan (mm)</th>
        </tr>
      </thead>
      <tbody>
        {rows.map((r, idx) => (
          <tr key={r.date} style={idx % 2 ? styles.zebra : undefined}>
            <td style={styles.cell}>{formatIdDateDash(r.date)}</td>
            <td style={styles.cell}>{fmt2(r.temperatureAvg)}</td>
            <td style={styles.cell}>{fmt2(r.humidityAvg)}</td>
            <td style={styles.cell}>{fmt2(r.pressureAvg)}</td>
            <td style={styles.cell}>{fmt2(r.dewPointAvg)}</td>
            <td style={styles.cell}>{fmt2(r.rainfallTot)}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
 
export default function LaporanPage() {
  const { user, profile } = useAuth();
  const displayName = profile?.displayName || user?.displayName || "Petugas Meteorologi";

  // State: sensor, periode, data, loading, error
  const [sensorId, setSensorId] = useState("id-05");
  const [selectedPeriod, setSelectedPeriod] = useState<Period>(periods[1]); // default 1 Jam
  const [weatherData, setWeatherData] = useState<WeatherRecord[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // Tambahan: simpan data mentah untuk min/max berbasis data asli
  const [rawData, setRawData] = useState<SensorDate[]>([]);

  // Helper format "YYYY-MM-DD" pada zona waktu Asia/Jakarta
  const fmtYMD = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Jakarta",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
  // Tambahan: formatter jam "HH" pada zona waktu Asia/Jakarta
  const fmtHour = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Jakarta",
    hour: "2-digit",
    hour12: false,
  });

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

      // rainrate (mm/h) -> estimasi curah hujan per jam (mm) ≈ rata-rata rainrate dalam jam tsb
      const rainrateAvg = sum(items.map(i => i.rainrate)) / n;

      hours.push({
        hourKey,
        dateKey: hourKey.slice(0, 10), // "YYYY-MM-DD"
        sampleCount: n,
        temperatureAvg: tAvg,
        humidityAvg: hAvg,
        pressureAvg: pAvg,
        dewPointAvg: dAvg,
        rainfallTot: rainrateAvg,
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

    const result: WeatherRecord[] = [];
    for (const [date, items] of byDay) {
      const totalSamples = items.reduce((acc, it) => acc + it.sampleCount, 0) || 1;
      const wsum = (pick: (h: HourlyRecord) => number) =>
        items.reduce((acc, it) => acc + pick(it) * it.sampleCount, 0);

      result.push({
        date,
        sampleCount: totalSamples,
        temperatureAvg: wsum(i => i.temperatureAvg) / totalSamples,
        humidityAvg: wsum(i => i.humidityAvg) / totalSamples,
        pressureAvg: wsum(i => i.pressureAvg) / totalSamples,
        dewPointAvg: wsum(i => i.dewPointAvg) / totalSamples,
        windSpeedAvg: 0, // tidak tersedia di sumber data
        rainfallTot: items.reduce((acc, it) => acc + it.rainfallTot, 0), // Σ curah hujan per jam
      });
    }
    result.sort((a, b) => a.date.localeCompare(b.date));
    return result;
  }

  async function loadData() {
    setLoading(true);
    setError(null);
    try {
      const raw = await fetchSensorData(sensorId, selectedPeriod.valueInMinutes);
      setRawData(raw);
      const daily = aggregateDaily(raw); // kini via agregasi jam -> harian
      setWeatherData(daily);
    } catch (e: any) {
      setError(e?.message || "Gagal memuat data.");
      setRawData([]);
      setWeatherData([]);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadData();
  }, [sensorId, selectedPeriod]);

  const dates = weatherData.map(w => new Date(w.date));
  const startDate = dates.length ? new Date(Math.min(...dates.map(d => d.getTime()))) : new Date();
  const endDate = dates.length ? new Date(Math.max(...dates.map(d => d.getTime()))) : new Date();

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
        margin: 5mm 8mm 12mm; /* Reduced top margin from 12mm to 5mm */
      }
      @media print {
        html, body { 
          -webkit-print-color-adjust: exact; 
          print-color-adjust: exact;
          margin: 0;
          padding: 0;
        }
        @page :first {
          margin-top: 0;
        }
      }
    `,
  });

  return (
    <>
      {/* Kontrol pemilihan sensor dan interval (tidak ikut tercetak) */}
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
        <div style={{ display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
          <Field label="Sensor">
            <SelectBox value={sensorId} onChange={(v) => setSensorId(v)}>
              <option value="id-01">id-01</option>
              <option value="id-02">id-02</option>
              <option value="id-03">id-03</option>
              <option value="id-04">id-04</option>
              <option value="id-05">id-05</option>
            </SelectBox>
          </Field>

          <Field label="Interval">
            <SegmentedControl
              options={periods.map((p) => ({ label: p.label, value: p.valueInMinutes }))}
              value={selectedPeriod.valueInMinutes}
              onChange={(v) => {
                const p = periods.find((pp) => pp.valueInMinutes === v) || periods[1];
                setSelectedPeriod(p);
              }}
            />
          </Field>

          <div style={{ marginLeft: "auto", display: "flex", gap: 8 }}>
            <UIButton onClick={loadData} disabled={loading}>
              {loading ? "Memuat..." : "Muat Data"}
            </UIButton>
            <UIButton
              variant="ghost"
              onClick={handlePrint}
              disabled={loading || !!error || weatherData.length === 0}
            >
              Cetak / Simpan PDF
            </UIButton>
          </div>
        </div>
      </div>

      {/* Info error sederhana */}
      {error ? (
        <div className="no-print" style={{ maxWidth: "210mm", margin: "0 auto 12px", color: "#b91c1c" }}>
          {error}
        </div>
      ) : null}

      {/* Pasang ref pada area yang ingin dicetak */}
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
                Sensor: {sensorId} • Interval: {selectedPeriod.label}
                {weatherData.length > 0 ? <> • Periode: {fmtDate(startDate)} — {fmtDate(endDate)}</> : null}
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
            <div style={{ color: "#555" }}>Memuat data...</div>
          </section>
        ) : weatherData.length === 0 ? (
          <section>
            <div style={{ color: "#555" }}>Tidak ada data untuk ditampilkan.</div>
          </section>
        ) : (
          <>
            <section>
              <div style={styles.grid}>
                <Card label="Suhu Rata-rata" value={`${fmt2(avgTemp)} °C`} hint={`Min ${fmt2(minTemp)} °C • Maks ${fmt2(maxTemp)} °C`} />
                <Card label="Kelembapan Rata-rata" value={`${fmt2(avgHum)} %`} hint={`Min ${fmt2(minHum)} % • Maks ${fmt2(maxHum)} %`} />
                <Card label="Tekanan Udara Rata-rata" value={`${fmt2(avgPressure)} hPa`} hint={`Min ${fmt2(minPressure)} hPa • Maks ${fmt2(maxPressure)} hPa`} />
                <Card label="Total Curah Hujan" value={`${fmt2(totalRain)} mm`} />
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