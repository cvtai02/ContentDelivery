import { NextResponse } from 'next/server';
import type { CryptoAsset } from '@/types/stock';

const CRYPTO_CONFIG = [
  { id: 'bitcoin',      symbol: 'BTC', name: 'Bitcoin',  icon: '₿' },
  { id: 'ethereum',     symbol: 'ETH', name: 'Ethereum', icon: 'Ξ' },
  { id: 'binancecoin',  symbol: 'BNB', name: 'BNB',      icon: '⬡' },
  { id: 'solana',       symbol: 'SOL', name: 'Solana',   icon: '◎' },
] as const;

export async function GET() {
  const ids = CRYPTO_CONFIG.map((c) => c.id).join(',');
  const url = `https://api.coingecko.com/api/v3/simple/price?ids=${ids}&vs_currencies=usd&include_24hr_change=true`;

  const res = await fetch(url, { next: { revalidate: 60 } });

  if (!res.ok) {
    return NextResponse.json({ error: 'upstream failed' }, { status: 502 });
  }

  const raw: Record<string, { usd: number; usd_24h_change: number }> = await res.json();

  const assets: CryptoAsset[] = CRYPTO_CONFIG.map((cfg) => ({
    id:        cfg.id,
    symbol:    cfg.symbol,
    name:      cfg.name,
    icon:      cfg.icon,
    price:     raw[cfg.id]?.usd ?? 0,
    change24h: raw[cfg.id]?.usd_24h_change ?? 0,
  }));

  return NextResponse.json(assets);
}
