import { SCORE_WEIGHTS } from './constants';
import type { MetricasJogo } from './constants';
import {
  contarSequenciaAtrasoNoJogo,
  pontuarSequenciaAtrasoJogo,
  validarRegrasSequenciaAtraso,
  type DezenaSequenciaAtraso,
  REGRAS_SEQUENCIA_ATRASO_PREMIUM,
  type RegrasSequenciaAtrasoConfig,
} from './sequencia-atraso';

export interface CriterioFiltro {
  nome: string;
  min?: number;
  max?: number;
  alvo?: number;
  obrigatorio?: boolean;
  peso?: number;
  ativo?: boolean;
}

export interface ConfigGeracao {
  repetidas: CriterioFiltro;
  pares: CriterioFiltro;
  impares: CriterioFiltro;
  soma: CriterioFiltro;
  moldura: CriterioFiltro;
  centro: CriterioFiltro;
  primos: CriterioFiltro;
  fibonacci: CriterioFiltro;
  maiorSeqSorteada?: CriterioFiltro;
  maiorSeqAusente?: CriterioFiltro;
  /** Distribuição na cartela 5×5 — evita linha/coluna vazia ou com 5 dezenas */
  volanteLinhas?: CriterioFiltro;
  volanteColunas?: CriterioFiltro;
  pareto?: { minQuentes?: number; baseSize?: number };
  scoreMinimo?: number;
  mapaSequenciaAtraso?: Map<number, DezenaSequenciaAtraso>;
  regrasSequenciaAtraso?: RegrasSequenciaAtrasoConfig;
  usarSequenciaAtraso?: boolean;
}

function regrasAtivas(config: ConfigGeracao) {
  return { ...REGRAS_SEQUENCIA_ATRASO_PREMIUM, ...config.regrasSequenciaAtraso };
}

export const CONFIG_PADRAO: ConfigGeracao = {
  repetidas: { nome: 'repetidas', min: 8, max: 10, alvo: 9, obrigatorio: true, ativo: true },
  pares: { nome: 'pares', min: 6, max: 8, alvo: 7, obrigatorio: true, ativo: true },
  impares: { nome: 'impares', min: 7, max: 9, alvo: 8, obrigatorio: true, ativo: true },
  soma: { nome: 'soma', min: 190, max: 205, alvo: 196, obrigatorio: true, ativo: true },
  moldura: { nome: 'moldura', min: 9, max: 11, alvo: 10, obrigatorio: true, ativo: true },
  centro: { nome: 'centro', min: 4, max: 6, alvo: 5, obrigatorio: true, ativo: true },
  primos: { nome: 'primos', min: 4, max: 7, alvo: 5, obrigatorio: true, ativo: true },
  fibonacci: { nome: 'fibonacci', min: 3, max: 6, alvo: 4, obrigatorio: true, ativo: true },
  maiorSeqSorteada: { nome: 'maior sequência sorteada', min: 4, max: 6, alvo: 5, obrigatorio: true, ativo: true },
  maiorSeqAusente: { nome: 'maior sequência ausente', min: 3, max: 5, alvo: 3, obrigatorio: true, ativo: true },
  volanteLinhas: { nome: 'mín. por linha', min: 1, max: 4, alvo: 3, obrigatorio: false, ativo: false },
  volanteColunas: { nome: 'mín. por coluna', min: 1, max: 4, alvo: 3, obrigatorio: false, ativo: false },
  scoreMinimo: 0,
  usarSequenciaAtraso: true,
};

function pontuarProximidade(valor: number, alvo: number, maxPontos: number, toleranciaIdeal = 1): number {
  const diff = Math.abs(valor - alvo);
  if (diff === 0) return maxPontos;
  if (diff <= toleranciaIdeal) return maxPontos * 0.85;
  if (diff === 2) return maxPontos * 0.6;
  if (diff === 3) return maxPontos * 0.35;
  return maxPontos * 0.1;
}

function pontuarSeqEstrutural(valor: number, alvos: number[], maxPontos: number): number {
  if (alvos.includes(valor)) return maxPontos;
  const minDiff = Math.min(...alvos.map((a) => Math.abs(valor - a)));
  if (minDiff === 1) return maxPontos * 0.75;
  if (minDiff === 2) return maxPontos * 0.4;
  return maxPontos * 0.1;
}

