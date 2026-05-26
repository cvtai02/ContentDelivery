export function Skeleton({ count }: { count: number }) {
  return (
    <div className="flex flex-col divide-y divide-divider">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="py-1.5 flex flex-col gap-1">
          <div className="h-3 w-1/4 animate-pulse rounded bg-surface" />
          <div className="h-4 w-full animate-pulse rounded bg-surface" />
          <div className="h-3 w-2/3 animate-pulse rounded bg-surface" />
        </div>
      ))}
    </div>
  );
}
