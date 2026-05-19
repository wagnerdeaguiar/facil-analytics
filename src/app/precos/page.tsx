'use client';

import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { signIn, useSession } from 'next-auth/react';
import { Disclaimer } from '@/components/Disclaimer';
import { isPremiumStatus } from '@/lib/subscription';
import { useState } from 'react';

export default function PrecosPage() {
  const { data: session } = useSession();
  const params = useSearchParams();
  const premiumPath = params.get('premium');
  const [loading, setLoading] = useState(false);
  const isPremium = isPremiumStatus(session?.user?.subscriptionStatus);

  async function assinar() {
    if (!session) {
      signIn('google', { callbackUrl: '/precos' });
      return;
    }
    setLoading(true);
    try {
      const res = await fetch('/api/stripe/checkout', { method: 'POST' });
      const data = await res.json();
      if (data.url) window.location.href = data.url;
      else alert(data.error ?? 'Configure Stripe no .env');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="mx-auto max-w-lg space-y-6 px-4 py-12">
      <h1 className="text-2xl font-bold text-white">Plano Premium Fácil Analytics</h1>
      {premiumPath && (
        <p className="rounded-lg border border-amber-700/40 bg-amber-950/30 p-3 text-sm text-amber-100">
          Para acessar <strong>{premiumPath}</strong>, assine o Premium.
        </p>
      )}
      <Disclaimer />
      <div className="card border-brand-600/30">
        <p className="text-4xl font-bold text-brand-300">
          R$ 4,99<span className="text-base font-normal text-slate-400">/mês</span>
        </p>
        <ul className="mt-4 space-y-2 text-sm text-slate-300">
          <li>• Gerador de jogos com critérios e score de aderência</li>
          <li>• Simulador retroativo</li>
          <li>• Exportação CSV, XLSX e PDF</li>
          <li>• Perfis personalizados e bases editáveis</li>
          <li>• Histórico de simulações e relatórios completos</li>
        </ul>
        {isPremium ? (
          <p className="mt-4 text-emerald-400">Sua assinatura está ativa.</p>
        ) : (
          <button type="button" onClick={assinar} disabled={loading} className="btn-primary mt-6 w-full">
            {loading ? 'Redirecionando…' : 'Assinar Plano Premium'}
          </button>
        )}
      </div>
      <Link href="/dashboard" className="text-sm text-brand-400 hover:underline">
        Ir ao Dashboard
      </Link>
    </div>
  );
}
