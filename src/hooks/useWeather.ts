'use client';

import { useCallback, useEffect, useState } from 'react';
import type { WeatherResponse } from '@/types/weather';

interface UseWeatherReturn {
  data: WeatherResponse | null;
  loading: boolean;
  error: boolean;
  refresh: () => void;
}

export function useWeather(): UseWeatherReturn {
  const [data, setData] = useState<WeatherResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/weather');
      if (!res.ok) throw new Error('fetch failed');
      setData(await res.json());
      setError(false);
    } catch {
      setError(true);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
    const id = setInterval(load, 10 * 60 * 1000);
    return () => clearInterval(id);
  }, [load]);

  return { data, loading, error, refresh: load };
}
