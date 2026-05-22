function hash(input: string) {
  let value = 2166136261;
  for (let i = 0; i < input.length; i++) {
    value ^= input.charCodeAt(i);
    value = Math.imul(value, 16777619);
  }
  return value >>> 0;
}

function escapeXml(value: string) {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function wrapTitle(value: string) {
  const words = value.trim().split(/\s+/);
  const lines: string[] = [];
  let current = '';

  for (const word of words) {
    const next = current ? `${current} ${word}` : word;
    if (next.length > 20 && current) {
      lines.push(current);
      current = word;
    } else {
      current = next;
    }
  }

  if (current) lines.push(current);
  return lines.slice(0, 2);
}

// palette index: 0=cool, 1=vibrant, 2=dark, 3=warm
const PALETTES = [
  ['#5c6ef8', '#38d9a9', '#0d0f1a'],
  ['#e84393', '#f5a623', '#12080f'],
  ['#38d9a9', '#5c6ef8', '#07100e'],
  ['#ff7043', '#ffd600', '#100b05'],
] as const;

function paletteFromMood(imagePrompt: string, seed: number) {
  const p = imagePrompt.toLowerCase();
  if (p.includes('warm')) return PALETTES[3];
  if (p.includes('vibrant')) return PALETTES[1];
  if (p.includes('dark')) return PALETTES[2];
  if (p.includes('cool')) return PALETTES[0];
  return PALETTES[seed % PALETTES.length];
}

type TodayPostIllustrationInput = {
  date: string;
  topic: string;
  title: string;
  imagePrompt?: string;
};

export function createTodayPostIllustrationSvg({ date, topic, title, imagePrompt = '' }: TodayPostIllustrationInput) {
  const seed = hash(`${date}:${topic}:${title}`);
  const palette = paletteFromMood(imagePrompt, seed);
  const [accentA, accentB, bg] = palette;
  const lines = wrapTitle(title);

  // Orbital ring system — center on right half
  const ringCX = 900;
  const ringCY = 315;
  const baseAngle = ((seed % 360) / 360) * Math.PI * 2;
  const d1x = Math.round(ringCX + 210 * Math.cos(baseAngle));
  const d1y = Math.round(ringCY + 210 * Math.sin(baseAngle));
  const d2x = Math.round(ringCX + 150 * Math.cos(baseAngle + 2.09));
  const d2y = Math.round(ringCY + 150 * Math.sin(baseAngle + 2.09));
  const d3x = Math.round(ringCX + 90 * Math.cos(baseAngle + 4.19));
  const d3y = Math.round(ringCY + 90 * Math.sin(baseAngle + 4.19));

  // Vertical content layout (centered)
  const contentHeight = lines.length === 1 ? 198 : 264;
  const startY = Math.round(ringCY - contentHeight / 2);
  const badgeTextY = startY + 18;
  const titleY = startY + 18 + 36 + 52;
  const topicY = titleY + (lines.length - 1) * 64 + 44;
  const barY = topicY + 36;
  const badgeRectY = badgeTextY - 17;

  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="630" viewBox="0 0 1200 630" role="img" aria-label="${escapeXml(title)}">
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="0.6" y2="1">
      <stop offset="0%" stop-color="${bg}"/>
      <stop offset="100%" stop-color="#030405"/>
    </linearGradient>
    <radialGradient id="bloom" cx="50%" cy="50%" r="50%">
      <stop offset="0%" stop-color="${accentA}" stop-opacity="0.35"/>
      <stop offset="100%" stop-color="${accentA}" stop-opacity="0"/>
    </radialGradient>
    <radialGradient id="bloomB" cx="50%" cy="50%" r="50%">
      <stop offset="0%" stop-color="${accentB}" stop-opacity="0.25"/>
      <stop offset="100%" stop-color="${accentB}" stop-opacity="0"/>
    </radialGradient>
    <filter id="soft">
      <feGaussianBlur stdDeviation="32"/>
    </filter>
    <clipPath id="canvas">
      <rect width="1200" height="630"/>
    </clipPath>
  </defs>

  <!-- Background -->
  <rect width="1200" height="630" fill="url(#bg)"/>

  <!-- Bloom glows -->
  <circle cx="${ringCX}" cy="${ringCY}" r="280" fill="url(#bloom)" filter="url(#soft)" clip-path="url(#canvas)"/>
  <circle cx="${ringCX - 80}" cy="${ringCY + 60}" r="180" fill="url(#bloomB)" filter="url(#soft)" clip-path="url(#canvas)"/>

  <!-- Outer ring -->
  <circle cx="${ringCX}" cy="${ringCY}" r="250" fill="none" stroke="${accentA}" stroke-width="1" opacity="0.18"/>
  <!-- Middle ring -->
  <circle cx="${ringCX}" cy="${ringCY}" r="210" fill="none" stroke="${accentA}" stroke-width="1.5" opacity="0.28"/>
  <!-- Inner ring -->
  <circle cx="${ringCX}" cy="${ringCY}" r="150" fill="none" stroke="${accentB}" stroke-width="2" opacity="0.4"/>
  <!-- Small ring -->
  <circle cx="${ringCX}" cy="${ringCY}" r="90" fill="none" stroke="${accentA}" stroke-width="1.5" opacity="0.35"/>
  <!-- Core fill -->
  <circle cx="${ringCX}" cy="${ringCY}" r="36" fill="${accentA}" opacity="0.2"/>
  <!-- Core dot -->
  <circle cx="${ringCX}" cy="${ringCY}" r="12" fill="${accentA}" opacity="0.95"/>

  <!-- Orbital dots (seed-rotated) -->
  <circle cx="${d1x}" cy="${d1y}" r="9" fill="${accentB}"/>
  <circle cx="${d1x}" cy="${d1y}" r="18" fill="${accentB}" opacity="0.15"/>
  <circle cx="${d2x}" cy="${d2y}" r="6" fill="${accentA}" opacity="0.8"/>
  <circle cx="${d3x}" cy="${d3y}" r="4" fill="${accentB}" opacity="0.6"/>

  <!-- Vertical divider -->
  <line x1="640" y1="60" x2="640" y2="570" stroke="${accentA}" stroke-width="1" opacity="0.12"/>

  <!-- LEFT: text content -->
  <g transform="translate(80 0)">
    <!-- TODAY POST badge -->
    <rect x="0" y="${badgeRectY}" width="136" height="26" rx="13" fill="${accentA}" opacity="0.16"/>
    <text x="12" y="${badgeTextY}" fill="${accentA}" font-family="Inter, Segoe UI, Arial, sans-serif" font-size="13" font-weight="700" letter-spacing="2.5">TODAY POST</text>

    <!-- Title -->
    <text x="0" y="${titleY}" fill="#ffffff" font-family="Inter, Segoe UI, Arial, sans-serif" font-size="56" font-weight="900" letter-spacing="-1">
      ${lines.map((line, i) => `<tspan x="0" dy="${i === 0 ? 0 : 64}">${escapeXml(line)}</tspan>`).join('')}
    </text>

    <!-- Topic -->
    <text x="0" y="${topicY}" fill="${accentB}" font-family="Inter, Segoe UI, Arial, sans-serif" font-size="21" font-weight="600" opacity="0.9">${escapeXml(topic)}</text>

    <!-- Accent bars -->
    <rect x="0" y="${barY}" width="108" height="4" rx="2" fill="${accentA}"/>
    <rect x="116" y="${barY}" width="44" height="4" rx="2" fill="${accentB}" opacity="0.5"/>
  </g>
</svg>`;
}
