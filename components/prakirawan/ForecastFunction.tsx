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
import { useAuth } from "@/hooks/useAuth"
import { saveForecast, Forecast, ForecastRowData } from "@/lib/forecastService"
import { ForecastHistoryList } from "./ForecastHistoryList"
import { ForecastDetailModal } from "./ForecastDetailModal"
import { getLucideIconForCondition } from "./WeatherIcons"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
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

// --- GLOBAL NWP & AI ENSEMBLE MODELS FOR CONSENSUS VOTING ---
export const GLOBAL_NWP_MODELS = [
  { id: "ecmwf_ifs", name: "ECMWF IFS", country: "Eropa", category: "Physics NWP" },
  { id: "gfs_seamless", name: "GFS Seamless", country: "Amerika Serikat", category: "Physics NWP" },
  { id: "icon_seamless", name: "ICON Seamless", country: "Jerman", category: "Physics NWP" },
  { id: "gem_seamless", name: "GEM Seamless", country: "Kanada", category: "Physics NWP" },
  { id: "jma_seamless", name: "JMA Seamless", country: "Jepang", category: "Physics NWP" },
  { id: "gfs_graphcast025", name: "Google WeatherNext 2 / GraphCast", country: "Google DeepMind", category: "AI Ensemble" },
  { id: "ecmwf_aifs025", name: "ECMWF AIFS", country: "Eropa (AI)", category: "AI Model" },
] as const

// --- HELPER: WMO CODE & PRECIPITATION TRANSLATOR ---
const translateModelToCondition = (
  code: number,
  precip: number = 0,
  rainProb: number | null = null
): WeatherCondition => {
  // Badai Petir
  if ((code >= 95 && code <= 99) || (code >= 66 && code <= 69)) {
    return "Badai Petir"
  }
  // Hujan Lebat
  if (code === 77 || code === 85 || code === 86 || precip >= 5.0) {
    return "Hujan Lebat"
  }
  // Hujan Sedang
  if ((code >= 61 && code <= 65) || (precip >= 1.0 && precip < 5.0)) {
    return "Hujan Sedang"
  }
  // Hujan Ringan (Drizzle / Showers / Low precip / Rain probability >= 50%)
  if (
    (code >= 51 && code <= 57) ||
    (code >= 80 && code <= 82) ||
    (precip > 0.05 && precip < 1.0) ||
    (rainProb !== null && rainProb >= 50)
  ) {
    return "Hujan Ringan"
  }
  // Kabut
  if (code === 45 || code === 48) {
    return "Kabut"
  }
  // Cerah
  if (code === 0) {
    return "Cerah"
  }
  // Cerah Berawan
  if (code === 1 || code === 2) {
    return "Cerah Berawan"
  }
  // Berawan
  if (code === 3) {
    return "Berawan"
  }

  return "Berawan"
}

// --- HELPER: MULTI-MODEL ENSEMBLE CONSENSUS ENGINE ---
export interface SingleModelPrediction {
  modelId: string
  modelName: string
  condition: WeatherCondition
  temperature: number | null
  humidity: number | null
  precipitation: number
  rainProb: number | null
}

export interface ModelConsensusResult {
  conditionMain: WeatherCondition
  probMain: string
  conditionSub: WeatherCondition | ""
  probSub: string
  temperature: number | ""
  temperatureError: number | ""
  humidity: number | ""
  humidityError: number | ""
  heatIndex: number | ""
  heatIndexError: number | ""
  breakdown: {
    condition: WeatherCondition
    count: number
    percentage: number
    models: string[]
  }[]
}

