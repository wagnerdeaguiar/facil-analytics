'use client';

import { usePathname } from 'next/navigation';
import { Sidebar } from '@/components/Sidebar';
import { Disclaimer } from '@/components/Disclaimer';
import { SyncConcursosAuto } from '@/components/SyncConcursosAuto';
import { AvisoSyncConcursos } from '@/components/AvisoSyncConcursos';

const PUBLIC_LAYOUT = ['/', '/entrar', '/comecar', '/precos', '/privacidade', '/demo', '/sobre'];
const MINIMAL_LAYOUT = ['/imprimir-cartelas'];

const PUBLIC_PREFIXES = ['/campanha'];

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const isPublic =
    PUBLIC_LAYOUT.includes(pathname) || PUBLIC_PREFIXES.some((p) => pathname.startsWith(`${p}/`));
  const isMinimal = MINIMAL_LAYOUT.includes(pathname);

  if (isPublic || isMinimal) {
    return <>{children}</>;
  }

  return (
    <div className="flex min-h-screen">
      <SyncConcursosAuto />
      <Sidebar />
      <main className="flex-1 overflow-x-hidden p-4 pt-14 lg:p-8 lg:pt-8">
        <div className="mx-auto max-w-6xl space-y-6">
          <Disclaimer compact />
          <AvisoSyncConcursos />
          {children}
        </div>
      </main>
    </div>
  );
}
