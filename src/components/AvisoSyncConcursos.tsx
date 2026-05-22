'use client';

import { useEffect, useState } from 'react';

export function AvisoSyncConcursos() {
  const [msg, setMsg] = useState('');

  useEffect(() => {
    const salva = sessionStorage.getItem('lotofacil-sync-msg');
    if (salva) {
      setMsg(salva);
      sessionStorage.removeItem('lotofacil-sync-msg');
    }

    const onSync = (e: Event) => {
      const detail = (e as CustomEvent<{ message?: string }>).detail;
      if (detail?.message) setMsg(detail.message);
    };
    window.addEventListener('lotofacil-sync', onSync);
    return () => window.removeEventListener('lotofacil-sync', onSync);
  }, []);

  if (!msg) return null;

  return (
    <div className="rounded-lg border border-brand-600/40 bg-brand-950/50 px-3 py-2 text-sm text-brand-200">
      {msg}
    </div>
  );
}
