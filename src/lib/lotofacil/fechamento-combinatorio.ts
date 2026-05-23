import { combinarK } from './combinatoria';

import { aplicarConfigEfetivaParaGeracao } from './ajustar-config-geracao';

import { prepararPoolGeracao } from './generator';

import { calcularMetricas } from './metrics';

import { avaliarJogo, type ConfigGeracao } from './scoring';



const PRECO_BILHETE_PADRAO = 3.5;

const MIN_UNIVERSO_FECHAMENTO = 16;



export interface FechamentoParams {

  /** Universo de dezenas (16–25), ordenado */

  pool: number[];

  numerosPorBilhete?: number;

  /** Prêmio mínimo exigido em pelo menos um bilhete (11–14) */

  garantia: number;

  /** Quantas dezenas sorteadas precisam estar no pool para a garantia valer (tipicamente 15) */

  condicao?: number;

  dezenasFixas?: number[];

  dezenasExcluidas?: number[];

  /** 100 = cobertura total; 75 = aceita cobrir 75% dos cenários */

  percentualCobertura?: number;

  maxBilhetes?: number;

  /** Filtra bilhetes gerados pelo score estatístico (opcional) */

  /** Preço unitário de bilhete de 15 dezenas (config admin) */
  precoBilhete?: number;
  configEstatistica?: ConfigGeracao;

  ultimoConcurso?: number[] | null;

}



export interface FechamentoResultado {

  bilhetes: number[][];

  totalBilhetes: number;

  custoEstimado: number;

  coberturaPercentual: number;

  cenariosTotal: number;

  cenariosCobertos: number;

  avisos: string[];

  disclaimer: string;

  poolEfetivo: number[];

  fixasAplicadas: number[];

  excluidasAplicadas: number[];

  fixasForaDaBase: number[];

  contradicoes: number[];

}



function intersecao(a: number[], b: number[]): number {

  let i = 0;

  let j = 0;

  let n = 0;

  while (i < a.length && j < b.length) {

    if (a[i] === b[j]) {

      n++;

      i++;

      j++;

    } else if (a[i] < b[j]) i++;

    else j++;

  }

  return n;

}



function bilheteCobreCenario(bilhete: number[], cenario: number[], garantia: number): boolean {

  return intersecao(bilhete, cenario) >= garantia;

}



function gerarCenarios(pool: number[], tamanho: number): number[][] {

  if (tamanho > pool.length) return [];

  if (tamanho === pool.length) return [[...pool].sort((a, b) => a - b)];

  return combinarK(pool, tamanho);

}



function gerarCandidatosBilhete(

  pool: number[],

  k: number,

  fixas: number[],

  limite: number,

): number[][] {

  const fixasSet = new Set(fixas);

  const restantes = pool.filter((d) => !fixasSet.has(d));

  const need = k - fixas.length;

  if (need < 0 || restantes.length < need) return [];

  const combos = combinarK(restantes, need);

  if (combos.length <= limite) {

    return combos.map((c) => [...fixas, ...c].sort((a, b) => a - b));

  }

  const out: number[][] = [];

  const step = Math.max(1, Math.floor(combos.length / limite));

  for (let i = 0; i < combos.length && out.length < limite; i += step) {

    out.push([...fixas, ...combos[i]].sort((a, b) => a - b));

  }

  return out;

}



function erroVazio(

  avisos: string[],

  disclaimer: string,

  prep?: ReturnType<typeof prepararPoolGeracao>,

): FechamentoResultado {

  return {

    bilhetes: [],

    totalBilhetes: 0,

    custoEstimado: 0,

    coberturaPercentual: 0,

    cenariosTotal: 0,

    cenariosCobertos: 0,

    avisos,

    disclaimer,

    poolEfetivo: prep?.poolEfetivo ?? [],

    fixasAplicadas: prep?.fixas ?? [],

    excluidasAplicadas: prep?.excluidas ?? [],

    fixasForaDaBase: prep?.fixasForaDaBase ?? [],

    contradicoes: prep?.contradicoes ?? [],

  };

}



/**

 * Fechamento combinatório por cobertura gulosa (set cover).

 * Usa a mesma preparação de pool/fixas/indesejadas e filtros estatísticos do gerador.

 */

