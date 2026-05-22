import { NextResponse } from 'next/server';

const LOCATION = { lat: 19.231915, lon: 105.741713 };

export async function GET() {
  const url = new URL('https://air-quality-api.open-meteo.com/v1/air-quality');
  url.searchParams.set('latitude',  String(LOCATION.lat));
  url.searchParams.set('longitude', String(LOCATION.lon));
  url.searchParams.set('timezone',  'Asia/Bangkok');
  url.searchParams.set(
    'current',
    ['european_aqi', 'pm10', 'pm2_5', 'uv_index'].join(','),
  );

  const res = await fetch(url, { next: { revalidate: 600 } });

  if (!res.ok) {
    return NextResponse.json({ error: 'upstream failed' }, { status: 502 });
  }

  return NextResponse.json(await res.json());
}
