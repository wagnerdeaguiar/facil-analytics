/** Conjuntos fixos da Lotofácil (1–25) */
export const MOLDURA = new Set([1, 2, 3, 4, 5, 6, 10, 11, 15, 16, 20, 21, 22, 23, 24, 25]);
export const CENTRO = new Set([7, 8, 9, 12, 13, 14, 17, 18, 19]);
export const PRIMOS = new Set([2, 3, 5, 7, 11, 13, 17, 19, 23]);
export const FIBONACCI = new Set([1, 2, 3, 5, 8, 13, 21]);

export const GRUPOS = {
  g1_5: { min: 1, max: 5 },
  g6_10: { min: 6, max: 10 },
  g11_15: { min: 11, max: 15 },
  g16_20: { min: 16, max: 20 },
  g21_25: { min: 21, max: 25 },
} as const;

/** Faixas candidatas para análise de recorrência >= 80% */
export const FAIXAS_CANDIDATAS = {
  repetidas: [
    [6, 11], [7, 11], [8, 10], [8, 11], [7, 10], [8, 9], [9, 10], [9, 11],
  ],
  pares: [[5, 10], [6, 9], [6, 8], [7, 8], [5, 9], [7, 9]],
  impares: [[5, 10], [6, 9], [6, 10], [7, 9], [7, 10], [8, 10]],
  soma: [
    [170, 220], [175, 215], [180, 210], [185, 205], [190, 205], [175, 210], [180, 205],
  ],
  moldura: [[8, 12], [9, 11], [9, 12], [10, 11], [8, 11]],
  centro: [[3, 7], [4, 6], [4, 7], [5, 6], [3, 6]],
  primos: [[3, 7], [4, 7], [4, 6], [5, 6], [3, 6]],
  fibonacci: [[2, 6], [3, 6], [3, 5], [4, 5], [2, 5]],
  maiorSeqSorteada: [[3, 6], [4, 6], [4, 7], [4, 8]],
  maiorSeqAusente: [[2, 4], [2, 5], [3, 5], [3, 4]],
} as const;

export const FAIXAS_PREMIUM_PADRAO = {
  repetidas: { ampla: [7, 11], ideal: [8, 10], alvo: 9 },
  pares: { ampla: [5, 9], ideal: [6, 8], alvo: 7 },
  impares: { ampla: [6, 10], ideal: [7, 9], alvo: 8 },
  soma: { ampla: [175, 215], ideal: [190, 205], alvo: 196 },
  moldura: { ampla: [8, 12], ideal: [9, 11], alvo: 10 },
  centro: { ampla: [3, 7], ideal: [4, 6], alvo: 5 },
  primos: { ampla: [3, 7], ideal: [4, 7], alvo: 5 },
  fibonacci: { ampla: [2, 6], ideal: [3, 6], alvo: 4 },
} as const;

/** Pesos do score Premium Estrutural (total ~100) */
export const SCORE_WEIGHTS = {
  repetidas: 18,
  maiorSeqSorteada: 15,
  maiorSeqAusente: 15,
  soma: 12,
  paresImpares: 10,
  molduraCentro: 10,
  primos: 7,
  fibonacci: 5,
  pareto: 4,
  atrasos: 2,
  sequenciasIndividuais: 2,
} as const;

export const PERFIL_PREMIUM = {
  nome: 'Premium Estatístico',
  base: '20D' as const,
  /** Repetição GERAL do concurso anterior (camada 1) — faixa forte ~83% no recorte 3442–3542 */
  repetidas: { min: 8, max: 10, alvo: 9 },
  pares: { min: 6, max: 8, alvo: 7 },
  impares: { min: 7, max: 9, alvo: 8 },
  soma: { min: 190, max: 205, alvo: 196 },
  moldura: { min: 9, max: 11, alvo: 10 },
  centro: { min: 4, max: 6, alvo: 5 },
  primos: { min: 4, max: 7, alvo: 5 },
  fibonacci: { min: 3, max: 6, alvo: 4 },
  scoreMinimo: 80,
  maxDezenasIguais: 13,
  /** Camada 2: sequência/atraso individual */
  sequenciaAtraso: true,
};

export type ConcursoNumeros = number[];

export interface MetricasJogo {
  dezenas: number[];
  soma: number;
  pares: number;
  impares: number;
  primos: number;
  fibonacci: number;
  moldura: number;
  centro: number;
  repetidasUltimo: number;
  ausentesUltimo: number;
  quentesNaBase: number;
  linhas: number[];
  colunas: number[];
  /** Menor/m maior contagem por linha ou coluna na cartela 5×5 */
  minLinha: number;
  maxLinha: number;
  minColuna: number;
  maxColuna: number;
  sequencias: number;
  grupo1_5: number;
  grupo6_10: number;
  grupo11_15: number;
  grupo16_20: number;
  grupo21_25: number;
  blocosSorteados?: string[];
  maiorSequenciaSorteada: number;
  blocosAusentes?: string[];
  maiorSequenciaAusente: number;
  dezenasRepetidas?: number[];
  dezenasNovas?: number[];
  ausentesDoJogo?: number[];
}

