'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useSession } from 'next-auth/react';
import { Crown } from 'lucide-react';
import { isPremiumStatus } from '@/lib/subscription';

export function CadastroConcursoManual({ onCadastrado }: { onCadastrado?: () => void }) {
  const { data: session } = useSession();
  const premium = isPremiumStatus(session?.user?.subscriptionStatus);
  const [numero, setNumero] = useState('');
  const [data, setData] = useState('');
  const [dezenasTxt, setDezenasTxt] = useState('');
  const [msg, setMsg] = useState('');
  const [erro, setErro] = useState('');
  const [loading, setLoading] = useState(false);

  async function cadastrar(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setErro('');
    setMsg('');

    const dezenas = dezenasTxt
      .split(/[\s,;]+/)
      .map((n) => parseInt(n, 10))
      .filter((n) => n >= 1 && n <= 25);

    const res = await fetch('/api/concursos/manual', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        numeroConcurso: Number(numero),
        dataSorteio: data || undefined,
        dezenas,
      }),
    });
    const d = await res.json();
    setLoading(false);

    if (!res.ok) {
      setErro(d.error ?? 'Erro ao cadastrar');
      return;
    }

    setMsg(d.mensagem ?? 'Concurso cadastrado.');
    setNumero('');
    setData('');
    setDezenasTxt('');
    onCadastrado?.();
  }

  if (!premium) {
    return (
      <article className="card space-y-2 border-slate-700/50">
        <div className="flex items-center gap-2">
          <h2 className="text-sm font-semibold text-slate-300">Cadastrar concurso manualmente</h2>
          <span className="inline-flex items-center gap-1 rounded-full bg-amber-500/10 px-2 py-0.5 text-[10px] font-medium text-amber-400">
            <Crown className="h-3 w-3" />
            Premium
          </span>
        </div>
        <p className="text-xs text-slate-500">
          Disponível no Plano Premium.{' '}
          <Link href="/precos" className="text-brand-400 underline">
            Assinar plano
          </Link>
        </p>
      </article>
    );
  }

  return (
    <form onSubmit={cadastrar} className="card space-y-3">
      <h2 className="text-sm font-semibold text-slate-300">Cadastrar concurso manualmente</h2>
      <p className="text-xs text-slate-500">
        Informe o número do concurso e as 15 dezenas sorteadas. Métricas e estrutura horizontal são calculadas
        automaticamente.
      </p>
      <div className="flex flex-wrap gap-3">
        <input
          type="number"
          required
          placeholder="Nº concurso"
          value={numero}
          onChange={(e) => setNumero(e.target.value)}
          className="input max-w-[140px]"
        />
        <input
          type="date"
          value={data}
          onChange={(e) => setData(e.target.value)}
          className="input max-w-[180px]"
        />
      </div>
      <textarea
        required
        value={dezenasTxt}
        onChange={(e) => setDezenasTxt(e.target.value)}
        placeholder="15 dezenas: 01 02 03 … ou separadas por vírgula"
        className="input min-h-[72px] font-mono text-sm"
      />
      <button type="submit" disabled={loading} className="btn-primary">
        {loading ? 'Salvando…' : 'Cadastrar concurso'}
      </button>
      {msg && <p className="text-sm text-emerald-400">{msg}</p>}
      {erro && <p className="text-sm text-red-300">{erro}</p>}
    </form>
  );
}
