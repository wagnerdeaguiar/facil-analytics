import { prisma } from '@/lib/db';
import {
  criarAssinaturaAsaas,
  criarClienteAsaas,
  isAsaasConfigured,
  listarPagamentosAssinatura,
  mapAsaasMetodo,
  mapAsaasPaymentStatus,
  atualizarClienteAsaas,
  buscarClienteAsaasPorEmail,
  buscarClienteAsaasPorReferencia,
  getAsaasKeyDiagnostics,
} from './asaas-client';
import { cpfValido } from '@/lib/cpf';
import { getPlanoById, getPlanoBySlug } from './plan-service';
import { syncSubscriptionAccess } from './sync-access';
import { cancelExistingAsaasSubscription } from './subscription-change';
import { fetchPixWithRetry } from './sync-payment';
import { SITE_NAME } from '@/lib/site-identity';
import type { CheckoutResult, MetodoPagamento } from './types';

function parseExternalReference(ref?: string) {
  if (!ref) return null;
  const parts = Object.fromEntries(
    ref.split('|').map((p) => {
      const [k, v] = p.split(':');
      return [k, v];
    }),
  );
  return parts as { userId?: string; planoId?: string };
}

async function ensureAsaasCustomer(userId: string) {
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) throw new Error('Usuário não encontrado.');

  const cpf = user.cpf?.replace(/\D/g, '');
  if (!cpf || cpf.length !== 11) {
    throw new Error('Cadastre seu CPF em Minha Conta antes de assinar.');
  }
  if (!cpfValido(cpf)) {
    throw new Error('CPF inválido. Corrija em Minha Conta antes de assinar.');
  }

  const sub = await prisma.subscription.upsert({
    where: { userId },
    create: { userId, status: 'free', plano: 'free' },
    update: {},
  });

  if (sub.gatewayCustomerId && sub.gateway === 'asaas') {
    try {
      await atualizarClienteAsaas(sub.gatewayCustomerId, {
        name: user.name ?? user.email.split('@')[0],
        email: user.email,
        cpfCnpj: cpf,
        mobilePhone: user.telefone ?? undefined,
      });
      return { user, customerId: sub.gatewayCustomerId, sub };
    } catch (e) {
      const msg = e instanceof Error ? e.message : '';
      const clienteInexistente =
        msg.includes('404') || /não encontrad|not found/i.test(msg);
      if (!clienteInexistente) throw e;
      /* ID de sandbox/outra conta — recria cliente em produção */
      await prisma.subscription.update({
        where: { userId },
        data: { gatewayCustomerId: null, gatewaySubscriptionId: null },
      });
    }
  }

  const ref = `userId:${userId}`;
  const existente =
    (await buscarClienteAsaasPorReferencia(ref).catch(() => null)) ??
    (await buscarClienteAsaasPorEmail(user.email).catch(() => null));

  let customerId: string;
  if (existente) {
    customerId = existente.id;
    await atualizarClienteAsaas(customerId, {
      name: user.name ?? user.email.split('@')[0],
      email: user.email,
      cpfCnpj: cpf,
      mobilePhone: user.telefone ?? undefined,
    }).catch(() => {});
  } else {
    const customer = await criarClienteAsaas({
      name: user.name ?? user.email.split('@')[0],
      email: user.email,
      cpfCnpj: cpf,
      mobilePhone: user.telefone ?? undefined,
      externalReference: ref,
    });
    customerId = customer.id;
  }

  await prisma.subscription.update({
    where: { userId },
    data: { gatewayCustomerId: customerId, gateway: 'asaas' },
  });

  return { user, customerId, sub };
}

async function salvarPagamentoLocal(input: {
  userId: string;
  subscriptionId?: string;
  planoId: string;
  gatewayPaymentId: string;
  valor: number;
  status: string;
  metodo?: MetodoPagamento;
  descricao?: string;
  dueDate?: Date;
  invoiceUrl?: string;
  bankSlipUrl?: string;
  pixPayload?: string;
}) {
  return prisma.payment.upsert({
    where: { gatewayPaymentId: input.gatewayPaymentId },
    create: {
      userId: input.userId,
      subscriptionId: input.subscriptionId,
      planoId: input.planoId,
      gateway: 'asaas',
      gatewayPaymentId: input.gatewayPaymentId,
      valor: input.valor,
      status: input.status,
      metodo: input.metodo,
      descricao: input.descricao,
      dueDate: input.dueDate,
      gatewayInvoiceUrl: input.invoiceUrl,
      gatewayBankSlipUrl: input.bankSlipUrl,
      gatewayPixPayload: input.pixPayload,
    },
    update: {
      status: input.status,
      metodo: input.metodo,
      dueDate: input.dueDate,
      gatewayInvoiceUrl: input.invoiceUrl,
      gatewayBankSlipUrl: input.bankSlipUrl,
      gatewayPixPayload: input.pixPayload,
    },
  });
}

