import type { MetodoPagamento } from './types';

const SANDBOX_URL = 'https://sandbox.asaas.com/api/v3';
const PRODUCTION_URL = 'https://api.asaas.com/api/v3';

export function getAsaasBaseUrl() {
  return process.env.ASAAS_ENV === 'production' ? PRODUCTION_URL : SANDBOX_URL;
}

export function isAsaasConfigured() {
  return Boolean(process.env.ASAAS_API_KEY);
}

async function asaasFetch<T>(
  path: string,
  options: RequestInit = {},
): Promise<T> {
  const key = process.env.ASAAS_API_KEY;
  if (!key) throw new Error('ASAAS_API_KEY não configurada.');

  const res = await fetch(`${getAsaasBaseUrl()}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      access_token: key,
      ...(options.headers ?? {}),
    },
  });

  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const msg =
      (data as { errors?: { description?: string }[] }).errors?.[0]?.description ??
      (data as { message?: string }).message ??
      `Erro Asaas ${res.status}`;
    throw new Error(msg);
  }
  return data as T;
}

export interface AsaasCustomer {
  id: string;
  name: string;
  email: string;
  cpfCnpj?: string;
}

export interface AsaasPayment {
  id: string;
  customer: string;
  subscription?: string;
  value: number;
  status: string;
  billingType: string;
  dueDate: string;
  invoiceUrl?: string;
  bankSlipUrl?: string;
  confirmedDate?: string;
  paymentDate?: string;
  externalReference?: string;
}

export interface AsaasSubscription {
  id: string;
  customer: string;
  value: number;
  cycle: string;
  status: string;
  nextDueDate: string;
  billingType: string;
  externalReference?: string;
}

export interface AsaasPixQrCode {
  encodedImage: string;
  payload: string;
  expirationDate: string;
}

function billingTypeAsaas(metodo: MetodoPagamento): string {
  switch (metodo) {
    case 'pix':
      return 'PIX';
    case 'boleto':
      return 'BOLETO';
    case 'credit_card':
      return 'CREDIT_CARD';
    default:
      return 'UNDEFINED';
  }
}

function formatDueDate(d = new Date()) {
  return d.toISOString().slice(0, 10);
}

export async function criarClienteAsaas(input: {
  name: string;
  email: string;
  cpfCnpj: string;
  mobilePhone?: string;
  externalReference?: string;
}) {
  return asaasFetch<AsaasCustomer>('/customers', {
    method: 'POST',
    body: JSON.stringify({
      name: input.name,
      email: input.email,
      cpfCnpj: input.cpfCnpj.replace(/\D/g, ''),
      mobilePhone: input.mobilePhone?.replace(/\D/g, ''),
      externalReference: input.externalReference,
      notificationDisabled: false,
    }),
  });
}

export async function buscarClienteAsaas(id: string) {
  return asaasFetch<AsaasCustomer>(`/customers/${id}`);
}

export async function criarAssinaturaAsaas(input: {
  customerId: string;
  valor: number;
  descricao: string;
  metodo: MetodoPagamento;
  externalReference: string;
  nextDueDate?: string;
}) {
  return asaasFetch<AsaasSubscription>('/subscriptions', {
    method: 'POST',
    body: JSON.stringify({
      customer: input.customerId,
      billingType: billingTypeAsaas(input.metodo),
      value: input.valor,
      nextDueDate: input.nextDueDate ?? formatDueDate(),
      cycle: 'MONTHLY',
      description: input.descricao,
      externalReference: input.externalReference,
    }),
  });
}

export async function cancelarAssinaturaAsaas(subscriptionId: string) {
  return asaasFetch<AsaasSubscription>(`/subscriptions/${subscriptionId}`, {
    method: 'DELETE',
  });
}

export async function listarPagamentosAssinatura(subscriptionId: string) {
  const data = await asaasFetch<{ data: AsaasPayment[] }>(
    `/subscriptions/${subscriptionId}/payments?limit=5`,
  );
  return data.data ?? [];
}

export async function buscarPagamentoAsaas(paymentId: string) {
  return asaasFetch<AsaasPayment>(`/payments/${paymentId}`);
}

export async function obterPixQrCode(paymentId: string) {
  return asaasFetch<AsaasPixQrCode>(`/payments/${paymentId}/pixQrCode`);
}

export function mapAsaasPaymentStatus(status: string): string {
  const map: Record<string, string> = {
    PENDING: 'pending',
    RECEIVED: 'received',
    CONFIRMED: 'confirmed',
    OVERDUE: 'overdue',
    REFUNDED: 'refunded',
    RECEIVED_IN_CASH: 'received',
    REFUND_REQUESTED: 'refunded',
    CHARGEBACK_REQUESTED: 'failed',
    CHARGEBACK_DISPUTE: 'failed',
    AWAITING_CHARGEBACK_REVERSAL: 'failed',
    DUNNING_REQUESTED: 'overdue',
    DUNNING_RECEIVED: 'received',
    AWAITING_RISK_ANALYSIS: 'pending',
  };
  return map[status] ?? 'pending';
}

export function mapAsaasMetodo(billingType?: string): MetodoPagamento {
  switch (billingType?.toUpperCase()) {
    case 'PIX':
      return 'pix';
    case 'BOLETO':
      return 'boleto';
    case 'CREDIT_CARD':
      return 'credit_card';
    default:
      return 'undefined';
  }
}
