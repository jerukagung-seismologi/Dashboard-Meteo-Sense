"use client"

import React from "react"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { useToast } from "@/hooks/use-toast"
import { 
  Plus, 
  Trash2, 
  Save, 
  Download, 
  Thermometer,
  ThermometerSun,
  Droplets,
  Wind,
  DatabaseZap,
  Sun,
  Cloud,
  CloudSun,
  CloudFog,
  CloudDrizzle,
  CloudRain,
  CloudLightning,
} from "lucide-react"
import html2canvas from "html2canvas"

// --- IMPORT ERIK FLOWERS WEATHER ICONS ---
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
  WiNa
} from "react-icons/wi";
import { he } from "date-fns/locale"

// --- TIPE DATA ---

export type WeatherCondition =
  | "Cerah"
  | "Cerah Berawan"
  | "Berawan"
  | "Hujan Ringan"
  | "Hujan Sedang"
  | "Hujan Lebat"
  | "Badai Petir"
  | "Kabut"
  | "Angin Kencang"

export type ForecastRow = {
  time: string
  conditionMain: WeatherCondition | ""
  probMain: string
  conditionSub: WeatherCondition | ""
  probSub: string
  temperature: number | ""
  temperatureError: number | ""
  humidity: number | ""
  humidityError: number | ""
  heatIndex: number | ""
  heatIndexError: number | ""
}

const initialTimes = ["07:00", "10:00", "13:00", "16:00", "19:00"]
const probabilities = ["100", "90", "80", "70", "60", "50", "40", "30", "20", "10", "0"]

// --- CONSTANTS ---
const KEBUMEN_LAT = -7.7366
const KEBUMEN_LON = 109.6458

// --- HELPER 3: WEATHER CODE MAPPING ---
const mapWeatherCodeToCondition = (code: number, windSpeed: number): WeatherCondition => {
  if (windSpeed >= 12) return "Angin Kencang"
  if (code === 0) return "Cerah"
  if (code === 1 || code === 2) return "Cerah Berawan"
  if (code === 3) return "Berawan"
  if (code === 45 || code === 48) return "Kabut"
  if ((code >= 51 && code <= 57) || (code >= 80 && code <= 82)) return "Hujan Ringan"
  if ((code >= 61 && code <= 65)) return "Hujan Sedang"
  if ((code >= 66 && code <= 69) || (code >= 95 && code <= 99)) return "Badai Petir"
  if (code === 77 || code === 85 || code === 86) return "Hujan Lebat"
  return "Berawan"
}

// --- HELPER 4: CHECK IF CONDITION IS RAIN-RELATED ---
const isRainCondition = (condition: WeatherCondition): boolean => {
  return [
    "Hujan Ringan",
    "Hujan Sedang",
    "Hujan Lebat",
    "Badai Petir"
  ].includes(condition)
}

// --- HELPER 5: DETERMINE CONDITION BASED ON RAIN PROBABILITY ---
const getConditionFromRainProbability = (
  rainProbability: number,
  weatherCode: number,
  windSpeed: number
): WeatherCondition => {
  // Jika rain_probability > 50%, gunakan kondisi hujan
  if (rainProbability > 50) {
    // Tentukan severity hujan berdasarkan weather code
    if (weatherCode >= 95 && weatherCode <= 99) return "Badai Petir"
    if ((weatherCode >= 66 && weatherCode <= 69) || weatherCode === 85 || weatherCode === 86) return "Hujan Lebat"
    if ((weatherCode >= 61 && weatherCode <= 65)) return "Hujan Sedang"
    if ((weatherCode >= 51 && weatherCode <= 57) || (weatherCode >= 80 && weatherCode <= 82)) return "Hujan Ringan"
    // Default hujan
    return "Hujan Sedang"
  }
  
  // Jika rain_probability <= 50%, gunakan kondisi non-hujan dari weather code
  return mapWeatherCodeToCondition(weatherCode, windSpeed)
}

// --- HELPER 6: WMO WEATHER CODE TRANSLATOR (COMPREHENSIVE) ---
const translateWMOCode = (code: number): WeatherCondition => {
  // WMO Weather Interpretation Codes (WW)
  if (code === 0) return "Cerah"
  if (code === 1 || code === 2) return "Cerah Berawan"
  if (code === 3) return "Berawan"
  if (code === 45 || code === 48) return "Kabut"
  if (code >= 51 && code <= 57) return "Hujan Ringan" // Drizzle
  if (code >= 61 && code <= 65) return "Hujan Sedang" // Rain
  if (code >= 66 && code <= 67) return "Hujan Lebat" // Freezing rain
  if (code >= 71 && code <= 77) return "Hujan Lebat" // Snow
  if (code >= 80 && code <= 82) return "Hujan Ringan" // Rain showers
  if (code >= 85 && code <= 86) return "Hujan Lebat" // Snow showers
  if (code >= 95 && code <= 99) return "Badai Petir" // Thunderstorm
  return "Berawan"
}

// --- HELPER 7: DETERMINE CONDITION WITH RAIN PROBABILITY ---
const determineConditionWithRainProb = (
  rainProbability: number,
  weatherCode: number,
  windSpeed: number
): WeatherCondition => {
  // Check wind speed first (priority)
  if (windSpeed >= 12) return "Angin Kencang"
  
  // If rain probability > 50%, prioritize rain condition
  if (rainProbability > 50) {
    const codeCondition = translateWMOCode(weatherCode)
    // If WMO code suggests rain, use it
    if (isRainCondition(codeCondition)) {
      return codeCondition
    }
    // Otherwise, default to Hujan Sedang for high rain probability
    return "Hujan Sedang"
  }
  
  // If rain probability <= 50%, use non-rain condition from WMO code
  const condition = translateWMOCode(weatherCode)
  // If WMO suggests rain but probability is low, override to non-rain
  if (isRainCondition(condition)) {
    return "Berawan" // Fallback to cloudy for low rain probability
  }
  return condition
}

