'use client';

import { useSession } from 'next-auth/react';
import Link from 'next/link';
import { isPremiumStatus } from '@/lib/subscription';
import { useEffect, useState } from 'react';

interface SubInfo {
  status: string;
  dataInicio?: string;
  dataRenovacao?: string;
  valor?: number;
}

export default function ContaPage() {
  const { data: session } = useSession();
  const [sub, setSub] = useState<SubInfo | null>(null);

  useEffect(() => {
    if (session?.user?.id) {
      fetch('/api/conta')
        .then((r) => r.json())
        .then(setSub)
        .catch(() => null);
    }
  }, [session?.user?.id]);

  if (!session?.user) {
    return (
      <p className="text-slate-400">
        <Link href="/entrar" className="text-brand-400 underline">
          Faça login
        </Link>{' '}
        para ver sua conta.
      </p>
    );
  }

  const premium = isPremiumStatus(session.user.subscriptionStatus);

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-white">Minha Conta</h1>
      <div className="card flex gap-4">
        {session.user.image && (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={session.user.image} alt="" className="h-16 w-16 rounded-full" />
        )}
        <div>
          <p className="font-semibold text-white">{session.user.name}</p>
          <p className="text-sm text-slate-400">{session.user.email}</p>
          <p className="mt-2 text-sm">
            Plano:{' '}
            <span className={premium ? 'text-emerald-400' : 'text-slate-300'}>
              {premium ? 'Premium ativo' : 'Gratuito'}
            </span>
          </p>
        </div>
      </div>
      {sub && (
        <dl className="card grid gap-2 text-sm text-slate-300 md:grid-cols-2">
          <div>Status: {sub.status}</div>
          {sub.dataInicio && <div>Início: {new Date(sub.dataInicio).toLocaleDateString('pt-BR')}</div>}
          {sub.dataRenovacao && (
            <div>Próxima renovação: {new Date(sub.dataRenovacao).toLocaleDateString('pt-BR')}</div>
          )}
          {sub.valor && <div>Valor: R$ {sub.valor.toFixed(2)}</div>}
        </dl>
      )}
      {!premium && (
        <Link href="/precos" className="btn-primary inline-block">
          Assinar Plano Premium
        </Link>
      )}
      <p className="text-xs text-slate-500">
        Para solicitar exclusão da conta, envie e-mail ao administrador informado na página de{' '}
        <Link href="/privacidade" className="underline">
          privacidade
        </Link>
        .
      </p>
    </div>
  );
}
