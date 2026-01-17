export interface BMKGOutputData {
  tanggal: string; // Tanggal ISO
  suhu: number; // Suhu dalam Celsius
  tutupanAwan: number; // Tutupan awan dalam persentase
  curahHujan: number; // Curah hujan dalam mm
  kodeCuaca: number; // Kode cuaca
  weather_desc: string; // Deskripsi cuaca dalam bahasa Indonesia
  weather_desc_en: string; // Deskripsi cuaca dalam bahasa Inggris
  derajatAngin: number; // Arah angin dalam derajat
  asalAngin: string; // Arah angin asal
  tujuAngin: string; // Arah angin tujuan
  kecepatanAngin: number; // Kecepatan angin dalam km/jam
  kelembapan: number; // Kelembapan dalam persentase
  visual: number;
  visualText: string;
  time_index: string;
  analysis_date: string;
  image: string;
  utc_datetime: string;
  local_datetime: string;
}

// Helper: deep flatten arrays of unknown nesting depth
function deepFlatten(arr: any[]): any[] {
  return arr.reduce((acc: any[], v: any) => {
    if (Array.isArray(v)) return acc.concat(deepFlatten(v));
    acc.push(v);
    return acc;
  }, []);
}

// Fetch and normalize BMKG response into flat BMKGOutputData[]
export async function fetchBMKGData(areaCode: string = '33.05.15.2009'): Promise<BMKGOutputData[]> {
  try {
    const _fetch: any = (globalThis as any).fetch;
    if (typeof _fetch !== 'function') {
      throw new Error('Fetch API is not available in this runtime.');
    }

    const response = await _fetch(`https://api.bmkg.go.id/publik/prakiraan-cuaca?adm4=${areaCode}`);
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const json = await response.json();

    // The correct API shape: { lokasi, data: [ { lokasi, cuaca: [ [ {...} ], [ {...} ], ... ] } ] }
    if (!Array.isArray(json?.data)) {
      console.error("Unexpected API response structure:", json);
      return [];
    }

    // Collect all cuaca groups from each data entry, then deep-flatten to get forecast objects
    const cuacaGroups: any[] = json.data.flatMap((entry: any) =>
      Array.isArray(entry?.cuaca) ? entry.cuaca : []
    );
    const rawForecasts: any[] = deepFlatten(cuacaGroups);

    const formattedData: BMKGOutputData[] = rawForecasts.map((cuacaBmkg: any) => ({
      tanggal: String(cuacaBmkg?.datetime ?? ''),
      suhu: Number(cuacaBmkg?.t ?? 0),
      tutupanAwan: Number(cuacaBmkg?.tcc ?? 0),
      curahHujan: Number(cuacaBmkg?.tp ?? 0),
      kodeCuaca: Number(cuacaBmkg?.weather ?? 0),
      weather_desc: String(cuacaBmkg?.weather_desc ?? ''),
      weather_desc_en: String(cuacaBmkg?.weather_desc_en ?? ''),
      derajatAngin: Number(cuacaBmkg?.wd_deg ?? 0),
      asalAngin: String(cuacaBmkg?.wd ?? ''),
      tujuAngin: String(cuacaBmkg?.wd_to ?? ''),
      kecepatanAngin: Number(cuacaBmkg?.ws ?? 0),
      kelembapan: Number(cuacaBmkg?.hu ?? 0),
      visual: Number(cuacaBmkg?.vs ?? 0),
      visualText: String(cuacaBmkg?.vs_text ?? ''),
      time_index: String(cuacaBmkg?.time_index ?? ''),
      analysis_date: String(cuacaBmkg?.analysis_date ?? ''),
      image: String(cuacaBmkg?.image ?? ''),
      utc_datetime: String(cuacaBmkg?.utc_datetime ?? ''),
      local_datetime: String(cuacaBmkg?.local_datetime ?? ''),
    }));

    return formattedData;
  } catch (error: unknown) {
    console.error("Error fetching BMKG data:", error instanceof Error ? error.message : error);
    return [];
  }
}