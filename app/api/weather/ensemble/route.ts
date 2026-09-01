// app/api/weather/ensemble/route.ts
import { NextResponse } from 'next/server';

export const revalidate = 600; // Cache for 10 minutes

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const lat = searchParams.get('lat');
  const lon = searchParams.get('lon');
  const model = searchParams.get('model') || 'ecmwf_ifs025'; // ecmwf_ifs025 (50 members) or gfs025 (30 members)

  if (!lat || !lon) {
    return NextResponse.json({ error: 'Latitude and longitude are required' }, { status: 400 });
  }

  const isRefresh = searchParams.get('refresh') === 'true' || searchParams.has('_t') || searchParams.has('force');

  try {
    const url = new URL('https://ensemble-api.open-meteo.com/v1/ensemble');
    url.searchParams.append('latitude', lat);
    url.searchParams.append('longitude', lon);
    url.searchParams.append('hourly', 'temperature_2m,dew_point_2m,surface_pressure');
    url.searchParams.append('models', model);
    url.searchParams.append('forecast_days', '7');
    url.searchParams.append('timezone', 'auto');

    const res = await fetch(url.toString(), isRefresh ? { cache: 'no-store' } : { next: { revalidate: 600 } });

    if (!res.ok) {
      throw new Error(`Open-Meteo Ensemble API error with status: ${res.status}`);
    }

    const data = await res.json();
    const hourly = data.hourly || {};
    const times: string[] = hourly.time || [];
    const timeLen = times.length;

    // Helper to extract and aggregate members for a variable
    const processVariable = (varPrefix: string) => {
      const control: number[] = hourly[varPrefix] || [];
      const memberKeys = Object.keys(hourly).filter(
        (k) => k.startsWith(`${varPrefix}_member`)
      );

      const members: number[][] = memberKeys.map((k) => hourly[k]);
      const memberCount = members.length;

      const means: number[] = [];
      const mins: number[] = [];
      const maxs: number[] = [];
      const p10s: number[] = [];
      const p90s: number[] = [];
      const p25s: number[] = [];
      const p75s: number[] = [];

      for (let t = 0; t < timeLen; t++) {
        const stepVals: number[] = [];
        for (let m = 0; m < memberCount; m++) {
          const val = members[m][t];
          if (val !== undefined && val !== null && !isNaN(val)) {
            stepVals.push(val);
          }
        }

        if (stepVals.length === 0) {
          const cVal = control[t] ?? 0;
          means.push(cVal);
          mins.push(cVal);
          maxs.push(cVal);
          p10s.push(cVal);
          p90s.push(cVal);
          p25s.push(cVal);
          p75s.push(cVal);
          continue;
        }

        stepVals.sort((a, b) => a - b);
        const sum = stepVals.reduce((acc, v) => acc + v, 0);
        const mean = Number((sum / stepVals.length).toFixed(2));
        const min = Number(stepVals[0].toFixed(2));
        const max = Number(stepVals[stepVals.length - 1].toFixed(2));

        const getPercentile = (p: number) => {
          const idx = Math.min(Math.floor(stepVals.length * p), stepVals.length - 1);
          return Number(stepVals[idx].toFixed(2));
        };

        means.push(mean);
        mins.push(min);
        maxs.push(max);
        p10s.push(getPercentile(0.10));
        p90s.push(getPercentile(0.90));
        p25s.push(getPercentile(0.25));
        p75s.push(getPercentile(0.75));
      }

      return {
        memberCount,
        control,
        mean: means,
        min: mins,
        max: maxs,
        p10: p10s,
        p90: p90s,
        p25: p25s,
        p75: p75s,
        members, // raw member array for spaghetti plot
      };
    };

    const temperature = processVariable('temperature_2m');
    const dewPoint = processVariable('dew_point_2m');
    const surfacePressure = processVariable('surface_pressure');

    return NextResponse.json(
      {
        model,
        memberCount: temperature.memberCount,
        times,
        temperature,
        dewPoint,
        surfacePressure,
      },
      {
        headers: {
          'Cache-Control': isRefresh
            ? 'no-store, no-cache, must-revalidate, proxy-revalidate'
            : 'public, s-maxage=600, stale-while-revalidate=1200',
        },
      }
    );
  } catch (error: any) {
    console.error('Ensemble API route error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
