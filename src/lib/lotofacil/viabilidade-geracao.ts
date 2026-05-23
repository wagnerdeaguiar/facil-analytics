import type { NumerosPorAposta } from './aposta';
import {
  diagnosticarGeracao,
  prepararPoolGeracao,
  type OrigemBase,
} from './generator';
import { calcularMetricas } from './metrics';
import {
  aplicarConfigEfetivaParaGeracao,
} from './ajustar-config-geracao';
import {
  contarSequenciaAtrasoNoJogo,
  REGRAS_SEQUENCIA_ATRASO_PREMIUM,
  validarRegrasSequenciaAtraso,
  type DezenaSequenciaAtraso,
  type RegrasSequenciaAtrasoConfig,
} from './sequencia-atraso';
import { CONFIG_PADRAO, type ConfigGeracao, type CriterioFiltro } from './scoring';

export interface ViabilidadeGeracaoParams {
  poolBase: number[];
  dezenasFixas?: number[];
  dezenasExcluidas?: number[];
  numerosPorAposta?: number;
  ultimoConcurso?: number[] | null;
  config?: ConfigGeracao;
  origemBase?: OrigemBase;
}

export interface ViabilidadeGeracaoResult {
  viavel: boolean;
  bloqueios: string[];
  avisos: string[];
  prep: ReturnType<typeof prepararPoolGeracao>;
  diagnostico?: ReturnType<typeof diagnosticarGeracao>;
}

function checarContagemFixas(
  nome: string,
  valorFixas: number,
  c: CriterioFiltro,
  slotsRestantes: number,
): string | null {
  if (c.ativo === false || !c.obrigatorio) return null;
  const min = c.min ?? 0;
  const max = c.max ?? 25;
  if (valorFixas > max) {
    return `Fixas já violam ${nome}: ${valorFixas} (máx. ${max}).`;
  }
  if (valorFixas + slotsRestantes < min) {
    return `Fixas não permitem atingir mínimo de ${nome}: fixas=${valorFixas}, mínimo=${min}, faltam ${slotsRestantes} dezenas.`;
  }
  return null;
}

function checarSomaFixas(
  somaFixas: number,
  c: CriterioFiltro,
  slotsRestantes: number,
  poolRestante: number[],
): string | null {
  if (c.ativo === false || !c.obrigatorio) return null;
  const min = c.min ?? 0;
  const max = c.max ?? 9999;
  if (slotsRestantes <= 0) {
    if (somaFixas < min || somaFixas > max) {
      return `Fixas isoladas violam soma: ${somaFixas} (faixa ${min}–${max}).`;
    }
    return null;
  }
  const ordenado = [...poolRestante].sort((a, b) => a - b);
  const somaMinRest = ordenado.slice(0, slotsRestantes).reduce((a, b) => a + b, 0);
  const somaMaxRest = ordenado.slice(-slotsRestantes).reduce((a, b) => a + b, 0);
  if (somaFixas + somaMinRest > max) {
    return `Soma mínima possível (${somaFixas + somaMinRest}) excede o teto (${max}) com as fixas atuais.`;
  }
  if (somaFixas + somaMaxRest < min) {
    return `Soma máxima possível (${somaFixas + somaMaxRest}) não atinge o mínimo (${min}) com as fixas atuais.`;
  }
  return null;
}

function avisosCriteriosAjustados(original: ConfigGeracao, ajustada: ConfigGeracao): string[] {
  const avisos: string[] = [];
  const pares: Array<[string, CriterioFiltro, CriterioFiltro]> = [
    ['repetidas', original.repetidas, ajustada.repetidas],
    ['pares', original.pares, ajustada.pares],
    ['ímpares', original.impares, ajustada.impares],
    ['soma', original.soma, ajustada.soma],
    ['moldura', original.moldura, ajustada.moldura],
    ['centro', original.centro, ajustada.centro],
  ];
  for (const [nome, o, a] of pares) {
    if (o.ativo === false) continue;
    if ((o.min ?? 0) !== (a.min ?? 0) || (o.max ?? 99) !== (a.max ?? 99)) {
      avisos.push(
        `${nome}: faixa ajustada de ${o.min ?? 0}–${o.max ?? '∞'} para ${a.min ?? 0}–${a.max ?? '∞'} conforme pool/fixas/último concurso.`,
      );
    }
  }
  return avisos;
}

