import { Suspense } from 'react';

export default function EntrarLayout({ children }: { children: React.ReactNode }) {
  return <Suspense fallback={<p className="p-8 text-slate-400">Carregando…</p>}>{children}</Suspense>;
}
