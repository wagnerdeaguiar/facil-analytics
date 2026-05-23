import { prisma } from '@/lib/db';
import { cancelarAssinaturaAsaas, isAsaasConfigured } from './asaas-client';
import { lockUserToFree, syncSubscriptionAccess } from './sync-access';

export async function cancelExistingAsaasSubscription(userId: string) {
  const sub = await prisma.subscription.findUnique({ where: { userId } });
  if (!sub?.gatewaySubscriptionId || sub.gateway !== 'asaas') return;

  if (!isAsaasConfigured()) return;

  try {
    await cancelarAssinaturaAsaas(sub.gatewaySubscriptionId);
  } catch {
    /* assinatura pode já estar cancelada no gateway */
  }

  await prisma.subscription.update({
    where: { userId },
    data: { gatewaySubscriptionId: null },
  });
}

export interface CancelSubscriptionResult {
  mantemPremium: boolean;
  acessoAte: Date | null;
  message: string;
}

/** Cancela assinatura paga e rebaixa para gratuito (mantém premium até fim do período já pago). */
export async function cancelUserSubscription(userId: string): Promise<CancelSubscriptionResult> {
  const sub = await prisma.subscription.findUnique({ where: { userId } });
  if (!sub) throw new Error('Assinatura não encontrada.');

  const jaGratuito =
    sub.status === 'free' || sub.plano === 'free' || (!sub.planoId && sub.valor <= 0);

  if (jaGratuito) {
    throw new Error('Você já está no plano gratuito.');
  }

  await cancelExistingAsaasSubscription(userId);

  const now = new Date();
  const fim = sub.currentPeriodEnd ?? sub.dataRenovacao;
  const mantemPremium =
    Boolean(fim && fim > now) && (sub.status === 'active' || sub.status === 'trial');

  if (mantemPremium && fim) {
    await syncSubscriptionAccess({
      userId,
      status: 'active',
      planoSlug: sub.plano,
      planoId: sub.planoId ?? undefined,
      valor: sub.valor,
      periodicidade: sub.periodicidade,
      gateway: sub.gateway ?? undefined,
      gatewayCustomerId: sub.gatewayCustomerId ?? undefined,
      gatewaySubscriptionId: undefined,
      dataCancelamento: now,
      currentPeriodEnd: fim,
      dataRenovacao: fim,
    });

    await prisma.auditLog.create({
      data: {
        userId,
        eventType: 'subscription_canceled',
        description: `Cancelamento solicitado — acesso premium até ${fim.toISOString()}`,
      },
    });

    return {
      mantemPremium: true,
      acessoAte: fim,
      message: `Assinatura cancelada. Seu acesso premium continua até ${fim.toLocaleDateString('pt-BR')}. Depois disso, você volta ao plano gratuito automaticamente.`,
    };
  }

  await lockUserToFree(userId, 'Cancelamento solicitado pelo usuário');

  await prisma.auditLog.create({
    data: {
      userId,
      eventType: 'subscription_canceled',
      description: 'Cancelamento imediato — plano gratuito',
    },
  });

  return {
    mantemPremium: false,
    acessoAte: null,
    message: 'Assinatura cancelada. Você está no plano gratuito.',
  };
}
