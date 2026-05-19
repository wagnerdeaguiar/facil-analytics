import { FAIXAS_CANDIDATAS } from './constants';
import { calcularMetricas, extrairDezenasConcurso } from './metrics';

export type StatusForca = 'muito_forte' | 'forte' | 'medio' | 'fraco';

export interface FaixaAnalisada {
  criterio: string;
  min: number;
  max: number;
  percentual: number;
  status: StatusForca;
  acima80: boolean;
  tipoFaixa: 'ampla' | 'ideal' | 'candidata';
}

export interface ConcursoComMetricas {
  numeroConcurso: number;
  metricas: {
    repetidas: number;
    pares: number;
    impares: number;
    soma: number;
    moldura: number;
    centro: number;
    primos: number;
    fibonacci: number;
    maiorSequenciaSorteada: number;
    maiorSequenciaAusente: number;
  };
  dezenas: number[];
}

export function statusFromPercentual(p: number): StatusForca {
  if (p >= 90) return 'muito_forte';
  if (p >= 80) return 'forte';
  if (p >= 65) return 'medio';
  return 'fraco';
}

export function labelStatus(s: StatusForca): string {
  const map: Record<StatusForca, string> = {
    muito_forte: 'Muito forte',
    forte: 'Forte',
    medio: 'Médio',
    fraco: 'Fraco',
  };
  return map[s];
}

function percentualNaFaixa(valores: number[], min: number, max: number): number {
  if (valores.length === 0) return 0;
  const dentro = valores.filter((v) => v >= min && v <= max).length;
  return (dentro / valores.length) * 100;
}

function melhorFaixa(
  criterio: string,
  valores: number[],
  faixas: readonly (readonly [number, number])[],
): FaixaAnalisada | null {
  if (valores.length === 0) return null;

  let melhor: FaixaAnalisada | null = null;
  for (const [min, max] of faixas) {
    const pct = percentualNaFaixa(valores, min, max);
    const faixa: FaixaAnalisada = {
      criterio,
      min,
      max,
      percentual: Math.round(pct * 100) / 100,
      status: statusFromPercentual(pct),
      acima80: pct >= 80,
      tipoFaixa: 'candidata',
    };
    if (!melhor || (faixa.acima80 && faixa.percentual > melhor.percentual) || (!melhor.acima80 && faixa.percentual > melhor.percentual)) {
      melhor = faixa;
    }
  }
  return melhor;
}

/** Faixa mais restritiva ainda >= 80% (menor amplitude) */
function faixaIdealRestritiva(
  criterio: string,
  valores: number[],
  faixas: readonly (readonly [number, number])[],
): FaixaAnalisada | null {
  const candidatas = faixas
    .map(([min, max]) => {
      const pct = percentualNaFaixa(valores, min, max);
      return {
        criterio,
        min,
        max,
        percentual: Math.round(pct * 100) / 100,
        status: statusFromPercentual(pct),
        acima80: pct >= 80,
        tipoFaixa: 'ideal' as const,
        amplitude: max - min,
      };
    })
    .filter((f) => f.acima80)
    .sort((a, b) => a.amplitude - b.amplitude || b.percentual - a.percentual);

  if (candidatas.length === 0) return null;
  const { amplitude: _, ...rest } = candidatas[0];
  return rest;
}

export function buildConcursosMetricas(
  concursos: Array<{
    numeroConcurso: number;
    d1: number; d2: number; d3: number; d4: number; d5: number;
    d6: number; d7: number; d8: number; d9: number; d10: number;
    d11: number; d12: number; d13: number; d14: number; d15: number;
    repetidasConcursoAnterior?: number;
    soma?: number;
    pares?: number;
    impares?: number;
    moldura?: number;
    centro?: number;
    primos?: number;
    fibonacci?: number;
  }>,
): ConcursoComMetricas[] {
  const sorted = [...concursos].sort((a, b) => a.numeroConcurso - b.numeroConcurso);
  const result: ConcursoComMetricas[] = [];

  for (let i = 0; i < sorted.length; i++) {
    const c = sorted[i];
    const dezenas = extrairDezenasConcurso(c);
    const anterior = i > 0 ? extrairDezenasConcurso(sorted[i - 1]) : null;

    let repetidas = c.repetidasConcursoAnterior ?? 0;
    if (anterior && c.repetidasConcursoAnterior === undefined) {
      repetidas = dezenas.filter((d) => new Set(anterior).has(d)).length;
    }

    const pares = c.pares ?? dezenas.filter((d) => d % 2 === 0).length;

    result.push({
      numeroConcurso: c.numeroConcurso,
      dezenas,
      metricas: {
        repetidas,
        pares,
        impares: c.impares ?? 15 - pares,
        soma: c.soma ?? dezenas.reduce((a, b) => a + b, 0),
        moldura: c.moldura ?? 0,
        centro: c.centro ?? 0,
        primos: c.primos ?? 0,
        fibonacci: c.fibonacci ?? 0,
        maiorSequenciaSorteada: 0,
        maiorSequenciaAusente: 0,
      },
    });
  }

  return result.map((item, i) => {
    const anterior = i > 0 ? result[i - 1].dezenas : null;
    const m = calcularMetricas(item.dezenas, anterior);
    return {
      ...item,
      metricas: {
        repetidas: item.metricas.repetidas || m.repetidasUltimo,
        pares: m.pares,
        impares: m.impares,
        soma: m.soma,
        moldura: m.moldura,
        centro: m.centro,
        primos: m.primos,
        fibonacci: m.fibonacci,
        maiorSequenciaSorteada: m.maiorSequenciaSorteada,
        maiorSequenciaAusente: m.maiorSequenciaAusente,
      },
    };
  });
}

