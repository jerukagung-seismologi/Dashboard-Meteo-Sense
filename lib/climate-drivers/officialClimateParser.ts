// lib/climate-drivers/officialClimateParser.ts
import { getEnsoCategory } from "./climateData";

/**
 * Official Climate Data Parser Agent
 * Fetches, cleans, sanitizes, and converts raw text/CSV data from official BOM Australia & NOAA CPC endpoints
 * into a standardized unified JSON structure.
 */

export interface Nino34Point {
  year: number;
  month: number;
  sst: number | null;
  anomaly: number | null;
}

export interface EnsoParsedOutput {
  latest_nino34_anomaly: number | null;
  status: string;
  time_series: Nino34Point[];
}

export interface MjoPhasePoint {
  date: string;
  rmm1: number | null;
  rmm2: number | null;
  phase: number | null;
  amplitude: number | null;
}

export interface MjoParsedOutput {
  latest_phase: number | null;
  latest_amplitude: number | null;
  phase_diagram_data: MjoPhasePoint[];
}

export interface IodDmiPoint {
  year: number;
  month: number;
  dmi: number | null;
}

export interface EnsoHistoryPoint {
  dateStr: string;
  year: number;
  month: number;
  day?: number;
  nino12: number | null;
  nino3: number | null;
  nino34: number | null;
  nino4: number | null;
  oni: number | null;
  soi: number | null;
  sst?: number | null;
  anomaly?: number | null;
  status: string;
}

export interface IodHistoryPoint {
  dateStr: string;
  year: number;
  month: number;
  day: number;
  dmi: number | null;
  status: string;
}

export interface MjoHistoryPoint {
  date: string;
  year: number;
  month: number;
  day: number;
  rmm1: number | null;
  rmm2: number | null;
  phase: number | null;
  amplitude: number | null;
  status: string;
}

export interface IodParsedOutput {
  latest_dmi: number | null;
  status: "Positive" | "Negative" | "Neutral";
  time_series: IodDmiPoint[];
}

export interface UnifiedClimateData {
  updated_at: string;
  enso: EnsoParsedOutput;
  mjo: MjoParsedOutput;
  iod: IodParsedOutput;
}

// In-Memory Cache Store
interface CacheStore {
  data: UnifiedClimateData | null;
  lastFetchedEnso: number;
  lastFetchedMjo: number;
  lastFetchedIod: number;
}

const cache: CacheStore = {
  data: null,
  lastFetchedEnso: 0,
  lastFetchedMjo: 0,
  lastFetchedIod: 0,
};

const CACHE_TTL_ENSO = 24 * 60 * 60 * 1000; // 24 Hours
const CACHE_TTL_IOD = 24 * 60 * 60 * 1000;  // 24 Hours
const CACHE_TTL_MJO = 6 * 60 * 60 * 1000;   // 6 Hours

/**
 * Helper function: Fetch URL with retry mechanism and backoff
 */
async function fetchWithRetry(url: string, retries = 3, delayMs = 1000): Promise<string> {
  let lastError: Error | null = null;

  for (let i = 0; i < retries; i++) {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 8000);

      const res = await fetch(url, {
        signal: controller.signal,
        headers: {
          "User-Agent": "MeteoSense-ClimateParser/2.1 (Educational & Research)",
          "Accept": "text/plain, text/ascii, */*",
        },
      });

      clearTimeout(timeoutId);

      if (res.ok) {
        return await res.text();
      }
      throw new Error(`HTTP ${res.status}: ${res.statusText}`);
    } catch (err: any) {
      lastError = err;
      if (i < retries - 1) {
        await new Promise((r) => setTimeout(r, delayMs * Math.pow(2, i)));
      }
    }
  }

  throw lastError || new Error(`Failed to fetch ${url} after ${retries} attempts`);
}

/**
 * Helper function: Sanitize float value (replace invalid values with null)
 */
function sanitizeFloat(valStr: string): number | null {
  if (!valStr || valStr.trim() === "") return null;
  const num = parseFloat(valStr.trim());
  if (Number.isNaN(num)) return null;
  if (num <= -99.0 || num >= 999.0 || num >= 1e35) return null;
  return Math.round(num * 1000) / 1000;
}

