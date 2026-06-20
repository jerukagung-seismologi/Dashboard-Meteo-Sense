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
  serverTimestamp,
  Timestamp,
} from "firebase/firestore";
import { db } from "@/lib/ConfigFirebase";

export type ForecastStatus = "draft" | "published" | "archived";

export interface ForecastRowData {
  time: string;
  conditionMain: string;
  probMain: string;
  conditionSub: string;
  probSub: string;
  temperature: number | "";
  temperatureError: number | "";
  humidity: number | "";
  humidityError: number | "";
  heatIndex: number | "";
  heatIndexError: number | "";
}

export interface Forecast {
  id?: string;
  deviceId: string;
  deviceName: string;
  latitude: number;
  longitude: number;
  createdAt?: Timestamp | Date | any;
  forecastDate: string; // YYYY-MM-DD
  forecasterId: string;
  forecasterName: string;
  forecastSource: string;
  notes: string;
  hourlyData: ForecastRowData[];
  status: ForecastStatus;
  version: number;
  parentForecastId?: string;
}

const FORECASTS_COLLECTION = "forecasts";

export async function saveForecast(forecast: Omit<Forecast, "id" | "createdAt" | "version">): Promise<string> {
  const forecastsRef = collection(db, FORECASTS_COLLECTION);
  
  // Check for existing forecast for this device and date to determine version
  const q = query(
    forecastsRef,
    where("deviceId", "==", forecast.deviceId),
    where("forecastDate", "==", forecast.forecastDate),
    orderBy("createdAt", "desc")
  );

  const querySnapshot = await getDocs(q);
  let nextVersion = 1;
  let parentForecastId = null;

  if (!querySnapshot.empty) {
    const latestDoc = querySnapshot.docs[0];
    const latestData = latestDoc.data() as Forecast;
    nextVersion = (latestData.version || 1) + 1;
    parentForecastId = latestDoc.id;
  }

  const docRef = await addDoc(forecastsRef, {
    ...forecast,
    version: nextVersion,
    parentForecastId: parentForecastId,
    createdAt: serverTimestamp(),
  });

  return docRef.id;
}

export async function getForecastHistory(filters?: { deviceId?: string }): Promise<Forecast[]> {
  const forecastsRef = collection(db, FORECASTS_COLLECTION);
  
  let q = query(forecastsRef, orderBy("createdAt", "desc"), limit(50));
  
  if (filters?.deviceId && filters.deviceId !== "ALL") {
    q = query(forecastsRef, where("deviceId", "==", filters.deviceId), orderBy("createdAt", "desc"), limit(50));
  }

  const querySnapshot = await getDocs(q);
  const forecasts: Forecast[] = [];
  querySnapshot.forEach((doc) => {
    forecasts.push({ id: doc.id, ...doc.data() } as Forecast);
  });

  return forecasts;
}

export async function getForecastById(id: string): Promise<Forecast | null> {
  const docRef = doc(db, FORECASTS_COLLECTION, id);
  const docSnap = await getDoc(docRef);

  if (docSnap.exists()) {
    return { id: docSnap.id, ...docSnap.data() } as Forecast;
  } else {
    return null;
  }
}

export async function deleteForecast(id: string): Promise<void> {
  const docRef = doc(db, FORECASTS_COLLECTION, id);
  await deleteDoc(docRef);
}
