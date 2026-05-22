import { PERFIL_PREMIUM } from './constants';
import { calcularMetricas, dezenasIguais } from './metrics';
import {
  avaliarJogo,
  CONFIG_PADRAO,
  type ConfigGeracao,
} from './scoring';
import {
  REGRAS_SEQUENCIA_ATRASO_PREMIUM,
  ajustarRegrasSequenciaParaPool,
} from './sequencia-atraso';

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
}

function combinar15(dezenas: number[]): number[][] {
  if (dezenas.length < 15) return [];
  if (dezenas.length === 15) return [[...dezenas].sort((a, b) => a - b)];

  const result: number[][] = [];
  const n = dezenas.length;

  function backtrack(start: number, picked: number[]) {
    if (picked.length === 15) {
      result.push([...picked].sort((a, b) => a - b));
      return;
    }
    const need = 15 - picked.length;
    if (n - start < need) return;
    for (let i = start; i < n; i++) {
      picked.push(dezenas[i]);
      backtrack(i + 1, picked);
      picked.pop();
    }
  }

  backtrack(0, []);
  return result;
}

function escolher15Aleatorio(pool: number[]): number[] {
  const copy = [...pool];
  const picked: number[] = [];
  while (picked.length < 15 && copy.length) {
    const i = Math.floor(Math.random() * copy.length);
    picked.push(copy.splice(i, 1)[0]);
  }
  return picked.sort((a, b) => a - b);
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

export function diagnosticarGeracao(
  params: Omit<GerarJogosParams, 'quantidade' | 'maxDezenasIguais'>,
): {
  candidatosValidos: number;
  comScoreMinimo: number;
  scoreMaximo: number;
  sequenciaAtrasoAtivo: boolean;
  scoreMinimo: number;
} {
  const { origemBase, baseDezenas, ultimoConcurso, config = CONFIG_PADRAO } = params;
  const pool = poolFromBase(origemBase, baseDezenas);
  const usarCombinatorio =
    (origemBase === '18D' && pool.length === 18) ||
    (origemBase === '19D' && pool.length === 19) ||
    (origemBase === '20D' && pool.length === 20);

  let candidatosValidos = 0;
  let comScoreMinimo = 0;
  let scoreMaximo = 0;
  const minScore = config.scoreMinimo ?? 0;

  const avaliar = (dezenas: number[]) => {
    const m = calcularMetricas(dezenas, ultimoConcurso, baseDezenas ?? pool);
    const av = avaliarJogo(m, config);
    if (!av.valido) return;
    candidatosValidos++;
    if (av.score > scoreMaximo) scoreMaximo = av.score;
    if (av.score >= minScore) comScoreMinimo++;
  };

  if (usarCombinatorio) {
    for (const dezenas of combinar15(pool)) avaliar(dezenas);
  } else {
    const amostras = Math.min(8000, 50000);
    const vistos = new Set<string>();
    for (let i = 0; i < amostras; i++) {
      const dezenas = escolher15Aleatorio(pool);
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
  } = params;

  const pool = poolFromBase(origemBase, baseDezenas);
  let configEfetiva = config;
  if (
    config.usarSequenciaAtraso &&
    config.mapaSequenciaAtraso &&
    config.mapaSequenciaAtraso.size > 0
  ) {
    const regrasBase = {
      ...REGRAS_SEQUENCIA_ATRASO_PREMIUM,
      ...config.regrasSequenciaAtraso,
    };
    configEfetiva = {
      ...config,
      regrasSequenciaAtraso: ajustarRegrasSequenciaParaPool(pool, config.mapaSequenciaAtraso, regrasBase),
    };
  }

  const candidatos: JogoGeradoResult[] = [];
  const vistos = new Set<string>();

  const usarCombinatorio =
    (origemBase === '18D' && pool.length === 18) ||
    (origemBase === '19D' && pool.length === 19) ||
    (origemBase === '20D' && pool.length === 20);

  if (usarCombinatorio) {
    const combos = combinar15(pool);
    for (const dezenas of combos) {
      const m = calcularMetricas(dezenas, ultimoConcurso, baseDezenas ?? pool);
      const av = avaliarJogo(m, configEfetiva);
      if (!av.valido) continue;
      const key = dezenas.join(',');
      if (vistos.has(key)) continue;
      vistos.add(key);
      candidatos.push({
        dezenas,
        soma: m.soma,
        pares: m.pares,
        impares: m.impares,
        primos: m.primos,
        fibonacci: m.fibonacci,
        moldura: m.moldura,
        centro: m.centro,
        repetidasUltimoConcurso: m.repetidasUltimo,
        scoreEstatistico: av.score,
        statusValidacao: av.status,
        motivosReprovacao: av.motivos,
        detalheScore: av.detalhes,
        origemBase,
      });
    }
  } else {
    let tentativas = 0;
    while (candidatos.length < quantidade * amostrasPorJogo * 3 && tentativas < maxTentativas) {
      tentativas++;
      const dezenas = escolher15Aleatorio(pool);
      const key = dezenas.join(',');
      if (vistos.has(key)) continue;
      vistos.add(key);

      const m = calcularMetricas(dezenas, ultimoConcurso, baseDezenas ?? pool);
      const av = avaliarJogo(m, configEfetiva);
      if (!av.valido) continue;

      candidatos.push({
        dezenas,
        soma: m.soma,
        pares: m.pares,
        impares: m.impares,
        primos: m.primos,
        fibonacci: m.fibonacci,
        moldura: m.moldura,
        centro: m.centro,
        repetidasUltimoConcurso: m.repetidasUltimo,
        scoreEstatistico: av.score,
        statusValidacao: av.status,
        motivosReprovacao: av.motivos,
        detalheScore: av.detalhes,
        origemBase,
      });
    }
  }

  candidatos.sort((a, b) => b.scoreEstatistico - a.scoreEstatistico);

  const selecionados: JogoGeradoResult[] = [];
  for (const jogo of candidatos) {
    if (selecionados.length >= quantidade) break;
    const muitoSimilar = selecionados.some(
      (s) => dezenasIguais(s.dezenas, jogo.dezenas) > maxDezenasIguais,
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

