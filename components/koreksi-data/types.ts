import type React from "react";
import { format } from "date-fns";
import { id as localeId } from "date-fns/locale";
import {
  Flame,
  Droplets,
  Gauge,
  CloudRain,
  Sun,
  Activity,
  Zap,
  Wind,
} from "lucide-react";
import { SensorDate } from "@/lib/FetchingSensorData";

export interface WeatherVarMeta {
  key: string;
  label: string;
  unit: string;
  icon: React.ElementType;
  wmoMin: number;
  wmoMax: number;
  step: number;
  spikeThreshold: number; // Max realistic change between consecutive timestamps (5-min interval)
  decimals: number;
}

export const WEATHER_VARIABLES: WeatherVarMeta[] = [
  {
    key: "temperature",
    label: "Suhu Udara",
    unit: "°C",
    icon: Flame,
    wmoMin: 15.0,
    wmoMax: 45.0,
    step: 0.1,
    spikeThreshold: 3.5,
    decimals: 2,
  },
  {
    key: "humidity",
    label: "Kelembapan Relatif (RH)",
    unit: "%",
    icon: Droplets,
    wmoMin: 0.0,
    wmoMax: 100.0,
    step: 0.5,
    spikeThreshold: 20.0,
    decimals: 1,
  },
  {
    key: "pressure",
    label: "Tekanan Udara",
    unit: "hPa",
    icon: Gauge,
    wmoMin: 850.0,
    wmoMax: 1080.0,
    step: 0.5,
    spikeThreshold: 4.0,
    decimals: 2,
  },
  {
    key: "dew",
    label: "Titik Embun",
    unit: "°C",
    icon: Droplets,
    wmoMin: 10.0,
    wmoMax: 35.0,
    step: 0.1,
    spikeThreshold: 4.0,
    decimals: 2,
  },
  {
    key: "rainfall",
    label: "Curah Hujan",
    unit: "mm",
    icon: CloudRain,
    wmoMin: 0.0,
    wmoMax: 120.0,
    step: 0.2,
    spikeThreshold: 40.0,
    decimals: 2,
  },
  {
    key: "rainrate",
    label: "Laju Hujan",
    unit: "mm/jam",
    icon: CloudRain,
    wmoMin: 0.0,
    wmoMax: 300.0,
    step: 1.0,
    spikeThreshold: 150.0,
    decimals: 2,
  },
  {
    key: "lux",
    label: "Intensitas Radiasi / Lux",
    unit: "lux",
    icon: Sun,
    wmoMin: 0.0,
    wmoMax: 150000.0,
    step: 50.0,
    spikeThreshold: 80000.0,
    decimals: 0,
  },
  {
    key: "soil_temp",
    label: "Suhu Tanah",
    unit: "°C",
    icon: Activity,
    wmoMin: 15.0,
    wmoMax: 45.0,
    step: 0.1,
    spikeThreshold: 3.0,
    decimals: 2,
  },
  {
    key: "volt",
    label: "Tegangan Baterai / Catu Daya",
    unit: "V",
    icon: Zap,
    wmoMin: 2.5,
    wmoMax: 15.0,
    step: 0.05,
    spikeThreshold: 2.0,
    decimals: 2,
  },
  {
    key: "windSpeed",
    label: "Kecepatan Angin",
    unit: "m/s",
    icon: Wind,
    wmoMin: 0.0,
    wmoMax: 50.0,
    step: 0.2,
    spikeThreshold: 15.0,
    decimals: 2,
  },
];

export type CorrectionMethod = "offset" | "drift" | "clamp" | "scale" | "interpolate";
export type InterpolationSubMethod = "solar_cosine_hermite" | "model_guided" | "cubic_pchip" | "akima" | "time_linear";

export interface AnomalyFlag {
  index: number;
  timestamp: number;
  value: number;
  type: "wmo_boundary" | "spike_jump" | "flatline" | "solar_overheating";
  reason: string;
}

export interface LoadedDataContext {
  sensorId: string;
  startDateStr: string;
  startTimeStr: string;
  endDateStr: string;
  endTimeStr: string;
  startMs: number;
  endMs: number;
}

export interface CorrectedRecord {
  record: SensorDate;
  timestamp: number;
  rawVal: number | null;
  correctedVal: number | null;
  diff: number | null;
  isModified: boolean;
  anomalyFlag?: AnomalyFlag;
  recoveredRhVal?: number | null;
  rawRhVal?: number | null;
  diffRh?: number | null;
  isRhModified?: boolean;
}

export const WIB_TZ_OFFSET_MS = 7 * 3600 * 1000;
export const MONTH_SHORT_ID = ["Jan", "Feb", "Mar", "Apr", "Mei", "Jun", "Jul", "Agu", "Sep", "Okt", "Nov", "Des"];

export function parseWibEpochMs(dateStr: string, timeStr: string, secondsStr: string = "00"): number {
  return new Date(`${dateStr}T${timeStr}:${secondsStr}+07:00`).getTime();
}

export function formatWibYmd(ms: number): string {
  const wib = new Date(ms + WIB_TZ_OFFSET_MS);
  const yyyy = wib.getUTCFullYear();
  const mm = String(wib.getUTCMonth() + 1).padStart(2, "0");
  const dd = String(wib.getUTCDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

export function getTodayWibDateStr(): string {
  return formatWibYmd(Date.now());
}

export function shiftWibDateStr(dateStr: string, deltaDays: number): string {
  const baseMs = new Date(`${dateStr}T00:00:00+07:00`).getTime();
  return formatWibYmd(baseMs + deltaDays * 86400000);
}

export function formatWibShortDateTime(ms: number): string {
  const wib = new Date(ms + WIB_TZ_OFFSET_MS);
  const dd = String(wib.getUTCDate()).padStart(2, "0");
  const mon = MONTH_SHORT_ID[wib.getUTCMonth()] || "";
  const hh = String(wib.getUTCHours()).padStart(2, "0");
  const mi = String(wib.getUTCMinutes()).padStart(2, "0");
  return `${dd} ${mon} ${hh}:${mi}`;
}

export function formatWibFullDisplayDate(dateStr: string): string {
  return format(new Date(`${dateStr}T12:00:00+07:00`), "EEEE, dd MMMM yyyy", { locale: localeId });
}

export function formatWibMediumDisplayDate(dateStr: string): string {
  return format(new Date(`${dateStr}T12:00:00+07:00`), "dd MMM yyyy", { locale: localeId });
}

export function readFiniteField(rec: Record<string, any> | null | undefined, varKey: string): number | null {
  if (!rec) return null;
  let raw = rec[varKey];
  if ((raw === undefined || raw === null) && (varKey === "dew" || varKey === "dewpoint")) {
    raw = varKey === "dew" ? rec.dewpoint : rec.dew;
  }
  if ((raw === undefined || raw === null) && (varKey === "windSpeed" || varKey === "wind_speed")) {
    raw = varKey === "windSpeed" ? rec.wind_speed : rec.windSpeed;
  }
  if (raw === undefined || raw === null || raw === "") return null;
  const num = Number(raw);
  return Number.isFinite(num) ? num : null;
}

export { NumericInputField } from "./NumericInputField";
