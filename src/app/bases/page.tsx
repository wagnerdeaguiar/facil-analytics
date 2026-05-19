'use client';

import { useEffect, useState } from 'react';
import { DezenasGrid } from '@/components/DezenasGrid';

export default function BasesPage() {
  const [data, setData] = useState<{
    bases: { tipo: string; dezenas: number[]; estatisticas: Record<string, number> }[];
    cobertura: unknown[];
    ranking: { dezena: number; classificacao: string; percentual: number }[];
  } | null>(null);

  useEffect(() => {
    fetch('/api/bases')
      .then((r) => r.json())
      .then(setData);
  }, []);

  return (
    <section className="space-y-6">
      <header>
        <h1 className="text-2xl font-bold">Bases Pareto</h1>
        <p className="text-sm text-slate-400">
          Bases 18D, 19D e 20D montadas pelo ranking de frequência histórica e cobertura retroativa.
        </p>
      </header>

      {!data ? (
        <p className="text-slate-400">Carregando…</p>
      ) : (
        <>
          {data.bases.map((b) => (
            <article key={b.tipo} className="card">
              <h2 className="mb-2 font-semibold text-brand-300">Base {b.tipo}</h2>
              <DezenasGrid dezenas={b.dezenas} />
              <p className="mt-2 text-xs text-slate-400">
                Soma base: {b.estatisticas.soma} · Pares: {b.estatisticas.pares} · Primos:{' '}
                {b.estatisticas.primos} · Fib: {b.estatisticas.fibonacci} · Moldura:{' '}
                {b.estatisticas.moldura}
              </p>
            </article>
          ))}

          <article className="card">
            <h2 className="mb-3 text-sm font-semibold">Cobertura histórica (quantos sorteados estavam na base)</h2>
            <pre className="overflow-auto text-xs text-slate-300">{JSON.stringify(data.cobertura, null, 2)}</pre>
          </article>
        </>
      )}
    </section>
  );
}
