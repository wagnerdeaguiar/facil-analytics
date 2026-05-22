'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { BasesParetoView, type CoberturaBase } from '@/components/BasesParetoView';

type BaseItem = {
  tipo: string;
  dezenas: number[];
  estatisticas: Record<string, number>;
};

type BasesData = {
  bases: BaseItem[];
  cobertura: CoberturaBase[];
  ranking: { dezena: number; classificacao: string; percentual: number; rankingPareto?: number }[];
  error?: string;
  mensagem?: string;
};

export default function BasesPage() {
  const [data, setData] = useState<BasesData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/bases')
      .then((r) => r.json())
      .then((d: BasesData & { error?: string }) => {
        setData({
          bases: Array.isArray(d.bases) ? d.bases : [],
          cobertura: Array.isArray(d.cobertura) ? (d.cobertura as CoberturaBase[]) : [],
          ranking: Array.isArray(d.ranking) ? d.ranking : [],
          error: d.error,
          mensagem: d.mensagem,
        });
      })
      .catch(() => {
        setData({
          bases: [],
          cobertura: [],
          ranking: [],
          error: 'Falha ao carregar bases.',
        });
      })
      .finally(() => setLoading(false));
  }, []);

  return (
    <section className="space-y-6">
      <header>
        <h1 className="text-2xl font-bold">Bases Pareto</h1>
        <p className="text-sm text-slate-400">
          Bases 18D, 19D e 20D montadas pelo ranking de frequência histórica e cobertura retroativa.
        </p>
      </header>

      {loading ? (
        <p className="text-slate-400">Carregando…</p>
      ) : data?.error && !data.bases.length ? (
        <div className="card text-red-300">{data.error}</div>
      ) : !data?.bases.length ? (
        <div className="card text-slate-300">
          <p>{data?.mensagem ?? 'Nenhuma base disponível.'}</p>
          <p className="mt-2 text-sm">
            <Link href="/configuracoes" className="text-brand-400 underline">
              Importar histórico em Configurações
            </Link>
          </p>
        </div>
      ) : (
        <BasesParetoView bases={data.bases} cobertura={data.cobertura} ranking={data.ranking} />
      )}
    </section>
  );
}
