'use client';

import Link from 'next/link';
import { Disclaimer } from '@/components/Disclaimer';
import { BotaoEntrarApp } from '@/components/BotaoEntrarApp';
import { useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';

export default function EntrarPage() {
  const { status } = useSession();
  const router = useRouter();

  useEffect(() => {
    if (status === 'authenticated') {
      router.replace('/dashboard');
    }
  }, [status, router]);

  return (
    <div className="mx-auto max-w-md space-y-8 px-4 py-16 text-center">
      <h1 className="text-2xl font-bold text-white">Entrar</h1>
      <Disclaimer />
      <p className="text-slate-400">Um clique — sem Google, sem senha.</p>
      <BotaoEntrarApp className="btn-primary w-full py-4 text-lg" grande>
        Entrar no Fácil Analytics
      </BotaoEntrarApp>
      <Link href="/comecar" className="block text-sm text-brand-400 hover:underline">
        Ou abrir entrada automática
      </Link>
      <Link href="/" className="block text-sm text-slate-500 hover:text-white">
        Voltar
      </Link>
    </div>
  );
}
