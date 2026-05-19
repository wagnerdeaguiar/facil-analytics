import { CENTRO, FIBONACCI, MOLDURA, PRIMOS } from './constants';
import { analisarCoberturaPareto } from './recurrence';
import { analisarSequenciaAtrasoPorDezena, type StatusAtraso, type StatusSequencia } from './sequencia-atraso';

export interface DezenaFreq {
  dezena: number;
  frequencia: number;
  percentual: number;
  atrasoAtual: number;
  atrasoMedio: number;
  maiorAtraso: number;
  sequenciaAtual: number;
  sequenciaMedia: number;
  maiorSequencia: number;
  statusSequencia: StatusSequencia;
  statusAtraso: StatusAtraso;
  pesoGerador: number;
  classificacao: 'Quente' | 'Morna' | 'Fria';
  rankingPareto: number;
}

export function calcularFrequencias(concursosOrdenados: number[][]): DezenaFreq[] {
  const total = concursosOrdenados.length;
  const seqAtraso = analisarSequenciaAtrasoPorDezena(concursosOrdenados);
  const seqMap = new Map(seqAtraso.map((s) => [s.dezena, s]));

  const ranking = [...seqAtraso].sort((a, b) => b.frequencia - a.frequencia);
  const maxFreq = Math.max(...ranking.map((r) => r.frequencia));
  const minFreq = Math.min(...ranking.map((r) => r.frequencia));
  const terco = (maxFreq - minFreq) / 3;

  return ranking.map((s, idx) => {
    const pct = total ? (s.frequencia / total) * 100 : 0;
    let classificacao: 'Quente' | 'Morna' | 'Fria' = 'Morna';
    if (s.frequencia >= maxFreq - terco) classificacao = 'Quente';
    else if (s.frequencia <= minFreq + terco) classificacao = 'Fria';

    const info = seqMap.get(s.dezena)!;
    return {
      dezena: s.dezena,
      frequencia: s.frequencia,
      percentual: Math.round(pct * 100) / 100,
      atrasoAtual: info.atrasoAtual,
      atrasoMedio: info.atrasoMedio,
      maiorAtraso: info.atrasoMaximo,
      sequenciaAtual: info.sequenciaAtual,
      sequenciaMedia: info.sequenciaMedia,
      maiorSequencia: info.sequenciaMaxima,
      statusSequencia: info.statusSequencia,
      statusAtraso: info.statusAtraso,
      pesoGerador: info.pesoGerador,
      classificacao,
      rankingPareto: idx + 1,
    };
  });
}

export function montarBasesPareto(freqs: DezenaFreq[]): {
  base18: number[];
  base19: number[];
  base20: number[];
  ranking: DezenaFreq[];
} {
  const ranking = [...freqs].sort((a, b) => a.rankingPareto - b.rankingPareto);
  const ordenadas = ranking.map((f) => f.dezena);
  return {
    base18: ordenadas.slice(0, 18).sort((a, b) => a - b),
    base19: ordenadas.slice(0, 19).sort((a, b) => a - b),
    base20: ordenadas.slice(0, 20).sort((a, b) => a - b),
    ranking,
  };
}

export function estatisticasBase(base: number[]) {
  return {
    tamanho: base.length,
    soma: base.reduce((a, b) => a + b, 0),
    pares: base.filter((d) => d % 2 === 0).length,
    primos: base.filter((d) => PRIMOS.has(d)).length,
    fibonacci: base.filter((d) => FIBONACCI.has(d)).length,
    moldura: base.filter((d) => MOLDURA.has(d)).length,
    centro: base.filter((d) => CENTRO.has(d)).length,
  };
}

export function coberturaHistoricaBases(
  concursos: number[][],
  bases: { tipo: string; dezenas: number[] }[],
) {
  return bases.map((b) => ({
    tipo: b.tipo,
    dezenas: b.dezenas,
    coberturas: analisarCoberturaPareto(concursos, b.dezenas),
    distribuicaoAcertos: calcularDistribuicaoAcertos(concursos, b.dezenas),
  }));
}

function calcularDistribuicaoAcertos(concursos: number[][], base: number[]) {
  const baseSet = new Set(base);
  const dist: Record<number, number> = {};
  for (let i = 11; i <= 15; i++) dist[i] = 0;

  for (const c of concursos) {
    const acertos = c.filter((d) => baseSet.has(d)).length;
    if (acertos >= 11 && acertos <= 15) dist[acertos]++;
  }
  const total = concursos.length;
  return Object.entries(dist).map(([k, v]) => ({
    acertos: Number(k),
    quantidade: v,
    percentual: total ? Math.round((v / total) * 10000) / 100 : 0,
  }));
}

