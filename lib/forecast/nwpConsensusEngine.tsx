import React from "react";
import {
  WiDaySunny,
  WiNightClear,
  WiDayCloudy,
  WiNightAltCloudy,
  WiCloudy,
  WiFog,
  WiDayShowers,
  WiNightAltShowers,
  WiRain,
  WiRainWind,
  WiThunderstorm,
  WiStrongWind,
  WiNa,
} from "react-icons/wi";
import {
  Sun,
  Cloud,
  CloudSun,
  CloudFog,
  CloudDrizzle,
  CloudRain,
  CloudLightning,
  Wind,
} from "lucide-react";

export type WeatherCondition =
  | "Cerah"
  | "Cerah Berawan"
  | "Berawan"
  | "Hujan Ringan"
  | "Hujan Sedang"
  | "Hujan Lebat"
  | "Badai Petir"
  | "Kabut"
  | "Angin Kencang";

export type ForecastRow = {
  time: string;
  conditionMain: WeatherCondition | "";
  probMain: string;
  conditionSub: WeatherCondition | "";
  probSub: string;
  temperature: number | "";
  temperatureError: number | "";
  humidity: number | "";
  humidityError: number | "";
  heatIndex: number | "";
  heatIndexError: number | "";
};

export const initialTimes = ["07:00", "10:00", "13:00", "16:00", "19:00"];
export const probabilities = ["100", "90", "80", "70", "60", "50", "40", "30", "20", "10", "0"];

// --- GLOBAL NWP & AI ENSEMBLE MODELS FOR CONSENSUS VOTING ---
export const GLOBAL_NWP_MODELS = [
  { id: "ecmwf_ifs", name: "ECMWF IFS HRES 9km", country: "Eropa", category: "Physics NWP" },
  { id: "ecmwf_aifs025_single", name: "ECMWF AIFS 0.25°", country: "Eropa (AI)", category: "AI Model" },
  { id: "ukmo_global_deterministic_10km", name: "UKMO Global 10km", country: "Inggris", category: "Physics NWP" },
  { id: "meteofrance_arpege_world025", name: "Météo-France ARPEGE", country: "Prancis", category: "Physics NWP" },
  { id: "icon_seamless", name: "DWD ICON", country: "Jerman", category: "Physics NWP" },
  { id: "gfs_seamless", name: "NOAA GFS 0.11°", country: "Amerika Serikat", category: "Physics NWP" },
  { id: "ncep_aigfs025", name: "NOAA AIGFS 0.25°", country: "Amerika Serikat (AI)", category: "AI Model" },
  { id: "jma_seamless", name: "JMA GSM", country: "Jepang", category: "Physics NWP" },
  { id: "gem_seamless", name: "CMC GEM GDPS", country: "Kanada", category: "Physics NWP" },
  { id: "cma_grapes_global", name: "CMA Grapes 0.125°", country: "China", category: "Physics NWP" },
] as const;

// --- HELPER: WMO CODE & PRECIPITATION TRANSLATOR ---
export const translateModelToCondition = (
  code: number,
  precip: number = 0,
  rainProb: number | null = null
): WeatherCondition => {
  // Badai Petir (WMO 95: Thunderstorm, 96/99: Thunderstorm with hail)
  if (code >= 95 && code <= 99) {
    return "Badai Petir";
  }
  // Hujan Lebat (WMO 65: Heavy continuous rain, 82: Violent rain showers, atau presipitasi >= 5.0 mm/jam)
  if (code === 65 || code === 82 || code === 77 || code === 85 || code === 86 || precip >= 5.0) {
    return "Hujan Lebat";
  }
  // Hujan Sedang (WMO 63: Moderate continuous rain, 81: Moderate rain showers, atau presipitasi 1.0 - 5.0 mm/jam)
  if (code === 63 || code === 81 || (code >= 61 && code <= 64) || (precip >= 1.0 && precip < 5.0)) {
    return "Hujan Sedang";
  }
  // Hujan Ringan (WMO 51-57: Gerimis/Drizzle, 61: Hujan ringan, 80: Rain showers ringan, presipitasi 0.05 - 1.0 mm/jam, atau POP >= 60% jika ada presipitasi)
  if (
    (code >= 51 && code <= 57) ||
    code === 61 ||
    code === 80 ||
    (precip > 0.05 && precip < 1.0) ||
    (rainProb !== null && rainProb >= 60 && precip > 0)
  ) {
    return "Hujan Ringan";
  }
  // Kabut (WMO 45, 48)
  if (code === 45 || code === 48) {
    return "Kabut";
  }
  // Cerah (WMO 0)
  if (code === 0) {
    return "Cerah";
  }
  // Cerah Berawan (WMO 1, 2)
  if (code === 1 || code === 2) {
    return "Cerah Berawan";
  }
  // Berawan (WMO 3)
  if (code === 3) {
    return "Berawan";
  }

  return "Berawan";
};

// --- HELPER: MULTI-MODEL ENSEMBLE CONSENSUS ENGINE ---
export interface SingleModelPrediction {
  modelId: string;
  modelName: string;
  condition: WeatherCondition;
  temperature: number | null;
  humidity: number | null;
  precipitation: number;
  rainProb: number | null;
}

