// lib/climate-drivers/liveClimateFetcher.ts
import { EnsoData, MjoData, IodData } from "./types";
import { getEnsoData as getFallbackEnso, getMjoData as getFallbackMjo, getIodData as getFallbackIod, getEnsoCategory } from "./climateData";

/**
 * Live Fetcher for NOAA CPC Oceanic Niño Index (ONI) and Niño 3.4 SST Anomaly.
 */
export async function fetchLiveEnsoData(): Promise<EnsoData> {
  const fallback = getFallbackEnso();
  try {
    const [oniRes, sstoiRes, soiRes] = await Promise.allSettled([
      fetch("https://www.cpc.ncep.noaa.gov/data/indices/oni.ascii.txt", {
        next: { revalidate: 3600 },
        headers: { "User-Agent": "MeteoSense-Dashboard/2.1" },
      }),
      fetch("https://www.cpc.ncep.noaa.gov/data/indices/sstoi.indices", {
        next: { revalidate: 3600 },
        headers: { "User-Agent": "MeteoSense-Dashboard/2.1" },
      }),
      fetch("https://www.cpc.ncep.noaa.gov/data/indices/soi", {
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
    let historicalSoi = fallback.historicalSoi;
    let latestSoi = fallback.soi;

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

    if (soiRes.status === "fulfilled" && soiRes.value.ok) {
      const text = await soiRes.value.text();
      const monthNames = ["Jan", "Feb", "Mar", "Apr", "Mei", "Jun", "Jul", "Agu", "Sep", "Okt", "Nov", "Des"];
      const rows = text.split("\n").filter((line) => /^\s*\d{4}\s+/.test(line));
      const parsedSoi = rows.flatMap((line) => {
        const parts = line.trim().split(/\s+/);
        const year = Number(parts[0]);
        // NOAA sometimes concatenates the final valid value with -999.9
        // missing-value sentinels when trailing months are unavailable.
        const values = parts.slice(1).join(" ").match(/-?\d+(?:\.\d+)?/g) || [];
        return values.slice(0, 12).flatMap((rawValue, index) => {
          const value = Number(rawValue);
          return Number.isFinite(value) && Math.abs(value) < 50
            ? [{ date: `${year}-${String(index + 1).padStart(2, "0")}`, label: `${monthNames[index]} ${year}`, value }]
            : [];
        });
      });

      if (parsedSoi.length > 0) {
        const recentSoi = parsedSoi.slice(-24);
        historicalSoi = recentSoi.map(({ date, value }) => ({ date, value }));
        latestSoi = recentSoi[recentSoi.length - 1].value;
      }
    }

    const status = getEnsoCategory(nino34) as any;

    return {
      ...fallback,
      status,
      oni: latestOni,
      soi: latestSoi,
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
      historicalSoi,
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
 * Live Fetcher for IOD Dipole Mode Index (DMI) from BOM Australia.
 * Source: http://www.bom.gov.au/clim_data/IDCK000072/iod_1.txt
 */
export async function fetchLiveIodData(): Promise<IodData> {
  const fallback = getFallbackIod();
  try {
    let text = "";
    try {
      const res = await fetch("https://www.bom.gov.au/clim_data/IDCK000072/iod_1.txt", {
        next: { revalidate: 3600 },
        headers: { "User-Agent": "MeteoSense-Dashboard/2.1" },
      });
      if (res.ok) text = await res.text();
    } catch {
      // Fallback to HTTP if HTTPS fails
      const res = await fetch("http://www.bom.gov.au/clim_data/IDCK000072/iod_1.txt", {
        next: { revalidate: 3600 },
        headers: { "User-Agent": "MeteoSense-Dashboard/2.1" },
      });
      if (res.ok) text = await res.text();
    }

    if (!text) return fallback;

    const lines = text.trim().split("\n").filter((l) => l.includes(","));
    if (lines.length === 0) return fallback;

    const parsedWeeks: Array<{ y: number; m: number; d: number; val: number }> = [];
    const monthlyMap = new Map<string, number[]>();
    const quarterMap = new Map<string, number[]>();

    for (const line of lines) {
      const parts = line.trim().split(",");
      if (parts.length < 3) continue;
      const end = parts[1]; // YYYYMMDD
      const val = parseFloat(parts[2]);
      if (Number.isNaN(val)) continue;

      const y = parseInt(end.slice(0, 4), 10);
      const m = parseInt(end.slice(4, 6), 10);
      const d = parseInt(end.slice(6, 8), 10);
      const ym = `${end.slice(0, 4)}-${end.slice(4, 6)}`;
      const q = `Q${Math.ceil(m / 3)}`;
      const yq = `${y} ${q}`;

      parsedWeeks.push({ y, m, d, val });

      if (!monthlyMap.has(ym)) monthlyMap.set(ym, []);
      monthlyMap.get(ym)!.push(val);

      if (!quarterMap.has(yq)) quarterMap.set(yq, []);
      quarterMap.get(yq)!.push(val);
    }

    if (parsedWeeks.length === 0) return fallback;

    const latestWeek = parsedWeeks[parsedWeeks.length - 1];
    const latestDmi = latestWeek.val;
    const monthNamesId = ["Jan", "Feb", "Mar", "Apr", "Mei", "Jun", "Jul", "Agu", "Sep", "Okt", "Nov", "Des"];
    const latestDateFormatted = `${latestWeek.d} ${monthNamesId[latestWeek.m - 1]} ${latestWeek.y}`;

    const status: "Positive" | "Negative" | "Neutral" =
      latestDmi >= 0.4 ? "Positive" : latestDmi <= -0.4 ? "Negative" : "Neutral";

    // Monthly average time series for the last 14 months
    const historicalDmi = Array.from(monthlyMap.entries()).slice(-14).map(([date, vals]) => {
      const avg = vals.reduce((a, b) => a + b, 0) / vals.length;
      return { date, dmi: Math.round(avg * 100) / 100 };
    });

    // Quarterly comparison periods for the last 5 quarters
    const quarterKeys = Array.from(quarterMap.keys()).slice(-5);
    const historicalPeriods = quarterKeys.map((qKey, idx) => {
      const vals = quarterMap.get(qKey)!;
      const avg = Math.round((vals.reduce((a, b) => a + b, 0) / vals.length) * 100) / 100;
      const isLatest = idx === quarterKeys.length - 1;
      const dateLabel = isLatest ? `${qKey} (Kini)` : qKey;
      const type: "Positive" | "Negative" | "Neutral" =
        avg >= 0.4 ? "Positive" : avg <= -0.4 ? "Negative" : "Neutral";
      return { date: dateLabel, dmi: avg, type };
    });

    return {
      ...fallback,
      dmi: latestDmi,
      status,
      lastUpdated: `BOM Australia (${latestDateFormatted})`,
      summary: `Indeks IOD DMI terkini dari BOM Australia mencatat ${latestDmi >= 0 ? "+" : ""}${latestDmi.toFixed(2)}°C (${status} IOD).`,
      historicalDmi,
      historicalPeriods,
      interpretation: {
        ...fallback.interpretation,
        currentAssessment: `Indeks DMI BOM tercatat ${latestDmi >= 0 ? "+" : ""}${latestDmi.toFixed(2)}°C (${status === "Positive" ? "melebihi ambang +0.4°C" : status === "Negative" ? "di bawah ambang -0.4°C" : "dalam rentang netral"}), mengonfirmasi berlangsungnya fase ${status === "Positive" ? "IOD Positif" : status === "Negative" ? "IOD Negatif" : "IOD Netral"}.`,
      },
    };
  } catch (err) {
    console.warn("Live IOD DMI fetch failed, using fallback:", err);
    return fallback;
  }
}
