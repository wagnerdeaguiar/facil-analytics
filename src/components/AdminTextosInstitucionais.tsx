'use client';

import { useCallback, useEffect, useState } from 'react';
import type { TextosPlataforma } from '@/lib/plataforma-textos';
import { TEXTOS_PLATAFORMA_VAZIOS } from '@/lib/plataforma-textos';
import { Save, RefreshCw } from 'lucide-react';

export function AdminTextosInstitucionais() {
  const [textos, setTextos] = useState<TextosPlataforma>(TEXTOS_PLATAFORMA_VAZIOS);
  const [loading, setLoading] = useState(true);
  const [salvando, setSalvando] = useState(false);
  const [msg, setMsg] = useState('');
  const [erro, setErro] = useState('');

  const carregar = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/admin/config/textos');
      const data = await res.json();
      setTextos(data.textos ?? TEXTOS_PLATAFORMA_VAZIOS);
    } catch {
      setErro('Falha ao carregar textos.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    carregar();
  }, [carregar]);

  function atualizar(campo: keyof TextosPlataforma, valor: string) {
    setTextos((prev) => ({ ...prev, [campo]: valor }));
  }

  async function salvar() {
    setSalvando(true);
    setMsg('');
    setErro('');
    const res = await fetch('/api/admin/config/textos', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ textos }),
    });
    const data = await res.json();
    setSalvando(false);
    if (res.ok) {
      setTextos(data.textos);
      setMsg('Textos salvos. Aparecem na landing, preços e cards de planos.');
    } else {
      setErro(data.error ?? 'Erro ao salvar.');
    }
  }

  if (loading) return <p className="text-sm text-slate-400">Carregando textos…</p>;

  return (
    <section className="card space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h2 className="text-lg font-semibold text-white">Textos institucionais</h2>
          <p className="text-xs text-slate-500">
            Tudo exibido na landing, página de preços e avisos — nada fixo no código. Preencha os campos abaixo.
          </p>
        </div>
        <button type="button" onClick={carregar} className="btn-secondary text-xs">
          <RefreshCw className="mr-1 inline h-3.5 w-3.5" />
          Recarregar
        </button>
      </div>

      {msg && <p className="text-sm text-emerald-400">{msg}</p>}
      {erro && <p className="text-sm text-red-400">{erro}</p>}

      <div className="grid gap-4 md:grid-cols-2">
        <label className="text-xs text-slate-400 md:col-span-2">
          Aviso — título (landing, preços, conta)
          <input
            type="text"
            value={textos.avisoValorTitulo}
            onChange={(e) => atualizar('avisoValorTitulo', e.target.value)}
            className="input mt-1"
          />
        </label>
        <label className="text-xs text-slate-400 md:col-span-2">
          Aviso — texto completo
          <textarea
            value={textos.avisoValorTexto}
            onChange={(e) => atualizar('avisoValorTexto', e.target.value)}
            className="input mt-1 min-h-[80px]"
          />
        </label>
        <label className="text-xs text-slate-400 md:col-span-2">
          Texto curto abaixo do preço nos cards de plano
          <input
            type="text"
            value={textos.avisoValorTextoCurto}
            onChange={(e) => atualizar('avisoValorTextoCurto', e.target.value)}
            className="input mt-1"
          />
        </label>

        <label className="text-xs text-slate-400">
          Landing planos — rótulo pequeno
          <input
            type="text"
            value={textos.landingPlanosRotulo}
            onChange={(e) => atualizar('landingPlanosRotulo', e.target.value)}
            className="input mt-1"
          />
        </label>
        <label className="text-xs text-slate-400">
          Landing planos — título
          <input
            type="text"
            value={textos.landingPlanosTitulo}
            onChange={(e) => atualizar('landingPlanosTitulo', e.target.value)}
            className="input mt-1"
          />
        </label>
        <label className="text-xs text-slate-400 md:col-span-2">
          Landing planos — subtítulo
          <textarea
            value={textos.landingPlanosSubtitulo}
            onChange={(e) => atualizar('landingPlanosSubtitulo', e.target.value)}
            className="input mt-1 min-h-[64px]"
          />
        </label>
        <label className="text-xs text-slate-400 md:col-span-2">
          Página /precos — introdução
          <textarea
            value={textos.precosIntro}
            onChange={(e) => atualizar('precosIntro', e.target.value)}
            className="input mt-1 min-h-[64px]"
          />
        </label>
        <label className="text-xs text-slate-400">
          Botão do plano gratuito (landing)
          <input
            type="text"
            value={textos.planoBotaoGratis}
            onChange={(e) => atualizar('planoBotaoGratis', e.target.value)}
            className="input mt-1"
          />
        </label>
        <label className="text-xs text-slate-400">
          Botão do plano pago (landing)
          <input
            type="text"
            value={textos.planoBotaoPago}
            onChange={(e) => atualizar('planoBotaoPago', e.target.value)}
            className="input mt-1"
          />
        </label>
      </div>

      <button type="button" onClick={salvar} disabled={salvando} className="btn-primary">
        <Save className="mr-1 inline h-4 w-4" />
        Salvar textos
      </button>
    </section>
  );
}
