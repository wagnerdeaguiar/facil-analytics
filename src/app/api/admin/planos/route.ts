export { dynamic } from '@/lib/route-config';

import { NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/api-auth';
import { prisma } from '@/lib/db';
import {
  atualizarPlano,
  criarPlano,
  listarTodosPlanos,
  normalizarPlanoInput,
  parsePlanLimits,
  seedPlanosPadrao,
} from '@/lib/billing/plan-service';

export async function GET() {
  const auth = await requireAdmin();
  if (auth.response) return auth.response;

  let planos = await listarTodosPlanos();
  if (!planos.length) {
    await seedPlanosPadrao();
    planos = await listarTodosPlanos();
  }
  return NextResponse.json({ planos });
}

export async function POST(request: Request) {
  const auth = await requireAdmin();
  if (auth.response) return auth.response;

  try {
    const body = await request.json();
    const input = normalizarPlanoInput(body);
    if (!input) {
      return NextResponse.json({ error: 'Dados do plano inválidos.' }, { status: 400 });
    }

    const existente = await prisma.plano.findUnique({ where: { slug: input.slug } });
    if (existente) {
      return NextResponse.json({ error: 'Slug já existe.' }, { status: 409 });
    }

    const plano = await criarPlano(input);

    await prisma.auditLog.create({
      data: {
        userId: auth.session.user.id,
        eventType: 'admin_plano_create',
        description: `Plano ${plano.nome} criado`,
        metadata: { planoId: plano.id, slug: plano.slug },
      },
    });

    return NextResponse.json({ plano });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: 'Erro ao criar plano.' }, { status: 500 });
  }
}

export async function PATCH(request: Request) {
  const auth = await requireAdmin();
  if (auth.response) return auth.response;

  try {
    const body = await request.json();
    const id = body.id as string;
    if (!id) return NextResponse.json({ error: 'id obrigatório' }, { status: 400 });

    const limites = body.limites ? parsePlanLimits(body.limites) : undefined;
    const plano = await atualizarPlano(id, {
      nome: body.nome,
      descricao: body.descricao,
      valor: body.valor != null ? Number(body.valor) : undefined,
      periodicidade: body.periodicidade,
      limites: limites ?? undefined,
      recursos: Array.isArray(body.recursos) ? body.recursos.map(String) : undefined,
      ordem: body.ordem != null ? Number(body.ordem) : undefined,
      ativo: body.ativo,
      destaque: body.destaque,
    });

    await prisma.auditLog.create({
      data: {
        userId: auth.session.user.id,
        eventType: 'admin_plano_update',
        description: `Plano ${plano.nome} atualizado`,
        metadata: { planoId: plano.id },
      },
    });

    return NextResponse.json({ plano });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: 'Erro ao atualizar plano.' }, { status: 500 });
  }
}
