import { prisma } from '@/lib/db';
import { isPremiumStatus } from '@/lib/subscription';
import {
  LIMITES_FREE,
  LIMITES_PREMIUM,
  type PlanLimits,
  type PlanoInput,
} from './types';

export function parsePlanLimits(raw: unknown): PlanLimits | null {
  if (!raw || typeof raw !== 'object') return null;
  const o = raw as Record<string, unknown>;
  const maxJogos = Number(o.maxJogos);
  const maxDezenas = Number(o.maxDezenas);
  if (!Number.isFinite(maxJogos) || !Number.isFinite(maxDezenas)) return null;
  return {
    maxJogos,
    maxDezenas,
    salvarJogos: Boolean(o.salvarJogos),
    fechamento: Boolean(o.fechamento),
    simulador: Boolean(o.simulador),
    exportacao: Boolean(o.exportacao),
    importConcursos: Boolean(o.importConcursos),
    perfis: Boolean(o.perfis),
    dezenasFixas: Boolean(o.dezenasFixas),
    imprimirCartelas: o.imprimirCartelas !== false,
  };
}

export function normalizarPlanoInput(raw: unknown): PlanoInput | null {
  if (!raw || typeof raw !== 'object') return null;
  const o = raw as Record<string, unknown>;
  const slug = String(o.slug ?? '').trim().toLowerCase();
  const nome = String(o.nome ?? '').trim();
  const valor = Number(o.valor);
  const limites = parsePlanLimits(o.limites);
  if (!slug || !nome || !limites) return null;
  if (!Number.isFinite(valor) || valor < 0) return null;
  const periodicidade = String(o.periodicidade ?? 'none') as PlanoInput['periodicidade'];
  if (!['none', 'monthly', 'yearly'].includes(periodicidade)) return null;
  return {
    slug,
    nome,
    descricao: o.descricao ? String(o.descricao) : undefined,
    valor,
    moeda: String(o.moeda ?? 'BRL'),
    periodicidade,
    limites,
    recursos: Array.isArray(o.recursos) ? o.recursos.map(String) : [],
    ordem: Number(o.ordem) || 0,
    ativo: o.ativo !== false,
    destaque: Boolean(o.destaque),
  };
}

export const PLANOS_PADRAO: PlanoInput[] = [
  {
    slug: 'free',
    nome: 'Gratuito',
    descricao: 'Para conhecer a plataforma e gerar apostas com limites de uso — sem cartão de crédito.',
    valor: 0,
    periodicidade: 'none',
    limites: LIMITES_FREE,
    recursos: [
      'Dashboard, resultados e critérios estatísticos',
      'Gerador: até 5 jogos com 15 dezenas',
      'Telas de análise no modo visitante',
      'Impressão de cartelas',
    ],
    ordem: 0,
    ativo: true,
    destaque: false,
  },
  {
    slug: 'premium',
    nome: 'Premium',
    descricao:
      'Ferramentas avançadas por mensalidade simbólica — apenas para cobrir hospedagem, manutenção e melhorias.',
    valor: 4.99,
    periodicidade: 'monthly',
    limites: LIMITES_PREMIUM,
    recursos: [
      'Tudo do Gratuito, com gerador ampliado (até 500 jogos, 16–20 dezenas)',
      'Fechamento combinatório',
      'Simulador retroativo contra concursos passados',
      'Exportação CSV, XLSX e PDF',
      'Importação de planilhas CEF (Excel)',
      'Perfis salvos, dezenas fixas e parâmetros avançados',
    ],
    ordem: 1,
    ativo: true,
    destaque: true,
  },
];

export async function seedPlanosPadrao() {
  for (const p of PLANOS_PADRAO) {
    await prisma.plano.upsert({
      where: { slug: p.slug },
      create: {
        slug: p.slug,
        nome: p.nome,
        descricao: p.descricao,
        valor: p.valor,
        moeda: p.moeda ?? 'BRL',
        periodicidade: p.periodicidade,
        limites: p.limites as object,
        recursos: p.recursos ?? [],
        ordem: p.ordem ?? 0,
        ativo: p.ativo !== false,
        destaque: Boolean(p.destaque),
      },
      update: {},
    });
  }
}

export async function getPlanosAtivos() {
  return prisma.plano.findMany({
    where: { ativo: true },
    orderBy: { ordem: 'asc' },
  });
}

export async function getPlanoBySlug(slug: string) {
  return prisma.plano.findUnique({ where: { slug } });
}

export async function getPlanoById(id: string) {
  return prisma.plano.findUnique({ where: { id } });
}

export async function listarTodosPlanos() {
  return prisma.plano.findMany({ orderBy: { ordem: 'asc' } });
}

export async function criarPlano(input: PlanoInput) {
  return prisma.plano.create({
    data: {
      slug: input.slug,
      nome: input.nome,
      descricao: input.descricao,
      valor: input.valor,
      moeda: input.moeda ?? 'BRL',
      periodicidade: input.periodicidade,
      limites: input.limites as object,
      recursos: input.recursos ?? [],
      ordem: input.ordem ?? 0,
      ativo: input.ativo !== false,
      destaque: Boolean(input.destaque),
    },
  });
}

export async function atualizarPlano(id: string, input: Partial<PlanoInput>) {
  const data: Record<string, unknown> = {};
  if (input.nome) data.nome = input.nome;
  if (input.descricao !== undefined) data.descricao = input.descricao;
  if (input.valor !== undefined) data.valor = input.valor;
  if (input.moeda) data.moeda = input.moeda;
  if (input.periodicidade) data.periodicidade = input.periodicidade;
  if (input.limites) data.limites = input.limites as object;
  if (input.recursos) data.recursos = input.recursos;
  if (input.ordem !== undefined) data.ordem = input.ordem;
  if (input.ativo !== undefined) data.ativo = input.ativo;
  if (input.destaque !== undefined) data.destaque = input.destaque;
  return prisma.plano.update({ where: { id }, data });
}

/** Resolve limites efetivos do usuário conforme plano e status de pagamento. */
export async function resolvePlanLimitsForUser(
  userId: string,
  subscriptionStatus?: string | null,
): Promise<PlanLimits> {
  const status = subscriptionStatus ?? 'free';
  if (!isPremiumStatus(status)) {
    const free = await getPlanoBySlug('free');
    return parsePlanLimits(free?.limites) ?? LIMITES_FREE;
  }

  const sub = await prisma.subscription.findUnique({
    where: { userId },
    include: { planoRef: true },
  });

  if (sub?.planoRef) {
    return parsePlanLimits(sub.planoRef.limites) ?? LIMITES_PREMIUM;
  }

  const premium = await getPlanoBySlug(sub?.plano ?? 'premium');
  return parsePlanLimits(premium?.limites) ?? LIMITES_PREMIUM;
}