function checarSequenciaAtrasoViavel(
  pool: number[],
  fixas: number[],
  mapa: Map<number, DezenaSequenciaAtraso>,
  regras: RegrasSequenciaAtrasoConfig,
  numerosPorAposta: number,
): string[] {
  const avisos: string[] = [];
  const fixasSet = new Set(fixas);
  const restantes = pool.filter((d) => !fixasSet.has(d));
  const slots = Math.max(0, numerosPorAposta - fixas.length);
  const cf = fixas.length ? contarSequenciaAtrasoNoJogo(fixas, mapa) : null;

  let restGte2 = 0;
  let restGte3 = 0;
  let restGte4Seq = 0;
  for (const d of restantes) {
    const info = mapa.get(d);
    if (!info) continue;
    if (info.atrasoAtual >= 2) restGte2++;
    if (info.atrasoAtual >= 3) restGte3++;
    if (info.sequenciaAtual >= 4) restGte4Seq++;
  }

  if (cf) {
    const maxAtr3 = cf.atrasoGte3 + Math.min(slots, restGte3);
    const minAtr3 = cf.atrasoGte3;
    if (regras.minDezenasAtrasoGte3 > maxAtr3) {
      avisos.push(
        `Atraso ≥3: mínimo ${regras.minDezenasAtrasoGte3}, mas no máximo ${maxAtr3} dezenas podem ter atraso ≥3 com as fixas atuais.`,
      );
    }
    if (regras.maxDezenasAtrasoGte3 < minAtr3) {
      avisos.push(
        `Atraso ≥3: fixas já têm ${minAtr3} dezena(s) com atraso ≥3, acima do teto ${regras.maxDezenasAtrasoGte3}.`,
      );
    }
    if (cf.atrasoGte3 >= regras.maxDezenasAtrasoGte3 && restGte3 > 0) {
      avisos.push(
        `Fixas esgotaram o teto de atraso ≥3 (${regras.maxDezenasAtrasoGte3}). Só passam jogos cujas outras dezenas têm atraso < 3.`,
      );
    }
    if (cf.seqGte4 >= regras.maxDezenasSequenciaGte4 && restGte4Seq > 0) {
      avisos.push(
        `Fixas esgotaram o teto de sequência ≥4 (${regras.maxDezenasSequenciaGte4}). Evite dezenas em sequência longa no restante.`,
      );
    }
  }

  const valFixas = cf ? validarRegrasSequenciaAtraso(cf, regras) : { valido: true, motivos: [] };
  if (!valFixas.valido) {
    avisos.push(
      `Fixas isoladas já violam seq./atraso: ${valFixas.motivos.join('; ')} (regras serão ampliadas automaticamente).`,
    );
  }

  return avisos;
}

