'use client';

import { signIn, useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';

/** Entrada automática — o usuário só precisa abrir esta página. */
export default function ComecarPage() {
  const router = useRouter();
  const { status } = useSession();
  const [msg, setMsg] = useState('Preparando seu acesso…');

  useEffect(() => {
    if (status === 'authenticated') {
      router.replace('/dashboard');
      return;
    }
    if (status === 'loading') return;

    let cancel = false;

    (async () => {
      setMsg('Entrando com sua conta…');
      const res = await signIn('dev', {
        email: 'wagdeaguiar@gmail.com',
        callbackUrl: '/dashboard',
        redirect: false,
      });
      if (cancel) return;
      if (res?.ok) {
        router.replace('/dashboard');
        router.refresh();
      } else {
        setMsg('Quase lá… redirecionando para login manual.');
        setTimeout(() => router.replace('/entrar'), 1500);
      }
    })();

    return () => {
      cancel = true;
    };
  }, [status, router]);

  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-slate-950 px-4 text-center">
      <div className="h-10 w-10 animate-spin rounded-full border-2 border-brand-400 border-t-transparent" />
      <h1 className="text-xl font-semibold text-white">Fácil Analytics</h1>
      <p className="text-slate-400">{msg}</p>
    </div>
  );
}