export function gerarFechamentoCombinatorio(params: FechamentoParams): FechamentoResultado {

  const k = params.numerosPorBilhete ?? 15;

  const garantia = Math.min(14, Math.max(11, params.garantia));

  const poolBase = [...new Set(params.pool)].filter((d) => d >= 1 && d <= 25).sort((a, b) => a - b);

  const precoUnit = params.precoBilhete ?? PRECO_BILHETE_PADRAO;
  const pctAlvo = Math.min(100, Math.max(50, params.percentualCobertura ?? 100));
  const maxBilhetes = Math.min(params.maxBilhetes ?? 500, 800);

  const avisos: string[] = [];



  const disclaimer =

    'Garantia combinatória: válida somente se as dezenas sorteadas atenderem à condição configurada. ' +

    'Não substitui análise estatística nem implica lucro ou prêmio futuro. Lotofácil é jogo de azar.';



  const prep = prepararPoolGeracao(

    poolBase,

    params.dezenasFixas ?? [],

    params.dezenasExcluidas ?? [],

    k,

  );



  if (!prep.valido) {

    return erroVazio([prep.motivoInvalido ?? 'Pool inválido.'], disclaimer, prep);

  }



  const pool = prep.poolEfetivo;

  const fixas = prep.fixas;



  if (prep.fixasForaDaBase.length) {

    avisos.push(

      `Fixa(s) fora do universo inicial: ${prep.fixasForaDaBase.map((n) => String(n).padStart(2, '0')).join(', ')} — universo ampliado.`,

    );

  }



  if (pool.length < MIN_UNIVERSO_FECHAMENTO) {

    return erroVazio(

      [`Universo insuficiente (${pool.length} dezenas). Mínimo ${MIN_UNIVERSO_FECHAMENTO} após fixas/indesejadas.`],

      disclaimer,

      prep,

    );

  }



  const condicao = Math.min(params.condicao ?? 15, pool.length, 15);



  const cenarioSize = Math.min(condicao, 15);

  const cenarios = gerarCenarios(pool, cenarioSize);

  const cenariosTotal = cenarios.length;



  if (cenariosTotal > 200_000 && pctAlvo >= 100) {

    avisos.push(

      `Universo grande (${pool.length} dezenas): ${cenariosTotal.toLocaleString('pt-BR')} cenários. ` +

        'Use cobertura percentual (<100%) ou reduza o universo (≤21 dezenas para fechamento completo).',

    );

    return erroVazio(avisos, disclaimer, prep);

  }



  const limiteCand = pool.length <= 20 ? 20_000 : 8_000;

  const candidatos = gerarCandidatosBilhete(pool, k, fixas, limiteCand);

  if (!candidatos.length) {

    return erroVazio(

      ['Não foi possível montar bilhetes com os parâmetros informados.'],

      disclaimer,

      prep,

    );

  }



  const coberturaPorCandidato = candidatos.map((b) => {

    const idxs: number[] = [];

    for (let i = 0; i < cenarios.length; i++) {

      if (bilheteCobreCenario(b, cenarios[i], garantia)) idxs.push(i);

    }

    return idxs;

  });



  const uncovered = new Set<number>(cenarios.map((_, i) => i));

  const alvoCobertos = Math.ceil((pctAlvo / 100) * cenariosTotal);

  const bilhetes: number[][] = [];

  const usados = new Set<string>();



  while (uncovered.size > 0 && bilhetes.length < maxBilhetes) {

    if (cenariosTotal - uncovered.size >= alvoCobertos) break;



    let bestIdx = -1;

    let bestGain = 0;

    for (let c = 0; c < candidatos.length; c++) {

      const key = candidatos[c].join(',');

      if (usados.has(key)) continue;

      let gain = 0;

      for (const i of coberturaPorCandidato[c]) {

        if (uncovered.has(i)) gain++;

      }

      if (gain > bestGain) {

        bestGain = gain;

        bestIdx = c;

      }

    }



    if (bestIdx < 0 || bestGain === 0) break;



    const escolhido = candidatos[bestIdx];

    usados.add(escolhido.join(','));

    bilhetes.push(escolhido);

    for (const i of coberturaPorCandidato[bestIdx]) uncovered.delete(i);

  }



  const cenariosCobertos = cenariosTotal - uncovered.size;

  const coberturaPercentual =

    cenariosTotal > 0 ? Math.round((cenariosCobertos / cenariosTotal) * 1000) / 10 : 0;



  if (coberturaPercentual < pctAlvo) {

    avisos.push(

      `Cobertura ${coberturaPercentual}% (meta ${pctAlvo}%). Aumente max. bilhetes ou reduza garantia/universo.`,

    );

  }



  let bilhetesFinais = bilhetes;

  if (params.configEstatistica) {

    const cfg = aplicarConfigEfetivaParaGeracao(

      params.configEstatistica,

      pool,

      fixas,

      k,

      params.ultimoConcurso,

    );

    const filtrados = bilhetes.filter((b) => {

      const m = calcularMetricas(b, params.ultimoConcurso ?? null, pool);

      return avaliarJogo(m, cfg).valido;

    });

    if (filtrados.length < bilhetes.length) {

      avisos.push(

        `Filtros estatísticos removeram ${bilhetes.length - filtrados.length} bilhete(s). Cobertura combinatória pode ter sido reduzida.`,

      );

    }

    bilhetesFinais = filtrados.length ? filtrados : bilhetes;

  }



  if (pool.length > 21 && pctAlvo >= 100) {

    avisos.push('Para universo acima de 21 dezenas, prefira cobertura percentual (ex.: 90%).');

  }



  return {

    bilhetes: bilhetesFinais,

    totalBilhetes: bilhetesFinais.length,

    custoEstimado: Math.round(bilhetesFinais.length * precoUnit * 100) / 100,

    coberturaPercentual,

    cenariosTotal,

    cenariosCobertos,

    avisos,

    disclaimer,

    poolEfetivo: pool,

    fixasAplicadas: fixas,

    excluidasAplicadas: prep.excluidas,

    fixasForaDaBase: prep.fixasForaDaBase,

    contradicoes: prep.contradicoes,

  };

}



export function verificarBilheteContraSorteio(bilhete: number[], sorteio: number[]): number {

  return intersecao(bilhete, sorteio);

}


