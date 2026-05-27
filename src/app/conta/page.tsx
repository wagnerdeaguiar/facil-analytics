'use client';

import { useSession } from 'next-auth/react';
import Link from 'next/link';
import { isPremiumStatus } from '@/lib/subscription';
import { useCallback, useEffect, useState } from 'react';
import { PlanosSection } from '@/components/PlanosSection';
import type { PlanLimits } from '@/lib/billing/types';

interface ContaInfo {
  cpf: string;
  telefone: string;
  status: string;
  plano: string;
  planoSlug: string;
  planoId: string | null;
  premium: boolean;
  dataInicio?: string;
  dataRenovacao?: string;
  dataCancelamento?: string | null;
  acessoPremiumAte?: string | null;
  valor?: number;
  gateway?: string;
  limites?: PlanLimits;
  pagamentos: {
    id: string;
    valor: number;
    status: string;
    metodo: string | null;
    dueDate: string | null;
    paidAt: string | null;
    gatewayInvoiceUrl: string | null;
    plano: { nome: string } | null;
  }[];
  cobrancaPendente?: {
    gatewayInvoiceUrl: string | null;
    status: string;
    valor: number;
  };
}

const STATUS: Record<string, string> = {
  free: 'Gratuito',
  pending: 'Aguardando pagamento',
  active: 'Ativo',
  trial: 'Trial',
  past_due: 'Inadimplente',
  canceled: 'Cancelado',
};

const LIMITES_LABEL: Partial<Record<keyof PlanLimits, string>> = {
  maxJogos: 'Jogos por geração',
  maxDezenas: 'Dezenas por jogo',
  salvarJogos: 'Salvar jogos',
  fechamento: 'Fechamento',
  simulador: 'Simulador retroativo',
  exportacao: 'Exportação',
  importConcursos: 'Importar concursos',
  perfis: 'Perfis avançados',
  dezenasFixas: 'Dezenas fixas',
  imprimirCartelas: 'Imprimir cartelas',
};

