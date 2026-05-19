'use client';

import { PERFIS_GERACAO, type PerfilId } from '@/lib/lotofacil/perfis';
import Link from 'next/link';

export default function PerfisPage() {
  const perfis = Object.values(PERFIS_GERACAO);

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-bold text-white">Perfis de geração</h1>
        <p className="text-sm text-slate-400">Perfil estatístico configurável para o gerador</p>
      </header>
      <div className="grid gap-4 md:grid-cols-2">
        {perfis.map((p) => (
          <div key={p.id} className="card">
            <h2 className="font-semibold text-brand-300">{p.nome}</h2>
            <p className="mt-1 text-sm text-slate-400">{p.descricao}</p>
            <dl className="mt-3 grid grid-cols-2 gap-1 text-xs text-slate-300">
              <div>Base: {p.basePadrao}</div>
              <div>Score mín.: {p.scoreMinimo}</div>
              <div>Repetidas: {p.config.repetidas.min}–{p.config.repetidas.max}</div>
              <div>Soma: {p.config.soma.min}–{p.config.soma.max}</div>
              {p.config.maiorSeqSorteada && (
                <div>
                  Seq. sort.: {p.config.maiorSeqSorteada.min}–{p.config.maiorSeqSorteada.max}
                </div>
              )}
              {p.config.maiorSeqAusente && (
                <div>
                  Seq. aus.: {p.config.maiorSeqAusente.min}–{p.config.maiorSeqAusente.max}
                </div>
              )}
            </dl>
          </div>
        ))}
      </div>
      <Link href="/gerador" className="btn-primary inline-block">
        Usar no Gerador
      </Link>
    </div>
  );
}
