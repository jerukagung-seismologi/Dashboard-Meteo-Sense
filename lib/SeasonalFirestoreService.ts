import { db as firestore } from "./ConfigFirebase";
import { doc, getDoc, collection, getDocs } from "firebase/firestore";

export interface SeasonDataset {
  metadata?: any;
  overlays?: any[];
  hujan?: any[];
  kemarau?: any[];
}

const catalogCache = new Map<string, any>();
const seasonDataCache = new Map<string, any>();

/**
 * Mengambil data master katalog musim dari Cloud Firestore
 * dengan fallback otomatis ke /data/<kabupaten>/musim_catalog.json jika offline/gagal.
 */
export async function getSeasonalCatalog(kabupaten: string = "kebumen"): Promise<any> {
  const kab = (kabupaten || "kebumen").toLowerCase();
  if (catalogCache.has(kab)) return catalogCache.get(kab);

  const collectionName = `musim_${kab}`;
  try {
    const docRef = doc(firestore, collectionName, "catalog");
    const snap = await getDoc(docRef);
    if (snap.exists()) {
      const data = snap.data();
      catalogCache.set(kab, data);
      return data;
    }
  } catch (err) {
    console.warn(`[Firestore] Gagal memuat katalog ${kab} dari Firestore, menggunakan fallback JSON:`, err);
  }

  // Fallback ke berkas lokal modular per kabupaten
  const fallbackPath = `/data/${kab}/musim_catalog.json`;
  let res = await fetch(fallbackPath);
  if (!res.ok) {
    // Backward compatibility fallback jika file berada di root
    res = await fetch("/data/musim_catalog.json");
  }
  if (!res.ok) throw new Error(`Gagal mengambil master katalog musim untuk ${kab}.`);
  const data = await res.json();
  catalogCache.set(kab, data);
  return data;
}

/**
 * Mengambil data musim (aktif 2026/2027 maupun 26 tahun arsip 2000–2025) langsung dari Cloud Firestore
 * dengan rekonstruksi otomatis untuk dataset kecamatan dan desa.
 * Dilengkapi graceful fallback ganda ke berkas JSON lokal.
 */
export async function getSeasonData(
  seasonId = "2026_2027",
  folder = "",
  kabupaten: string = "kebumen"
): Promise<{
  kecDataset: SeasonDataset;
  desaDataset: SeasonDataset;
  source: "firestore" | "fallback_json";
}> {
  const kab = (kabupaten || "kebumen").toLowerCase();
  const cacheKey = `${kab}_${seasonId}_${folder}`;
  if (seasonDataCache.has(cacheKey)) {
    return seasonDataCache.get(cacheKey);
  }

  let result: {
    kecDataset: SeasonDataset;
    desaDataset: SeasonDataset;
    source: "firestore" | "fallback_json";
  };

  const collectionName = `musim_${kab}`;

  try {
    const seasonDocRef = doc(firestore, collectionName, seasonId);
    const seasonSnap = await getDoc(seasonDocRef);

    if (seasonSnap.exists()) {
      const overview = seasonSnap.data();
      const kecColRef = collection(firestore, collectionName, seasonId, "kecamatan");
      const kecSnaps = await getDocs(kecColRef);

      if (!kecSnaps.empty) {
        const hujanKec: any[] = [];
        const kemarauKec: any[] = [];
        const hujanDesa: any[] = [];
        const kemarauDesa: any[] = [];

        kecSnaps.forEach((d) => {
          const chunk = d.data();
          if (chunk.hujan && Object.keys(chunk.hujan).length > 0) {
            hujanKec.push(chunk.hujan);
          }
          if (chunk.kemarau && Object.keys(chunk.kemarau).length > 0) {
            kemarauKec.push(chunk.kemarau);
          }
          if (Array.isArray(chunk.desa_hujan)) {
            hujanDesa.push(...chunk.desa_hujan);
          }
          if (Array.isArray(chunk.desa_kemarau)) {
            kemarauDesa.push(...chunk.desa_kemarau);
          }
        });

        const kecDataset: SeasonDataset = {
          metadata: overview.metadata,
          overlays: overview.overlays,
          hujan: hujanKec,
          kemarau: kemarauKec,
        };

        const desaDataset: SeasonDataset = {
          metadata: overview.metadata,
          hujan: hujanDesa,
          kemarau: kemarauDesa,
        };

        result = {
          kecDataset,
          desaDataset,
          source: "firestore",
        };
        seasonDataCache.set(cacheKey, result);
        return result;
      }
    }
  } catch (err) {
    console.warn(`[Firestore] Gagal memuat musim ${seasonId} (${kab}) dari Firestore, beralih ke fallback JSON statis:`, err);
  }

  // Fallback ganda ke API route modular atau JSON statis lokal modular per kabupaten
  const kabBase = `/data/${kab}`;
  const basePath = folder ? `${kabBase}/${folder}` : kabBase;
  const [kecRes, desaRes] = await Promise.all([
    fetch(`${basePath}/prediksi_musim.json`),
    fetch(`/api/seasonal/villages?kabupaten=${kab}&type=tabular`)
      .then((r) => (r.ok ? r : null))
      .catch(() => null)
      .then(async (apiRes) => {
        if (apiRes) return apiRes;
        return fetch(`${basePath}/prediksi_musim_desa.json`).catch(() => null);
      }),
  ]);

  if (!kecRes.ok) throw new Error(`Gagal memuat dataset prediksi musim (${seasonId}) untuk ${kab}.`);
  const kecDataset = await kecRes.json();
  const desaDataset = desaRes && desaRes.ok ? await desaRes.json() : null;

  result = {
    kecDataset,
    desaDataset,
    source: "fallback_json",
  };
  seasonDataCache.set(cacheKey, result);
  return result;
}

/** Alias untuk kompatibilitas ke belakang */
export const getActiveSeasonData = getSeasonData;
