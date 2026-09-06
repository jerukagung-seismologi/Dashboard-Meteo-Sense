// lib/FetchingBenchmarkDevice.ts
import {
  collection,
  doc,
  getDocs,
  setDoc,
  updateDoc,
  deleteDoc,
  query,
  serverTimestamp,
} from "firebase/firestore"
import { db } from "@/lib/ConfigFirebase"
import { KEBUMEN_DEFAULT_STATIONS } from "@/lib/data/kebumenStations"
import { SensorDataPoint } from "@/components/peta/OneHourTrendChart"

export interface BenchmarkDevice {
  id: string
  name: string
  location: string
  lat: number
  lng: number
  status: "online" | "offline"
  createdAt?: string
  updatedAt?: string
}

export interface LiveBenchmarkWeather {
  temp: number
  hum: number
  pressure: number
  rainfall: number
  rainrate: number
  windSpeed: number
  batteryVolt: number
  lastUpdate: string
  history1h: SensorDataPoint[]
}

const COLLECTION_NAME = "benchmarkdevices"

/**
 * Fetch all benchmark station metadata from Firestore (name, location, lat, lng, status)
 */
export async function fetchBenchmarkDevices(): Promise<BenchmarkDevice[]> {
  try {
    const colRef = collection(db, COLLECTION_NAME)
    const snapshot = await getDocs(query(colRef))

    if (snapshot.empty) {
      return []
    }

    const devices: BenchmarkDevice[] = []
    snapshot.forEach((docSnap) => {
      const data = docSnap.data()
      devices.push({
        id: docSnap.id,
        name: data.name || "Stasiun Benchmark",
        location: data.location || "Kabupaten Kebumen",
        lat: typeof data.lat === "number" ? data.lat : -7.685,
        lng: typeof data.lng === "number" ? data.lng : 109.655,
        status: data.status === "offline" ? "offline" : "online",
        createdAt: data.createdAt,
        updatedAt: data.updatedAt,
      })
    })

    return devices
  } catch (error) {
    console.error("Error fetching benchmark devices from Firestore:", error)
    return []
  }
}

/**
 * Add a new benchmark device to Firestore (only metadata, no weather values)
 */
export async function addBenchmarkDevice(
  deviceData: Omit<BenchmarkDevice, "id"> & { customId?: string }
): Promise<BenchmarkDevice> {
  const customId = deviceData.customId?.trim()
  const slugId = customId
    ? customId.toLowerCase().replace(/[^a-z0-9-_]/g, "-")
    : `stasiun-${deviceData.name.toLowerCase().replace(/[^a-z0-9]/g, "-")}-${Date.now().toString(36)}`

  const docRef = doc(db, COLLECTION_NAME, slugId)
  const now = new Date().toISOString()

  const newDevice: BenchmarkDevice = {
    id: slugId,
    name: deviceData.name.trim(),
    location: deviceData.location.trim(),
    lat: Number(deviceData.lat),
    lng: Number(deviceData.lng),
    status: deviceData.status || "online",
    createdAt: now,
    updatedAt: now,
  }

  await setDoc(docRef, {
    ...newDevice,
    serverCreatedAt: serverTimestamp(),
  })

  return newDevice
}

/**
 * Update an existing benchmark device in Firestore
 */
export async function updateBenchmarkDevice(
  id: string,
  deviceData: Partial<BenchmarkDevice>
): Promise<void> {
  const docRef = doc(db, COLLECTION_NAME, id)
  const now = new Date().toISOString()

  const cleanData: Record<string, any> = {
    ...deviceData,
    updatedAt: now,
    serverUpdatedAt: serverTimestamp(),
  }
  delete cleanData.id // ID should not be updated

  await updateDoc(docRef, cleanData)
}

/**
 * Delete a benchmark device from Firestore
 */
export async function deleteBenchmarkDevice(id: string): Promise<void> {
  const docRef = doc(db, COLLECTION_NAME, id)
  await deleteDoc(docRef)
}

/**
 * Seed benchmark station metadata to Firestore if empty.
 */
export async function seedBenchmarkDevicesIfEmpty(): Promise<BenchmarkDevice[]> {
  try {
    const existing = await fetchBenchmarkDevices()
    if (existing.length > 0) {
      return existing
    }

    console.info("Firestore benchmarkdevices is empty. Seeding default Kebumen stations...")
    const seededList: BenchmarkDevice[] = []

    for (const station of KEBUMEN_DEFAULT_STATIONS) {
      const docRef = doc(db, COLLECTION_NAME, station.id)
      const now = new Date().toISOString()
      const device: BenchmarkDevice = {
        id: station.id,
        name: station.name,
        location: station.location || "Kabupaten Kebumen",
        lat: station.lat,
        lng: station.lng,
        status: station.status || "online",
        createdAt: now,
        updatedAt: now,
      }

      await setDoc(docRef, {
        ...device,
        serverCreatedAt: serverTimestamp(),
      })
      seededList.push(device)
    }

    return seededList
  } catch (error) {
    console.error("Error seeding benchmark devices:", error)
    return []
  }
}

/**
 * Force bulk seed/reset all default Kebumen stations into Firestore (metadata only)
 */
