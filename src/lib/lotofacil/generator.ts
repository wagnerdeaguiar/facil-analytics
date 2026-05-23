import { PERFIL_PREMIUM } from './constants';
import { infoAposta, type NumerosPorAposta } from './aposta';
import { infoApostaComTabela, type TabelaAposta } from './aposta-config';
import { avaliarConjuntoAposta } from './aposta-avaliar';
import { calcularMetricas, dezenasIguais } from './metrics';
import {
  avaliarJogo,
  CONFIG_PADRAO,
  type ConfigGeracao,
} from './scoring';
import {
  aplicarConfigEfetivaParaGeracao,
} from './ajustar-config-geracao';
import { binomial, combinarK, escolherAleatorio } from './combinatoria';

function aplicarRegrasSequenciaNaConfig(
  config: ConfigGeracao,
  poolEfetivo: number[],
  fixas: number[],
  numerosPorAposta = 15,
  ultimoConcurso?: number[] | null,
): ConfigGeracao {
  return aplicarConfigEfetivaParaGeracao(
    config,
    poolEfetivo,
    fixas,
    numerosPorAposta,
    ultimoConcurso,
  );
}

export type OrigemBase = '15D' | '18D' | '19D' | '20D' | 'Livre';

export interface JogoGeradoResult {
  dezenas: number[];
  soma: number;
  pares: number;
  impares: number;
  primos: number;
  fibonacci: number;
  moldura: number;
  centro: number;
  repetidasUltimoConcurso: number;
  scoreEstatistico: number;
  statusValidacao: string;
  motivosReprovacao?: string[];
  detalheScore: Record<string, number>;
  observacoes?: string;
  origemBase: OrigemBase;
  numerosPorAposta?: number;
  combinacoesInternas?: number;
  valorAposta?: number;
}

export interface GerarJogosParams {
  quantidade: number;
  origemBase: OrigemBase;
  baseDezenas?: number[];
  ultimoConcurso?: number[] | null;
  config?: ConfigGeracao;
  maxTentativas?: number;
  maxDezenasIguais?: number;
  amostrasPorJogo?: number;
  numerosPorAposta?: number;
  /** Sempre presentes em cada aposta gerada */
  dezenasFixas?: number[];
  /** Nunca aparecem nas apostas (camada 1, mesmo peso que fixas) */
  dezenasExcluidas?: number[];
  /** Preços/combinações configurados pelo admin (opcional) */
  tabelaAposta?: TabelaAposta;
}