export default function ContaPage() {
  const { data: session, update } = useSession();
  const [info, setInfo] = useState<ContaInfo | null>(null);
  const [cpf, setCpf] = useState('');
  const [telefone, setTelefone] = useState('');
  const [salvando, setSalvando] = useState(false);
  const [cancelando, setCancelando] = useState(false);
  const [excluindo, setExcluindo] = useState(false);
  const [msg, setMsg] = useState('');

  const recarregar = useCallback(() => {
    if (!session?.user?.id) return;
    fetch('/api/conta')
      .then((r) => r.json())
      .then((d) => {
        setInfo(d);
        setCpf(d.cpf ?? '');
        setTelefone(d.telefone ?? '');
      })
      .catch(() => null);
  }, [session?.user?.id]);

  useEffect(() => {
    recarregar();
  }, [recarregar]);

  async function salvarDados() {
    setSalvando(true);
    setMsg('');
    const res = await fetch('/api/conta', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ cpf, telefone }),
    });
    const data = await res.json();
    setSalvando(false);
    if (res.ok) setMsg('Dados salvos.');
    else setMsg(data.error ?? 'Erro ao salvar.');
  }

  async function exportarDados() {
    const res = await fetch('/api/conta/export');
    if (!res.ok) {
      setMsg('Erro ao exportar dados.');
      return;
    }
    const data = await res.json();
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `sortefacil-dados-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
    setMsg('Exportação baixada.');
  }

  async function excluirConta() {
    if (
      !confirm(
        'Excluir sua conta permanentemente? Todos os jogos, perfis e histórico serão apagados. Esta ação não pode ser desfeita.',
      )
    ) {
      return;
    }
    setExcluindo(true);
    setMsg('');
    const res = await fetch('/api/conta', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ confirm: 'EXCLUIR' }),
    });
    const data = await res.json();
    setExcluindo(false);
    if (res.ok) {
      window.location.href = '/';
      return;
    }
    setMsg(data.error ?? 'Erro ao excluir conta.');
  }

  async function cancelarPlano() {
    if (
      !confirm(
        'Cancelar assinatura? Você deixa de ser cobrado. Se já pagou o período atual, mantém o premium até a data de renovação; caso contrário, volta ao gratuito imediatamente.',
      )
    ) {
      return;
    }
    setCancelando(true);
    setMsg('');
    const res = await fetch('/api/billing/cancel', { method: 'POST' });
    const data = await res.json();
    setCancelando(false);
    if (res.ok) {
      setMsg(data.message ?? 'Assinatura cancelada.');
      await update();
      recarregar();
    } else {
      setMsg(data.error ?? 'Erro ao cancelar.');
    }
  }

  if (!session?.user) {
    return (
      <p className="text-slate-400">
        <Link href="/entrar" className="text-brand-400 underline">
          Faça login
        </Link>{' '}
        para ver sua conta.
      </p>
    );
  }

  const premium = isPremiumStatus(session.user.subscriptionStatus);

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-white">Minha Conta</h1>
      <div className="card flex gap-4">
        {session.user.image && (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={session.user.image} alt="" className="h-16 w-16 rounded-full" />
        )}
        <div>
          <p className="font-semibold text-white">{session.user.name}</p>
          <p className="text-sm text-slate-400">{session.user.email}</p>
          <p className="mt-2 text-sm">
            Plano:{' '}
            <span className={premium ? 'text-emerald-400' : 'text-slate-300'}>
              {info?.plano ?? (premium ? 'Premium' : 'Gratuito')}
            </span>
            {info?.status && (
              <span className="ml-2 text-xs text-slate-500">({STATUS[info.status] ?? info.status})</span>
            )}
          </p>
        </div>
      </div>

      {info?.status === 'past_due' && (
        <p className="rounded-lg border border-red-800/40 bg-red-950/30 p-3 text-sm text-red-200">
          Mensalidade em aberto — o acesso premium está bloqueado. Regularize o pagamento abaixo.
        </p>
      )}

      {info?.status === 'pending' && (
        <p className="rounded-lg border border-amber-800/40 bg-amber-950/30 p-3 text-sm text-amber-100">
          Assinatura pendente de pagamento. Enquanto não confirmar, você permanece no plano gratuito.
        </p>
      )}

      <section className="card space-y-4">
        <h2 className="text-sm font-semibold text-slate-200">Gerenciar plano</h2>
        <p className="text-xs text-slate-500">
          Faça upgrade para um plano pago ou volte ao gratuito. Trocas entre planos pagos geram nova cobrança via
          Asaas.
        </p>
        {msg && <p className="text-xs text-brand-300">{msg}</p>}
        <PlanosSection
          modo="conta"
          planoAtualSlug={info?.planoSlug}
          planoAtualId={info?.planoId ?? undefined}
          dataCancelamento={info?.dataCancelamento}
          acessoPremiumAte={info?.acessoPremiumAte}
          onCancelar={cancelarPlano}
          cancelando={cancelando}
        />
      </section>

      {info?.limites && (
        <section className="card">
          <h2 className="mb-3 text-sm font-semibold text-slate-200">O que seu plano inclui</h2>
          <ul className="grid gap-2 text-sm text-slate-300 sm:grid-cols-2">
            {(Object.entries(info.limites) as [keyof PlanLimits, boolean | number][]).map(([k, v]) => {
              const label = LIMITES_LABEL[k];
              if (!label) return null;
              const ativo = typeof v === 'boolean' ? v : v > 0;
              return (
                <li key={k} className={ativo ? 'text-slate-300' : 'text-slate-600 line-through'}>
                  {label}
                  {typeof v === 'number' && ativo ? `: ${v}` : ''}
                </li>
              );
            })}
          </ul>
        </section>
      )}

      <section className="card space-y-3">
        <h2 className="text-sm font-semibold text-slate-200">Dados para cobrança (Asaas)</h2>
        <p className="text-xs text-slate-500">CPF obrigatório para assinar planos pagos via PIX, boleto ou cartão.</p>
        <div className="grid gap-3 sm:grid-cols-2">
          <label className="text-xs text-slate-400">
            CPF
            <input
              type="text"
              value={cpf}
              onChange={(e) => setCpf(e.target.value.replace(/\D/g, '').slice(0, 11))}
              className="input mt-1"
              placeholder="Somente números"
            />
          </label>
          <label className="text-xs text-slate-400">
            Telefone (WhatsApp)
            <input
              type="text"
              value={telefone}
              onChange={(e) => setTelefone(e.target.value.replace(/\D/g, '').slice(0, 11))}
              className="input mt-1"
            />
          </label>
        </div>
        <button type="button" onClick={salvarDados} disabled={salvando} className="btn-primary text-sm">
          {salvando ? 'Salvando…' : 'Salvar dados'}
        </button>
      </section>

      {info && (
        <dl className="card grid gap-2 text-sm text-slate-300 md:grid-cols-2">
          {info.dataInicio && <div>Início: {new Date(info.dataInicio).toLocaleDateString('pt-BR')}</div>}
          {info.dataRenovacao && (
            <div>Próxima renovação: {new Date(info.dataRenovacao).toLocaleDateString('pt-BR')}</div>
          )}
          {info.valor != null && info.valor > 0 && <div>Valor: R$ {info.valor.toFixed(2)}</div>}
          {info.gateway && <div>Gateway: {info.gateway}</div>}
        </dl>
      )}

      {info?.cobrancaPendente?.gatewayInvoiceUrl && (
        <a
          href={info.cobrancaPendente.gatewayInvoiceUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="btn-primary inline-block"
        >
          Pagar cobrança pendente (R$ {info.cobrancaPendente.valor.toFixed(2)})
        </a>
      )}

      {info?.pagamentos?.length ? (
        <section className="card overflow-x-auto">
          <h2 className="mb-3 text-sm font-semibold text-slate-200">Histórico de cobranças</h2>
          <table className="w-full text-left text-xs">
            <thead className="text-slate-400">
              <tr>
                <th className="pb-2">Plano</th>
                <th>Valor</th>
                <th>Status</th>
                <th>Vencimento</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {info.pagamentos.map((p) => (
                <tr key={p.id} className="border-t border-slate-700/50">
                  <td className="py-2">{p.plano?.nome ?? '—'}</td>
                  <td>R$ {p.valor.toFixed(2)}</td>
                  <td>{p.status}</td>
                  <td>{p.dueDate ? new Date(p.dueDate).toLocaleDateString('pt-BR') : '—'}</td>
                  <td>
                    {p.gatewayInvoiceUrl && (
                      <a href={p.gatewayInvoiceUrl} target="_blank" rel="noopener noreferrer" className="text-brand-400 underline">
                        Fatura
                      </a>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
      ) : null}

      <section className="card space-y-3 border-slate-700/60">
        <h2 className="text-sm font-semibold text-slate-200">Privacidade (LGPD)</h2>
        <p className="text-xs text-slate-500">
          Você pode exportar seus dados ou solicitar exclusão da conta. Cobranças já processadas podem ser mantidas
          pelo gateway conforme obrigação legal.
        </p>
        <div className="flex flex-wrap gap-2">
          <button type="button" onClick={() => void exportarDados()} className="btn-secondary text-xs">
            Baixar meus dados (JSON)
          </button>
          <button
            type="button"
            onClick={() => void excluirConta()}
            disabled={excluindo}
            className="rounded-lg border border-red-800/50 px-3 py-2 text-xs text-red-300 hover:bg-red-950/40"
          >
            {excluindo ? 'Excluindo…' : 'Excluir minha conta'}
          </button>
        </div>
        <p className="text-[11px] text-slate-500">
          Política completa em{' '}
          <Link href="/privacidade" className="underline">
            privacidade
          </Link>
          .
        </p>
      </section>
    </div>
  );
}

