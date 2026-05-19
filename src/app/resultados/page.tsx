'use client';

import { useEffect, useState } from 'react';
import { DezenasGrid } from '@/components/DezenasGrid';
import { CadastroConcursoManual } from '@/components/CadastroConcursoManual';

interface Concurso {
  numeroConcurso: number;
  dataSorteio: string | null;
  soma: number;
  pares: number;
  impares: number;
  moldura: number;
  centro: number;
  primos: number;
  fibonacci: number;
  repetidasConcursoAnterior: number;
  d1: number;
  d2: number;
  d3: number;
  d4: number;
  d5: number;
  d6: number;
  d7: number;
  d8: number;
  d9: number;
  d10: number;
  d11: number;
  d12: number;
  d13: number;
  d14: number;
  d15: number;
}

function dezenas(c: Concurso) {
  return [c.d1, c.d2, c.d3, c.d4, c.d5, c.d6, c.d7, c.d8, c.d9, c.d10, c.d11, c.d12, c.d13, c.d14, c.d15];
}

export default function ResultadosPage() {
  const [concursos, setConcursos] = useState<Concurso[]>([]);
  const [de, setDe] = useState('');
  const [ate, setAte] = useState('');

  function carregar() {
    const params = new URLSearchParams();
    if (de) params.set('de', de);
    if (ate) params.set('ate', ate);
    params.set('limit', '100');
    fetch(`/api/concursos?${params}`)
      .then((r) => r.json())
      .then((d) => setConcursos(d.concursos ?? []));
  }

  useEffect(() => {
    carregar();
  }, []);

  return (
    <section className="space-y-6">
      <header>
        <h1 className="text-2xl font-bold">Resultados</h1>
        <p className="text-sm text-slate-400">Histórico importado com estatísticas por concurso.</p>
      </header>

      <CadastroConcursoManual onCadastrado={carregar} />

      <article className="card flex flex-wrap gap-3">
        <input type="number" placeholder="De concurso" value={de} onChange={(e) => setDe(e.target.value)} className="input max-w-[140px]" />
        <input type="number" placeholder="Até concurso" value={ate} onChange={(e) => setAte(e.target.value)} className="input max-w-[140px]" />
        <button type="button" onClick={carregar} className="btn-secondary">
          Filtrar
        </button>
      </article>

      <ul className="space-y-3">
        {concursos.map((c) => (
          <li key={c.numeroConcurso} className="card">
            <div className="mb-2 flex justify-between text-sm">
              <span className="font-semibold text-brand-300">Concurso {c.numeroConcurso}</span>
              <span className="text-slate-400">
                Soma {c.soma} · Pares {c.pares} · Rep. {c.repetidasConcursoAnterior}
              </span>
            </div>
            <DezenasGrid dezenas={dezenas(c)} size="sm" />
          </li>
        ))}
      </ul>
    </section>
  );
}

