import { CONFIG_PADRAO, type ConfigGeracao, type CriterioFiltro } from '@/lib/lotofacil/scoring';
import { PERFIL_PREMIUM } from '@/lib/lotofacil/constants';
import { REGRAS_SEQUENCIA_ATRASO_PREMIUM } from '@/lib/lotofacil/sequencia-atraso';

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
  criterios: CriterioUI[];
  scoreMinimo: number;
  usarSequenciaAtraso: boolean;
  regrasSequencia: RegrasSequenciaUI;
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

export function configToUI(config: ConfigGeracao, scoreMinimo = 0): ConfigGeracaoUI {
  return {
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
      maxDezenasSequenciaGte4: REGRAS_SEQUENCIA_ATRASO_PREMIUM.maxDezenasSequenciaGte4,
      maxDezenasSequenciaGte5: REGRAS_SEQUENCIA_ATRASO_PREMIUM.maxDezenasSequenciaGte5,
      maxDezenasSequenciaGte6: REGRAS_SEQUENCIA_ATRASO_PREMIUM.maxDezenasSequenciaGte6,
      minDezenasAtrasoGte2: REGRAS_SEQUENCIA_ATRASO_PREMIUM.minDezenasAtrasoGte2,
      maxDezenasAtrasoGte2: REGRAS_SEQUENCIA_ATRASO_PREMIUM.maxDezenasAtrasoGte2,
      minDezenasAtrasoGte3: REGRAS_SEQUENCIA_ATRASO_PREMIUM.minDezenasAtrasoGte3,
      maxDezenasAtrasoGte3: REGRAS_SEQUENCIA_ATRASO_PREMIUM.maxDezenasAtrasoGte3,
    },
  };
}

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
  return {
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
  };
}

export function uiToRegrasSequencia(ui: ConfigGeracaoUI) {
  return { ...REGRAS_SEQUENCIA_ATRASO_PREMIUM, ...ui.regrasSequencia };
}

const STORAGE_KEY = 'lotofacil-config-ui';

export function salvarConfigLocal(ui: ConfigGeracaoUI) {
  if (typeof window !== 'undefined') localStorage.setItem(STORAGE_KEY, JSON.stringify(ui));
}

export function carregarConfigLocal(): ConfigGeracaoUI | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as ConfigGeracaoUI) : null;
  } catch {
    return null;
  }
}
