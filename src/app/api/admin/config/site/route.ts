import { NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/api-auth';
import { prisma } from '@/lib/db';
import {
  getSiteResponsavel,
  normalizarSiteResponsavel,
  salvarSiteResponsavel,
  SITE_RESPONSAVEL_PADRAO,
  formatarCpf,
  formatarTelefoneBr,
} from '@/lib/site-config';

export async function GET() {
  const auth = await requireAdmin();
  if (auth.response) return auth.response;

  const responsavel = await getSiteResponsavel();
  return NextResponse.json({
    responsavel,
    padrao: SITE_RESPONSAVEL_PADRAO,
    formatado: {
      cpf: formatarCpf(responsavel.cpf),
      telefone: formatarTelefoneBr(responsavel.telefone),
    },
  });
}

export async function PATCH(request: Request) {
  const auth = await requireAdmin();
  if (auth.response) return auth.response;

  try {
    const body = await request.json();
    const norm = normalizarSiteResponsavel(body.responsavel ?? body);
    if (!norm) {
      return NextResponse.json({ error: 'Nome, CPF (11 dígitos) e e-mail válidos são obrigatórios.' }, { status: 400 });
    }

    const responsavel = await salvarSiteResponsavel(norm);

    await prisma.auditLog.create({
      data: {
        userId: auth.session.user.id,
        eventType: 'admin_config_site',
        description: 'Dados do responsável pela plataforma atualizados',
        metadata: { email: responsavel.email },
      },
    });

    return NextResponse.json({ ok: true, responsavel });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: 'Erro ao salvar configurações.' }, { status: 500 });
  }
}
