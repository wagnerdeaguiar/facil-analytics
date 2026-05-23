import { prisma } from '@/lib/db';
import { extrairDezenasConcurso } from '@/lib/lotofacil/metrics';
import { calcularFrequencias } from '@/lib/lotofacil/pareto';
import { buildConcursosMetricas, analisarCriteriosFortes, labelStatus } from '@/lib/lotofacil/recurrence';
import { buildDashboardChartData } from '@/lib/lotofacil/dashboard-stats';
import { DezenasGrid } from '@/components/DezenasGrid';
import { AcoesRapidas } from '@/components/AcoesRapidas';
import { DashboardCharts } from '@/components/DashboardCharts';
import Link from 'next/link';

async function loadDashboard() {
  try {
    const concursos = await prisma.concurso.findMany({ orderBy: { numeroConcurso: 'asc' } });
    if (!concursos.length) return null;

    const dezenasList = concursos.map((c) => extrairDezenasConcurso(c));
    const freqs = calcularFrequencias(dezenasList);
    const metricas = buildConcursosMetricas(concursos);
    const analise = analisarCriteriosFortes(metricas);
    const ultimo = concursos[concursos.length - 1];

    const n = concursos.length;
    const media = (campo: keyof typeof concursos[0]) =>
      Math.round((concursos.reduce((s, c) => s + Number(c[campo] ?? 0), 0) / n) * 100) / 100;

    const statusCount = { muito_forte: 0, forte: 0, medio: 0, fraco: 0 };
    for (const c of analise.criterios) {
      statusCount[c.status]++;
    }

    return {
      total: n,
      ultimo,
      ultimoDezenas: extrairDezenasConcurso(ultimo),
      topQuentes: freqs.slice(0, 10),
      topFrias: [...freqs].reverse().slice(0, 10),
      criteriosFortes: analise.criterios.filter((c) => c.acima80).slice(0, 12),
      mediaSoma: analise.mediaSoma,
      medias: {
        repetidas: media('repetidasConcursoAnterior'),
        pares: media('pares'),
        impares: media('impares'),
        soma: media('soma'),
        moldura: media('moldura'),
        centro: media('centro'),
        primos: media('primos'),
        fibonacci: media('fibonacci'),
        maiorSeqSorteada: media('maiorSequenciaSorteada'),
        maiorSeqAusente: media('maiorSequenciaAusente'),
      },
      statusCount,
      charts: buildDashboardChartData(concursos),
    };
  } catch {
    return null;
  }
}

export default async function DashboardPage() {
  const data = await loadDashboard();

  if (!data) {
    return (
      <div className="space-y-4">
        <h1 className="text-2xl font-bold">Dashboard</h1>
        <div className="card">
          <p className="text-slate-300">
            Nenhum concurso importado. Vá em{' '}
            <Link href="/resultados#importacao" className="text-brand-400 underline">
              Resultados
            </Link>{' '}
            para importar o histórico.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-bold text-white">Dashboard — Fácil Analytics</h1>
        <p className="text-sm text-slate-400">
          {data.total} concursos · Padrão histórico · Score de aderência
        </p>
      </header>

      <AcoesRapidas />

      <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {[
          { label: 'Muito forte', val: data.statusCount.muito_forte, cls: 'border-emerald-600/40' },
          { label: 'Forte', val: data.statusCount.forte, cls: 'border-brand-600/40' },
          { label: 'Médio', val: data.statusCount.medio, cls: 'border-amber-600/40' },
          { label: 'Fraco', val: data.statusCount.fraco, cls: 'border-slate-600/40' },
        ].map((s) => (
          <div key={s.label} className={`card border ${s.cls}`}>
            <p className="text-xs text-slate-400">{s.label}</p>
            <p className="text-2xl font-bold text-white">{s.val}</p>
            <p className="text-xs text-slate-500">critérios analisados</p>
          </div>
        ))}
      </section>

      <section className="grid gap-4 md:grid-cols-2">
        <div className="card">
          <h2 className="mb-2 text-sm font-semibold text-slate-300">
            Último concurso #{data.ultimo.numeroConcurso}
          </h2>
          <DezenasGrid dezenas={data.ultimoDezenas} />
          <dl className="mt-3 grid grid-cols-2 gap-2 text-xs text-slate-400">
            <div>Soma: {data.ultimo.soma}</div>
            <div>Pares: {data.ultimo.pares}</div>
            <div>Repetidas: {data.ultimo.repetidasConcursoAnterior}</div>
            <div>Seq. sorteada máx.: {data.ultimo.maiorSequenciaSorteada ?? '—'}</div>
            <div>Seq. ausente máx.: {data.ultimo.maiorSequenciaAusente ?? '—'}</div>
          </dl>
        </div>

        <div className="card">
          <h2 className="mb-2 text-sm font-semibold text-slate-300">Médias históricas</h2>
          <dl className="grid grid-cols-2 gap-2 text-xs text-slate-300">
            <div>Repetidas: {data.medias.repetidas}</div>
            <div>Soma: {data.medias.soma}</div>
            <div>Pares: {data.medias.pares}</div>
            <div>Moldura: {data.medias.moldura}</div>
            <div>Centro: {data.medias.centro}</div>
            <div>Primos: {data.medias.primos}</div>
            <div>Seq. sorteada: {data.medias.maiorSeqSorteada}</div>
            <div>Seq. ausente: {data.medias.maiorSeqAusente}</div>
          </dl>
        </div>
      </section>

      <section className="grid gap-4 md:grid-cols-2">
        <div className="card">
          <h2 className="mb-2 text-sm font-semibold text-slate-300">Top 10 quentes</h2>
          <ul className="space-y-1 text-sm">
            {data.topQuentes.map((f) => (
              <li key={f.dezena} className="flex justify-between text-slate-200">
                <span>{String(f.dezena).padStart(2, '0')} — {f.classificacao}</span>
                <span className="text-slate-400">{f.percentual}%</span>
              </li>
            ))}
          </ul>
        </div>
        <div className="card">
          <h2 className="mb-2 text-sm font-semibold text-slate-300">Top 10 frias</h2>
          <ul className="space-y-1 text-sm">
            {data.topFrias.map((f) => (
              <li key={f.dezena} className="flex justify-between text-slate-200">
                <span>{String(f.dezena).padStart(2, '0')} — {f.classificacao}</span>
                <span className="text-slate-400">{f.percentual}%</span>
              </li>
            ))}
          </ul>
        </div>
      </section>

      <DashboardCharts {...data.charts} />

      <section className="card">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-sm font-semibold text-slate-300">Critérios fortes (recorrência ≥ 80%)</h2>
          <Link href="/criterios" className="text-xs text-brand-400 hover:underline">
            Ver todos
          </Link>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="text-slate-400">
              <tr>
                <th className="pb-2">Critério</th>
                <th>Faixa histórica</th>
                <th>Ocorrência</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {data.criteriosFortes.map((c) => (
                <tr key={`${c.criterio}-${c.min}`} className="border-t border-slate-700/50">
                  <td className="py-2">{c.criterio}</td>
                  <td>
                    {c.min} a {c.max}
                  </td>
                  <td>{c.percentual}%</td>
                  <td>
                    <span className="badge-forte">{labelStatus(c.status)}</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
