const WMO_ICONS: Record<number, string> = {
  0: '☀️', 1: '🌤', 2: '⛅', 3: '☁️',
  45: '🌫', 48: '🌫',
  51: '🌦', 53: '🌦', 55: '🌧',
  61: '🌧', 63: '🌧', 65: '🌧',
  71: '❄️', 73: '❄️', 75: '❄️',
  80: '🌦', 81: '🌦', 82: '⛈',
  95: '⛈', 96: '⛈', 99: '⛈',
};

const WMO_DESCRIPTIONS: Record<number, string> = {
  0: 'Trời quang',       1: 'Ít mây',          2: 'Mây rải rác',   3: 'Nhiều mây',
  45: 'Sương mù',        48: 'Sương giá',
  51: 'Mưa phùn nhẹ',   53: 'Mưa phùn',       55: 'Mưa phùn dày',
  61: 'Mưa nhỏ',        63: 'Mưa vừa',         65: 'Mưa to',
  71: 'Tuyết nhẹ',       73: 'Tuyết vừa',      75: 'Tuyết dày',
  80: 'Mưa rào nhẹ',    81: 'Mưa rào',         82: 'Mưa rào mạnh',
  95: 'Giông',           96: 'Giông + đá',      99: 'Giông mạnh',
};

export function getWmoIcon(code: number): string {
  return WMO_ICONS[code] ?? '🌡';
}

export function getWmoDescription(code: number): string {
  return WMO_DESCRIPTIONS[code] ?? 'Không rõ';
}
