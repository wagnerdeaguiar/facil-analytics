'use client';

import Link from 'next/link';
import { useSession } from 'next-auth/react';
import { useState } from 'react';
import { Crown } from 'lucide-react';
import { isPremiumStatus } from '@/lib/subscription';
import { CAMINHO_EXIBICAO_XLSX, URL_CEF_LOTOFACIL } from '@/lib/lotofacil/excel-path';

export function ImportacaoHistorico({ onAtualizado }: { onAtualizado?: () => void }) {
  const { data: session } = useSession();
  const premium = isPremiumStatus(session?.user?.subscriptionStatus);
  const [msg, setMsg] = useState('');
  const [loading, setLoading] = useState(false);

  async function importarXlsx() {
    setLoading(true);
    setMsg('');
    const res = await fetch('/api/concursos/import-xlsx', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ substituir: true }),
    });
    const data = await res.json();
    if (res.ok) {
      const r = data.resumo;
      setMsg(
        `Excel: ${data.inseridos} concursos (${data.periodo?.de}–${data.periodo?.ate}). Total na base: ${data.total}.` +
          (r ? ` Arquivo: ${r.totalLinhas} linhas, concurso ${r.primeiro}–${r.ultimo}.` : ''),
      );
      onAtualizado?.();
    } else {
      setMsg(data.error ?? 'Erro');
    }
    setLoading(false);
  }

  async function atualizarCaixa() {
    setLoading(true);
    sessionStorage.removeItem('lotofacil-sync-at');
    const res = await fetch('/api/concursos/sync', { method: 'POST' });
    const data = await res.json();
    setMsg(
      data.message ??
        (data.inseridos
          ? `Inseridos: ${data.inseridos} (${data.fonte ?? 'api'})`
          : 'Nenhum concurso novo.'),
    );
    if (res.ok) onAtualizado?.();
    setLoading(false);
  }

  async function recalcular() {
    setLoading(true);
    const res = await fetch('/api/analytics/recalcular', { method: 'POST' });
    const data = await res.json();
    setMsg(res.ok ? `Recalculado: ${data.totalConcursos} concursos.` : 'Erro');
    setLoading(false);
  }

  return (
    <article id="importacao" className="card space-y-4 border-brand-700/40">
      <div className="flex flex-wrap items-center gap-2">
        <h2 className="text-sm font-semibold text-brand-300">Importação, atualização e recálculo</h2>
        <span className="inline-flex items-center gap-1 rounded-full bg-amber-500/10 px-2 py-0.5 text-[10px] font-medium text-amber-400">
          <Crown className="h-3 w-3" />
          Premium
        </span>
      </div>

      {!session && (
        <p className="text-xs text-slate-400">
          Faça login e assine o Premium para importar e manter a base de concursos.
        </p>
      )}
      {session && !premium && (
        <p className="text-xs text-slate-400">
          Recurso Premium.{' '}
          <Link href="/precos" className="text-brand-400 underline">
            Assinar plano
          </Link>
        </p>
      )}

      {msg && <p className="rounded-lg bg-slate-800 px-3 py-2 text-sm text-brand-300">{msg}</p>}

      <section className="space-y-2 rounded-lg border border-slate-700/50 bg-slate-900/40 p-3">
        <h3 className="text-sm font-semibold text-slate-200">Importar Lotofácil.xlsx (Downloads)</h3>
        <ol className="list-inside list-decimal space-y-1 text-xs text-slate-400">
          <li>
            Baixe o histórico em Excel no{' '}
            <a
              href={URL_CEF_LOTOFACIL}
              target="_blank"
              rel="noopener noreferrer"
              className="text-brand-400 underline"
            >
              site da Caixa (Lotofácil)
            </a>
            .
          </li>
          <li>
            Salve o arquivo como <code className="text-brand-300">{CAMINHO_EXIBICAO_XLSX}</code> (pasta Downloads).
          </li>
          <li>
            Clique abaixo para importar o histórico completo (Concurso, Data, Bola1–Bola15).
          </li>
        </ol>
        <button
          type="button"
          onClick={importarXlsx}
          disabled={loading || !premium}
          className="btn-primary"
        >
          Importar histórico completo (Excel)
        </button>
      </section>

      <section className="space-y-2 rounded-lg border border-slate-700/50 p-3">
        <h3 className="text-sm font-semibold text-slate-200">Atualizar último concurso</h3>
        <p className="text-xs text-slate-400">
          Sincroniza automaticamente ao abrir o app. Use este botão para forçar a busca do sorteio mais recente.
        </p>
        <button
          type="button"
          onClick={atualizarCaixa}
          disabled={loading || !premium}
          className="btn-secondary"
        >
          Atualizar último concurso
        </button>
      </section>

      <section className="space-y-2 rounded-lg border border-slate-700/50 p-3">
        <h3 className="text-sm font-semibold text-slate-200">Recalcular estatísticas</h3>
        <p className="text-xs text-slate-400">
          Atualiza dezenas, critérios fortes, bases Pareto e percentuais de recorrência após importação.
        </p>
        <button
          type="button"
          onClick={recalcular}
          disabled={loading || !premium}
          className="btn-secondary"
        >
          Recalcular tudo
        </button>
      </section>
    </article>
  );
}
