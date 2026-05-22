'use client';

import { useState } from 'react';
import { useWeather } from '@/hooks/useWeather';
import { useAirQuality } from '@/hooks/useAirQuality';
import { getWmoIcon, getWmoDescription } from '@/lib/wmo';
import { getAqiLevel } from '@/types/air-quality';

const DAYS = ['CN', 'T2', 'T3', 'T4', 'T5', 'T6', 'T7'];

function DetailRow({ label, value, valueColor, noBorder }: { label: string; value: string; valueColor?: string; noBorder?: boolean }) {
  return (
    <div className={`flex items-center justify-between py-1.5 ${noBorder ? '' : 'border-b border-divider'}`}>
      <span className="text-muted text-xs">{label}</span>
      <span className="font-semibold text-sm tabular-nums" style={valueColor ? { color: valueColor } : undefined}>{value}</span>
    </div>
  );
}


export default function WeatherCard() {
  const { data, loading, error } = useWeather();
  const { data: aqData } = useAirQuality();
  const [expanded, setExpanded] = useState(false);

  if (loading || error || !data) return null;

  const c   = data.current;
  const d0  = data.daily;
  const aqi = aqData?.current;
  const aqiLevel = aqi ? getAqiLevel(aqi.european_aqi) : null;

  return (
    <div className="card">
      {/* ── Compact row (always visible) ── */}
      <div className="flex items-center justify-between">
        <p className="text-base font-bold">Quỳnh Phương</p>
        <div className="flex items-center gap-2">
          <span className="text-sm text-muted">📍 Hoàng Mai, Nghệ An</span>
          <button
            onClick={() => setExpanded((v) => !v)}
            className="text-muted hover:text-primary transition-colors text-lg leading-none bg-transparent border-none cursor-pointer"
            title={expanded ? 'Thu gọn' : 'Mở rộng'}
          >
            <svg className={`w-4 h-4 transition-transform duration-200 ${expanded ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
          </button>
        </div>
      </div>

      <div className="flex items-center gap-4">
        <span className="text-4xl leading-none">{getWmoIcon(c.weathercode)}</span>
        <div className="flex items-baseline gap-4">
          <p className="text-3xl font-extrabold tabular-nums">{Math.round(c.temperature_2m)}°C</p>
          <p className="text-muted text-sm">{getWmoDescription(c.weathercode)}</p>
        </div>
      </div>

      {/* ── Expanded details ── */}
      {expanded && (
        <>
          <div className="grid grid-cols-2 gap-x-4 border-t border-divider pt-2">
            <DetailRow label="Độ ẩm" value={`${c.relativehumidity_2m}%`} />
            <DetailRow label="Gió"   value={`${c.windspeed_10m} km/h`} />
            <DetailRow label="Mưa"   value={`${c.precipitation} mm`} />
            {aqi && <DetailRow label="UV" value={`${Math.round(aqi.uv_index)}`} />}
            {aqi && aqiLevel && (
              <DetailRow label="AQI" value={`${Math.round(aqi.european_aqi)} ${aqiLevel.label}`} valueColor={aqiLevel.color} noBorder />
            )}
            {aqi && aqiLevel && (
              <DetailRow label="PM2.5 / PM10" value={`${aqi.pm2_5.toFixed(1)} / ${aqi.pm10.toFixed(1)}`} noBorder />
            )}
          </div>

          <div className="flex items-center justify-between border-t border-divider pt-2 text-sm">
            <div className="flex items-center gap-1.5">
              <span>🌅</span>
              <span className="tabular-nums font-semibold">{d0.sunrise[0].slice(11, 16)}</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span>🌇</span>
              <span className="tabular-nums font-semibold">{d0.sunset[0].slice(11, 16)}</span>
            </div>
          </div>

          <div className="flex gap-3 border-t border-divider pt-2">
            {d0.time.slice(1, 5).map((t, i) => {
              const idx  = i + 1;
              const prob = d0.precipitation_probability_max[idx] ?? 0;
              return (
                <div key={t} className="flex-1 flex flex-col items-center gap-0.5 text-xs">
                  <span className="text-muted font-medium">{DAYS[new Date(t).getDay()]}</span>
                  <span className="text-xl">{getWmoIcon(d0.weathercode[idx])}</span>
                  <span className="font-bold">{Math.round(d0.temperature_2m_max[idx])}°</span>
                  <span className="text-muted">{Math.round(d0.temperature_2m_min[idx])}°</span>
                  {prob > 0 && <span className="text-[10px] text-accent">💧{prob}%</span>}
                </div>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}
