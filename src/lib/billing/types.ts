/** Status de assinatura — controla acesso premium. */
export type SubscriptionStatus =
  | 'free'
  | 'pending'
  | 'active'
  | 'trial'
  | 'past_due'
  | 'canceled'
  | 'failed'
  | 'expired';

/** Status de cobrança individual. */
export type PaymentStatus =
  | 'pending'
  | 'confirmed'
  | 'received'
  | 'overdue'
  | 'canceled'
  | 'refunded'
  | 'failed';

export type BillingGateway = 'asaas' | 'manual';

export type MetodoPagamento = 'pix' | 'boleto' | 'credit_card' | 'undefined';

export interface PlanLimits {
  maxJogos: number;
  maxDezenas: number;
  salvarJogos: boolean;
  fechamento: boolean;
  simulador: boolean;
  exportacao: boolean;
  importConcursos: boolean;
  perfis: boolean;
  dezenasFixas: boolean;
  imprimirCartelas: boolean;
}

export const LIMITES_FREE: PlanLimits = {
  maxJogos: 5,
  maxDezenas: 15,
  salvarJogos: false,
  fechamento: false,
  simulador: false,
  exportacao: false,
  importConcursos: false,
  perfis: false,
  dezenasFixas: false,
  imprimirCartelas: true,
};

export const LIMITES_PREMIUM: PlanLimits = {
  maxJogos: 500,
  maxDezenas: 20,
  salvarJogos: true,
  fechamento: true,
  simulador: true,
  exportacao: true,
  importConcursos: true,
  perfis: true,
  dezenasFixas: true,
  imprimirCartelas: true,
};

export interface PlanoInput {
  slug: string;
  nome: string;
  descricao?: string;
  valor: number;
  moeda?: string;
  periodicidade: 'none' | 'monthly' | 'yearly';
  limites: PlanLimits;
  recursos?: string[];
  ordem?: number;
  ativo?: boolean;
  destaque?: boolean;
}

export interface CheckoutResult {
  gateway: BillingGateway;
  subscriptionId?: string;
  paymentId?: string;
  invoiceUrl?: string;
  bankSlipUrl?: string;
  pix?: {
    encodedImage?: string;
    payload?: string;
    expirationDate?: string;
  };
  message?: string;
}
