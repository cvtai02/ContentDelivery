import { lazy, Suspense, type ComponentType } from 'react';

export function LazyPage<TProps extends object>(
  importFunc: () => Promise<{ default: ComponentType<TProps> }>,
) {
  const LazyComponent = lazy(importFunc);

  return (props: TProps) => (
    <Suspense
      fallback={
        <div className="flex h-64 items-center justify-center">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-muted border-t-primary" />
        </div>
      }
    >
      <LazyComponent {...props} />
    </Suspense>
  );
}
