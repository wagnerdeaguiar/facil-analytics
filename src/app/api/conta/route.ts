export { dynamic } from '@/lib/route-config';

import { NextResponse } from 'next/server';
import { requireSession } from '@/lib/api-auth';
import { prisma } from '@/lib/db';
import { listarPagamentosUsuario } from '@/lib/billing/faturamento-service';
import { resolvePlanLimitsForUser } from '@/lib/billing/plan-service';
import { syncAsaasCustomerForUser } from '@/lib/billing/sync-customer';
import { cancelExistingAsaasSubscription } from '@/lib/billing/subscription-change';
import { isPremiumStatus } from '@/lib/subscription';
import { cpfValido } from '@/lib/cpf';

export async function GET() {
  const auth = await requireSession();
  if (auth.response) return auth.response;
  const session = auth.session;

  const [user, sub, pagamentos, limites] = await Promise.all([
    prisma.user.findUnique({
      where: { id: session.user.id },
      select: { cpf: true, telefone: true, subscriptionStatus: true },
    }),
    prisma.subscription.findUnique({
      where: { userId: session.user.id },
      include: { planoRef: true },
    }),
    listarPagamentosUsuario(session.user.id),
    resolvePlanLimitsForUser(session.user.id, session.user.subscriptionStatus),
  ]);

  return NextResponse.json({
    cpf: user?.cpf ?? '',
    telefone: user?.telefone ?? '',
    status: sub?.status ?? session.user.subscriptionStatus ?? 'free',
    plano: sub?.planoRef?.nome ?? sub?.plano ?? 'free',
    planoSlug: sub?.plano ?? 'free',
    planoId: sub?.planoId ?? null,
    premium: isPremiumStatus(session.user.subscriptionStatus),
    dataInicio: sub?.dataInicio,
    dataRenovacao: sub?.dataRenovacao ?? sub?.currentPeriodEnd,
    dataCancelamento: sub?.dataCancelamento,
    acessoPremiumAte:
      sub?.dataCancelamento && sub?.currentPeriodEnd && sub.currentPeriodEnd > new Date()
        ? sub.currentPeriodEnd
        : null,
    valor: sub?.valor,
    gateway: sub?.gateway,
    limites,
    pagamentos,
    cobrancaPendente: pagamentos.find((p) => ['pending', 'overdue'].includes(p.status)),
  });
}

export async function PATCH(request: Request) {
  const auth = await requireSession();
  if (auth.response) return auth.response;
  const session = auth.session;

  const body = await request.json();
  const cpf = body.cpf ? String(body.cpf).replace(/\D/g, '') : undefined;
  const telefone = body.telefone ? String(body.telefone).replace(/\D/g, '') : undefined;

  if (cpf && cpf.length !== 11) {
    return NextResponse.json({ error: 'CPF deve ter 11 dígitos.' }, { status: 400 });
  }
  if (cpf && !cpfValido(cpf)) {
    return NextResponse.json({ error: 'CPF inválido. Verifique os números.' }, { status: 400 });
  }

  const user = await prisma.user.update({
    where: { id: session.user.id },
    data: {
      ...(cpf !== undefined ? { cpf } : {}),
      ...(telefone !== undefined ? { telefone } : {}),
    },
    select: { cpf: true, telefone: true },
  });

  await syncAsaasCustomerForUser(session.user.id).catch(() => {});

  await prisma.auditLog.create({
    data: {
      userId: session.user.id,
      eventType: 'conta_update',
      description: 'Dados da conta atualizados',
    },
  });

  return NextResponse.json({ ok: true, cpf: user.cpf, telefone: user.telefone });
}

/** Exclusão de conta (LGPD). Corpo: { "confirm": "EXCLUIR" } */
export async function DELETE(request: Request) {
  const auth = await requireSession();
  if (auth.response) return auth.response;
  const session = auth.session;

  if (session.user.role === 'admin') {
    return NextResponse.json(
      { error: 'Conta administrador não pode ser excluída por este fluxo.' },
      { status: 403 },
    );
  }

  const body = await request.json().catch(() => ({}));
  if (body.confirm !== 'EXCLUIR') {
    return NextResponse.json(
      { error: 'Confirme a exclusão enviando { "confirm": "EXCLUIR" } no corpo da requisição.' },
      { status: 400 },
    );
  }

  const userId = session.user.id;

  await cancelExistingAsaasSubscription(userId).catch(() => {});

  await prisma.auditLog.create({
    data: {
      userId,
      eventType: 'account_deleted',
      description: 'Exclusão de conta solicitada pelo titular (LGPD)',
    },
  });

  await prisma.user.delete({ where: { id: userId } });

  return NextResponse.json({ ok: true, message: 'Conta e dados associados foram excluídos.' });
}
