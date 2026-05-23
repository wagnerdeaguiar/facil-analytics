export { dynamic } from '@/lib/route-config';

import { NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/api-auth';
import { prisma } from '@/lib/db';
import {
  getTabelaAposta,
  normalizarTabelaAposta,
  salvarTabelaAposta,
  tabelaPorPrecoBase15,
  TABELA_APOSTA_PADRAO,
} from '@/lib/lotofacil/aposta-config';

export async function GET() {
  const auth = await requireAdmin();
  if (auth.response) return auth.response;

  const tabela = await getTabelaAposta();
  return NextResponse.json({ tabela, padrao: TABELA_APOSTA_PADRAO });
}

export async function PATCH(request: Request) {
  const auth = await requireAdmin();
  if (auth.response) return auth.response;

  try {
    const body = await request.json();
    let tabela;

    if (body.precoBase15 != null) {
      tabela = await salvarTabelaAposta(tabelaPorPrecoBase15(Number(body.precoBase15)));
    } else if (body.tabela) {
      const norm = normalizarTabelaAposta(body.tabela);
      if (!norm) {
        return NextResponse.json({ error: 'Tabela inválida. Informe preço e combinações para 15–20.' }, { status: 400 });
      }
      tabela = await salvarTabelaAposta(norm);
    } else {
      return NextResponse.json({ error: 'Envie tabela ou precoBase15.' }, { status: 400 });
    }

    await prisma.auditLog.create({
      data: {
        userId: auth.session.user.id,
        eventType: 'admin_config_apostas',
        description: 'Tabela de preços Lotofácil atualizada',
        metadata: { tabela },
      },
    });

    return NextResponse.json({ ok: true, tabela });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: e instanceof Error ? e.message : 'Erro ao salvar' }, { status: 500 });
  }
}
