import { prisma } from '@/lib/db';
import {
  buscarPagamentoAsaas,
  mapAsaasMetodo,
  mapAsaasPaymentStatus,
  type AsaasPayment,
} from './asaas-client';
import { getPlanoById } from './plan-service';
import { unlockUserPremium } from './sync-access';
import { parseExternalReference } from './checkout';

function addMonths(date: Date, months = 1) {
  const d = new Date(date);
  d.setMonth(d.getMonth() + months);
  return d;
}

export async function salvarPagamentoAsaasLocal(
  userId: string,
  payment: AsaasPayment,
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

/** Ativa premium quando o Asaas confirma/recebe pagamento. */
export async function activatePremiumFromAsaasPayment(
  userId: string,
  payment: AsaasPayment,
) {
  const ref = parseExternalReference(payment.externalReference);
  const sub = await prisma.subscription.findUnique({ where: { userId } });
  const planoId = ref?.planoId ?? sub?.planoId ?? undefined;
  const plano = planoId ? await getPlanoById(planoId) : null;

  await salvarPagamentoAsaasLocal(userId, payment, planoId);

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

  return { activated: true, status: 'active' as const };
}

export function isAsaasPaymentPaid(status: string) {
  return ['RECEIVED', 'CONFIRMED', 'RECEIVED_IN_CASH'].includes(status.toUpperCase());
}

export async function refreshAsaasPayment(paymentId: string) {
  return buscarPagamentoAsaas(paymentId);
}
