import { CENTRO, FIBONACCI, MOLDURA, PRIMOS } from './constants';
import { calcularMetricas } from './metrics';
import {
  REGRAS_SEQUENCIA_ATRASO_PREMIUM,
  ajustarRegrasSequenciaParaGeracao,
  type DezenaSequenciaAtraso,
} from './sequencia-atraso';
import { CONFIG_PADRAO, type ConfigGeracao, type CriterioFiltro } from './scoring';

function limitesContagemAlcancaveis(
  pool: number[],
  fixas: number[],
  slots: number,
  predicado: (d: number) => boolean,
): { min: number; max: number; valorFixas: number } {
  const fixasSet = new Set(fixas);
  const valorFixas = fixas.filter(predicado).length;
  const restantes = pool.filter((d) => !fixasSet.has(d));
  const restMatch = restantes.filter(predicado).length;
  const restTotal = restantes.length;
  const max = valorFixas + Math.min(slots, restMatch);
  const min = valorFixas + Math.max(0, slots - (restTotal - restMatch));
  return { min, max, valorFixas };
}

function limitesSomaAlcancaveis(
  pool: number[],
  fixas: number[],
  slots: number,
): { min: number; max: number } {
  const fixasSet = new Set(fixas);
  const rest = pool.filter((d) => !fixasSet.has(d)).sort((a, b) => a - b);
  const somaFixas = fixas.reduce((a, b) => a + b, 0);
  if (slots <= 0) return { min: somaFixas, max: somaFixas };
  const minRest = rest.slice(0, slots).reduce((a, b) => a + b, 0);
  const maxRest = rest.slice(-slots).reduce((a, b) => a + b, 0);
  return { min: somaFixas + minRest, max: somaFixas + maxRest };
}

function ajustarCriterioContagem(
  c: CriterioFiltro,
  limites: { min: number; max: number; valorFixas: number },
  teto = 25,
): CriterioFiltro {
  if (c.ativo === false) return c;
  const reqMin = c.min ?? 0;
  const reqMax = c.max ?? teto;
  let newMin = Math.min(reqMin, limites.max);
  let newMax = Math.max(reqMax, limites.valorFixas, limites.min);
  if (newMin > newMax) {
    newMin = limites.min;
    newMax = limites.max;
  }
  return { ...c, min: newMin, max: newMax };
}

function ajustarCriterioSoma(
  c: CriterioFiltro,
  limites: { min: number; max: number },
): CriterioFiltro {
  if (c.ativo === false) return c;
  const reqMin = c.min ?? 0;
  const reqMax = c.max ?? 9999;
  let newMin = Math.min(reqMin, limites.max);
  let newMax = Math.max(reqMax, limites.min);
  if (newMin > newMax) {
    newMin = limites.min;
    newMax = limites.max;
  }
  return { ...c, min: newMin, max: newMax };
}

/** Ajusta faixas estruturais (repetidas, pares, soma…) ao pool + fixas + último concurso. */
export function ajustarCriteriosEstruturaisParaGeracao(
  config: ConfigGeracao,
  poolEfetivo: number[],
  fixas: number[],
  numerosPorAposta = 15,
  ultimoConcurso?: number[] | null,
): ConfigGeracao {
  const slots = Math.max(0, numerosPorAposta - fixas.length);
  const mFixas = fixas.length ? calcularMetricas(fixas, ultimoConcurso, poolEfetivo) : null;
  const ultimoSet =
    ultimoConcurso?.length === 15 ? new Set(ultimoConcurso) : null;

  const out = { ...config };

  if (ultimoSet && config.repetidas?.ativo !== false) {
    const lim = limitesContagemAlcancaveis(poolEfetivo, fixas, slots, (d) => ultimoSet.has(d));
    out.repetidas = ajustarCriterioContagem(config.repetidas, lim, 15);
  }

  const paresLim = limitesContagemAlcancaveis(poolEfetivo, fixas, slots, (d) => d % 2 === 0);
  out.pares = ajustarCriterioContagem(config.pares, paresLim, numerosPorAposta);

  const impLim = limitesContagemAlcancaveis(poolEfetivo, fixas, slots, (d) => d % 2 !== 0);
  out.impares = ajustarCriterioContagem(config.impares, impLim, numerosPorAposta);

  const molduraSet = MOLDURA;
  const moldLim = limitesContagemAlcancaveis(poolEfetivo, fixas, slots, (d) => molduraSet.has(d));
  out.moldura = ajustarCriterioContagem(config.moldura, moldLim, numerosPorAposta);

  const centroSet = CENTRO;
  const centLim = limitesContagemAlcancaveis(poolEfetivo, fixas, slots, (d) => centroSet.has(d));
  out.centro = ajustarCriterioContagem(config.centro, centLim, numerosPorAposta);

  const primLim = limitesContagemAlcancaveis(poolEfetivo, fixas, slots, (d) => PRIMOS.has(d));
  out.primos = ajustarCriterioContagem(config.primos, primLim, numerosPorAposta);

  const fibLim = limitesContagemAlcancaveis(poolEfetivo, fixas, slots, (d) => FIBONACCI.has(d));
  out.fibonacci = ajustarCriterioContagem(config.fibonacci, fibLim, numerosPorAposta);

  if (config.soma?.ativo !== false) {
    out.soma = ajustarCriterioSoma(config.soma, limitesSomaAlcancaveis(poolEfetivo, fixas, slots));
  }

  if (mFixas && config.maiorSeqSorteada?.ativo !== false && config.maiorSeqSorteada) {
    const c = config.maiorSeqSorteada;
    out.maiorSeqSorteada = {
      ...c,
      min: Math.min(c.min ?? 0, 15),
      max: Math.max(c.max ?? 15, mFixas.maiorSequenciaSorteada),
    };
  }
  if (mFixas && config.maiorSeqAusente?.ativo !== false && config.maiorSeqAusente) {
    const c = config.maiorSeqAusente;
    out.maiorSeqAusente = {
      ...c,
      min: Math.min(c.min ?? 0, 15),
      max: Math.max(c.max ?? 15, mFixas.maiorSequenciaAusente),
    };
  }

  return out;
}

/** Config efetiva: seq./atraso + critérios estruturais viáveis para pool/fixas/último. */
export function aplicarConfigEfetivaParaGeracao(
  config: ConfigGeracao,
  poolEfetivo: number[],
  fixas: number[],
  numerosPorAposta = 15,
  ultimoConcurso?: number[] | null,
): ConfigGeracao {
  let cfg = { ...config };
  if (cfg.usarSequenciaAtraso && cfg.mapaSequenciaAtraso?.size) {
    const regrasBase = {
      ...REGRAS_SEQUENCIA_ATRASO_PREMIUM,
      ...cfg.regrasSequenciaAtraso,
    };
    cfg = {
      ...cfg,
      regrasSequenciaAtraso: ajustarRegrasSequenciaParaGeracao(
        poolEfetivo,
        fixas,
        cfg.mapaSequenciaAtraso,
        regrasBase,
        numerosPorAposta,
      ),
    };
  }
  return ajustarCriteriosEstruturaisParaGeracao(
    cfg,
    poolEfetivo,
    fixas,
    numerosPorAposta,
    ultimoConcurso,
  );
}

export { CONFIG_PADRAO };
