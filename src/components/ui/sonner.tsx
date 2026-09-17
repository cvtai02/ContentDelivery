import { Toaster as Sonner, type ToasterProps } from 'sonner';
import { useTheme } from '@/components/containers/theme-provider';

function Toaster(props: ToasterProps) {
  const { theme } = useTheme();

  return (
    <Sonner
      theme={theme === 'system' ? undefined : theme}
      className="toaster group"
      style={{ '--normal-bg': 'var(--popover)', '--normal-text': 'var(--popover-foreground)' } as React.CSSProperties}
      {...props}
    />
  );
}

export { Toaster };
