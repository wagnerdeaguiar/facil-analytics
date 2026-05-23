'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { MatrizLotofacil } from '@/components/DezenasGrid';
import { DezenasGrid } from '@/components/DezenasGrid';
import { formatarPrecoAposta } from '@/lib/lotofacil/aposta';
import { infoApostaComTabela } from '@/lib/lotofacil/aposta-config';
import { useTabelaAposta } from '@/hooks/useTabelaAposta';
import { AlertTriangle, Copy, Grid3X3, Info } from 'lucide-react';
import { BotaoImprimirCartelas } from '@/components/BotaoImprimirCartelas';

type ModoSelecao = 'pool' | 'fixas' | 'excluidas';

export default function FechamentoPage() {
  const tabelaAposta = useTabelaAposta();
  const precoBilhete15 = infoApostaComTabela(15, tabelaAposta).preco;
  const [pool, setPool] = useState<Set<number>>(new Set());
  const [fixas, setFixas] = useState<Set<number>>(new Set());
  const [excluidas, setExcluidas] = useState<Set<number>>(new Set());
  const [modo, setModo] = useState<ModoSelecao>('pool');
  const [origemBase, setOrigemBase] = useState('20D');
  const [garantia, setGarantia] = useState(14);
  const [condicao, setCondicao] = useState(15);
  const [percentual, setPercentual] = useState(100);
  const [maxBilhetes, setMaxBilhetes] = useState(400);
  const [aplicarFiltros, setAplicarFiltros] = useState(false);
  const [loading, setLoading] = useState(false);
  const [erro, setErro] = useState('');
  const [resultado, setResultado] = useState<{
    bilhetes: number[][];
    totalBilhetes: number;
    custoEstimado: number;
    coberturaPercentual: number;
    cenariosTotal: number;
    cenariosCobertos: number;
    avisos: string[];
    disclaimer: string;
  } | null>(null);

  const carregarBase = useCallback(() => {
    fetch('/api/bases')
      .then((r) => r.json())
      .then((d) => {
        const dezenas = (d.bases ?? []).find((x: { tipo: string }) => x.tipo === origemBase)?.dezenas;
        if (dezenas?.length) setPool(new Set(dezenas));
      })
      .catch(() => {});
  }, [origemBase]);

  useEffect(() => {
    carregarBase();
  }, [carregarBase]);

  function toggle(n: number) {
    if (modo === 'pool') {
      const next = new Set(pool);
      if (next.has(n)) {
        next.delete(n);
        const f = new Set(fixas);
        f.delete(n);
        setFixas(f);
        const e = new Set(excluidas);
        e.delete(n);
        setExcluidas(e);
      } else if (next.size < 25) {
        next.add(n);
      }
      setPool(next);
    } else if (modo === 'fixas') {
      const nextFixas = new Set(fixas);
      const nextExcl = new Set(excluidas);
      if (nextFixas.has(n)) {
        nextFixas.delete(n);
      } else if (nextFixas.size < 14) {
        nextFixas.add(n);
        nextExcl.delete(n);
        const nextPool = new Set(pool);
        nextPool.add(n);
        setPool(nextPool);
      }
      setFixas(nextFixas);
      setExcluidas(nextExcl);
    } else {
      if (!pool.has(n)) return;
      const nextExcl = new Set(excluidas);
      const nextFixas = new Set(fixas);
      if (nextExcl.has(n)) nextExcl.delete(n);
      else {
        nextExcl.add(n);
        nextFixas.delete(n);
      }
      setExcluidas(nextExcl);
      setFixas(nextFixas);
    }
  }

  async function gerar() {
    setLoading(true);
    setErro('');
    setResultado(null);
    const res = await fetch('/api/fechamento', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        pool: [...pool],
        dezenasFixas: [...fixas],
        dezenasExcluidas: [...excluidas],
        origemBase: pool.size < 16 ? origemBase : undefined,
        garantia,
        condicao,
        percentualCobertura: percentual,
        maxBilhetes,
        aplicarFiltrosEstatisticos: aplicarFiltros,
      }),
    });
    const data = await res.json();
    setLoading(false);
    if (!res.ok) {
      setErro(data.error ?? 'Erro');
      return;
    }
    setResultado(data);
    if (data.bilhetes?.length) {
      const texto = data.bilhetes
        .map((b: number[]) => b.map((d) => String(d).padStart(2, '0')).join(' '))
        .join('\n');
      sessionStorage.setItem('lotofacil-ultimos-jogos', texto);
    }
  }

  function copiar() {
    if (!resultado?.bilhetes.length) return;
    const texto = resultado.bilhetes
      .map((b) => b.map((d) => String(d).padStart(2, '0')).join(' '))
      .join('\n');
    navigator.clipboard.writeText(texto);
  }

  const selecionadas =
    modo === 'pool' ? pool : modo === 'fixas' ? fixas : excluidas;
  const estiloSelecao = modo === 'excluidas' ? 'excluida' : 'fixa';
  const bloqueadas =
    modo === 'fixas' ? excluidas : modo === 'excluidas' ? fixas : new Set<number>();

  return (
    <section className="space-y-6">
      <header>
        <h1 className="text-2xl font-bold">Fechamento combinatório</h1>
        <p className="text-sm text-slate-400">
          Reduz bilhetes de 15 dezenas dentro de um universo escolhido, com cobertura matemática condicional. Complementa
          o gerador estatístico — não prevê sorteios.
        </p>
      </header>

      <article className="card flex gap-3 border-amber-700/40 bg-amber-950/20 text-sm text-amber-100/90">
        <AlertTriangle className="h-5 w-5 shrink-0 text-amber-400" />
        <div>
          <p className="font-medium text-amber-200">Aviso importante</p>
          <p className="mt-1 text-xs text-amber-100/80">
            A garantia combinatória só se aplica se o sorteio cumprir a <strong>condição</strong> configurada (ex.: as
            15 dezenas sorteadas estiverem dentro do seu universo). Isso{' '}
            <strong>não elimina o acaso</strong> nem garante lucro. Lotofácil é jogo de azar — jogue com
            responsabilidade.
          </p>
        </div>
      </article>

      <div className="grid gap-6 lg:grid-cols-2">
        <article className="card space-y-4">
          <h2 className="text-sm font-semibold text-brand-300">Universo e dezenas fixas</h2>
          <div className="flex flex-wrap gap-2">
            <select value={origemBase} onChange={(e) => setOrigemBase(e.target.value)} className="input max-w-[140px]">
              <option value="18D">Base 18D</option>
              <option value="19D">Base 19D</option>
              <option value="20D">Base 20D</option>
            </select>
            <button type="button" onClick={carregarBase} className="btn-secondary text-xs">
              Carregar base Pareto
            </button>
          </div>
          <div className="flex flex-wrap gap-2 text-xs">
            <button
              type="button"
              onClick={() => setModo('pool')}
              className={modo === 'pool' ? 'btn-primary text-xs' : 'btn-secondary text-xs'}
            >
              Cercar ({pool.size})
            </button>
            <button
              type="button"
              onClick={() => setModo('fixas')}
              className={modo === 'fixas' ? 'btn-primary text-xs' : 'btn-secondary text-xs'}
            >
              Fixas ({fixas.size})
            </button>
            <button
              type="button"
              onClick={() => setModo('excluidas')}
              className={modo === 'excluidas' ? 'btn-primary text-xs' : 'btn-secondary text-xs'}
            >
              Indesejadas ({excluidas.size})
            </button>
          </div>
          <p className="text-xs text-slate-500">
            {modo === 'pool'
              ? 'Clique para incluir/excluir dezenas do universo (mín. 16 após indesejadas).'
              : modo === 'fixas'
                ? 'Fixas entram em todos os bilhetes (máx. 14). Fora do universo, o pool é ampliado — igual ao gerador.'
                : 'Indesejadas nunca aparecem nos bilhetes (somente dentro do universo).'}
          </p>
          <MatrizLotofacil
            selecionadas={selecionadas}
            estiloSelecao={estiloSelecao}
            bloqueadas={bloqueadas}
            onToggle={toggle}
            maxSelecao={modo === 'fixas' ? 14 : modo === 'excluidas' ? pool.size : 25}
          />
        </article>

        <article className="card space-y-4">
          <h2 className="text-sm font-semibold text-brand-300">Parâmetros do fechamento</h2>
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="text-xs text-slate-400">
              Garantia mínima (pts)
              <select value={garantia} onChange={(e) => setGarantia(Number(e.target.value))} className="input mt-1">
                {[11, 12, 13, 14].map((g) => (
                  <option key={g} value={g}>
                    {g} pontos
                  </option>
                ))}
              </select>
            </label>
            <label className="text-xs text-slate-400">
              Condição (dezenas no pool)
              <input
                type="number"
                min={11}
                max={15}
                value={condicao}
                onChange={(e) => setCondicao(Number(e.target.value))}
                className="input mt-1"
              />
            </label>
            <label className="text-xs text-slate-400">
              Cobertura alvo (%)
              <input
                type="number"
                min={50}
                max={100}
                value={percentual}
                onChange={(e) => setPercentual(Number(e.target.value))}
                className="input mt-1"
              />
            </label>
            <label className="text-xs text-slate-400">
              Máx. bilhetes
              <input
                type="number"
                min={10}
                max={800}
                value={maxBilhetes}
                onChange={(e) => setMaxBilhetes(Number(e.target.value))}
                className="input mt-1"
              />
            </label>
          </div>
          <label className="flex items-center gap-2 text-xs text-slate-400">
            <input type="checkbox" checked={aplicarFiltros} onChange={(e) => setAplicarFiltros(e.target.checked)} />
            Aplicar filtros estatísticos padrão após o fechamento (pode reduzir cobertura)
          </label>
          <button type="button" onClick={gerar} disabled={loading || pool.size < 16} className="btn-primary w-full">
            {loading ? 'Calculando…' : 'Gerar fechamento'}
          </button>
          {pool.size < 16 && (
            <p className="text-xs text-amber-400">Selecione ao menos 16 dezenas no universo.</p>
          )}
        </article>
      </div>

      {erro && <p className="text-sm text-red-400">{erro}</p>}

      {resultado && (
        <article className="card space-y-4">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <h2 className="text-sm font-semibold text-slate-200">Resultado</h2>
              <p className="mt-1 text-xs text-slate-400">
                {resultado.totalBilhetes} bilhete(s) · Custo estimado{' '}
                {formatarPrecoAposta(resultado.custoEstimado)} · Cobertura{' '}
                {resultado.coberturaPercentual}% ({resultado.cenariosCobertos}/{resultado.cenariosTotal} cenários)
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <BotaoImprimirCartelas
                jogos={resultado.bilhetes.map((dezenas) => ({
                  dezenas,
                  numerosPorAposta: 15,
                  valorAposta: precoBilhete15,
                }))}
                titulo="Fácil Analytics — Fechamento · Cartelas para transcrição"
              />
              <button type="button" onClick={copiar} className="btn-secondary text-xs">
                <Copy className="mr-1 inline h-3 w-3" />
                Copiar
              </button>
              <Link href="/simulador" className="btn-secondary text-xs">
                Simular no histórico
              </Link>
            </div>
          </div>
          {resultado.avisos.map((a) => (
            <p key={a} className="flex gap-2 text-xs text-amber-300">
              <Info className="h-3.5 w-3.5 shrink-0" />
              {a}
            </p>
          ))}
          <p className="text-[11px] text-slate-500">{resultado.disclaimer}</p>
          <ul className="max-h-[420px] space-y-2 overflow-y-auto">
            {resultado.bilhetes.slice(0, 80).map((b, i) => (
              <li key={i} className="rounded-lg bg-slate-800/50 px-3 py-2">
                <span className="text-xs text-slate-500">#{i + 1}</span>
                <DezenasGrid dezenas={b} size="sm" />
              </li>
            ))}
          </ul>
          {resultado.bilhetes.length > 80 && (
            <p className="text-xs text-slate-500">Exibindo 80 de {resultado.bilhetes.length} bilhetes.</p>
          )}
        </article>
      )}

      <article className="card text-xs text-slate-500">
        <Grid3X3 className="mb-2 h-4 w-4 text-brand-400" />
        <p>
          <strong className="text-slate-300">Exemplo:</strong> 20 dezenas cercadas, garantia 14, condição 15 — se as
          15 sorteadas estiverem entre as suas 20, a cobertura busca assegurar ao menos um bilhete com 14 acertos, com
          bem menos cartões que jogar todas as combinações (15.504). Valide no{' '}
          <Link href="/simulador" className="text-brand-400 underline">
            Simulador
          </Link>{' '}
          antes de apostar.
        </p>
      </article>
    </section>
  );
}
