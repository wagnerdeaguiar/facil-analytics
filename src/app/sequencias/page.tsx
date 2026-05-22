'use client';

import { useCallback, useEffect, useState } from 'react';

interface DezenaRow {
  dezena: number;
  frequencia: number;
  sequenciaAtual: number;
  sequenciaMedia: number;
  sequenciaMaxima: number;
  statusSequencia: string;
  atrasoAtual: number;
  atrasoMedio: number;
  atrasoMaximo: number;
  statusAtraso: string;
  pesoGerador: number;
}

export default function SequenciasPage() {
  const [data, setData] = useState<{
    periodo: { de?: number; ate?: number; total: number };
    analise: {
      dezenas: DezenaRow[];
      repetidasGeral: {
        media: number;
        mediana: number;
        distribuicao: { valor: number; quantidade: number; percentual: number }[];
        faixas: { faixa: string; percentual: number; acima80: boolean }[];
      };
      probContinuarSequencia: { estado: number; casos: number; percentual: number }[];
      probVoltarAtraso: { estado: number; casos: number; percentual: number }[];
    };
  } | null>(null);
  const [de, setDe] = useState('');
  const [ate, setAte] = useState('');
  const [loading, setLoading] = useState(true);

  const carregar = useCallback((deInicio?: string, ateFim?: string) => {
    const deVal = deInicio ?? de;
    const ateVal = ateFim ?? ate;
    const params = new URLSearchParams();
    if (deVal) params.set('de', deVal);
    if (ateVal) params.set('ate', ateVal);
    setLoading(true);
    fetch(`/api/sequencias?${params}`)
      .then((r) => r.json())
      .then((json) => {
        setData(json);
        if (json.periodo?.de != null) setDe(String(json.periodo.de));
        if (json.periodo?.ate != null) setAte(String(json.periodo.ate));
      })
      .finally(() => setLoading(false));
  }, [de, ate]);

  useEffect(() => {
    setLoading(true);
    fetch('/api/sequencias')
      .then((r) => r.json())
      .then((json) => {
        setData(json);
        if (json.periodo?.de != null) setDe(String(json.periodo.de));
        if (json.periodo?.ate != null) setAte(String(json.periodo.ate));
      })
      .finally(() => setLoading(false));
  }, []);

  const statusSeqLabel: Record<string, string> = {
    normal: 'Normal',
    atencao: 'Atenção',
    esticada: 'Esticada',
    muito_esticada: 'Muito esticada',
  };

  const statusAtrLabel: Record<string, string> = {
    presente: 'Presente',
    normal: 'Normal',
    observacao: 'Observação',
    atrativa: 'Atrativa',
    forte_retorno: 'Forte retorno',
    extrema: 'Extrema',
  };

  return (
    <section className="space-y-6">
      <header>
        <h1 className="text-2xl font-bold">Sequências e Atrasos</h1>
        <p className="text-sm text-slate-400">
          Camada 1: repetição geral entre concursos. Camada 2: sequência e atraso por dezena (auditável no
          histórico importado).
        </p>
      </header>

      <article className="card flex flex-wrap gap-3">
        <input
          type="number"
          placeholder="Concurso inicial (ex. 3442)"
          value={de}
          onChange={(e) => setDe(e.target.value)}
          className="input max-w-[160px]"
        />
        <input
          type="number"
          placeholder="Concurso final (ex. 3542)"
          value={ate}
          onChange={(e) => setAte(e.target.value)}
          className="input max-w-[160px]"
        />
        <button type="button" onClick={() => carregar()} className="btn-primary">
          Recalcular período
        </button>
        <span className="self-center text-xs text-slate-500">
          Padrão: últimos 10 concursos da base
        </span>
      </article>

      {loading && !data ? (
        <p className="text-slate-400">Carregando análise…</p>
      ) : !data ? (
        <p className="text-slate-400">Nenhum dado para o período informado.</p>
      ) : (
        <>
          <article className="card">
            <h2 className="mb-2 text-sm font-semibold text-brand-300">
              Repetidas do concurso anterior (visão geral)
            </h2>
            <p className="text-xs text-slate-400">
              Período: {data.periodo.de} – {data.periodo.ate} ({data.periodo.total} concursos) · Média{' '}
              {data.analise.repetidasGeral.media} · Mediana {data.analise.repetidasGeral.mediana}
            </p>
            <ul className="mt-2 space-y-1 text-sm">
              {data.analise.repetidasGeral.faixas.map((f) => (
                <li key={f.faixa}>
                  {f.faixa}: <strong>{f.percentual}%</strong>
                  {f.acima80 && <span className="ml-2 badge-forte">≥ 80%</span>}
                </li>
              ))}
            </ul>
          </article>

          <article className="card overflow-x-auto">
            <h2 className="mb-3 text-sm font-semibold">Tabela das 25 dezenas (último concurso da base)</h2>
            <table className="w-full text-left text-xs">
              <thead className="text-slate-400">
                <tr>
                  <th className="pb-2">Dez.</th>
                  <th>Freq.</th>
                  <th>Seq. atual</th>
                  <th>Seq. média</th>
                  <th>Seq. máx.</th>
                  <th>Status seq.</th>
                  <th>Atr. atual</th>
                  <th>Atr. médio</th>
                  <th>Atr. máx.</th>
                  <th>Status atr.</th>
                  <th>Peso</th>
                </tr>
              </thead>
              <tbody>
                {data.analise.dezenas
                  .sort((a, b) => b.sequenciaAtual - a.sequenciaAtual || b.atrasoAtual - a.atrasoAtual)
                  .map((d) => (
                    <tr key={d.dezena} className="border-t border-slate-700/50">
                      <td className="py-1 font-mono">{String(d.dezena).padStart(2, '0')}</td>
                      <td>{d.frequencia}</td>
                      <td className={d.sequenciaAtual >= 5 ? 'text-amber-300' : ''}>{d.sequenciaAtual}</td>
                      <td>{d.sequenciaMedia}</td>
                      <td>{d.sequenciaMaxima}</td>
                      <td>{statusSeqLabel[d.statusSequencia] ?? d.statusSequencia}</td>
                      <td className={d.atrasoAtual >= 3 ? 'text-emerald-300' : ''}>{d.atrasoAtual}</td>
                      <td>{d.atrasoMedio}</td>
                      <td>{d.atrasoMaximo}</td>
                      <td>{statusAtrLabel[d.statusAtraso] ?? d.statusAtraso}</td>
                      <td>{d.pesoGerador.toFixed(2)}</td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </article>

          <section className="grid gap-4 md:grid-cols-2">
            <article className="card">
              <h3 className="mb-2 text-sm font-semibold">Prob. de continuar sequência</h3>
              <table className="w-full text-xs">
                <thead>
                  <tr className="text-slate-400">
                    <th>Seq. atual</th>
                    <th>Casos</th>
                    <th>% próximo</th>
                  </tr>
                </thead>
                <tbody>
                  {data.analise.probContinuarSequencia.map((p) => (
                    <tr key={p.estado} className="border-t border-slate-700/40">
                      <td>{p.estado}</td>
                      <td>{p.casos}</td>
                      <td>{p.percentual}%</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </article>
            <article className="card">
              <h3 className="mb-2 text-sm font-semibold">Prob. de voltar após atraso</h3>
              <table className="w-full text-xs">
                <thead>
                  <tr className="text-slate-400">
                    <th>Atraso</th>
                    <th>Casos</th>
                    <th>% próximo</th>
                  </tr>
                </thead>
                <tbody>
                  {data.analise.probVoltarAtraso.map((p) => (
                    <tr key={p.estado} className="border-t border-slate-700/40">
                      <td>{p.estado}</td>
                      <td>{p.casos}</td>
                      <td>{p.percentual}%</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </article>
          </section>
        </>
      )}
    </section>
  );
}
