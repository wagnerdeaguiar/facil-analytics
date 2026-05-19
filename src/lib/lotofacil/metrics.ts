import {
  CENTRO,
  FIBONACCI,
  GRUPOS,
  MOLDURA,
  PRIMOS,
  type ConcursoNumeros,
  type MetricasJogo,
} from './constants';
import { analisarEstruturaHorizontal } from './estrutura-horizontal';

export function extrairDezenasConcurso(c: {
  d1: number; d2: number; d3: number; d4: number; d5: number;
  d6: number; d7: number; d8: number; d9: number; d10: number;
  d11: number; d12: number; d13: number; d14: number; d15: number;
}): ConcursoNumeros {
  return [
    c.d1, c.d2, c.d3, c.d4, c.d5, c.d6, c.d7, c.d8, c.d9, c.d10,
    c.d11, c.d12, c.d13, c.d14, c.d15,
  ].sort((a, b) => a - b);
}

export function contarNoSet(dezenas: number[], set: Set<number>): number {
  return dezenas.filter((d) => set.has(d)).length;
}

export function contarGrupo(dezenas: number[], min: number, max: number): number {
  return dezenas.filter((d) => d >= min && d <= max).length;
}

/** Matriz 5x5: linha/coluna 0-4 para dezena 1-25 */
export function linhaColuna(dezena: number): { linha: number; coluna: number } {
  const idx = dezena - 1;
  return { linha: Math.floor(idx / 5), coluna: idx % 5 };
}

export function calcularLinhasColunas(dezenas: number[]): { linhas: number[]; colunas: number[] } {
  const linhas = [0, 0, 0, 0, 0];
  const colunas = [0, 0, 0, 0, 0];
  for (const d of dezenas) {
    const { linha, coluna } = linhaColuna(d);
    linhas[linha]++;
    colunas[coluna]++;
  }
  return { linhas, colunas };
}

export function contarSequencias(dezenas: number[]): number {
  const sorted = [...dezenas].sort((a, b) => a - b);
  let seq = 0;
  let run = 1;
  for (let i = 1; i < sorted.length; i++) {
    if (sorted[i] === sorted[i - 1] + 1) {
      run++;
    } else {
      if (run >= 2) seq++;
      run = 1;
    }
  }
  if (run >= 2) seq++;
  return seq;
}

export function calcularMetricas(
  dezenas: number[],
  ultimoConcurso?: ConcursoNumeros | null,
  basePareto?: number[] | null,
): MetricasJogo {
  const sorted = [...dezenas].sort((a, b) => a - b);
  const pares = sorted.filter((d) => d % 2 === 0).length;
  const { linhas, colunas } = calcularLinhasColunas(sorted);

  let repetidasUltimo = 0;
  let ausentesUltimo = 0;
  let dezenasRepetidas: number[] = [];
  let dezenasNovas: number[] = [];
  if (ultimoConcurso?.length === 15) {
    const setUltimo = new Set(ultimoConcurso);
    dezenasRepetidas = sorted.filter((d) => setUltimo.has(d));
    repetidasUltimo = dezenasRepetidas.length;
    dezenasNovas = sorted.filter((d) => !setUltimo.has(d));
    const todas = new Set(Array.from({ length: 25 }, (_, i) => i + 1));
    ultimoConcurso.forEach((d) => todas.delete(d));
    ausentesUltimo = sorted.filter((d) => todas.has(d)).length;
  }

  const estrutura = analisarEstruturaHorizontal(sorted);
  const ausentesDoJogo = Array.from({ length: 25 }, (_, i) => i + 1).filter((d) => !sorted.includes(d));

  let quentesNaBase = 0;
  if (basePareto?.length) {
    const baseSet = new Set(basePareto);
    quentesNaBase = sorted.filter((d) => baseSet.has(d)).length;
  }

  return {
    dezenas: sorted,
    soma: sorted.reduce((a, b) => a + b, 0),
    pares,
    impares: 15 - pares,
    primos: contarNoSet(sorted, PRIMOS),
    fibonacci: contarNoSet(sorted, FIBONACCI),
    moldura: contarNoSet(sorted, MOLDURA),
    centro: contarNoSet(sorted, CENTRO),
    repetidasUltimo,
    ausentesUltimo,
    quentesNaBase,
    linhas,
    colunas,
    sequencias: contarSequencias(sorted),
    grupo1_5: contarGrupo(sorted, GRUPOS.g1_5.min, GRUPOS.g1_5.max),
    grupo6_10: contarGrupo(sorted, GRUPOS.g6_10.min, GRUPOS.g6_10.max),
    grupo11_15: contarGrupo(sorted, GRUPOS.g11_15.min, GRUPOS.g11_15.max),
    grupo16_20: contarGrupo(sorted, GRUPOS.g16_20.min, GRUPOS.g16_20.max),
    grupo21_25: contarGrupo(sorted, GRUPOS.g21_25.min, GRUPOS.g21_25.max),
    blocosSorteados: estrutura.blocosSorteados,
    maiorSequenciaSorteada: estrutura.maiorSequenciaSorteada,
    blocosAusentes: estrutura.blocosAusentes,
    maiorSequenciaAusente: estrutura.maiorSequenciaAusente,
    dezenasRepetidas,
    dezenasNovas,
    ausentesDoJogo,
  };
}

export function metricasParaConcurso(
  dezenas: ConcursoNumeros,
  anterior?: ConcursoNumeros | null,
): Omit<MetricasJogo, 'quentesNaBase'> & { repetidasConcursoAnterior: number; ausentes: number } {
  const m = calcularMetricas(dezenas, anterior);
  return {
    ...m,
    repetidasConcursoAnterior: m.repetidasUltimo,
    ausentes: m.ausentesUltimo,
  };
}

export function contarAcertos(jogo: number[], sorteio: number[]): number {
  const set = new Set(sorteio);
  return jogo.filter((d) => set.has(d)).length;
}

export function dezenasIguais(a: number[], b: number[]): number {
  const setB = new Set(b);
  return a.filter((d) => setB.has(d)).length;
}

