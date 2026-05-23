'use client';

import Link from 'next/link';
import { Disclaimer } from '@/components/Disclaimer';
import { BotaoEntrarApp } from '@/components/BotaoEntrarApp';
import { FormularioEmailSenha } from '@/components/FormularioEmailSenha';
import { SITE_NAME } from '@/lib/site-identity';
import { useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';

export function CadastroClient() {
  const { status } = useSession();
  const router = useRouter();

  useEffect(() => {
    if (status === 'authenticated') {
      router.replace('/dashboard');
    }
  }, [status, router]);

  return (
    <div className="mx-auto max-w-md space-y-8 px-4 py-16">
      <h1 className="text-center text-2xl font-bold text-white">Criar conta</h1>
      <Disclaimer />
      <p className="text-center text-slate-400">
        Cadastre-se com e-mail e senha ou use o Google no {SITE_NAME}.
      </p>

      <FormularioEmailSenha modo="cadastro" />

      <div className="flex items-center gap-3">
        <div className="h-px flex-1 bg-slate-800" />
        <span className="text-xs uppercase tracking-wider text-slate-500">ou</span>
        <div className="h-px flex-1 bg-slate-800" />
      </div>

      <BotaoEntrarApp className="btn-secondary w-full py-3" devAuth={false}>
        Cadastrar com Google
      </BotaoEntrarApp>

      <p className="text-center text-sm text-slate-400">
        Já tem conta?{' '}
        <Link href="/entrar" className="text-brand-400 hover:underline">
          Entrar
        </Link>
      </p>

      <Link href="/" className="block text-center text-sm text-slate-500 hover:text-white">
        Voltar
      </Link>
    </div>
  );
}
