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

type Point = { label: string; qtd: number };
type FreqPoint = { dezena: string; qtd: number; pct: number };

export function DashboardCharts({
  frequenciaDezenas,
  pares,
  impares,
  soma,
  repetidas,
  seqSorteada,
  seqAusente,
}: {
  frequenciaDezenas: FreqPoint[];
  pares: Point[];
  impares: Point[];
  soma: Point[];
  repetidas: Point[];
  seqSorteada: Point[];
  seqAusente: Point[];
}) {
  const charts: { title: string; data: Point[] | FreqPoint[]; dataKey: string; freq?: boolean }[] = [
    { title: 'Frequência das dezenas', data: frequenciaDezenas, dataKey: 'qtd', freq: true },
    { title: 'Distribuição de pares', data: pares, dataKey: 'qtd' },
    { title: 'Distribuição de ímpares', data: impares, dataKey: 'qtd' },
    { title: 'Distribuição de soma', data: soma, dataKey: 'qtd' },
    { title: 'Repetidas do concurso anterior', data: repetidas, dataKey: 'qtd' },
    { title: 'Maior sequência sorteada', data: seqSorteada, dataKey: 'qtd' },
    { title: 'Maior sequência ausente', data: seqAusente, dataKey: 'qtd' },
  ];

  return (
    <section className="grid gap-4 md:grid-cols-2">
      {charts.map(({ title, data, dataKey, freq }) => (
        <div key={title} className="card h-56">
          <h2 className="mb-2 text-sm font-semibold text-slate-300">{title}</h2>
          <ResponsiveContainer width="100%" height="85%">
            <BarChart data={data}>
              <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
              <XAxis
                dataKey={freq ? 'dezena' : 'label'}
                stroke="#94a3b8"
                fontSize={10}
                interval={freq ? 2 : 0}
              />
              <YAxis stroke="#94a3b8" fontSize={10} />
              <Tooltip
                contentStyle={{ background: '#1e293b', border: 'none', fontSize: 12 }}
                formatter={(v: number, _n, p) => {
                  if (freq && p?.payload) {
                    const row = p.payload as FreqPoint;
                    return [`${v} (${row.pct}%)`, 'Ocorrências'];
                  }
                  return [v, 'Concursos'];
                }}
              />
              <Bar dataKey={dataKey} fill="#10b981" radius={3} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      ))}
    </section>
  );
}