export async function bulkSeedBenchmarkDevices(): Promise<number> {
  let count = 0
  const now = new Date().toISOString()

  for (const station of KEBUMEN_DEFAULT_STATIONS) {
    const docRef = doc(db, COLLECTION_NAME, station.id)
    const device: BenchmarkDevice = {
      id: station.id,
      name: station.name,
      location: station.location || "Kabupaten Kebumen",
      lat: station.lat,
      lng: station.lng,
      status: station.status || "online",
      createdAt: now,
      updatedAt: now,
    }

    await setDoc(docRef, {
      ...device,
      serverCreatedAt: serverTimestamp(),
    }, { merge: true })

    count++
  }

  return count
}

/**
 * Live Fetch real-time ECMWF / ERA5 atmospheric data for multiple stations in a single batch API call.
 * Retrieves current temperature, humidity, surface pressure, precipitation, wind speed,
 * and up to 24 hours of real atmospheric time series points.
 */
export async function fetchLiveERA5WeatherForStations(
  stations: { id: string; lat: number; lng: number }[]
): Promise<Record<string, LiveBenchmarkWeather>> {
  if (!stations || stations.length === 0) return {}

  try {
    const lats = stations.map((s) => s.lat.toFixed(4)).join(",")
    const lngs = stations.map((s) => s.lng.toFixed(4)).join(",")

    const url = `https://api.open-meteo.com/v1/forecast?latitude=${lats}&longitude=${lngs}&current=temperature_2m,relative_humidity_2m,surface_pressure,precipitation,wind_speed_10m&hourly=temperature_2m,relative_humidity_2m,surface_pressure,precipitation,wind_speed_10m&past_hours=24&forecast_hours=1&timezone=Asia%2FBangkok`

    const response = await fetch(url)
    if (!response.ok) {
      throw new Error(`Open-Meteo HTTP error ${response.status}`)
    }

    const data = await response.json()
    const results: Record<string, LiveBenchmarkWeather> = {}

    // Open-Meteo returns an array if multiple locations, or single object if only 1 location
    const locationsData = Array.isArray(data) ? data : [data]

    stations.forEach((station, index) => {
      const loc = locationsData[index]
      if (loc && loc.current) {
        const cur = loc.current
        const hourly = loc.hourly || {}

        // Construct 1h history (last 16 points) from hourly series
        const times: string[] = hourly.time || []
        const temps: number[] = hourly.temperature_2m || []
        const hums: number[] = hourly.relative_humidity_2m || []
        const pressures: number[] = hourly.surface_pressure || []
        const rains: number[] = hourly.precipitation || []
        const winds: number[] = hourly.wind_speed_10m || []

        const history1h: SensorDataPoint[] = []

        const total = times.length
        const sliceCount = Math.min(16, total)
        const startIndex = Math.max(0, total - sliceCount)

        for (let i = startIndex; i < total; i++) {
          const tStr = times[i]
          const d = new Date(tStr)
          const timeFormatted = isNaN(d.getTime())
            ? tStr.substring(11, 16) || "--:--"
            : d.toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit", hour12: false })

          history1h.push({
            time: timeFormatted,
            timestamp: !isNaN(d.getTime()) ? d.getTime() : Date.now() - (total - i) * 3600 * 1000,
            temperature: typeof temps[i] === "number" ? Number(temps[i].toFixed(1)) : cur.temperature_2m,
            humidity: typeof hums[i] === "number" ? Math.round(hums[i]) : cur.relative_humidity_2m,
            pressure: typeof pressures[i] === "number" ? Number(pressures[i].toFixed(1)) : cur.surface_pressure,
            rainfall: typeof rains[i] === "number" ? Number(rains[i].toFixed(1)) : 0,
            rainrate: 0,
            windSpeed: typeof winds[i] === "number" ? Number(winds[i].toFixed(1)) : cur.wind_speed_10m,
          })
        }

        results[station.id] = {
          temp: typeof cur.temperature_2m === "number" ? Number(cur.temperature_2m.toFixed(1)) : 29.0,
          hum: typeof cur.relative_humidity_2m === "number" ? Math.round(cur.relative_humidity_2m) : 75,
          pressure: typeof cur.surface_pressure === "number" ? Number(cur.surface_pressure.toFixed(1)) : 1012.0,
          rainfall: typeof cur.precipitation === "number" ? Number(cur.precipitation.toFixed(1)) : 0.0,
          rainrate: 0.0,
          windSpeed: typeof cur.wind_speed_10m === "number" ? Number(cur.wind_speed_10m.toFixed(1)) : 6.0,
          batteryVolt: 4.15,
          lastUpdate: "Live ERA5/ECMWF",
          history1h,
        }
      } else {
        // Fallback if data missing
        results[station.id] = {
          temp: 29.0,
          hum: 75,
          pressure: 1012.0,
          rainfall: 0.0,
          rainrate: 0.0,
          windSpeed: 6.0,
          batteryVolt: 4.1,
          lastUpdate: "ERA5 Standby",
          history1h: [],
        }
      }
    })

    return results
  } catch (err) {
    console.error("Error fetching live ERA5 weather for stations:", err)
    return {}
  }
}
