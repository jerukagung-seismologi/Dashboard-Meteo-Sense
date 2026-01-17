import { collection, addDoc, Timestamp } from "firebase/firestore";
import { db } from "@/lib/ConfigFirebase"; // Mengimpor instance db dari ConfigFirebase

// Definisikan tipe data untuk data observasi agar lebih terstruktur
interface ObservationData {
  waktu: Date;
  pengamatanVisualCuaca: string;
  suhu: number;
  kelembapan: number;
  tekananUdara: number;
  kecepatanAngin: number;
  arahAngin: string;
  curahHujanObs: number;
}

/**
 * Mengirimkan data observasi ke koleksi 'observations' di Firestore.
 * @param data - Objek yang berisi data observasi.
 * @returns Promise yang resolve dengan referensi dokumen jika berhasil.
 */
export const sendObservationData = async (data: ObservationData) => {
  try {
    // Mengonversi Date JavaScript menjadi Firestore Timestamp untuk kompatibilitas
    const dataWithTimestamp = {
      ...data,
      waktu: Timestamp.fromDate(data.waktu),
    };

    // Menambahkan dokumen baru ke koleksi 'observations'
    const docRef = await addDoc(collection(db, "observations"), dataWithTimestamp);
    console.log("Dokumen berhasil ditulis dengan ID: ", docRef.id);
    return docRef;
  } catch (e) {
    console.error("Error menambahkan dokumen: ", e);
    throw e; // Melemparkan error kembali untuk ditangani oleh pemanggil fungsi
  }
};

// Contoh penggunaan fungsi:
/*
const contohData: ObservationData = {
  waktu: new Date(), // Waktu saat ini
  pengamatanVisualCuaca: "Cerah Berawan",
  suhu: 28.5, // dalam Celcius
  kelembapan: 75, // dalam persen
  tekananUdara: 1012, // dalam hPa
  angin: 10, // dalam km/jam
  arahAngin: "Tenggara",
  curahHujan: 0, // dalam mm
};

sendObservationData(contohData)
  .then(() => {
    console.log("Pengiriman data observasi berhasil.");
  })
  .catch((error) => {
    console.error("Gagal mengirim data observasi:", error);
  });
*/