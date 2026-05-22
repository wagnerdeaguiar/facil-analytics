'use client';

import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { DezenasGrid } from '@/components/DezenasGrid';
import { labelStatus, type StatusForca } from '@/lib/lotofacil/recurrence';

export type CoberturaBase = {
  tipo: string;
  dezenas: number[];
  coberturas: {
    baseSize: number;
    limiar: number;
    percentual: number;
    status: StatusForca;
  }[];
  distribuicaoAcertos: {
    acertos: number;
    quantidade: number;
    percentual: number;
  }[];
};

type BaseItem = {
  tipo: string;
  dezenas: number[];
  estatisticas: Record<string, number>;
};

type RankingItem = {
  dezena: number;
  classificacao: string;
  percentual: number;
  rankingPareto?: number;
};

function statusBadgeClass(status: StatusForca) {
  switch (status) {
    case 'muito_forte':
      return 'bg-emerald-900/60 text-emerald-300';
    case 'forte':
      return 'badge-forte';
    case 'medio':
      return 'badge-medio';
    default:
      return 'bg-slate-700/80 text-slate-400';
  }
}

export function BasesParetoView({
  bases,
  cobertura,
  ranking,
}: {
  bases: BaseItem[];
  cobertura: CoberturaBase[];
  ranking: RankingItem[];
}) {
  const coberturaMap = new Map(cobertura.map((c) => [c.tipo, c]));

  return (
    <div className="space-y-6">
      {bases.map((b) => {
        const cov = coberturaMap.get(b.tipo);
        const chartData =
          cov?.distribuicaoAcertos.map((d) => ({
            label: `${d.acertos} acertos`,
            qtd: d.quantidade,
            pct: d.percentual,
          })) ?? [];

        return (
          <article key={b.tipo} className="card space-y-4">
            <header>
              <h2 className="text-lg font-semibold text-brand-300">Base {b.tipo}</h2>
              <p className="text-xs text-slate-500">
                {b.dezenas.length} dezenas no ranking Pareto · cobertura retroativa no histórico importado
              </p>
            </header>

            <DezenasGrid dezenas={b.dezenas} />

            <dl className="grid grid-cols-2 gap-2 text-xs text-slate-400 sm:grid-cols-5">
              <div>Soma: {b.estatisticas.soma}</div>
              <div>Pares: {b.estatisticas.pares}</div>
              <div>Primos: {b.estatisticas.primos}</div>
              <div>Fibonacci: {b.estatisticas.fibonacci}</div>
              <div>Moldura: {b.estatisticas.moldura}</div>
            </dl>

            {cov && (
              <>
                <div>
                  <h3 className="mb-2 text-sm font-semibold text-slate-300">
                    Cobertura histórica (% de concursos com ≥ N acertos na base)
                  </h3>
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-sm">
                      <thead className="text-slate-400">
                        <tr>
                          <th className="pb-2">Limiar</th>
                          <th>% concursos</th>
                          <th>Status</th>
                        </tr>
                      </thead>
                      <tbody>
                        {cov.coberturas.map((c) => (
                          <tr key={c.limiar} className="border-t border-slate-700/50">
                            <td className="py-1.5">≥ {c.limiar} acertos</td>
                            <td>{c.percentual}%</td>
                            <td>
                              <span className={`rounded-full px-2 py-0.5 text-xs ${statusBadgeClass(c.status)}`}>
                                {labelStatus(c.status)}
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  <p className="mt-2 text-xs text-slate-500">
                    Ex.: limiar 11 = em quantos % dos sorteios pelo menos 11 das 15 dezenas sorteadas estavam dentro
                    desta base.
                  </p>
                </div>

                <div className="h-52">
                  <h3 className="mb-2 text-sm font-semibold text-slate-300">Distribuição de acertos (base vs sorteio)</h3>
                  <ResponsiveContainer width="100%" height="90%">
                    <BarChart data={chartData}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                      <XAxis dataKey="label" stroke="#94a3b8" fontSize={10} />
                      <YAxis stroke="#94a3b8" fontSize={10} />
                      <Tooltip
                        contentStyle={{ background: '#1e293b', border: 'none', fontSize: 12 }}
                        formatter={(v: number, _n, p) => {
                          const row = p?.payload as { pct?: number };
                          return [`${v} concursos (${row?.pct ?? 0}%)`, 'Quantidade'];
                        }}
                      />
                      <Bar dataKey="qtd" fill="#10b981" radius={3} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </>
            )}
          </article>
        );
      })}

      {ranking.length > 0 && (
        <article className="card">
          <h2 className="mb-3 text-sm font-semibold text-slate-300">Ranking Pareto (frequência histórica)</h2>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="text-slate-400">
                <tr>
                  <th className="pb-2">#</th>
                  <th>Dezena</th>
                  <th>Classificação</th>
                  <th>% no histórico</th>
                </tr>
              </thead>
              <tbody>
                {ranking.slice(0, 25).map((r, i) => (
                  <tr key={r.dezena} className="border-t border-slate-700/50">
                    <td className="py-1">{r.rankingPareto ?? i + 1}</td>
                    <td className="font-mono">{String(r.dezena).padStart(2, '0')}</td>
                    <td>{r.classificacao}</td>
                    <td>{r.percentual}%</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </article>
      )}
    </div>
  );
}
