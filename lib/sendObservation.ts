import { 
  collection, 
  addDoc, 
  getDocs, 
  getDoc, 
  updateDoc, 
  deleteDoc, 
  doc, 
  Timestamp, 
  GeoPoint,
  query,
  orderBy,
  limit
} from "firebase/firestore";
import { db } from "@/lib/ConfigFirebase"; 

// --- TYPE DEFINITIONS ---

// 1. Tipe data mentah untuk INPUT (saat bikin laporan)
export interface CitizenReportInput {
  waktu: Date;
  alamat?: string;
  intensitasHujan: "Tidak Hujan" | "Gerimis" | "Sedang" | "Lebat" | "Badai";
  kondisiAngin: "Tenang" | "Sepoi-sepoi" | "Kencang" | "Ekstrem";
  dampak: string[];
  lokasi: { 
    latitude: number; 
    longitude: number 
  };
  fotoBuktiUrl?: string;
  catatan?: string;
  userId?: string; // Opsional: kalau nanti ada login
}

// 2. Tipe data matang dari OUTPUT Firestore (sudah punya ID)
export interface CitizenReport extends CitizenReportInput {
  id: string;
}

// --- 1. CREATE (Membuat Laporan) ---
export const createReport = async (data: CitizenReportInput) => {
  try {
    const payload = {
      ...data,
      waktu: Timestamp.fromDate(data.waktu), // Convert JS Date -> Firestore Timestamp
      lokasi: new GeoPoint(data.lokasi.latitude, data.lokasi.longitude), // Convert -> GeoPoint
    };

    const docRef = await addDoc(collection(db, "citizen_reports"), payload);
    return docRef.id;
  } catch (error) {
    console.error("Error creating report:", error);
    throw error;
  }
};

// --- 2. READ (Mengambil Data) ---

// A. Ambil SEMUA laporan (misal: untuk peta atau list di dashboard)
export const getAllReports = async (): Promise<CitizenReport[]> => {
  try {
    // Kita urutkan dari yang terbaru (descending)
    const q = query(collection(db, "citizen_reports"), orderBy("waktu", "desc"));
    const querySnapshot = await getDocs(q);

    // Mapping data Firestore ke format aplikasi kita
    const reports: CitizenReport[] = querySnapshot.docs.map((doc) => {
      const data = doc.data();
      return {
        id: doc.id,
        ...data,
        // Konversi balik: Firestore Timestamp -> JS Date
        waktu: (data.waktu as Timestamp).toDate(), 
        // Konversi balik: GeoPoint -> {lat, long}
        lokasi: { 
          latitude: data.lokasi.latitude, 
          longitude: data.lokasi.longitude 
        },
      } as CitizenReport;
    });

    return reports;
  } catch (error) {
    console.error("Error fetching reports:", error);
    throw error;
  }
};

// B. Ambil SATU laporan detail (misal: pas diklik di peta)
export const getReportById = async (id: string): Promise<CitizenReport | null> => {
  try {
    const docRef = doc(db, "citizen_reports", id);
    const docSnap = await getDoc(docRef);

    if (docSnap.exists()) {
      const data = docSnap.data();
      return {
        id: docSnap.id,
        ...data,
        waktu: (data.waktu as Timestamp).toDate(),
        lokasi: { 
          latitude: data.lokasi.latitude, 
          longitude: data.lokasi.longitude 
        },
      } as CitizenReport;
    } else {
      console.log("No such document!");
      return null;
    }
  } catch (error) {
    console.error("Error fetching report details:", error);
    throw error;
  }
};

// --- 3. UPDATE (Mengedit Laporan) ---
// Gunakan Partial<> karena kita mungkin cuma mau edit sebagian field aja
export const updateReport = async (id: string, data: Partial<CitizenReportInput>) => {
  try {
    const docRef = doc(db, "citizen_reports", id);
    
    // Siapkan payload, cek dulu apakah ada field 'waktu' atau 'lokasi' yang diubah
    const payload: any = { ...data };
    
    if (data.waktu) {
      payload.waktu = Timestamp.fromDate(data.waktu);
    }
    if (data.lokasi) {
      payload.lokasi = new GeoPoint(data.lokasi.latitude, data.lokasi.longitude);
    }

    await updateDoc(docRef, payload);
    return true; // Berhasil update
  } catch (error) {
    console.error("Error updating report:", error);
    throw error;
  }
};

// --- 4. DELETE (Menghapus Laporan) ---
export const deleteReport = async (id: string) => {
  try {
    const docRef = doc(db, "citizen_reports", id);
    await deleteDoc(docRef);
    return true; // Berhasil hapus
  } catch (error) {
    console.error("Error deleting report:", error);
    throw error;
  }
};