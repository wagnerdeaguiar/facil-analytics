import clsx from 'clsx';
import type { ReactNode } from 'react';

export function Badge({
  children,
  variant = 'default',
}: {
  children: ReactNode;
  variant?: 'free' | 'premium' | 'admin' | 'default' | 'warn';
}) {
  return (
    <span
      className={clsx(
        'inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide',
        variant === 'free' && 'bg-sky-500/15 text-sky-300 ring-1 ring-sky-500/30',
        variant === 'premium' && 'bg-amber-500/15 text-amber-300 ring-1 ring-amber-500/30',
        variant === 'admin' && 'bg-violet-500/15 text-violet-300 ring-1 ring-violet-500/30',
        variant === 'warn' && 'bg-orange-500/15 text-orange-300 ring-1 ring-orange-500/30',
        variant === 'default' && 'bg-slate-700/80 text-slate-300 ring-1 ring-slate-600',
      )}
    >
      {children}
    </span>
  );
}
