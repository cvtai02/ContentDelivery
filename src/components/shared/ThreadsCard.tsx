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
  const paddingLeft = block.isReply ? 36 : 10;
  const timeLabel = block.createdAt ? formatRelativeTime(block.createdAt) : 'vừa xong';

  const avatarNode = (
    <div style={{
      width: avatarSize,
      height: avatarSize,
      borderRadius: '50%',
      background: '#333',
      overflow: 'hidden',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      flexShrink: 0,
    }}>
      {block.avatarUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={block.avatarUrl} alt={name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
      ) : (
        <span style={{ color: '#fff', fontWeight: 700, fontSize: block.isMain ? 14 : 11 }}>{avatar}</span>
      )}
    </div>
  );

  if (block.isMain) {
    return (
      <div style={{
        width: 480,
        fontFamily: 'system-ui, -apple-system, sans-serif',
        background: '#101010',
        color: '#fff',
        borderBottom: '1px solid #2a2a2a',
        paddingLeft: 10,
        paddingRight: 10,
      }}>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center', paddingTop: 6 }}>
          {avatarNode}
          <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
            <span style={{ fontWeight: 700, fontSize: 14 }}>{name}</span>
            <span style={{ fontSize: 12, color: '#666' }}>· {timeLabel}</span>
          </div>
        </div>

        <p style={{
          fontSize: 13,
          fontWeight: 400,
          lineHeight: 1.5,
          color: '#d0d0d0',
          whiteSpace: 'pre-wrap',
          margin: '6px 0 0 0',
        }}>
          {block.text}
        </p>

        <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginTop: 6, marginBottom: 8, color: '#666', fontSize: 12 }}>
          <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
            <span style={{ fontSize: 16, fontWeight: 700 }}>♡</span> {formatCount(likes)}
          </span>
        </div>
      </div>
    );
  }

  return (
    <div style={{
      width: 480,
      fontFamily: 'system-ui, -apple-system, sans-serif',
      background: '#0d0d0d',
      color: '#fff',
    }}>
      <div style={{ display: 'flex', gap: 8, paddingLeft, paddingRight: 10 }}>
        <div style={{ width: 36, display: 'flex', flexDirection: 'column', alignItems: 'center', flexShrink: 0 }}>
          <div style={{ width: 2, height: 6, background: block.isReply ? '#3a3a3a' : 'transparent' }} />
          {avatarNode}
          <div style={{ width: 2, flex: 1, minHeight: 12, background: 'transparent' }} />
        </div>

        <div style={{ flex: 1, minWidth: 0, paddingTop: 6, paddingBottom: 8 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 4, marginBottom: 2 }}>
            <span style={{ fontWeight: 700, fontSize: 13 }}>{name}</span>
            <span style={{ fontSize: 12, color: '#666' }}>· {timeLabel}</span>
          </div>

          <p style={{
            fontSize: 13,
            fontWeight: 400,
            lineHeight: 1.5,
            color: '#d0d0d0',
            whiteSpace: 'pre-wrap',
            margin: 0,
          }}>
            {block.text}
          </p>

          <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginTop: 6, color: '#666', fontSize: 12 }}>
            <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
              <span style={{ fontSize: 16, fontWeight: 700 }}>♡</span> {formatCount(likes)}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
