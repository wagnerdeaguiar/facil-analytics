'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import {
  BarChart3,
  Crown,
  Gift,
  Shield,
  Sparkles,
  Target,
  TrendingUp,
  Users,
  Zap,
  type LucideIcon,
} from 'lucide-react';
import type { BannerIcon, BannerVariant } from '@/lib/site-banners';

interface BannerApi {
  id: string;
  titulo: string;
  subtitulo?: string;
  descricao?: string;
  linkSaibaMais?: string;
  ctaTexto: string;
  href: string;
  externo: boolean;
  variant?: BannerVariant;
  icone?: BannerIcon;
  precoRotulo?: string;
  precoValor?: string;
  precoSufixo?: string;
  precoObs?: string;
}

const ICON_MAP: Record<BannerIcon, LucideIcon> = {
  sparkles: Sparkles,
  crown: Crown,
  chart: BarChart3,
  target: Target,
  shield: Shield,
  zap: Zap,
  gift: Gift,
  trending: TrendingUp,
  users: Users,
};

const ICON_TINT: Record<BannerVariant, string> = {
  brand: 'bg-brand-500/15 text-brand-400 ring-brand-500/30',
  amber: 'bg-amber-500/15 text-amber-400 ring-amber-500/30',
  emerald: 'bg-emerald-500/15 text-emerald-400 ring-emerald-500/30',
  violet: 'bg-violet-500/15 text-violet-400 ring-violet-500/30',
};

const CTA_STYLE: Record<BannerVariant, string> = {
  brand: 'bg-brand-500 hover:bg-brand-400 text-white shadow-brand-900/30',
  amber: 'bg-amber-400 hover:bg-amber-300 text-slate-900 shadow-amber-900/30',
  emerald: 'bg-emerald-500 hover:bg-emerald-400 text-white shadow-emerald-900/30',
  violet: 'bg-violet-500 hover:bg-violet-400 text-white shadow-violet-900/30',
};

function NavLink({
  href,
  externo,
  className,
  children,
}: {
  href: string;
  externo: boolean;
  className?: string;
  children: React.ReactNode;
}) {
  if (externo) {
    return (
      <a href={href} target="_blank" rel="noopener noreferrer" className={className}>
        {children}
      </a>
    );
  }
  return (
    <Link href={href} className={className}>
      {children}
    </Link>
  );
}

function BannerCard({ banner }: { banner: BannerApi }) {
  const variant = banner.variant ?? 'brand';
  const Icon = ICON_MAP[banner.icone ?? 'sparkles'] ?? Sparkles;
  const texto =
    banner.descricao?.trim() ||
    banner.subtitulo?.trim() ||
    'Conheça os recursos e vantagens desta opção na plataforma.';
  const linkLabel = banner.linkSaibaMais?.trim();

  return (
    <article className="group flex min-h-[300px] flex-col rounded-2xl border border-slate-700/60 bg-slate-900/75 p-5 shadow-lg backdrop-blur transition duration-300 hover:-translate-y-0.5 hover:border-brand-500/35 hover:shadow-xl hover:shadow-brand-950/20 animate-banner-glow">
      <header className="mb-4 flex items-start gap-3">
        <div
          className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl ring-1 ${ICON_TINT[variant]}`}
        >
          <Icon className="h-5 w-5" aria-hidden />
        </div>
        <h3 className="pt-1 text-lg font-bold leading-snug text-white">{banner.titulo}</h3>
      </header>

      <p className="flex-1 text-sm leading-relaxed text-slate-400">
        {texto}
        {linkLabel && (
          <>
            {' '}
            <NavLink
              href={banner.href}
              externo={banner.externo}
              className="font-medium text-brand-400 underline-offset-2 hover:text-brand-300 hover:underline"
            >
              {linkLabel}
            </NavLink>
          </>
        )}
      </p>

      <footer className="mt-5 border-t border-slate-700/50 pt-4">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          {Boolean(banner.precoValor?.trim()) ? (
            <div className="min-w-0">
              {banner.precoRotulo && <p className="text-xs text-slate-500">{banner.precoRotulo}</p>}
              <p className="mt-0.5 flex flex-wrap items-baseline gap-x-1">
                <span className="text-2xl font-bold tracking-tight text-white">{banner.precoValor}</span>
                {banner.precoSufixo && (
                  <span className="text-sm font-medium text-slate-400">{banner.precoSufixo}</span>
                )}
              </p>
            </div>
          ) : (
            <div className="hidden sm:block sm:flex-1" />
          )}

          <NavLink
            href={banner.href}
            externo={banner.externo}
            className={`inline-flex shrink-0 items-center justify-center rounded-full px-5 py-2.5 text-xs font-bold uppercase tracking-wide shadow-lg transition ${CTA_STYLE[variant]}`}
          >
            {banner.ctaTexto}
          </NavLink>
        </div>
        {banner.precoObs && (
          <p className="mt-3 text-[10px] leading-snug text-slate-500">{banner.precoObs}</p>
        )}
      </footer>
    </article>
  );
}

export function BannersPublicidade() {
  const [banners, setBanners] = useState<BannerApi[]>([]);

  useEffect(() => {
    fetch('/api/banners')
      .then((r) => r.json())
      .then((d) => setBanners(d.banners ?? []))
      .catch(() => {});
  }, []);

  if (!banners.length) return null;

  const gridCols =
    banners.length >= 3
      ? 'md:grid-cols-2 lg:grid-cols-3'
      : banners.length === 2
        ? 'md:grid-cols-2'
        : 'max-w-md mx-auto';

  return (
    <div className={`grid gap-4 ${gridCols}`}>
        {banners.map((b) => (
          <BannerCard key={b.id} banner={b} />
        ))}
    </div>
  );
}