export function diagnosticarGeracao(
  params: Omit<GerarJogosParams, 'quantidade' | 'maxDezenasIguais'>,
): {
  candidatosValidos: number;
  comScoreMinimo: number;
  scoreMaximo: number;
  sequenciaAtrasoAtivo: boolean;
  scoreMinimo: number;
} {
  const {
    origemBase,
    baseDezenas,
    ultimoConcurso,
    config = CONFIG_PADRAO,
    numerosPorAposta: numerosRaw = 15,
    dezenasFixas = [],
    dezenasExcluidas = [],
  } = params;
  const numerosPorAposta = Math.min(20, Math.max(15, numerosRaw)) as NumerosPorAposta;
  const poolBase = poolFromBase(origemBase, baseDezenas);
  const prep = prepararPoolGeracao(poolBase, dezenasFixas, dezenasExcluidas, numerosPorAposta);
  if (!prep.valido) {
    return {
      candidatosValidos: 0,
      comScoreMinimo: 0,
      scoreMaximo: 0,
      sequenciaAtrasoAtivo: config.usarSequenciaAtraso ?? false,
      scoreMinimo: config.scoreMinimo ?? 0,
    };
  }
  const { poolEfetivo, fixas } = prep;
  const excluidasSet = new Set(prep.excluidas);
  const configEfetiva = aplicarRegrasSequenciaNaConfig(
    config,
    poolEfetivo,
    fixas,
    numerosPorAposta,
    ultimoConcurso,
  );
  const restantesPool = fixas.length
    ? poolEfetivo.filter((d) => !new Set(fixas).has(d))
    : poolEfetivo;
  const totalComb = fixas.length
    ? binomial(restantesPool.length, numerosPorAposta - fixas.length)
    : binomial(poolEfetivo.length, numerosPorAposta);
  const usarCombinatorio =
    totalComb > 0 &&
    (totalComb <= 20000 ||
      (poolEfetivo.length <= 21 && numerosPorAposta === 15 && totalComb <= 54264));
  let candidatosValidos = 0;
  let comScoreMinimo = 0;
  let scoreMaximo = 0;
  const minScore = config.scoreMinimo ?? 0;

  const avaliar = (dezenas: number[]) => {
    if (fixas.some((f) => !dezenas.includes(f))) return;
    if (dezenas.some((d) => excluidasSet.has(d))) return;
    const av =
      numerosPorAposta === 15
        ? (() => {
            const m = calcularMetricas(dezenas, ultimoConcurso, baseDezenas ?? poolEfetivo);
            const r = avaliarJogo(m, configEfetiva);
            return { valido: r.valido, score: r.score };
          })()
        : avaliarConjuntoAposta(dezenas, configEfetiva, ultimoConcurso, baseDezenas ?? poolEfetivo);
    if (!av.valido) return;
    candidatosValidos++;
    if (av.score > scoreMaximo) scoreMaximo = av.score;
    if (av.score >= minScore) comScoreMinimo++;
  };

  if (usarCombinatorio) {
    for (const dezenas of iterarCombinacoesPool(poolEfetivo, numerosPorAposta, fixas)) avaliar(dezenas);
  } else {
    const amostras = Math.min(8000, 50000);
    const vistos = new Set<string>();
    const fixasSet = new Set(fixas);
    for (let i = 0; i < amostras; i++) {
      const rest = poolEfetivo.filter((d) => !fixasSet.has(d));
      const need = numerosPorAposta - fixas.length;
      const extra = escolherAleatorio(rest, need);
      const dezenas = [...fixas, ...extra].sort((a, b) => a - b);
      const key = dezenas.join(',');
      if (vistos.has(key)) continue;
      vistos.add(key);
      avaliar(dezenas);
    }
  }

  return {
    candidatosValidos,
    comScoreMinimo,
    scoreMaximo,
    sequenciaAtrasoAtivo: config.usarSequenciaAtraso ?? false,
    scoreMinimo: minScore,
  };
}

function limiteDezenasIguais(
  numerosPorAposta: number,
  poolSize: number,
  maxDezenasIguais: number,
): number {
  if (numerosPorAposta <= 15) return maxDezenasIguais;
  const margem = poolSize - numerosPorAposta;
  // Pool pequeno (ex.: 20D): apostas maiores precisam de limite mais flexivel.
  const minDistintas = margem >= 4 ? 2 : 1;
  const limiteAdaptado = numerosPorAposta - minDistintas;
  return Math.min(numerosPorAposta - 1, Math.max(maxDezenasIguais, limiteAdaptado));
}

function poolFromBase(origem: OrigemBase, base?: number[]): number[] {
  if (origem === 'Livre') return Array.from({ length: 25 }, (_, i) => i + 1);
  if (base?.length) return base;
  return Array.from({ length: 25 }, (_, i) => i + 1);
}

export function configFromPerfilPremium(alvoSoma?: number): ConfigGeracao {
  const p = PERFIL_PREMIUM;
  return {
    repetidas: { nome: 'repetidas', ...p.repetidas, obrigatorio: true, ativo: true },
    pares: { nome: 'pares', ...p.pares, obrigatorio: true, ativo: true },
    impares: { nome: 'impares', ...p.impares, obrigatorio: true, ativo: true },
    soma: { nome: 'soma', ...p.soma, alvo: alvoSoma ?? p.soma.alvo, obrigatorio: true, ativo: true },
    moldura: { nome: 'moldura', ...p.moldura, obrigatorio: true, ativo: true },
    centro: { nome: 'centro', ...p.centro, obrigatorio: true, ativo: true },
    primos: { nome: 'primos', ...p.primos, obrigatorio: true, ativo: true },
    fibonacci: { nome: 'fibonacci', ...p.fibonacci, obrigatorio: true, ativo: true },
    pareto: { minQuentes: 12, baseSize: 20 },
    scoreMinimo: p.scoreMinimo,
    usarSequenciaAtraso: p.sequenciaAtraso ?? true,
  };
}

