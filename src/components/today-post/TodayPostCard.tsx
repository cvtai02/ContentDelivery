'use client';

import { useEffect, useState } from 'react';
import type { TodayPost } from '@/types/today-post';
import { SettingsButton } from '@/components/settings/SettingsButton';

const REQUEST_TIMEOUT_MS = 170_000;
type TodayPostProvider = 'codex' | 'claude';
type TodayPostLocation = 'vietnam' | 'asia' | 'world';

const LOCATIONS: { value: TodayPostLocation; label: string }[] = [
  { value: 'vietnam', label: 'Việt Nam' },
  { value: 'asia', label: 'Châu Á' },
  { value: 'world', label: 'Thế giới' },
];
const FALLBACK_POST: TodayPost = {
  date: '2026-05-19',
  topic: 'Hội An, Việt Nam',
  title: 'Hội An — Thành phố đèn lồng đẹp nhất Đông Nam Á',
  excerpt: 'Một thị trấn cổ yên bình với đèn lồng rực rỡ, kiến trúc hàng trăm năm tuổi và ẩm thực đường phố không thể quên.',
  body: [
    'Hội An là một trong những điểm đến đẹp nhất Việt Nam, nổi tiếng với phố cổ được UNESCO công nhận là Di sản Văn hóa Thế giới. Những con phố nhỏ lát đá, những ngôi nhà sơn vàng và hàng nghìn chiếc đèn lồng đủ màu sắc tạo nên khung cảnh như bước ra từ tranh vẽ.',
    'Đừng bỏ lỡ: dạo thuyền trên sông Hoài vào buổi tối, thả đèn hoa đăng, thăm Chùa Cầu Nhật Bản, và thưởng thức Cao Lầu — món mì đặc sản chỉ có ở Hội An.',
    'Thời điểm lý tưởng: tháng 2–4 (trời khô, mát). Di chuyển: bay vào Đà Nẵng rồi đi taxi 30 phút. Ngân sách: khoảng 500.000–800.000đ/ngày là đủ thoải mái.',
  ],
  tags: ['HộiAn', 'DuLịchViệtNam', 'PhốCổ', 'ĐènLồng'],
  callToAction: 'Bạn đã từng đến Hội An chưa? Chia sẻ kỷ niệm của bạn nhé!',
  imagePrompt: 'Hoi An ancient town lantern-lit riverside at night, reflection on water, flat editorial illustration, warm tones, minimal composition, no text, no faces',
  generatedAt: '2026-05-19T00:00:00+07:00',
  source: 'fallback',
};

function todayInBangkok() {
  return new Date().toLocaleDateString('sv-SE', { timeZone: 'Asia/Bangkok' });
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat('vi-VN', {
    weekday: 'long',
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  }).format(new Date(`${value}T00:00:00+07:00`));
}