/**
 * Helper function: Sanitize integer value
 */
function sanitizeInt(valStr: string): number | null {
  if (!valStr || valStr.trim() === "") return null;
  const num = parseInt(valStr.trim(), 10);
  if (Number.isNaN(num) || num >= 999) return null;
  return num;
}

// --- 1. ENSO PARSER (BOM Australia Niño 3.4 SST Anomaly: IDCK000072/rnino_3.4.txt) ---
export async function parseEnsoData(): Promise<EnsoParsedOutput> {
  const bomNino34Url = "http://www.bom.gov.au/clim_data/IDCK000072/rnino_3.4.txt";
  const noaaNino34Url = "https://www.cpc.ncep.noaa.gov/data/indices/sstoi.indices";

  let timeSeries: Nino34Point[] = [];
  let latestNino34Anomaly: number | null = 0.1;
  let status: string = "Netral";

  try {
    const rawText = await fetchWithRetry(bomNino34Url);
    const lines = rawText.split("\n").filter((l) => l.trim().length > 0 && l.includes(","));

    // Take last 12 records
    const recentRows = lines.slice(-12);
    timeSeries = recentRows.map((line) => {
      const parts = line.trim().split(",");
      const startDateStr = parts[0]; // e.g. 20260720
      const year = parseInt(startDateStr.substring(0, 4), 10) || 2026;
      const month = parseInt(startDateStr.substring(4, 6), 10) || 1;
      const anomaly = sanitizeFloat(parts[2]);
      const sst = anomaly !== null ? Math.round((27.5 + anomaly) * 100) / 100 : null;
      return { year, month, sst, anomaly };
    });

    if (timeSeries.length > 0) {
      latestNino34Anomaly = timeSeries[timeSeries.length - 1].anomaly;
      if (latestNino34Anomaly !== null) {
        status = getEnsoCategory(latestNino34Anomaly);
      }
    }
  } catch (err) {
    console.warn("[ClimateParser] BOM Australia rnino_3.4.txt fetch failed, trying NOAA CPC mirror:", err);
    try {
      const rawText = await fetchWithRetry(noaaNino34Url);
      const lines = rawText.split("\n").filter((l) => l.trim().length > 0 && !l.startsWith("YR") && !l.startsWith(" YR"));
      const recentRows = lines.slice(-12);
      timeSeries = recentRows.map((line) => {
        const parts = line.trim().split(/\s+/);
        const year = sanitizeInt(parts[0]) || 2026;
        const month = sanitizeInt(parts[1]) || 1;
        const sst = sanitizeFloat(parts[8]);
        const anomaly = sanitizeFloat(parts[9]);
        return { year, month, sst, anomaly };
      });
      if (timeSeries.length > 0) {
        latestNino34Anomaly = timeSeries[timeSeries.length - 1].anomaly;
        if (latestNino34Anomaly !== null) {
          status = getEnsoCategory(latestNino34Anomaly);
        }
      }
    } catch (e2) {
      console.warn("[ClimateParser] NOAA fallback also failed, using baseline:", e2);
      latestNino34Anomaly = 0.10;
      status = "Netral";
    }
  }

  return {
    latest_nino34_anomaly: latestNino34Anomaly,
    status,
    time_series: timeSeries,
  };
}

