/**
 * Duas camadas de análise (conforme especificação MazuSoft / recorte 3442–3542):
 * 1) Repetição GERAL entre concursos (quantas dezenas do sorteio anterior repetem no próximo)
 * 2) Sequência e atraso INDIVIDUAL por dezena (concursos consecutivos saindo ou ausentes)
 */

export type StatusSequencia = 'normal' | 'atencao' | 'esticada' | 'muito_esticada';
export type StatusAtraso = 'presente' | 'normal' | 'observacao' | 'atrativa' | 'forte_retorno' | 'extrema';

export interface DezenaSequenciaAtraso {
  dezena: number;
  frequencia: number;
  sequenciaAtual: number;
  sequenciaMedia: number;
  sequenciaMaxima: number;
  statusSequencia: StatusSequencia;
  atrasoAtual: number;
  atrasoMedio: number;
  atrasoMaximo: number;
  statusAtraso: StatusAtraso;
  /** Peso sugerido no gerador (0.4 a 1.2) */
  pesoGerador: number;
}

export interface DistribuicaoItem {
  valor: number;
  quantidade: number;
  percentual: number;
}

export interface FaixaCobertura {
  faixa: string;
  min: number;
  max: number;
  percentual: number;
  acima80: boolean;
}

export interface ProbabilidadeCondicional {
  estado: number;
  casos: number;
  sucesso: number;
  percentual: number;
}

export interface AnaliseRepetidasGeral {
  distribuicao: DistribuicaoItem[];
  media: number;
  mediana: number;
  totalIntervalos: number;
  faixas: FaixaCobertura[];
}

export interface AnaliseSequenciaAtrasoCompleta {
  dezenas: DezenaSequenciaAtraso[];
  repetidasGeral: AnaliseRepetidasGeral;
  distribuicaoSequenciasIndividuais: DistribuicaoItem[];
  distribuicaoAtrasosIndividuais: DistribuicaoItem[];
  coberturaSequencia: FaixaCobertura[];
  coberturaAtraso: FaixaCobertura[];
  probContinuarSequencia: ProbabilidadeCondicional[];
  probVoltarAtraso: ProbabilidadeCondicional[];
  ultimoConcursoNumero?: number;
}

export const FAIXAS_REPETIDAS_REFERENCIA = {
  premium: { min: 8, max: 10, alvo: 9, label: 'Premium/conservador' },
  amplo: { min: 8, max: 11, alvo: 9, label: 'Amplo' },
  quaseTotal: { min: 7, max: 11, alvo: 9, label: 'Quase total' },
} as const;

export const REGRAS_SEQUENCIA_ATRASO_PREMIUM = {
  repetidas: FAIXAS_REPETIDAS_REFERENCIA.premium,
  maxDezenasSequenciaGte6: 1,
  maxDezenasSequenciaGte5: 2,
  maxDezenasSequenciaGte4: 4,
  minDezenasAtrasoGte2: 2,
  maxDezenasAtrasoGte2: 4,
  /** Mínimo ideal; se a base atual não tiver dezenas com atraso ≥3, o gerador ajusta para 0 */
  minDezenasAtrasoGte3: 1,
  maxDezenasAtrasoGte3: 2,
  scoreSequenciaSaudavel: 10,
  scoreAtrasoEquilibrado: 10,
} as const;

export type RegrasSequenciaAtrasoConfig = {
  repetidas: (typeof FAIXAS_REPETIDAS_REFERENCIA)['premium'];
  maxDezenasSequenciaGte6: number;
  maxDezenasSequenciaGte5: number;
  maxDezenasSequenciaGte4: number;
  minDezenasAtrasoGte2: number;
  maxDezenasAtrasoGte2: number;
  minDezenasAtrasoGte3: number;
  maxDezenasAtrasoGte3: number;
  scoreSequenciaSaudavel: number;
  scoreAtrasoEquilibrado: number;
};

