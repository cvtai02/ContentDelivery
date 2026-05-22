'use client';

import { useCallback, useEffect, useState } from 'react';
import type { AirQualityResponse } from '@/types/air-quality';

interface UseAirQualityReturn {
  data: AirQualityResponse | null;
  loading: boolean;
  error: boolean;
}

export function useAirQuality(): UseAirQualityReturn {
  const [data, setData] = useState<AirQualityResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  const load = useCallback(async () => {
    try {
      const res = await fetch('/api/air-quality');
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

  return { data, loading, error };
}
