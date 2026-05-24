'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { DezenasGrid, MatrizLotofacil } from '@/components/DezenasGrid';
import { ParametrosGeracao } from '@/components/ParametrosGeracao';
import {
  carregarConfigLocal,
  carregarGeradorPrefs,
  configPadraoUI,
  LISTA_PERFIS,
  perfilBaseParaOrigem,
  perfilIdValido,
  perfilToUIById,
  salvarGeradorPrefs,
  uiToConfigGeracao,
  uiToRegrasSequencia,
  type ConfigGeracaoUI,
} from '@/lib/config-geracao-ui';
import { getPerfilConfig, type PerfilId } from '@/lib/lotofacil/perfis';
import {
  formatarPrecoAposta,
  type NumerosPorAposta,
} from '@/lib/lotofacil/aposta';
import { infoApostaComTabela } from '@/lib/lotofacil/aposta-config';
import { useTabelaAposta } from '@/hooks/useTabelaAposta';
import { Copy, Download, Sparkles, Settings2, Crown } from 'lucide-react';
import Link from 'next/link';
import { useSession } from 'next-auth/react';
import { isPremiumStatus } from '@/lib/subscription';
import { FREE_MAX_DEZENAS, FREE_MAX_JOGOS, LIMITES_PREMIUM } from '@/lib/plan-limits';
import { BotaoImprimirCartelas } from '@/components/BotaoImprimirCartelas';

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
  numerosPorAposta?: number;
  combinacoesInternas?: number;
  valorAposta?: number;
}

type Tab = 'gerar' | 'parametros';

