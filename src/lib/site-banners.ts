import { getConfigApp, setConfigApp } from '@/lib/services/config-app';
import { formatarValorPlano, sufixoPeriodicidadePlano } from '@/lib/planos-copy';
import { getPlanosAtivos } from '@/lib/billing/plan-service';

export const CHAVE_BANNERS = 'banners_publicidade';
export const CHAVE_PAGINAS_CAMPANHA = 'paginas_campanha';

export type BannerVariant = 'brand' | 'amber' | 'emerald' | 'violet';
export type BannerDestinoTipo = 'interno' | 'campanha' | 'externo';
export type BannerIcon =
  | 'sparkles'
  | 'crown'
  | 'chart'
  | 'target'
  | 'shield'
  | 'zap'
  | 'gift'
  | 'trending'
  | 'users';

export interface BannerPublicidade {
  id: string;
  titulo: string;
  /** Texto curto abaixo do título (legado) */
  subtitulo?: string;
  /** Parágrafo descritivo no card */
  descricao?: string;
  /** Texto do link inline (ex: Saiba mais) */
  linkSaibaMais?: string;
  ctaTexto: string;
  destinoTipo: BannerDestinoTipo;
  /** Path interno (/precos), slug de campanha ou URL https */
  destino: string;
  ativo: boolean;
  ordem: number;
  variant?: BannerVariant;
  icone?: BannerIcon;
  precoRotulo?: string;
  precoValor?: string;
  precoSufixo?: string;
  precoObs?: string;
  /** Se informado, preço exibido vem do plano cadastrado no admin (ignora precoValor manual). */
  planoSlug?: string;
}

export interface PaginaCampanha {
  slug: string;
  titulo: string;
  resumo?: string;
  corpo: string;
  ctaTexto?: string;
  ctaUrl?: string;
  ativo: boolean;
}

const MAX_BANNERS = 3;

const ICONES_VALIDOS: BannerIcon[] = [
  'sparkles',
  'crown',
  'chart',
  'target',
  'shield',
  'zap',
  'gift',
  'trending',
  'users',
];

function slugValido(slug: string): boolean {
  return /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug);
}

function parseBanner(raw: unknown): BannerPublicidade | null {
  if (!raw || typeof raw !== 'object') return null;
  const o = raw as Record<string, unknown>;
  const id = String(o.id ?? '').trim();
  const titulo = String(o.titulo ?? '').trim();
  const ctaTexto = String(o.ctaTexto ?? '').trim();
  const destinoTipo = String(o.destinoTipo ?? '') as BannerDestinoTipo;
  const destino = String(o.destino ?? '').trim();
  if (!id || !titulo || !ctaTexto || !destino) return null;
  if (!['interno', 'campanha', 'externo'].includes(destinoTipo)) return null;
  if (destinoTipo === 'externo' && !destino.startsWith('https://')) return null;
  if (destinoTipo === 'interno' && !destino.startsWith('/')) return null;
  if (destinoTipo === 'campanha' && !slugValido(destino)) return null;
  const variant = String(o.variant ?? 'brand') as BannerVariant;
  const iconeRaw = String(o.icone ?? 'sparkles') as BannerIcon;
  return {
    id,
    titulo,
    subtitulo: o.subtitulo ? String(o.subtitulo).trim() : undefined,
    descricao: o.descricao ? String(o.descricao).trim() : undefined,
    linkSaibaMais: o.linkSaibaMais ? String(o.linkSaibaMais).trim() : undefined,
    ctaTexto,
    destinoTipo,
    destino,
    ativo: o.ativo !== false,
    ordem: Number(o.ordem) || 0,
    variant: ['brand', 'amber', 'emerald', 'violet'].includes(variant) ? variant : 'brand',
    icone: ICONES_VALIDOS.includes(iconeRaw) ? iconeRaw : 'sparkles',
    precoRotulo: o.precoRotulo ? String(o.precoRotulo).trim() : undefined,
    precoValor: o.precoValor ? String(o.precoValor).trim() : undefined,
    precoSufixo: o.precoSufixo ? String(o.precoSufixo).trim() : undefined,
    precoObs: o.precoObs ? String(o.precoObs).trim() : undefined,
    planoSlug: o.planoSlug ? String(o.planoSlug).trim().toLowerCase() : undefined,
  };
}

function parsePagina(raw: unknown): PaginaCampanha | null {
  if (!raw || typeof raw !== 'object') return null;
  const o = raw as Record<string, unknown>;
  const slug = String(o.slug ?? '').trim().toLowerCase();
  const titulo = String(o.titulo ?? '').trim();
  const corpo = String(o.corpo ?? '').trim();
  if (!slugValido(slug) || !titulo || !corpo) return null;
  const ctaUrl = o.ctaUrl ? String(o.ctaUrl).trim() : undefined;
  if (ctaUrl && !ctaUrl.startsWith('/') && !ctaUrl.startsWith('https://')) return null;
  return {
    slug,
    titulo,
    resumo: o.resumo ? String(o.resumo).trim() : undefined,
    corpo,
    ctaTexto: o.ctaTexto ? String(o.ctaTexto).trim() : undefined,
    ctaUrl,
    ativo: o.ativo !== false,
  };
}

