// lib/climate-drivers/liveClimateFetcher.ts
import { EnsoData, MjoData, IodData } from "./types";
import { getEnsoData as getFallbackEnso, getMjoData as getFallbackMjo, getIodData as getFallbackIod, getEnsoCategory } from "./climateData";

/**
 * Live Fetcher for NOAA CPC Oceanic Niño Index (ONI) and Niño 3.4 SST Anomaly.
 */
export async function fetchLiveEnsoData(): Promise<EnsoData> {
  const fallback = getFallbackEnso();
  try {
    const [oniRes, sstoiRes] = await Promise.allSettled([
      fetch("https://www.cpc.ncep.noaa.gov/data/indices/oni.ascii.txt", {
        next: { revalidate: 3600 },
        headers: { "User-Agent": "MeteoSense-Dashboard/2.1" },
      }),
      fetch("https://www.cpc.ncep.noaa.gov/data/indices/sstoi.indices", {
        next: { revalidate: 3600 },
        headers: { "User-Agent": "MeteoSense-Dashboard/2.1" },
      }),
    ]);

    let parsedHistoricalOni = fallback.historicalOni;
    let latestOni = fallback.oni;

    if (oniRes.status === "fulfilled" && oniRes.value.ok) {
      const text = await oniRes.value.text();
      const lines = text.trim().split("\n").filter((l) => /^\s*[A-Z]{3}\s+\d{4}\s+/.test(l));
      if (lines.length > 0) {
        const recent = lines.slice(-24);
        parsedHistoricalOni = recent.map((line) => {
          const parts = line.trim().split(/\s+/);
          const season = parts[0];
          const year = parts[1];
          const anomaly = parseFloat(parts[3] || "0");
          return {
            date: `${year} ${season}`,
            oni: Number.isNaN(anomaly) ? 0 : anomaly,
            anomaly: Number.isNaN(anomaly) ? 0 : anomaly,
          };
        });
        const latest = parsedHistoricalOni[parsedHistoricalOni.length - 1];
        if (latest) latestOni = latest.oni;
      }
    }

    let nino12 = fallback.nino12;
    let nino3 = fallback.nino3;
    let nino34 = fallback.nino34;
    let nino4 = fallback.nino4;

    let historicalNino12 = fallback.historicalNino12;
    let historicalNino3 = fallback.historicalNino3;
    let historicalNino34 = fallback.historicalNino34;
    let historicalNino4 = fallback.historicalNino4;

    if (sstoiRes.status === "fulfilled" && sstoiRes.value.ok) {
      const text = await sstoiRes.value.text();
      const lines = text.trim().split("\n").filter((l) => /^\s*\d{4}\s+\d{1,2}\s+/.test(l));
      if (lines.length > 0) {
        const recent = lines.slice(-24);
        historicalNino12 = [];
        historicalNino3 = [];
        historicalNino34 = [];
        historicalNino4 = [];

        recent.forEach((line) => {
          const p = line.trim().split(/\s+/);
          const yr = p[0];
          const mon = p[1]?.padStart(2, "0");
          const dateStr = `${yr}-${mon}`;

          const v12 = parseFloat(p[3] || "0");
          const v3 = parseFloat(p[5] || "0");
          const v4 = parseFloat(p[7] || "0");
          const v34 = parseFloat(p[9] || "0");

          if (!Number.isNaN(v12)) historicalNino12.push({ date: dateStr, value: v12 });
          if (!Number.isNaN(v3)) historicalNino3.push({ date: dateStr, value: v3 });
          if (!Number.isNaN(v4)) historicalNino4.push({ date: dateStr, value: v4 });
          if (!Number.isNaN(v34)) historicalNino34.push({ date: dateStr, value: v34 });
        });

        const last12 = historicalNino12[historicalNino12.length - 1];
        const last3 = historicalNino3[historicalNino3.length - 1];
        const last34 = historicalNino34[historicalNino34.length - 1];
        const last4 = historicalNino4[historicalNino4.length - 1];

        if (last12) nino12 = last12.value;
        if (last3) nino3 = last3.value;
        if (last34) nino34 = last34.value;
        if (last4) nino4 = last4.value;
      }
    }

    const status = getEnsoCategory(nino34) as any;

    return {
      ...fallback,
      status,
      oni: latestOni,
      nino12,
      nino3,
      nino34,
      nino4,
      lastUpdated: `NOAA CPC (${parsedHistoricalOni[parsedHistoricalOni.length - 1]?.date || "Terkini"})`,
      summary: `Data NOAA CPC resmi memantau 4 wilayah Pasifik: Niño 1+2 (${nino12 >= 0 ? "+" : ""}${nino12.toFixed(2)}°C), Niño 3 (${nino3 >= 0 ? "+" : ""}${nino3.toFixed(2)}°C), Niño 3.4 (${nino34 >= 0 ? "+" : ""}${nino34.toFixed(2)}°C), dan Niño 4 (${nino4 >= 0 ? "+" : ""}${nino4.toFixed(2)}°C). Status ENSO: ${status}.`,
      historicalOni: parsedHistoricalOni,
      historicalNino12,
      historicalNino3,
      historicalNino34,
      historicalNino4,
    };
  } catch (err) {
    console.warn("Live NOAA ENSO fetch failed, using fallback:", err);
    return fallback;
  }
}

