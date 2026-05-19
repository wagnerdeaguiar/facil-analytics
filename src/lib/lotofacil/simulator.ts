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

export interface ResultadoSimulacaoGeral {
  porJogo: ResultadoSimulacaoJogo[];
  ranking: ResultadoSimulacaoJogo[];
  totais: Record<number, number>;
  melhorPorConcurso: Array<{ concurso: number; melhorAcertos: number; dezenas?: number[] }>;
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

  const totais: Record<number, number> = { 11: 0, 12: 0, 13: 0, 14: 0, 15: 0 };
  const porJogo: ResultadoSimulacaoJogo[] = [];

  for (const jogo of jogos) {
    const dist: Record<number, number> = { 11: 0, 12: 0, 13: 0, 14: 0, 15: 0 };
    let melhorAcerto = 0;
    let melhorConcurso = 0;

    for (const c of filtrados) {
      const acertos = contarAcertos(jogo.dezenas, c.dezenas);
      if (acertos >= 11 && acertos <= 15) {
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

  return { porJogo, ranking, totais, melhorPorConcurso };
}

