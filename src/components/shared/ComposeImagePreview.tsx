'use client';

import { useState } from 'react';
import Image from 'next/image';

export function ComposeImagePreview({
  imageUrl,
  imageLoading,
  onRefresh,
}: {
  imageUrl: string | null;
  imageLoading: boolean;
  onRefresh: () => void;
}) {
  const [visible, setVisible] = useState(true);

  if (imageLoading) {
    return <div className="h-40 animate-pulse rounded-xl bg-surface" />;
  }

  if (!imageUrl) return null;

  return (
    <div className="flex flex-col gap-1">
      <div className="flex items-center gap-2">
        <button
          onClick={() => setVisible((v) => !v)}
          className="text-[10px] font-semibold text-muted hover:text-primary cursor-pointer bg-transparent border-none"
        >
          {visible ? 'Ẩn ảnh' : 'Hiện ảnh'}
        </button>
        {visible && (
          <button
            onClick={onRefresh}
            className="text-[10px] font-semibold text-muted hover:text-primary cursor-pointer bg-transparent border-none"
          >
            Đổi ảnh
          </button>
        )}
      </div>
      {visible && (
        <Image
          src={imageUrl}
          alt="Post illustration"
          width={1200}
          height={630}
          unoptimized
          className="w-full rounded-xl object-contain"
        />
      )}
    </div>
  );
}