/** Analisa viabilidade antes de gerar — evita erros opacos de “0 candidatos”. */
export function analisarViabilidadeGeracao(params: ViabilidadeGeracaoParams): ViabilidadeGeracaoResult {
  const {
    poolBase,
    dezenasFixas = [],
    dezenasExcluidas = [],
    numerosPorAposta: nRaw = 15,
    ultimoConcurso = null,
    config = CONFIG_PADRAO,
    origemBase = '20D',
  } = params;

  const numerosPorAposta = Math.min(20, Math.max(15, nRaw)) as NumerosPorAposta;
  const bloqueios: string[] = [];
  const avisos: string[] = [];

  const prep = prepararPoolGeracao(poolBase, dezenasFixas, dezenasExcluidas, numerosPorAposta);
  if (!prep.valido) {
    return {
      viavel: false,
      bloqueios: [prep.motivoInvalido ?? 'Pool inválido.'],
      avisos,
      prep,
    };
  }

  if (prep.fixasForaDaBase.length) {
    avisos.push(
      `Fixa(s) fora da base Pareto: ${prep.fixasForaDaBase.map((n) => String(n).padStart(2, '0')).join(', ')} — pool ampliado.`,
    );
  }

  const configAjustada = aplicarConfigEfetivaParaGeracao(
    config,
    prep.poolEfetivo,
    prep.fixas,
    numerosPorAposta,
    ultimoConcurso,
  );
  avisos.push(...avisosCriteriosAjustados(config, configAjustada));

  const slots = numerosPorAposta - prep.fixas.length;
  if (prep.fixas.length) {
    const fixasSet = new Set(prep.fixas);
    const poolRestante = prep.poolEfetivo.filter((d) => !fixasSet.has(d));
    const mFixas = calcularMetricas(prep.fixas, ultimoConcurso, poolBase);
    const checks: Array<[string, number, CriterioFiltro | undefined]> = [
      ['repetidas', mFixas.repetidasUltimo, configAjustada.repetidas],
      ['pares', mFixas.pares, configAjustada.pares],
      ['ímpares', mFixas.impares, configAjustada.impares],
      ['moldura', mFixas.moldura, configAjustada.moldura],
      ['centro', mFixas.centro, configAjustada.centro],
      ['primos', mFixas.primos, configAjustada.primos],
      ['fibonacci', mFixas.fibonacci, configAjustada.fibonacci],
    ];
    for (const [nome, val, crit] of checks) {
      if (!crit) continue;
      const msg = checarContagemFixas(nome, val, crit, slots);
      if (msg) bloqueios.push(msg);
    }
    const msgSoma = checarSomaFixas(mFixas.soma, configAjustada.soma, slots, poolRestante);
    if (msgSoma) bloqueios.push(msgSoma);
  }

  if (config.usarSequenciaAtraso && config.mapaSequenciaAtraso?.size && configAjustada.regrasSequenciaAtraso) {
    avisos.push(...checarSequenciaAtrasoViavel(
      prep.poolEfetivo,
      prep.fixas,
      config.mapaSequenciaAtraso,
      configAjustada.regrasSequenciaAtraso,
      numerosPorAposta,
    ));
  }

  const diagnostico = diagnosticarGeracao({
    origemBase,
    baseDezenas: poolBase,
    ultimoConcurso,
    config: configAjustada,
    numerosPorAposta,
    dezenasFixas: prep.fixas,
    dezenasExcluidas: prep.excluidas,
  });

  if (diagnostico.candidatosValidos === 0) {
    bloqueios.push(
      `Nenhuma combinação passa nos filtros com fixas/indesejadas atuais. ` +
        `Score máx. amostra: ${diagnostico.scoreMaximo.toFixed(1)}, mínimo exigido: ${diagnostico.scoreMinimo}. ` +
        `Reduza score mínimo, afrouxe faixas em Parâmetros ou altere fixas/indesejadas.`,
    );
  } else if (diagnostico.comScoreMinimo === 0 && diagnostico.scoreMaximo < diagnostico.scoreMinimo) {
    bloqueios.push(
      `Há ${diagnostico.candidatosValidos} combinação(ões) válida(s) nos critérios, mas nenhuma atinge score ${diagnostico.scoreMinimo} (máx. ${diagnostico.scoreMaximo.toFixed(1)}).`,
    );
  } else if (diagnostico.comScoreMinimo === 0) {
    avisos.push(
      `Critérios OK em ${diagnostico.candidatosValidos} combinações, mas score mínimo ${diagnostico.scoreMinimo} não alcançado (máx. ${diagnostico.scoreMaximo.toFixed(1)}).`,
    );
  }

  return {
    viavel: bloqueios.length === 0,
    bloqueios,
    avisos,
    prep,
    diagnostico,
  };
}

/** Mapa sintético para testes unitários. */
export function mapaSintetico(
  estados: Partial<Record<number, Pick<DezenaSequenciaAtraso, 'sequenciaAtual' | 'atrasoAtual'>>>,
): Map<number, DezenaSequenciaAtraso> {
  const mapa = new Map<number, DezenaSequenciaAtraso>();
  for (let d = 1; d <= 25; d++) {
    const e = estados[d];
    mapa.set(d, {
      dezena: d,
      frequencia: 100,
      sequenciaAtual: e?.sequenciaAtual ?? 0,
      sequenciaMedia: 0,
      sequenciaMaxima: 0,
      atrasoAtual: e?.atrasoAtual ?? 0,
      atrasoMedio: 0,
      atrasoMaximo: 0,
      statusSequencia: 'normal',
      statusAtraso: 'normal',
      pesoGerador: 1,
    });
  }
  return mapa;
}
