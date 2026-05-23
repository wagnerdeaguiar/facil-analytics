'use client';

import { signIn, useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { SITE_NAME } from '@/lib/site-identity';

type Props = {
  className?: string;
  children?: React.ReactNode;
  grande?: boolean;
  /** Quando omitido, detecta via /api/health (devAuth). */
  devAuth?: boolean;
  /** Em produção, abre /entrar em vez de Google direto. */
  irParaEntrar?: boolean;
};

export function BotaoEntrarApp({ className = 'btn-primary', children, grande, devAuth, irParaEntrar }: Props) {
  const router = useRouter();
  const { status } = useSession();
  const [loading, setLoading] = useState(false);
  const [erro, setErro] = useState('');
  const [modoDev, setModoDev] = useState<boolean | null>(devAuth ?? null);

  useEffect(() => {
    if (devAuth !== undefined) return;
    fetch('/api/health')
      .then((r) => r.json())
      .then((h) => setModoDev(h.devAuth === true))
      .catch(() => setModoDev(false));
  }, [devAuth]);

  const isDev = modoDev === true;
  const aguardando = modoDev === null;

  if (status === 'authenticated') {
    return (
      <button type="button" className={className} onClick={() => router.push('/dashboard')}>
        {children ?? 'Abrir o Dashboard'}
      </button>
    );
  }

  async function entrarDev() {
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
              : 'Não foi possível entrar. Use http://localhost:3010/comecar (não porta 3000).',
          );
        }
      }
    } catch {
      setErro('Erro de rede. O servidor está rodando? Use INICIAR-FACIL-ANALYTICS.bat.');
    }
    setLoading(false);
  }

  async function entrarGoogle() {
    setLoading(true);
    setErro('');
    try {
      await signIn('google', { callbackUrl: '/dashboard' });
    } catch {
      setErro('Não foi possível abrir o login Google. Tente novamente.');
      setLoading(false);
    }
  }

  async function entrar() {
    if (isDev) {
      await entrarDev();
      return;
    }
    if (irParaEntrar) {
      router.push('/entrar');
      return;
    }
    await entrarGoogle();
  }

  const labelPadrao = isDev ? `Entrar no ${SITE_NAME}` : 'Entrar com Google';

  return (
    <div className="space-y-2">
      <button
        type="button"
        onClick={entrar}
        disabled={loading || aguardando}
        className={`${className} ${grande ? 'px-8 py-4 text-lg' : ''}`}
      >
        {loading ? 'Abrindo…' : aguardando ? 'Carregando…' : (children ?? labelPadrao)}
      </button>
      {erro && <p className="text-sm text-red-300">{erro}</p>}
    </div>
  );
}