const calculateMultiModelConsensus = (
  predictions: SingleModelPrediction[]
): ModelConsensusResult => {
  const valid = predictions.filter((p) => p.condition)
  const total = valid.length

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
    }
  }

  // 1. Frekuensi Kondisi Cuaca Tiap Model
  const freqMap: Record<string, { count: number; models: string[] }> = {}
  for (const pred of valid) {
    if (!freqMap[pred.condition]) {
      freqMap[pred.condition] = { count: 0, models: [] }
    }
    freqMap[pred.condition].count += 1
    freqMap[pred.condition].models.push(pred.modelName)
  }

  const sortedVotes = Object.entries(freqMap)
    .map(([condition, data]) => ({
      condition: condition as WeatherCondition,
      count: data.count,
      percentage: Math.round((data.count / total) * 100),
      models: data.models,
    }))
    .sort((a, b) => b.count - a.count)

  const mainVote = sortedVotes[0]
  const conditionMain = mainVote.condition
  const probMain = mainVote.percentage.toString()

  let conditionSub: WeatherCondition | "" = ""
  let probSub = ""

  if (sortedVotes.length > 1 && sortedVotes[1].count > 0) {
    conditionSub = sortedVotes[1].condition
    probSub = sortedVotes[1].percentage.toString()
  }

  // 2. Mean Suhu & Margin Error Dinamis
  const temps = valid
    .map((p) => p.temperature)
    .filter((t): t is number => typeof t === "number" && !isNaN(t))

  let avgTemp: number | "" = ""
  let tempError: number | "" = 2

  if (temps.length > 0) {
    const mean = temps.reduce((a, b) => a + b, 0) / temps.length
    avgTemp = Math.round(mean)
    const maxDiff = Math.max(...temps) - Math.min(...temps)
    tempError = Math.min(5, Math.max(1, Math.round(maxDiff / 2)))
  }

  // 3. Mean Kelembapan & Margin Error Dinamis
  const hums = valid
    .map((p) => p.humidity)
    .filter((h): h is number => typeof h === "number" && !isNaN(h))

  let avgHum: number | "" = ""
  let humError: number | "" = 5

  if (hums.length > 0) {
    const mean = hums.reduce((a, b) => a + b, 0) / hums.length
    avgHum = Math.round(mean)
    const maxDiff = Math.max(...hums) - Math.min(...hums)
    humError = Math.min(15, Math.max(2, Math.round(maxDiff / 2)))
  }

  // 4. Indeks Panas & Error
  let hi: number | "" = ""
  let hiError: number | "" = 2

  if (typeof avgTemp === "number" && typeof avgHum === "number") {
    hi = calculateHeatIndexCelsius(avgTemp, avgHum)
    hiError = Math.round((typeof tempError === "number" ? tempError : 2) * 1.2)
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
  }
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
      temperatureError: 3,
      humidity: "",
      humidityError: 5,
      heatIndex: "",
      heatIndexError: 2,
    }))
  )
  const [location, setLocation] = React.useState<string>("Kebumen")
  const currentLocationName = location || "Kebumen"

  const [forecastSource, setForecastSource] = React.useState<string>("Manual Analysis")
  const [notes, setNotes] = React.useState<string>("")
  const [selectedForecast, setSelectedForecast] = React.useState<Forecast | null>(null)
  const [saving, setSaving] = React.useState(false)

  const { user, profile } = useAuth()
  
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

  const onSaveForecast = async () => {
    if (!currentLocationName || currentLocationName.trim() === "") {
      toast({ title: "Error", description: "Pilih lokasi/kota terlebih dahulu.", variant: "destructive" })
      return
    }

    setSaving(true)
    try {
      const forecastData: Omit<Forecast, "id" | "createdAt" | "version"> = {
        deviceId: "custom",
        deviceName: currentLocationName,
        latitude: KEBUMEN_LAT, // Or get from device
        longitude: KEBUMEN_LON, // Or get from device
        forecastDate: new Date().toISOString().split('T')[0], // For today/tomorrow based on your logic, defaulting to today for demo
        forecasterId: user?.uid || "anonymous",
        forecasterName: profile?.displayName || user?.email || "Unknown Forecaster",
        forecastSource: forecastSource,
        notes: notes,
        status: "published",
        hourlyData: rows.map(r => ({
          time: r.time,
          conditionMain: r.conditionMain,
          probMain: r.probMain,
          conditionSub: r.conditionSub,
          probSub: r.probSub,
          temperature: r.temperature,
          temperatureError: r.temperatureError,
          humidity: r.humidity,
          humidityError: r.humidityError,
          heatIndex: r.heatIndex,
          heatIndexError: r.heatIndexError
        }))
      }

      await saveForecast(forecastData)
      toast({ title: "Berhasil", description: "Prakiraan cuaca berhasil disimpan ke database." })
    } catch (error) {
      console.error("Failed to save forecast", error)
      toast({ title: "Gagal", description: "Gagal menyimpan prakiraan cuaca.", variant: "destructive" })
    } finally {
      setSaving(false)
    }
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
      const fileName = `Outlook_${currentLocationName || "Kota"}_${new Date().toISOString().split('T')[0]}.png`;
      
      link.href = image;
      link.download = fileName;
      link.click();

      toast({ title: "Berhasil!", description: "Gambar tersimpan." });

    } catch (error) {
      console.error("Error generating image:", error);
      toast({ title: "Gagal", description: "Terjadi kesalahan.", variant: "destructive" });
    }
  };

  // --- FETCH FORECAST VIA EDGE ROUTE HANDLER (/api/weather/consensus) ---
  const fetchForecast = async () => {
    if (!currentLocationName || currentLocationName.trim() === "") {
      toast({ title: "Lokasi kosong", description: "Masukkan nama lokasi terlebih dahulu.", variant: "destructive" })
      return
    }
  
    setLoadingFetch(true)
  
    try {
      toast({ 
        title: "Menghubungi Edge Server...", 
        description: "Mengambil konsensus 7 model global (ECMWF, GFS, ICON, GEM, JMA, Google WeatherNext 2, AIFS)..." 
      })

      let lat = KEBUMEN_LAT
      let lon = KEBUMEN_LON
      let locationName = "Kebumen"

      // 1) Geocoding jika bukan Kebumen
      let locQuery = currentLocationName
      if (locQuery.toLowerCase() !== "kebumen") {
        try {
          const geoRes = await fetch(
            `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(locQuery)}&count=1&language=id`
          )
          const geoJson = await geoRes.json()
          
          if (geoJson?.results && geoJson.results.length > 0) {
            const place = geoJson.results[0]
            lat = place.latitude
            lon = place.longitude
            locationName = place.name || currentLocationName
            console.log(`✓ Lokasi ditemukan: ${place.name}, ${place.admin1 || place.country}`)
          } else {
            console.warn(`✗ Lokasi "${locQuery}" tidak ditemukan. Menggunakan Kebumen default.`)
            toast({ 
              title: "Lokasi tidak ditemukan", 
              description: `"${locQuery}" tidak ditemukan. Menggunakan Kebumen sebagai default.`, 
              variant: "destructive" 
            })
          }
        } catch (geoErr) {
          console.error("Geocoding error:", geoErr)
        }
      }

      // 2) Panggil Edge Route Handler terpusat
      const edgeUrl = `/api/weather/consensus?lat=${lat}&lon=${lon}&location=${encodeURIComponent(locationName)}`
      console.log("Fetching consensus from Edge API:", edgeUrl)

      const response = await fetch(edgeUrl)
      if (!response.ok) {
        const errJson = await response.json().catch(() => ({}))
        throw new Error(errJson.error || `HTTP ${response.status}: ${response.statusText}`)
      }

      const data = await response.json()
      if (!data?.rows || !Array.isArray(data.rows)) {
        throw new Error("Format respon konsensus Edge tidak valid.")
      }

      console.log(`✓ Data Konsensus Edge Diterima untuk ${data.location} (${data.forecastDate}):`, data)

      // 3) Update rows form dengan data konsensus yang sudah matang dari Edge
      setRows((prev) =>
        prev.map((r, i) => {
          const f = data.rows[i] || {}
          return {
            ...r,
            time: f.time ?? r.time,
            conditionMain: f.conditionMain ? (f.conditionMain as WeatherCondition) : r.conditionMain,
            probMain: f.probMain ?? r.probMain,
            conditionSub: f.conditionSub !== undefined ? (f.conditionSub as WeatherCondition | "") : r.conditionSub,
            probSub: f.probSub !== undefined ? f.probSub : r.probSub,
            temperature: f.temperature !== undefined && f.temperature !== "" ? (f.temperature as number) : r.temperature,
            temperatureError: f.temperatureError !== undefined && f.temperatureError !== "" ? (f.temperatureError as number) : r.temperatureError,
            humidity: f.humidity !== undefined && f.humidity !== "" ? (f.humidity as number) : r.humidity,
            humidityError: f.humidityError !== undefined && f.humidityError !== "" ? (f.humidityError as number) : r.humidityError,
            heatIndex: f.heatIndex !== undefined && f.heatIndex !== "" ? (f.heatIndex as number) : r.heatIndex,
            heatIndexError: f.heatIndexError !== undefined && f.heatIndexError !== "" ? (f.heatIndexError as number) : r.heatIndexError,
          } as ForecastRow
        })
      )

      setForecastSource("Multi-Model Consensus")

      toast({ 
        title: "✓ Konsensus Multi-Model Selesai", 
        description: `Probabilitas dan parameter cuaca untuk ${tomorrowStr} berhasil dihitung via Edge Route Handler (7 model global).` 
      })

    } catch (err) {
      console.error("❌ fetchForecast error:", err)
      const errorMsg = err instanceof Error ? err.message : "Terjadi kesalahan"
      toast({ 
        title: "Gagal mengambil data", 
        description: `${errorMsg}. Periksa konsol untuk detail.`, 
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
    <div className="space-y-4 max-w-[1200px] mx-auto p-4">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold">Forecaster Tools</h1>
          <p className="text-muted-foreground">Buat dan simpan prakiraan cuaca manual</p>
        </div>
      </div>

      <Tabs defaultValue="input" className="w-full">
        <TabsList className="mb-4">
          <TabsTrigger value="input">Input Prakiraan</TabsTrigger>
          <TabsTrigger value="history">Riwayat Prakiraan</TabsTrigger>
        </TabsList>

        <TabsContent value="input">
          <div className="flex flex-col lg:flex-row gap-6">
            <div className="space-y-4 flex-1">
              <div>
                <h2 className="text-xl font-bold">Input Prakiraan Cuaca</h2>
                <p className="text-muted-foreground">Isi data di bawah untuk menghasilkan tabel outlook grafis.</p>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 bg-slate-50 p-4 rounded-lg border">
                <div className="space-y-1">
                  <label className="text-sm font-semibold">Lokasi / Kota</label>
                  <Input 
                    value={location} 
                    onChange={(e) => setLocation(e.target.value)} 
                    placeholder="Contoh: Kebumen" 
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-sm font-semibold">Sumber Prakiraan</label>
                  <Select value={forecastSource} onValueChange={setForecastSource}>
                    <SelectTrigger>
                      <SelectValue placeholder="Pilih Sumber" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Multi-Model Consensus">Multi-Model + Google WeatherNext Consensus</SelectItem>
                      <SelectItem value="Google WeatherNext 2">Google WeatherNext 2 (DeepMind AI)</SelectItem>
                      <SelectItem value="ECMWF AIFS">ECMWF AIFS (AI Model)</SelectItem>
                      <SelectItem value="ECMWF">ECMWF IFS (Eropa)</SelectItem>
                      <SelectItem value="GFS">NOAA GFS (AS)</SelectItem>
                      <SelectItem value="ICON">DWD ICON (Jerman)</SelectItem>
                      <SelectItem value="Manual Analysis">Manual Analysis</SelectItem>
                      <SelectItem value="Open-Meteo">Open-Meteo (Single Model)</SelectItem>
                      <SelectItem value="Hybrid">Hybrid / Ensemble</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-1 lg:col-span-2">
                  <label className="text-sm font-semibold">Catatan / Diskusi Prakirawan</label>
                  <Textarea 
                    value={notes} 
                    onChange={(e) => setNotes(e.target.value)} 
                    placeholder="Tuliskan analisis cuaca di sini..." 
                    className="h-10 resize-none"
                  />
                </div>
              </div>
            </div>
            
            <div className="flex flex-col gap-2 md:max-w-[200px]">
                <Button variant="default" size="sm" onClick={addRow} className="bg-blue-600 hover:bg-blue-700 w-full"><Plus className="w-4 h-4 mr-1"/> Tambah Jam</Button>
                <Button variant="default" size="sm" onClick={fetchForecast} className="bg-indigo-600 hover:bg-indigo-700 w-full" disabled={loadingFetch}>
                  <DatabaseZap className="w-4 h-4 mr-1"/> {loadingFetch ? "Mengambil..." : "Ambil Otomatis"}
                </Button>
                <Button variant="default" size="sm" onClick={onSaveAsImage} className="bg-green-600 hover:bg-green-700 w-full">
                  <Download className="w-4 h-4 mr-1"/> Unduh Gambar
                </Button>
                <Button onClick={onSaveForecast} disabled={saving} className="w-full mt-4 bg-indigo-600 hover:bg-indigo-700">
                  <Save className="w-4 h-4 mr-1"/> {saving ? "Menyimpan..." : "Simpan Prakiraan"}
                </Button>
            </div>
          </div>
        </TabsContent>

        <TabsContent value="history">
          <ForecastHistoryList onViewDetail={setSelectedForecast} />
        </TabsContent>
      </Tabs>
      
      <ForecastDetailModal forecast={selectedForecast} onClose={() => setSelectedForecast(null)} />

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
              <div className="header-title">{currentLocationName || "Nama Kota"}</div>
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
  { value: "Hujan Ringan", label: "Hujan Ringan", Icon: CloudDrizzle, color: "#60A5FA" },
  { value: "Hujan Sedang", label: "Hujan Sedang", Icon: CloudRain, color: "#3B82F6" },
  { value: "Hujan Lebat", label: "Hujan Lebat", Icon: CloudRain, color: "#6366F1" },
  { value: "Badai Petir", label: "Badai Petir", Icon: CloudLightning, color: "#7C3AED" },
  { value: "Angin Kencang", label: "Angin Kencang", Icon: Wind, color: "#06B6D4" },
]