export default function TodayPostCard() {
  const [todayPost, setTodayPost] = useState<TodayPost>(FALLBACK_POST);
  const [loading, setLoading] = useState(false);
  const [publishing, setPublishing] = useState(false);
  const [facebookPostUrl, setFacebookPostUrl] = useState('');
  const [error, setError] = useState('');
  const [expanded, setExpanded] = useState(false);
  const [provider, setProvider] = useState<TodayPostProvider>('codex');
  const [location, setLocation] = useState<TodayPostLocation>('vietnam');
  const updatedBy =
    todayPost.source === 'codex' ? 'Codex' :
    todayPost.source === 'claude' ? 'Claude' :
    'Mẫu mặc định';
  const imageUrl = todayPost.imageUrl || `/api/today-post/illustration?date=${encodeURIComponent(todayPost.date)}&topic=${encodeURIComponent(todayPost.topic)}&title=${encodeURIComponent(todayPost.title)}&imagePrompt=${encodeURIComponent(todayPost.imagePrompt ?? '')}`;

  useEffect(() => {
    let ignore = false;

    async function loadPost() {
      try {
        const res = await fetch('/api/today-post', { cache: 'no-store' });
        if (!res.ok) return;
        const data = await res.json() as TodayPost;
        if (ignore) return;
        setTodayPost(data);

        if (data.date !== todayInBangkok()) {
          setLoading(true);
          setError('');
          const controller = new AbortController();
          const timeoutId = window.setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
          try {
            const genRes = await fetch('/api/today-post', {
              method: 'POST',
              cache: 'no-store',
              signal: controller.signal,
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ provider, location }),
            });
            const genData = await genRes.json();
            if (!genRes.ok) throw new Error(genData.error || 'Không tạo được bài hôm nay');
            if (!ignore) setTodayPost(genData as TodayPost);
          } catch (err) {
            if (!ignore) {
              const message =
                err instanceof DOMException && err.name === 'AbortError'
                  ? `${provider === 'codex' ? 'Codex' : 'Claude'} mất quá lâu. Thử lại sau ít phút.`
                  : err instanceof Error
                    ? err.message
                    : 'Không tạo được bài hôm nay';
              setError(message);
            }
          } finally {
            window.clearTimeout(timeoutId);
            if (!ignore) setLoading(false);
          }
        }
      } catch {
        // Keep the built-in fallback visible if the API is unavailable.
      }
    }

    loadPost();
    return () => {
      ignore = true;
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function requestAnotherTopic() {
    setLoading(true);
    setError('');
    setFacebookPostUrl('');
    const controller = new AbortController();
    const timeoutId = window.setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

    try {
      const res = await fetch('/api/today-post', {
        method: 'POST',
        cache: 'no-store',
        signal: controller.signal,
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ provider, location }),
      });
      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Không tạo được topic mới');
      }

      setTodayPost(data as TodayPost);
    } catch (err) {
      const message =
        err instanceof DOMException && err.name === 'AbortError'
          ? `${provider === 'codex' ? 'Codex' : 'Claude'} mất quá lâu để trả lời. Thử lại sau ít phút.`
          : err instanceof Error
            ? err.message
            : 'Không tạo được topic mới';
      setError(message);
    } finally {
      window.clearTimeout(timeoutId);
      setLoading(false);
    }
  }

  async function publishToFacebook() {
    setPublishing(true);
    setError('');
    setFacebookPostUrl('');

    try {
      const res = await fetch('/api/today-post/facebook', {
        method: 'POST',
        cache: 'no-store',
      });
      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Không đăng được bài lên Facebook');
      }

      setFacebookPostUrl(data.url || '');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Không đăng được bài lên Facebook');
    } finally {
      setPublishing(false);
    }
  }

  return (
    <article className="card h-full">
      <div className="section-label">
        ✦ Gét gô
        <span className="normal-case font-normal text-muted">
          {formatDate(todayPost.date)}
        </span>
        <SettingsButton />
        <button
          onClick={() => setExpanded((v) => !v)}
          className="ml-auto text-muted hover:text-primary transition-colors text-lg leading-none bg-transparent border-none cursor-pointer"
          title={expanded ? 'Thu gọn' : 'Mở rộng'}
        >
          <svg className={`w-4 h-4 transition-transform duration-200 ${expanded ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
        </button>
      </div>

      <div>
        {expanded && (
          <div className="mb-3 aspect-[16/7] max-h-44 min-h-20 overflow-hidden rounded-xl border border-divider bg-surface sm:mb-4">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={imageUrl}
              alt={todayPost.imagePrompt || todayPost.title}
              className="h-full w-full object-cover"
            />
          </div>
        )}
        <p className="text-xs font-semibold text-accent">{todayPost.topic}</p>
        <h2 className="mt-1 text-2xl font-extrabold leading-tight text-primary">
          {todayPost.title}
        </h2>
      </div>

      {expanded && (
        <>
          <div className="flex flex-col gap-3">
            <div>
              <p className="mt-1 text-sm leading-relaxed text-muted">{todayPost.excerpt}</p>
            </div>

            <div className="flex flex-wrap gap-1.5">
              {todayPost.tags.map((tag) => (
                <span key={tag} className="badge">
                  #{tag}
                </span>
              ))}
            </div>
          </div>

          <div className="mt-1 flex flex-col gap-3 text-sm leading-relaxed text-primary">
            {todayPost.body.map((paragraph) => (
              <p key={paragraph}>{paragraph}</p>
            ))}
          </div>

          <div className="mt-auto rounded-xl bg-surface px-4 py-3">
            <p className="text-sm font-semibold text-primary">{todayPost.callToAction}</p>
            <div className="mt-2 flex flex-wrap items-center gap-2">
              <p className="text-[11px] text-muted">Cập nhật bởi {updatedBy}</p>
              <select
                value={location}
                onChange={(e) => setLocation(e.target.value as TodayPostLocation)}
                disabled={loading || publishing}
                className="ml-auto rounded-lg border border-divider bg-panel px-2 py-1.5 text-xs font-semibold text-primary outline-none disabled:cursor-wait disabled:text-muted"
                title="Khu vực địa điểm"
              >
                {LOCATIONS.map((l) => (
                  <option key={l.value} value={l.value}>{l.label}</option>
                ))}
              </select>
              <select
                value={provider}
                onChange={(e) => setProvider(e.target.value as TodayPostProvider)}
                disabled={loading || publishing}
                className="rounded-lg border border-divider bg-panel px-2 py-1.5 text-xs font-semibold text-primary outline-none disabled:cursor-wait disabled:text-muted"
                title="Chọn AI tạo Today Post"
              >
                <option value="codex">Codex</option>
                <option value="claude">Claude</option>
              </select>
              <button
                onClick={requestAnotherTopic}
                disabled={loading || publishing}
                className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition-all ${
                  loading
                    ? 'cursor-wait bg-divider text-muted'
                    : 'cursor-pointer bg-accent text-white hover:opacity-90'
                }`}
              >
                {loading ? `Đang hỏi ${provider === 'codex' ? 'Codex' : 'Claude'}...` : 'Topic khác'}
              </button>
              <button
                onClick={publishToFacebook}
                disabled={loading || publishing}
                className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition-all ${
                  publishing
                    ? 'cursor-wait bg-divider text-muted'
                    : 'cursor-pointer bg-primary text-black hover:opacity-90'
                }`}
              >
                {publishing ? 'Đang đăng...' : 'Đăng Facebook'}
              </button>
            </div>
            {facebookPostUrl && (
              <a
                href={facebookPostUrl}
                target="_blank"
                rel="noreferrer"
                className="mt-2 block text-xs font-semibold text-accent hover:underline"
              >
                Đã đăng lên Facebook
              </a>
            )}
            {error && (
              <p className="mt-2 text-xs text-fall">
                {error}
              </p>
            )}
          </div>
        </>
      )}
    </article>
  );
}
