'use client';

import { useEffect, useState } from 'react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
} from 'recharts';

interface ConcursoEstrutura {
  numeroConcurso: number;
  maiorSequenciaSorteada: number;
  maiorSequenciaAusente: number;
  blocosSorteados: string[];
  blocosAusentes: string[];
}

export default function EstruturaHorizontalPage() {
  const [concursos, setConcursos] = useState<ConcursoEstrutura[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/estrutura-horizontal')
      .then((r) => r.json())
      .then((d) => setConcursos(d.concursos ?? []))
      .finally(() => setLoading(false));
  }, []);

  const distSorteada: Record<number, number> = {};
  const distAusente: Record<number, number> = {};
  const combo: Record<string, number> = {};

  for (const c of concursos) {
    distSorteada[c.maiorSequenciaSorteada] = (distSorteada[c.maiorSequenciaSorteada] ?? 0) + 1;
    distAusente[c.maiorSequenciaAusente] = (distAusente[c.maiorSequenciaAusente] ?? 0) + 1;
    const key = `${c.maiorSequenciaSorteada}x${c.maiorSequenciaAusente}`;
    combo[key] = (combo[key] ?? 0) + 1;
  }

  const chartSorteada = Object.entries(distSorteada)
    .map(([k, v]) => ({ seq: k, qtd: v }))
    .sort((a, b) => Number(a.seq) - Number(b.seq));

  const chartAusente = Object.entries(distAusente)
    .map(([k, v]) => ({ seq: k, qtd: v }))
    .sort((a, b) => Number(a.seq) - Number(b.seq));

  const topCombo = Object.entries(combo)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5);

  const rankingSort = [...concursos]
    .sort((a, b) => b.maiorSequenciaSorteada - a.maiorSequenciaSorteada)
    .slice(0, 10);

  const rankingAus = [...concursos]
    .sort((a, b) => b.maiorSequenciaAusente - a.maiorSequenciaAusente)
    .slice(0, 10);

  if (loading) {
    return <p className="text-slate-400">Carregando estrutura horizontal…</p>;
  }

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-bold text-white">Estrutura Horizontal</h1>
        <p className="text-sm text-slate-400">
          Blocos consecutivos sorteados (verde) e ausentes (cinza) · {concursos.length} concursos
        </p>
      </header>

      <section className="grid gap-4 lg:grid-cols-2">
        <div className="card h-64">
          <h2 className="mb-2 text-sm font-semibold text-slate-300">Distribuição — maior seq. sorteada</h2>
          <ResponsiveContainer width="100%" height="90%">
            <BarChart data={chartSorteada}>
              <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
              <XAxis dataKey="seq" stroke="#94a3b8" fontSize={12} />
              <YAxis stroke="#94a3b8" fontSize={12} />
              <Tooltip contentStyle={{ background: '#1e293b', border: 'none' }} />
              <Bar dataKey="qtd" fill="#22c55e" radius={4} />
            </BarChart>
          </ResponsiveContainer>
        </div>
        <div className="card h-64">
          <h2 className="mb-2 text-sm font-semibold text-slate-300">Distribuição — maior seq. ausente</h2>
          <ResponsiveContainer width="100%" height="90%">
            <BarChart data={chartAusente}>
              <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
              <XAxis dataKey="seq" stroke="#94a3b8" fontSize={12} />
              <YAxis stroke="#94a3b8" fontSize={12} />
              <Tooltip contentStyle={{ background: '#1e293b', border: 'none' }} />
              <Bar dataKey="qtd" fill="#64748b" radius={4} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </section>

      <section className="card">
        <h2 className="mb-2 text-sm font-semibold text-slate-300">Combinações mais frequentes (sorteada × ausente)</h2>
        <ul className="space-y-1 text-sm">
          {topCombo.map(([k, v]) => (
            <li key={k} className="flex justify-between text-slate-200">
              <span>{k.replace('x', ' sort. / ')} aus.</span>
              <span className="text-slate-400">{v} concursos</span>
            </li>
          ))}
        </ul>
      </section>

      <section className="grid gap-4 md:grid-cols-2">
        <div className="card">
          <h2 className="mb-2 text-sm font-semibold text-emerald-400">Maiores sequências sorteadas</h2>
          <ul className="text-sm text-slate-300">
            {rankingSort.map((c) => (
              <li key={c.numeroConcurso}>
                #{c.numeroConcurso}: {c.maiorSequenciaSorteada}
              </li>
            ))}
          </ul>
        </div>
        <div className="card">
          <h2 className="mb-2 text-sm font-semibold text-slate-400">Maiores sequências ausentes</h2>
          <ul className="text-sm text-slate-300">
            {rankingAus.map((c) => (
              <li key={c.numeroConcurso}>
                #{c.numeroConcurso}: {c.maiorSequenciaAusente}
              </li>
            ))}
          </ul>
        </div>
      </section>

      <section className="card overflow-x-auto">
        <h2 className="mb-3 text-sm font-semibold text-slate-300">Concursos e blocos</h2>
        <table className="w-full text-left text-xs">
          <thead className="text-slate-400">
            <tr>
              <th className="pb-2">Concurso</th>
              <th>Seq. sort.</th>
              <th>Seq. aus.</th>
              <th>Blocos sorteados</th>
              <th>Blocos ausentes</th>
            </tr>
          </thead>
          <tbody>
            {concursos.slice(-50).reverse().map((c) => (
              <tr key={c.numeroConcurso} className="border-t border-slate-800">
                <td className="py-2">{c.numeroConcurso}</td>
                <td className="text-emerald-400">{c.maiorSequenciaSorteada}</td>
                <td className="text-slate-400">{c.maiorSequenciaAusente}</td>
                <td className="max-w-xs truncate text-emerald-300/80">{c.blocosSorteados?.join(', ')}</td>
                <td className="max-w-xs truncate text-slate-500">{c.blocosAusentes?.join(', ')}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>
    </div>
  );
}
