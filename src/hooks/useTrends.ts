'use client';

import { useCallback, useEffect, useState } from 'react';
import type { TrendItem } from '@/types/trends';

interface UseTrendsReturn {
  items: TrendItem[];
  loading: boolean;
  error: boolean;
  refresh: () => void;
}

export function useTrends(): UseTrendsReturn {
  const [items, setItems]     = useState<TrendItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/trends');
      if (!res.ok) throw new Error();
      setItems(await res.json());
      setError(false);
    } catch {
      setError(true);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
    const id = setInterval(load, 60 * 60 * 1000); // refresh every hour
    return () => clearInterval(id);
  }, [load]);

  return { items, loading, error, refresh: load };
}