function iterarCombinacoesPool(
  pool: number[],
  k: number,
  fixas: number[],
): Generator<number[]> {
  const fixasUnicas = [...new Set(fixas)].filter((d) => pool.includes(d)).sort((a, b) => a - b);
  const fixasSet = new Set(fixasUnicas);
  const restantes = pool.filter((d) => !fixasSet.has(d));
  const need = k - fixasUnicas.length;
  if (need < 0) return (function* noop() {})();
  if (need === 0) {
    return (function* one() {
      yield fixasUnicas;
    })();
  }
  return (function* () {
    for (const extra of combinarK(restantes, need)) {
      yield [...fixasUnicas, ...extra].sort((a, b) => a - b);
    }
  })();
}

export interface PoolGeracaoResult {
  poolEfetivo: number[];
  fixas: number[];
  excluidas: number[];
  fixasForaDaBase: number[];
  /** Mesma dezena marcada como fixa e indesejada — inválido */
  contradicoes: number[];
  valido: boolean;
  motivoInvalido?: string;
}

/**
 * Camada 1 (mesmo peso): fixas entram em todo jogo; indesejadas nunca entram.
 * Depois aplicam-se score, perfil e filtros estatísticos.
 */
export function prepararPoolGeracao(
  poolBase: number[],
  dezenasFixas: number[],
  dezenasExcluidas: number[],
  numerosPorAposta: number,
): PoolGeracaoResult {
  const fixas = [...new Set(dezenasFixas)].filter((d) => d >= 1 && d <= 25).sort((a, b) => a - b);
  const excluidas = [...new Set(dezenasExcluidas)].filter((d) => d >= 1 && d <= 25).sort((a, b) => a - b);
  const contradicoes = fixas.filter((f) => excluidas.includes(f));

  const fixasForaDaBase = fixas.filter((f) => !poolBase.includes(f));
  const poolEfetivo = [...new Set([...poolBase, ...fixas])]
    .filter((d) => !excluidas.includes(d))
    .sort((a, b) => a - b);

  const base: Omit<PoolGeracaoResult, 'valido' | 'motivoInvalido'> = {
    poolEfetivo,
    fixas,
    excluidas,
    fixasForaDaBase,
    contradicoes,
  };

  if (contradicoes.length) {
    const nums = contradicoes.map((n) => String(n).padStart(2, '0')).join(', ');
    return {
      ...base,
      valido: false,
      motivoInvalido: `Contradição: ${nums} não pode(m) ser fixa(s) e indesejada(s) ao mesmo tempo.`,
    };
  }

  if (fixas.length >= numerosPorAposta) {
    return {
      ...base,
      valido: false,
      motivoInvalido: `Há ${fixas.length} dezenas fixas; o máximo para apostas de ${numerosPorAposta} dezenas é ${numerosPorAposta - 1}.`,
    };
  }
  if (poolEfetivo.length < numerosPorAposta) {
    return {
      ...base,
      valido: false,
      motivoInvalido: `Pool insuficiente (${poolEfetivo.length} dezenas disponíveis). Reduza fixas ou indesejadas.`,
    };
  }

  return { ...base, valido: true };
}

