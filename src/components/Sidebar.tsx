'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { signIn, signOut, useSession } from 'next-auth/react';
import {
  LayoutDashboard,
  ListOrdered,
  Target,
  Layers,
  Activity,
  Rows3,
  Sparkles,
  FlaskConical,
  Download,
  Settings,
  User,
  Shield,
  Menu,
  X,
  Crown,
  Grid3X3,
  BookOpen,
} from 'lucide-react';
import { useState } from 'react';
import clsx from 'clsx';
import { isPremiumStatus } from '@/lib/subscription';
import { SITE_NAME, SITE_TAGLINE } from '@/lib/site-identity';

const links = [
  { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/resultados', label: 'Resultados', icon: ListOrdered },
  { href: '/criterios', label: 'Critérios Fortes', icon: Target },
  { href: '/bases', label: 'Bases Pareto', icon: Layers },
  { href: '/sequencias', label: 'Seq. e Atrasos', icon: Activity },
  { href: '/estrutura-horizontal', label: 'Estrutura Horizontal', icon: Rows3 },
  { href: '/manual', label: 'Manual', icon: BookOpen },
  { href: '/gerador', label: 'Gerador', icon: Sparkles },
  { href: '/fechamento', label: 'Fechamento', icon: Grid3X3, premium: true },
  { href: '/simulador', label: 'Simulador', icon: FlaskConical, premium: true },
  { href: '/exportacao', label: 'Exportação', icon: Download, premium: true },
  { href: '/perfis', label: 'Perfis', icon: Settings, premium: true },
];

export function Sidebar() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const { data: session } = useSession();
  const premium = isPremiumStatus(session?.user?.subscriptionStatus);

  const nav = (
    <nav className="flex flex-col gap-1 p-3">
      <div className="mb-4 px-2">
        <Link href="/" className="block">
          <h1 className="text-lg font-bold text-brand-400">{SITE_NAME}</h1>
          <p className="text-xs text-slate-500">{SITE_TAGLINE}</p>
          <p className="text-xs text-slate-400">Padrão histórico · Sem garantia</p>
        </Link>
      </div>
      {links.map(({ href, label, icon: Icon, premium: needsPremium }) => (
        <Link
          key={href}
          href={href}
          onClick={() => setOpen(false)}
          className={clsx(
            'flex items-center gap-2 rounded-lg px-3 py-2 text-sm transition',
            pathname === href
              ? 'bg-brand-600/20 text-brand-300'
              : 'text-slate-300 hover:bg-slate-800',
          )}
        >
          <Icon className="h-4 w-4 shrink-0" />
          <span className="flex-1">{label}</span>
          {needsPremium && !premium && <Crown className="h-3 w-3 text-amber-400" />}
        </Link>
      ))}
      <div className="mt-4 border-t border-slate-800 pt-3">
        {session ? (
          <>
            <Link
              href="/conta"
              className="flex items-center gap-2 rounded-lg px-3 py-2 text-sm text-slate-300 hover:bg-slate-800"
            >
              <User className="h-4 w-4" />
              Minha Conta
            </Link>
            {session.user?.role === 'admin' && (
              <Link
                href="/admin"
                className="flex items-center gap-2 rounded-lg px-3 py-2 text-sm text-slate-300 hover:bg-slate-800"
              >
                <Shield className="h-4 w-4" />
                Admin
              </Link>
            )}
            <button
              type="button"
              onClick={() => signOut({ callbackUrl: '/' })}
              className="w-full rounded-lg px-3 py-2 text-left text-sm text-slate-400 hover:bg-slate-800"
            >
              Sair
            </button>
          </>
        ) : (
          <button
            type="button"
            onClick={() => signIn('google', { callbackUrl: '/dashboard' })}
            className="btn-primary w-full text-sm"
          >
            Entrar com Google
          </button>
        )}
        {!premium && (
          <Link href="/precos" className="btn-secondary mt-2 block text-center text-xs">
            Ver planos
          </Link>
        )}
      </div>
    </nav>
  );

  return (
    <>
      <button
        type="button"
        className="fixed left-4 top-4 z-50 rounded-lg bg-slate-800 p-2 lg:hidden"
        onClick={() => setOpen(!open)}
        aria-label="Menu"
      >
        {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
      </button>
      <aside className="hidden w-56 shrink-0 border-r border-slate-800 bg-slate-950/80 lg:block">
        {nav}
      </aside>
      {open && (
        <aside className="fixed inset-0 z-40 bg-slate-950/95 pt-14 lg:hidden">{nav}</aside>
      )}
    </>
  );
}