/** Evita regra impossível quando a base Pareto só tem dezenas “quentes” (sem atraso ≥3). */
export function ajustarRegrasSequenciaParaPool(
  pool: number[],
  mapa: Map<number, DezenaSequenciaAtraso>,
  regras: RegrasSequenciaAtrasoConfig = { ...REGRAS_SEQUENCIA_ATRASO_PREMIUM },
): RegrasSequenciaAtrasoConfig {
  let noPoolGte2 = 0;
  let noPoolGte3 = 0;
  for (const d of pool) {
    const a = mapa.get(d)?.atrasoAtual ?? 0;
    if (a >= 2) noPoolGte2++;
    if (a >= 3) noPoolGte3++;
  }
  const maxGte2 = Math.min(15, noPoolGte2);
  const maxGte3 = Math.min(15, noPoolGte3);
  return {
    ...regras,
    minDezenasAtrasoGte2: Math.min(regras.minDezenasAtrasoGte2, maxGte2),
    minDezenasAtrasoGte3: Math.min(regras.minDezenasAtrasoGte3, maxGte3),
  };
}

function statusSequencia(seq: number): StatusSequencia {
  if (seq >= 6) return 'muito_esticada';
  if (seq === 5) return 'esticada';
  if (seq === 4) return 'atencao';
  return 'normal';
}

function statusAtraso(atraso: number, presenteNoUltimo: boolean): StatusAtraso {
  if (presenteNoUltimo || atraso === 0) return 'presente';
  if (atraso === 1) return 'normal';
  if (atraso === 2) return 'observacao';
  if (atraso === 3) return 'atrativa';
  if (atraso === 4) return 'forte_retorno';
  return 'extrema';
}

function pesoPorEstado(seq: number, atraso: number): number {
  if (atraso >= 5) return 1.15;
  if (atraso === 4) return 1.1;
  if (atraso === 3) return 1.05;
  if (atraso === 2) return 1.0;
  if (seq >= 8) return 0.4;
  if (seq >= 6) return 0.55;
  if (seq === 5) return 0.7;
  if (seq === 4) return 0.85;
  return 1.0;
}

/** Blocos consecutivos de presença (1) ou ausência (0) para uma dezena */
function extrairBlocos(presencas: boolean[]): { tipo: 'seq' | 'atraso'; tamanho: number }[] {
  const blocos: { tipo: 'seq' | 'atraso'; tamanho: number }[] = [];
  if (!presencas.length) return blocos;

  let run = 1;
  let atual = presencas[0];

  for (let i = 1; i < presencas.length; i++) {
    if (presencas[i] === atual) {
      run++;
    } else {
      blocos.push({ tipo: atual ? 'seq' : 'atraso', tamanho: run });
      atual = presencas[i];
      run = 1;
    }
  }
  blocos.push({ tipo: atual ? 'seq' : 'atraso', tamanho: run });
  return blocos;
}

function mediana(nums: number[]): number {
  if (!nums.length) return 0;
  const s = [...nums].sort((a, b) => a - b);
  const m = Math.floor(s.length / 2);
  return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2;
}

function distribuicaoDeValores(valores: number[]): DistribuicaoItem[] {
  const map = new Map<number, number>();
  for (const v of valores) map.set(v, (map.get(v) ?? 0) + 1);
  const total = valores.length;
  return [...map.entries()]
    .sort((a, b) => a[0] - b[0])
    .map(([valor, quantidade]) => ({
      valor,
      quantidade,
      percentual: total ? Math.round((quantidade / total) * 10000) / 100 : 0,
    }));
}

function coberturaAte(valores: number[], limite: number): FaixaCobertura {
  const total = valores.length;
  const dentro = valores.filter((v) => v <= limite).length;
  const pct = total ? (dentro / total) * 100 : 0;
  return {
    faixa: `até ${limite}`,
    min: 0,
    max: limite,
    percentual: Math.round(pct * 100) / 100,
    acima80: pct >= 80,
  };
}

function coberturaFaixa(valores: number[], min: number, max: number, label: string): FaixaCobertura {
  const total = valores.length;
  const dentro = valores.filter((v) => v >= min && v <= max).length;
  const pct = total ? (dentro / total) * 100 : 0;
  return {
    faixa: label,
    min,
    max,
    percentual: Math.round(pct * 100) / 100,
    acima80: pct >= 80,
  };
}

