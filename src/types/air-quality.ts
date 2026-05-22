export interface AirQualityCurrent {
  european_aqi: number;
  pm10: number;
  pm2_5: number;
  uv_index: number;
}

export interface AirQualityResponse {
  current: AirQualityCurrent;
}

export type AqiLevel = {
  label: string;
  color: string;
  bg: string;
};

export function getAqiLevel(aqi: number): AqiLevel {
  if (aqi <= 20)  return { label: 'Rất tốt',   color: '#38d9a9', bg: '#0d2b23' };
  if (aqi <= 40)  return { label: 'Tốt',        color: '#a3e635', bg: '#1a2d0a' };
  if (aqi <= 60)  return { label: 'Trung bình', color: '#f5a623', bg: '#2d1f06' };
  if (aqi <= 80)  return { label: 'Kém',        color: '#ff7043', bg: '#2d1008' };
  if (aqi <= 100) return { label: 'Rất kém',    color: '#e84393', bg: '#2d0a1f' };
  return                  { label: 'Nguy hiểm', color: '#9b59b6', bg: '#1f0a2d' };
}
