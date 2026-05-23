import { NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/api-auth';
import { prisma } from '@/lib/db';
import {
  getTextosPlataforma,
  normalizarTextosPlataforma,
  salvarTextosPlataforma,
} from '@/lib/plataforma-textos';

export async function GET() {
  const auth = await requireAdmin();
  if (auth.response) return auth.response;

  const textos = await getTextosPlataforma();
  return NextResponse.json({ textos });
}

export async function PATCH(request: Request) {
  const auth = await requireAdmin();
  if (auth.response) return auth.response;

  try {
    const body = await request.json();
    const norm = normalizarTextosPlataforma(body.textos ?? body);
    const textos = await salvarTextosPlataforma(norm);

    await prisma.auditLog.create({
      data: {
        userId: auth.session.user.id,
        eventType: 'admin_textos_plataforma',
        description: 'Textos institucionais da plataforma atualizados',
      },
    });

    return NextResponse.json({ ok: true, textos });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: 'Erro ao salvar textos.' }, { status: 500 });
  }
}