function dentroFaixa(valor: number, min?: number, max?: number): boolean {
  if (min !== undefined && valor < min) return false;
  if (max !== undefined && valor > max) return false;
  return true;
}

function msgReprovacao(nome: string, valor: number, min?: number, max?: number): string {
  if (min !== undefined && valor < min) {
    return `Reprovado: ${nome} = ${valor}, mínimo exigido = ${min}.`;
  }
  return `Reprovado: ${nome} = ${valor}, máximo permitido = ${max}.`;
}

export function validarCriterios(m: MetricasJogo, config: ConfigGeracao): { valido: boolean; motivos: string[] } {
  const motivos: string[] = [];
  const checks: Array<{ c: CriterioFiltro; valor: number }> = [
    { c: config.repetidas, valor: m.repetidasUltimo },
    { c: config.pares, valor: m.pares },
    { c: config.impares, valor: m.impares },
    { c: config.soma, valor: m.soma },
    { c: config.moldura, valor: m.moldura },
    { c: config.centro, valor: m.centro },
    { c: config.primos, valor: m.primos },
    { c: config.fibonacci, valor: m.fibonacci },
  ];

  if (config.maiorSeqSorteada?.ativo !== false && config.maiorSeqSorteada) {
    checks.push({ c: config.maiorSeqSorteada, valor: m.maiorSequenciaSorteada });
  }
  if (config.maiorSeqAusente?.ativo !== false && config.maiorSeqAusente) {
    checks.push({ c: config.maiorSeqAusente, valor: m.maiorSequenciaAusente });
  }
  if (config.volanteLinhas?.ativo) {
    checks.push({ c: { ...config.volanteLinhas, nome: 'mín. por linha' }, valor: m.minLinha });
    checks.push({
      c: { ...config.volanteLinhas, nome: 'máx. por linha', min: undefined, max: config.volanteLinhas.max },
      valor: m.maxLinha,
    });
  }
  if (config.volanteColunas?.ativo) {
    checks.push({ c: { ...config.volanteColunas, nome: 'mín. por coluna' }, valor: m.minColuna });
    checks.push({
      c: { ...config.volanteColunas, nome: 'máx. por coluna', min: undefined, max: config.volanteColunas.max },
      valor: m.maxColuna,
    });
  }

  for (const { c, valor } of checks) {
    if (c.ativo === false) continue;
    if (!dentroFaixa(valor, c.min, c.max)) {
      if (c.obrigatorio) {
        motivos.push(msgReprovacao(c.nome, valor, c.min, c.max));
      }
    }
  }

  if (config.pareto?.minQuentes && m.quentesNaBase < config.pareto.minQuentes) {
    motivos.push(`Pareto: apenas ${m.quentesNaBase} na base (mín ${config.pareto.minQuentes})`);
  }

  if (config.usarSequenciaAtraso && config.mapaSequenciaAtraso) {
    const contagem = contarSequenciaAtrasoNoJogo(m.dezenas, config.mapaSequenciaAtraso);
    const val = validarRegrasSequenciaAtraso(contagem, regrasAtivas(config));
    if (!val.valido) motivos.push(...val.motivos.map((x) => `Reprovado: ${x}`));
  }

  return { valido: motivos.length === 0, motivos };
}

