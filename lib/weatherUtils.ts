import { SensorDate } from "@/lib/FetchingSensorData";

// --- TYPES ---
export type WeatherRecord = {
  date: string; // YYYY-MM-DD
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
  luxAvg?: number;
  luxMin?: number;
  luxMax?: number;
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
  luxAvg: number;
};

// --- FORMATTERS ---

// Format "dd MMMM yyyy" (id-ID)
const ID_DATE_FMT = new Intl.DateTimeFormat("id-ID", {
  timeZone: "Asia/Jakarta",
  day: "2-digit", 
  month: "long", 
  year: "numeric",
});

// Format "dd MMMM" (id-ID)
const ID_DATE_SHORT_FMT = new Intl.DateTimeFormat("id-ID", {
  timeZone: "Asia/Jakarta",
  day: "2-digit", 
  month: "long",
});

// Format "YYYY-MM-DD"
const FMT_YMD = new Intl.DateTimeFormat("en-CA", {
  timeZone: "Asia/Jakarta",
  year: "numeric", 
  month: "2-digit", 
  day: "2-digit",
});

// Format Jam "HH"
const FMT_HOUR = new Intl.DateTimeFormat("id-ID", {
  timeZone: "Asia/Jakarta",
  hour: "2-digit", 
  hour12: false,
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
      luxAvg: sum(items.map(i => i.lux ?? 0)) / n,
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
    const luxes = rawData.map(r => r.lux ?? 0).filter(Number.isFinite);
    
    // Get the last record of the day to get the final rainfall value.
    const lastRecordOfDay = rawData.length > 0 ? rawData[rawData.length - 1] : null;

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
      luxAvg: wsum(i => i.luxAvg) / totalSamples,
      luxMin: luxes.length ? Math.min(...luxes) : 0,
      luxMax: luxes.length ? Math.max(...luxes) : 0,
      rainfallTot: lastRecordOfDay ? lastRecordOfDay.rainfall : 0,
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
  const luxes = dailyData.map(w => w.luxAvg ?? 0);

  const rawTemps = rawData.map(r => r.temperature).filter(Number.isFinite);
  const rawHumi = rawData.map(r => r.humidity).filter(Number.isFinite);
  const rawPres = rawData.map(r => r.pressure).filter(Number.isFinite);
  const rawLuxes = rawData.map(r => r.lux ?? 0).filter(Number.isFinite);

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

    avgLux: luxes.length ? round(sum(luxes) / luxes.length) : 0,
    minLux: rawLuxes.length ? Math.min(...rawLuxes) : 0,
    maxLux: rawLuxes.length ? Math.max(...rawLuxes) : 0,

    totalRain: rains.length ? round(sum(rains)) : 0,
    avgRain: rains.length ? round(sum(rains) / rains.length) : 0,
    rainyDays: rains.filter(r => r > 0).length,
    dryDays: rains.filter(r => r === 0).length,
  };
}

// Split records into 7-day chunks (weeks)
export type WeeklySummary = {
  weekName: string;
  maxTemp: number;
  maxTempDate: string;
  minTemp: number;
  minTempDate: string;
};

export function splitIntoWeeks(records: WeatherRecord[]): WeeklySummary[] {
  const weeks: WeeklySummary[] = [];
  let currentWeekNum = 1;
  let chunk: WeatherRecord[] = [];

  for (let i = 0; i < records.length; i++) {
    chunk.push(records[i]);
    if (chunk.length === 7 || i === records.length - 1) {
      const maxTempObj = chunk.reduce((prev, curr) => (curr.temperatureMax > prev.temperatureMax ? curr : prev), chunk[0]);
      const minTempObj = chunk.reduce((prev, curr) => (curr.temperatureMin < prev.temperatureMin ? curr : prev), chunk[0]);
      weeks.push({
        weekName: `Week ${currentWeekNum}`,
        maxTemp: maxTempObj?.temperatureMax ?? 0,
        maxTempDate: maxTempObj?.date ?? "",
        minTemp: minTempObj?.temperatureMin ?? 0,
        minTempDate: minTempObj?.date ?? "",
      });
      chunk = [];
      currentWeekNum++;
    }
  }
  return weeks;
}

// Find Weather Extremes
export type WeatherExtremes = {
  hottestDay: { value: number; date: string; timestamp?: number };
  coldestDay: { value: number; date: string; timestamp?: number };
  wettestDay: { value: number; date: string };
  mostHumidDay: { value: number; date: string; timestamp?: number };
  lowestPressureEvent: { value: number; date: string; timestamp?: number };
  highestRadiationDay: { value: number; date: string };
};

export function findWeatherExtremes(dailyData: WeatherRecord[], rawData: SensorDate[]): WeatherExtremes {
  if (dailyData.length === 0) {
    return {
      hottestDay: { value: 0, date: "" },
      coldestDay: { value: 0, date: "" },
      wettestDay: { value: 0, date: "" },
      mostHumidDay: { value: 0, date: "" },
      lowestPressureEvent: { value: 0, date: "" },
      highestRadiationDay: { value: 0, date: "" },
    };
  }

  const getExtremeRaw = (picker: (r: SensorDate) => number, isMax: boolean) => {
    if (rawData.length === 0) return { value: 0, date: "" };
    let extreme = rawData[0];
    let extVal = picker(extreme);
    for (const r of rawData) {
      const v = picker(r);
      if (Number.isFinite(v)) {
        if ((isMax && v > extVal) || (!isMax && v < extVal)) {
          extVal = v;
          extreme = r;
        }
      }
    }
    return { value: extVal, date: formatIdDateDash(new Date(extreme.timestamp)), timestamp: extreme.timestamp };
  };

  const getExtremeDaily = (picker: (d: WeatherRecord) => number, isMax: boolean) => {
    let extreme = dailyData[0];
    let extVal = picker(extreme);
    for (const d of dailyData) {
      const v = picker(d);
      if (Number.isFinite(v)) {
        if ((isMax && v > extVal) || (!isMax && v < extVal)) {
          extVal = v;
          extreme = d;
        }
      }
    }
    return { value: extVal, date: formatIdDateDash(extreme.date) };
  };

  return {
    hottestDay: getExtremeRaw(r => r.temperature, true),
    coldestDay: getExtremeRaw(r => r.temperature, false),
    wettestDay: getExtremeDaily(d => d.rainfallTot, true),
    mostHumidDay: getExtremeRaw(r => r.humidity, true),
    lowestPressureEvent: getExtremeRaw(r => r.pressure, false),
    highestRadiationDay: getExtremeDaily(d => d.luxMax ?? 0, true),
  };
}

