import { CONFIG_PADRAO, type ConfigGeracao, type CriterioFiltro } from '@/lib/lotofacil/scoring';
import { PERFIL_PREMIUM } from '@/lib/lotofacil/constants';
import { REGRAS_SEQUENCIA_ATRASO_PREMIUM } from '@/lib/lotofacil/sequencia-atraso';
import {
  getPerfilConfig,
  PERFIS_GERACAO,
  type PerfilGeracaoDef,
  type PerfilId,
} from '@/lib/lotofacil/perfis';

export interface CriterioUI {
  nome: string;
  label: string;
  min: number;
  max: number;
  alvo: number;
  obrigatorio: boolean;
  ativo: boolean;
}

export interface RegrasSequenciaUI {
  maxDezenasSequenciaGte4: number;
  maxDezenasSequenciaGte5: number;
  maxDezenasSequenciaGte6: number;
  minDezenasAtrasoGte2: number;
  maxDezenasAtrasoGte2: number;
  minDezenasAtrasoGte3: number;
  maxDezenasAtrasoGte3: number;
}

export interface ConfigGeracaoUI {
  perfilId?: PerfilId | null;
  criterios: CriterioUI[];
  maiorSeqSorteada?: CriterioUI;
  maiorSeqAusente?: CriterioUI;
  volanteLinhas?: CriterioUI;
  volanteColunas?: CriterioUI;
  scoreMinimo: number;
  usarSequenciaAtraso: boolean;
  regrasSequencia: RegrasSequenciaUI;
}

export interface GeradorPrefsSalvas {
  config: ConfigGeracaoUI;
  origemBase: string;
  maxDezenasIguais: number;
  quantidade?: number;
  numerosPorAposta?: number;
  updatedAt?: string;
}

const LABELS: Record<string, string> = {
  repetidas: 'Repetidas do último concurso',
  pares: 'Pares',
  impares: 'Ímpares',
  soma: 'Soma das dezenas',
  moldura: 'Moldura',
  centro: 'Centro',
  primos: 'Primos',
  fibonacci: 'Fibonacci',
  maiorSeqSorteada: 'Maior sequência sorteada',
  maiorSeqAusente: 'Maior sequência ausente',
  volanteLinhas: 'Volante — mín./máx. por linha',
  volanteColunas: 'Volante — mín./máx. por coluna',
};

function criterioToUI(c: CriterioFiltro): CriterioUI {
  return {
    nome: c.nome,
    label: LABELS[c.nome] ?? c.nome,
    min: c.min ?? 0,
    max: c.max ?? 25,
    alvo: c.alvo ?? 0,
    obrigatorio: c.obrigatorio ?? true,
    ativo: c.ativo !== false,
  };
}

export function configToUI(config: ConfigGeracao, scoreMinimo = 0, perfilId?: PerfilId | null): ConfigGeracaoUI {
  const regras = { ...REGRAS_SEQUENCIA_ATRASO_PREMIUM, ...config.regrasSequenciaAtraso };
  const ui: ConfigGeracaoUI = {
    perfilId: perfilId ?? null,
    criterios: [
      criterioToUI(config.repetidas),
      criterioToUI(config.pares),
      criterioToUI(config.impares),
      criterioToUI(config.soma),
      criterioToUI(config.moldura),
      criterioToUI(config.centro),
      criterioToUI(config.primos),
      criterioToUI(config.fibonacci),
    ],
    scoreMinimo,
    usarSequenciaAtraso: config.usarSequenciaAtraso ?? true,
    regrasSequencia: {
      maxDezenasSequenciaGte4: regras.maxDezenasSequenciaGte4,
      maxDezenasSequenciaGte5: regras.maxDezenasSequenciaGte5,
      maxDezenasSequenciaGte6: regras.maxDezenasSequenciaGte6,
      minDezenasAtrasoGte2: regras.minDezenasAtrasoGte2,
      maxDezenasAtrasoGte2: regras.maxDezenasAtrasoGte2,
      minDezenasAtrasoGte3: regras.minDezenasAtrasoGte3,
      maxDezenasAtrasoGte3: regras.maxDezenasAtrasoGte3,
    },
  };
  if (config.maiorSeqSorteada) {
    ui.maiorSeqSorteada = criterioToUI({ ...config.maiorSeqSorteada, nome: 'maiorSeqSorteada' });
  }
  if (config.maiorSeqAusente) {
    ui.maiorSeqAusente = criterioToUI({ ...config.maiorSeqAusente, nome: 'maiorSeqAusente' });
  }
  ui.volanteLinhas = criterioToUI({
    ...(config.volanteLinhas ?? CONFIG_PADRAO.volanteLinhas!),
    nome: 'volanteLinhas',
  });
  ui.volanteColunas = criterioToUI({
    ...(config.volanteColunas ?? CONFIG_PADRAO.volanteColunas!),
    nome: 'volanteColunas',
  });
  return ui;
}

