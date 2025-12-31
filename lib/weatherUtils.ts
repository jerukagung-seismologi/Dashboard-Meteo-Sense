import { SensorDate } from "@/lib/FetchingSensorData";

// --- TYPES ---
export type WeatherRecord = {
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

type HourlyRecord = {
  hourKey: string;
  dateKey: string;
  sampleCount: number;
  temperatureAvg: number;
  humidityAvg: number;
  pressureAvg: number;
  dewPointAvg: number;
  rainfallTot: number;
};

// --- FORMATTERS ---

// Format "dd MMMM yyyy" (id-ID)
const ID_DATE_FMT = new Intl.DateTimeFormat("id-ID", {
  timeZone: "Asia/Jakarta",
  day: "2-digit", month: "long", year: "numeric",
});

// Format "dd MMMM" (id-ID)
const ID_DATE_SHORT_FMT = new Intl.DateTimeFormat("id-ID", {
  timeZone: "Asia/Jakarta",
  day: "2-digit", month: "long",
});

// Format "YYYY-MM-DD"
const FMT_YMD = new Intl.DateTimeFormat("en-CA", {
  timeZone: "Asia/Jakarta",
  year: "numeric", month: "2-digit", day: "2-digit",
});

// Format Jam "HH"
const FMT_HOUR = new Intl.DateTimeFormat("id-ID", {
  timeZone: "Asia/Jakarta",
  hour: "2-digit", hour12: false,
});

export const formatIdDateDash = (input: string | Date): string => {
  const d = typeof input === "string" ? new Date(input) : input;
  return d && !isNaN(d.getTime()) ? ID_DATE_FMT.format(d) : "";
};

export const formatIdDateShort = (input: string | Date): string => {
  const d = typeof input === "string" ? new Date(input) : input;
  return d && !isNaN(d.getTime()) ? ID_DATE_SHORT_FMT.format(d) : "";
};

export const formatYMD = (d: Date) => FMT_YMD.format(d);

export const toDDMMYYYY = (d: Date) => {
  const dd = String(d.getDate()).padStart(2, "0");
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const yyyy = d.getFullYear();
  return `${dd}-${mm}-${yyyy}`;
};

export const formatDateTimeForDisplay = (date: Date): string => {
  return new Intl.DateTimeFormat("id-ID", {
    timeZone: "Asia/Jakarta",
    day: "2-digit", month: "short", year: "numeric",
    hour: "2-digit", minute: "2-digit"
  }).format(date);
};

// --- AGGREGATION LOGIC ---

function aggregateHourly(rows: SensorDate[]): HourlyRecord[] {
  const byHour = new Map<string, SensorDate[]>();
  for (const r of rows) {
    const d = new Date(r.timestamp);
    const dayKey = FMT_YMD.format(d);
    const hour = FMT_HOUR.format(d);
    const hourKey = `${dayKey}T${hour}`;
    if (!byHour.has(hourKey)) byHour.set(hourKey, []);
    byHour.get(hourKey)!.push(r);
  }

  const hours: HourlyRecord[] = [];
  for (const [hourKey, items] of byHour) {
    const n = items.length || 1;
    const sum = (ns: number[]) => ns.reduce((a, b) => a + (Number.isFinite(b) ? b : 0), 0);

    hours.push({
      hourKey,
      dateKey: hourKey.slice(0, 10),
      sampleCount: n,
      temperatureAvg: sum(items.map(i => i.temperature)) / n,
      humidityAvg: sum(items.map(i => i.humidity)) / n,
      pressureAvg: sum(items.map(i => i.pressure)) / n,
      dewPointAvg: sum(items.map(i => i.dew)) / n,
      rainfallTot: Math.max(...items.map(i => i.rainrate).filter(Number.isFinite), 0),
    });
  }
  return hours.sort((a, b) => a.hourKey.localeCompare(b.hourKey));
}

export function aggregateDaily(rows: SensorDate[]): WeatherRecord[] {
  const hourly = aggregateHourly(rows);
  const byDay = new Map<string, HourlyRecord[]>();
  
  for (const h of hourly) {
    if (!byDay.has(h.dateKey)) byDay.set(h.dateKey, []);
    byDay.get(h.dateKey)!.push(h);
  }

  const byDayRaw = new Map<string, SensorDate[]>();
  for (const r of rows) {
    const d = new Date(r.timestamp);
    const dayKey = FMT_YMD.format(d);
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

    result.push({
      date,
      sampleCount: totalSamples,
      temperatureAvg: wsum(i => i.temperatureAvg) / totalSamples,
      temperatureMin: temps.length ? Math.min(...temps) : 0,
      temperatureMax: temps.length ? Math.max(...temps) : 0,
      humidityAvg: wsum(i => i.humidityAvg) / totalSamples,
      humidityMin: humis.length ? Math.min(...humis) : 0,
      humidityMax: humis.length ? Math.max(...humis) : 0,
      pressureAvg: wsum(i => i.pressureAvg) / totalSamples,
      pressureMin: press.length ? Math.min(...press) : 0,
      pressureMax: press.length ? Math.max(...press) : 0,
      dewPointAvg: wsum(i => i.dewPointAvg) / totalSamples,
      windSpeedAvg: 0,
      rainfallTot: items.reduce((acc, it) => acc + it.rainfallTot, 0),
    });
  }
  return result.sort((a, b) => a.date.localeCompare(b.date));
}

/**
 * Aggregates sensor data by UTC day. This is useful for metrics like daily rainfall
 * that should be calculated from 00:00 to 23:59 UTC.
 * @param rows - An array of raw sensor data.
 * @returns An array of WeatherRecord objects, with each object representing one UTC day.
 */
export function aggregateDailyUTC(rows: SensorDate[]): WeatherRecord[] {
  const byDayUTC = new Map<string, SensorDate[]>();

  // Group data by UTC date string (YYYY-MM-DD)
  for (const r of rows) {
    const d = new Date(r.timestamp);
    const year = d.getUTCFullYear();
    const month = String(d.getUTCMonth() + 1).padStart(2, '0');
    const day = String(d.getUTCDate()).padStart(2, '0');
    const dateKey = `${year}-${month}-${day}`;

    if (!byDayUTC.has(dateKey)) {
      byDayUTC.set(dateKey, []);
    }
    byDayUTC.get(dateKey)!.push(r);
  }

  const result: WeatherRecord[] = [];
  for (const [date, items] of byDayUTC) {
    // Correct logic for accumulated rainfall:
    // Find the difference between the max and min 'rainfall' values for the day,
    // as 'rainfall' is an accumulating counter.
    const rainfallValues = items.map(it => it.rainfall).filter(Number.isFinite);
    const rainfallTot = rainfallValues.length > 1
      ? Math.max(...rainfallValues) - Math.min(...rainfallValues)
      : 0;

    result.push({
      date,
      sampleCount: items.length,
      rainfallTot: rainfallTot,
      // Fill other fields with 0 as they are not calculated here
      temperatureAvg: 0,
      temperatureMin: 0,
      temperatureMax: 0,
      humidityAvg: 0,
      humidityMin: 0,
      humidityMax: 0,
      pressureAvg: 0,
      pressureMin: 0,
      pressureMax: 0,
      dewPointAvg: 0,
      windSpeedAvg: 0,
    });
  }
  return result.sort((a, b) => a.date.localeCompare(b.date));
}


// --- HELPER LOGIC ---

export function getDayAtSeven(dateStr: string): Date {
  try {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) throw new Error(`Format tanggal tidak valid`);
    return new Date(`${dateStr}T07:00:00+07:00`);
  } catch (e) {
    const today = new Date();
    today.setHours(7, 0, 0, 0);
    return today;
  }
}

