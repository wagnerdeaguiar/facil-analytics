import { getConfigApp, setConfigApp } from '@/lib/services/config-app';

import { SITE_EMAIL } from '@/lib/site-identity';

export const CHAVE_SITE_RESPONSAVEL = 'site_responsavel';

export interface SiteResponsavel {
  nome: string;
  cpf: string;
  telefone: string;
  email: string;
}

export const SITE_RESPONSAVEL_PADRAO: SiteResponsavel = {
  nome: 'Wagner Francisco Silveira de Aguiar',
  cpf: '74404741987',
  telefone: '48991221395',
  email: SITE_EMAIL,
};

export function normalizarSiteResponsavel(raw: unknown): SiteResponsavel | null {
  if (!raw || typeof raw !== 'object') return null;
  const o = raw as Record<string, unknown>;
  const nome = String(o.nome ?? '').trim();
  const cpf = String(o.cpf ?? '').replace(/\D/g, '');
  const telefone = String(o.telefone ?? '').replace(/\D/g, '');
  const email = String(o.email ?? '').trim();
  if (!nome || cpf.length !== 11 || !email.includes('@')) return null;
  return { nome, cpf, telefone, email };
}

export async function getSiteResponsavel(): Promise<SiteResponsavel> {
  const salvo = await getConfigApp<unknown>(CHAVE_SITE_RESPONSAVEL);
  return normalizarSiteResponsavel(salvo) ?? SITE_RESPONSAVEL_PADRAO;
}

export async function salvarSiteResponsavel(dados: SiteResponsavel): Promise<SiteResponsavel> {
  const norm = normalizarSiteResponsavel(dados);
  if (!norm) throw new Error('Dados do responsável inválidos.');
  await setConfigApp(CHAVE_SITE_RESPONSAVEL, norm);
  return norm;
}

export function formatarCpf(cpf: string): string {
  const d = cpf.replace(/\D/g, '');
  if (d.length !== 11) return cpf;
  return `${d.slice(0, 3)}.${d.slice(3, 6)}.${d.slice(6, 9)}-${d.slice(9)}`;
}

export function formatarTelefoneBr(tel: string): string {
  const d = tel.replace(/\D/g, '');
  if (d.length === 11) return `(${d.slice(0, 2)}) ${d.slice(2, 7)}-${d.slice(7)}`;
  if (d.length === 10) return `(${d.slice(0, 2)}) ${d.slice(2, 6)}-${d.slice(6)}`;
  return tel;
}
