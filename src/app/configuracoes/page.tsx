'use client';

import { useState } from 'react';

export default function ConfiguracoesPage() {
  const [csv, setCsv] = useState('');
  const [msg, setMsg] = useState('');
  const [loading, setLoading] = useState(false);

  async function importarCsv() {
    setLoading(true);
    setMsg('');
    const res = await fetch('/api/concursos', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ formato: 'csv', conteudo: csv }),
    });
    const data = await res.json();
    setMsg(res.ok ? `Importados ${data.inseridos} concursos.` : data.error ?? 'Erro');
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
    setLoading(false);
  }

  async function importarXlsx(opcoes?: { de?: number; ate?: number; substituir?: boolean }) {
    setLoading(true);
    setMsg('');
    const res = await fetch('/api/concursos/import-xlsx', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        substituir: opcoes?.substituir ?? true,
        concursoDe: opcoes?.de,
        concursoAte: opcoes?.ate,
        caminho: 'C:\\Users\\KAPAM\\Downloads\\Lotofácil.xlsx',
      }),
    });
    const data = await res.json();
    if (res.ok) {
      const r = data.resumo;
      setMsg(
        `Excel: ${data.inseridos} concursos (${data.periodo?.de}–${data.periodo?.ate}). Total na base: ${data.total}.` +
          (r ? ` Arquivo: ${r.totalLinhas} linhas, concurso ${r.primeiro}–${r.ultimo}.` : ''),
      );
    } else {
      setMsg(data.error ?? 'Erro');
    }
    setLoading(false);
  }

  async function importarMazu3442() {
    setLoading(true);
    setMsg('');
    const res = await fetch('/api/concursos/import-bundled', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ substituir: true }),
    });
    const data = await res.json();
    if (res.ok) {
      setMsg(
        `Importados ${data.inseridos} concursos (${data.periodo?.de}–${data.periodo?.ate}). Repetidas média: ${data.repetidasGeral?.media}.`,
      );
    } else {
      setMsg(data.error ?? 'Erro na importação');
    }
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
    <section className="space-y-6">
      <header>
        <h1 className="text-2xl font-bold">Configurações</h1>
        <p className="text-sm text-slate-400">Importação, atualização e recálculo estatístico.</p>
      </header>

      {msg && <p className="rounded-lg bg-slate-800 px-3 py-2 text-sm text-brand-300">{msg}</p>}

      <article className="card space-y-3 border-brand-700/40">
        <h2 className="text-sm font-semibold text-brand-300">Importar Lotofácil.xlsx (Downloads)</h2>
        <p className="text-xs text-slate-400">
          Planilha com <strong>3.687 concursos</strong> (concurso 1 até o mais recente). Colunas: Concurso,
          Data, Bola1–Bola15. Caminho padrão:{' '}
          <code className="text-brand-300">C:\Users\KAPAM\Downloads\Lotofácil.xlsx</code>
        </p>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => importarXlsx({ de: 3442, ate: 3542 })}
            disabled={loading}
            className="btn-primary"
          >
            Excel: 3442–3542 (101)
          </button>
          <button
            type="button"
            onClick={() => importarXlsx()}
            disabled={loading}
            className="btn-secondary"
          >
            Excel: histórico completo
          </button>
        </div>
      </article>

      <article className="card space-y-3 border-brand-700/40">
        <h2 className="text-sm font-semibold text-brand-300">Importar TXT MazuSoft 3442–3542</h2>
        <p className="text-xs text-slate-400">
          Carrega o arquivo{' '}
          <code className="text-brand-300">data/lotofacil-resultados-3442-3542.txt</code> (copiado dos
          seus Downloads). Formato: <code>3542 - 01,02,05,...</code>
        </p>
        <button type="button" onClick={importarMazu3442} disabled={loading} className="btn-primary">
          Importar 101 concursos (3442–3542)
        </button>
      </article>

      <article className="card space-y-3">
        <h2 className="text-sm font-semibold">Importar texto / CSV</h2>
        <p className="text-xs text-slate-400">
          Formato: numero_concurso;dd/mm/aaaa;d1 d2 ... d15 — ou uma linha só com 15 dezenas.
        </p>
        <textarea
          value={csv}
          onChange={(e) => setCsv(e.target.value)}
          className="input min-h-[120px] font-mono text-xs"
          placeholder="3500;18/05/2026;01 02 03 ..."
        />
        <button type="button" onClick={importarCsv} disabled={loading} className="btn-primary">
          Importar histórico
        </button>
      </article>

      <article className="card space-y-3">
        <h2 className="text-sm font-semibold">Atualizar último concurso (API)</h2>
        <p className="text-xs text-slate-400">
          Sincroniza automaticamente ao abrir o app (a partir do último concurso na base). Aqui
          força atualização via{' '}
          <a
            href="https://github.com/guto-alves/loterias-api"
            target="_blank"
            rel="noopener noreferrer"
            className="text-brand-400 underline"
          >
            Loterias API
          </a>
          .
        </p>
        <button type="button" onClick={atualizarCaixa} disabled={loading} className="btn-secondary">
          Atualizar último concurso
        </button>
      </article>

      <article className="card space-y-3">
        <h2 className="text-sm font-semibold">Recalcular estatísticas</h2>
        <p className="text-xs text-slate-400">
          Atualiza dezenas, critérios fortes, bases Pareto e percentuais de recorrência.
        </p>
        <button type="button" onClick={recalcular} disabled={loading} className="btn-secondary">
          Recalcular tudo
        </button>
      </article>
    </section>
  );
}


