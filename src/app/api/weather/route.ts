import { NextResponse } from 'next/server';

const LOCATION = { lat: 19.231915, lon: 105.741713 };

export async function GET() {
  const url = new URL('https://api.open-meteo.com/v1/forecast');
  url.searchParams.set('latitude',  String(LOCATION.lat));
  url.searchParams.set('longitude', String(LOCATION.lon));
  url.searchParams.set('timezone',  'Asia/Bangkok');
  url.searchParams.set('forecast_days', '5');
  url.searchParams.set(
    'current',
    [
      'temperature_2m',
      'apparent_temperature',
      'weathercode',
      'windspeed_10m',
      'relativehumidity_2m',
      'visibility',
      'precipitation',
      'is_day',
    ].join(','),
  );
  url.searchParams.set(
    'daily',
    [
      'weathercode',
      'temperature_2m_max',
      'temperature_2m_min',
      'sunrise',
      'sunset',
      'uv_index_max',
      'precipitation_probability_max',
      'precipitation_sum',
    ].join(','),
  );

  const res = await fetch(url, { next: { revalidate: 600 } });

  if (!res.ok) {
    return NextResponse.json({ error: 'upstream failed' }, { status: 502 });
  }

  return NextResponse.json(await res.json());
}
