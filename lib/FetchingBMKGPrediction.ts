export interface BMKGOutputData {
  datetime: string;
  t: number;
  tcc: number;
  tp: number;
  weather: number;
  weather_desc: string;
  weather_desc_en: string;
  wd_deg: number;
  wd: string;
  wd_to: string;
  ws: number;
  hu: number;
  vs: number;
  vs_text: string;
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
export async function fetchBMKGData(): Promise<BMKGOutputData[]> {
  try {
    const _fetch: any = (globalThis as any).fetch;
    if (typeof _fetch !== 'function') {
      throw new Error('Fetch API is not available in this runtime.');
    }

    const response = await _fetch('https://api.bmkg.go.id/publik/prakiraan-cuaca?adm4=33.05.05.2009');
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

    const formattedData: BMKGOutputData[] = rawForecasts.map((item: any) => ({
      datetime: String(item?.datetime ?? ''),
      t: Number(item?.t ?? 0),
      tcc: Number(item?.tcc ?? 0),
      tp: Number(item?.tp ?? 0),
      weather: Number(item?.weather ?? 0),
      weather_desc: String(item?.weather_desc ?? ''),
      weather_desc_en: String(item?.weather_desc_en ?? ''),
      wd_deg: Number(item?.wd_deg ?? 0),
      wd: String(item?.wd ?? ''),
      wd_to: String(item?.wd_to ?? ''),
      ws: Number(item?.ws ?? 0),
      hu: Number(item?.hu ?? 0),
      vs: Number(item?.vs ?? 0),
      vs_text: String(item?.vs_text ?? ''),
      time_index: String(item?.time_index ?? ''),
      analysis_date: String(item?.analysis_date ?? ''),
      image: String(item?.image ?? ''),
      utc_datetime: String(item?.utc_datetime ?? ''),
      local_datetime: String(item?.local_datetime ?? ''),
    }));

    return formattedData;
  } catch (error: unknown) {
    console.error("Error fetching BMKG data:", error instanceof Error ? error.message : error);
    return [];
  }
}