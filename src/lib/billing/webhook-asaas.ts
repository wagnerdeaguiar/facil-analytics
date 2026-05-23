import { prisma } from '@/lib/db';
import {
  buscarPagamentoAsaas,
  cancelarAssinaturaAsaas,
  mapAsaasMetodo,
  mapAsaasPaymentStatus,
} from './asaas-client';
import { getPlanoById } from './plan-service';
import { lockUserToFree, syncSubscriptionAccess, unlockUserPremium } from './sync-access';
import { parseExternalReference } from './checkout';

interface AsaasWebhookPayload {
  id?: string;
  event?: string;
  payment?: {
    id: string;
    customer: string;
    subscription?: string;
    value: number;
    status: string;
    billingType?: string;
    dueDate?: string;
    confirmedDate?: string;
    paymentDate?: string;
    invoiceUrl?: string;
    bankSlipUrl?: string;
    externalReference?: string;
  };
  subscription?: {
    id: string;
    customer: string;
    status?: string;
    value?: number;
    nextDueDate?: string;
    externalReference?: string;
  };
}

function addMonths(date: Date, months = 1) {
  const d = new Date(date);
  d.setMonth(d.getMonth() + months);
  return d;
}

async function findUserByGateway(customerId: string, externalReference?: string) {
  const ref = parseExternalReference(externalReference);
  if (ref?.userId) {
    const u = await prisma.user.findUnique({ where: { id: ref.userId } });
    if (u) return u;
  }

  const sub = await prisma.subscription.findFirst({
    where: { gatewayCustomerId: customerId },
    include: { user: true },
  });
  return sub?.user ?? null;
}

async function upsertPaymentFromAsaas(
  userId: string,
  payment: NonNullable<AsaasWebhookPayload['payment']>,
  planoId?: string,
) {
  const status = mapAsaasPaymentStatus(payment.status);
  const sub = await prisma.subscription.findUnique({ where: { userId } });

  return prisma.payment.upsert({
    where: { gatewayPaymentId: payment.id },
    create: {
      userId,
      subscriptionId: sub?.id,
      planoId: planoId ?? sub?.planoId ?? undefined,
      gateway: 'asaas',
      gatewayPaymentId: payment.id,
      valor: payment.value,
      status,
      metodo: mapAsaasMetodo(payment.billingType),
      dueDate: payment.dueDate ? new Date(payment.dueDate) : undefined,
      paidAt: payment.paymentDate ? new Date(payment.paymentDate) : undefined,
      gatewayInvoiceUrl: payment.invoiceUrl,
      gatewayBankSlipUrl: payment.bankSlipUrl,
    },
    update: {
      status,
      metodo: mapAsaasMetodo(payment.billingType),
      paidAt: payment.paymentDate ? new Date(payment.paymentDate) : undefined,
      gatewayInvoiceUrl: payment.invoiceUrl,
      gatewayBankSlipUrl: payment.bankSlipUrl,
    },
  });
}

async function handlePaymentConfirmed(userId: string, payment: NonNullable<AsaasWebhookPayload['payment']>) {
  const ref = parseExternalReference(payment.externalReference);
  const sub = await prisma.subscription.findUnique({ where: { userId } });
  const planoId = ref?.planoId ?? sub?.planoId ?? undefined;
  const plano = planoId ? await getPlanoById(planoId) : null;

  await upsertPaymentFromAsaas(userId, payment, planoId);

  const renovacao = payment.dueDate ? addMonths(new Date(payment.dueDate), 1) : addMonths(new Date());

  await unlockUserPremium(userId, {
    planoSlug: plano?.slug ?? sub?.plano ?? 'premium',
    planoId: plano?.id ?? planoId,
    valor: payment.value,
    periodicidade: plano?.periodicidade ?? sub?.periodicidade ?? 'monthly',
    gateway: 'asaas',
    gatewayCustomerId: sub?.gatewayCustomerId ?? payment.customer,
    gatewaySubscriptionId: sub?.gatewaySubscriptionId ?? payment.subscription,
    dataRenovacao: renovacao,
    currentPeriodEnd: renovacao,
  });
}

