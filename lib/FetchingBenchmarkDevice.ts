// lib/FetchingBenchmarkDevice.ts
import {
  collection,
  doc,
  getDocs,
  getDoc,
  setDoc,
  updateDoc,
  deleteDoc,
  query,
  serverTimestamp,
} from "firebase/firestore"
import { db } from "@/lib/ConfigFirebase"
import { KEBUMEN_DEFAULT_STATIONS } from "@/lib/data/kebumenStations"

export interface BenchmarkDevice {
  id: string
  name: string
  location: string
  lat: number
  lng: number
  temp: number
  hum: number
  pressure: number
  rainfall: number
  rainrate?: number
  windSpeed?: number
  status: "online" | "offline"
  batteryVolt?: number
  lastUpdate?: string
  createdAt?: string
  updatedAt?: string
}

const COLLECTION_NAME = "benchmarkdevices"

/**
 * Fetch all benchmark devices from Firestore
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
        temp: typeof data.temp === "number" ? data.temp : 29.0,
        hum: typeof data.hum === "number" ? data.hum : 75,
        pressure: typeof data.pressure === "number" ? data.pressure : 1012,
        rainfall: typeof data.rainfall === "number" ? data.rainfall : 0.0,
        rainrate: typeof data.rainrate === "number" ? data.rainrate : 0.0,
        windSpeed: typeof data.windSpeed === "number" ? data.windSpeed : 6.0,
        status: data.status === "offline" ? "offline" : "online",
        batteryVolt: typeof data.batteryVolt === "number" ? data.batteryVolt : 4.1,
        lastUpdate: data.lastUpdate || "Tersimpan di Cloud",
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
 * Add a new benchmark device to Firestore
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
    temp: Number(deviceData.temp ?? 29.0),
    hum: Number(deviceData.hum ?? 75),
    pressure: Number(deviceData.pressure ?? 1012),
    rainfall: Number(deviceData.rainfall ?? 0.0),
    rainrate: Number(deviceData.rainrate ?? 0.0),
    windSpeed: Number(deviceData.windSpeed ?? 6.0),
    status: deviceData.status || "online",
    batteryVolt: Number(deviceData.batteryVolt ?? 4.1),
    lastUpdate: "Baru saja",
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
 * Seed benchmark devices to Firestore if the collection is empty.
 * Returns the active list of devices.
 */
export async function seedBenchmarkDevicesIfEmpty(): Promise<BenchmarkDevice[]> {
  try {
    const existing = await fetchBenchmarkDevices()
    if (existing.length > 0) {
      return existing
    }

    // Collection is empty, bulk seed default Kebumen stations
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
        temp: station.temp ?? 29.0,
        hum: station.hum ?? 75,
        pressure: station.pressure ?? 1012,
        rainfall: station.rainfall ?? 0.0,
        rainrate: station.rainrate ?? 0.0,
        windSpeed: station.windSpeed ?? 6.0,
        status: station.status || "online",
        batteryVolt: station.batteryVolt ?? 4.1,
        lastUpdate: "Seeded",
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
 * Force bulk seed/reset all default Kebumen stations into Firestore
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
      temp: station.temp ?? 29.0,
      hum: station.hum ?? 75,
      pressure: station.pressure ?? 1012,
      rainfall: station.rainfall ?? 0.0,
      rainrate: station.rainrate ?? 0.0,
      windSpeed: station.windSpeed ?? 6.0,
      status: station.status || "online",
      batteryVolt: station.batteryVolt ?? 4.1,
      lastUpdate: "Seeded",
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
