"use client";
import { useAuth } from "@/hooks/useAuth";
import { useRef, useEffect, useState } from "react";
import { useReactToPrint } from "react-to-print";
import { fetchSensorData, SensorDate } from "@/lib/FetchingSensorData";

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
    padding: "8mm 10mm",
    color: "#111",
    fontFamily:
      'system-ui, -apple-system, "Segoe UI", Roboto, Helvetica, Arial, "Noto Sans", "Apple Color Emoji", "Segoe UI Emoji"',
  } as React.CSSProperties,
  actions: { display: "flex", justifyContent: "flex-end", maxWidth: "210mm", margin: "16px auto" } as React.CSSProperties,
  button: { background: "#0b5fff", color: "#fff", border: "none", borderRadius: 6, padding: "8px 14px", cursor: "pointer" } as React.CSSProperties,
  header: {
    display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 12,
    borderBottom: "1px solid #ccc", paddingBottom: 8, marginBottom: 10,
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

const DataTable = ({ rows }: { rows: WeatherRecord[] }) => {
  const fmt2 = (n: number) => Number.isFinite(n) ? n.toFixed(2) : "0.00";
  return (
    <table style={styles.table}>
      <thead>
        <tr>
          {["Tanggal", "Suhu Harian (°C)", "Kelembapan Relatif (%)", "Tekanan Udara (hPa)", "Hujan Harian (mm)"].map((h, i) => (
            <th key={i} style={styles.theadCell}>{h}</th>
          ))}
        </tr>
      </thead>
      <tbody>
        {rows.map((w, idx) => (
          <tr key={idx} style={idx % 2 === 1 ? styles.zebra : undefined}>
            <td style={styles.cell}>{new Date(w.date).toLocaleDateString("id-ID", { day: "2-digit", month: "long", year: "numeric" })}</td>
            <td style={styles.cell}>{fmt2(w.temperatureAvg) /* daily avg */}</td>
            <td style={styles.cell}>{fmt2(w.humidityAvg) /* daily avg */}</td>
            <td style={styles.cell}>{fmt2(w.pressureAvg) /* daily avg */}</td>
            <td style={styles.cell}>{fmt2(w.rainfallTot) /* total harian */}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
};

export default function LaporanPage() {
  const { user, profile } = useAuth();
  const displayName = profile?.displayName || user?.displayName || "Petugas Meteorologi";

  // State: sensor, periode, data, loading, error
  const [sensorId, setSensorId] = useState("id-05");
  const [selectedPeriod, setSelectedPeriod] = useState<Period>(periods[1]); // default 1 Jam
  const [weatherData, setWeatherData] = useState<WeatherRecord[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

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
      const daily = aggregateDaily(raw); // kini via agregasi jam -> harian
      setWeatherData(daily);
    } catch (e: any) {
      setError(e?.message || "Gagal memuat data.");
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

  const temps = weatherData.map(w => w.temperatureAvg);
  const humi = weatherData.map(w => w.humidityAvg);
  const pres = weatherData.map(w => w.pressureAvg);
  const dewpoint = weatherData.map(w => w.dewPointAvg);
  const winds = weatherData.map(w => w.windSpeedAvg);
  const rains = weatherData.map(w => w.rainfallTot);

  function sum(ns: number[]) { return ns.reduce((a, b) => a + b, 0); }
  function round(n: number, d = 2) { return +n.toFixed(d); }
  function fmtDate(d: Date) {
    return d.toLocaleDateString("id-ID", { day: "2-digit", month: "long", year: "numeric" });
  }
  function median(ns: number[]) {
    if (ns.length === 0) return 0;
    const a = [...ns].sort((x, y) => x - y);
    const mid = Math.floor(a.length / 2);
    return a.length % 2 ? a[mid] : (a[mid - 1] + a[mid]) / 2;
  }

  const avgTemp = temps.length ? round(sum(temps) / temps.length, 2) : 0;
  const minTemp = temps.length ? Math.min(...temps) : 0;
  const maxTemp = temps.length ? Math.max(...temps) : 0;

  const avgHum = humi.length ? round(sum(humi) / humi.length, 2) : 0;
  const minHum = humi.length ? Math.min(...humi) : 0;
  const maxHum = humi.length ? Math.max(...humi) : 0;

  const avgPressure = pres.length ? round(sum(pres) / pres.length, 2) : 0;
  const minPressure = pres.length ? Math.min(...pres) : 0;
  const maxPressure = pres.length ? Math.max(...pres) : 0;

  const avgDewPoint = dewpoint.length ? round(sum(dewpoint) / dewpoint.length, 2) : 0;
  const minDewPoint = dewpoint.length ? Math.min(...dewpoint) : 0;
  const maxDewPoint = dewpoint.length ? Math.max(...dewpoint) : 0;

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
      @page { size: A4 portrait; margin: 12mm; }
      @media print {
        html, body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
      }
    `,
  });

  return (
    <>
      {/* Kontrol pemilihan sensor dan interval (tidak ikut tercetak) */}
      <div className="no-print" style={{ ...styles.actions, gap: 8 }}>
        <label style={{ fontSize: 12 }}>
          Sensor:
          <select
            value={sensorId}
            onChange={e => setSensorId(e.target.value)}
            style={{ marginLeft: 6, padding: "6px 8px" }}
          >
            <option value="id-01">id-01</option>
            <option value="id-02">id-02</option>
            <option value="id-03">id-03</option>
            <option value="id-04">id-04</option>
            <option value="id-05">id-05</option>
          </select>
        </label>
        <label style={{ fontSize: 12, marginLeft: 8 }}>
          Interval:
          <select
            value={selectedPeriod.valueInMinutes}
            onChange={e => {
              const v = Number(e.target.value);
              const p = periods.find(pp => pp.valueInMinutes === v) || periods[1];
              setSelectedPeriod(p);
            }}
            style={{ marginLeft: 6, padding: "6px 8px" }}
          >
            {periods.map(p => (
              <option key={p.label} value={p.valueInMinutes}>{p.label}</option>
            ))}
          </select>
        </label>
        <button style={{ ...styles.button, marginLeft: 8 }} onClick={loadData} disabled={loading}>
          {loading ? "Memuat..." : "Muat Data"}
        </button>
        <button style={{ ...styles.button, marginLeft: 8 }} onClick={handlePrint} disabled={loading || !!error || weatherData.length === 0}>
          Cetak / Simpan PDF
        </button>
      </div>

      {/* Info error sederhana */}
      {error ? (
        <div className="no-print" style={{ maxWidth: "210mm", margin: "0 auto 12px", color: "#b91c1c" }}>
          {error}
        </div>
      ) : null}

      {/* Pasang ref pada area yang ingin dicetak */}
      <main ref={componentRef} style={styles.sheet}>
        <header style={styles.header}>
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