export function calcularScore(m: MetricasJogo, config: ConfigGeracao): {
  score: number;
  detalhes: Record<string, number>;
} {
  const detalhes: Record<string, number> = {};

  if (config.repetidas.ativo !== false && config.repetidas.alvo !== undefined) {
    detalhes.repetidas = pontuarProximidade(m.repetidasUltimo, config.repetidas.alvo, SCORE_WEIGHTS.repetidas, 1);
  }

  if (config.maiorSeqSorteada?.ativo !== false && config.maiorSeqSorteada) {
    detalhes.maiorSeqSorteada = pontuarSeqEstrutural(
      m.maiorSequenciaSorteada,
      [4, 5],
      SCORE_WEIGHTS.maiorSeqSorteada,
    );
  }

  if (config.maiorSeqAusente?.ativo !== false && config.maiorSeqAusente) {
    detalhes.maiorSeqAusente = pontuarProximidade(
      m.maiorSequenciaAusente,
      config.maiorSeqAusente.alvo ?? 3,
      SCORE_WEIGHTS.maiorSeqAusente,
      1,
    );
  }

  if (config.pares.ativo !== false && config.pares.alvo !== undefined) {
    const pPares = pontuarProximidade(m.pares, config.pares.alvo, SCORE_WEIGHTS.paresImpares / 2, 1);
    const pImp = pontuarProximidade(m.impares, config.impares.alvo ?? 8, SCORE_WEIGHTS.paresImpares / 2, 1);
    detalhes.paresImpares = pPares + pImp;
  }

  if (config.soma.ativo !== false && config.soma.alvo !== undefined) {
    const diff = Math.abs(m.soma - config.soma.alvo);
    detalhes.soma =
      diff <= 2 ? SCORE_WEIGHTS.soma : diff <= 5 ? SCORE_WEIGHTS.soma * 0.75 : diff <= 10 ? SCORE_WEIGHTS.soma * 0.4 : SCORE_WEIGHTS.soma * 0.1;
  }

  if (config.moldura.ativo !== false && config.moldura.alvo !== undefined) {
    const pMol = pontuarProximidade(m.moldura, config.moldura.alvo, SCORE_WEIGHTS.molduraCentro / 2, 1);
    const pCent = pontuarProximidade(m.centro, config.centro.alvo ?? 5, SCORE_WEIGHTS.molduraCentro / 2, 1);
    detalhes.molduraCentro = pMol + pCent;
  }

  if (config.primos.ativo !== false && config.primos.alvo !== undefined) {
    detalhes.primos = pontuarProximidade(m.primos, config.primos.alvo, SCORE_WEIGHTS.primos, 1);
  }
  if (config.fibonacci.ativo !== false && config.fibonacci.alvo !== undefined) {
    detalhes.fibonacci = pontuarProximidade(m.fibonacci, config.fibonacci.alvo, SCORE_WEIGHTS.fibonacci, 1);
  }
  if (config.pareto) {
    const alvoQuentes = config.pareto.baseSize ?? 18;
    const ratio = m.quentesNaBase / Math.min(15, alvoQuentes);
    detalhes.pareto = Math.min(SCORE_WEIGHTS.pareto, ratio * SCORE_WEIGHTS.pareto);
  }

  if (config.usarSequenciaAtraso && config.mapaSequenciaAtraso) {
    const contagem = contarSequenciaAtrasoNoJogo(m.dezenas, config.mapaSequenciaAtraso);
    const { pontos, detalhe } = pontuarSequenciaAtrasoJogo(contagem, regrasAtivas(config));
    detalhes.atrasos = pontos * (SCORE_WEIGHTS.atrasos / 5);
    detalhes.sequenciasIndividuais = (detalhe.seqOk ?? 0) * (SCORE_WEIGHTS.sequenciasIndividuais / 5);
    Object.assign(detalhes, detalhe);
  }

  const score = Math.round(Object.values(detalhes).reduce((a, b) => a + b, 0) * 100) / 100;
  return { score: Math.min(100, score), detalhes };
}

export function avaliarJogo(
  m: MetricasJogo,
  config: ConfigGeracao,
): { score: number; valido: boolean; motivos: string[]; detalhes: Record<string, number>; status: string } {
  const validacao = validarCriterios(m, config);
  const { score, detalhes } = calcularScore(m, config);
  const minScore = config.scoreMinimo ?? 0;
  if (score < minScore) {
    validacao.motivos.push(`Reprovado: score de aderência ${score} abaixo do mínimo ${minScore}.`);
  }

  let status = 'Reprovado';
  if (validacao.valido && score >= minScore) {
    if (score >= 90) status = 'Excelente';
    else if (score >= minScore + 5) status = 'Aprovado';
    else status = 'Atenção';
  }

  return {
    score,
    valido: validacao.valido && score >= minScore,
    motivos: validacao.motivos,
    detalhes,
    status,
  };
}