export function normalizarBanners(raw: unknown): BannerPublicidade[] {
  if (!Array.isArray(raw)) return [];
  return raw.map(parseBanner).filter((b): b is BannerPublicidade => b !== null);
}

export function normalizarPaginasCampanha(raw: unknown): PaginaCampanha[] {
  if (!Array.isArray(raw)) return [];
  return raw.map(parsePagina).filter((p): p is PaginaCampanha => p !== null);
}

export function resolverUrlBanner(banner: BannerPublicidade): string {
  switch (banner.destinoTipo) {
    case 'campanha':
      return `/campanha/${banner.destino}`;
    case 'externo':
      return banner.destino;
    default:
      return banner.destino;
  }
}

export async function getBannersAtivos(): Promise<BannerPublicidade[]> {
  const salvo = await getConfigApp<unknown>(CHAVE_BANNERS);
  return normalizarBanners(salvo)
    .filter((b) => b.ativo)
    .sort((a, b) => a.ordem - b.ordem)
    .slice(0, MAX_BANNERS);
}

export async function getTodosBanners(): Promise<BannerPublicidade[]> {
  const salvo = await getConfigApp<unknown>(CHAVE_BANNERS);
  return normalizarBanners(salvo).sort((a, b) => a.ordem - b.ordem);
}

export async function salvarBanners(banners: BannerPublicidade[]): Promise<BannerPublicidade[]> {
  const norm = normalizarBanners(banners);
  if (norm.length > MAX_BANNERS + 4) {
    throw new Error(`Máximo de ${MAX_BANNERS + 4} banners no cadastro (${MAX_BANNERS} ativos na home).`);
  }
  await setConfigApp(CHAVE_BANNERS, norm);
  return norm;
}

export async function getPaginasCampanhaAtivas(): Promise<PaginaCampanha[]> {
  const salvo = await getConfigApp<unknown>(CHAVE_PAGINAS_CAMPANHA);
  return normalizarPaginasCampanha(salvo).filter((p) => p.ativo);
}

export async function getPaginaCampanhaPorSlug(slug: string): Promise<PaginaCampanha | null> {
  const paginas = await getPaginasCampanhaAtivas();
  return paginas.find((p) => p.slug === slug.toLowerCase()) ?? null;
}

export async function getTodasPaginasCampanha(): Promise<PaginaCampanha[]> {
  const salvo = await getConfigApp<unknown>(CHAVE_PAGINAS_CAMPANHA);
  return normalizarPaginasCampanha(salvo);
}

export async function salvarPaginasCampanha(paginas: PaginaCampanha[]): Promise<PaginaCampanha[]> {
  const norm = normalizarPaginasCampanha(paginas);
  const slugs = new Set<string>();
  for (const p of norm) {
    if (slugs.has(p.slug)) throw new Error(`Slug duplicado: ${p.slug}`);
    slugs.add(p.slug);
  }
  await setConfigApp(CHAVE_PAGINAS_CAMPANHA, norm);
  return norm;
}

export { MAX_BANNERS };

export async function enrichBannersComPlanos(banners: BannerPublicidade[]): Promise<BannerPublicidade[]> {
  const slugs = banners.map((b) => b.planoSlug).filter(Boolean) as string[];
  if (!slugs.length) return banners;

  const planos = await getPlanosAtivos();
  const porSlug = new Map(planos.map((p) => [p.slug, p]));

  return banners.map((b) => {
    if (!b.planoSlug) return b;
    const plano = porSlug.get(b.planoSlug);
    if (!plano || plano.valor <= 0) return b;
    return {
      ...b,
      precoValor: formatarValorPlano(plano.valor),
      precoSufixo: b.precoSufixo || sufixoPeriodicidadePlano(plano.periodicidade),
    };
  });
}

/** Modelos vazios para o admin preencher manualmente. */
export function criarModeloPaginaCampanha(): PaginaCampanha {
  return {
    slug: `campanha-${Date.now()}`,
    titulo: '',
    resumo: '',
    corpo: '',
    ativo: false,
  };
}

export function criarModeloBanner(ordem: number): BannerPublicidade {
  return {
    id: `banner-${Date.now()}`,
    titulo: '',
    descricao: '',
    linkSaibaMais: '',
    ctaTexto: '',
    destinoTipo: 'interno',
    destino: '/precos',
    ativo: false,
    ordem,
    variant: 'brand',
    icone: 'sparkles',
    precoRotulo: '',
    precoValor: '',
    precoSufixo: '',
    precoObs: '',
  };
}

/** Adiciona um banner e uma página em branco (inativos) para preenchimento no admin. */
export async function mergeModelosVaziosPublicidade(): Promise<{ paginasNovas: number; bannersNovos: number }> {
  const [existentesB, existentesP] = await Promise.all([getTodosBanners(), getTodasPaginasCampanha()]);

  const pagina = criarModeloPaginaCampanha();
  const banner = criarModeloBanner(existentesB.length);

  const paginas = [...existentesP, pagina];
  const banners = [...existentesB, banner];

  await salvarPaginasCampanha(paginas);
  await salvarBanners(banners);

  return { paginasNovas: 1, bannersNovos: 1 };
}
