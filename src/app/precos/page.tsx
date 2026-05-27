'use client';

import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { signIn, useSession } from 'next-auth/react';
import { Disclaimer } from '@/components/Disclaimer';
import { PlanosSection } from '@/components/PlanosSection';
import { SITE_NAME } from '@/lib/site-identity';
import { useCallback, useEffect, useRef, useState } from 'react';

interface CheckoutResponse {
  gateway: string;
  invoiceUrl?: string;
  bankSlipUrl?: string;
  pix?: { encodedImage?: string; payload?: string; expirationDate?: string };
  message?: string;
  error?: string;
}

interface BillingStatusResponse {
  premium: boolean;
  status: string;
  message?: string;
  pendingPayment?: CheckoutResponse['pix'] extends unknown
    ? {
        invoiceUrl: string | null;
        bankSlipUrl: string | null;
        pix?: CheckoutResponse['pix'];
      }
    : never;
}

export default function PrecosPage() {
  const { data: session, update: updateSession } = useSession();
  const params = useSearchParams();
  const premiumPath = params.get('premium');
  const [loading, setLoading] = useState<string | null>(null);
  const [checkout, setCheckout] = useState<CheckoutResponse | null>(null);
  const [metodo, setMetodo] = useState<'pix' | 'boleto'>('pix');
  const [erro, setErro] = useState('');
  const [precosIntro, setPrecosIntro] = useState('');
  const [aguardandoPagamento, setAguardandoPagamento] = useState(false);
  const [premiumAtivado, setPremiumAtivado] = useState(false);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const pararPoll = useCallback(() => {
    if (pollRef.current) {
      clearInterval(pollRef.current);
      pollRef.current = null;
    }
    setAguardandoPagamento(false);
  }, []);

  const verificarPagamento = useCallback(async () => {
    const res = await fetch('/api/billing/sync', { method: 'POST' });
    if (!res.ok) {
      const err = (await res.json().catch(() => ({}))) as { error?: string };
      setErro(err.error ?? 'Não foi possível verificar o pagamento. Tente entrar de novo.');
      return false;
    }
    const data = (await res.json()) as BillingStatusResponse & { ok?: boolean };
    if (data.premium) {
      setPremiumAtivado(true);
      pararPoll();
      await updateSession();
      return true;
    }
    if (data.pendingPayment?.pix && !checkout?.pix?.encodedImage) {
      setCheckout((prev) =>
        prev
          ? {
              ...prev,
              pix: data.pendingPayment?.pix,
              invoiceUrl: data.pendingPayment?.invoiceUrl ?? prev.invoiceUrl,
              bankSlipUrl: data.pendingPayment?.bankSlipUrl ?? prev.bankSlipUrl,
            }
          : prev,
      );
    }
    return false;
  }, [checkout?.pix?.encodedImage, pararPoll, updateSession]);

  useEffect(() => {
    if (params.get('checkout') === 'ok') {
      setErro('');
    }
  }, [params]);

  useEffect(() => {
    fetch('/api/config/textos')
      .then((r) => r.json())
      .then((d) => setPrecosIntro(d.textos?.precosIntro ?? ''))
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (!checkout || premiumAtivado) return;

    setAguardandoPagamento(true);
    void verificarPagamento();

    pollRef.current = setInterval(() => {
      void verificarPagamento();
    }, 5000);

    return () => pararPoll();
  }, [checkout, premiumAtivado, pararPoll, verificarPagamento]);

  async function assinar(planoId: string) {
    if (!session) {
      signIn('google', { callbackUrl: '/precos' });
      return;
    }
    setLoading(planoId);
    setErro('');
    setCheckout(null);
    setPremiumAtivado(false);
    pararPoll();
    try {
      const res = await fetch('/api/billing/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ planoId, metodo }),
      });
      const data = (await res.json()) as CheckoutResponse & { error?: string };
      if (!res.ok) {
        const msg = data.error ?? 'Erro ao iniciar assinatura. Cadastre CPF em Minha Conta.';
        console.error('[checkout]', res.status, msg);
        setErro(msg);
        return;
      }
      setCheckout(data);
    } finally {
      setLoading(null);
    }
  }

  return (
    <div className="mx-auto max-w-4xl space-y-6 px-4 py-12">
      <div>
        <h1 className="text-2xl font-bold text-white">Planos {SITE_NAME}</h1>
        {precosIntro && <p className="mt-1 text-sm text-slate-400">{precosIntro}</p>}
      </div>

      {premiumPath && (
        <p className="rounded-lg border border-amber-700/40 bg-amber-950/30 p-3 text-sm text-amber-100">
          Para acessar <strong>{premiumPath}</strong>, assine um plano pago com mensalidade em dia.
        </p>
      )}

      {premiumAtivado && (
        <p className="rounded-lg border border-emerald-700/40 bg-emerald-950/30 p-4 text-sm text-emerald-100">
          Pagamento confirmado! Seu plano Premium está ativo.{' '}
          <Link href="/dashboard" className="font-semibold underline">
            Ir ao Dashboard
          </Link>
        </p>
      )}

      <Disclaimer />

      <label className="block max-w-xs text-xs text-slate-400">
        Forma de pagamento (planos pagos)
        <select
          value={metodo}
          onChange={(e) => setMetodo(e.target.value as typeof metodo)}
          className="input mt-1"
        >
          <option value="pix">PIX (confirmação em minutos)</option>
          <option value="boleto">Boleto bancário</option>
        </select>
        <span className="mt-1 block text-[11px] text-slate-500">
          Cartão de crédito: disponível pelo link da fatura Asaas após gerar a cobrança.
        </span>
      </label>

      <PlanosSection modo="precos" onAssinar={assinar} assinandoId={loading} />

      {erro && (
        <p className="text-sm text-red-400">
          {erro}{' '}
          <Link href="/conta" className="underline">
            Ir para Minha Conta
          </Link>
        </p>
      )}

      {checkout && !premiumAtivado && (
        <div className="card space-y-3 border-brand-600/30">
          <p className="text-sm font-semibold text-brand-300">Conclua o pagamento</p>
          <p className="text-xs text-slate-400">{checkout.message}</p>
          {aguardandoPagamento && (
            <p className="text-xs text-amber-300/90">
              Aguardando confirmação do Asaas… esta página atualiza automaticamente.
            </p>
          )}
          {checkout.pix?.encodedImage && (
            <div className="space-y-2">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={`data:image/png;base64,${checkout.pix.encodedImage}`}
                alt="QR Code PIX"
                className="mx-auto max-w-[220px] rounded bg-white p-2"
              />
              {checkout.pix.payload && (
                <button
                  type="button"
                  className="btn-secondary w-full text-xs"
                  onClick={() => navigator.clipboard.writeText(checkout.pix!.payload!)}
                >
                  Copiar código PIX
                </button>
              )}
            </div>
          )}
          <div className="flex flex-wrap gap-2">
            {checkout.invoiceUrl && (
              <a href={checkout.invoiceUrl} target="_blank" rel="noopener noreferrer" className="btn-primary text-xs">
                Abrir fatura / pagamento
              </a>
            )}
            {checkout.bankSlipUrl && (
              <a href={checkout.bankSlipUrl} target="_blank" rel="noopener noreferrer" className="btn-secondary text-xs">
                Boleto
              </a>
            )}
            <button type="button" onClick={() => void verificarPagamento()} className="btn-secondary text-xs">
              Já paguei — verificar agora
            </button>
          </div>
          <p className="text-[11px] text-slate-500">
            Após confirmação pelo Asaas, o premium é liberado automaticamente (PIX: geralmente 1–5 minutos).
          </p>
        </div>
      )}

      <div className="flex flex-wrap gap-4 text-sm">
        <Link href="/conta" className="text-brand-400 hover:underline">
          Minha conta — trocar ou cancelar plano
        </Link>
        <Link href="/dashboard" className="text-brand-400 hover:underline">
          Ir ao Dashboard
        </Link>
      </div>
    </div>
  );
}
