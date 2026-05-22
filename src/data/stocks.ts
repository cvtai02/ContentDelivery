import type { MarketIndex, Stock } from '@/types/stock';

export const MARKET_INDICES: MarketIndex[] = [
  { label: 'VN-Index',  value: '1,272.45', change: '▲ 0.82%', direction: 'up'   },
  { label: 'HNX-Index', value: '226.31',   change: '▲ 0.45%', direction: 'up'   },
  { label: 'S&P 500',   value: '5,117.09', change: '▼ 0.34%', direction: 'down' },
];

export const STOCKS: Stock[] = [
  { ticker: 'VIC', name: 'Vingroup',       price: '44.500',  change: '+1.12%', direction: 'up'   },
  { ticker: 'VHM', name: 'Vinhomes',       price: '32.700',  change: '-0.60%', direction: 'down' },
  { ticker: 'VCB', name: 'Vietcombank',    price: '81.900',  change: '+0.74%', direction: 'up'   },
  { ticker: 'TCB', name: 'Techcombank',    price: '22.450',  change: '+2.05%', direction: 'up'   },
  { ticker: 'HPG', name: 'Hòa Phát Group', price: '25.100',  change: '-0.40%', direction: 'down' },
  { ticker: 'FPT', name: 'FPT Corp',       price: '133.000', change: '+1.53%', direction: 'up'   },
];
