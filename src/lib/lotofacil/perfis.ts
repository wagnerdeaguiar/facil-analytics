import type { ConfigGeracao } from './scoring';

export type PerfilId =
  | 'conservador'
  | 'premium_estatistico'
  | 'premium_estrutural'
  | 'amplo'
  | 'agressivo'
  | 'ruptura'
  | 'personalizado';

export interface PerfilGeracaoDef {
  id: PerfilId;
  nome: string;
  descricao: string;
  basePadrao: 'Livre' | '18D' | '19D' | '20D' | 'Personalizada';
  config: ConfigGeracao;
  scoreMinimo: number;
  maxDezenasIguais: number;
}

const baseConfig = (overrides: Partial<ConfigGeracao>): ConfigGeracao => ({
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
  usarSequenciaAtraso: true,
  ...overrides,
});

export const PERFIS_GERACAO: Record<PerfilId, PerfilGeracaoDef> = {
  conservador: {
    id: 'conservador',
    nome: 'Conservador',
    descricao: 'Faixas moderadas com foco em repetidas e soma.',
    basePadrao: '20D',
    scoreMinimo: 75,
    maxDezenasIguais: 13,
    config: baseConfig({
      repetidas: { nome: 'repetidas', min: 8, max: 10, alvo: 9, obrigatorio: true, ativo: true },
      maiorSeqSorteada: { nome: 'maior sequência sorteada', min: 4, max: 7, alvo: 5, obrigatorio: false, ativo: true },
      maiorSeqAusente: { nome: 'maior sequência ausente', min: 2, max: 4, alvo: 3, obrigatorio: false, ativo: true },
    }),
  },
  premium_estatistico: {
    id: 'premium_estatistico',
    nome: 'Premium Estatístico',
    descricao: 'Base 20D Pareto com critérios fortes históricos.',
    basePadrao: '20D',
    scoreMinimo: 80,
    maxDezenasIguais: 13,
    config: baseConfig({
      maiorSeqSorteada: { nome: 'maior sequência sorteada', min: 4, max: 7, alvo: 5, obrigatorio: false, ativo: true },
      maiorSeqAusente: { nome: 'maior sequência ausente', min: 2, max: 4, alvo: 3, obrigatorio: false, ativo: true },
    }),
  },
  premium_estrutural: {
    id: 'premium_estrutural',
    nome: 'Premium Estrutural',
    descricao: 'Repetidas + estrutura horizontal rigorosa (seq. sorteada 4–6, ausente 3–5).',
    basePadrao: '20D',
    scoreMinimo: 85,
    maxDezenasIguais: 13,
    config: baseConfig({
      maiorSeqSorteada: { nome: 'maior sequência sorteada', min: 4, max: 6, alvo: 5, obrigatorio: true, ativo: true },
      maiorSeqAusente: { nome: 'maior sequência ausente', min: 3, max: 5, alvo: 3, obrigatorio: true, ativo: true },
    }),
  },
  amplo: {
    id: 'amplo',
    nome: 'Amplo',
    descricao: 'Faixas mais flexíveis para maior volume de jogos.',
    basePadrao: '20D',
    scoreMinimo: 70,
    maxDezenasIguais: 12,
    config: baseConfig({
      repetidas: { nome: 'repetidas', min: 7, max: 11, alvo: 9, obrigatorio: true, ativo: true },
      pares: { nome: 'pares', min: 5, max: 9, alvo: 7, obrigatorio: true, ativo: true },
      impares: { nome: 'impares', min: 6, max: 10, alvo: 8, obrigatorio: true, ativo: true },
      soma: { nome: 'soma', min: 175, max: 215, alvo: 196, obrigatorio: true, ativo: true },
      moldura: { nome: 'moldura', min: 8, max: 12, alvo: 10, obrigatorio: true, ativo: true },
      centro: { nome: 'centro', min: 3, max: 7, alvo: 5, obrigatorio: true, ativo: true },
      maiorSeqSorteada: { nome: 'maior sequência sorteada', min: 3, max: 7, alvo: 5, obrigatorio: false, ativo: true },
      maiorSeqAusente: { nome: 'maior sequência ausente', min: 2, max: 5, alvo: 3, obrigatorio: false, ativo: true },
    }),
  },
  agressivo: {
    id: 'agressivo',
    nome: 'Agressivo',
    descricao: 'Foco em quentes e repetidas elevadas; base 18D/19D.',
    basePadrao: '18D',
    scoreMinimo: 72,
    maxDezenasIguais: 11,
    config: baseConfig({
      repetidas: { nome: 'repetidas', min: 9, max: 11, alvo: 10, obrigatorio: true, ativo: true },
      maiorSeqSorteada: { nome: 'maior sequência sorteada', min: 4, max: 8, alvo: 5, obrigatorio: false, ativo: true },
      maiorSeqAusente: { nome: 'maior sequência ausente', min: 2, max: 5, alvo: 3, obrigatorio: false, ativo: true },
      pareto: { minQuentes: 12, baseSize: 18 },
    }),
  },
  ruptura: {
    id: 'ruptura',
    nome: 'Ruptura',
    descricao: 'Mais atrasos e menos aderência a quentes.',
    basePadrao: 'Livre',
    scoreMinimo: 65,
    maxDezenasIguais: 11,
    config: baseConfig({
      repetidas: { nome: 'repetidas', min: 6, max: 8, alvo: 7, obrigatorio: true, ativo: true },
      maiorSeqSorteada: { nome: 'maior sequência sorteada', min: 3, max: 7, alvo: 4, obrigatorio: false, ativo: true },
      maiorSeqAusente: { nome: 'maior sequência ausente', min: 3, max: 6, alvo: 4, obrigatorio: false, ativo: true },
      pareto: { minQuentes: 8, baseSize: 18 },
    }),
  },
  personalizado: {
    id: 'personalizado',
    nome: 'Personalizado',
    descricao: 'Configure todos os critérios manualmente.',
    basePadrao: '20D',
    scoreMinimo: 0,
    maxDezenasIguais: 15,
    config: baseConfig({}),
  },
};

export function getPerfilConfig(id: PerfilId): PerfilGeracaoDef {
  return PERFIS_GERACAO[id] ?? PERFIS_GERACAO.premium_estrutural;
}
