'use client';

import { useCrypto } from '@/hooks/useCrypto';
import { MARKET_INDICES, STOCKS } from '@/data/stocks';
import type { CryptoAsset, MarketIndex, Stock } from '@/types/stock';

function DirectionText({ direction, children }: { direction: 'up' | 'down'; children: React.ReactNode }) {
  return (
    <span className={direction === 'up' ? 'text-rise' : 'text-fall'}>
      {children}
    </span>
  );
}

function IndexBox({ item }: { item: MarketIndex }) {
  return (
    <div className="bg-surface rounded-xl p-3 flex items-center justify-between">
      <div>
        <p className="text-[11px] text-muted mb-0.5">{item.label}</p>
        <p className="text-lg font-extrabold tabular-nums">
          <DirectionText direction={item.direction}>{item.value}</DirectionText>
        </p>
      </div>
      <DirectionText direction={item.direction}>
        <span className="text-xs font-semibold">{item.change}</span>
      </DirectionText>
    </div>
  );
}

function StockRow({ stock }: { stock: Stock }) {
  return (
    <div className="flex items-center gap-3 px-3 py-2.5 bg-surface rounded-xl text-sm">
      <span className="font-bold w-12 shrink-0">{stock.ticker}</span>
      <span className="text-muted flex-1 truncate">{stock.name}</span>
      <span className="font-bold tabular-nums">{stock.price}₫</span>
      <DirectionText direction={stock.direction}>
        <span className="text-xs font-semibold w-16 text-right block">
          {stock.direction === 'up' ? '▲' : '▼'} {stock.change}
        </span>
      </DirectionText>
    </div>
  );
}

function CryptoRow({ asset }: { asset: CryptoAsset }) {
  const direction = asset.change24h >= 0 ? 'up' : 'down';
  return (
    <div className="flex items-center gap-3 px-3 py-2.5 bg-surface rounded-xl text-sm">
      <span className="text-lg w-7 text-center shrink-0">{asset.icon}</span>
      <span className="font-semibold flex-1">{asset.name}</span>
      <span className="font-bold tabular-nums">
        ${asset.price.toLocaleString('en-US')}
      </span>
      <DirectionText direction={direction}>
        <span className="text-xs font-semibold w-16 text-right block">
          {direction === 'up' ? '▲' : '▼'} {Math.abs(asset.change24h).toFixed(2)}%
        </span>
      </DirectionText>
    </div>
  );
}

function Spinner() {
  return <div className="h-5 w-5 rounded-full border-2 border-divider border-t-accent animate-spin" />;
}

export default function StocksCard() {
  const { assets, loading } = useCrypto();
  const updatedAt = new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' });

  return (
    <div className="card h-full">
      <div className="section-label">
        📈 Thị trường chứng khoán
        <span className="ml-auto normal-case font-normal">Cập nhật {updatedAt}</span>
      </div>

      {/* Market indices */}
      <div className="grid grid-cols-3 gap-3">
        {MARKET_INDICES.map((idx) => (
          <IndexBox key={idx.label} item={idx} />
        ))}
      </div>

      {/* VN stocks */}
      <div className="section-label mt-1">🇻🇳 Cổ phiếu Việt Nam</div>
      <div className="flex flex-col gap-2">
        {STOCKS.map((s) => (
          <StockRow key={s.ticker} stock={s} />
        ))}
      </div>

      {/* Crypto */}
      <div className="section-label mt-1">₿ Crypto</div>
      {loading ? (
        <div className="flex justify-center py-4">
          <Spinner />
        </div>
      ) : (
        <div className="flex flex-col gap-2">
          {assets.map((a) => (
            <CryptoRow key={a.id} asset={a} />
          ))}
        </div>
      )}
    </div>
  );
}
