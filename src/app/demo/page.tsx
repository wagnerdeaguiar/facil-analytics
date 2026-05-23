import Link from 'next/link';
import { prisma } from '@/lib/db';
import { extrairDezenasConcurso } from '@/lib/lotofacil/metrics';
import { calcularFrequencias } from '@/lib/lotofacil/pareto';
import { DezenasGrid } from '@/components/DezenasGrid';
import { Disclaimer } from '@/components/Disclaimer';

export const dynamic = 'force-dynamic';

export default async function DemoPage() {
  const concursos = await prisma.concurso.findMany({
    orderBy: { numeroConcurso: 'desc' },
    take: 1,
  });
  const ultimo = concursos[0];
  const total = await prisma.concurso.count();

  let topQuentes: { dezena: number; percentual: number }[] = [];
  if (total > 0) {
    const all = await prisma.concurso.findMany({
      orderBy: { numeroConcurso: 'asc' },
      take: 500,
    });
    const freqs = calcularFrequencias(all.map((c) => extrairDezenasConcurso(c)));
    topQuentes = freqs.slice(0, 5).map((f) => ({ dezena: f.dezena, percentual: f.percentual }));
  }

  return (
    <div className="mx-auto max-w-2xl space-y-6 px-4 py-12">
      <h1 className="text-2xl font-bold text-white">Demonstração limitada</h1>
      <Disclaimer />
      <p className="text-sm text-slate-400">
        Visão parcial do Dashboard. Faça login para acesso completo e Premium para gerador e simulador.
      </p>
      {ultimo ? (
        <div className="card">
          <p className="text-sm text-slate-400">Último concurso (de {total} no banco)</p>
          <p className="font-semibold text-white">#{ultimo.numeroConcurso}</p>
          <DezenasGrid dezenas={extrairDezenasConcurso(ultimo)} />
          <ul className="mt-3 text-xs text-slate-400">
            {topQuentes.map((f) => (
              <li key={f.dezena}>
                Dezena {String(f.dezena).padStart(2, '0')}: {f.percentual}% recorrência (amostra)
              </li>
            ))}
          </ul>
        </div>
      ) : (
        <p className="text-slate-500">Importe concursos em Resultados (requer login Premium).</p>
      )}
      <div className="flex gap-3">
        <Link href="/entrar" className="btn-primary">
          Entrar com Google
        </Link>
        <Link href="/precos" className="btn-secondary">
          Ver Premium
        </Link>
      </div>
    </div>
  );
}
