'use client';

import Link from 'next/link';
import { Disclaimer } from '@/components/Disclaimer';
import { BotaoEntrarApp } from '@/components/BotaoEntrarApp';
import { SITE_NAME } from '@/lib/site-identity';
import { useEffect, useState } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';

type Props = {
  devAuth: boolean;
};

export function EntrarClient({ devAuth }: Props) {
  const { status } = useSession();
  const router = useRouter();
  const [aviso, setAviso] = useState('');

  useEffect(() => {
    if (status === 'authenticated') {
      router.replace('/dashboard');
    }
  }, [status, router]);

  useEffect(() => {
    if (!devAuth) return;

    const port = typeof window !== 'undefined' ? window.location.port : '';
    if (port && port !== '3010') {
      setAviso(
        `Você está na porta ${port}. Este app deve abrir em http://localhost:3010 — use INICIAR-FACIL-ANALYTICS.bat.`,
      );
    }
    fetch('/api/health')
      .then((r) => r.json())
      .then((h) => {
        if (!h.database) {
          setAviso(
            'Banco OFFLINE — Abra o Docker Desktop (ícone verde), depois duplo clique em INICIAR-FACIL-ANALYTICS.bat. Use http://localhost:3010/comecar',
          );
        }
      })
      .catch(() => {});
  }, [devAuth]);

  return (
    <div className="mx-auto max-w-md space-y-8 px-4 py-16 text-center">
      <h1 className="text-2xl font-bold text-white">Entrar</h1>
      {aviso && (
        <p className="rounded-lg border border-amber-600/50 bg-amber-950/40 px-3 py-2 text-left text-sm text-amber-200">
          {aviso}
        </p>
      )}
      <Disclaimer />
      {devAuth ? (
        <>
          <p className="text-slate-400">Um clique — sem Google, sem senha (modo desenvolvimento).</p>
          <BotaoEntrarApp className="btn-primary w-full py-4 text-lg" grande devAuth>
            Entrar no {SITE_NAME}
          </BotaoEntrarApp>
          <Link href="/comecar" className="block text-sm text-brand-400 hover:underline">
            Ou abrir entrada automática
          </Link>
        </>
      ) : (
        <>
          <p className="text-slate-400">
            Use sua conta Google para acessar o {SITE_NAME}. Seus dados ficam vinculados ao e-mail da conta.
          </p>
          <BotaoEntrarApp className="btn-primary w-full py-4 text-lg" grande devAuth={false}>
            Entrar com Google
          </BotaoEntrarApp>
          <Link href="/precos" className="block text-sm text-brand-400 hover:underline">
            Ver planos e preços
          </Link>
        </>
      )}
      <Link href="/" className="block text-sm text-slate-500 hover:text-white">
        Voltar
      </Link>
    </div>
  );
}