export function perfilIdValido(id: string | null | undefined): id is PerfilId {
  return id != null && id in PERFIS_GERACAO;
}

export function perfilBaseParaOrigem(basePadrao: PerfilGeracaoDef['basePadrao']): string {
  if (basePadrao === 'Livre') return 'Livre';
  if (basePadrao === '18D' || basePadrao === '19D' || basePadrao === '20D') return basePadrao;
  return '20D';
}

export function perfilToUI(perfil: PerfilGeracaoDef, mediaSoma?: number): ConfigGeracaoUI {
  const cfg: ConfigGeracao = { ...perfil.config };
  if (mediaSoma != null) {
    cfg.soma = { ...cfg.soma, alvo: mediaSoma };
  }
  return configToUI(cfg, perfil.scoreMinimo, perfil.id);
}

export function perfilToUIById(id: PerfilId, mediaSoma?: number): ConfigGeracaoUI {
  return perfilToUI(getPerfilConfig(id), mediaSoma);
}

export const LISTA_PERFIS = Object.values(PERFIS_GERACAO);

export function configPadraoUI(): ConfigGeracaoUI {
  return configToUI(CONFIG_PADRAO, 0);
}

export function configPremiumUI(mediaSoma?: number): ConfigGeracaoUI {
  const p = PERFIL_PREMIUM;
  return configToUI(
    {
      repetidas: { nome: 'repetidas', ...p.repetidas, obrigatorio: true, ativo: true },
      pares: { nome: 'pares', ...p.pares, obrigatorio: true, ativo: true },
      impares: { nome: 'impares', ...p.impares, obrigatorio: true, ativo: true },
      soma: { nome: 'soma', ...p.soma, alvo: mediaSoma ?? p.soma.alvo, obrigatorio: true, ativo: true },
      moldura: { nome: 'moldura', ...p.moldura, obrigatorio: true, ativo: true },
      centro: { nome: 'centro', ...p.centro, obrigatorio: true, ativo: true },
      primos: { nome: 'primos', ...p.primos, obrigatorio: true, ativo: true },
      fibonacci: { nome: 'fibonacci', ...p.fibonacci, obrigatorio: true, ativo: true },
      usarSequenciaAtraso: true,
    },
    p.scoreMinimo,
  );
}

