'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';

interface Faixa {
  criterio: string;
  min: number;
  max: number;
  percentual: number;
  statusLabel: string;
  acima80: boolean;
}

export default function CriteriosPage() {
  const [tabela, setTabela] = useState<Faixa[]>([]);
  const [ideais, setIdeais] = useState<Faixa[]>([]);
  const [mediaSoma, setMediaSoma] = useState(196);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/criterios')
      .then((r) => r.json())
      .then((d) => {
        setTabela(d.tabela ?? []);
        setIdeais(d.ideais ?? []);
        setMediaSoma(d.mediaSoma ?? 196);
      })
      .finally(() => setLoading(false));
  }, []);

  return (
    <section className="space-y-6">
      <header>
        <h1 className="text-2xl font-bold">Critérios Fortes</h1>
        <p className="text-sm text-slate-400">
          Faixas com recorrência histórica calculada sobre os concursos importados. Soma média:{' '}
          {mediaSoma}
        </p>
      </header>

      {loading ? (
        <p className="text-slate-400">Calculando padrões históricos…</p>
      ) : (
        <>
          <article className="card overflow-x-auto">
            <h2 className="mb-3 text-sm font-semibold text-slate-300">Faixa ampla (≥ 80% quando aplicável)</h2>
            <table className="w-full text-left text-sm">
              <thead className="text-slate-400">
                <tr>
                  <th className="pb-2">Critério</th>
                  <th>Faixa</th>
                  <th>Ocorrência</th>
                  <th>Status</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {tabela.map((c) => (
                  <tr key={`${c.criterio}-${c.min}`} className="border-t border-slate-700/50">
                    <td className="py-2">{c.criterio}</td>
                    <td>
                      {c.min} a {c.max}
                    </td>
                    <td>{c.percentual}%</td>
                    <td>
                      <span className={c.acima80 ? 'badge-forte' : 'badge-medio'}>{c.statusLabel}</span>
                    </td>
                    <td>
                      <Link
                        href={`/gerador?criterio=${encodeURIComponent(c.criterio)}`}
                        className="text-xs text-brand-400 hover:underline"
                      >
                        Usar no gerador
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </article>

          <article className="card overflow-x-auto">
            <h2 className="mb-3 text-sm font-semibold text-slate-300">Faixa premium (mais restritiva, ainda ≥ 80%)</h2>
            <table className="w-full text-left text-sm">
              <thead className="text-slate-400">
                <tr>
                  <th className="pb-2">Critério</th>
                  <th>Faixa ideal</th>
                  <th>Ocorrência</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {ideais.map((c) => (
                  <tr key={`ideal-${c.criterio}`} className="border-t border-slate-700/50">
                    <td className="py-2">{c.criterio}</td>
                    <td>
                      {c.min} a {c.max}
                    </td>
                    <td>{c.percentual}%</td>
                    <td>
                      <span className="badge-forte">{c.statusLabel}</span>
                    </td>
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
