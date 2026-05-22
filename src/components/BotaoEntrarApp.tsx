'use client';

import { signIn, useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { useState } from 'react';

type Props = {
  className?: string;
  children?: React.ReactNode;
  grande?: boolean;
};

/** Um clique — login automático no seu PC (sem Google). */
export function BotaoEntrarApp({ className = 'btn-primary', children, grande }: Props) {
  const router = useRouter();
  const { status } = useSession();
  const [loading, setLoading] = useState(false);
  const [erro, setErro] = useState('');

  if (status === 'authenticated') {
    return (
      <button
        type="button"
        className={className}
        onClick={() => router.push('/dashboard')}
      >
        {children ?? 'Abrir o Dashboard'}
      </button>
    );
  }

  async function entrar() {
    setLoading(true);
    setErro('');
    const email = 'wagdeaguiar@gmail.com';
    try {
      const res = await signIn('dev', {
        email,
        callbackUrl: '/dashboard',
        redirect: false,
      });
      if (res?.ok) {
        router.push('/dashboard');
        router.refresh();
      } else {
        const detalhe = String(res?.error ?? '');
        if (detalhe.includes('5433') || detalhe.includes("Can't reach database")) {
          setErro(
            'Banco de dados parado. 1) Abra Docker Desktop e espere ficar verde. 2) Execute INICIAR-FACIL-ANALYTICS.bat. 3) Abra http://localhost:3010/comecar',
          );
        } else {
          setErro(
            res?.error === 'CredentialsSignin'
              ? 'Login recusado. Rode INICIAR-FACIL-ANALYTICS.bat (Docker + banco).'
              : `Não foi possível entrar. Use http://localhost:3010/comecar (não porta 3000).`,
          );
        }
      }
    } catch {
      setErro('Erro de rede. O servidor está rodando? Use INICIAR-FACIL-ANALYTICS.bat.');
    }
    setLoading(false);
  }

  return (
    <div className="space-y-2">
      <button
        type="button"
        onClick={entrar}
        disabled={loading}
        className={`${className} ${grande ? 'px-8 py-4 text-lg' : ''}`}
      >
        {loading ? 'Abrindo o app…' : (children ?? 'Entrar no Fácil Analytics')}
      </button>
      {erro && <p className="text-sm text-red-300">{erro}</p>}
    </div>
  );
}
