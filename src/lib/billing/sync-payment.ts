import { prisma } from '@/lib/db';
import { isPremiumStatus } from '@/lib/subscription';
import {
  listarPagamentosAssinatura,
  mapAsaasMetodo,
  obterPixQrCode,
  type AsaasPayment,
} from './asaas-client';
import {
  activatePremiumFromAsaasPayment,
  isAsaasPaymentPaid,
  refreshAsaasPayment,
  salvarPagamentoAsaasLocal,
} from './payment-activation';
import type { MetodoPagamento } from './types';

export interface BillingStatusResult {
  status: string;
  premium: boolean;
  plano: string;
  planoId: string | null;
  pendingPayment: {
    id: string;
    valor: number;
    status: string;
    metodo: MetodoPagamento;
    dueDate: string | null;
    invoiceUrl: string | null;
    bankSlipUrl: string | null;
    pix?: {
      encodedImage?: string;
      payload?: string;
      expirationDate?: string;
    };
  } | null;
  synced: boolean;
  message?: string;
}

function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

export async function fetchPixWithRetry(paymentId: string, attempts = 4) {
  for (let i = 0; i < attempts; i++) {
    try {
      return await obterPixQrCode(paymentId);
    } catch {
      if (i < attempts - 1) await sleep(800 * (i + 1));
    }
  }
  return null;
}

async function buildPendingPaymentInfo(payment: AsaasPayment) {
  let pix: { encodedImage?: string; payload?: string; expirationDate?: string } | undefined;

  if (payment.billingType?.toUpperCase() === 'PIX') {
    const qr = await fetchPixWithRetry(payment.id, 2);
    if (qr) {
      pix = {
        encodedImage: qr.encodedImage,
        payload: qr.payload,
        expirationDate: qr.expirationDate,
      };
    }
  }

  return {
    id: payment.id,
    valor: payment.value,
    status: payment.status,
    metodo: mapAsaasMetodo(payment.billingType),
    dueDate: payment.dueDate ?? null,
    invoiceUrl: payment.invoiceUrl ?? null,
    bankSlipUrl: payment.bankSlipUrl ?? null,
    pix,
  };
}

/** Consulta Asaas e atualiza status local (útil após PIX ou quando webhook atrasa). */
export async function syncUserBillingFromAsaas(userId: string): Promise<BillingStatusResult> {
  const sub = await prisma.subscription.findUnique({ where: { userId } });
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { subscriptionStatus: true },
  });

  if (!sub) {
    return {
      status: user?.subscriptionStatus ?? 'free',
      premium: isPremiumStatus(user?.subscriptionStatus),
      plano: 'free',
      planoId: null,
      pendingPayment: null,
      synced: false,
    };
  }

  let synced = false;
  let latestPayments: AsaasPayment[] = [];

  if (sub.gatewaySubscriptionId) {
    try {
      latestPayments = await listarPagamentosAssinatura(sub.gatewaySubscriptionId);
      synced = true;
    } catch {
      /* gateway indisponível — usa dados locais */
    }
  }

  const paidPayment = latestPayments.find((p) => isAsaasPaymentPaid(p.status));
  if (paidPayment && !isPremiumStatus(sub.status)) {
    await activatePremiumFromAsaasPayment(userId, paidPayment);
    synced = true;
  }

  const refreshedSub = await prisma.subscription.findUnique({ where: { userId } });
  const refreshedUser = await prisma.user.findUnique({
    where: { id: userId },
    select: { subscriptionStatus: true },
  });
  const status = refreshedUser?.subscriptionStatus ?? refreshedSub?.status ?? 'free';

  const pendingAsaas = latestPayments.find((p) =>
    ['PENDING', 'OVERDUE', 'AWAITING_RISK_ANALYSIS'].includes(p.status),
  );

  if (pendingAsaas) {
    await salvarPagamentoAsaasLocal(userId, pendingAsaas, refreshedSub?.planoId ?? undefined);
    const pendingPayment = await buildPendingPaymentInfo(pendingAsaas);
    return {
      status,
      premium: isPremiumStatus(status),
      plano: refreshedSub?.plano ?? 'free',
      planoId: refreshedSub?.planoId ?? null,
      pendingPayment,
      synced,
      message: 'Aguardando confirmação do pagamento.',
    };
  }

  const localPending = await prisma.payment.findFirst({
    where: { userId, status: { in: ['pending', 'overdue'] } },
    orderBy: { createdAt: 'desc' },
  });

  if (localPending?.gatewayPaymentId && !isPremiumStatus(status)) {
    try {
      const remote = await refreshAsaasPayment(localPending.gatewayPaymentId);
      if (isAsaasPaymentPaid(remote.status)) {
        await activatePremiumFromAsaasPayment(userId, remote);
        const u = await prisma.user.findUnique({
          where: { id: userId },
          select: { subscriptionStatus: true },
        });
        return {
          status: u?.subscriptionStatus ?? 'active',
          premium: true,
          plano: refreshedSub?.plano ?? 'premium',
          planoId: refreshedSub?.planoId ?? null,
          pendingPayment: null,
          synced: true,
          message: 'Pagamento confirmado! Premium liberado.',
        };
      }
      const pendingPayment = await buildPendingPaymentInfo(remote);
      return {
        status,
        premium: isPremiumStatus(status),
        plano: refreshedSub?.plano ?? 'free',
        planoId: refreshedSub?.planoId ?? null,
        pendingPayment,
        synced: true,
      };
    } catch {
      /* ignora */
    }
  }

  return {
    status,
    premium: isPremiumStatus(status),
    plano: refreshedSub?.plano ?? 'free',
    planoId: refreshedSub?.planoId ?? null,
    pendingPayment: null,
    synced,
    message: isPremiumStatus(status) ? 'Plano ativo.' : undefined,
  };
}
