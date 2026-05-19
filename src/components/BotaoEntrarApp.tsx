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
    const email = 'wagdeaguiar@gmail.com';
    const res = await signIn('dev', {
      email,
      callbackUrl: '/dashboard',
      redirect: false,
    });
    if (res?.ok) {
      router.push('/dashboard');
      router.refresh();
    } else {
      window.location.href = '/entrar';
    }
    setLoading(false);
  }

  return (
    <button
      type="button"
      onClick={entrar}
      disabled={loading}
      className={`${className} ${grande ? 'px-8 py-4 text-lg' : ''}`}
    >
      {loading ? 'Abrindo o app…' : (children ?? 'Entrar no Fácil Analytics')}
    </button>
  );
}
