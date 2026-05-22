'use client';

import { useCallback, useEffect, useState } from 'react';
import { DezenasGrid } from '@/components/DezenasGrid';
import { ParametrosGeracao } from '@/components/ParametrosGeracao';
import {
  carregarConfigLocal,
  configPadraoUI,
  configPremiumUI,
  salvarConfigLocal,
  uiToConfigGeracao,
  uiToRegrasSequencia,
  type ConfigGeracaoUI,
} from '@/lib/config-geracao-ui';
import { Copy, Download, Sparkles, Settings2 } from 'lucide-react';

interface Jogo {
  dezenas: number[];
  scoreEstatistico: number;
  soma: number;
  pares: number;
  impares?: number;
  repetidasUltimoConcurso: number;
  moldura: number;
  centro?: number;
  detalheScore?: Record<string, number>;
  origemBase?: string;
}

type Tab = 'gerar' | 'parametros';

export default function GeradorPage() {
  const [tab, setTab] = useState<Tab>('gerar');
  const [config, setConfig] = useState<ConfigGeracaoUI>(configPadraoUI());
  const [quantidade, setQuantidade] = useState(10);
  const [origemBase, setOrigemBase] = useState('20D');
  const [maxIguais, setMaxIguais] = useState(13);
  const [jogos, setJogos] = useState<Jogo[]>([]);
  const [loading, setLoading] = useState(false);
  const [erro, setErro] = useState('');
  const [info, setInfo] = useState('');
  const [ultimoConcurso, setUltimoConcurso] = useState<number | null>(null);

  const carregarDefaults = useCallback(() => {
    fetch('/api/config')
      .then((r) => r.json())
      .then((d) => {
        const salvo = carregarConfigLocal();
        if (salvo) setConfig(salvo);
        else if (d.configPremium) setConfig(d.configPremium);
        if (d.ultimoConcurso) setUltimoConcurso(d.ultimoConcurso);
        setInfo(`Base: ${d.totalConcursos} concursos · Último: #${d.ultimoConcurso} · Soma média: ${d.mediaSoma}`);
      })
      .catch(() => setErro('Não foi possível carregar configurações da API.'));
  }, []);

  useEffect(() => {
    carregarDefaults();
    if (typeof window !== 'undefined' && window.location.hash === '#parametros') {
      setTab('parametros');
    }
  }, [carregarDefaults]);

  function aplicarPerfil(tipo: 'padrao' | 'premium' | 'amplo') {
    if (tipo === 'premium') {
      fetch('/api/config')
        .then((r) => r.json())
        .then((d) => setConfig(d.configPremium ?? configPremiumUI()));
    } else if (tipo === 'amplo') {
      const c = configPadraoUI();
      c.criterios = c.criterios.map((cr) => {
        if (cr.nome === 'repetidas') return { ...cr, min: 7, max: 11, alvo: 9 };
        return cr;
      });
      c.scoreMinimo = 0;
      setConfig(c);
    } else {
      fetch('/api/config')
        .then((r) => r.json())
        .then((d) => setConfig(d.configPadrao ?? configPadraoUI()));
    }
  }

  function salvarParametros() {
    salvarConfigLocal(config);
    setInfo('Parâmetros salvos no navegador.');
  }

  async function gerar() {
    setLoading(true);
    setErro('');
    setInfo('Gerando jogos… aguarde (pode levar alguns segundos).');

    const configApi = uiToConfigGeracao(config);
    const regrasSequenciaAtraso = uiToRegrasSequencia(config);

    try {
      const res = await fetch('/api/gerador', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          quantidade,
          origemBase,
          maxDezenasIguais: maxIguais,
          salvar: true,
          config: configApi,
          regrasSequenciaAtraso,
          usarSequenciaAtraso: config.usarSequenciaAtraso,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setErro(data.error ?? 'Erro ao gerar');
        setJogos([]);
        return;
      }
      setJogos(data.jogos ?? []);
      setUltimoConcurso(data.ultimoConcurso ?? null);
      if (!data.jogos?.length) {
        setErro(
          'Nenhum jogo passou nos filtros. Afrouxe parâmetros (score mínimo, faixas ou desative critérios obrigatórios).',
        );
      } else {
        setInfo(`${data.jogos.length} jogos gerados · Concurso ref. #${data.ultimoConcurso}`);
        setTab('gerar');
        const texto = data.jogos
          .map((j: Jogo) => j.dezenas.map((d: number) => String(d).padStart(2, '0')).join(' '))
          .join('\n');
        sessionStorage.setItem('lotofacil-ultimos-jogos', texto);
      }
    } catch {
      setErro('Falha de conexão com o servidor. O dev está rodando em http://localhost:3010 ?');
    } finally {
      setLoading(false);
    }
  }

  function copiarJogos() {
    const texto = jogos
      .map((j) => j.dezenas.map((d) => String(d).padStart(2, '0')).join(' '))
      .join('\n');
    navigator.clipboard.writeText(texto);
    setInfo('Jogos copiados para a área de transferência.');
  }

  async function exportar(fmt: 'csv' | 'xlsx') {
    const res = await fetch('/api/export', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ formato: fmt, jogos, titulo: 'Lotofácil Analytics' }),
    });
    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `jogos.${fmt === 'xlsx' ? 'xlsx' : 'csv'}`;
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <section className="space-y-6">
      <header>
        <h1 className="text-2xl font-bold">Gerador de Jogos</h1>
        <p className="text-sm text-slate-400">
          Configure critérios, gere combinações filtradas e exporte. Score = aderência ao padrão histórico
          (não é garantia de prêmio).
        </p>
        {info && <p className="mt-2 text-sm text-brand-300">{info}</p>}
        {erro && <p className="mt-2 rounded-lg bg-red-950/50 px-3 py-2 text-sm text-red-300">{erro}</p>}
      </header>

      <div className="flex flex-wrap gap-2 border-b border-slate-700 pb-2">
        <button
          type="button"
          onClick={() => setTab('gerar')}
          className={`flex items-center gap-2 rounded-lg px-4 py-2 text-sm ${
            tab === 'gerar' ? 'bg-brand-600 text-white' : 'bg-slate-800 text-slate-300'
          }`}
        >
          <Sparkles className="h-4 w-4" />
          Gerar jogos
        </button>
        <button
          type="button"
          onClick={() => setTab('parametros')}
          className={`flex items-center gap-2 rounded-lg px-4 py-2 text-sm ${
            tab === 'parametros' ? 'bg-brand-600 text-white' : 'bg-slate-800 text-slate-300'
          }`}
        >
          <Settings2 className="h-4 w-4" />
          Parâmetros
        </button>
      </div>

      {tab === 'parametros' && (
        <>
          <article className="card flex flex-wrap gap-2">
            <span className="w-full text-xs text-slate-400">Perfis rápidos:</span>
            <button type="button" onClick={() => aplicarPerfil('premium')} className="btn-primary">
              Premium Estatístico
            </button>
            <button type="button" onClick={() => aplicarPerfil('padrao')} className="btn-secondary">
              Padrão
            </button>
            <button type="button" onClick={() => aplicarPerfil('amplo')} className="btn-secondary">
              Amplo (7–11 repetidas)
            </button>
            <button type="button" onClick={salvarParametros} className="btn-secondary">
              Salvar parâmetros
            </button>
          </article>
          <ParametrosGeracao config={config} onChange={setConfig} />
        </>
      )}

      {tab === 'gerar' && (
        <article className="card space-y-4">
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <label className="block text-sm">
              <span className="text-slate-400">Quantidade de jogos</span>
              <input
                type="number"
                min={1}
                max={200}
                value={quantidade}
                onChange={(e) => setQuantidade(Number(e.target.value))}
                className="input mt-1"
              />
            </label>
            <label className="block text-sm">
              <span className="text-slate-400">Base Pareto</span>
              <select
                value={origemBase}
                onChange={(e) => setOrigemBase(e.target.value)}
                className="input mt-1"
              >
                <option value="18D">18D conservadora</option>
                <option value="19D">19D intermediária</option>
                <option value="20D">20D ampla</option>
                <option value="Livre">Livre (1–25)</option>
              </select>
            </label>
            <label className="block text-sm">
              <span className="text-slate-400">Score mínimo (resumo)</span>
              <input
                type="number"
                value={config.scoreMinimo}
                onChange={(e) => setConfig({ ...config, scoreMinimo: Number(e.target.value) })}
                className="input mt-1"
              />
            </label>
            <label className="block text-sm">
              <span className="text-slate-400">Máx. dezenas iguais entre jogos</span>
              <input
                type="number"
                min={10}
                max={14}
                value={maxIguais}
                onChange={(e) => setMaxIguais(Number(e.target.value))}
                className="input mt-1"
              />
            </label>
          </div>
          <p className="text-xs text-slate-500">
            Último concurso na base: #{ultimoConcurso ?? '—'} · Edite faixas completas na aba Parâmetros.
          </p>
          <button
            type="button"
            onClick={() => void gerar()}
            disabled={loading}
            className="btn-primary w-full py-3 text-base md:w-auto"
          >
            {loading ? 'Gerando…' : 'Gerar jogos agora'}
          </button>
        </article>
      )}

      {jogos.length > 0 && (
        <article className="space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h2 className="text-sm font-semibold text-slate-300">
              Resultado — {jogos.length} jogos (ordenados por score)
            </h2>
            <div className="flex gap-2">
              <button type="button" onClick={copiarJogos} className="btn-secondary flex items-center gap-1">
                <Copy className="h-4 w-4" /> Copiar
              </button>
              <button type="button" onClick={() => exportar('csv')} className="btn-secondary flex items-center gap-1">
                <Download className="h-4 w-4" /> CSV
              </button>
              <button type="button" onClick={() => exportar('xlsx')} className="btn-secondary flex items-center gap-1">
                <Download className="h-4 w-4" /> Excel
              </button>
            </div>
          </div>
          {jogos.map((j, i) => (
            <article key={i} className="card">
              <div className="mb-2 flex flex-wrap justify-between gap-2">
                <span className="font-mono text-lg text-brand-400">
                  #{i + 1} · Score {j.scoreEstatistico.toFixed(1)}
                </span>
                <span className="text-xs text-slate-400">
                  Soma {j.soma} · Pares {j.pares} · Ímpares {j.impares ?? 15 - j.pares} · Rep.{' '}
                  {j.repetidasUltimoConcurso} · Moldura {j.moldura}
                </span>
              </div>
              <DezenasGrid dezenas={j.dezenas} />
              {j.detalheScore && (
                <p className="mt-2 text-xs text-slate-500">
                  {Object.entries(j.detalheScore)
                    .map(([k, v]) => `${k}: ${Number(v).toFixed(1)}`)
                    .join(' · ')}
                </p>
              )}
            </article>
          ))}
        </article>
      )}
    </section>
  );
}
