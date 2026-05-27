import { prisma } from '@/lib/db';
import { isPremiumStatus } from '@/lib/subscription';
import type { SubscriptionStatus } from './types';

export interface SyncAccessInput {
  userId: string;
  status: SubscriptionStatus;
  planoSlug?: string;
  planoId?: string | null;
  valor?: number;
  periodicidade?: string;
  gateway?: string;
  gatewayCustomerId?: string;
  gatewaySubscriptionId?: string | null;
  dataInicio?: Date;
  dataRenovacao?: Date;
  currentPeriodEnd?: Date;
  dataCancelamento?: Date | null;
  gracePeriodUntil?: Date | null;
}

/** Atualiza Subscription + User.subscriptionStatus de forma consistente. */
export async function syncSubscriptionAccess(input: SyncAccessInput) {
  const {
    userId,
    status,
    planoSlug = status === 'free' ? 'free' : 'premium',
    planoId,
    valor,
    periodicidade,
    gateway,
    gatewayCustomerId,
    gatewaySubscriptionId,
    dataInicio,
    dataRenovacao,
    currentPeriodEnd,
    dataCancelamento,
    gracePeriodUntil,
  } = input;

  await prisma.subscription.upsert({
    where: { userId },
    create: {
      userId,
      status,
      plano: planoSlug,
      planoId: planoId ?? null,
      valor: valor ?? 0,
      periodicidade: periodicidade ?? 'none',
      gateway,
      gatewayCustomerId,
      gatewaySubscriptionId,
      dataInicio,
      dataRenovacao,
      currentPeriodEnd,
      dataCancelamento,
      gracePeriodUntil,
    },
    update: {
      status,
      plano: planoSlug,
      ...(planoId !== undefined ? { planoId } : {}),
      ...(valor !== undefined ? { valor } : {}),
      ...(periodicidade !== undefined ? { periodicidade } : {}),
      ...(gateway !== undefined ? { gateway } : {}),
      ...(gatewayCustomerId !== undefined ? { gatewayCustomerId } : {}),
      ...(gatewaySubscriptionId !== undefined ? { gatewaySubscriptionId } : {}),
      ...(dataInicio !== undefined ? { dataInicio } : {}),
      ...(dataRenovacao !== undefined ? { dataRenovacao } : {}),
      ...(currentPeriodEnd !== undefined ? { currentPeriodEnd } : {}),
      ...(dataCancelamento !== undefined ? { dataCancelamento } : {}),
      ...(gracePeriodUntil !== undefined ? { gracePeriodUntil } : {}),
    },
  });

  await prisma.user.update({
    where: { id: userId },
    data: { subscriptionStatus: status },
  });

  return { status, premium: isPremiumStatus(status) };
}

/** Rebaixa para free quando assinatura expirou ou está inadimplente. */
export async function lockUserToFree(userId: string, reason: string) {
  const result = await syncSubscriptionAccess({
    userId,
    status: 'free',
    planoSlug: 'free',
    planoId: null,
    valor: 0,
    periodicidade: 'none',
    gatewaySubscriptionId: null,
    dataCancelamento: new Date(),
    gracePeriodUntil: null,
  });

  await prisma.subscription.update({
    where: { userId },
    data: { planoId: null, gatewaySubscriptionId: null },
  });

  await prisma.auditLog.create({
    data: {
      userId,
      eventType: 'subscription_locked',
      description: reason,
    },
  });

  return result;
}

/** Libera premium após pagamento confirmado. */
export async function unlockUserPremium(
  userId: string,
  opts: {
    planoSlug: string;
    planoId?: string;
    valor: number;
    periodicidade: string;
    gateway: string;
    gatewayCustomerId?: string;
    gatewaySubscriptionId?: string;
    dataRenovacao?: Date;
    currentPeriodEnd?: Date;
  },
) {
  const result = await syncSubscriptionAccess({
    userId,
    status: 'active',
    planoSlug: opts.planoSlug,
    planoId: opts.planoId,
    valor: opts.valor,
    periodicidade: opts.periodicidade,
    gateway: opts.gateway,
    gatewayCustomerId: opts.gatewayCustomerId,
    gatewaySubscriptionId: opts.gatewaySubscriptionId,
    dataInicio: new Date(),
    dataRenovacao: opts.dataRenovacao,
    currentPeriodEnd: opts.currentPeriodEnd ?? opts.dataRenovacao,
    dataCancelamento: null,
  });

  await prisma.auditLog.create({
    data: {
      userId,
      eventType: 'payment_approved',
      description: `Plano ${opts.planoSlug} ativado`,
      metadata: { gateway: opts.gateway, valor: opts.valor },
    },
  });

  return result;
}
