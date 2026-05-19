'use client';

import { useState } from 'react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
} from 'recharts';

export default function SimuladorPage() {
  const [texto, setTexto] = useState('');
  const [inicio, setInicio] = useState('');
  const [fim, setFim] = useState('');
  const [resultado, setResultado] = useState<{
    totais: Record<string, number>;
    ranking: { dezenas: number[]; melhorAcerto: number; distribuicao: Record<string, number> }[];
    analiseCriterios?: {
      jogosAnalisados: number;
      criterios: {
        criterio: string;
        faixaMin: number;
        faixaMax: number;
        dentroFaixa: number;
        total: number;
        percentual: number;
      }[];
    };
  } | null>(null);
  const [loading, setLoading] = useState(false);
  const [erro, setErro] = useState('');

  async function simular() {
    setLoading(true);
    setErro('');
    const res = await fetch('/api/simulador', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        textoJogos: texto,
        concursoInicio: inicio ? Number(inicio) : undefined,
        concursoFim: fim ? Number(fim) : undefined,
      }),
    });
    const data = await res.json();
    if (!res.ok) {
      setErro(data.error ?? 'Erro na simulação');
      setResultado(null);
    } else {
      setResultado(data);
    }
    setLoading(false);
  }

  function usarJogosGerados() {
    const raw = sessionStorage.getItem('lotofacil-ultimos-jogos');
    if (raw) setTexto(raw);
  }

  const chartData = resultado
    ? Object.entries(resultado.totais).map(([k, v]) => ({ acertos: `${k} pts`, qtd: v }))
    : [];

  return (
    <section className="space-y-6">
      <header>
        <h1 className="text-2xl font-bold">Simulador Retroativo</h1>
        <p className="text-sm text-slate-400">
          Cole jogos (uma linha por jogo, 15 dezenas) e compare com concursos passados importados.
        </p>
      </header>

      <article className="card space-y-3">
        <textarea
          value={texto}
          onChange={(e) => setTexto(e.target.value)}
          placeholder="01 02 03 04 05 06 07 08 09 10 11 12 13 14 15"
          className="input min-h-[120px] font-mono"
        />
        <div className="grid gap-3 md:grid-cols-2">
          <input
            type="number"
            placeholder="Concurso inicial"
            value={inicio}
            onChange={(e) => setInicio(e.target.value)}
            className="input"
          />
          <input
            type="number"
            placeholder="Concurso final"
            value={fim}
            onChange={(e) => setFim(e.target.value)}
            className="input"
          />
        </div>
        <div className="flex flex-wrap gap-2">
          <button type="button" onClick={simular} disabled={loading} className="btn-primary">
            {loading ? 'Simulando…' : 'Executar simulação'}
          </button>
          <button type="button" onClick={usarJogosGerados} className="btn-secondary">
            Colar últimos jogos gerados
          </button>
        </div>
        {erro && <p className="text-sm text-red-300">{erro}</p>}
      </article>

      {resultado && (
        <>
          <article className="card h-64">
            <h2 className="mb-2 text-sm font-semibold">Distribuição de acertos (todos os jogos)</h2>
            <ResponsiveContainer width="100%" height="90%">
              <BarChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                <XAxis dataKey="acertos" stroke="#94a3b8" />
                <YAxis stroke="#94a3b8" />
                <Tooltip />
                <Bar dataKey="qtd" fill="#10b981" />
              </BarChart>
            </ResponsiveContainer>
          </article>

          {resultado.analiseCriterios && resultado.analiseCriterios.criterios.length > 0 && (
            <article className="card overflow-x-auto">
              <h2 className="mb-2 text-sm font-semibold">
                Critérios nos jogos vencedores (13+ acertos)
              </h2>
              <p className="mb-3 text-xs text-slate-400">
                {resultado.analiseCriterios.jogosAnalisados} jogos analisados — percentual dentro das
                faixas históricas fortes
              </p>
              <table className="w-full text-left text-sm">
                <thead className="text-slate-400">
                  <tr>
                    <th className="pb-2">Critério</th>
                    <th>Faixa</th>
                    <th>Dentro</th>
                    <th>%</th>
                  </tr>
                </thead>
                <tbody>
                  {resultado.analiseCriterios.criterios.map((c) => (
                    <tr key={c.criterio} className="border-t border-slate-700/50">
                      <td className="py-1">{c.criterio}</td>
                      <td>
                        {c.faixaMin}–{c.faixaMax}
                      </td>
                      <td>
                        {c.dentroFaixa}/{c.total}
                      </td>
                      <td className={c.percentual >= 80 ? 'text-emerald-400' : 'text-slate-300'}>
                        {c.percentual}%
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </article>
          )}

          <article className="card overflow-x-auto">
            <h2 className="mb-2 text-sm font-semibold">Ranking de jogos</h2>
            <table className="w-full text-left text-sm">
              <thead className="text-slate-400">
                <tr>
                  <th>#</th>
                  <th>Dezenas</th>
                  <th>11</th>
                  <th>12</th>
                  <th>13</th>
                  <th>14</th>
                  <th>15</th>
                  <th>Melhor</th>
                </tr>
              </thead>
              <tbody>
                {resultado.ranking.slice(0, 30).map((j, i) => (
                  <tr key={i} className="border-t border-slate-700/50">
                    <td className="py-1">{i + 1}</td>
                    <td className="font-mono text-xs">
                      {j.dezenas.map((d) => String(d).padStart(2, '0')).join(' ')}
                    </td>
                    <td>{j.distribuicao[11] ?? 0}</td>
                    <td>{j.distribuicao[12] ?? 0}</td>
                    <td>{j.distribuicao[13] ?? 0}</td>
                    <td>{j.distribuicao[14] ?? 0}</td>
                    <td>{j.distribuicao[15] ?? 0}</td>
                    <td>{j.melhorAcerto}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </article>
        </>
      )}
    </section>
  );
}

