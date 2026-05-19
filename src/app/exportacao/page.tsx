'use client';

import { useState } from 'react';

export default function ExportacaoPage() {
  const [jogosTexto, setJogosTexto] = useState('');

  function colarGerados() {
    const raw = sessionStorage.getItem('lotofacil-ultimos-jogos');
    if (raw) setJogosTexto(raw);
  }

  async function exportar(formato: 'csv' | 'xlsx' | 'pdf') {
    const linhas = jogosTexto.split(/\r?\n/).filter(Boolean);
    const jogos = linhas.map((linha) => {
      const dezenas = linha
        .split(/[\s,;]+/)
        .map((n) => parseInt(n, 10))
        .filter((n) => n >= 1 && n <= 25);
      return { dezenas, soma: dezenas.reduce((a, b) => a + b, 0) };
    });

    const res = await fetch('/api/export', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ formato, jogos, titulo: 'Fácil Analytics' }),
    });

    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `jogos.${formato === 'xlsx' ? 'xlsx' : formato}`;
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <section className="space-y-6">
      <header>
        <h1 className="text-2xl font-bold">Exportação</h1>
        <p className="text-sm text-slate-400">
          Exporte jogos para CSV, Excel ou PDF com todas as colunas (D1–D15, métricas e status).
        </p>
      </header>

      <article className="card space-y-3">
        <textarea
          value={jogosTexto}
          onChange={(e) => setJogosTexto(e.target.value)}
          placeholder="Cole os jogos gerados (uma linha por jogo)"
          className="input min-h-[160px] font-mono"
        />
        <div className="flex flex-wrap gap-2">
          <button type="button" onClick={colarGerados} className="btn-secondary">
            Colar jogos do gerador
          </button>
          <button type="button" onClick={() => exportar('csv')} className="btn-secondary">
            CSV
          </button>
          <button type="button" onClick={() => exportar('xlsx')} className="btn-secondary">
            Excel
          </button>
          <button type="button" onClick={() => exportar('pdf')} className="btn-primary">
            PDF
          </button>
        </div>
      </article>
    </section>
  );
}

