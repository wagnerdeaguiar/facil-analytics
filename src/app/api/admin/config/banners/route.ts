export { dynamic } from '@/lib/route-config';

import { NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/api-auth';
import { prisma } from '@/lib/db';
import {
  getTodosBanners,
  getTodasPaginasCampanha,
  normalizarBanners,
  normalizarPaginasCampanha,
  salvarBanners,
  salvarPaginasCampanha,
  mergeModelosVaziosPublicidade,
} from '@/lib/site-banners';

export async function GET() {
  const auth = await requireAdmin();
  if (auth.response) return auth.response;

  const [banners, paginas] = await Promise.all([getTodosBanners(), getTodasPaginasCampanha()]);
  return NextResponse.json({ banners, paginas });
}

export async function PATCH(request: Request) {
  const auth = await requireAdmin();
  if (auth.response) return auth.response;

  try {
    const body = await request.json();

    if (body.banners) {
      const banners = normalizarBanners(body.banners);
      const saved = await salvarBanners(banners);
      await prisma.auditLog.create({
        data: {
          userId: auth.session.user.id,
          eventType: 'admin_banners_update',
          description: 'Banners de publicidade atualizados',
          metadata: { qtd: saved.length },
        },
      });
      return NextResponse.json({ ok: true, banners: saved });
    }

    if (body.paginas) {
      const paginas = normalizarPaginasCampanha(body.paginas);
      const saved = await salvarPaginasCampanha(paginas);
      await prisma.auditLog.create({
        data: {
          userId: auth.session.user.id,
          eventType: 'admin_paginas_campanha_update',
          description: 'Páginas de campanha atualizadas',
          metadata: { qtd: saved.length },
        },
      });
      return NextResponse.json({ ok: true, paginas: saved });
    }

    return NextResponse.json({ error: 'Envie banners ou paginas.' }, { status: 400 });
  } catch (e) {
    console.error(e);
    return NextResponse.json(
      { error: e instanceof Error ? e.message : 'Erro ao salvar publicidade.' },
      { status: 400 },
    );
  }
}

export async function POST(request: Request) {
  const auth = await requireAdmin();
  if (auth.response) return auth.response;

  try {
    const url = new URL(request.url);
    if (url.searchParams.get('acao') !== 'modelo-vazio') {
      return NextResponse.json({ error: 'Use ?acao=modelo-vazio' }, { status: 400 });
    }

    const { paginasNovas, bannersNovos } = await mergeModelosVaziosPublicidade();
    const [banners, paginas] = await Promise.all([getTodosBanners(), getTodasPaginasCampanha()]);

    await prisma.auditLog.create({
      data: {
        userId: auth.session.user.id,
        eventType: 'admin_publicidade_modelo',
        description: 'Modelo vazio de publicidade adicionado',
        metadata: { paginasNovas, bannersNovos },
      },
    });

    return NextResponse.json({
      ok: true,
      paginasNovas,
      bannersNovos,
      banners,
      paginas,
      message: `Adicionados ${bannersNovos} banner(s) e ${paginasNovas} página(s) em branco para você preencher.`,
    });
  } catch (e) {
    console.error(e);
    return NextResponse.json(
      { error: e instanceof Error ? e.message : 'Erro ao carregar exemplos.' },
      { status: 400 },
    );
  }
}