/** Camada 1: repetição entre concursos consecutivos */
export function analisarRepetidasGeral(concursosOrdenados: number[][]): AnaliseRepetidasGeral {
  const repetidas: number[] = [];

  for (let i = 1; i < concursosOrdenados.length; i++) {
    const setAnt = new Set(concursosOrdenados[i - 1]);
    const qtd = concursosOrdenados[i].filter((d) => setAnt.has(d)).length;
    repetidas.push(qtd);
  }

  const media = repetidas.length
    ? Math.round((repetidas.reduce((a, b) => a + b, 0) / repetidas.length) * 100) / 100
    : 0;

  return {
    distribuicao: distribuicaoDeValores(repetidas),
    media,
    mediana: mediana(repetidas),
    totalIntervalos: repetidas.length,
    faixas: [
      coberturaFaixa(repetidas, 8, 10, '8 a 10 repetidas'),
      coberturaFaixa(repetidas, 8, 11, '8 a 11 repetidas'),
      coberturaFaixa(repetidas, 7, 11, '7 a 11 repetidas'),
    ],
  };
}

/** Probabilidade: após sequência S, saiu no próximo concurso? */
function calcularProbContinuar(
  concursos: number[][],
): ProbabilidadeCondicional[] {
  const stats = new Map<number, { casos: number; sucesso: number }>();

  for (let d = 1; d <= 25; d++) {
    for (let i = 0; i < concursos.length - 1; i++) {
      let seq = 0;
      for (let j = i; j >= 0; j--) {
        if (concursos[j].includes(d)) seq++;
        else break;
      }
      if (seq === 0) continue;
      if (!concursos[i].includes(d)) continue;

      const s = stats.get(seq) ?? { casos: 0, sucesso: 0 };
      s.casos++;
      if (concursos[i + 1].includes(d)) s.sucesso++;
      stats.set(seq, s);
    }
  }

  return [...stats.entries()]
    .sort((a, b) => a[0] - b[0])
    .map(([estado, { casos, sucesso }]) => ({
      estado,
      casos,
      sucesso,
      percentual: casos ? Math.round((sucesso / casos) * 1000) / 10 : 0,
    }));
}

/** Probabilidade: após atraso A, voltou no próximo concurso? */
function calcularProbVoltar(concursos: number[][]): ProbabilidadeCondicional[] {
  const stats = new Map<number, { casos: number; sucesso: number }>();

  for (let d = 1; d <= 25; d++) {
    for (let i = 0; i < concursos.length - 1; i++) {
      if (concursos[i].includes(d)) continue;

      let atraso = 0;
      for (let j = i; j >= 0; j--) {
        if (!concursos[j].includes(d)) atraso++;
        else break;
      }
      if (atraso === 0) continue;

      const s = stats.get(atraso) ?? { casos: 0, sucesso: 0 };
      s.casos++;
      if (concursos[i + 1].includes(d)) s.sucesso++;
      stats.set(atraso, s);
    }
  }

  return [...stats.entries()]
    .sort((a, b) => a[0] - b[0])
    .map(([estado, { casos, sucesso }]) => ({
      estado,
      casos,
      sucesso,
      percentual: casos ? Math.round((sucesso / casos) * 1000) / 10 : 0,
    }));
}

