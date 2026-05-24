'use client';

import { useCallback, useEffect, useState } from 'react';
import { RefreshCw } from 'lucide-react';

interface Resumo {
  totalRecebido: number;
  qtdRecebidos: number;
  totalPendente: number;
  qtdPendentes: number;
  totalAtrasado: number;
  qtdAtrasados: number;
  assinaturasAtivas: number;
  assinaturasInadimplentes: number;
  mrrEstimado: number;
}

interface PagamentoRow {
  id: string;
  valor: number;
  status: string;
  metodo: string | null;
  dueDate: string | null;
  paidAt: string | null;
  createdAt: string;
  gatewayInvoiceUrl: string | null;
  user: { name: string | null; email: string };
  plano: { nome: string; slug: string } | null;
}

const STATUS_LABEL: Record<string, string> = {
  pending: 'Pendente',
  confirmed: 'Confirmado',
  received: 'Recebido',
  overdue: 'Atrasado',
  canceled: 'Cancelado',
  refunded: 'Estornado',
  failed: 'Falhou',
};

export function AdminFaturamento() {
  const [resumo, setResumo] = useState<Resumo | null>(null);
  const [pagamentos, setPagamentos] = useState<PagamentoRow[]>([]);
  const [filtro, setFiltro] = useState('');
  const [loading, setLoading] = useState(true);
  const [asaasTest, setAsaasTest] = useState<string | null>(null);
  const [testandoAsaas, setTestandoAsaas] = useState(false);

  const carregar = useCallback(async () => {
    setLoading(true);
    try {
      const q = filtro ? `?status=${filtro}` : '';
      const res = await fetch(`/api/admin/faturamento${q}`);
      const data = await res.json();
      setResumo(data.resumo);
      setPagamentos(data.pagamentos?.items ?? []);
    } catch {
      /* ignore */
    } finally {
      setLoading(false);
    }
  }, [filtro]);

  useEffect(() => {
    carregar();
  }, [carregar]);

  async function testarAsaas() {
    setTestandoAsaas(true);
    setAsaasTest(null);
    try {
      const res = await fetch('/api/admin/billing/test');
      const data = await res.json();
      if (data.ok) {
        setAsaasTest(
          `Asaas OK (${data.env}) · Webhook ${data.webhookConfigured ? 'configurado' : 'SEM TOKEN'} · ${data.webhookUrl}`,
        );
      } else {
        setAsaasTest(data.error ?? data.message ?? 'Falha na conexão Asaas');
      }
    } catch {
      setAsaasTest('Erro ao testar Asaas');
    } finally {
      setTestandoAsaas(false);
    }
  }

  if (loading && !resumo) {
    return <p className="text-sm text-slate-400">Carregando faturamento…</p>;
  }

  return (
    <section className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h3 className="text-sm font-semibold text-brand-300">Faturamento e cobranças (Asaas)</h3>
          <p className="text-xs text-slate-500">
            Mensalidade em dia libera premium; pendente/atrasado mantém apenas o plano free.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button type="button" onClick={() => void testarAsaas()} disabled={testandoAsaas} className="btn-secondary text-xs">
            {testandoAsaas ? 'Testando…' : 'Testar Asaas'}
          </button>
          <button type="button" onClick={carregar} className="btn-secondary text-xs">
            <RefreshCw className="mr-1 inline h-3.5 w-3.5" />
            Atualizar
          </button>
        </div>
      </div>
      {asaasTest && (
        <p className={`text-xs ${asaasTest.startsWith('Asaas OK') ? 'text-emerald-400' : 'text-amber-300'}`}>
          {asaasTest}
        </p>
      )}

      {resumo && (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <div className="card">
            <p className="text-xs text-slate-400">Recebido (total)</p>
            <p className="text-xl font-bold text-emerald-400">
              R$ {resumo.totalRecebido.toFixed(2)}
            </p>
            <p className="text-[11px] text-slate-500">{resumo.qtdRecebidos} pagamentos</p>
          </div>
          <div className="card">
            <p className="text-xs text-slate-400">MRR estimado</p>
            <p className="text-xl font-bold">R$ {resumo.mrrEstimado.toFixed(2)}</p>
            <p className="text-[11px] text-slate-500">{resumo.assinaturasAtivas} ativas</p>
          </div>
          <div className="card">
            <p className="text-xs text-slate-400">Pendente</p>
            <p className="text-xl font-bold text-amber-400">R$ {resumo.totalPendente.toFixed(2)}</p>
            <p className="text-[11px] text-slate-500">{resumo.qtdPendentes} cobranças</p>
          </div>
          <div className="card">
            <p className="text-xs text-slate-400">Inadimplente</p>
            <p className="text-xl font-bold text-red-400">R$ {resumo.totalAtrasado.toFixed(2)}</p>
            <p className="text-[11px] text-slate-500">
              {resumo.assinaturasInadimplentes} assinaturas · {resumo.qtdAtrasados} cobranças
            </p>
          </div>
        </div>
      )}

      <div className="card overflow-x-auto">
        <div className="mb-3 flex flex-wrap gap-2">
          <select value={filtro} onChange={(e) => setFiltro(e.target.value)} className="input text-xs w-40">
            <option value="">Todos status</option>
            {Object.entries(STATUS_LABEL).map(([v, l]) => (
              <option key={v} value={v}>
                {l}
              </option>
            ))}
          </select>
        </div>
        <table className="w-full text-left text-xs">
          <thead className="text-slate-400">
            <tr>
              <th className="pb-2">Data</th>
              <th>Usuário</th>
              <th>Plano</th>
              <th>Valor</th>
              <th>Status</th>
              <th>Método</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {pagamentos.map((p) => (
              <tr key={p.id} className="border-t border-slate-700/50">
                <td className="py-2">{new Date(p.createdAt).toLocaleDateString('pt-BR')}</td>
                <td>
                  <div>{p.user.name ?? '—'}</div>
                  <div className="text-slate-500">{p.user.email}</div>
                </td>
                <td>{p.plano?.nome ?? '—'}</td>
                <td>R$ {p.valor.toFixed(2)}</td>
                <td>
                  <span
                    className={
                      p.status === 'overdue'
                        ? 'text-red-400'
                        : ['confirmed', 'received'].includes(p.status)
                          ? 'text-emerald-400'
                          : 'text-amber-300'
                    }
                  >
                    {STATUS_LABEL[p.status] ?? p.status}
                  </span>
                </td>
                <td className="uppercase">{p.metodo ?? '—'}</td>
                <td>
                  {p.gatewayInvoiceUrl && (
                    <a
                      href={p.gatewayInvoiceUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-brand-400 underline"
                    >
                      Fatura
                    </a>
                  )}
                </td>
              </tr>
            ))}
            {!pagamentos.length && (
              <tr>
                <td colSpan={7} className="py-4 text-center text-slate-500">
                  Nenhuma cobrança registrada ainda.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </section>
  );
}
