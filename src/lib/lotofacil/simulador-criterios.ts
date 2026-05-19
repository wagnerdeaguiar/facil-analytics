import { calcularMetricas } from './metrics';
import type { ResultadoSimulacaoJogo } from './simulator';

export interface FaixaCriterioCheck {
  criterio: string;
  faixaMin: number;
  faixaMax: number;
  dentroFaixa: number;
  total: number;
  percentual: number;
}

const FAIXAS = {
  repetidas: { min: 8, max: 10 },
  pares: { min: 6, max: 8 },
  impares: { min: 7, max: 9 },
  soma: { min: 190, max: 205 },
  moldura: { min: 9, max: 11 },
  centro: { min: 4, max: 6 },
  primos: { min: 4, max: 7 },
  fibonacci: { min: 3, max: 6 },
  maiorSeqSorteada: { min: 4, max: 6 },
  maiorSeqAusente: { min: 3, max: 5 },
};

function inRange(v: number, min: number, max: number) {
  return v >= min && v <= max;
}

/** Analisa jogos com melhor desempenho (13+ acertos em algum concurso) */
export function analisarCriteriosJogosVencedores(
  ranking: ResultadoSimulacaoJogo[],
  concursosMap: Map<number, number[]>,
  minAcertos = 13,
): { jogosAnalisados: number; criterios: FaixaCriterioCheck[] } {
  const top = ranking.filter((j) => j.melhorAcerto >= minAcertos).slice(0, 30);
  if (!top.length) {
    return { jogosAnalisados: 0, criterios: [] };
  }

  const checks: Record<keyof typeof FAIXAS, { ok: number; total: number }> = {
    repetidas: { ok: 0, total: 0 },
    pares: { ok: 0, total: 0 },
    impares: { ok: 0, total: 0 },
    soma: { ok: 0, total: 0 },
    moldura: { ok: 0, total: 0 },
    centro: { ok: 0, total: 0 },
    primos: { ok: 0, total: 0 },
    fibonacci: { ok: 0, total: 0 },
    maiorSeqSorteada: { ok: 0, total: 0 },
    maiorSeqAusente: { ok: 0, total: 0 },
  };

  for (const jogo of top) {
    const ant = concursosMap.get(jogo.melhorConcurso - 1) ?? null;
    const m = calcularMetricas(jogo.dezenas, ant);

    const vals = {
      repetidas: m.repetidasUltimo,
      pares: m.pares,
      impares: m.impares,
      soma: m.soma,
      moldura: m.moldura,
      centro: m.centro,
      primos: m.primos,
      fibonacci: m.fibonacci,
      maiorSeqSorteada: m.maiorSequenciaSorteada,
      maiorSeqAusente: m.maiorSequenciaAusente,
    };

    for (const key of Object.keys(FAIXAS) as (keyof typeof FAIXAS)[]) {
      const f = FAIXAS[key];
      checks[key].total++;
      if (inRange(vals[key], f.min, f.max)) checks[key].ok++;
    }
  }

  const labels: Record<keyof typeof FAIXAS, string> = {
    repetidas: 'Repetidas',
    pares: 'Pares',
    impares: 'Ímpares',
    soma: 'Soma',
    moldura: 'Moldura',
    centro: 'Centro',
    primos: 'Primos',
    fibonacci: 'Fibonacci',
    maiorSeqSorteada: 'Maior seq. sorteada',
    maiorSeqAusente: 'Maior seq. ausente',
  };

  const criterios: FaixaCriterioCheck[] = (Object.keys(FAIXAS) as (keyof typeof FAIXAS)[]).map((key) => {
    const f = FAIXAS[key];
    const c = checks[key];
    return {
      criterio: labels[key],
      faixaMin: f.min,
      faixaMax: f.max,
      dentroFaixa: c.ok,
      total: c.total,
      percentual: c.total ? Math.round((c.ok / c.total) * 1000) / 10 : 0,
    };
  });

  return { jogosAnalisados: top.length, criterios };
}
