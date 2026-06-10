import { NextResponse } from 'next/server';

export const revalidate = 300; // Cache for 5 minutes

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const lat = searchParams.get('lat');
  const lon = searchParams.get('lon');

  if (!lat || !lon) {
    return NextResponse.json({ error: 'Latitude and longitude are required' }, { status: 400 });
  }

  try {
    const url = new URL('https://api.open-meteo.com/v1/forecast');
    url.searchParams.append('latitude', lat);
    url.searchParams.append('longitude', lon);
    
    // Current Conditions
    url.searchParams.append('current', 'temperature_2m,relative_humidity_2m,precipitation,rain,wind_speed_10m,wind_direction_10m,cloud_cover,shortwave_radiation,surface_pressure');
    
    // Hourly Conditions (Next 7 Days)
    url.searchParams.append('hourly', 'temperature_2m,relative_humidity_2m,dew_point_2m,precipitation,et0_fao_evapotranspiration,soil_temperature_0cm,soil_temperature_18cm,soil_moisture_0_to_1cm,soil_moisture_9_to_27cm,shortwave_radiation,cloud_cover');
    
    // Daily Conditions (Next 7 Days)
    url.searchParams.append('daily', 'temperature_2m_max,temperature_2m_min,precipitation_sum,et0_fao_evapotranspiration_sum,shortwave_radiation_sum,sunshine_duration');
    
    // Timezone
    url.searchParams.append('timezone', 'auto');

    const res = await fetch(url.toString(), {
      next: { revalidate: 300 }
    });

    if (!res.ok) {
      throw new Error(`Open-Meteo returned status: ${res.status}`);
    }

    const data = await res.json();
    return NextResponse.json(data);
  } catch (error: any) {
    console.error("Open-Meteo API Error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
