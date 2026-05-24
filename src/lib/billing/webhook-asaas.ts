import { prisma } from '@/lib/db';
import {
  buscarPagamentoAsaas,
  cancelarAssinaturaAsaas,
} from './asaas-client';
import { lockUserToFree, syncSubscriptionAccess } from './sync-access';
import { parseExternalReference } from './checkout';
import {
  activatePremiumFromAsaasPayment,
  isAsaasPaymentPaid,
  salvarPagamentoAsaasLocal,
} from './payment-activation';

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

async function handlePaymentConfirmed(userId: string, payment: NonNullable<AsaasWebhookPayload['payment']>) {
  await activatePremiumFromAsaasPayment(userId, payment);
}

async function handlePaymentOverdue(userId: string, payment: NonNullable<AsaasWebhookPayload['payment']>) {
  await salvarPagamentoAsaasLocal(userId, payment);
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
  await salvarPagamentoAsaasLocal(userId, payment);
  if (isAsaasPaymentPaid(payment.status)) {
    await activatePremiumFromAsaasPayment(userId, payment);
  }
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
  const expected = process.env.ASAAS_WEBHOOK_TOKEN?.trim();
  if (process.env.ASAAS_ENV === 'production' && !expected) {
    throw new Error('ASAAS_WEBHOOK_TOKEN obrigatório em produção.');
  }
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
        if (eventType === 'PAYMENT_CONFIRMED' || isAsaasPaymentPaid(payment.status)) {
          await handlePaymentConfirmed(user.id, payment);
        } else {
          await handlePaymentReceived(user.id, payment);
        }
        break;
      case 'PAYMENT_OVERDUE':
        await handlePaymentOverdue(user.id, payment);
        break;
      case 'PAYMENT_DELETED':
      case 'PAYMENT_REFUNDED':
        await salvarPagamentoAsaasLocal(user.id, payment);
        await lockUserToFree(user.id, `Cobrança ${eventType}`);
        break;
      default:
        await salvarPagamentoAsaasLocal(user.id, payment);
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
