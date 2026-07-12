import app from "@/lib/ConfigFirebase";
import { getFirestore, doc, getDoc, setDoc } from "firebase/firestore/lite";
import { StationCalibrationDocument, StationCalibrationDocumentSchema } from "./calibrationTypes";

const dbLite = getFirestore(app);
const COLLECTION_NAME = "sensor_calibration";

/**
 * Fetches the calibration document for a given station ID.
 */
export async function getCalibrationDocument(stationId: string): Promise<StationCalibrationDocument | null> {
  try {
    const docRef = doc(dbLite, COLLECTION_NAME, stationId);
    const docSnap = await getDoc(docRef);

    if (docSnap.exists()) {
      const data = docSnap.data();
      // Validate schema
      const result = StationCalibrationDocumentSchema.safeParse(data);
      if (result.success) {
        return result.data;
      } else {
        console.error(`Invalid calibration schema for station ${stationId}:`, result.error);
        return null;
      }
    }
    return null;
  } catch (error) {
    console.error(`Error fetching calibration for station ${stationId}:`, error);
    return null;
  }
}

/**
 * Saves or updates a calibration document for a station.
 */
export async function saveCalibrationDocument(
  stationId: string, 
  config: StationCalibrationDocument
): Promise<void> {
  try {
    // Ensure payload conforms to schema before saving
    const validConfig = StationCalibrationDocumentSchema.parse(config);
    const docRef = doc(dbLite, COLLECTION_NAME, stationId);
    
    // We do not use 'merge: true' because we want to explicitly overwrite the variables.
    await setDoc(docRef, validConfig);
  } catch (error) {
    console.error(`Error saving calibration for station ${stationId}:`, error);
    throw error;
  }
}