export default function GeradorPage() {
  const { data: session } = useSession();
  const premium = isPremiumStatus(session?.user?.subscriptionStatus);
  const tabelaAposta = useTabelaAposta();
  const apostaInfoAtual = (n: number) => infoApostaComTabela(n, tabelaAposta);
  const opcoesDezenas = ([15, 16, 17, 18, 19, 20] as NumerosPorAposta[]);
  const [tab, setTab] = useState<Tab>('gerar');
  const [config, setConfig] = useState<ConfigGeracaoUI>(configPadraoUI());
  const [quantidade, setQuantidade] = useState(premium ? 10 : FREE_MAX_JOGOS);
  const [origemBase, setOrigemBase] = useState('20D');
  const [maxIguais, setMaxIguais] = useState(13);
  const [numerosPorAposta, setNumerosPorAposta] = useState<NumerosPorAposta>(15);
  const [jogos, setJogos] = useState<Jogo[]>([]);
  const [loading, setLoading] = useState(false);
  const [erro, setErro] = useState('');
  const [info, setInfo] = useState('');
  const [ultimoConcurso, setUltimoConcurso] = useState<number | null>(null);
  const [mediaSoma, setMediaSoma] = useState<number | undefined>();
  const [dezenasFixas, setDezenasFixas] = useState<Set<number>>(new Set());
  const [dezenasIndesejadas, setDezenasIndesejadas] = useState<Set<number>>(new Set());
  const [mostrarPrioridade, setMostrarPrioridade] = useState(false);
  const [modoPrioridade, setModoPrioridade] = useState<'fixa' | 'excluida'>('fixa');
  const [dezenasBase, setDezenasBase] = useState<Set<number>>(new Set());
  const prefsInicializadas = useRef(false);

  const persistirPrefs = useCallback(
    (cfg: ConfigGeracaoUI, base: string, max: number, qtd: number, nums: NumerosPorAposta) => {
      salvarGeradorPrefs({
        config: cfg,
        origemBase: base,
        maxDezenasIguais: max,
        quantidade: qtd,
        numerosPorAposta: nums,
      });
    },
    [],
  );

  const aplicarPerfilPorId = useCallback(
    (id: PerfilId, soma?: number) => {
      const perfil = getPerfilConfig(id);
      const ui = perfilToUIById(id, soma ?? mediaSoma);
      const base = perfilBaseParaOrigem(perfil.basePadrao);
      setConfig(ui);
      setOrigemBase(base);
      setMaxIguais(perfil.maxDezenasIguais);
      salvarGeradorPrefs({
        config: ui,
        origemBase: base,
        maxDezenasIguais: perfil.maxDezenasIguais,
        quantidade,
        numerosPorAposta,
      });
      setInfo(
        `Perfil "${perfil.nome}" aplicado · Base ${base} · Score mín. ${perfil.scoreMinimo} · Máx. iguais ${perfil.maxDezenasIguais}`,
      );
    },
    [mediaSoma, quantidade, numerosPorAposta],
  );

  const carregarDefaults = useCallback(() => {
    const perfilUrl =
      typeof window !== 'undefined'
        ? new URLSearchParams(window.location.search).get('perfil')
        : null;

    fetch('/api/config')
      .then((r) => r.json())
      .then((d) => {
        setMediaSoma(d.mediaSoma);
        if (perfilIdValido(perfilUrl)) {
          aplicarPerfilPorId(perfilUrl, d.mediaSoma);
          setTab('parametros');
          prefsInicializadas.current = true;
        } else if (!prefsInicializadas.current) {
          const prefs = carregarGeradorPrefs();
          if (prefs) {
            setConfig(prefs.config);
            setOrigemBase(prefs.origemBase);
            setMaxIguais(prefs.maxDezenasIguais);
            if (prefs.quantidade != null) setQuantidade(prefs.quantidade);
            if (prefs.numerosPorAposta != null)
              setNumerosPorAposta(prefs.numerosPorAposta as NumerosPorAposta);
          } else {
            const salvo = carregarConfigLocal();
            if (salvo) setConfig(salvo);
            else if (d.configPremium) setConfig(d.configPremium);
          }
          prefsInicializadas.current = true;
        }
        if (d.ultimoConcurso) setUltimoConcurso(d.ultimoConcurso);
        if (!perfilIdValido(perfilUrl)) {
          setInfo(`Base: ${d.totalConcursos} concursos · Último: #${d.ultimoConcurso} · Soma média: ${d.mediaSoma}`);
        }
      })
      .catch(() => setErro('Não foi possível carregar configurações da API.'));
  }, [aplicarPerfilPorId]);
  const maxDezenasBase =
    origemBase === '18D' ? 18 : origemBase === '19D' ? 19 : origemBase === '20D' ? 20 : 20;

  useEffect(() => {
    if (premium) return;
    setQuantidade((q) => Math.min(q, FREE_MAX_JOGOS));
    setNumerosPorAposta(FREE_MAX_DEZENAS as NumerosPorAposta);
  }, [premium]);

  useEffect(() => {
    if (!premium) {
      if (numerosPorAposta !== FREE_MAX_DEZENAS) setNumerosPorAposta(FREE_MAX_DEZENAS as NumerosPorAposta);
      return;
    }
    if (numerosPorAposta > maxDezenasBase) {
      setNumerosPorAposta(maxDezenasBase as NumerosPorAposta);
    }
  }, [maxDezenasBase, numerosPorAposta, premium]);

  useEffect(() => {
    if (origemBase === 'Livre') {
      setDezenasBase(new Set(Array.from({ length: 25 }, (_, i) => i + 1)));
      return;
    }
    fetch('/api/bases')
      .then((r) => r.json())
      .then((d) => {
        const b = (d.bases ?? []).find((x: { tipo: string }) => x.tipo === origemBase);
        if (b?.dezenas?.length) setDezenasBase(new Set(b.dezenas as number[]));
      })
      .catch(() => setDezenasBase(new Set()));
  }, [origemBase]);

  useEffect(() => {
    carregarDefaults();
    if (typeof window !== 'undefined' && window.location.hash === '#parametros') {
      setTab('parametros');
    }
  }, [carregarDefaults]);

  function aplicarPerfil(id: PerfilId) {
    aplicarPerfilPorId(id);
    setTab('parametros');
  }

  function salvarParametros() {
    persistirPrefs(config, origemBase, maxIguais, quantidade, numerosPorAposta);
    setInfo('Parâmetros salvos no navegador.');
  }

  useEffect(() => {
    if (!prefsInicializadas.current) return;
    const timer = window.setTimeout(() => {
      persistirPrefs(config, origemBase, maxIguais, quantidade, numerosPorAposta);
    }, 500);
    return () => window.clearTimeout(timer);
  }, [config, origemBase, maxIguais, quantidade, numerosPorAposta, persistirPrefs]);

  function onConfigChange(nova: ConfigGeracaoUI) {
    setConfig(nova);
  }
  async function gerar() {
    setLoading(true);
    setErro('');
    const apostaInfo = apostaInfoAtual(numerosPorAposta);
    setInfo(
      `Gerando ${quantidade} aposta(s) com ${numerosPorAposta} dezenas (${apostaInfo.combinacoes} combinações · ${formatarPrecoAposta(apostaInfo.preco)} cada)…`,
    );

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
          numerosPorAposta,
          salvar: premium,
          config: configApi,
          perfil: config.perfilId ?? undefined,
          regrasSequenciaAtraso,
          usarSequenciaAtraso: config.usarSequenciaAtraso,
          dezenasFixas: [...dezenasFixas],
          dezenasExcluidas: [...dezenasIndesejadas],
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        const bloqueios = data.viabilidade?.bloqueios as string[] | undefined;
        const msg =
          bloqueios?.length && bloqueios.length > 1
            ? `${data.error ?? 'Configuração inviável.'}\n${bloqueios.slice(1).join(' ')}`
            : (data.error ?? 'Erro ao gerar');
        setErro(msg);
        setJogos([]);
        return;
      }
      setJogos(data.jogos ?? []);
      setUltimoConcurso(data.ultimoConcurso ?? null);
      if (!data.jogos?.length) {
        const diag = data.diagnostico;
        const extra = diag
          ? ` Diagnóstico: ${diag.candidatosValidos} candidatos válidos na amostra, score máx. ${diag.scoreMaximo?.toFixed?.(1) ?? diag.scoreMaximo}, mínimo exigido ${diag.scoreMinimo}.`
          : '';
        setErro(
          `Nenhuma aposta passou nos filtros.${extra} Tente reduzir o score mínimo, usar 15–16 dezenas, ou afrouxar faixas na aba Parâmetros.`,
        );
      } else {
        const total = quantidade * apostaInfoAtual(numerosPorAposta).preco;
        const entregues = data.jogos.length;
        const parcial =
          entregues < quantidade
            ? ` · Solicitadas ${quantidade}, entregues ${entregues} (filtro de diversidade ou poucos candidatos no pool).`
            : '';
        const pm = data.prioridadeManual;
        const fixasMsg =
          pm?.fixas?.aplicadas?.length && dezenasFixas.size
            ? ` · Fixas: ${(pm.fixas.aplicadas as number[])
                .map((n: number) => String(n).padStart(2, '0'))
                .join(', ')}`
            : '';
        const exclMsg =
          pm?.excluidas?.aplicadas?.length && dezenasIndesejadas.size
            ? ` · Indesejadas: ${(pm.excluidas.aplicadas as number[])
                .map((n: number) => String(n).padStart(2, '0'))
                .join(', ')}`
            : '';
        const ampliadoMsg = pm?.fixas?.foraDaBase?.length
          ? ` · Pool ampliado (fora da base ${origemBase}: ${(pm.fixas.foraDaBase as number[])
              .map((n: number) => String(n).padStart(2, '0'))
              .join(', ')})`
          : '';
        setInfo(
          `${entregues} aposta(s) gerada(s) · ${numerosPorAposta} dezenas · Total ${formatarPrecoAposta(entregues * apostaInfoAtual(numerosPorAposta).preco)}${parcial}${fixasMsg}${exclMsg}${ampliadoMsg} · Concurso ref. #${data.ultimoConcurso}`,
        );
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
          (não é garantia de prêmio). Para reduzir bilhetes com cobertura combinatória, use{' '}
          <Link href="/fechamento" className="text-brand-400 underline">
            Fechamento
          </Link>
          .
        </p>
        {config.perfilId && (
          <p className="mt-1 text-xs text-slate-500">
            Perfil ativo: <span className="text-brand-300">{getPerfilConfig(config.perfilId).nome}</span>
            {' · '}
            <button type="button" className="underline hover:text-brand-200" onClick={() => setTab('parametros')}>
              ver parâmetros
            </button>
          </p>
        )}        {info && <p className="mt-2 text-sm text-brand-300">{info}</p>}
        {erro && <p className="mt-2 rounded-lg bg-red-950/50 px-3 py-2 text-sm text-red-300">{erro}</p>}
        {!premium && (
          <p className="mt-3 rounded-lg border border-amber-700/40 bg-amber-950/30 px-3 py-2 text-sm text-amber-100">
            <Crown className="mr-1 inline h-4 w-4 text-amber-400" />
            Plano gratuito: até <strong>{FREE_MAX_JOGOS} jogos</strong> de{' '}
            <strong>{FREE_MAX_DEZENAS} dezenas</strong>, com impressão.{' '}
            <Link href="/precos" className="text-brand-300 underline">
              Assine Premium
            </Link>{' '}
            para 16–20 dezenas, mais jogos, fechamento, simulador e exportação.
          </p>
        )}
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
          <article className="card space-y-3">
            <span className="block text-xs text-slate-400">
              Perfis de geração (mesmos da página Perfis):
            </span>
            <div className="flex flex-wrap gap-2">
              {LISTA_PERFIS.map((p) => (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => aplicarPerfil(p.id)}
                  className={
                    config.perfilId === p.id
                      ? 'btn-primary text-sm'
                      : 'btn-secondary text-sm'
                  }
                >
                  {p.nome}
                </button>
              ))}
            </div>
            <button type="button" onClick={salvarParametros} className="btn-secondary">
              Salvar parâmetros agora
            </button>
            <p className="text-xs text-slate-500">Alterações são salvas automaticamente neste navegador.</p>
          </article>
          <ParametrosGeracao config={config} onChange={onConfigChange} />
        </>
      )}

      {tab === 'gerar' && (
        <>
          <article className="card space-y-4">
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-5">
              <label className="block text-sm">
                <span className="text-slate-400">Quantidade de apostas</span>
                <input
                  type="number"
                  min={1}
                  max={premium ? LIMITES_PREMIUM.maxJogos : FREE_MAX_JOGOS}
                  value={quantidade}
                  onChange={(e) =>
                    setQuantidade(
                      Math.min(
                        Number(e.target.value) || 1,
                        premium ? LIMITES_PREMIUM.maxJogos : FREE_MAX_JOGOS,
                      ),
                    )
                  }
                  className="input mt-1"
                />
              </label>
              <label className="block text-sm">
                <span className="text-slate-400">Dezenas por aposta</span>
                <select
                  value={numerosPorAposta}
                  onChange={(e) => setNumerosPorAposta(Number(e.target.value) as NumerosPorAposta)}
                  className="input mt-1"
                  disabled={!premium}
                >
                  {opcoesDezenas
                    .filter((n) => (premium ? n <= maxDezenasBase : n === FREE_MAX_DEZENAS))
                    .map((n) => {
                    const t = tabelaAposta[n];
                    return (
                      <option key={n} value={n}>
                        {n} dezenas — {formatarPrecoAposta(t.preco)} ({t.combinacoes} comb.)
                      </option>
                    );
                  })}
                </select>
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
                  onChange={(e) =>
                    setConfig({ ...config, scoreMinimo: Number(e.target.value), perfilId: null })
                  }
                  className="input mt-1"
                />
              </label>
            <label className="block text-sm">
              <span className="text-slate-400">Máx. dezenas iguais entre apostas</span>
              <input
                type="number"
                min={10}
                max={19}
                value={maxIguais}
                onChange={(e) => setMaxIguais(Number(e.target.value))}
                className="input mt-1"
              />
              {numerosPorAposta > 15 && (
                <span className="mt-1 block text-xs text-slate-500">
                  Com {numerosPorAposta} dezenas na base {origemBase}, o limite de iguais é ajustado automaticamente.
                  {numerosPorAposta >= 19 && ' Na base 20D há poucas combinações válidas — espere menos apostas.'}
                </span>
              )}
            </label>
            </div>
            <p className="text-sm text-brand-300">
              Valor por aposta: {formatarPrecoAposta(apostaInfoAtual(numerosPorAposta).preco)} · Total estimado:{' '}
              {formatarPrecoAposta(quantidade * apostaInfoAtual(numerosPorAposta).preco)}
            </p>
            {numerosPorAposta >= 17 && config.scoreMinimo > 0 && (
              <p className="text-xs text-amber-400/90">
                Apostas com {numerosPorAposta} dezenas usam score mínimo ajustado (
                {Math.max(65, config.scoreMinimo - (numerosPorAposta - 16) * 2)}) — a média das{' '}
                {apostaInfoAtual(numerosPorAposta).combinacoes} combinações internas tende a ser menor que em 15 dezenas.
              </p>
            )}
            <p className="text-xs text-slate-500">
              Último concurso na base: #{ultimoConcurso ?? '—'} · Edite faixas completas na aba Parâmetros.
            </p>
            <div className="rounded-lg border border-slate-700/60 bg-slate-900/40 p-3">
              <button
                type="button"
                onClick={() => setMostrarPrioridade(!mostrarPrioridade)}
                className="text-sm font-medium text-brand-300"
              >
                Seleção manual — fixas ({dezenasFixas.size}) / indesejadas ({dezenasIndesejadas.size}){' '}
                {mostrarPrioridade ? '▾' : '▸'}
              </button>
              {mostrarPrioridade && (
                <div className="mt-3 space-y-3">
                  <p className="text-xs text-slate-500">
                    Fixas e indesejadas são o <strong>primeiro critério</strong>, com o mesmo peso: fixas entram em
                    todas as apostas, indesejadas nunca entram. Depois aplicam-se perfil, score e demais filtros
                    estatísticos. Se uma fixa estiver em sequência longa ou com atraso alto, o gerador ajusta as
                    regras de seq./atraso para não tornar o jogo impossível.
                  </p>
                  <div className="flex gap-2 text-xs">
                    <button
                      type="button"
                      onClick={() => setModoPrioridade('fixa')}
                      className={modoPrioridade === 'fixa' ? 'btn-primary text-xs' : 'btn-secondary text-xs'}
                    >
                      Marcar fixas
                    </button>
                    <button
                      type="button"
                      onClick={() => setModoPrioridade('excluida')}
                      className={modoPrioridade === 'excluida' ? 'btn-primary text-xs' : 'btn-secondary text-xs'}
                    >
                      Marcar indesejadas
                    </button>
                  </div>
                  {modoPrioridade === 'fixa' ? (
                    <>
                      <p className="text-xs text-slate-500">
                        Entram em <strong>todas</strong> as apostas (máx. 14). Fora da base Pareto, o pool é ampliado.
                      </p>
                      {[...dezenasFixas].some((f) => !dezenasBase.has(f)) && (
                        <p className="text-xs text-amber-400">
                          Fixa(s) fora da base {origemBase}:{' '}
                          {[...dezenasFixas]
                            .filter((f) => !dezenasBase.has(f))
                            .map((n) => String(n).padStart(2, '0'))
                            .join(', ')}
                        </p>
                      )}
                      <MatrizLotofacil
                        selecionadas={dezenasFixas}
                        estiloSelecao="fixa"
                        bloqueadas={dezenasIndesejadas}
                        maxSelecao={Math.min(14, numerosPorAposta - 1)}
                        onToggle={(n) => {
                          const nextFixas = new Set(dezenasFixas);
                          const nextExcl = new Set(dezenasIndesejadas);
                          if (nextFixas.has(n)) nextFixas.delete(n);
                          else if (nextFixas.size < 14 && nextFixas.size < numerosPorAposta) {
                            nextFixas.add(n);
                            nextExcl.delete(n);
                          }
                          setDezenasFixas(nextFixas);
                          setDezenasIndesejadas(nextExcl);
                        }}
                      />
                      {dezenasFixas.size > 0 && (
                        <button
                          type="button"
                          className="text-xs text-slate-400 underline"
                          onClick={() => setDezenasFixas(new Set())}
                        >
                          Limpar fixas
                        </button>
                      )}
                    </>
                  ) : (
                    <>
                      <p className="text-xs text-slate-500">
                        <strong>Nunca</strong> aparecem nas apostas. A mesma dezena não pode ser fixa e indesejada ao
                        mesmo tempo.
                      </p>
                      <MatrizLotofacil
                        selecionadas={dezenasIndesejadas}
                        estiloSelecao="excluida"
                        bloqueadas={dezenasFixas}
                        onToggle={(n) => {
                          const nextExcl = new Set(dezenasIndesejadas);
                          const nextFixas = new Set(dezenasFixas);
                          if (nextExcl.has(n)) nextExcl.delete(n);
                          else {
                            nextExcl.add(n);
                            nextFixas.delete(n);
                          }
                          setDezenasIndesejadas(nextExcl);
                          setDezenasFixas(nextFixas);
                        }}
                      />
                      {dezenasIndesejadas.size > 0 && (
                        <button
                          type="button"
                          className="text-xs text-slate-400 underline"
                          onClick={() => setDezenasIndesejadas(new Set())}
                        >
                          Limpar indesejadas
                        </button>
                      )}
                    </>
                  )}
                </div>
              )}
            </div>
            <button
              type="button"
              onClick={() => void gerar()}
              disabled={loading}
              className="btn-primary w-full py-3 text-base md:w-auto"
            >
              {loading ? 'Gerando…' : 'Gerar apostas agora'}
            </button>
          </article>

          <article className="card text-sm text-slate-300">
            <h2 className="mb-2 font-semibold text-slate-200">Como jogar na lotérica</h2>
            <p className="text-slate-400">
              Marque de <strong>15 a 20 números</strong> entre 01 e 25. Cada aposta gera automaticamente todas
              as combinações de 15 dezenas — quanto mais números, mais combinações e maior o valor.
            </p>
            <ul className="mt-2 grid gap-1 text-xs text-slate-500 sm:grid-cols-2 lg:grid-cols-3">
              {opcoesDezenas.map((n) => {
                const t = tabelaAposta[n];
                return (
                  <li key={n}>
                    {n} dezenas → {t.combinacoes} jogos de 15 · {formatarPrecoAposta(t.preco)}
                  </li>
                );
              })}
            </ul>
            <p className="mt-2 text-xs text-slate-500">
              Na lotérica, informe quantas dezenas deseja marcar ou use o volante completo. Os números gerados
              aqui podem ser transcritos diretamente no volante ou terminal de apostas.
            </p>
          </article>
        </>
      )}

      {jogos.length > 0 && (
        <article className="space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h2 className="text-sm font-semibold text-slate-300">
              Resultado — {jogos.length} aposta(s) (ordenadas por score)
            </h2>
            <div className="flex flex-wrap items-center gap-2">
              <BotaoImprimirCartelas
                jogos={jogos}
                titulo="Fácil Analytics — Gerador · Cartelas para transcrição"
                allowPdfDownload={premium}
              />
              <button type="button" onClick={copiarJogos} className="btn-secondary flex items-center gap-1">
                <Copy className="h-4 w-4" /> Copiar
              </button>
              {premium && (
                <>
                  <button type="button" onClick={() => exportar('csv')} className="btn-secondary flex items-center gap-1">
                    <Download className="h-4 w-4" /> CSV
                  </button>
                  <button type="button" onClick={() => exportar('xlsx')} className="btn-secondary flex items-center gap-1">
                    <Download className="h-4 w-4" /> Excel
                  </button>
                </>
              )}
            </div>
          </div>
          {jogos.map((j, i) => (
            <article key={i} className="card">
              <div className="mb-2 flex flex-wrap justify-between gap-2">
                <span className="font-mono text-lg text-brand-400">
                  #{i + 1} · Score {j.scoreEstatistico.toFixed(1)}
                  {(j.numerosPorAposta ?? j.dezenas.length) > 15 && (
                    <span className="ml-2 text-sm text-slate-400">
                      · {j.numerosPorAposta ?? j.dezenas.length} dezenas ·{' '}
                      {formatarPrecoAposta(j.valorAposta ?? apostaInfoAtual(j.dezenas.length).preco)}
                    </span>
                  )}
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