export async function createBillingCheckout(
  userId: string,
  planoIdOrSlug: string,
  metodo: MetodoPagamento = 'pix',
): Promise<CheckoutResult> {
  const plano =
    (await getPlanoById(planoIdOrSlug)) ?? (await getPlanoBySlug(planoIdOrSlug));

  if (!plano || !plano.ativo) throw new Error('Plano indisponível.');
  if (plano.valor <= 0 || plano.periodicidade === 'none') {
    throw new Error('Este plano é gratuito — basta usar com login.');
  }

  if (!isAsaasConfigured()) {
    throw new Error('Gateway Asaas não configurado. Defina ASAAS_API_KEY na Vercel.');
  }

  const { envMismatch, keyType, env } = getAsaasKeyDiagnostics();
  if (envMismatch) {
    throw new Error(
      `Chave Asaas (${keyType}) não combina com ASAAS_ENV=${env}. Use chave de produção ($aact_prod_) com ASAAS_ENV=production na Vercel.`,
    );
  }

  if (metodo === 'credit_card') {
    throw new Error(
      'Pagamento com cartão: use PIX ou boleto, ou abra a fatura Asaas após gerar a cobrança (link “Abrir fatura”).',
    );
  }

  const subAtual = await prisma.subscription.findUnique({ where: { userId } });
  if (subAtual?.status === 'pending') {
    const cobrancaPendente = await prisma.payment.findFirst({
      where: { userId, status: { in: ['pending', 'overdue'] } },
      orderBy: { createdAt: 'desc' },
    });
    if (cobrancaPendente) {
      throw new Error(
        'Você já tem uma cobrança pendente. Aguarde a confirmação ou use "Já paguei" na tela de pagamento.',
      );
    }
  }

  await cancelExistingAsaasSubscription(userId);

  const { customerId } = await ensureAsaasCustomer(userId);

  const asaasSub = await criarAssinaturaAsaas({
    customerId,
    valor: Math.round(Number(plano.valor) * 100) / 100,
    descricao: `${plano.nome} — ${SITE_NAME}`,
    metodo,
    externalReference: `userId:${userId}|planoId:${plano.id}`,
  });

  const subRecord = await prisma.subscription.update({
    where: { userId },
    data: {
      planoId: plano.id,
      plano: plano.slug,
      valor: plano.valor,
      periodicidade: plano.periodicidade,
      gateway: 'asaas',
      gatewaySubscriptionId: asaasSub.id,
      status: 'pending',
    },
  });

  await syncSubscriptionAccess({
    userId,
    status: 'pending',
    planoSlug: plano.slug,
    planoId: plano.id,
    valor: plano.valor,
    periodicidade: plano.periodicidade,
    gateway: 'asaas',
    gatewayCustomerId: customerId,
    gatewaySubscriptionId: asaasSub.id,
  });

  const pagamentos = await listarPagamentosAssinatura(asaasSub.id);
  const primeiro = pagamentos[0];

  let pix: CheckoutResult['pix'];
  if (primeiro && mapAsaasMetodo(primeiro.billingType) === 'pix') {
    const qr = await fetchPixWithRetry(primeiro.id);
    if (qr) {
      pix = {
        encodedImage: qr.encodedImage,
        payload: qr.payload,
        expirationDate: qr.expirationDate,
      };
    }
  }

  if (primeiro) {
    await salvarPagamentoLocal({
      userId,
      subscriptionId: subRecord.id,
      planoId: plano.id,
      gatewayPaymentId: primeiro.id,
      valor: primeiro.value,
      status: mapAsaasPaymentStatus(primeiro.status),
      metodo: mapAsaasMetodo(primeiro.billingType),
      descricao: plano.nome,
      dueDate: primeiro.dueDate ? new Date(primeiro.dueDate) : undefined,
      invoiceUrl: primeiro.invoiceUrl,
      bankSlipUrl: primeiro.bankSlipUrl,
      pixPayload: pix?.payload,
    });
  }

  return {
    gateway: 'asaas',
    subscriptionId: asaasSub.id,
    paymentId: primeiro?.id,
    invoiceUrl: primeiro?.invoiceUrl,
    bankSlipUrl: primeiro?.bankSlipUrl,
    pix,
    message: 'Assinatura criada. Conclua o pagamento para liberar o plano.',
  };
}

export { parseExternalReference };
