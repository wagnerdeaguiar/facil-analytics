import { prisma } from '@/lib/db';
import { Prisma } from '@prisma/client';
import { buscarPagamentoAsaas, isAsaasConfigured } from './asaas-client';
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

const GRACE_DAYS_OVERDUE = 3;

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
  const grace = new Date();
  grace.setDate(grace.getDate() + GRACE_DAYS_OVERDUE);
  await syncSubscriptionAccess({
    userId,
    status: 'past_due',
    planoSlug: 'premium',
    gracePeriodUntil: grace,
  });
  await prisma.auditLog.create({
    data: {
      userId,
      eventType: 'payment_overdue',
      description: `Mensalidade em atraso — carência até ${grace.toLocaleDateString('pt-BR')}`,
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

/** Mantém premium até currentPeriodEnd quando usuário cancelou com período já pago. */
async function handleSubscriptionDeleted(userId: string) {
  const sub = await prisma.subscription.findUnique({ where: { userId } });
  if (!sub) return;

  const now = new Date();
  const fim = sub.currentPeriodEnd ?? sub.dataRenovacao;
  const emPeriodoPago = Boolean(sub.dataCancelamento && fim && fim > now);

  if (emPeriodoPago) {
    await prisma.subscription.update({
      where: { userId },
      data: { gatewaySubscriptionId: null },
    });
    await prisma.auditLog.create({
      data: {
        userId,
        eventType: 'subscription_deleted_grace',
        description: `Assinatura removida no Asaas; acesso premium até ${fim!.toLocaleDateString('pt-BR')}`,
      },
    });
    return;
  }

  await lockUserToFree(userId, 'Assinatura cancelada ou removida');
}

function isUniqueViolation(e: unknown) {
  return e instanceof Prisma.PrismaClientKnownRequestError && e.code === 'P2002';
}

export async function handleAsaasWebhook(rawBody: string, accessToken: string | null) {
  const expected = process.env.ASAAS_WEBHOOK_TOKEN?.trim();

  if (isAsaasConfigured()) {
    if (!expected) {
      throw new Error('ASAAS_WEBHOOK_TOKEN obrigatório quando o Asaas está configurado.');
    }
    if (accessToken !== expected) {
      throw new Error('Token de webhook Asaas inválido.');
    }
  } else if (expected && accessToken !== expected) {
    throw new Error('Token de webhook Asaas inválido.');
  }

  const payload = JSON.parse(rawBody) as AsaasWebhookPayload;
  const eventType = payload.event ?? 'UNKNOWN';

  if (!payload.id) {
    throw new Error('Webhook Asaas sem identificador (campo id).');
  }
  const eventId = payload.id;

  try {
    await prisma.billingEvent.create({
      data: {
        gateway: 'asaas',
        gatewayEventId: eventId,
        eventType,
        payload: payload as object,
      },
    });
  } catch (e) {
    if (isUniqueViolation(e)) return { duplicate: true, eventType };
    throw e;
  }

  let userId: string | undefined;

  try {
    if (payload.payment) {
      let payment = payload.payment;
      try {
        payment = await buscarPagamentoAsaas(payment.id);
      } catch {
        /* usa payload do webhook */
      }

      const user = await findUserByGateway(payment.customer, payment.externalReference);
      if (!user) {
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

    await prisma.billingEvent.update({
      where: { gatewayEventId: eventId },
      data: { userId },
    });

    return { processed: true, eventType, userId };
  } catch (e) {
    console.error('[asaas webhook process]', eventId, e);
    throw e;
  }
}
