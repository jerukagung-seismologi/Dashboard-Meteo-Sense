// app/api/weather/consensus/route.ts
import { NextResponse } from "next/server"

export const dynamic = "force-dynamic"
export const revalidate = 300 // Cache 5 menit di level server / CDN

// --- GLOBAL NWP & AI ENSEMBLE MODELS ---
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
] as const

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

const TARGET_HOURS = ["07:00", "10:00", "13:00", "16:00", "19:00"]

// --- HELPER: WMO CODE & PRECIPITATION TRANSLATOR ---
function translateModelToCondition(
  code: number,
  precip: number = 0,
  rainProb: number | null = null
): WeatherCondition {
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

// NOAA Heat Index (Celsius output)
function calculateHeatIndexCelsius(tempC: number, rh: number): number {
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

interface SingleModelPrediction {
  modelId: string
  modelName: string
  condition: WeatherCondition
  temperature: number | null
  humidity: number | null
  precipitation: number
  rainProb: number | null
}

function calculateMultiModelConsensus(predictions: SingleModelPrediction[]) {
  const valid = predictions.filter((p) => p.condition)
  const total = valid.length

  if (total === 0) {
    return {
      conditionMain: "Berawan" as WeatherCondition,
      probMain: "80",
      conditionSub: "" as WeatherCondition | "",
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

  // Helper prob rounding ke kelipatan 10 standar (10, 20, 30, ..., 100)
  const toStandardProb = (count: number, totalModels: number): string => {
    if (count <= 0 || totalModels <= 0) return ""
    const exact = (count / totalModels) * 100
    const rounded = Math.min(100, Math.max(10, Math.round(exact / 10) * 10))
    return rounded.toString()
  }

  const sortedVotes = Object.entries(freqMap)
    .map(([condition, data]) => ({
      condition: condition as WeatherCondition,
      count: data.count,
      percentage: Math.round((data.count / total) * 100),
      models: data.models,
    }))
    .sort((a, b) => b.count - a.count)

  // Kondisi Utama (Peringkat 1 dari Ensemble)
  const mainVote = sortedVotes[0]
  const conditionMain = mainVote.condition
  const probMain = toStandardProb(mainVote.count, total)

  // Kondisi Kedua / Tambahan (Peringkat 2 dari Ensemble jika ada suara alternatif)
  let conditionSub: WeatherCondition | "" = ""
  let probSub = ""

  if (sortedVotes.length > 1 && sortedVotes[1].count > 0) {
    conditionSub = sortedVotes[1].condition
    probSub = toStandardProb(sortedVotes[1].count, total)
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

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const latStr = searchParams.get("lat") || "-7.7366"
  const lonStr = searchParams.get("lon") || "109.6458"
  const locationName = searchParams.get("location") || "Kebumen"
  const targetDateInput = searchParams.get("date")

  const lat = parseFloat(latStr)
  const lon = parseFloat(lonStr)

  if (isNaN(lat) || isNaN(lon)) {
    return NextResponse.json(
      { error: "Latitude dan longitude harus berupa angka valid." },
      { status: 400 }
    )
  }

  try {
    // 1. Tentukan tanggal target (WIB / GMT+7)
    let targetDateStr = targetDateInput
    const nowWib = new Date()
    const todayWibStr = nowWib.toLocaleDateString("en-CA", { timeZone: "Asia/Bangkok" })

    if (!targetDateStr || targetDateStr === "tomorrow") {
      const tomorrow = new Date()
      tomorrow.setDate(tomorrow.getDate() + 1)
      targetDateStr = tomorrow.toLocaleDateString("en-CA", { timeZone: "Asia/Bangkok" })
    } else if (targetDateStr === "today") {
      targetDateStr = todayWibStr
    } else if (targetDateStr === "dayAfter") {
      const dayAfter = new Date()
      dayAfter.setDate(dayAfter.getDate() + 2)
      targetDateStr = dayAfter.toLocaleDateString("en-CA", { timeZone: "Asia/Bangkok" })
    }

    // 2. Fetch Multi-Model Forecast dari Open-Meteo dengan start_date & end_date spesifik
    const modelIds = GLOBAL_NWP_MODELS.map((m) => m.id).join(",")
    const params = new URLSearchParams({
      latitude: lat.toString(),
      longitude: lon.toString(),
      hourly: "temperature_2m,relative_humidity_2m,weather_code,precipitation_probability,precipitation",
      models: modelIds,
      timezone: "Asia/Bangkok",
      start_date: targetDateStr,
      end_date: targetDateStr,
    })

    const refresh = searchParams.get("refresh") === "true" || searchParams.has("_t") || searchParams.has("force");

    // Header resmi untuk menghindari rate-limit / DDoS block di cloud serverless (Vercel/AWS)
    const fetchHeaders = {
      "User-Agent": "MeteoSense-Dashboard/4.0 (https://github.com/evanalif113/Dashboard-Meteo-Sense)",
      "Accept": "application/json",
    }

    const forecastUrl = `https://api.open-meteo.com/v1/forecast?${params.toString()}`
    let response: Response | null = null
    let usedModels = [...GLOBAL_NWP_MODELS]

    try {
      response = await fetch(forecastUrl, {
        headers: fetchHeaders,
        cache: refresh ? "no-store" : "default",
        next: { revalidate: 300 },
      })
    } catch (fetchErr: any) {
      console.warn("Primary 10-model fetch failed on cloud worker:", fetchErr?.message)
    }

    // Fallback otomatis ke 5 model inti jika 10 model diblokir/gagal di platform serverless
    if (!response || !response.ok) {
      console.warn("Retrying with core 5 NWP models fallback...")
      const coreModelIds = "ecmwf_ifs,gfs_seamless,icon_seamless,jma_seamless,cma_grapes_global"
      const fallbackParams = new URLSearchParams({
        latitude: lat.toString(),
        longitude: lon.toString(),
        hourly: "temperature_2m,relative_humidity_2m,weather_code,precipitation_probability,precipitation",
        models: coreModelIds,
        timezone: "Asia/Bangkok",
        start_date: targetDateStr,
        end_date: targetDateStr,
      })
      const fallbackUrl = `https://api.open-meteo.com/v1/forecast?${fallbackParams.toString()}`
      response = await fetch(fallbackUrl, {
        headers: fetchHeaders,
        cache: "no-store",
      })
      usedModels = GLOBAL_NWP_MODELS.filter((m) =>
        ["ecmwf_ifs", "gfs_seamless", "icon_seamless", "jma_seamless", "cma_grapes_global"].includes(m.id)
      )
    }

    if (!response.ok) {
      const errText = await response.text()
      let friendlyMsg = `Open-Meteo API status ${response.status}: ${errText}`
      try {
        const parsedErr = JSON.parse(errText)
        if (parsedErr.reason && parsedErr.reason.includes("out of allowed range")) {
          friendlyMsg = `Data prakiraan cuaca hanya tersedia hingga 15 hari ke depan. Tanggal ${targetDateStr} berada di luar jangkauan model prediksi.`
        }
      } catch {}
      throw new Error(friendlyMsg)
    }

    const fcJson = await response.json()
    if (!fcJson?.hourly?.time) {
      throw new Error("Struktur data Open-Meteo tidak valid.")
    }

    const times: string[] = fcJson.hourly.time || []

    // 3. Helper Index Matcher (Robust for both exact and prefix match)
    const findIndexFor = (targetTime: string): number => {
      const targetPrefix = `${targetDateStr}T${targetTime}`
      const exactIdx = times.findIndex((t) => t === targetPrefix || t.startsWith(targetPrefix))
      if (exactIdx !== -1) return exactIdx

      const targetDateTime = new Date(`${targetDateStr}T${targetTime}:00`)
      let bestIdx = -1
      let bestDiff = Infinity

      for (let i = 0; i < times.length; i++) {
        const forecastDateTime = new Date(times[i])
        const forecastDate = times[i].split("T")[0]
        const diff = Math.abs(forecastDateTime.getTime() - targetDateTime.getTime())

        if (diff < bestDiff && forecastDate === targetDateStr) {
          bestDiff = diff
          bestIdx = i
        }
      }

      return bestIdx
    }

    // 4. Kalkulasi Consensus Voting untuk setiap target waktu
    const hourlyResults = TARGET_HOURS.map((targetTime) => {
      const idx = findIndexFor(targetTime)

      if (idx === -1) {
        return {
          time: targetTime,
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
          modelPredictions: [],
          votingBreakdown: [],
        }
      }

      const modelPredictions: SingleModelPrediction[] = usedModels.map((m) => {
        const rawTemp = fcJson.hourly[`temperature_2m_${m.id}`]?.[idx] ?? 
                        (m.id === "ecmwf_aifs025_single" ? fcJson.hourly[`temperature_2m_ecmwf_aifs025`]?.[idx] : undefined) ??
                        fcJson.hourly.temperature_2m?.[idx]
        const rawHum = fcJson.hourly[`relative_humidity_2m_${m.id}`]?.[idx] ?? 
                       (m.id === "ecmwf_aifs025_single" ? fcJson.hourly[`relative_humidity_2m_ecmwf_aifs025`]?.[idx] : undefined) ??
                       fcJson.hourly.relative_humidity_2m?.[idx]
        const rawCode = fcJson.hourly[`weather_code_${m.id}`]?.[idx] ?? 
                        (m.id === "ecmwf_aifs025_single" ? fcJson.hourly[`weather_code_ecmwf_aifs025`]?.[idx] : undefined) ??
                        fcJson.hourly.weather_code?.[idx]
        const rawPrecip = fcJson.hourly[`precipitation_${m.id}`]?.[idx] ?? 
                          (m.id === "ecmwf_aifs025_single" ? fcJson.hourly[`precipitation_ecmwf_aifs025`]?.[idx] : undefined) ??
                          fcJson.hourly.precipitation?.[idx] ?? 0
        const rawRainProb = fcJson.hourly[`precipitation_probability_${m.id}`]?.[idx] ?? 
                            (m.id === "ecmwf_aifs025_single" ? fcJson.hourly[`precipitation_probability_ecmwf_aifs025`]?.[idx] : undefined) ??
                            null

        const temp = typeof rawTemp === "number" && !isNaN(rawTemp) ? rawTemp : null
        const hum = typeof rawHum === "number" && !isNaN(rawHum) ? rawHum : null
        const code = typeof rawCode === "number" && !isNaN(rawCode) ? rawCode : null
        const precip = typeof rawPrecip === "number" && !isNaN(rawPrecip) ? rawPrecip : 0
        const rainProb = typeof rawRainProb === "number" && !isNaN(rawRainProb) ? rawRainProb : null

        // Hanya hitung kondisi cuaca jika kode cuaca model valid (bukan null)
        const condition = code !== null ? translateModelToCondition(code, precip, rainProb) : null

        return {
          modelId: m.id,
          modelName: `${m.name} (${m.country})`,
          condition: condition as WeatherCondition,
          temperature: temp,
          humidity: hum,
          precipitation: precip,
          rainProb,
        }
      }).filter((p) => p.condition !== null && p.temperature !== null)

      const consensus = calculateMultiModelConsensus(modelPredictions)

      return {
        time: targetTime,
        conditionMain: consensus.conditionMain,
        probMain: consensus.probMain,
        conditionSub: consensus.conditionSub,
        probSub: consensus.probSub,
        temperature: consensus.temperature,
        temperatureError: consensus.temperatureError,
        humidity: consensus.humidity,
        humidityError: consensus.humidityError,
        heatIndex: consensus.heatIndex,
        heatIndexError: consensus.heatIndexError,
        modelPredictions,
        votingBreakdown: consensus.breakdown,
      }
    })

    return NextResponse.json(
      {
        success: true,
        location: locationName,
        coordinates: { latitude: lat, longitude: lon },
        forecastDate: targetDateStr,
        generatedAt: new Date().toISOString(),
        modelsUsed: usedModels,
        rows: hourlyResults,
      },
      {
        headers: {
          "Cache-Control": refresh
            ? "no-store, no-cache, must-revalidate, proxy-revalidate"
            : "public, s-maxage=300, stale-while-revalidate=600",
        },
      }
    )
  } catch (error: any) {
    console.error("Error in /api/weather/consensus:", error)
    return NextResponse.json(
      { error: error?.message || "Internal server error saat mengambil konsensus cuaca" },
      { status: 500 }
    )
  }
}
