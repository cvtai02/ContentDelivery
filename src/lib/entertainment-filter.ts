/**
 * Keyword-based entertainment filter for Google Trends VN results.
 * Returns a score 0–100; items with score >= THRESHOLD are classified as entertainment.
 */

const THRESHOLD = 30;

// ── Positive signals ──────────────────────────────────────────────────────────
const STRONG_ENT = [
  // Genre / format keywords
  /\bphim\b/i, /\bca sĩ\b/i, /\bnhạc\b/i, /\bconcert\b/i, /\balbum\b/i,
  /\bmv\b/i, /\blive show\b/i, /\bsingle\b/i, /\bep\b/i, /\btour\b/i,
  /\brap\b/i, /\bhiphop\b/i, /\bkpop\b/i, /\bpop\b/i, /\brock\b/i,
  /\btập\s*\d/i, /\bmùa\s*\d/i, /\bseason\s*\d/i, /\bepisode/i,
  /\bsinh nhật\b/i, /\bviral\b/i, /\btiktok\b/i,
  /\boscars?\b/i, /\bgrammy\b/i, /\bmama\b/i, /\baward/i, /\bgiải thưởng\b/i,
  /\bđạo diễn\b/i, /\bdiễn viên\b/i, /\bnghệ sĩ\b/i, /\bsao\b/i,
  /\bhẹn hò\b/i, /\byêu\b/i, /\bcưới\b/i, /\bscandal\b/i, /\bbê bối\b/i,
  /\bgala\b/i, /\bchung kết\b.*(?:show|talent|voice|idol|factor)/i,
  /\banime\b/i, /\bmanga\b/i, /\bgame\b/i, /\bgaming\b/i,

  // VN celebrities / bands
  /sơn tùng/i, /mỹ tâm/i, /hồ ngọc hà/i, /đen vâu/i, /hoàng thùy linh/i,
  /binz/i, /soobin/i, /bray/i, /vũ cát tường/i, /thu minh/i, /hương tràm/i,
  /wren evans/i, /obito/i, /seachains/i, /tlinh/i, /mono\b/i, /low g\b/i,
  /bích phương/i, /đông nhi/i, /ông cao thắng/i, /trung quân/i, /jsol/i,
  /lam trường/i, /mỹ linh/i, /thanh lam/i, /trọng tấn/i,

  // International artists
  /blackpink/i, /\bbts\b/i, /aespa/i, /twice/i, /stray kids/i, /\bexo\b/i,
  /newjeans/i, /seventeen/i, /nct/i, /ive\b/i, /le sserafim/i, /gidle/i,
  /taylor swift/i, /billie eilish/i, /ariana grande/i, /bruno mars/i,
  /sabrina carpenter/i, /olivia rodrigo/i, /post malone/i, /the weeknd/i,
  /kendrick lamar/i, /drake\b/i, /eminem/i, /lady gaga/i,

  // VN shows
  /the voice/i, /vietnam idol/i, /x factor/i, /anh trai/i, /chị đẹp/i,
  /rap việt/i, /king of rap/i, /sao nhập ngũ/i, /running man/i,
  /ngôi sao việt/i, /giọng hát việt/i, /bước nhảy/i, /ký ức vui vẻ/i,
  /táo quân/i, /liveshow/i,

  // Film keywords
  /marvel/i, /dc\b/i, /avengers/i, /spider.?man/i, /batman/i, /iron man/i,
  /squid game/i, /kingdom/i, /vincenzo/i, /crash landing/i, /goblin/i,
];

// ── Negative signals (sport, politics, etc.) ──────────────────────────────────
const ANTI_ENT = [
  /\bbóng đá\b/i, /\bfootball\b/i, /\bsoccer\b/i, /\bv\.league\b/i,
  /\bngoại hạng\b/i, /\bserieA\b/i, /\bla liga\b/i, /\bbundesliga\b/i,
  /\bchampions league\b/i, /\bligue 1\b/i, /đấu với/i, /\bfc\b/i,
  /\bclb\b/i, /câu lạc bộ bóng/i, /\bvff\b/i, /\bfifa\b/i, /\buefa\b/i,
  /thứ hạng.*hagl/i, /\bhàng không việt\b/i,
  /chứng khoán/i, /cổ phiếu/i, /\btỷ giá\b/i, /ngân hàng/i,
  /chính phủ/i, /quốc hội/i, /bộ trưởng/i, /thủ tướng/i,
  /\bcovid\b/i, /\bdịch\b/i, /động đất/i, /bão\b/i,
];

export function entertainmentScore(title: string, newsTitle = ''): number {
  const text = `${title} ${newsTitle}`.toLowerCase();
  let score = 0;

  for (const re of ANTI_ENT)  if (re.test(text)) score -= 60;
  for (const re of STRONG_ENT) if (re.test(text)) score += 50;

  return Math.max(0, Math.min(100, score));
}

export function isEntertainment(title: string, newsTitle = ''): boolean {
  return entertainmentScore(title, newsTitle) >= THRESHOLD;
}