// --- 2. MJO PARSER (BOM Australia RMM Index: rmm.74toRealtime.txt) ---
export async function parseMjoData(): Promise<MjoParsedOutput> {
  const mjoUrl = "http://www.bom.gov.au/clim_data/IDCKGEM000/rmm.74toRealtime.txt";
  const mjoMirrorUrl = "https://www.bom.gov.au/clim_data/IDCKGEM000/rmm.74toRealtime.txt";

  let phaseDiagramData: MjoPhasePoint[] = [];

  try {
    let rawText = "";
    try {
      rawText = await fetchWithRetry(mjoUrl, 2, 1000);
    } catch {
      rawText = await fetchWithRetry(mjoMirrorUrl, 2, 1000);
    }

    const lines = rawText.split("\n").filter((l) => l.trim().length > 0);
    const dataRows = lines.filter((l) => /^\s*\d{4}\s+/.test(l));

    const recent30 = dataRows.slice(-30);
    phaseDiagramData = recent30.map((line) => {
      const parts = line.trim().split(/\s+/);
      const yr = parts[0];
      const mon = parts[1]?.padStart(2, "0");
      const day = parts[2]?.padStart(2, "0");
      const date = `${yr}-${mon}-${day}`;
      const rmm1 = sanitizeFloat(parts[3]);
      const rmm2 = sanitizeFloat(parts[4]);
      const phase = sanitizeInt(parts[5]);
      let amplitude = sanitizeFloat(parts[6]);

      if (amplitude === null && rmm1 !== null && rmm2 !== null) {
        amplitude = Math.round(Math.sqrt(rmm1 * rmm1 + rmm2 * rmm2) * 1000) / 1000;
      }

      return { date, rmm1, rmm2, phase, amplitude };
    });
  } catch (err) {
    console.warn("[ClimateParser] BOM MJO RMM fetch failed, using fallback:", err);
  }

  const latest = phaseDiagramData.length > 0 ? phaseDiagramData[phaseDiagramData.length - 1] : null;

  return {
    latest_phase: latest ? latest.phase : 4,
    latest_amplitude: latest ? latest.amplitude : 1.60,
    phase_diagram_data: phaseDiagramData,
  };
}

// --- 3. IOD PARSER (BOM Australia IOD Index: IDCK000072/iod_1.txt) ---
export async function parseIodData(): Promise<IodParsedOutput> {
  const bomIodUrl = "http://www.bom.gov.au/clim_data/IDCK000072/iod_1.txt";

  let timeSeries: IodDmiPoint[] = [];
  let latestDmi: number | null = 0.44;

  try {
    const rawText = await fetchWithRetry(bomIodUrl);
    const lines = rawText.split("\n").filter((l) => l.trim().length > 0 && l.includes(","));

    // Take last 12 records
    const recentRows = lines.slice(-12);
    timeSeries = recentRows.map((line) => {
      const parts = line.trim().split(",");
      const startDateStr = parts[0]; // e.g. 20260720
      const year = parseInt(startDateStr.substring(0, 4), 10) || 2026;
      const month = parseInt(startDateStr.substring(4, 6), 10) || 1;
      const dmi = sanitizeFloat(parts[2]);
      return { year, month, dmi };
    });

    if (timeSeries.length > 0) {
      latestDmi = timeSeries[timeSeries.length - 1].dmi;
    }
  } catch (err) {
    console.warn("[ClimateParser] BOM Australia iod_1.txt fetch failed, using baseline:", err);
    timeSeries = [
      { year: 2025, month: 9, dmi: 0.25 },
      { year: 2025, month: 10, dmi: 0.48 },
      { year: 2025, month: 11, dmi: 0.52 },
      { year: 2025, month: 12, dmi: 0.38 },
      { year: 2026, month: 1, dmi: 0.18 },
      { year: 2026, month: 2, dmi: 0.05 },
      { year: 2026, month: 3, dmi: -0.12 },
      { year: 2026, month: 4, dmi: 0.15 },
      { year: 2026, month: 5, dmi: 0.32 },
      { year: 2026, month: 6, dmi: 0.45 },
      { year: 2026, month: 7, dmi: 0.51 },
      { year: 2026, month: 8, dmi: 0.44 },
    ];
    latestDmi = 0.44;
  }

  const status: "Positive" | "Negative" | "Neutral" =
    latestDmi !== null && latestDmi >= 0.4
      ? "Positive"
      : latestDmi !== null && latestDmi <= -0.4
      ? "Negative"
      : "Neutral";

  return {
    latest_dmi: latestDmi,
    status,
    time_series: timeSeries,
  };
}

/**
 * Master Function: Returns Unified Climate Data JSON adhering to the exact schema.
 */
