export interface Stock {
  ticker: string;
  name: string;
  price: string;
  change: string;
  direction: 'up' | 'down';
}

export interface MarketIndex {
  label: string;
  value: string;
  change: string;
  direction: 'up' | 'down';
}

export interface CryptoAsset {
  id: string;
  symbol: string;
  name: string;
  icon: string;
  price: number;
  change24h: number;
}