export function uiToConfigGeracao(ui: ConfigGeracaoUI): ConfigGeracao {
  const pick = (nome: string) => ui.criterios.find((c) => c.nome === nome)!;
  const mk = (nome: string): CriterioFiltro => {
    const c = pick(nome);
    return { nome, min: c.min, max: c.max, alvo: c.alvo, obrigatorio: c.obrigatorio, ativo: c.ativo };
  };
  const mkExtra = (c: CriterioUI | undefined, nome: string): CriterioFiltro | undefined => {
    if (!c || c.ativo === false) return undefined;
    return { nome, min: c.min, max: c.max, alvo: c.alvo, obrigatorio: c.obrigatorio, ativo: c.ativo };
  };
  const out: ConfigGeracao = {
    repetidas: mk('repetidas'),
    pares: mk('pares'),
    impares: mk('impares'),
    soma: mk('soma'),
    moldura: mk('moldura'),
    centro: mk('centro'),
    primos: mk('primos'),
    fibonacci: mk('fibonacci'),
    scoreMinimo: ui.scoreMinimo,
    usarSequenciaAtraso: ui.usarSequenciaAtraso,
    regrasSequenciaAtraso: uiToRegrasSequencia(ui),
  };
  const seqS = mkExtra(ui.maiorSeqSorteada, 'maior sequência sorteada');
  const seqA = mkExtra(ui.maiorSeqAusente, 'maior sequência ausente');
  const vLin = mkExtra(ui.volanteLinhas, 'mín. por linha');
  const vCol = mkExtra(ui.volanteColunas, 'mín. por coluna');
  if (seqS) out.maiorSeqSorteada = seqS;
  if (seqA) out.maiorSeqAusente = seqA;
  if (vLin) out.volanteLinhas = vLin;
  if (vCol) out.volanteColunas = vCol;
  if (ui.perfilId) {
    const pareto = getPerfilConfig(ui.perfilId).config.pareto;
    if (pareto) out.pareto = pareto;
  }
  return out;
}

export function uiToRegrasSequencia(ui: ConfigGeracaoUI) {
  return { ...REGRAS_SEQUENCIA_ATRASO_PREMIUM, ...ui.regrasSequencia };
}

const STORAGE_KEY = 'lotofacil-config-ui';
const PREFS_KEY = 'lotofacil-gerador-prefs';

function parseNumero(val: unknown, fallback: number): number {
  const n = typeof val === 'number' ? val : Number(val);
  return Number.isFinite(n) ? n : fallback;
}

function normalizarCriterioUI(c: Partial<CriterioUI> | undefined, defaults: CriterioUI): CriterioUI {
  return {
    nome: c?.nome ?? defaults.nome,
    label: c?.label ?? defaults.label,
    min: parseNumero(c?.min, defaults.min),
    max: parseNumero(c?.max, defaults.max),
    alvo: parseNumero(c?.alvo, defaults.alvo),
    obrigatorio: c?.obrigatorio ?? defaults.obrigatorio,
    ativo: c?.ativo !== false,
  };
}

/** Garante estrutura completa ao ler/gravar localStorage (evita NaN/null quebrando reload). */
export function normalizarConfigGeracaoUI(raw: unknown): ConfigGeracaoUI {
  const padrao = configPadraoUI();
  if (!raw || typeof raw !== 'object') return padrao;

  const r = raw as Partial<ConfigGeracaoUI>;
  const criterios = padrao.criterios.map((def) => {
    const salvo = Array.isArray(r.criterios) ? r.criterios.find((c) => c?.nome === def.nome) : undefined;
    return normalizarCriterioUI(salvo, def);
  });

  const regrasPadrao = padrao.regrasSequencia;
  const regrasRaw = (r.regrasSequencia ?? {}) as Partial<RegrasSequenciaUI>;

  return {
    perfilId: perfilIdValido(r.perfilId as string) ? r.perfilId : null,
    criterios,
    maiorSeqSorteada: r.maiorSeqSorteada
      ? normalizarCriterioUI(r.maiorSeqSorteada, padrao.maiorSeqSorteada ?? criterios[0])
      : padrao.maiorSeqSorteada,
    maiorSeqAusente: r.maiorSeqAusente
      ? normalizarCriterioUI(r.maiorSeqAusente, padrao.maiorSeqAusente ?? criterios[0])
      : padrao.maiorSeqAusente,
    volanteLinhas: normalizarCriterioUI(r.volanteLinhas, padrao.volanteLinhas!),
    volanteColunas: normalizarCriterioUI(r.volanteColunas, padrao.volanteColunas!),
    scoreMinimo: Math.min(100, Math.max(0, parseNumero(r.scoreMinimo, padrao.scoreMinimo))),
    usarSequenciaAtraso: r.usarSequenciaAtraso !== false,
    regrasSequencia: {
      maxDezenasSequenciaGte4: parseNumero(
        regrasRaw.maxDezenasSequenciaGte4,
        regrasPadrao.maxDezenasSequenciaGte4,
      ),
      maxDezenasSequenciaGte5: parseNumero(
        regrasRaw.maxDezenasSequenciaGte5,
        regrasPadrao.maxDezenasSequenciaGte5,
      ),
      maxDezenasSequenciaGte6: parseNumero(
        regrasRaw.maxDezenasSequenciaGte6,
        regrasPadrao.maxDezenasSequenciaGte6,
      ),
      minDezenasAtrasoGte2: parseNumero(regrasRaw.minDezenasAtrasoGte2, regrasPadrao.minDezenasAtrasoGte2),
      maxDezenasAtrasoGte2: parseNumero(regrasRaw.maxDezenasAtrasoGte2, regrasPadrao.maxDezenasAtrasoGte2),
      minDezenasAtrasoGte3: parseNumero(regrasRaw.minDezenasAtrasoGte3, regrasPadrao.minDezenasAtrasoGte3),
      maxDezenasAtrasoGte3: parseNumero(regrasRaw.maxDezenasAtrasoGte3, regrasPadrao.maxDezenasAtrasoGte3),
    },
  };
}

