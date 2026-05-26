'use client';

import type React from 'react';
import { ThreadsCard } from '@/components/shared/ThreadsCard';
import type { PostBlock } from '@/lib/parseThreadsPost';

type BlockGroup = { block: PostBlock; replies: PostBlock[]; globalIdx: number };

function groupBlocks(blocks: PostBlock[]): BlockGroup[] {
  const groups: BlockGroup[] = [];
  for (let i = 0; i < blocks.length; i++) {
    const b = blocks[i];
    if (b.isReply && groups.length > 0) {
      groups[groups.length - 1].replies.push(b);
    } else {
      groups.push({ block: b, replies: [], globalIdx: i });
    }
  }
  return groups;
}

type Props = { blocks: PostBlock[]; groupRefs?: React.MutableRefObject<(HTMLDivElement | null)[]> };

export function ThreadsPreview({ blocks, groupRefs }: Props) {
  const groups = groupBlocks(blocks);

  return (
    <div className="overflow-x-auto">
        <div className="inline-flex flex-col rounded-xl overflow-hidden border border-[#2a2a2a] shadow-sm">
          {groups.map((group, gi) => {
            const isGroupLast = gi === groups.length - 1;

            return (
              <div key={gi} ref={(el) => { if (groupRefs) groupRefs.current[gi] = el; }} style={{ borderRadius: 16, overflow: 'hidden' }}>
                <ThreadsCard
                  block={group.block}
                  isLast={isGroupLast && group.replies.length === 0}
                  hasReplies={group.replies.length > 0}
                />
                {group.replies.map((reply, ri) => (
                  <ThreadsCard
                    key={ri}
                    block={reply}
                    isLast={isGroupLast && ri === group.replies.length - 1}
                  />
                ))}
              </div>
            );
          })}
        </div>
  </div>
  );
}