/** Camada 2: sequência e atraso individual por dezena */
export function analisarSequenciaAtrasoPorDezena(
  concursosOrdenados: number[][],
): DezenaSequenciaAtraso[] {
  const total = concursosOrdenados.length;
  const ultimo = concursosOrdenados[total - 1] ?? [];
  const ultimoSet = new Set(ultimo);

  const todasSequencias: number[] = [];
  const todosAtrasos: number[] = [];

  const resultado: DezenaSequenciaAtraso[] = [];

  for (let d = 1; d <= 25; d++) {
    const presencas = concursosOrdenados.map((c) => c.includes(d));
    const freq = presencas.filter(Boolean).length;
    const blocos = extrairBlocos(presencas);

    const blocosSeq = blocos.filter((b) => b.tipo === 'seq').map((b) => b.tamanho);
    const blocosAtraso = blocos.filter((b) => b.tipo === 'atraso').map((b) => b.tamanho);

    todasSequencias.push(...blocosSeq);
    todosAtrasos.push(...blocosAtraso);

    let sequenciaAtual = 0;
    let atrasoAtual = 0;

    if (ultimoSet.has(d)) {
      for (let i = total - 1; i >= 0; i--) {
        if (presencas[i]) sequenciaAtual++;
        else break;
      }
    } else {
      for (let i = total - 1; i >= 0; i--) {
        if (!presencas[i]) atrasoAtual++;
        else break;
      }
    }

    const sequenciaMedia = blocosSeq.length
      ? Math.round((blocosSeq.reduce((a, b) => a + b, 0) / blocosSeq.length) * 100) / 100
      : 0;
    const atrasoMedio = blocosAtraso.length
      ? Math.round((blocosAtraso.reduce((a, b) => a + b, 0) / blocosAtraso.length) * 100) / 100
      : 0;

    resultado.push({
      dezena: d,
      frequencia: freq,
      sequenciaAtual,
      sequenciaMedia,
      sequenciaMaxima: blocosSeq.length ? Math.max(...blocosSeq) : 0,
      statusSequencia: statusSequencia(sequenciaAtual),
      atrasoAtual,
      atrasoMedio,
      atrasoMaximo: blocosAtraso.length ? Math.max(...blocosAtraso) : 0,
      statusAtraso: statusAtraso(atrasoAtual, ultimoSet.has(d)),
      pesoGerador: pesoPorEstado(sequenciaAtual, atrasoAtual),
    });
  }

  return resultado;
}

export function analiseCompletaSequenciaAtraso(
  concursosOrdenados: number[][],
  ultimoConcursoNumero?: number,
): AnaliseSequenciaAtrasoCompleta {
  const dezenas = analisarSequenciaAtrasoPorDezena(concursosOrdenados);
  const repetidasGeral = analisarRepetidasGeral(concursosOrdenados);

  const todasSeq: number[] = [];
  const todosAtr: number[] = [];
  for (let d = 1; d <= 25; d++) {
    const presencas = concursosOrdenados.map((c) => c.includes(d));
    const blocos = extrairBlocos(presencas);
    todasSeq.push(...blocos.filter((b) => b.tipo === 'seq').map((b) => b.tamanho));
    todosAtr.push(...blocos.filter((b) => b.tipo === 'atraso').map((b) => b.tamanho));
  }

  return {
    dezenas,
    repetidasGeral,
    distribuicaoSequenciasIndividuais: distribuicaoDeValores(todasSeq),
    distribuicaoAtrasosIndividuais: distribuicaoDeValores(todosAtr),
    coberturaSequencia: [2, 3, 4, 5].map((lim) => coberturaAte(todasSeq, lim)),
    coberturaAtraso: [1, 2, 3, 4].map((lim) => coberturaAte(todosAtr, lim)),
    probContinuarSequencia: calcularProbContinuar(concursosOrdenados),
    probVoltarAtraso: calcularProbVoltar(concursosOrdenados),
    ultimoConcursoNumero,
  };
}

export interface ContagemSequenciaAtrasoJogo {
  seqGte4: number;
  seqGte5: number;
  seqGte6: number;
  atrasoGte2: number;
  atrasoGte3: number;
  atrasoGte5: number;
}

export function contarSequenciaAtrasoNoJogo(
  dezenasJogo: number[],
  mapa: Map<number, DezenaSequenciaAtraso>,
): ContagemSequenciaAtrasoJogo {
  let seqGte4 = 0;
  let seqGte5 = 0;
  let seqGte6 = 0;
  let atrasoGte2 = 0;
  let atrasoGte3 = 0;
  let atrasoGte5 = 0;

  for (const d of dezenasJogo) {
    const info = mapa.get(d);
    if (!info) continue;
    if (info.sequenciaAtual >= 4) seqGte4++;
    if (info.sequenciaAtual >= 5) seqGte5++;
    if (info.sequenciaAtual >= 6) seqGte6++;
    if (info.atrasoAtual >= 2) atrasoGte2++;
    if (info.atrasoAtual >= 3) atrasoGte3++;
    if (info.atrasoAtual >= 5) atrasoGte5++;
  }

  return { seqGte4, seqGte5, seqGte6, atrasoGte2, atrasoGte3, atrasoGte5 };
}

