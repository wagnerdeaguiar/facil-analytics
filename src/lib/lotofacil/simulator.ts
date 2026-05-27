import { contarAcertos } from './metrics';

export interface JogoSimulacao {
  id?: string;
  dezenas: number[];
}

export interface ResultadoSimulacaoJogo {
  dezenas: number[];
  distribuicao: Record<number, number>;
  melhorAcerto: number;
  melhorConcurso: number;
  totalTestes: number;
}

export interface FaixaAcertosPercentual {
  acertos: number;
  quantidade: number;
  percentual: number;
}

export interface ResultadoSimulacaoGeral {
  porJogo: ResultadoSimulacaoJogo[];
  ranking: ResultadoSimulacaoJogo[];
  totais: Record<number, number>;
  /** Total de comparações jogo × concurso */
  totalComparacoes: number;
  /** % sobre o total de comparações (faixas 1–5 acertos) */
  percentuaisBaixos: FaixaAcertosPercentual[];
  /** % sobre o total de comparações (faixas 11–15 — prêmio Lotofácil) */
  percentuaisPremio: FaixaAcertosPercentual[];
  melhorPorConcurso: Array<{ concurso: number; melhorAcertos: number; dezenas?: number[] }>;
}

const FAIXAS_BAIXAS = [1, 2, 3, 4, 5] as const;
const FAIXAS_PREMIO = [11, 12, 13, 14, 15] as const;

function criarDistribuicaoVazia(): Record<number, number> {
  const dist: Record<number, number> = {};
  for (let i = 0; i <= 15; i++) dist[i] = 0;
  return dist;
}

export function calcularPercentuaisFaixas(
  totais: Record<number, number>,
  totalComparacoes: number,
  faixas: readonly number[],
): FaixaAcertosPercentual[] {
  return faixas.map((acertos) => {
    const quantidade = totais[acertos] ?? 0;
    const percentual = totalComparacoes
      ? Math.round((quantidade / totalComparacoes) * 10000) / 100
      : 0;
    return { acertos, quantidade, percentual };
  });
}

export function simularJogos(
  jogos: JogoSimulacao[],
  concursos: Array<{ numeroConcurso: number; dezenas: number[] }>,
  concursoInicio?: number,
  concursoFim?: number,
): ResultadoSimulacaoGeral {
  const filtrados = concursos
    .filter((c) => {
      if (concursoInicio && c.numeroConcurso < concursoInicio) return false;
      if (concursoFim && c.numeroConcurso > concursoFim) return false;
      return true;
    })
    .sort((a, b) => a.numeroConcurso - b.numeroConcurso);

  const totais = criarDistribuicaoVazia();
  const porJogo: ResultadoSimulacaoJogo[] = [];
  const totalComparacoes = jogos.length * filtrados.length;

  for (const jogo of jogos) {
    const dist = criarDistribuicaoVazia();
    let melhorAcerto = 0;
    let melhorConcurso = 0;

    for (const c of filtrados) {
      const acertos = contarAcertos(jogo.dezenas, c.dezenas);
      if (acertos >= 0 && acertos <= 15) {
        dist[acertos]++;
        totais[acertos]++;
      }
      if (acertos > melhorAcerto) {
        melhorAcerto = acertos;
        melhorConcurso = c.numeroConcurso;
      }
    }

    porJogo.push({
      dezenas: jogo.dezenas,
      distribuicao: dist,
      melhorAcerto,
      melhorConcurso,
      totalTestes: filtrados.length,
    });
  }

  const ranking = [...porJogo].sort((a, b) => {
    const scoreA =
      (a.distribuicao[15] ?? 0) * 1000 +
      (a.distribuicao[14] ?? 0) * 100 +
      (a.distribuicao[13] ?? 0) * 10 +
      a.melhorAcerto;
    const scoreB =
      (b.distribuicao[15] ?? 0) * 1000 +
      (b.distribuicao[14] ?? 0) * 100 +
      (b.distribuicao[13] ?? 0) * 10 +
      b.melhorAcerto;
    return scoreB - scoreA;
  });

  const melhorPorConcurso = filtrados.map((c) => {
    let melhor = 0;
    let dezenas: number[] | undefined;
    for (const j of jogos) {
      const a = contarAcertos(j.dezenas, c.dezenas);
      if (a > melhor) {
        melhor = a;
        dezenas = j.dezenas;
      }
    }
    return { concurso: c.numeroConcurso, melhorAcertos: melhor, dezenas };
  });

  const percentuaisBaixos = calcularPercentuaisFaixas(totais, totalComparacoes, FAIXAS_BAIXAS);
  const percentuaisPremio = calcularPercentuaisFaixas(totais, totalComparacoes, FAIXAS_PREMIO);

  return {
    porJogo,
    ranking,
    totais,
    totalComparacoes,
    percentuaisBaixos,
    percentuaisPremio,
    melhorPorConcurso,
  };
}