export function gerarJogos(params: GerarJogosParams): JogoGeradoResult[] {
  const {
    quantidade,
    origemBase,
    baseDezenas,
    ultimoConcurso,
    config = CONFIG_PADRAO,
    maxTentativas = 50000,
    maxDezenasIguais = 13,
    amostrasPorJogo = 1,
    numerosPorAposta: numerosRaw = 15,
    dezenasFixas = [],
    dezenasExcluidas = [],
    tabelaAposta,
  } = params;

  const numerosPorAposta = Math.min(20, Math.max(15, numerosRaw)) as NumerosPorAposta;
  const infoPreco = tabelaAposta
    ? infoApostaComTabela(numerosPorAposta, tabelaAposta)
    : infoAposta(numerosPorAposta);

  const poolBase = poolFromBase(origemBase, baseDezenas);
  const prep = prepararPoolGeracao(poolBase, dezenasFixas, dezenasExcluidas, numerosPorAposta);
  if (!prep.valido) return [];

  const { poolEfetivo, fixas, excluidas } = prep;
  const excluidasSet = new Set(excluidas);
  const fixasSet = new Set(fixas);

  let configEfetiva = aplicarRegrasSequenciaNaConfig(
    config,
    poolEfetivo,
    fixas,
    numerosPorAposta,
    ultimoConcurso,
  );

  const candidatos: JogoGeradoResult[] = [];
  const vistos = new Set<string>();

  const restantesPool = fixas.length
    ? poolEfetivo.filter((d) => !new Set(fixas).has(d))
    : poolEfetivo;
  const totalComb = fixas.length
    ? binomial(restantesPool.length, numerosPorAposta - fixas.length)
    : binomial(poolEfetivo.length, numerosPorAposta);
  const usarCombinatorio =
    totalComb > 0 &&
    (totalComb <= 20000 ||
      (poolEfetivo.length <= 21 && numerosPorAposta === 15 && totalComb <= 54264));

  const pushCandidato = (dezenas: number[]) => {
    if (fixas.some((f) => !dezenas.includes(f))) return;
    if (dezenas.some((d) => excluidasSet.has(d))) return;

    const key = dezenas.join(',');
    if (vistos.has(key)) return;
    vistos.add(key);

    const av =
      numerosPorAposta === 15
        ? (() => {
            const m = calcularMetricas(dezenas, ultimoConcurso, baseDezenas ?? poolEfetivo);
            const r = avaliarJogo(m, configEfetiva);
            return {
              valido: r.valido,
              score: r.score,
              status: r.status,
              motivos: r.motivos,
              detalhes: r.detalhes,
              soma: m.soma,
              pares: m.pares,
              impares: m.impares,
              primos: m.primos,
              fibonacci: m.fibonacci,
              moldura: m.moldura,
              centro: m.centro,
              repetidasUltimoConcurso: m.repetidasUltimo,
            };
          })()
        : avaliarConjuntoAposta(dezenas, configEfetiva, ultimoConcurso, baseDezenas ?? poolEfetivo);

    if (!av.valido) return;

    candidatos.push({
      dezenas,
      soma: av.soma,
      pares: av.pares,
      impares: av.impares,
      primos: av.primos,
      fibonacci: av.fibonacci,
      moldura: av.moldura,
      centro: av.centro,
      repetidasUltimoConcurso: av.repetidasUltimoConcurso,
      scoreEstatistico: av.score,
      statusValidacao: av.status,
      motivosReprovacao: av.motivos,
      detalheScore: av.detalhes,
      origemBase,
      numerosPorAposta,
      combinacoesInternas: infoPreco.combinacoes,
      valorAposta: infoPreco.preco,
    });
  };

  if (usarCombinatorio) {
    for (const dezenas of iterarCombinacoesPool(poolEfetivo, numerosPorAposta, fixas)) {
      pushCandidato(dezenas);
    }
  } else {
    let tentativas = 0;
    while (candidatos.length < quantidade * amostrasPorJogo * 3 && tentativas < maxTentativas) {
      tentativas++;
      const fixasSetLocal = fixasSet;
      const rest = poolEfetivo.filter((d) => !fixasSetLocal.has(d));
      const need = numerosPorAposta - fixas.length;
      const extra = escolherAleatorio(rest, need);
      pushCandidato([...fixas, ...extra].sort((a, b) => a - b));
    }
  }

  candidatos.sort((a, b) => b.scoreEstatistico - a.scoreEstatistico);

  const selecionados: JogoGeradoResult[] = [];
  const limiteIguais = limiteDezenasIguais(numerosPorAposta, poolEfetivo.length, maxDezenasIguais);
  for (const jogo of candidatos) {
    if (selecionados.length >= quantidade) break;
    const muitoSimilar = selecionados.some(
      (s) => dezenasIguais(s.dezenas, jogo.dezenas) > limiteIguais,
    );
    if (muitoSimilar) continue;
    selecionados.push(jogo);
  }

  return selecionados;
}

export function gerarFechamento(
  base: number[],
  topN: number,
  config?: ConfigGeracao,
  ultimoConcurso?: number[] | null,
): JogoGeradoResult[] {
  const origem: OrigemBase = base.length <= 18 ? '18D' : base.length === 19 ? '19D' : '20D';
  const todos = gerarJogos({
    quantidade: topN,
    origemBase: origem,
    baseDezenas: base,
    ultimoConcurso,
    config: config ?? CONFIG_PADRAO,
    maxDezenasIguais: 12,
  });
  return todos.slice(0, topN);
}