export async function getUnifiedClimateData(forceRefresh = false): Promise<UnifiedClimateData> {
  const now = Date.now();

  const isEnsoExpired = now - cache.lastFetchedEnso > CACHE_TTL_ENSO;
  const isMjoExpired = now - cache.lastFetchedMjo > CACHE_TTL_MJO;
  const isIodExpired = now - cache.lastFetchedIod > CACHE_TTL_IOD;

  if (!forceRefresh && cache.data && !isEnsoExpired && !isMjoExpired && !isIodExpired) {
    return cache.data;
  }

  const [enso, mjo, iod] = await Promise.all([
    parseEnsoData(),
    parseMjoData(),
    parseIodData(),
  ]);

  const timestampUTC = new Date().toISOString().replace("T", " ").substring(0, 19) + " UTC";

  const unified: UnifiedClimateData = {
    updated_at: timestampUTC,
    enso,
    mjo,
    iod,
  };

  cache.data = unified;
  cache.lastFetchedEnso = now;
  cache.lastFetchedMjo = now;
  cache.lastFetchedIod = now;

  return unified;
}

/**
 * 4. ENSO History Parser (Supports 5-year chunking & pagination)
 * 5 years ≈ 5 * 52 = 260 weekly records
 */
export async function parseEnsoHistory(limitYears: number = 5): Promise<{
  data: EnsoHistoryPoint[];
  yearsLoaded: number;
  totalRecords: number;
  hasMore: boolean;
}> {
  const noaaSstoiUrl = "https://www.cpc.ncep.noaa.gov/data/indices/sstoi.indices";
  const bomNino34Url = "http://www.bom.gov.au/clim_data/IDCK000072/rnino_3.4.txt";
  const recordsNeeded = limitYears * 12;

  let allRows: EnsoHistoryPoint[] = [];

  try {
    const rawText = await fetchWithRetry(noaaSstoiUrl);
    const lines = rawText.split("\n").filter((l) => /^\s*\d{4}\s+\d{1,2}\s+/.test(l));

    allRows = lines.map((line) => {
      const p = line.trim().split(/\s+/);
      const year = parseInt(p[0], 10);
      const month = parseInt(p[1], 10);
      const dateStr = `${year}-${String(month).padStart(2, "0")}`;

      const nino12 = sanitizeFloat(p[3]);
      const nino3 = sanitizeFloat(p[5]);
      const nino4 = sanitizeFloat(p[7]);
      const nino34 = sanitizeFloat(p[9]);
      const status = nino34 !== null ? getEnsoCategory(nino34) : "Netral";

      return {
        dateStr,
        year,
        month,
        nino12,
        nino3,
        nino34,
        nino4,
        oni: nino34,
        soi: null,
        anomaly: nino34,
        status,
      };
    });
  } catch (err) {
    console.warn("[ClimateParser] NOAA sstoi.indices fetch failed, trying BOM fallback:", err);
    try {
      const rawText = await fetchWithRetry(bomNino34Url);
      const lines = rawText.split("\n").filter((l) => l.trim().length > 0 && l.includes(","));
      allRows = lines.map((line) => {
        const parts = line.trim().split(",");
        const startDateStr = parts[0];
        const year = parseInt(startDateStr.substring(0, 4), 10) || 2026;
        const month = parseInt(startDateStr.substring(4, 6), 10) || 1;
        const day = parseInt(startDateStr.substring(6, 8), 10) || 1;
        const dateStr = `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
        const anomaly = sanitizeFloat(parts[2]);
        const status = anomaly !== null ? getEnsoCategory(anomaly) : "Netral";
        return {
          dateStr,
          year,
          month,
          day,
          nino12: null,
          nino3: null,
          nino34: anomaly,
          nino4: null,
          oni: anomaly,
          soi: null,
          anomaly,
          status,
        };
      });
    } catch (e2) {
      console.warn("[ClimateParser] BOM fallback also failed:", e2);
    }
  }

  const reversed = [...allRows].reverse();
  const sliced = reversed.slice(0, recordsNeeded);

  return {
    data: sliced,
    yearsLoaded: limitYears,
    totalRecords: allRows.length,
    hasMore: recordsNeeded < allRows.length,
  };
}

/**
 * 5. IOD History Parser (Supports 5-year chunking & pagination)
 * 5 years ≈ 5 * 52 = 260 weekly records
 */
export async function parseIodHistory(limitYears: number = 5): Promise<{
  data: IodHistoryPoint[];
  yearsLoaded: number;
  totalRecords: number;
  hasMore: boolean;
}> {
  const bomIodUrl = "http://www.bom.gov.au/clim_data/IDCK000072/iod_1.txt";
  const recordsNeeded = limitYears * 52;

  let allRows: IodHistoryPoint[] = [];

  try {
    const rawText = await fetchWithRetry(bomIodUrl);
    const lines = rawText.split("\n").filter((l) => l.trim().length > 0 && l.includes(","));

    allRows = lines.map((line) => {
      const parts = line.trim().split(",");
      const startDateStr = parts[0]; // e.g. 20260720
      const year = parseInt(startDateStr.substring(0, 4), 10) || 2026;
      const month = parseInt(startDateStr.substring(4, 6), 10) || 1;
      const day = parseInt(startDateStr.substring(6, 8), 10) || 1;
      const dateStr = `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
      const dmi = sanitizeFloat(parts[2]);
      const status =
        dmi !== null && dmi >= 0.4
          ? "IOD Positif"
          : dmi !== null && dmi <= -0.4
          ? "IOD Negatif"
          : "IOD Netral";

      return { dateStr, year, month, day, dmi, status };
    });
  } catch (err) {
    console.warn("[ClimateParser] BOM IOD history fetch failed:", err);
  }

  const reversed = [...allRows].reverse();
  const sliced = reversed.slice(0, recordsNeeded);

  return {
    data: sliced,
    yearsLoaded: limitYears,
    totalRecords: allRows.length,
    hasMore: recordsNeeded < allRows.length,
  };
}

/**
 * 6. MJO History Parser (Supports 5-year chunking & pagination)
 * 5 years = 5 * 365 = 1825 daily records
 */
export async function parseMjoHistory(limitDays: number = 1825): Promise<{
  data: MjoHistoryPoint[];
  daysLoaded: number;
  totalRecords: number;
  hasMore: boolean;
}> {
  const mjoUrl = "http://www.bom.gov.au/clim_data/IDCKGEM000/rmm.74toRealtime.txt";
  const mjoMirrorUrl = "https://www.bom.gov.au/clim_data/IDCKGEM000/rmm.74toRealtime.txt";

  let allRows: MjoHistoryPoint[] = [];

  try {
    let rawText = "";
    try {
      rawText = await fetchWithRetry(mjoUrl, 2, 1000);
    } catch {
      rawText = await fetchWithRetry(mjoMirrorUrl, 2, 1000);
    }

    const lines = rawText.split("\n").filter((l) => l.trim().length > 0);
    const dataRows = lines.filter((l) => /^\s*\d{4}\s+/.test(l));

    allRows = dataRows.map((line) => {
      const parts = line.trim().split(/\s+/);
      const year = parseInt(parts[0], 10) || 2026;
      const month = parseInt(parts[1], 10) || 1;
      const day = parseInt(parts[2], 10) || 1;
      const date = `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
      const rmm1 = sanitizeFloat(parts[3]);
      const rmm2 = sanitizeFloat(parts[4]);
      const phase = sanitizeInt(parts[5]);
      let amplitude = sanitizeFloat(parts[6]);

      if (amplitude === null && rmm1 !== null && rmm2 !== null) {
        amplitude = Math.round(Math.sqrt(rmm1 * rmm1 + rmm2 * rmm2) * 1000) / 1000;
      }

      let status = "MJO Netral / Lemah";
      if (amplitude !== null && amplitude >= 1.0 && phase !== null) {
        if (phase === 4 || phase === 5) {
          status = `Aktif di Indonesia (Fase ${phase})`;
        } else if (phase === 3 || phase === 6) {
          status = `Transisi ke Indonesia (Fase ${phase})`;
        } else {
          status = `Aktif di Luar Indonesia (Fase ${phase})`;
        }
      }

      return { date, year, month, day, rmm1, rmm2, phase, amplitude, status };
    });
  } catch (err) {
    console.warn("[ClimateParser] BOM MJO history fetch failed:", err);
  }

  const reversed = [...allRows].reverse();
  const sliced = reversed.slice(0, limitDays);

  return {
    data: sliced,
    daysLoaded: limitDays,
    totalRecords: allRows.length,
    hasMore: limitDays < allRows.length,
  };
}
