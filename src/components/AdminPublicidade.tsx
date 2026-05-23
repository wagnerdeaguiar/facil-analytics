'use client';

import { useCallback, useEffect, useState } from 'react';
import type { BannerPublicidade, PaginaCampanha } from '@/lib/site-banners';
import { MAX_BANNERS } from '@/lib/site-banners';
import { Plus, Save, RefreshCw, Trash2 } from 'lucide-react';

function novoBanner(ordem: number): BannerPublicidade {
  return {
    id: `banner-${Date.now()}`,
    titulo: '',
    descricao: '',
    linkSaibaMais: '',
    ctaTexto: '',
    destinoTipo: 'interno',
    destino: '/precos',
    ativo: false,
    ordem,
    variant: 'brand',
    icone: 'sparkles',
    precoRotulo: '',
    precoValor: '',
    precoSufixo: '',
    precoObs: '',
    planoSlug: '',
  };
}

interface PlanoOpcao {
  slug: string;
  nome: string;
  valor: number;
}

export function AdminPublicidade() {
  const [banners, setBanners] = useState<BannerPublicidade[]>([]);
  const [paginas, setPaginas] = useState<PaginaCampanha[]>([]);
  const [planos, setPlanos] = useState<PlanoOpcao[]>([]);
  const [loading, setLoading] = useState(true);
  const [salvando, setSalvando] = useState(false);
  const [msg, setMsg] = useState('');
  const [erro, setErro] = useState('');

  const carregar = useCallback(async () => {
    setLoading(true);
    try {
      const [pubRes, planosRes] = await Promise.all([
        fetch('/api/admin/config/banners'),
        fetch('/api/planos'),
      ]);
      const data = await pubRes.json();
      const planosData = await planosRes.json();
      setBanners(data.banners ?? []);
      setPaginas(data.paginas ?? []);
      setPlanos(
        (planosData.planos ?? [])
          .filter((p: PlanoOpcao & { valor: number }) => p.valor > 0)
          .map((p: PlanoOpcao) => ({ slug: p.slug, nome: p.nome, valor: p.valor })),
      );
    } catch {
      setErro('Falha ao carregar publicidade.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    carregar();
  }, [carregar]);

  function atualizarBanner(i: number, patch: Partial<BannerPublicidade>) {
    setBanners((prev) => prev.map((b, idx) => (idx === i ? { ...b, ...patch } : b)));
  }

  function atualizarPagina(i: number, patch: Partial<PaginaCampanha>) {
    setPaginas((prev) => prev.map((p, idx) => (idx === i ? { ...p, ...patch } : p)));
  }

  async function salvarBanners() {
    setSalvando(true);
    setMsg('');
    setErro('');
    const res = await fetch('/api/admin/config/banners', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ banners }),
    });
    const data = await res.json();
    setSalvando(false);
    if (res.ok) {
      setBanners(data.banners);
      setMsg('Cards salvos. Até 3 ativos aparecem na home em grade.');
    } else {
      setErro(data.error ?? 'Erro ao salvar banners.');
    }
  }

  async function salvarPaginas() {
    setSalvando(true);
    setMsg('');
    setErro('');
    const res = await fetch('/api/admin/config/banners', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ paginas }),
    });
    const data = await res.json();
    setSalvando(false);
    if (res.ok) {
      setPaginas(data.paginas);
      setMsg('Páginas de campanha salvas.');
    } else {
      setErro(data.error ?? 'Erro ao salvar páginas.');
    }
  }

  async function carregarModeloVazio() {
    setSalvando(true);
    setMsg('');
    setErro('');
    const res = await fetch('/api/admin/config/banners?acao=modelo-vazio', { method: 'POST' });
    const data = await res.json();
    setSalvando(false);
    if (res.ok) {
      setBanners(data.banners ?? []);
      setPaginas(data.paginas ?? []);
      setMsg(data.message ?? 'Exemplos carregados.');
    } else {
      setErro(data.error ?? 'Erro ao carregar exemplos.');
    }
  }

  if (loading) return <p className="text-sm text-slate-400">Carregando publicidade…</p>;

  const ativos = banners.filter((b) => b.ativo).length;

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold text-white">Publicidade na home</h2>
          <p className="text-xs text-slate-500">
            Até {MAX_BANNERS} cards promocionais na home (layout em grade, estilo vitrine). Destino: página
            interna, campanha ou link externo.
          </p>
        </div>
        <button type="button" onClick={carregar} className="btn-secondary text-xs">
          <RefreshCw className="mr-1 inline h-3.5 w-3.5" />
          Recarregar
        </button>
        <button type="button" onClick={carregarModeloVazio} disabled={salvando} className="btn-secondary text-xs">
          Novo modelo vazio
        </button>
      </div>

      {msg && <p className="text-sm text-emerald-400">{msg}</p>}
      {erro && <p className="text-sm text-red-400">{erro}</p>}

      <section className="card space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h3 className="text-sm font-semibold text-brand-300">
            Banners ({ativos}/{MAX_BANNERS} ativos na home)
          </h3>
          <button
            type="button"
            className="btn-secondary text-xs"
            onClick={() => setBanners((p) => [...p, novoBanner(p.length)])}
          >
            <Plus className="mr-1 inline h-3.5 w-3.5" />
            Novo banner
          </button>
        </div>

        {banners.map((b, i) => (
          <article key={b.id} className="space-y-3 rounded-lg border border-slate-700/50 p-4">
            <div className="flex flex-wrap items-center gap-3">
              <label className="flex items-center gap-2 text-xs text-slate-400">
                <input
                  type="checkbox"
                  checked={b.ativo}
                  onChange={(e) => atualizarBanner(i, { ativo: e.target.checked })}
                />
                Ativo na home
              </label>
              <label className="text-xs text-slate-400">
                Ordem
                <input
                  type="number"
                  min={0}
                  value={b.ordem}
                  onChange={(e) => atualizarBanner(i, { ordem: Number(e.target.value) })}
                  className="input ml-1 w-16"
                />
              </label>
              <label className="text-xs text-slate-400">
                Ícone
                <select
                  value={b.icone ?? 'sparkles'}
                  onChange={(e) =>
                    atualizarBanner(i, { icone: e.target.value as BannerPublicidade['icone'] })
                  }
                  className="input ml-1 w-32"
                >
                  <option value="sparkles">Estrelas</option>
                  <option value="crown">Premium</option>
                  <option value="chart">Gráfico</option>
                  <option value="target">Alvo</option>
                  <option value="shield">Escudo</option>
                  <option value="zap">Raio</option>
                  <option value="gift">Presente</option>
                  <option value="trending">Tendência</option>
                  <option value="users">Usuários</option>
                </select>
              </label>
              <label className="text-xs text-slate-400">
                Cor do card
                <select
                  value={b.variant ?? 'brand'}
                  onChange={(e) =>
                    atualizarBanner(i, { variant: e.target.value as BannerPublicidade['variant'] })
                  }
                  className="input ml-1 w-28"
                >
                  <option value="brand">Verde</option>
                  <option value="amber">Âmbar</option>
                  <option value="emerald">Esmeralda</option>
                  <option value="violet">Violeta</option>
                </select>
              </label>
              <button
                type="button"
                className="ml-auto text-xs text-red-400 hover:underline"
                onClick={() => setBanners((p) => p.filter((_, idx) => idx !== i))}
              >
                <Trash2 className="mr-1 inline h-3 w-3" />
                Remover
              </button>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <label className="text-xs text-slate-400 sm:col-span-2">
                Título
                <input
                  type="text"
                  value={b.titulo}
                  onChange={(e) => atualizarBanner(i, { titulo: e.target.value })}
                  className="input mt-1"
                />
              </label>
              <label className="text-xs text-slate-400 sm:col-span-2">
                Descrição (parágrafo do card)
                <textarea
                  value={b.descricao ?? b.subtitulo ?? ''}
                  onChange={(e) => atualizarBanner(i, { descricao: e.target.value })}
                  className="input mt-1 min-h-[72px]"
                  placeholder="Texto exibido no corpo do card, antes do link Saiba mais."
                />
              </label>
              <label className="text-xs text-slate-400">
                Texto &quot;Saiba mais&quot;
                <input
                  type="text"
                  value={b.linkSaibaMais ?? ''}
                  onChange={(e) => atualizarBanner(i, { linkSaibaMais: e.target.value })}
                  className="input mt-1"
                  placeholder="Saiba mais"
                />
              </label>
              <label className="text-xs text-slate-400">
                Texto do botão (CTA)
                <input
                  type="text"
                  value={b.ctaTexto}
                  onChange={(e) => atualizarBanner(i, { ctaTexto: e.target.value })}
                  className="input mt-1"
                />
              </label>
              <label className="text-xs text-slate-400 sm:col-span-2">
                Plano vinculado (preço automático do cadastro de planos)
                <select
                  value={b.planoSlug ?? ''}
                  onChange={(e) =>
                    atualizarBanner(i, { planoSlug: e.target.value || undefined })
                  }
                  className="input mt-1"
                >
                  <option value="">Nenhum — informar preço manualmente abaixo</option>
                  {planos.map((p) => (
                    <option key={p.slug} value={p.slug}>
                      {p.nome} (R$ {p.valor.toFixed(2)})
                    </option>
                  ))}
                </select>
              </label>
              <label className="text-xs text-slate-400">
                Rótulo do preço
                <input
                  type="text"
                  value={b.precoRotulo ?? ''}
                  onChange={(e) => atualizarBanner(i, { precoRotulo: e.target.value })}
                  className="input mt-1"
                  disabled={Boolean(b.planoSlug)}
                />
              </label>
              <label className="text-xs text-slate-400">
                Valor do preço
                <input
                  type="text"
                  value={b.precoValor ?? ''}
                  onChange={(e) => atualizarBanner(i, { precoValor: e.target.value })}
                  className="input mt-1"
                  disabled={Boolean(b.planoSlug)}
                  placeholder={b.planoSlug ? 'Puxado do plano' : ''}
                />
              </label>
              <label className="text-xs text-slate-400">
                Sufixo do preço
                <input
                  type="text"
                  value={b.precoSufixo ?? ''}
                  onChange={(e) => atualizarBanner(i, { precoSufixo: e.target.value })}
                  className="input mt-1"
                  disabled={Boolean(b.planoSlug)}
                />
              </label>
              <label className="text-xs text-slate-400 sm:col-span-2">
                Observação do preço (rodapé)
                <input
                  type="text"
                  value={b.precoObs ?? ''}
                  onChange={(e) => atualizarBanner(i, { precoObs: e.target.value })}
                  className="input mt-1"
                  placeholder="* Valores podem variar conforme o plano."
                />
              </label>
              <label className="text-xs text-slate-400">
                Tipo de destino
                <select
                  value={b.destinoTipo}
                  onChange={(e) =>
                    atualizarBanner(i, { destinoTipo: e.target.value as BannerPublicidade['destinoTipo'] })
                  }
                  className="input mt-1"
                >
                  <option value="campanha">Página de campanha</option>
                  <option value="interno">Rota interna (/precos, /manual…)</option>
                  <option value="externo">URL externa (https)</option>
                </select>
              </label>
              <label className="text-xs text-slate-400 sm:col-span-2">
                Destino{' '}
                <span className="text-slate-500">
                  {b.destinoTipo === 'campanha' && '(slug, ex: promo-premium)'}
                  {b.destinoTipo === 'interno' && '(ex: /precos)'}
                  {b.destinoTipo === 'externo' && '(https://…)'}
                </span>
                <input
                  type="text"
                  value={b.destino}
                  onChange={(e) => atualizarBanner(i, { destino: e.target.value.trim() })}
                  className="input mt-1"
                  placeholder={
                    b.destinoTipo === 'campanha'
                      ? 'promo-premium'
                      : b.destinoTipo === 'interno'
                        ? '/precos'
                        : 'https://'
                  }
                />
              </label>
            </div>
          </article>
        ))}

        {!banners.length && (
          <p className="text-sm text-slate-500">Nenhum card cadastrado. A home ficará sem vitrine promocional.</p>
        )}

        <button type="button" onClick={salvarBanners} disabled={salvando} className="btn-primary">
          <Save className="mr-1 inline h-4 w-4" />
          Salvar banners
        </button>
      </section>

      <section className="card space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h3 className="text-sm font-semibold text-brand-300">Páginas de campanha</h3>
          <button
            type="button"
            className="btn-secondary text-xs"
            onClick={() =>
              setPaginas((p) => [
                ...p,
                {
                  slug: `campanha-${Date.now()}`,
                  titulo: 'Nova campanha',
                  resumo: '',
                  corpo: '',
                  ativo: true,
                },
              ])
            }
          >
            <Plus className="mr-1 inline h-3.5 w-3.5" />
            Nova página
          </button>
        </div>
        <p className="text-xs text-slate-500">
          URL pública: <code className="text-brand-300">/campanha/seu-slug</code> — vincule no banner escolhendo
          destino &quot;Página de campanha&quot;.
        </p>

        {paginas.map((p, i) => (
          <article key={p.slug + i} className="space-y-3 rounded-lg border border-slate-700/50 p-4">
            <div className="flex flex-wrap items-center gap-3">
              <label className="flex items-center gap-2 text-xs text-slate-400">
                <input
                  type="checkbox"
                  checked={p.ativo}
                  onChange={(e) => atualizarPagina(i, { ativo: e.target.checked })}
                />
                Publicada
              </label>
              <button
                type="button"
                className="ml-auto text-xs text-red-400 hover:underline"
                onClick={() => setPaginas((prev) => prev.filter((_, idx) => idx !== i))}
              >
                Remover
              </button>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <label className="text-xs text-slate-400">
                Slug (URL)
                <input
                  type="text"
                  value={p.slug}
                  onChange={(e) =>
                    atualizarPagina(i, { slug: e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '') })
                  }
                  className="input mt-1"
                />
              </label>
              <label className="text-xs text-slate-400">
                Título
                <input
                  type="text"
                  value={p.titulo}
                  onChange={(e) => atualizarPagina(i, { titulo: e.target.value })}
                  className="input mt-1"
                />
              </label>
              <label className="text-xs text-slate-400 sm:col-span-2">
                Resumo (opcional)
                <input
                  type="text"
                  value={p.resumo ?? ''}
                  onChange={(e) => atualizarPagina(i, { resumo: e.target.value })}
                  className="input mt-1"
                />
              </label>
              <label className="text-xs text-slate-400 sm:col-span-2">
                Conteúdo (parágrafos separados por linha em branco)
                <textarea
                  value={p.corpo}
                  onChange={(e) => atualizarPagina(i, { corpo: e.target.value })}
                  className="input mt-1 min-h-[120px]"
                />
              </label>
              <label className="text-xs text-slate-400">
                Botão extra (opcional)
                <input
                  type="text"
                  value={p.ctaTexto ?? ''}
                  onChange={(e) => atualizarPagina(i, { ctaTexto: e.target.value })}
                  className="input mt-1"
                />
              </label>
              <label className="text-xs text-slate-400">
                URL do botão (/precos ou https)
                <input
                  type="text"
                  value={p.ctaUrl ?? ''}
                  onChange={(e) => atualizarPagina(i, { ctaUrl: e.target.value })}
                  className="input mt-1"
                />
              </label>
            </div>
          </article>
        ))}

        <button type="button" onClick={salvarPaginas} disabled={salvando} className="btn-primary">
          <Save className="mr-1 inline h-4 w-4" />
          Salvar páginas
        </button>
      </section>
    </div>
  );
}