export function validarRegrasSequenciaAtraso(
  contagem: ContagemSequenciaAtrasoJogo,
  regras: RegrasSequenciaAtrasoConfig = { ...REGRAS_SEQUENCIA_ATRASO_PREMIUM },
): { valido: boolean; motivos: string[] } {
  const motivos: string[] = [];

  if (contagem.seqGte6 > regras.maxDezenasSequenciaGte6) {
    motivos.push(
      `Sequência ≥6: ${contagem.seqGte6} dezenas (máx ${regras.maxDezenasSequenciaGte6})`,
    );
  }
  if (contagem.seqGte5 > regras.maxDezenasSequenciaGte5) {
    motivos.push(
      `Sequência ≥5: ${contagem.seqGte5} dezenas (máx ${regras.maxDezenasSequenciaGte5})`,
    );
  }
  if (contagem.seqGte4 > regras.maxDezenasSequenciaGte4) {
    motivos.push(
      `Sequência ≥4: ${contagem.seqGte4} dezenas (máx ${regras.maxDezenasSequenciaGte4})`,
    );
  }
  if (contagem.atrasoGte2 < regras.minDezenasAtrasoGte2) {
    motivos.push(
      `Atraso ≥2: apenas ${contagem.atrasoGte2} (mín ${regras.minDezenasAtrasoGte2})`,
    );
  }
  if (contagem.atrasoGte2 > regras.maxDezenasAtrasoGte2) {
    motivos.push(
      `Atraso ≥2: ${contagem.atrasoGte2} dezenas (máx ${regras.maxDezenasAtrasoGte2})`,
    );
  }
  if (contagem.atrasoGte3 < regras.minDezenasAtrasoGte3) {
    motivos.push(
      `Atraso ≥3: apenas ${contagem.atrasoGte3} (mín ${regras.minDezenasAtrasoGte3})`,
    );
  }
  if (contagem.atrasoGte3 > regras.maxDezenasAtrasoGte3) {
    motivos.push(
      `Atraso ≥3: ${contagem.atrasoGte3} dezenas (máx ${regras.maxDezenasAtrasoGte3})`,
    );
  }

  return { valido: motivos.length === 0, motivos };
}

export function pontuarSequenciaAtrasoJogo(
  contagem: ContagemSequenciaAtrasoJogo,
  regras: RegrasSequenciaAtrasoConfig = { ...REGRAS_SEQUENCIA_ATRASO_PREMIUM },
): { pontos: number; detalhe: Record<string, number> } {
  const detalhe: Record<string, number> = {};
  let pontos = 0;

  const seqOk =
    contagem.seqGte6 <= regras.maxDezenasSequenciaGte6 &&
    contagem.seqGte5 <= regras.maxDezenasSequenciaGte5 &&
    contagem.seqGte4 <= regras.maxDezenasSequenciaGte4;
  detalhe.sequenciaSaudavel = seqOk ? regras.scoreSequenciaSaudavel : Math.max(0, regras.scoreSequenciaSaudavel - contagem.seqGte5 * 3);
  pontos += detalhe.sequenciaSaudavel;

  const atrasoOk =
    contagem.atrasoGte2 >= regras.minDezenasAtrasoGte2 &&
    contagem.atrasoGte2 <= regras.maxDezenasAtrasoGte2 &&
    contagem.atrasoGte3 >= regras.minDezenasAtrasoGte3 &&
    contagem.atrasoGte3 <= regras.maxDezenasAtrasoGte3;
  detalhe.atrasoEquilibrado = atrasoOk ? regras.scoreAtrasoEquilibrado : Math.max(0, regras.scoreAtrasoEquilibrado - 4);
  pontos += detalhe.atrasoEquilibrado;

  if (contagem.seqGte6 > 0) {
    detalhe.penalidadeEsticada = -contagem.seqGte6 * 2;
    pontos += detalhe.penalidadeEsticada;
  }

  return { pontos: Math.round(pontos * 10) / 10, detalhe };
}

export function mapaDezenas(dezenas: DezenaSequenciaAtraso[]): Map<number, DezenaSequenciaAtraso> {
  return new Map(dezenas.map((d) => [d.dezena, d]));
}