function isConfigGeracaoUI(value: unknown): value is ConfigGeracaoUI {
  if (typeof value !== 'object' || value === null || !('criterios' in value)) return false;
  const c = value as ConfigGeracaoUI;
  if (!Array.isArray(c.criterios) || c.criterios.length === 0) return false;
  const score = (c as { scoreMinimo?: unknown }).scoreMinimo;
  return typeof score === 'number' && Number.isFinite(score);
}

export function salvarGeradorPrefs(prefs: GeradorPrefsSalvas): boolean {
  if (typeof window === 'undefined') return false;
  try {
    const normalizado: GeradorPrefsSalvas = {
      ...prefs,
      config: normalizarConfigGeracaoUI(prefs.config),
      origemBase: prefs.origemBase || '20D',
      maxDezenasIguais: parseNumero(prefs.maxDezenasIguais, 13),
      updatedAt: new Date().toISOString(),
    };
    localStorage.setItem(PREFS_KEY, JSON.stringify(normalizado));
    salvarConfigLocal(normalizado.config);
    return true;
  } catch (e) {
    console.error('Falha ao salvar parâmetros no navegador:', e);
    return false;
  }
}

/** Carrega prefs locais de forma síncrona (use no estado inicial do Gerador). */
export function lerPrefsLocaisIniciais(): GeradorPrefsSalvas | null {
  return carregarGeradorPrefs();
}

export function carregarGeradorPrefs(): GeradorPrefsSalvas | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = localStorage.getItem(PREFS_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<GeradorPrefsSalvas>;
    if (!parsed?.config) return null;
    return {
      config: normalizarConfigGeracaoUI(parsed.config),
      origemBase: typeof parsed.origemBase === 'string' ? parsed.origemBase : '20D',
      maxDezenasIguais: parseNumero(parsed.maxDezenasIguais, 13),
      quantidade: typeof parsed.quantidade === 'number' ? parsed.quantidade : undefined,
      numerosPorAposta: typeof parsed.numerosPorAposta === 'number' ? parsed.numerosPorAposta : undefined,
      updatedAt: typeof parsed.updatedAt === 'string' ? parsed.updatedAt : undefined,
    };
  } catch {
    return null;
  }
}

export function salvarConfigLocal(ui: ConfigGeracaoUI) {
  if (typeof window === 'undefined') return;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(normalizarConfigGeracaoUI(ui)));
}

export function carregarConfigLocal(): ConfigGeracaoUI | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = localStorage.getItem(STORAGE_KEY) ?? localStorage.getItem('lotofacil-config-ui-v2');
    if (!raw) return null;
    return normalizarConfigGeracaoUI(JSON.parse(raw));
  } catch {
    return null;
  }
}
