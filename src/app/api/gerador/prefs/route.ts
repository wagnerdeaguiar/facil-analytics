export { dynamic } from '@/lib/route-config';

import { NextResponse } from 'next/server';
import { requireSession } from '@/lib/api-auth';
import { prisma } from '@/lib/db';
import { getGeradorPrefsUsuario, normalizarGeradorPrefs, saveGeradorPrefsUsuario } from '@/lib/gerador-prefs';

export async function GET() {
  try {
    const auth = await requireSession();
    if (auth.response) return auth.response;

    const prefs = await getGeradorPrefsUsuario(auth.session.user.id);
    return NextResponse.json({ prefs });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: 'Erro ao carregar parâmetros.' }, { status: 500 });
  }
}

export async function PUT(request: Request) {
  try {
    const auth = await requireSession();
    if (auth.response) return auth.response;

    const body = await request.json();
    if (body && typeof body === 'object' && 'userId' in body) {
      return NextResponse.json({ error: 'Parâmetros inválidos.' }, { status: 400 });
    }
    const prefs = normalizarGeradorPrefs(body);
    if (!prefs) {
      return NextResponse.json({ error: 'Parâmetros inválidos.' }, { status: 400 });
    }

    const saved = await saveGeradorPrefsUsuario(auth.session.user.id, prefs);
    await prisma.auditLog.create({
      data: {
        userId: auth.session.user.id,
        eventType: 'gerador_prefs_save',
        description: 'Parâmetros do gerador atualizados',
      },
    });
    return NextResponse.json({ ok: true, prefs: saved });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: 'Erro ao salvar parâmetros.' }, { status: 500 });
  }
}
