import type { NewsItem } from '@/types/news';

interface Props {
  items: NewsItem[];
}

function NewsRow({ item }: { item: NewsItem }) {
  return (
    <div className="flex gap-3 py-3 border-b border-divider last:border-0">
      {/* Thumbnail */}
      <div className="w-16 h-12 shrink-0 bg-surface rounded-lg flex items-center justify-center text-2xl">
        {item.emoji}
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <a
          href={item.url}
          target="_blank"
          rel="noopener noreferrer"
          className="text-sm font-semibold leading-snug text-primary hover:text-accent transition-colors line-clamp-2 block"
        >
          {item.title}
        </a>
        <p className="text-[11px] text-muted mt-1">
          <span className="badge mr-1.5">{item.source}</span>
          {item.time}
        </p>
      </div>
    </div>
  );
}

export default function NewsCard({ items }: Props) {
  return (
    <div className="card h-full">
      <div className="section-label">
        🏦 Tin tức thương mại
        <a
          href="https://vneconomy.vn"
          target="_blank"
          rel="noopener noreferrer"
          className="ml-auto normal-case font-normal text-accent hover:underline"
        >
          Xem thêm →
        </a>
      </div>

      <div className="flex flex-col">
        {items.map((item) => (
          <NewsRow key={item.id} item={item} />
        ))}
      </div>
    </div>
  );
}