async function handlePaymentOverdue(userId: string, payment: NonNullable<AsaasWebhookPayload['payment']>) {
  await upsertPaymentFromAsaas(userId, payment);
  await syncSubscriptionAccess({
    userId,
    status: 'past_due',
    planoSlug: 'premium',
  });
  await prisma.auditLog.create({
    data: {
      userId,
      eventType: 'payment_overdue',
      description: 'Mensalidade em atraso — acesso premium bloqueado',
      metadata: { paymentId: payment.id },
    },
  });
}

async function handlePaymentReceived(userId: string, payment: NonNullable<AsaasWebhookPayload['payment']>) {
  await upsertPaymentFromAsaas(userId, payment);
  await prisma.payment.updateMany({
    where: { gatewayPaymentId: payment.id },
    data: {
      status: 'received',
      paidAt: payment.paymentDate ? new Date(payment.paymentDate) : new Date(),
    },
  });
}

async function handleSubscriptionDeleted(userId: string) {
  const sub = await prisma.subscription.findUnique({ where: { userId } });
  if (sub?.gatewaySubscriptionId) {
    try {
      await cancelarAssinaturaAsaas(sub.gatewaySubscriptionId);
    } catch {
      /* já cancelada no Asaas */
    }
  }
  await lockUserToFree(userId, 'Assinatura cancelada ou removida');
}

export async function handleAsaasWebhook(rawBody: string, accessToken: string | null) {
  const expected = process.env.ASAAS_WEBHOOK_TOKEN;
  if (expected && accessToken !== expected) {
    throw new Error('Token de webhook Asaas inválido.');
  }

  const payload = JSON.parse(rawBody) as AsaasWebhookPayload;
  const eventType = payload.event ?? 'UNKNOWN';
  const eventId = payload.id ?? `${eventType}-${payload.payment?.id ?? payload.subscription?.id ?? Date.now()}`;

  const existing = await prisma.billingEvent.findUnique({
    where: { gatewayEventId: eventId },
  });
  if (existing) return { duplicate: true, eventType };

  let userId: string | undefined;

  if (payload.payment) {
    let payment = payload.payment;
    try {
      payment = await buscarPagamentoAsaas(payment.id);
    } catch {
      /* usa payload do webhook */
    }

    const user = await findUserByGateway(payment.customer, payment.externalReference);
    if (!user) {
      await prisma.billingEvent.create({
        data: {
          gateway: 'asaas',
          gatewayEventId: eventId,
          eventType,
          payload: payload as object,
        },
      });
      return { processed: false, reason: 'user_not_found', eventType };
    }
    userId = user.id;

    switch (eventType) {
      case 'PAYMENT_CONFIRMED':
      case 'PAYMENT_RECEIVED':
        if (eventType === 'PAYMENT_CONFIRMED') {
          await handlePaymentConfirmed(user.id, payment);
        } else {
          await handlePaymentReceived(user.id, payment);
          if (['RECEIVED', 'CONFIRMED'].includes(payment.status)) {
            await handlePaymentConfirmed(user.id, payment);
          }
        }
        break;
      case 'PAYMENT_OVERDUE':
        await handlePaymentOverdue(user.id, payment);
        break;
      case 'PAYMENT_DELETED':
      case 'PAYMENT_REFUNDED':
        await upsertPaymentFromAsaas(user.id, payment);
        await lockUserToFree(user.id, `Cobrança ${eventType}`);
        break;
      default:
        await upsertPaymentFromAsaas(user.id, payment);
    }
  }

  if (payload.subscription) {
    const subPayload = payload.subscription;
    const user = await findUserByGateway(subPayload.customer, subPayload.externalReference);
    if (user) {
      userId = user.id;
      if (eventType === 'SUBSCRIPTION_DELETED' || eventType === 'SUBSCRIPTION_INACTIVATED') {
        await handleSubscriptionDeleted(user.id);
      } else if (eventType === 'SUBSCRIPTION_UPDATED' && subPayload.nextDueDate) {
        await prisma.subscription.update({
          where: { userId: user.id },
          data: {
            dataRenovacao: new Date(subPayload.nextDueDate),
            currentPeriodEnd: new Date(subPayload.nextDueDate),
          },
        });
      }
    }
  }

  await prisma.billingEvent.create({
    data: {
      gateway: 'asaas',
      gatewayEventId: eventId,
      eventType,
      payload: payload as object,
      userId,
    },
  });

  return { processed: true, eventType, userId };
}
