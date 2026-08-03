// lib/climate-drivers/liveClimateFetcher.ts
import { EnsoData, MjoData, IodData } from "./types";
import { getEnsoData as getFallbackEnso, getMjoData as getFallbackMjo, getIodData as getFallbackIod } from "./climateData";

/**
 * Live Fetcher for NOAA CPC Oceanic Niño Index (ONI) and Niño 3.4 SST Anomaly.
 */
export async function fetchLiveEnsoData(): Promise<EnsoData> {
  const fallback = getFallbackEnso();
  try {
    const res = await fetch("https://www.cpc.ncep.noaa.gov/data/indices/oni.ascii.txt", {
      next: { revalidate: 3600 },
      headers: { "User-Agent": "MeteoSense-Dashboard/2.1" },
    });

    if (!res.ok) return fallback;

    const text = await res.text();
    const lines = text.trim().split("\n").filter((l) => l.trim().length > 0);
    
    // Parse last 24 records from NOAA ONI ASCII file
    // Header format: SEAS YR TOTAL ANOM
    const dataLines = lines.filter((l) => !l.startsWith("SEAS"));
    if (dataLines.length === 0) return fallback;

    const recentLines = dataLines.slice(-24);
    const parsedHistoricalOni = recentLines.map((line) => {
      const parts = line.trim().split(/\s+/);
      const season = parts[0];
      const year = parts[1];
      const anomaly = parseFloat(parts[3] || "0");
      return {
        date: `${year} ${season}`,
        oni: anomaly,
        anomaly,
      };
    });

    const latest = parsedHistoricalOni[parsedHistoricalOni.length - 1];
    const latestOni = latest ? latest.oni : fallback.oni;
    const status = latestOni >= 0.5 ? "El Niño" : latestOni <= -0.5 ? "La Niña" : "Neutral";

    return {
      ...fallback,
      status,
      oni: latestOni,
      lastUpdated: latest ? `NOAA CPC (${latest.date})` : fallback.lastUpdated,
      summary: `Data NOAA CPC ONI resmi mencatat indeks ${latestOni >= 0 ? "+" : ""}${latestOni.toFixed(1)}°C (Fase ${status}). Suhu perairan Pasifik Tropis dipantau langsung dari stasiun NOAA.`,
      historicalOni: parsedHistoricalOni,
    };
  } catch (err) {
    console.warn("Live NOAA ONI fetch failed, using fallback:", err);
    return fallback;
  }
}

/**
 * Live Fetcher for BOM Australia / NOAA CPC MJO RMM Index.
 */
export async function fetchLiveMjoData(): Promise<MjoData> {
  const fallback = getFallbackMjo();
  try {
    const res = await fetch("https://www.cpc.ncep.noaa.gov/products/precip/CWlink/MJO/proj_series.txt", {
      next: { revalidate: 3600 },
      headers: { "User-Agent": "MeteoSense-Dashboard/2.1" },
    });

    if (!res.ok) return fallback;

    const text = await res.text();
    const lines = text.trim().split("\n").filter((l) => l.trim().length > 0 && !l.startsWith("year") && !l.startsWith("Year"));
    if (lines.length === 0) return fallback;

    // Parse last 14 days
    const recent = lines.slice(-14);
    const parsedDiagram = recent.map((line) => {
      const parts = line.trim().split(/\s+/);
      const yr = parts[0];
      const mon = parts[1]?.padStart(2, "0");
      const day = parts[2]?.padStart(2, "0");
      const rmm1 = parseFloat(parts[3] || "0");
      const rmm2 = parseFloat(parts[4] || "0");
      const phase = parseInt(parts[5] || "1", 10);
      return {
        date: `${yr}-${mon}-${day}`,
        rmm1: Number.isNaN(rmm1) ? 0 : rmm1,
        rmm2: Number.isNaN(rmm2) ? 0 : rmm2,
        phase: Number.isNaN(phase) ? 1 : phase,
      };
    });

    const latest = parsedDiagram[parsedDiagram.length - 1];
    if (!latest) return fallback;

    const amp = Math.sqrt(latest.rmm1 * latest.rmm1 + latest.rmm2 * latest.rmm2);
    const status: "Active" | "Inactive" = amp >= 1.0 ? "Active" : "Inactive";
    const convectionOverMC =
      status === "Active" && (latest.phase === 4 || latest.phase === 5)
        ? "Enhanced"
        : status === "Active" && (latest.phase === 1 || latest.phase === 8)
        ? "Suppressed"
        : "Neutral";

    return {
      ...fallback,
      phase: latest.phase,
      amplitude: parseFloat(amp.toFixed(2)),
      status,
      convectionOverMC,
      rmm1: latest.rmm1,
      rmm2: latest.rmm2,
      lastUpdated: `BOM / NOAA (${latest.date})`,
      summary: `Data MJO RMM terkini dari BOM Australia / NOAA mencatat Fase ${latest.phase} dengan Amplitudo ${amp.toFixed(2)} (${status}). Konveksi di wilayah Indonesia: ${convectionOverMC}.`,
      phaseDiagram: parsedDiagram,
    };
  } catch (err) {
    console.warn("Live MJO RMM fetch failed, using fallback:", err);
    return fallback;
  }
}

/**
 * Live Fetcher for IOD Dipole Mode Index (DMI).
 */
export async function fetchLiveIodData(): Promise<IodData> {
  const fallback = getFallbackIod();
  try {
    const res = await fetch("https://psl.noaa.gov/gcos_wgsp/Timeseries/Data/dmi.hadisot.data", {
      next: { revalidate: 3600 },
      headers: { "User-Agent": "MeteoSense-Dashboard/2.1" },
    });

    if (!res.ok) return fallback;

    const text = await res.text();
    const lines = text.trim().split("\n");
    // Parse valid numeric rows
    const dataRows = lines.filter((l) => /^\s*\d{4}\s+/.test(l));
    if (dataRows.length === 0) return fallback;

    const lastRow = dataRows[dataRows.length - 1];
    const parts = lastRow.trim().split(/\s+/);
    const year = parts[0];
    // Find last non-missing value (-99.99 or -999)
    let latestDmi = fallback.dmi;
    let monthIdx = 1;
    for (let i = 1; i <= 12; i++) {
      const val = parseFloat(parts[i] || "-999");
      if (!Number.isNaN(val) && val > -50) {
        latestDmi = val;
        monthIdx = i;
      }
    }

    const monthNames = ["Jan", "Feb", "Mar", "Apr", "Mei", "Jun", "Jul", "Agu", "Sep", "Okt", "Nov", "Des"];
    const status: "Positive" | "Negative" | "Neutral" =
      latestDmi >= 0.4 ? "Positive" : latestDmi <= -0.4 ? "Negative" : "Neutral";

    return {
      ...fallback,
      dmi: latestDmi,
      status,
      lastUpdated: `BOM / NOAA (${monthNames[monthIdx - 1]} ${year})`,
      summary: `Indeks IOD DMI terkini mencatat ${latestDmi >= 0 ? "+" : ""}${latestDmi.toFixed(2)}°C (${status} IOD).`,
    };
  } catch (err) {
    console.warn("Live IOD DMI fetch failed, using fallback:", err);
    return fallback;
  }
}