// --- HELPER 1: PALET WARNA (FULL PASTEL BG + COLORED TEXT) ---

const getRowStyles = (condition: string, time: string) => {
  const hour = parseInt(time.split(":")[0]) || 0
  const isNight = hour >= 18 || hour < 6

  // Default: Abu-abu Netral
  let styles = { 
    bg: "#F8FAFC",      // Slate 50
    accent: "#64748B",  // Slate 500
    text: "#334155",    // Slate 700
  }

  switch (condition) {
    case "Cerah":
    case "Cerah Berawan":
      if (isNight) {
        styles = { bg: "#EEF2FF", accent: "#6366F1", text: "#312E81" } // Malam: Indigo
      } else {
        styles = { bg: "#FFFBEB", accent: "#F59E0B", text: "#92400E" } // Siang: Amber
      }
      break;
    case "Berawan":
    case "Kabut":
      styles = { bg: "#EFF6FF", accent: "#3B82F6", text: "#1E3A8A" } // Biru Laut
      break;
    case "Hujan Ringan":
    case "Hujan Sedang":
      styles = { bg: "#E0F2FE", accent: "#0284C7", text: "#0C4A6E" } // Biru Langit
      break;
    case "Hujan Lebat":
    case "Badai Petir":
    case "Angin Kencang":
      styles = { bg: "#F3E8FF", accent: "#9333EA", text: "#581C87" } // Ungu
      break;
    default:
      if (isNight) styles = { bg: "#FAF5FF", accent: "#A855F7", text: "#581C87" }
      else styles = { bg: "#FEFCE8", accent: "#EAB308", text: "#713F12" }
      break;
  }
  return styles
}

// --- HELPER: FORMAT CUACA & NILAI DENGAN ERROR ---
const formatWeatherLine = (prob: string, condition: string) => {
  const p = (prob || "").trim()
  const c = (condition || "").trim()

  if (!p && !c) return "-"
  if (p && c) return `${p}% ${c}`
  if (c) return c
  return `${p}%`
}

const formatValueWithError = (
  value: number | "",
  error: number | "",
  unit: string = ""
) => {
  if (value === "") return "-"
  const err = error === "" ? "" : ` ±${error}`
  return `${value}${unit}${err}`
}

// --- HELPER 2: ICON SELECTOR ---

const getErikFlowersIcon = (condition: string, time: string, size: number = 72, color: string) => {
  const hour = parseInt(time.split(":")[0]) || 0
  const isNight = hour >= 18 || hour < 6
  const props = { size, color }

  switch (condition) {
    case "Cerah": return isNight ? <WiNightClear {...props} /> : <WiDaySunny {...props} />
    case "Cerah Berawan": return isNight ? <WiNightAltCloudy {...props} /> : <WiDayCloudy {...props} />
    case "Berawan": return <WiCloudy {...props} />
    case "Kabut": return <WiFog {...props} />
    case "Hujan Ringan": return isNight ? <WiNightAltShowers {...props} /> : <WiDayShowers {...props} />
    case "Hujan Sedang": return <WiRain {...props} />
    case "Hujan Lebat": return <WiRainWind {...props} />
    case "Badai Petir": return <WiThunderstorm {...props} />
    case "Angin Kencang": return <WiStrongWind {...props} />
    default: return <WiNa {...props} />
  }
};

// Helper: return icon JSX + color for a condition
const getConditionColor = (condition: string) => {
  switch (condition) {
    case "Cerah": return "#F59E0B"       // amber
    case "Cerah Berawan": return "#FBBF24" // warm yellow
    case "Berawan": return "#64748B"     // gray
    case "Hujan Ringan": return "#3B82F6" // blue
    case "Hujan Sedang": return "#2563EB" // darker blue
    case "Hujan Lebat": return "#1E40AF"  // deep blue
    case "Badai Petir": return "#7C3AED"  // purple
    case "Kabut": return "#0EA5A4"        // teal
    case "Angin Kencang": return "#0F172A"// indigo/near black
    default: return "#64748B"
  }
}

const getLucideIconForCondition = (condition: string, size: number = 16) => {
  const color = getConditionColor(condition)
  switch (condition) {
    case "Cerah":
      return <Sun size={size} color={color} />
    case "Cerah Berawan":
      return <CloudSun size={size} color={color} />
    case "Berawan":
      return <Cloud size={size} color={color} />
    case "Hujan Ringan":
      return <CloudDrizzle size={size} color={color} />
    case "Hujan Sedang":
      return <CloudRain size={size} color={color} />
    case "Hujan Lebat":
      return <CloudRain size={size} color={color} />
    case "Badai Petir":
      return <CloudLightning size={size} color={color} />
    case "Kabut":
      return <CloudFog size={size} color={color} />
    case "Angin Kencang":
      return <Wind size={size} color={color} />
    default:
      return <Cloud size={size} color={color} />
  }
};

// --- KOMPONEN UTAMA ---

