'use client';

import { useCallback, useEffect, useState } from 'react';
import type { PlanLimits } from '@/lib/billing/types';
import { LIMITES_FREE, LIMITES_PREMIUM } from '@/lib/billing/types';
import { Save, Plus, RefreshCw } from 'lucide-react';

interface PlanoRow {
  id: string;
  slug: string;
  nome: string;
  descricao: string | null;
  valor: number;
  periodicidade: string;
  limites: PlanLimits;
  recursos: string[];
  ordem: number;
  ativo: boolean;
  destaque: boolean;
}

const LIMITES_VAZIO: PlanLimits = { ...LIMITES_FREE };

export function AdminPlanos() {
  const [planos, setPlanos] = useState<PlanoRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [salvando, setSalvando] = useState<string | null>(null);
  const [msg, setMsg] = useState('');
  const [erro, setErro] = useState('');

  const carregar = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/admin/planos');
      const data = await res.json();
      setPlanos(
        (data.planos ?? []).map((p: PlanoRow) => ({
          ...p,
          limites: (p.limites as PlanLimits) ?? LIMITES_VAZIO,
          recursos: Array.isArray(p.recursos) ? p.recursos : [],
        })),
      );
    } catch {
      setErro('Falha ao carregar planos.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    carregar();
  }, [carregar]);

  function atualizarPlano(id: string, patch: Partial<PlanoRow>) {
    setPlanos((prev) => prev.map((p) => (p.id === id ? { ...p, ...patch } : p)));
  }

  function atualizarLimite(id: string, campo: keyof PlanLimits, valor: number | boolean) {
    setPlanos((prev) =>
      prev.map((p) =>
        p.id === id ? { ...p, limites: { ...p.limites, [campo]: valor } } : p,
      ),
    );
  }

  async function salvar(plano: PlanoRow) {
    setSalvando(plano.id);
    setMsg('');
    setErro('');
    const res = await fetch('/api/admin/planos', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(plano),
    });
    const data = await res.json();
    setSalvando(null);
    if (res.ok) {
      setMsg(`Plano "${plano.nome}" salvo.`);
      setPlanos((prev) => prev.map((p) => (p.id === plano.id ? { ...p, ...data.plano, limites: data.plano.limites } : p)));
    } else {
      setErro(data.error ?? 'Erro ao salvar plano.');
    }
  }

  async function criarPremiumExtra() {
    setSalvando('new');
    const res = await fetch('/api/admin/planos', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        slug: `premium-${Date.now()}`,
        nome: 'Novo plano pago',
        valor: 9.9,
        periodicidade: 'monthly',
        limites: LIMITES_PREMIUM,
        recursos: ['Personalize os recursos'],
        ordem: planos.length,
        ativo: false,
        destaque: false,
      }),
    });
    setSalvando(null);
    if (res.ok) {
      setMsg('Novo plano criado (inativo). Edite e ative quando pronto.');
      carregar();
    } else {
      const data = await res.json();
      setErro(data.error ?? 'Erro ao criar plano.');
    }
  }

  if (loading) return <p className="text-sm text-slate-400">Carregando planos…</p>;

  return (
    <section className="card space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h3 className="text-sm font-semibold text-brand-300">Planos SaaS (Free, Premium…)</h3>
          <p className="text-xs text-slate-500">
            Defina preços, limites e recursos. Inadimplência bloqueia premium automaticamente via Asaas.
          </p>
        </div>
        <div className="flex gap-2">
          <button type="button" onClick={carregar} className="btn-secondary text-xs">
            <RefreshCw className="mr-1 inline h-3.5 w-3.5" />
            Recarregar
          </button>
          <button type="button" onClick={criarPremiumExtra} className="btn-secondary text-xs">
            <Plus className="mr-1 inline h-3.5 w-3.5" />
            Novo plano
          </button>
        </div>
      </div>

      {msg && <p className="text-sm text-emerald-400">{msg}</p>}
      {erro && <p className="text-sm text-red-400">{erro}</p>}

      <div className="space-y-6">
        {planos.map((plano) => (
          <article key={plano.id} className="rounded-lg border border-slate-700/60 p-4 space-y-3">
            <div className="flex flex-wrap items-center gap-3">
              <span className="rounded bg-slate-800 px-2 py-0.5 text-xs text-slate-400">{plano.slug}</span>
              <label className="flex items-center gap-2 text-xs text-slate-400">
                <input
                  type="checkbox"
                  checked={plano.ativo}
                  onChange={(e) => atualizarPlano(plano.id, { ativo: e.target.checked })}
                />
                Ativo
              </label>
              <label className="flex items-center gap-2 text-xs text-slate-400">
                <input
                  type="checkbox"
                  checked={plano.destaque}
                  onChange={(e) => atualizarPlano(plano.id, { destaque: e.target.checked })}
                />
                Destaque
              </label>
            </div>

            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              <label className="text-xs text-slate-400 sm:col-span-2">
                Nome
                <input
                  type="text"
                  value={plano.nome}
                  onChange={(e) => atualizarPlano(plano.id, { nome: e.target.value })}
                  className="input mt-1"
                />
              </label>
              <label className="text-xs text-slate-400">
                Valor (R$)
                <input
                  type="number"
                  step="0.01"
                  min={0}
                  value={plano.valor}
                  onChange={(e) => atualizarPlano(plano.id, { valor: Number(e.target.value) })}
                  className="input mt-1"
                  disabled={plano.slug === 'free'}
                />
              </label>
              <label className="text-xs text-slate-400">
                Periodicidade
                <select
                  value={plano.periodicidade}
                  onChange={(e) => atualizarPlano(plano.id, { periodicidade: e.target.value })}
                  className="input mt-1"
                  disabled={plano.slug === 'free'}
                >
                  <option value="none">Grátis</option>
                  <option value="monthly">Mensal</option>
                  <option value="yearly">Anual</option>
                </select>
              </label>
            </div>

            <label className="block text-xs text-slate-400">
              Descrição
              <textarea
                value={plano.descricao ?? ''}
                onChange={(e) => atualizarPlano(plano.id, { descricao: e.target.value })}
                className="input mt-1 min-h-[60px]"
              />
            </label>

            <div>
              <p className="mb-2 text-xs font-medium text-slate-300">Limites técnicos</p>
              <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4 text-xs">
                <label className="text-slate-400">
                  Máx. jogos
                  <input
                    type="number"
                    min={1}
                    value={plano.limites.maxJogos}
                    onChange={(e) => atualizarLimite(plano.id, 'maxJogos', Number(e.target.value))}
                    className="input mt-1"
                  />
                </label>
                <label className="text-slate-400">
                  Máx. dezenas
                  <input
                    type="number"
                    min={15}
                    max={20}
                    value={plano.limites.maxDezenas}
                    onChange={(e) => atualizarLimite(plano.id, 'maxDezenas', Number(e.target.value))}
                    className="input mt-1"
                  />
                </label>
                {(
                  [
                    ['salvarJogos', 'Salvar jogos'],
                    ['fechamento', 'Fechamento'],
                    ['simulador', 'Simulador'],
                    ['exportacao', 'Exportação'],
                    ['importConcursos', 'Import concursos'],
                    ['perfis', 'Perfis'],
                    ['dezenasFixas', 'Fixas/indesejadas'],
                    ['imprimirCartelas', 'Imprimir cartelas'],
                  ] as const
                ).map(([key, label]) => (
                  <label key={key} className="flex items-center gap-2 text-slate-400">
                    <input
                      type="checkbox"
                      checked={Boolean(plano.limites[key])}
                      onChange={(e) => atualizarLimite(plano.id, key, e.target.checked)}
                    />
                    {label}
                  </label>
                ))}
              </div>
            </div>

            <button
              type="button"
              onClick={() => salvar(plano)}
              disabled={salvando === plano.id}
              className="btn-primary text-xs"
            >
              <Save className="mr-1 inline h-3.5 w-3.5" />
              {salvando === plano.id ? 'Salvando…' : 'Salvar plano'}
            </button>
          </article>
        ))}
      </div>
    </section>
  );
}
