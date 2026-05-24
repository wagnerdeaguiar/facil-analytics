export { dynamic } from '@/lib/route-config';

import { NextResponse } from 'next/server';
import { requireSession } from '@/lib/api-auth';
import { prisma } from '@/lib/db';
import { listarPagamentosUsuario } from '@/lib/billing/faturamento-service';
import { resolvePlanLimitsForUser } from '@/lib/billing/plan-service';
import { syncAsaasCustomerForUser } from '@/lib/billing/sync-customer';
import { isPremiumStatus } from '@/lib/subscription';

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
