'use client';

import type { ThreadsBlock } from '@/lib/parseThreadsPost';

function formatCount(n: number): string {
  if (n >= 1000) return `${(n / 1000).toFixed(1)}K`;
  return String(n);
}

function formatRelativeTime(ts: number): string {
  const diffS = Math.floor((Date.now() - ts * 1000) / 1000);
  if (diffS < 60) return 'vừa xong';
  const diffM = Math.floor(diffS / 60);
  if (diffM < 60) return `${diffM} phút trước`;
  const diffH = Math.floor(diffM / 60);
  if (diffH < 24) return `${diffH} giờ trước`;
  const diffD = Math.floor(diffH / 24);
  if (diffD < 30) return `${diffD} ngày trước`;
  const diffMo = Math.floor(diffD / 30);
  if (diffMo < 12) return `${diffMo} tháng trước`;
  return `${Math.floor(diffMo / 12)} năm trước`;
}

type Props = { block: ThreadsBlock; isLast?: boolean; hasReplies?: boolean };

export function ThreadsCard({ block, isLast = false, hasReplies = false }: Props) {
  const name = block.author ?? (block.isMain ? 'MyNews' : 'User');
  const avatar = name.charAt(0).toUpperCase();
  const likes = block.score ?? 0;
  const avatarSize = block.isMain ? 36 : 28;
  const paddingLeft = block.isReply ? 46 : 16;
  const timeLabel = block.createdAt ? formatRelativeTime(block.createdAt) : 'vừa xong';

  return (
    <div style={{
      width: 480,
      fontFamily: 'system-ui, -apple-system, sans-serif',
      background: block.isMain ? '#f9f9f9' : '#fff',
      color: '#000',
      borderBottom: block.isMain ? '1px solid #e5e7eb' : 'none',
    }}>
      <div style={{ display: 'flex', gap: 10, paddingLeft, paddingRight: 16 }}>
        <div style={{ width: 36, display: 'flex', flexDirection: 'column', alignItems: 'center', flexShrink: 0 }}>
          <div style={{ width: 2, height: 10, background: block.isReply ? '#d1d5db' : 'transparent' }} />

          <div style={{
            width: avatarSize,
            height: avatarSize,
            borderRadius: '50%',
            background: '#000',
            color: '#fff',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontWeight: 700,
            fontSize: block.isMain ? 14 : 11,
            flexShrink: 0,
          }}>
            {avatar}
          </div>

          <div style={{ width: 2, flex: 1, minHeight: 12, background: 'transparent' }} />
        </div>

        <div style={{ flex: 1, minWidth: 0, paddingTop: 10, paddingBottom: 14 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 4, marginBottom: 3 }}>
            <span style={{ fontWeight: 700, fontSize: block.isMain ? 14 : 13 }}>{name}</span>
            <span style={{ fontSize: 12, color: '#9ca3af' }}>· {timeLabel}</span>
          </div>

          <p style={{
            fontSize: block.isMain ? 15 : 13,
            fontWeight: block.isMain ? 500 : 400,
            lineHeight: 1.5,
            color: block.isMain ? '#0f172a' : '#111827',
            whiteSpace: 'pre-wrap',
            margin: 0,
          }}>
            {block.text}
          </p>

          <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginTop: 10, color: '#6b7280', fontSize: 12 }}>
            <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
              <span style={{ fontSize: 16 }}>♡</span> {formatCount(likes)}
            </span>
            <span style={{ fontSize: 16 }}>💬</span>
            <span style={{ fontSize: 16 }}>↺</span>
            <span style={{ marginLeft: 'auto', fontSize: 16 }}>✈</span>
          </div>
        </div>
      </div>
    </div>
  );
}
