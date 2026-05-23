import { prisma } from '@/lib/db';
import { lockUserToFree } from './sync-access';

export interface ExpirarAssinaturasResult {
  verificadas: number;
  expiradas: number;
  mantidas: number;
  executadoEm: string;
  detalhes: { userId: string; email: string | null; motivo: string }[];
}

function periodoVencido(sub: {
  currentPeriodEnd: Date | null;
  dataRenovacao: Date | null;
  gracePeriodUntil: Date | null;
  status: string;
}): boolean {
  const now = new Date();

  if (sub.status === 'past_due') {
    if (sub.gracePeriodUntil && now <= sub.gracePeriodUntil) return false;
    return true;
  }

  const fim = sub.currentPeriodEnd ?? sub.dataRenovacao;
  if (!fim) return false;
  return fim < now;
}

function inicioPeriodo(sub: {
  currentPeriodEnd: Date | null;
  dataRenovacao: Date | null;
}): Date {
  if (sub.currentPeriodEnd) {
    const d = new Date(sub.currentPeriodEnd);
    d.setMonth(d.getMonth() - 1);
    return d;
  }
  if (sub.dataRenovacao) {
    const d = new Date(sub.dataRenovacao);
    d.setMonth(d.getMonth() - 1);
    return d;
  }
  return new Date(0);
}

/**
 * Job diário: rebaixa para free assinaturas vencidas sem pagamento confirmado no período.
 * Cobre active, pending e past_due (após carência).
 */
export async function expirarAssinaturasVencidas(): Promise<ExpirarAssinaturasResult> {
  const now = new Date();
  const detalhes: ExpirarAssinaturasResult['detalhes'] = [];
  let expiradas = 0;
  let mantidas = 0;

  const subs = await prisma.subscription.findMany({
    where: {
      OR: [
        {
          status: { in: ['active', 'past_due', 'pending'] },
          OR: [
            { currentPeriodEnd: { lt: now } },
            { dataRenovacao: { lt: now } },
            { status: 'past_due' },
            {
              status: 'pending',
              updatedAt: { lt: new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000) },
            },
          ],
        },
        {
          status: 'active',
          dataCancelamento: { not: null },
          OR: [{ currentPeriodEnd: { lt: now } }, { dataRenovacao: { lt: now } }],
        },
      ],
    },
    include: { user: { select: { id: true, email: true, subscriptionStatus: true } } },
  });

  for (const sub of subs) {
    if (!periodoVencido(sub)) {
      mantidas++;
      continue;
    }

    const desde = inicioPeriodo(sub);
    const pagamentoNoPeriodo = await prisma.payment.findFirst({
      where: {
        userId: sub.userId,
        status: { in: ['confirmed', 'received'] },
        OR: [
          { paidAt: { gte: desde } },
          {
            paidAt: null,
            updatedAt: { gte: desde },
            status: { in: ['confirmed', 'received'] },
          },
        ],
      },
      orderBy: { paidAt: 'desc' },
    });

    if (pagamentoNoPeriodo) {
      mantidas++;
      continue;
    }

    const motivo =
      sub.dataCancelamento && sub.status === 'active'
        ? 'Período pago encerrado após cancelamento solicitado'
        : sub.status === 'pending'
          ? 'Assinatura pendente expirada (sem pagamento inicial)'
          : sub.status === 'past_due'
            ? 'Inadimplência — período de carência encerrado'
            : 'Período encerrado sem renovação paga';

    await lockUserToFree(sub.userId, motivo);
    expiradas++;
    detalhes.push({ userId: sub.userId, email: sub.user.email, motivo });
  }

  if (expiradas > 0) {
    await prisma.auditLog.create({
      data: {
        eventType: 'cron_expirar_assinaturas',
        description: `Job diário: ${expiradas} assinatura(s) expirada(s)`,
        metadata: { expiradas, verificadas: subs.length, detalhes },
      },
    });
  }

  return {
    verificadas: subs.length,
    expiradas,
    mantidas,
    executadoEm: now.toISOString(),
    detalhes,
  };
}