// Hitung Statistik Periode (Avg, Min, Max untuk seluruh range)
export function calculatePeriodStats(dailyData: WeatherRecord[], rawData: SensorDate[]) {
  const sum = (ns: number[]) => ns.reduce((a, b) => a + b, 0);
  const round = (n: number, d = 2) => +n.toFixed(d);

  const temps = dailyData.map(w => w.temperatureAvg);
  const humi = dailyData.map(w => w.humidityAvg);
  const pres = dailyData.map(w => w.pressureAvg);
  const rains = dailyData.map(w => w.rainfallTot);

  const rawTemps = rawData.map(r => r.temperature).filter(Number.isFinite);
  const rawHumi = rawData.map(r => r.humidity).filter(Number.isFinite);
  const rawPres = rawData.map(r => r.pressure).filter(Number.isFinite);

  return {
    avgTemp: temps.length ? round(sum(temps) / temps.length) : 0,
    minTemp: rawTemps.length ? Math.min(...rawTemps) : 0,
    maxTemp: rawTemps.length ? Math.max(...rawTemps) : 0,
    
    avgHum: humi.length ? round(sum(humi) / humi.length) : 0,
    minHum: rawHumi.length ? Math.min(...rawHumi) : 0,
    maxHum: rawHumi.length ? Math.max(...rawHumi) : 0,

    avgPres: pres.length ? round(sum(pres) / pres.length) : 0,
    minPres: rawPres.length ? Math.min(...rawPres) : 0,
    maxPres: rawPres.length ? Math.max(...rawPres) : 0,

    totalRain: rains.length ? round(sum(rains)) : 0,
    avgRain: rains.length ? round(sum(rains) / rains.length) : 0,
    rainyDays: rains.filter(r => r > 0).length,
    dryDays: rains.filter(r => r === 0).length,
  };
}