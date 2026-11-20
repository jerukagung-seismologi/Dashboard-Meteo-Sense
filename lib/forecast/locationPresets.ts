export const KEBUMEN_LAT = -7.7366;
export const KEBUMEN_LON = 109.6458;

export interface LocationPreset {
  name: string;
  region: string;
  lat: number;
  lon: number;
}

// Preset kota & stasiun meteorologi populer di Indonesia untuk 1-klik pemilihan
export const INDONESIA_POPULAR_LOCATIONS: LocationPreset[] = [
  { name: "Kebumen", region: "Jawa Tengah (Stasiun Utama)", lat: -7.7366, lon: 109.6458 },
  { name: "Semarang", region: "Jawa Tengah", lat: -6.9667, lon: 110.4167 },
  { name: "Yogyakarta", region: "DI Yogyakarta", lat: -7.7956, lon: 110.3695 },
  { name: "Surakarta (Solo)", region: "Jawa Tengah", lat: -7.5755, lon: 110.8243 },
  { name: "Cilacap", region: "Jawa Tengah (Pantai Selatan)", lat: -7.7167, lon: 109.0167 },
  { name: "Purwokerto", region: "Jawa Tengah (Banyumas)", lat: -7.4244, lon: 109.2306 },
  { name: "Jakarta", region: "DKI Jakarta", lat: -6.2088, lon: 106.8456 },
  { name: "Bandung", region: "Jawa Barat", lat: -6.9175, lon: 107.6191 },
  { name: "Surabaya", region: "Jawa Timur", lat: -7.2575, lon: 112.7521 },
  { name: "Malang", region: "Jawa Timur", lat: -7.9797, lon: 112.6304 },
  { name: "Denpasar", region: "Bali", lat: -8.6705, lon: 115.2126 },
  { name: "Medan", region: "Sumatera Utara", lat: 3.5952, lon: 98.6722 },
  { name: "Palembang", region: "Sumatera Selatan", lat: -2.9761, lon: 104.7754 },
  { name: "Makassar", region: "Sulawesi Selatan", lat: -5.1476, lon: 119.4327 },
  { name: "Balikpapan", region: "Kalimantan Timur (IKN)", lat: -1.2654, lon: 116.8312 },
  { name: "Pontianak", region: "Kalimantan Barat", lat: -0.0263, lon: 109.3425 },
  { name: "Kupang", region: "Nusa Tenggara Timur", lat: -10.1772, lon: 123.607 },
  { name: "Jayapura", region: "Papua", lat: -2.5337, lon: 140.7181 },
];

export async function searchOpenMeteoLocations(query: string): Promise<any[]> {
  const q = query.trim();
  if (q.length < 2) return [];

  // 1. Try internal geocode cache
  try {
    const res = await fetch(`/api/reanalysis/geocode?name=${encodeURIComponent(q)}`);
    if (res.ok) {
      const data = await res.json();
      if (Array.isArray(data.results) && data.results.length > 0) {
        return data.results;
      }
    }
  } catch {
    // fallback to direct Open-Meteo
  }

  // 2. Direct Open-Meteo Geocoding
  try {
    const directRes = await fetch(
      `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(q)}&count=10&language=id&format=json`
    );
    if (directRes.ok) {
      const directData = await directRes.json();
      return directData.results || [];
    }
  } catch (err) {
    console.error("Geocoding search error:", err);
  }

  return [];
}
