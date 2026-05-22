'use client';

import { useCallback, useEffect, useState } from 'react';
import type { CryptoAsset } from '@/types/stock';

interface UseCryptoReturn {
  assets: CryptoAsset[];
  loading: boolean;
  error: boolean;
}

export function useCrypto(): UseCryptoReturn {
  const [assets, setAssets] = useState<CryptoAsset[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  const load = useCallback(async () => {
    try {
      const res = await fetch('/api/crypto');
      if (!res.ok) throw new Error('fetch failed');
      setAssets(await res.json());
      setError(false);
    } catch {
      setError(true);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
    const id = setInterval(load, 60 * 1000);
    return () => clearInterval(id);
  }, [load]);

  return { assets, loading, error };
}