// Data Quality Calculation
export function calculateDataQuality(rawData: SensorDate[], dateRangeDays: number, expectedIntervalMins = 10) {
  const recordsPerDay = (24 * 60) / expectedIntervalMins;
  const expectedTotal = recordsPerDay * Math.max(1, dateRangeDays);
  const actualTotal = rawData.length;
  
  // Calculate longest gap
  let longestGapMs = 0;
  for (let i = 1; i < rawData.length; i++) {
    const gap = rawData[i].timestamp - rawData[i - 1].timestamp;
    if (gap > longestGapMs) {
      longestGapMs = gap;
    }
  }
  
  const longestGapMins = Math.floor(longestGapMs / (60 * 1000));
  const missingRecords = Math.max(0, expectedTotal - actualTotal);
  const availabilityPercent = Math.min(100, (actualTotal / expectedTotal) * 100);

  return {
    actualTotal,
    expectedTotal,
    missingRecords,
    availabilityPercent,
    longestGapMins,
  };
}

// Export CSV
export function exportToCSV(weatherData: WeatherRecord[], sensorName: string) {
  if (weatherData.length === 0) return;

  const headers = [
    "Tanggal", 
    "Suhu Rata-rata (°C)", "Suhu Min (°C)", "Suhu Max (°C)",
    "Kelembapan Rata-rata (%)", "Kelembapan Min (%)", "Kelembapan Max (%)",
    "Tekanan Rata-rata (hPa)", "Tekanan Min (hPa)", "Tekanan Max (hPa)",
    "Curah Hujan (mm)", "Radiasi/Lux Rata-rata"
  ];

  const rows = weatherData.map(r => [
    r.date,
    r.temperatureAvg.toFixed(2), r.temperatureMin.toFixed(2), r.temperatureMax.toFixed(2),
    r.humidityAvg.toFixed(2), r.humidityMin.toFixed(2), r.humidityMax.toFixed(2),
    r.pressureAvg.toFixed(2), r.pressureMin.toFixed(2), r.pressureMax.toFixed(2),
    r.rainfallTot.toFixed(2), (r.luxAvg ?? 0).toFixed(2)
  ]);

  const csvContent = [
    headers.join(","),
    ...rows.map(e => e.join(","))
  ].join("\n");

  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.setAttribute("href", url);
  link.setAttribute("download", `Laporan_${sensorName.replace(/\s+/g, '_')}_${new Date().toISOString().split('T')[0]}.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

// Format "YYYY-MM-DD" in UTC
const FMT_YMD_UTC = new Intl.DateTimeFormat("en-CA", {
  timeZone: "UTC",
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
});

// Format Jam "HH" in UTC
const FMT_HOUR_UTC = new Intl.DateTimeFormat("id-ID", {
  timeZone: "UTC",
  hour: "2-digit",
  hour12: false,
});

function aggregateHourlyUTC(rows: SensorDate[]): HourlyRecord[] {
  const byHour = new Map<string, SensorDate[]>();
  for (const r of rows) {
    const d = new Date(r.timestamp);
    const dayKey = FMT_YMD_UTC.format(d);
    const hour = FMT_HOUR_UTC.format(d);
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
      luxAvg: sum(items.map(i => i.lux ?? 0)) / n,
      rainfallTot: Math.max(...items.map(i => i.rainrate).filter(Number.isFinite), 0),
    });
  }
  return hours.sort((a, b) => a.hourKey.localeCompare(b.hourKey));
}

export function aggregateDailyUTC(rows: SensorDate[]): WeatherRecord[] {
  const hourly = aggregateHourlyUTC(rows);
  const byDay = new Map<string, HourlyRecord[]>();

  for (const h of hourly) {
    if (!byDay.has(h.dateKey)) byDay.set(h.dateKey, []);
    byDay.get(h.dateKey)!.push(h);
  }

  const byDayRaw = new Map<string, SensorDate[]>();
  for (const r of rows) {
    const d = new Date(r.timestamp);
    const dayKey = FMT_YMD_UTC.format(d);
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
    const luxes = rawData.map(r => r.lux ?? 0).filter(Number.isFinite);

    const lastRecordOfDay = rawData.length > 0 ? rawData[rawData.length - 1] : null;

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
      luxAvg: wsum(i => i.luxAvg) / totalSamples,
      luxMin: luxes.length ? Math.min(...luxes) : 0,
      luxMax: luxes.length ? Math.max(...luxes) : 0,
      rainfallTot: lastRecordOfDay ? lastRecordOfDay.rainfall : 0,
    });
  }
  return result.sort((a, b) => a.date.localeCompare(b.date));
}