export default function ForecastForm() {
  const { toast } = useToast()

  const [rows, setRows] = React.useState<ForecastRow[]>(
    initialTimes.map((t) => ({
      time: t,
      conditionMain: "",
      probMain: "80",
      conditionSub: "",
      probSub: "",
      temperature: "",
      temperatureError: 10,
      humidity: "",
      humidityError: 5,
      heatIndex: "",
      heatIndexError: 2,
    }))
  )
  const [location, setLocation] = React.useState<string>("Kebumen")
  const [loadingFetch, setLoadingFetch] = React.useState<boolean>(false)
  
  const printRef = React.useRef<HTMLDivElement>(null)
  
  const tomorrowStr = React.useMemo(() => {
    const d = new Date()
    d.setDate(d.getDate() + 1)
    return d.toLocaleDateString("id-ID", {
      weekday: "long", 
      day: "numeric", 
      month: "long", 
      year: "numeric"
    })
  }, [])

  const currentTimeStr = React.useMemo(() => {
    const now = new Date()
    return now.toLocaleString("id-ID", {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      hour12: false
    })
  }, [rows]) // Re-compute setiap kali rows berubah untuk update dinamis

  const updateRow = (index: number, patch: Partial<ForecastRow>) => {
    setRows((prev) => prev.map((r, i) => (i === index ? { ...r, ...patch } : r)))
  }

  const addRow = () => {
    setRows((prev) => [
      ...prev,
      {
        time: "",
        conditionMain: "",
        probMain: "80",
        conditionSub: "",
        probSub: "",
        temperature: "",
        temperatureError: 10,
        humidity: "",
        humidityError: 10,
        heatIndex: "",
        heatIndexError: 12,
      },
    ])
  }

  const updateTemperature = (index: number, value: string) => {
    const nextTemp = toNumberOrEmpty(value)
    setRows((prev) =>
      prev.map((r, i) => {
        if (i !== index) return r
        const hi =
          nextTemp !== "" && r.humidity !== ""
            ? calculateHeatIndexCelsius(nextTemp, r.humidity)
            : ""
        return { ...r, temperature: nextTemp, heatIndex: hi }
      })
    )
  }

  const updateHumidity = (index: number, value: string) => {
    const nextHum = toNumberOrEmpty(value)
    setRows((prev) =>
      prev.map((r, i) => {
        if (i !== index) return r
        const hi =
          r.temperature !== "" && nextHum !== ""
            ? calculateHeatIndexCelsius(r.temperature, nextHum)
            : ""
        return { ...r, humidity: nextHum, heatIndex: hi }
      })
    )
  }

  const updateHeatIndex = (index: number) => {
    setRows((prev) =>
      prev.map((r, i) => {
        if (i !== index) return r
        const hi =
          r.temperature !== "" && r.humidity !== ""
            ? calculateHeatIndexCelsius(r.temperature, r.humidity)
            : ""
        return { ...r, heatIndex: hi }
      })
    )
  }

  const removeRow = (index: number) => {
    setRows((prev) => prev.filter((_, i) => i !== index))
  }

  const onSaveDebug = () => {
    console.log("Data:", rows)
    toast({ title: "Debug", description: "Cek console." })
  }

  const onSaveAsImage = async () => {
    if (!printRef.current) return;

    try {
      toast({ title: "Memproses Gambar...", description: "Mohon tunggu..." })
      await new Promise(resolve => setTimeout(resolve, 200));

      const canvas = await html2canvas(printRef.current, {
        scale: 4, 
        backgroundColor: "#ffffff",
        logging: false,
        useCORS: true,
        width: 800, 
        windowWidth: 1200 
      });

      const image = canvas.toDataURL("image/png");
      const link = document.createElement("a");
      const fileName = `Outlook_${location || "Kota"}_${new Date().toISOString().split('T')[0]}.png`;
      
      link.href = image;
      link.download = fileName;
      link.click();

      toast({ title: "Berhasil!", description: "Gambar tersimpan." });

    } catch (error) {
      console.error("Error generating image:", error);
      toast({ title: "Gagal", description: "Terjadi kesalahan.", variant: "destructive" });
    }
  };

  // --- FETCH FORECAST: REFACTORED WITH OPENMETEO ECMWF ---
  const fetchForecast = async () => {
    if (!location || location.trim() === "") {
      toast({ title: "Lokasi kosong", description: "Masukkan nama lokasi terlebih dahulu.", variant: "destructive" })
      return
    }
  
    setLoadingFetch(true)
  
    try {
      toast({ title: "Mengambil data...", description: "Sedang menghubungi API lokasi dan forecast" })

      let lat = KEBUMEN_LAT
      let lon = KEBUMEN_LON
      let locationName = "Kebumen"

      // 1) Geocoding (Open-Meteo) - hanya jika lokasi bukan Kebumen
      if (location.toLowerCase() !== "kebumen") {
        try {
          const geoRes = await fetch(
            `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(location)}&count=1&language=id`
          )
          const geoJson = await geoRes.json()
          
          if (geoJson?.results && geoJson.results.length > 0) {
            const place = geoJson.results[0]
            lat = place.latitude
            lon = place.longitude
            locationName = place.name || location
            console.log(`✓ Lokasi ditemukan: ${place.name}, ${place.admin1 || place.country}`)
          } else {
            console.warn(`✗ Lokasi "${location}" tidak ditemukan. Menggunakan Kebumen default.`)
            toast({ 
              title: "Lokasi tidak ditemukan", 
              description: `"${location}" tidak ditemukan. Menggunakan Kebumen sebagai default.`, 
              variant: "destructive" 
            })
          }
        } catch (geoErr) {
          console.error("Geocoding error:", geoErr)
          toast({ 
            title: "Error geocoding", 
            description: "Gagal mencari lokasi. Menggunakan Kebumen default.", 
            variant: "destructive" 
          })
        }
      }

      // 2) Calculate tomorrow's date
      const tomorrow = new Date()
      tomorrow.setDate(tomorrow.getDate() + 1)
      const tomorrowDateStr = tomorrow.toLocaleDateString("en-CA", { timeZone: "Asia/Bangkok" })

      // 3) Fetch Forecast dari Open-Meteo ECMWF API
      const params = new URLSearchParams({
        latitude: lat.toString(),
        longitude: lon.toString(),
        hourly: "temperature_2m,weather_code,surface_pressure,precipitation_probability,rain,relative_humidity_2m,wind_speed_10m",
        models: "ecmwf_ifs",
        timezone: "Asia/Bangkok",
        forecast_days: "2" // Ambil 2 hari untuk memastikan data besok ada
      })

      const forecastUrl = `https://api.open-meteo.com/v1/forecast?${params.toString()}`
      console.log("Fetching from:", forecastUrl)

      const response = await fetch(forecastUrl)

      if (!response.ok) {
        throw new Error(`API Response: ${response.status} ${response.statusText}`)
      }

      const fcJson = await response.json()
      if (!fcJson?.hourly?.time) {
        throw new Error("Invalid forecast data structure")
      }

      const times: string[] = fcJson.hourly.time || []
      const temps: number[] = fcJson.hourly.temperature_2m || []
      const hums: number[] = fcJson.hourly.relative_humidity_2m || []
      const codes: number[] = fcJson.hourly.weather_code || []
      const winds: number[] = fcJson.hourly.wind_speed_10m || []
      const rainProbs: number[] = fcJson.hourly.precipitation_probability || []

      console.log(`✓ Forecast data received: ${times.length} hourly records`)
      console.log(`  Tomorrow date filter: ${tomorrowDateStr}`)

      // 4) Helper: Find index untuk waktu spesifik
      const findIndexFor = (targetTime: string): number => {
        const suffixTomorrow = `${tomorrowDateStr}T${targetTime}:00`
        
        // Exact match
        let idx = times.findIndex(t => t === suffixTomorrow)
        if (idx !== -1) {
          console.log(`  ✓ Exact match found for ${targetTime}: index ${idx}`)
          return idx
        }

        // Fallback: cari yang paling dekat untuk esok hari
        const targetDateTime = new Date(`${tomorrowDateStr}T${targetTime}:00`)
        let bestIdx = -1
        let bestDiff = Infinity

        for (let i = 0; i < times.length; i++) {
          const forecastDateTime = new Date(times[i])
          const forecastDate = times[i].split('T')[0]
          const diff = Math.abs(forecastDateTime.getTime() - targetDateTime.getTime())

          // Hanya pertimbangkan data dari esok hari
          if (diff < bestDiff && forecastDate === tomorrowDateStr) {
            bestDiff = diff
            bestIdx = i
          }
        }

        if (bestIdx !== -1) {
          const closestTime = times[bestIdx]
          console.log(`  ⚠ Closest match for ${targetTime}: ${closestTime}`)
        } else {
          console.warn(`  ✗ No data found for ${targetTime} on ${tomorrowDateStr}`)
        }

        return bestIdx
      }

      // 5) Process rows untuk setiap jam
      const fetchedRows: Partial<ForecastRow>[] = initialTimes.map((targetTime) => {
        const idx = findIndexFor(targetTime)

        if (idx === -1) {
          return { 
            time: targetTime, 
            conditionMain: "", 
            temperature: "", 
            humidity: "",
            probMain: "0"
          }
        }

        // Extract values with safety checks
        const temp = typeof temps[idx] === "number" ? Math.round(temps[idx]) : ""
        const hum = typeof hums[idx] === "number" ? Math.round(hums[idx]) : ""
        const code = typeof codes[idx] === "number" ? Math.round(codes[idx]) : 0
        const ws = typeof winds[idx] === "number" ? winds[idx] : 0
        const rainProb = typeof rainProbs[idx] === "number" ? Math.round(rainProbs[idx]) : 0

        // Determine condition using rain probability logic
        const condition = determineConditionWithRainProb(rainProb, code, ws)

        // Use rain_probability sebagai probability utama
        const probMain = rainProb.toString()

        console.log(
          `[${targetTime}] Code: ${code} | WS: ${ws}m/s | RainProb: ${rainProb}% | Temp: ${temp}° | Condition: ${condition}`
        )

        return {
          time: targetTime,
          conditionMain: condition,
          probMain,
          temperature: temp,
          humidity: hum,
          heatIndex:
            typeof temp === "number" && typeof hum === "number"
              ? calculateHeatIndexCelsius(temp, hum)
              : "",
        }
      })

      // 6) Merge
      setRows((prev) =>
        prev.map((r, i) => {
          const f = fetchedRows[i] || {}
          return {
            ...r,
            time: f.time ?? r.time,
            conditionMain:
              f.conditionMain
                ? (f.conditionMain as WeatherCondition)
                : r.conditionMain,
            temperature:
              f.temperature !== undefined && f.temperature !== ""
                ? (f.temperature as number)
                : r.temperature,
            humidity:
              f.humidity !== undefined && f.humidity !== ""
                ? (f.humidity as number)
                : r.humidity,
            heatIndex:
              f.heatIndex !== undefined && f.heatIndex !== ""
                ? (f.heatIndex as number)
                : r.heatIndex,
            temperatureError: r.temperatureError === "" ? 10 : r.temperatureError,
            humidityError: r.humidityError === "" ? 10 : r.humidityError,
            heatIndexError: r.heatIndexError === "" ? 12 : r.heatIndexError,
            probMain: f.probMain ?? r.probMain,
            probSub: r.probSub,
            conditionSub: r.conditionSub,
          } as ForecastRow
        })
      )

      toast({ 
        title: "✓ Selesai", 
        description: `Data prakiraan ECMWF untuk ${tomorrowStr} berhasil diambil dari OpenMeteo.` 
      })

      console.log("✓ Forecast fetch completed successfully")

    } catch (err) {
      console.error("❌ fetchForecast error:", err)
      const errorMsg = err instanceof Error ? err.message : "Unknown error"
      toast({ 
        title: "Gagal mengambil data", 
        description: `${errorMsg} Periksa console untuk detail.`, 
        variant: "destructive" 
      })
    } finally {
      setLoadingFetch(false)
    }
  }

  // Helper render dropdown untuk probability dengan kelipatan 10
  const ProbabilitySelectItems = () => (
    <>
      <SelectItem value="0">0%</SelectItem>
      <SelectItem value="10">10%</SelectItem>
      <SelectItem value="20">20%</SelectItem>
      <SelectItem value="30">30%</SelectItem>
      <SelectItem value="40">40%</SelectItem>
      <SelectItem value="50">50%</SelectItem>
      <SelectItem value="60">60%</SelectItem>
      <SelectItem value="70">70%</SelectItem>
      <SelectItem value="80">80%</SelectItem>
      <SelectItem value="90">90%</SelectItem>
      <SelectItem value="100">100%</SelectItem>
    </>
  )

  // Helper render dropdown untuk weather dengan ikon
  const WeatherSelectItems = () => (
    <>
      <SelectItem value="Cerah">
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <span style={{ width: 20 }}>
            {getLucideIconForCondition("Cerah", 18)}
          </span>
          <span>Cerah</span>
        </div>
      </SelectItem>
      <SelectItem value="Cerah Berawan">
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <span style={{ width: 20 }}>
            {getLucideIconForCondition("Cerah Berawan", 18)}
          </span>
          <span>Cerah Berawan</span>
        </div>
      </SelectItem>
      <SelectItem value="Berawan">
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <span style={{ width: 20 }}>
            {getLucideIconForCondition("Berawan", 18)}
          </span>
          <span>Berawan</span>
        </div>
      </SelectItem>
      <SelectItem value="Hujan Ringan">
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <span style={{ width: 20 }}>
            {getLucideIconForCondition("Hujan Ringan", 18)}
          </span>
          <span>Hujan Ringan</span>
        </div>
      </SelectItem>
      <SelectItem value="Hujan Sedang">
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <span style={{ width: 20 }}>
            {getLucideIconForCondition("Hujan Sedang", 18)}
          </span>
          <span>Hujan Sedang</span>
        </div>
      </SelectItem>
      <SelectItem value="Hujan Lebat">
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <span style={{ width: 20 }}>
            {getLucideIconForCondition("Hujan Lebat", 18)}
          </span>
          <span>Hujan Lebat</span>
        </div>
      </SelectItem>
      <SelectItem value="Badai Petir">
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <span style={{ width: 20 }}>
            {getLucideIconForCondition("Badai Petir", 18)}
          </span>
          <span>Badai Petir</span>
        </div>
      </SelectItem>
      <SelectItem value="Kabut">
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <span style={{ width: 20 }}>
            {getLucideIconForCondition("Kabut", 18)}
          </span>
          <span>Kabut</span>
        </div>
      </SelectItem>
      <SelectItem value="Angin Kencang">
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <span style={{ width: 20 }}>
            {getLucideIconForCondition("Angin Kencang", 18)}
          </span>
          <span>Angin Kencang</span>
        </div>
      </SelectItem>
    </>
  )

  return (
    <div className="space-y-6">
      {/* --- HEADER UI INPUT --- */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 border-b pb-4">
        <div className="space-y-2">
          <h2 className="text-3xl font-bold tracking-tight">Input Prakiraan Cuaca</h2>
          <p className="text-muted-foreground">Isi data di bawah untuk menghasilkan tabel outlook grafis.</p>
          <div className="flex items-center gap-2 mt-2">
            <span className="font-semibold">Lokasi:</span>
            <Input 
              value={location} 
              onChange={(e) => setLocation(e.target.value)} 
              placeholder="Contoh: Kebumen" 
              className="w-[250px]"
            />
          </div>
        </div>
        <div className="flex gap-2">
            <Button variant="default" size="sm" onClick={addRow} className="bg-blue-600 hover:bg-blue-700"><Plus className="w-4 h-4 mr-1"/> Tambah Jam</Button>
            <Button variant="default" size="sm" onClick={onSaveDebug} className="bg-orange-500 hover:bg-orange-600"><Save className="w-4 h-4 mr-1"/> Debug Data</Button>
            <Button variant="default" size="sm" onClick={fetchForecast} className="bg-indigo-600 hover:bg-indigo-700" disabled={loadingFetch}>
            <DatabaseZap className="w-4 h-4 mr-1"/> {loadingFetch ? "Mengambil..." : "Ambil Otomatis"}
            </Button>
            <Button variant="default" size="sm" onClick={onSaveAsImage} className="bg-green-600 hover:bg-green-700">
            <Download className="w-4 h-4 mr-1"/> Simpan Gambar
            </Button>
        </div>
      </div>

      {/* --- FORM INPUT TABEL --- */}
      <div className="rounded-md border overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[70px] text-center">Jam</TableHead>
              <TableHead className="w-[160px]">Kondisi Utama</TableHead>
              <TableHead className="w-[90px] text-center">Prob %</TableHead>
              <TableHead className="w-[160px]">Kondisi Tambahan</TableHead>
              <TableHead className="w-[90px] text-center">Prob %</TableHead>
              <TableHead className="w-[140px]">Suhu (°C)</TableHead>
              <TableHead className="w-[140px]">Kelembapan (%)</TableHead>
              <TableHead className="w-[140px]">Indeks Panas (°C)</TableHead>
              <TableHead className="w-[50px] text-center">Hapus</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.map((row, idx) => (
              <TableRow key={idx}>
                {/* JAM */}
                <TableCell className="text-center">
                  <Input
                    value={row.time}
                    onChange={(e) => updateRow(idx, { time: e.target.value })}
                    className="h-8 text-center font-semibold"
                  />
                </TableCell>

                {/* KONDISI UTAMA */}
                <TableCell>
                  <Select
                    value={row.conditionMain || "__empty__"}
                    onValueChange={(value) =>
                      updateRow(idx, {
                        conditionMain: value === "__empty__" ? "" : (value as WeatherCondition),
                      })
                    }
                  >
                    <SelectTrigger className="h-8">
                      <SelectValue placeholder="Pilih" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="__empty__">
                        <div className="flex items-center gap-2">
                          <span className="min-w-[20px]" />
                          <span>-</span>
                        </div>
                      </SelectItem>
                      {weatherOptions.map((opt) => (
                        <SelectItem key={opt.value} value={opt.value}>
                          <div className="flex items-center gap-3">
                            <span style={{ width: 22, display: "inline-flex", justifyContent: "center", alignItems: "center" }}>
                              <opt.Icon size={18} color={opt.color} />
                            </span>
                            <span className="text-sm">{opt.label}</span>
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </TableCell>

                {/* PROB UTAMA */}
                <TableCell>
                  <Select
                    value={row.probMain}
                    onValueChange={(value) => updateRow(idx, { probMain: value })}
                  >
                    <SelectTrigger className="h-8 text-center">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <ProbabilitySelectItems />
                    </SelectContent>
                  </Select>
                </TableCell>

                {/* KONDISI TAMBAHAN */}
                <TableCell>
                  <Select
                    value={row.conditionSub || "__empty__"}
                    onValueChange={(value) =>
                      updateRow(idx, {
                        conditionSub: value === "__empty__" ? "" : (value as WeatherCondition),
                      })
                    }
                  >
                    <SelectTrigger className="h-8">
                      <SelectValue placeholder="Pilih" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="__empty__">
                        <div className="flex items-center gap-2">
                          <span className="min-w-[20px]" />
                          <span>-</span>
                        </div>
                      </SelectItem>
                      {weatherOptions.map((opt) => (
                        <SelectItem key={opt.value} value={opt.value}>
                          <div className="flex items-center gap-3">
                            <span style={{ width: 22, display: "inline-flex", justifyContent: "center", alignItems: "center" }}>
                              <opt.Icon size={18} color={opt.color} />
                            </span>
                            <span className="text-sm">{opt.label}</span>
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </TableCell>

                {/* PROB TAMBAHAN */}
                <TableCell>
                  <Select
                    value={row.probSub}
                    onValueChange={(value) => updateRow(idx, { probSub: value })}
                  >
                    <SelectTrigger className="h-8 text-center">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <ProbabilitySelectItems />
                    </SelectContent>
                  </Select>
                </TableCell>

                {/* SUHU + ERROR */}
                <TableCell>
                  <div className="flex flex-col gap-1">
                    <div className="flex gap-1 items-center">
                      <span className="text-xs text-muted-foreground min-w-fit">Nilai:</span>
                      <Input
                        type="number"
                        value={row.temperature}
                        onChange={(e) => updateTemperature(idx, e.target.value)}
                        className="h-7 text-sm flex-1"
                        placeholder="—"
                      />
                    </div>
                    <div className="flex gap-1 items-center">
                      <span className="text-xs text-muted-foreground min-w-fit">Error:</span>
                      <Input
                        type="number"
                        value={row.temperatureError}
                        onChange={(e) =>
                          updateRow(idx, { temperatureError: toNumberOrEmpty(e.target.value) })
                        }
                        className="h-7 text-sm flex-1"
                        placeholder="—"
                      />
                    </div>
                  </div>
                </TableCell>

                {/* KELEMBAPAN + ERROR */}
                <TableCell>
                  <div className="flex flex-col gap-1">
                    <div className="flex gap-1 items-center">
                      <span className="text-xs text-muted-foreground min-w-fit">Nilai:</span>
                      <Input
                        type="number"
                        value={row.humidity}
                        onChange={(e) => updateHumidity(idx, e.target.value)}
                        className="h-7 text-sm flex-1"
                        placeholder="—"
                      />
                    </div>
                    <div className="flex gap-1 items-center">
                      <span className="text-xs text-muted-foreground min-w-fit">Error:</span>
                      <Input
                        type="number"
                        value={row.humidityError}
                        onChange={(e) =>
                          updateRow(idx, { humidityError: toNumberOrEmpty(e.target.value) })
                        }
                        className="h-7 text-sm flex-1"
                        placeholder="—"
                      />
                    </div>
                  </div>
                </TableCell>

                {/* INDEKS PANAS + ERROR */}
                <TableCell>
                  <div className="flex flex-col gap-1">
                    <div className="flex gap-1 items-center">
                      <span className="text-xs text-muted-foreground min-w-fit">Nilai:</span>
                      <Input
                        type="number"
                        value={getHeatIndexDisplay(row)}
                        readOnly
                        className="h-7 text-sm flex-1 bg-muted"
                        placeholder="—"
                      />
                    </div>
                    <div className="flex gap-1 items-center">
                      <span className="text-xs text-muted-foreground min-w-fit">Error:</span>
                      <Input
                        type="number"
                        value={row.heatIndexError}
                        onChange={(e) =>
                          updateRow(idx, { heatIndexError: toNumberOrEmpty(e.target.value) })
                        }
                        className="h-7 text-sm flex-1"
                        placeholder="—"
                      />
                    </div>
                  </div>
                </TableCell>

                {/* HAPUS */}
                <TableCell className="text-center">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => removeRow(idx)}
                    className="h-8 w-8 p-0 text-red-600 hover:text-red-700"
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      {/* --- HIDDEN AREA (OUTPUT IMAGE) --- */}
      <div style={{ position: "fixed", left: "-9999px", top: 0, zIndex: -10 }}>
        <div ref={printRef} className="print-container" style={{ width: "800px", margin: "0 auto" }}>
          <style>{`
            @import url('https://fonts.googleapis.com/css2?family=Poppins:wght@400;600;700;800&display=swap');
            
            .print-container { 
              font-family: 'Poppins', sans-serif; 
              color: #0F172A; 
              padding: 20px; 
              box-sizing: border-box;
              background-color: white; 
              background: linear-gradient(160deg, #FFFFFF 0%, #F1F5F9 100%);
            }
            
            /* HEADER */
            .header-container { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 20px; }
            .header-title { font-size: 32px; font-weight: 800; color: #1E3A8A; line-height: 1.1; letter-spacing: -0.5px; }
            .header-subtitle { font-size: 20px; font-weight: 600; color: #EA580C; margin-top: 4px; }
            .sub-label { font-size: 14px; color: #64748B; text-transform: uppercase; letter-spacing: 1px; font-weight: 600; margin-bottom: 2px; }
            
            /* ROW DESIGN */
            .weather-row {
              display: flex;
              border-radius: 12px;
              margin-bottom: 10px;
              overflow: hidden;
              box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05);
              position: relative;
              border-left-width: 8px; 
              border-left-style: solid;
              height: 132px; 
            }
            
            /* 1. JAM */ 
            .col-time-h {
              width: 14%;
              display: flex;
              align-items: center;
              justify-content: center;
              font-weight: 800;
              font-size: 26px;
              padding: 0;
              border-right: 1px solid rgba(0,0,0,0.05);
              color: #334155;
            }

            /* 2. ICON */ 
            .col-icon {
              width: 18%; 
              display: flex;
              align-items: center;
              justify-content: center;
              padding: 0;
            }

            /* 3. DESKRIPSI */ 
            .col-desc {
              width: 43%; 
              padding: 0 20px;
              display: flex;
              flex-direction: column;
              justify-content: center;
            }
            .desc-main { font-size: 28px; font-weight: 800; line-height: 1.1; margin-bottom: 0px; }
            .desc-sub { font-size: 18px; opacity: 0.85; font-weight: 500; margin-top: 2px; }

            /* 4. METRIK (FIXED ALIGNMENT) */ 
            .col-metrics {
              width: 25%;
              padding: 0 18px;
              display: flex;
              flex-direction: column;
              justify-content: center;
              align-items: flex-start;
              gap: 8px;
              border-left: 1px solid rgba(0,0,0,0.05);
            }

            .metric-item {
              display: flex;
              align-items: center;
              gap: 10px;
              font-size: 18px;
              font-weight: 700;
              color: #334155;
              width: 100%;
              line-height: 1;
            }

            .metric-icon-wrap {
              width: 42px;
              min-width: 42px;
              display: flex;
              justify-content: center;
              align-items: center;
              flex: 0 0 42px;
            }

            .metric-value {
              display: inline-flex;
              align-items: center;
              white-space: nowrap;
            }
          `}</style>

          {/* Title Section */}
          <div className="header-container">
            <div>
              <div className="sub-label">Meteo Sense Outlook</div>
              <div className="header-title">{location || "Nama Kota"}</div>
              <div className="header-subtitle">{tomorrowStr}</div>
            </div>
            {/* Logo */}
            <div style={{ width: "80px", height: "80px", display: "flex", alignItems: "center", justifyContent: "center" }}>
                 <img src="/img/logo.webp" alt="Logo" style={{ maxWidth: "100%", maxHeight: "100%", objectFit: "contain" }} />
            </div>
          </div>

          {/* Column Headers */}
          <div style={{ display: "flex", padding: "0 10px 8px 10px", fontWeight: "bold", color: "#1E3A8A", textTransform: "uppercase", fontSize: "14px", letterSpacing: "0.5px" }}>
            <div style={{ width: "14%", textAlign: "center" }}>WIB</div>
            <div style={{ width: "61%", paddingLeft: "15px" }}>Kemungkinan Cuaca</div>
            <div style={{ width: "25%", paddingLeft: "24px" }}>Parameter</div>
          </div>

          {/* Rows */}
          <div style={{ display: "flex", flexDirection: "column", gap: "0" }}>
            {rows.map((row, i) => {
              const styles = getRowStyles(row.conditionMain || row.conditionSub || "", row.time)
              const mainLine = formatWeatherLine(row.probMain, row.conditionMain)
              const subLine = formatWeatherLine(row.probSub, row.conditionSub)

              const heatIndexDisplay =
                row.heatIndex !== ""
                  ? row.heatIndex
                  : row.temperature !== "" && row.humidity !== ""
                    ? calculateHeatIndexCelsius(row.temperature, row.humidity)
                    : ""

              const heatIndexValue =
                heatIndexDisplay === ""
                  ? "-"
                  : formatValueWithError(heatIndexDisplay, row.heatIndexError, "°C")

              return (
                <div
                  key={i}
                  className="weather-row"
                  style={{
                    backgroundColor: styles.bg,
                    borderLeftColor: styles.accent,
                  }}
                >
                  <div className="col-time-h" style={{ color: styles.text }}>
                    {row.time}
                  </div>

                  <div className="col-icon">
                    {getErikFlowersIcon(row.conditionMain || row.conditionSub || "", row.time, 78, styles.accent)}
                  </div>

                  <div className="col-desc" style={{ color: styles.text }}>
                    <div className="desc-main">{mainLine}</div>
                    {row.probSub && row.conditionSub && row.conditionSub !== row.conditionMain && (
                      <div className="desc-sub">{subLine}</div>
                    )}
                  </div>

                  <div className="col-metrics" style={{ color: styles.text }}>
                    <div className="metric-item">
                      <span className="metric-icon-wrap">
                        <Thermometer size={30} color="#EF4444" />
                      </span>
                      <span className="metric-value">
                        {formatValueWithError(row.temperature, row.temperatureError, "°C")}
                      </span>
                    </div>

                    <div className="metric-item">
                      <span className="metric-icon-wrap">
                        <Droplets size={30} color="#3B82F6" />
                      </span>
                      <span className="metric-value">
                        {formatValueWithError(row.humidity, row.humidityError, "%")}
                      </span>
                    </div>

                    <div className="metric-item">
                      <span className="metric-icon-wrap">
                        <ThermometerSun size={30} color="#F97316" />
                      </span>
                      <span className="metric-value">{heatIndexValue}</span>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>

          <div className="footer">
            <div style={{ display: "flex", gap: "20px" }}>
              <span style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                <Thermometer size={18} color="#EF4444" /> Suhu
              </span>
              <span style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                <Droplets size={18} color="#3B82F6" /> Kelembapan Relatif
              </span>
              <span style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                <ThermometerSun size={18} color="#F97316" /> Indeks Panas
              </span>
              <span style={{ fontStyle: "italic" }}>Prediksi Ini Bersifat Eksperimental</span>
            </div>
            <div>
              <span style={{ opacity: 0.7 }}>Powered by</span> <strong style={{ color: "#1E3A8A" }}>Meteo Sense 3.1.5</strong>
            </div>
            <div>
              <span style={{ opacity: 0.7 }}>Waktu Kirim:</span> <strong style={{ color: "#1E3A8A" }}>{currentTimeStr}</strong>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

// --- HELPER FUNCTIONS ---

const toNumberOrEmpty = (value: string): number | "" => {
  if (value.trim() === "") return ""
  const n = Number(value)
  return Number.isFinite(n) ? n : ""
}

// NOAA heat index (Celsius output)
const calculateHeatIndexCelsius = (tempC: number, rh: number): number => {
  const tF = (tempC * 9) / 5 + 32
  const hiF =
    -42.379 +
    2.04901523 * tF +
    10.14333127 * rh -
    0.22475541 * tF * rh -
    0.00683783 * tF * tF -
    0.05481717 * rh * rh +
    0.00122874 * tF * tF * rh +
    0.00085282 * tF * rh * rh -
    0.00000199 * tF * tF * rh * rh

  const hiC = ((hiF - 32) * 5) / 9
  return Math.round(hiC)
}

const getHeatIndexDisplay = (row: ForecastRow) => {
  if (row.heatIndex !== "") {
    return row.heatIndex
  }
  if (row.temperature !== "" && row.humidity !== "") {
    return calculateHeatIndexCelsius(row.temperature, row.humidity)
  }
  return ""
}

// Add weather options with icons and colors
const weatherOptions: { value: WeatherCondition; label: string; Icon: any; color: string }[] = [
  { value: "Cerah", label: "Cerah", Icon: Sun, color: "#F97316" },
  { value: "Cerah Berawan", label: "Cerah Berawan", Icon: CloudSun, color: "#FB923C" },
  { value: "Berawan", label: "Berawan", Icon: Cloud, color: "#64748B" },
  { value: "Kabut", label: "Kabut", Icon: CloudFog, color: "#94A3B8" },
  { value: "Hujan Ringan", label: "Hujan Ringan", Icon: CloudRain, color: "#60A5FA" },
  { value: "Hujan Sedang", label: "Hujan Sedang", Icon: CloudRain, color: "#3B82F6" },
  { value: "Hujan Lebat", label: "Hujan Lebat", Icon: CloudRain, color: "#6366F1" },
  { value: "Badai Petir", label: "Badai Petir", Icon: CloudLightning, color: "#7C3AED" },
  { value: "Angin Kencang", label: "Angin Kencang", Icon: Wind, color: "#06B6D4" },
]