export function analisarCriteriosFortes(concursos: ConcursoComMetricas[]): {
  criterios: FaixaAnalisada[];
  amplas: FaixaAnalisada[];
  ideais: FaixaAnalisada[];
  mediaSoma: number;
} {
  const repetidas = concursos.map((c) => c.metricas.repetidas);
  const pares = concursos.map((c) => c.metricas.pares);
  const impares = concursos.map((c) => c.metricas.impares);
  const somas = concursos.map((c) => c.metricas.soma);
  const molduras = concursos.map((c) => c.metricas.moldura);
  const centros = concursos.map((c) => c.metricas.centro);
  const primosArr = concursos.map((c) => c.metricas.primos);
  const fibs = concursos.map((c) => c.metricas.fibonacci);
  const seqSort = concursos.map((c) => c.metricas.maiorSequenciaSorteada);
  const seqAus = concursos.map((c) => c.metricas.maiorSequenciaAusente);

  const defs: Array<{ key: string; valores: number[]; faixas: readonly (readonly [number, number])[] }> = [
    { key: 'Repetidas do concurso anterior', valores: repetidas, faixas: FAIXAS_CANDIDATAS.repetidas },
    { key: 'Pares', valores: pares, faixas: FAIXAS_CANDIDATAS.pares },
    { key: 'Ímpares', valores: impares, faixas: FAIXAS_CANDIDATAS.impares },
    { key: 'Soma das dezenas', valores: somas, faixas: FAIXAS_CANDIDATAS.soma },
    { key: 'Moldura', valores: molduras, faixas: FAIXAS_CANDIDATAS.moldura },
    { key: 'Centro', valores: centros, faixas: FAIXAS_CANDIDATAS.centro },
    { key: 'Primos', valores: primosArr, faixas: FAIXAS_CANDIDATAS.primos },
    { key: 'Fibonacci', valores: fibs, faixas: FAIXAS_CANDIDATAS.fibonacci },
    { key: 'Maior sequência sorteada', valores: seqSort, faixas: FAIXAS_CANDIDATAS.maiorSeqSorteada },
    { key: 'Maior sequência ausente', valores: seqAus, faixas: FAIXAS_CANDIDATAS.maiorSeqAusente },
  ];

  const amplas: FaixaAnalisada[] = [];
  const ideais: FaixaAnalisada[] = [];

  for (const d of defs) {
    const melhor = melhorFaixa(d.key, d.valores, d.faixas);
    if (melhor) {
      melhor.tipoFaixa = 'ampla';
      amplas.push(melhor);
    }
    const ideal = faixaIdealRestritiva(d.key, d.valores, d.faixas);
    if (ideal) ideais.push(ideal);
  }

  const mediaSoma = somas.length ? somas.reduce((a, b) => a + b, 0) / somas.length : 196;

  return {
    criterios: amplas,
    amplas,
    ideais,
    mediaSoma: Math.round(mediaSoma * 10) / 10,
  };
}

export interface CoberturaPareto {
  baseSize: number;
  limiar: number;
  percentual: number;
  status: StatusForca;
}

export function analisarCoberturaPareto(
  concursos: number[][],
  base: number[],
  limiares: number[] = [11, 12, 13, 14, 15],
): CoberturaPareto[] {
  const baseSet = new Set(base);
  return limiares.map((limiar) => {
    const dentro = concursos.filter((d) => d.filter((n) => baseSet.has(n)).length >= limiar).length;
    const pct = concursos.length ? (dentro / concursos.length) * 100 : 0;
    return {
      baseSize: base.length,
      limiar,
      percentual: Math.round(pct * 100) / 100,
      status: statusFromPercentual(pct),
    };
  });
}

