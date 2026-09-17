import { Link, Outlet, useLocation } from 'react-router-dom';
import { useTheme } from './theme-provider';
import { Moon, Sun } from 'lucide-react';

const navItems = [
  { href: '/threads', label: 'Threads', mark: 'T' },
];

export default function AppLayout() {
  const { pathname } = useLocation();
  const { theme, setTheme } = useTheme();

  return (
    <div className="min-h-screen bg-background text-foreground lg:grid lg:grid-cols-[220px_minmax(0,1fr)]">
      <aside className="sticky top-0 z-30 border-b border-border bg-card/95 backdrop-blur lg:h-screen lg:border-b-0 lg:border-r">
        <div className="flex items-center justify-between gap-3 px-4 py-3 lg:block lg:px-5 lg:py-5">
          <Link to="/threads" className="block min-w-0">
            <div className="text-lg font-black tracking-tight">
              Every<span className="text-primary">Minute</span>
            </div>
            <div className="hidden text-[11px] font-semibold uppercase text-muted-foreground lg:block">
              Content tools
            </div>
          </Link>

          <nav className="flex min-w-0 gap-2 lg:mt-6 lg:flex-col">
            {navItems.map((item) => {
              const active = pathname === item.href || pathname.startsWith(`${item.href}/`);
              return (
                <Link
                  key={item.href}
                  to={item.href}
                  aria-current={active ? 'page' : undefined}
                  className={cn(
                    'group flex min-w-0 items-center gap-2 rounded-md border px-3 py-2 text-sm font-bold transition-colors',
                    active
                      ? 'border-primary bg-primary text-primary-foreground'
                      : 'border-transparent text-muted-foreground hover:border-border hover:bg-accent hover:text-foreground',
                  )}
                >
                  <span
                    aria-hidden="true"
                    className={cn(
                      'flex h-6 w-6 shrink-0 items-center justify-center rounded text-[11px] font-black',
                      active
                        ? 'bg-primary-foreground/20 text-primary-foreground'
                        : 'bg-muted text-foreground group-hover:bg-border',
                    )}
                  >
                    {item.mark}
                  </span>
                  <span className="truncate">{item.label}</span>
                </Link>
              );
            })}
          </nav>

          <button
            onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
            className="mt-auto hidden rounded-md p-2 text-muted-foreground hover:bg-accent hover:text-foreground lg:mt-6 lg:flex"
          >
            {theme === 'dark' ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
          </button>
        </div>
      </aside>

      <main className="min-w-0">
        <Outlet />
      </main>
    </div>
  );
}

function cn(...classes: (string | false | undefined)[]) {
  return classes.filter(Boolean).join(' ');
}
