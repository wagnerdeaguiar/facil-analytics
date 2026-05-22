'use client';

import { useEffect, useRef } from 'react';
import { useSession } from 'next-auth/react';
import { usePathname, useRouter } from 'next/navigation';

const SKIP_PATHS = ['/', '/entrar', '/comecar', '/precos', '/privacidade', '/demo'];

const THROTTLE_MS = 10 * 60 * 1000; // revalida a cada 10 min no mesmo navegador

/**
 * Ao usar o app (área logada), sincroniza concursos da API a partir do último no banco.
 */
export function SyncConcursosAuto() {
  const { status } = useSession();
  const pathname = usePathname();
  const router = useRouter();
  const rodou = useRef(false);

  useEffect(() => {
    if (status !== 'authenticated') return;
    if (SKIP_PATHS.includes(pathname)) return;
    if (rodou.current) return;
    if (typeof window === 'undefined') return;

    const last = Number(sessionStorage.getItem('lotofacil-sync-at') || 0);
    if (last && Date.now() - last < THROTTLE_MS) return;

    rodou.current = true;

    fetch('/api/concursos/sync', { method: 'POST' })
      .then((r) => r.json())
      .then((data) => {
        sessionStorage.setItem('lotofacil-sync-at', String(Date.now()));
        if (data.inseridos > 0) {
          sessionStorage.setItem('lotofacil-sync-msg', data.message);
          window.dispatchEvent(new CustomEvent('lotofacil-sync', { detail: data }));
          router.refresh();
        }
      })
      .catch(() => {});
  }, [status, pathname, router]);

  return null;
}
