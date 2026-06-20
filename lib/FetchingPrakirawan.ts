import {
  collection,
  doc,
  getDocs,
  getDoc,
  setDoc,
  addDoc,
  updateDoc,
  deleteDoc,
  query,
  where,
  orderBy,
  limit,
} from "firebase/firestore";
import { db } from "@/lib/ConfigFirebase";

export interface ForecastRecord {
  id?: string;
  deviceId: string;
  deviceName: string;
  createdAt: number;
  updatedAt: number;
  forecastTime: number;
  predictionMethod: string;
  rainProbability: number;
  rainfallForecast: number;
  temperatureForecast: number;
  humidityForecast: number;
  windSpeedForecast: number;
  windDirectionForecast: number;
  pressureForecast: number;
  notes?: string;
  generatedBy?: string;
}

const COLLECTION_NAME = "prakirawan";

export async function saveForecast(forecast: Omit<ForecastRecord, "id" | "createdAt" | "updatedAt">): Promise<string> {
  const forecastsRef = collection(db, COLLECTION_NAME);
  
  const now = Date.now();
  const docRef = await addDoc(forecastsRef, {
    ...forecast,
    createdAt: now,
    updatedAt: now,
  });

  return docRef.id;
}

export async function getForecasts(): Promise<ForecastRecord[]> {
  const forecastsRef = collection(db, COLLECTION_NAME);
  const q = query(forecastsRef, orderBy("createdAt", "desc"), limit(50));

  const querySnapshot = await getDocs(q);
  const forecasts: ForecastRecord[] = [];
  querySnapshot.forEach((doc) => {
    forecasts.push({ id: doc.id, ...doc.data() } as ForecastRecord);
  });

  return forecasts;
}

export async function getForecastById(id: string): Promise<ForecastRecord | null> {
  const docRef = doc(db, COLLECTION_NAME, id);
  const docSnap = await getDoc(docRef);

  if (docSnap.exists()) {
    return { id: docSnap.id, ...docSnap.data() } as ForecastRecord;
  } else {
    return null;
  }
}

export async function updateForecast(id: string, data: Partial<ForecastRecord>): Promise<void> {
  const docRef = doc(db, COLLECTION_NAME, id);
  await updateDoc(docRef, {
    ...data,
    updatedAt: Date.now(),
  });
}

export async function deleteForecast(id: string): Promise<void> {
  const docRef = doc(db, COLLECTION_NAME, id);
  await deleteDoc(docRef);
}