export interface ModelConsensusResult {
  conditionMain: WeatherCondition;
  probMain: string;
  conditionSub: WeatherCondition | "";
  probSub: string;
  temperature: number | "";
  temperatureError: number | "";
  humidity: number | "";
  humidityError: number | "";
  heatIndex: number | "";
  heatIndexError: number | "";
  breakdown: {
    condition: WeatherCondition;
    count: number;
    percentage: number;
    models: string[];
  }[];
}

export const calculateMultiModelConsensus = (
  predictions: SingleModelPrediction[]
): ModelConsensusResult => {
  const valid = predictions.filter((p) => p.condition);
  const total = valid.length;

  if (total === 0) {
    return {
      conditionMain: "Berawan",
      probMain: "80",
      conditionSub: "",
      probSub: "",
      temperature: "",
      temperatureError: 2,
      humidity: "",
      humidityError: 5,
      heatIndex: "",
      heatIndexError: 2,
      breakdown: [],
    };
  }

  // 1. Frekuensi Kondisi Cuaca Tiap Model
  const freqMap: Record<string, { count: number; models: string[] }> = {};
  for (const pred of valid) {
    if (!freqMap[pred.condition]) {
      freqMap[pred.condition] = { count: 0, models: [] };
    }
    freqMap[pred.condition].count += 1;
    freqMap[pred.condition].models.push(pred.modelName);
  }

  const sortedVotes = Object.entries(freqMap)
    .map(([condition, data]) => ({
      condition: condition as WeatherCondition,
      count: data.count,
      percentage: Math.round((data.count / total) * 100),
      models: data.models,
    }))
    .sort((a, b) => b.count - a.count);

  const mainVote = sortedVotes[0];
  const conditionMain = mainVote.condition;
  const probMain = mainVote.percentage.toString();

  let conditionSub: WeatherCondition | "" = "";
  let probSub = "";

  if (sortedVotes.length > 1 && sortedVotes[1].count > 0) {
    conditionSub = sortedVotes[1].condition;
    probSub = sortedVotes[1].percentage.toString();
  }

  // 2. Mean Suhu & Margin Error Dinamis (Robust Multi-Model Spread via Standard Deviation)
  const temps = valid
    .map((p) => p.temperature)
    .filter((t): t is number => typeof t === "number" && !isNaN(t));

  let avgTemp: number | "" = "";
  let tempError: number | "" = 2;

  if (temps.length > 0) {
    const mean = temps.reduce((a, b) => a + b, 0) / temps.length;
    avgTemp = Math.round(mean);
    const variance = temps.reduce((sum, t) => sum + Math.pow(t - mean, 2), 0) / temps.length;
    const stdDev = Math.sqrt(variance);
    tempError = Math.max(1, Math.min(5, Math.round(stdDev || 2)));
  }

  // 3. Mean Kelembapan & Margin Error Dinamis (Physical Clamping 0-100% & Diurnal Saturation)
  const hums = valid
    .map((p) => p.humidity)
    .filter((h): h is number => typeof h === "number" && !isNaN(h));

  let avgHum: number | "" = "";
  let humError: number | "" = 5;

  if (hums.length > 0) {
    const mean = hums.reduce((a, b) => a + b, 0) / hums.length;
    avgHum = Math.min(100, Math.max(0, Math.round(mean)));
    const variance = hums.reduce((sum, h) => sum + Math.pow(h - mean, 2), 0) / hums.length;
    const stdDev = Math.sqrt(variance);
    let rawError = Math.round(stdDev || 3);

    // Diurnal Saturation Consistency: saat mendekati jenuh (RH >= 90%), error menyempit ke <= 5%
    if (avgHum >= 90) {
      rawError = Math.min(rawError, 5);
    }

    // Absolute Physical Boundaries: rentang (RH ± err) mutlak tidak boleh menembus 0% atau 100%
    const maxAllowedSpread = Math.min(100 - avgHum, avgHum);
    const minPracticalFloor = Math.min(2, maxAllowedSpread);
    humError = Math.max(minPracticalFloor, Math.min(10, rawError, maxAllowedSpread));
  }

  // 4. Indeks Panas & Error
  let hi: number | "" = "";
  let hiError: number | "" = 2;

  if (typeof avgTemp === "number" && typeof avgHum === "number") {
    hi = calculateHeatIndexCelsius(avgTemp, avgHum);
    hiError = Math.round((typeof tempError === "number" ? tempError : 2) * 1.2);
  }

  return {
    conditionMain,
    probMain,
    conditionSub,
    probSub,
    temperature: avgTemp,
    temperatureError: tempError,
    humidity: avgHum,
    humidityError: humError,
    heatIndex: hi,
    heatIndexError: hiError,
    breakdown: sortedVotes,
  };
};

export const toNumberOrEmpty = (value: string): number | "" => {
  if (value.trim() === "") return "";
  const n = Number(value);
  return Number.isFinite(n) ? n : "";
};