/**
 * Live Fetcher for BOM Australia / NOAA CPC MJO RMM Index.
 */
export async function fetchLiveMjoData(): Promise<MjoData> {
  const fallback = getFallbackMjo();
  try {
    let text = "";
    try {
      const res = await fetch("http://www.bom.gov.au/clim_data/IDCKGEM000/rmm.74toRealtime.txt", {
        next: { revalidate: 3600 },
        headers: { "User-Agent": "MeteoSense-Dashboard/2.1", "Accept": "text/plain, text/ascii, */*" },
      });
      if (res.ok) text = await res.text();
    } catch {
      const res = await fetch("https://www.bom.gov.au/clim_data/IDCKGEM000/rmm.74toRealtime.txt", {
        next: { revalidate: 3600 },
        headers: { "User-Agent": "MeteoSense-Dashboard/2.1", "Accept": "text/plain, text/ascii, */*" },
      });
      if (res.ok) text = await res.text();
    }

    if (!text) return fallback;

    const lines = text.split("\n").filter((l) => l.trim().length > 0);
    const dataRows = lines.filter((l) => /^\s*\d{4}\s+/.test(l));
    if (dataRows.length === 0) return fallback;

    // Parse last 30 daily records
    const recent30 = dataRows.slice(-30);
    const parsedDiagram = recent30.map((line) => {
      const parts = line.trim().split(/\s+/);
      const yr = parts[0];
      const mon = parts[1]?.padStart(2, "0");
      const day = parts[2]?.padStart(2, "0");
      const rmm1 = parseFloat(parts[3] || "0");
      const rmm2 = parseFloat(parts[4] || "0");
      const phase = parseInt(parts[5] || "1", 10);
      let amplitude = parseFloat(parts[6] || "0");

      if ((Number.isNaN(amplitude) || amplitude === 0) && !Number.isNaN(rmm1) && !Number.isNaN(rmm2)) {
        amplitude = Math.sqrt(rmm1 * rmm1 + rmm2 * rmm2);
      }

      return {
        date: `${yr}-${mon}-${day}`,
        rmm1: Number.isNaN(rmm1) ? 0 : Math.round(rmm1 * 1000) / 1000,
        rmm2: Number.isNaN(rmm2) ? 0 : Math.round(rmm2 * 1000) / 1000,
        phase: Number.isNaN(phase) ? 1 : phase,
        amplitude: Number.isNaN(amplitude) ? 0 : Math.round(amplitude * 100) / 100,
      };
    });

    const latest = parsedDiagram[parsedDiagram.length - 1];
    if (!latest) return fallback;

    const amp = latest.amplitude;
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
      lastUpdated: `BOM Australia RMM (${latest.date})`,
      summary: `Data MJO RMM terkini dari BOM Australia mencatat Fase ${latest.phase} dengan Amplitudo ${amp.toFixed(2)} (${status}). Konveksi di wilayah Indonesia: ${convectionOverMC}.`,
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
