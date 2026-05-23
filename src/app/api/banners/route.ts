import { NextResponse } from 'next/server';
import {
  enrichBannersComPlanos,
  getBannersAtivos,
  getPaginasCampanhaAtivas,
  resolverUrlBanner,
} from '@/lib/site-banners';

export async function GET() {
  const [bannersRaw, paginas] = await Promise.all([getBannersAtivos(), getPaginasCampanhaAtivas()]);
  const banners = await enrichBannersComPlanos(bannersRaw);

  return NextResponse.json({
    banners: banners.map((b) => ({
      ...b,
      href: resolverUrlBanner(b),
      externo: b.destinoTipo === 'externo',
    })),
    paginas: paginas.map((p) => ({ slug: p.slug, titulo: p.titulo, resumo: p.resumo })),
  });
}
