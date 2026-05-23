'use client';

import { signIn } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { useState } from 'react';

type Modo = 'entrar' | 'cadastro';

type Props = {
  modo: Modo;
};

export function FormularioEmailSenha({ modo }: Props) {
  const router = useRouter();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [loading, setLoading] = useState(false);
  const [erro, setErro] = useState('');

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErro('');
    setLoading(true);

    try {
      if (modo === 'cadastro') {
        if (password !== confirm) {
          setErro('As senhas não coincidem.');
          setLoading(false);
          return;
        }

        const res = await fetch('/api/auth/register', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ name, email, password }),
        });
        const data = await res.json();
        if (!res.ok) {
          setErro(data.error ?? 'Não foi possível criar a conta.');
          setLoading(false);
          return;
        }
      }

      const login = await signIn('credentials', {
        email,
        password,
        callbackUrl: '/dashboard',
        redirect: false,
      });

      if (login?.ok) {
        router.push('/dashboard');
        router.refresh();
      } else {
        setErro(
          modo === 'cadastro'
            ? 'Conta criada, mas não foi possível entrar automaticamente. Tente fazer login.'
            : 'E-mail ou senha incorretos.',
        );
      }
    } catch {
      setErro('Erro de rede. Tente novamente.');
    }

    setLoading(false);
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4 text-left">
      {modo === 'cadastro' && (
        <div>
          <label htmlFor="name" className="mb-1 block text-sm text-slate-400">
            Nome (opcional)
          </label>
          <input
            id="name"
            type="text"
            autoComplete="name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-white"
          />
        </div>
      )}
      <div>
        <label htmlFor="email" className="mb-1 block text-sm text-slate-400">
          E-mail
        </label>
        <input
          id="email"
          type="email"
          required
          autoComplete="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-white"
        />
      </div>
      <div>
        <label htmlFor="password" className="mb-1 block text-sm text-slate-400">
          Senha
        </label>
        <input
          id="password"
          type="password"
          required
          minLength={8}
          autoComplete={modo === 'cadastro' ? 'new-password' : 'current-password'}
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-white"
        />
        {modo === 'cadastro' && <p className="mt-1 text-xs text-slate-500">Mínimo de 8 caracteres.</p>}
      </div>
      {modo === 'cadastro' && (
        <div>
          <label htmlFor="confirm" className="mb-1 block text-sm text-slate-400">
            Confirmar senha
          </label>
          <input
            id="confirm"
            type="password"
            required
            minLength={8}
            autoComplete="new-password"
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
            className="w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-white"
          />
        </div>
      )}
      <button type="submit" disabled={loading} className="btn-primary w-full py-3">
        {loading ? 'Aguarde…' : modo === 'cadastro' ? 'Criar conta' : 'Entrar com e-mail e senha'}
      </button>
      {erro && <p className="text-sm text-red-300">{erro}</p>}
    </form>
  );
}
