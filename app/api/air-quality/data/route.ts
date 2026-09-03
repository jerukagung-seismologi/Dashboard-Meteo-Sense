// app/api/air-quality/data/route.ts
import { NextResponse } from 'next/server';

export const revalidate = 600; // Cache for 10 minutes

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const lat = searchParams.get('lat') || '-6.2088'; // Default Jakarta
  const lon = searchParams.get('lon') || '106.8456';

  const isRefresh = searchParams.get('refresh') === 'true' || searchParams.has('_t') || searchParams.has('force');

  try {
    const url = new URL('https://air-quality-api.open-meteo.com/v1/air-quality');
    url.searchParams.append('latitude', lat);
    url.searchParams.append('longitude', lon);
    
    // Current Conditions
    url.searchParams.append(
      'current',
      'european_aqi,us_aqi,pm10,pm2_5,carbon_monoxide,carbon_dioxide,nitrogen_dioxide,sulphur_dioxide,ozone,aerosol_optical_depth,dust,uv_index'
    );
    
    // Hourly Conditions (7 Days / 168 Hours)
    url.searchParams.append(
      'hourly',
      'pm10,pm2_5,carbon_monoxide,carbon_dioxide,nitrogen_dioxide,sulphur_dioxide,ozone,aerosol_optical_depth,dust,uv_index,european_aqi,us_aqi'
    );
    
    // Timezone
    url.searchParams.append('timezone', 'auto');
    url.searchParams.append('forecast_days', '7');

    const res = await fetch(url.toString(), isRefresh ? { cache: 'no-store' } : { next: { revalidate: 600 } });

    if (!res.ok) {
      throw new Error(`Open-Meteo Air Quality API returned status: ${res.status}`);
    }

    const data = await res.json();

    // Compute AQI category and health impact
    const aqi = data.current?.us_aqi ?? 50;
    let aqiCategory = "Baik";
    let aqiColor = "emerald";
    let aqiDescription = "Kualitas udara sangat baik dan tidak berisiko bagi kesehatan.";

    if (aqi > 300) {
      aqiCategory = "Berbahaya (Hazardous)";
      aqiColor = "purple";
      aqiDescription = "Peringatan darurat kesehatan! Seluruh populasi terdampak risiko serius.";
    } else if (aqi > 200) {
      aqiCategory = "Sangat Tidak Sehat";
      aqiColor = "rose";
      aqiDescription = "Kondisi sangat tidak sehat. Hindari semua aktivitas luar ruangan.";
    } else if (aqi > 150) {
      aqiCategory = "Tidak Sehat (Unhealthy)";
      aqiColor = "red";
      aqiDescription = "Dapat memicu gangguan pernapasan bagi masyarakat umum dan kelompok sensitif.";
    } else if (aqi > 100) {
      aqiCategory = "Tidak Sehat bagi Kelompok Sensitif";
      aqiColor = "amber";
      aqiDescription = "Penderita asma, lansia, dan anak-anak disarankan mengurangi aktivitas luar ruang.";
    } else if (aqi > 50) {
      aqiCategory = "Sedang (Moderate)";
      aqiColor = "yellow";
      aqiDescription = "Kualitas udara dapat diterima, namun sedikit berisiko bagi orang yang sangat sensitif.";
    }

    const result = {
      ...data,
      summary: {
        aqi,
        category: aqiCategory,
        color: aqiColor,
        description: aqiDescription,
      },
    };

    return NextResponse.json(result, {
      headers: {
        'Cache-Control': isRefresh
          ? 'no-store, no-cache, must-revalidate, proxy-revalidate'
          : 'public, s-maxage=600, stale-while-revalidate=1200',
      },
    });
  } catch (error: any) {
    console.error("Air Quality API Error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