// NOAA heat index (Celsius output) with Physical Validity Safeguards
export const calculateHeatIndexCelsius = (tempC: number, rh: number): number => {
  if (tempC < 26.7 || rh < 40) {
    return Math.round(tempC);
  }

  const tF = (tempC * 9) / 5 + 32;
  const hiF =
    -42.379 +
    2.04901523 * tF +
    10.14333127 * rh -
    0.22475541 * tF * rh -
    0.00683783 * tF * tF -
    0.05481717 * rh * rh +
    0.00122874 * tF * tF * rh +
    0.00085282 * tF * rh * rh -
    0.00000199 * tF * tF * rh * rh;

  const hiC = ((hiF - 32) * 5) / 9;
  return Math.round(Math.max(tempC, hiC));
};

export const getHeatIndexDisplay = (row: ForecastRow) => {
  if (row.heatIndex !== "") {
    return row.heatIndex;
  }
  if (row.temperature !== "" && row.humidity !== "") {
    return calculateHeatIndexCelsius(row.temperature, row.humidity);
  }
  return "";
};

export const getRowStyles = (condition: string, time: string) => {
  const hour = parseInt(time.split(":")[0]) || 0;
  const isNight = hour >= 18 || hour < 6;

  let styles = {
    bg: "#F8FAFC",
    accent: "#64748B",
    text: "#334155",
  };

  switch (condition) {
    case "Cerah":
    case "Cerah Berawan":
      if (isNight) {
        styles = { bg: "#EEF2FF", accent: "#6366F1", text: "#312E81" };
      } else {
        styles = { bg: "#FFFBEB", accent: "#F59E0B", text: "#92400E" };
      }
      break;
    case "Berawan":
    case "Kabut":
      styles = { bg: "#EFF6FF", accent: "#3B82F6", text: "#1E3A8A" };
      break;
    case "Hujan Ringan":
    case "Hujan Sedang":
      styles = { bg: "#E0F2FE", accent: "#0284C7", text: "#0C4A6E" };
      break;
    case "Hujan Lebat":
    case "Badai Petir":
    case "Angin Kencang":
      styles = { bg: "#F3E8FF", accent: "#9333EA", text: "#581C87" };
      break;
    default:
      if (isNight) styles = { bg: "#FAF5FF", accent: "#A855F7", text: "#581C87" };
      else styles = { bg: "#FEFCE8", accent: "#EAB308", text: "#713F12" };
      break;
  }
  return styles;
};

export const formatWeatherLine = (prob: string, condition: string) => {
  const p = (prob || "").trim();
  const c = (condition || "").trim();

  if (!p && !c) return "-";
  if (p && c) return `${p}% ${c}`;
  if (c) return c;
  return `${p}%`;
};

export const formatValueWithError = (
  value: number | "",
  error: number | "",
  unit: string = ""
) => {
  if (value === "") return "-";
  const err = error === "" ? "" : ` ±${error}`;
  return `${value}${unit}${err}`;
};

export const getErikFlowersIcon = (condition: string, time: string, size: number = 72, color: string) => {
  const hour = parseInt(time.split(":")[0]) || 0;
  const isNight = hour >= 18 || hour < 6;
  const props = { size, color };

  switch (condition) {
    case "Cerah":
      return isNight ? <WiNightClear {...props} /> : <WiDaySunny {...props} />;
    case "Cerah Berawan":
      return isNight ? <WiNightAltCloudy {...props} /> : <WiDayCloudy {...props} />;
    case "Berawan":
      return <WiCloudy {...props} />;
    case "Kabut":
      return <WiFog {...props} />;
    case "Hujan Ringan":
      return isNight ? <WiNightAltShowers {...props} /> : <WiDayShowers {...props} />;
    case "Hujan Sedang":
      return <WiRain {...props} />;
    case "Hujan Lebat":
      return <WiRainWind {...props} />;
    case "Badai Petir":
      return <WiThunderstorm {...props} />;
    case "Angin Kencang":
      return <WiStrongWind {...props} />;
    default:
      return <WiNa {...props} />;
  }
};

export const weatherOptions: { value: WeatherCondition; label: string; Icon: any; color: string }[] = [
  { value: "Cerah", label: "Cerah", Icon: Sun, color: "#F97316" },
  { value: "Cerah Berawan", label: "Cerah Berawan", Icon: CloudSun, color: "#FB923C" },
  { value: "Berawan", label: "Berawan", Icon: Cloud, color: "#64748B" },
  { value: "Kabut", label: "Kabut", Icon: CloudFog, color: "#94A3B8" },
  { value: "Hujan Ringan", label: "Hujan Ringan", Icon: CloudDrizzle, color: "#60A5FA" },
  { value: "Hujan Sedang", label: "Hujan Sedang", Icon: CloudRain, color: "#3B82F6" },
  { value: "Hujan Lebat", label: "Hujan Lebat", Icon: CloudRain, color: "#6366F1" },
  { value: "Badai Petir", label: "Badai Petir", Icon: CloudLightning, color: "#7C3AED" },
  { value: "Angin Kencang", label: "Angin Kencang", Icon: Wind, color: "#06B6D4" },
];
