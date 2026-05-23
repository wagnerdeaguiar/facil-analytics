'use client';

import Link from 'next/link';
import { signIn, useSession } from 'next-auth/react';
import { useEffect, useState } from 'react';
import { Check, Crown } from 'lucide-react';
import { AvisoValorSimbolico } from '@/components/AvisoValorSimbolico';
import { formatarPrecoPlano } from '@/lib/planos-copy';
import type { TextosPlataforma } from '@/lib/plataforma-textos';
import { TEXTOS_PLATAFORMA_VAZIOS } from '@/lib/plataforma-textos';
import { isPremiumStatus } from '@/lib/subscription';

export interface PlanoPublico {
  id: string;
  slug: string;
  nome: string;
  descricao: string | null;
  valor: number;
  periodicidade: string;
  recursos: string[];
  destaque: boolean;
}

type Modo = 'landing' | 'conta' | 'precos';

type Props = {
  modo?: Modo;
  planoAtualSlug?: string;
  planoAtualId?: string;
  dataCancelamento?: string | null;
  acessoPremiumAte?: string | null;
  onAssinar?: (planoId: string) => void;
  onCancelar?: () => void;
  assinandoId?: string | null;
  cancelando?: boolean;
};

function PlanoCard({
  plano,
  modo,
  isAtual,
  isPremiumUser,
  onAssinar,
  onCancelar,
  assinandoId,
  cancelando,
  textos,
}: {
  plano: PlanoPublico;
  modo: Modo;
  isAtual: boolean;
  isPremiumUser: boolean;
  onAssinar?: (planoId: string) => void;
  onCancelar?: () => void;
  assinandoId?: string | null;
  cancelando?: boolean;
  textos: TextosPlataforma;
}) {
  const isFree = plano.valor <= 0 || plano.periodicidade === 'none';
  const destaque = plano.destaque && !isFree;

  return (
    <article
      className={`flex flex-col rounded-2xl border p-5 ${
        destaque
          ? 'border-brand-600/40 bg-slate-900/90 shadow-lg shadow-brand-950/20'
          : 'border-slate-700/60 bg-slate-900/75'
      } ${isAtual ? 'ring-2 ring-brand-500/50' : ''}`}
    >
      <div className="mb-3 flex items-start justify-between gap-2">
        <div>
          <div className="flex items-center gap-2">
            {!isFree && <Crown className="h-4 w-4 text-amber-400" aria-hidden />}
            <h3 className="text-lg font-bold text-white">{plano.nome}</h3>
          </div>
          {plano.descricao && <p className="mt-1 text-xs text-slate-500">{plano.descricao}</p>}
        </div>
        {isAtual && (
          <span className="shrink-0 rounded-full bg-brand-500/20 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-brand-300">
            Seu plano
          </span>
        )}
      </div>

      <p className="text-3xl font-bold text-brand-300">
        {formatarPrecoPlano(plano.valor, plano.periodicidade)}
      </p>
      {!isFree && textos.avisoValorTextoCurto && (
        <p className="mt-1 text-[11px] text-slate-500">{textos.avisoValorTextoCurto}</p>
      )}

      <ul className="mt-4 flex-1 space-y-2 text-sm text-slate-300">
        {(plano.recursos ?? []).map((r) => (
          <li key={r} className="flex gap-2">
            <Check className="mt-0.5 h-4 w-4 shrink-0 text-brand-400" aria-hidden />
            <span>{r}</span>
          </li>
        ))}
      </ul>

      <div className="mt-5">
        {modo === 'landing' && (
          <>
            {isFree ? (
              <Link href="/entrar" className="btn-secondary block w-full text-center">
                {textos.planoBotaoGratis || 'Entrar'}
              </Link>
            ) : (
              <Link href="/precos" className="btn-primary block w-full text-center">
                {textos.planoBotaoPago || 'Ver planos'}
              </Link>
            )}
          </>
        )}

        {modo === 'precos' && onAssinar && (
          <>
            {isFree ? (
              <p className="text-center text-sm text-slate-400">Incluído ao criar conta e entrar.</p>
            ) : isPremiumUser && isAtual ? (
              <p className="text-center text-sm text-emerald-400">Plano ativo na sua conta.</p>
            ) : isPremiumUser && !isAtual ? (
              <button
                type="button"
                onClick={() => onAssinar(plano.id)}
                disabled={Boolean(assinandoId)}
                className="btn-primary w-full"
              >
                {assinandoId === plano.id ? 'Gerando cobrança…' : `Trocar para ${plano.nome}`}
              </button>
            ) : (
              <button
                type="button"
                onClick={() => onAssinar(plano.id)}
                disabled={Boolean(assinandoId)}
                className="btn-primary w-full"
              >
                {assinandoId === plano.id ? 'Gerando cobrança…' : `Assinar ${plano.nome}`}
              </button>
            )}
          </>
        )}

        {modo === 'conta' && (
          <>
            {isAtual && isFree && (
              <p className="text-center text-sm text-slate-400">Plano atual — sem cobrança.</p>
            )}
            {isAtual && !isFree && (
              <p className="text-center text-sm text-emerald-400">Assinatura ativa neste plano.</p>
            )}
            {!isAtual && isFree && isPremiumUser && onCancelar && (
              <button
                type="button"
                onClick={onCancelar}
                disabled={cancelando}
                className="btn-secondary w-full"
              >
                {cancelando ? 'Cancelando…' : 'Voltar ao gratuito'}
              </button>
            )}
            {!isAtual && !isFree && (
              <Link href={`/precos?plano=${plano.slug}`} className="btn-primary block w-full text-center">
                {isPremiumUser ? `Trocar para ${plano.nome}` : `Assinar ${plano.nome}`}
              </Link>
            )}
            {!isAtual && isFree && !isPremiumUser && (
              <p className="text-center text-xs text-slate-500">Disponível para todos os usuários logados.</p>
            )}
          </>
        )}
      </div>
    </article>
  );
}

export function PlanosSection({
  modo = 'landing',
  planoAtualSlug,
  planoAtualId,
  dataCancelamento,
  acessoPremiumAte,
  onAssinar,
  onCancelar,
  assinandoId,
  cancelando,
}: Props) {
  const { data: session } = useSession();
  const [planos, setPlanos] = useState<PlanoPublico[]>([]);
  const [textos, setTextos] = useState<TextosPlataforma>(TEXTOS_PLATAFORMA_VAZIOS);

  useEffect(() => {
    fetch('/api/planos')
      .then((r) => r.json())
      .then((d) => setPlanos(d.planos ?? []))
      .catch(() => {});
    fetch('/api/config/textos')
      .then((r) => r.json())
      .then((d) => setTextos(d.textos ?? TEXTOS_PLATAFORMA_VAZIOS))
      .catch(() => {});
  }, []);

  const isPremiumUser = isPremiumStatus(session?.user?.subscriptionStatus);
  const gridCols =
    planos.length >= 3 ? 'md:grid-cols-2 lg:grid-cols-3' : planos.length === 2 ? 'md:grid-cols-2' : 'max-w-md mx-auto';

  if (!planos.length) return null;

  const temCabecalhoLanding =
    textos.landingPlanosRotulo || textos.landingPlanosTitulo || textos.landingPlanosSubtitulo;

  return (
    <section className="space-y-5">
      {modo === 'landing' && temCabecalhoLanding && (
        <div className="text-center">
          {textos.landingPlanosRotulo && (
            <p className="text-xs uppercase tracking-widest text-slate-500">{textos.landingPlanosRotulo}</p>
          )}
          {textos.landingPlanosTitulo && (
            <h2 className="mt-2 text-xl font-bold text-white md:text-2xl">{textos.landingPlanosTitulo}</h2>
          )}
          {textos.landingPlanosSubtitulo && (
            <p className="mx-auto mt-2 max-w-2xl text-sm text-slate-400">{textos.landingPlanosSubtitulo}</p>
          )}
        </div>
      )}

      <AvisoValorSimbolico compact={modo === 'landing'} textos={textos} />

      {modo === 'conta' && dataCancelamento && acessoPremiumAte && (
        <p className="rounded-lg border border-amber-800/40 bg-amber-950/30 p-3 text-sm text-amber-100">
          Assinatura cancelada — seu acesso premium continua até{' '}
          <strong>{new Date(acessoPremiumAte).toLocaleDateString('pt-BR')}</strong>. Depois disso, você volta ao
          plano gratuito automaticamente.
        </p>
      )}

      <div className={`grid gap-4 ${gridCols}`}>
        {planos.map((plano) => {
          const isAtual =
            plano.slug === planoAtualSlug ||
            plano.id === planoAtualId ||
            (plano.slug === 'free' && planoAtualSlug === 'free' && !isPremiumUser);

          return (
            <PlanoCard
              key={plano.id}
              plano={plano}
              modo={modo}
              isAtual={isAtual}
              isPremiumUser={isPremiumUser}
              onAssinar={onAssinar}
              onCancelar={onCancelar}
              assinandoId={assinandoId}
              cancelando={cancelando}
              textos={textos}
            />
          );
        })}
      </div>

      {modo === 'landing' && !session && (
        <p className="text-center text-xs text-slate-500">
          Já tem conta?{' '}
          <button type="button" onClick={() => signIn('google')} className="text-brand-400 underline">
            Entrar com Google
          </button>
        </p>
      )}
    </section>
  );
}
