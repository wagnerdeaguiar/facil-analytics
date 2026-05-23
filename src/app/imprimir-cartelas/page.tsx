'use client';

import { useEffect, useState } from 'react';
import { CartelaVolanteImpressao } from '@/components/CartelaVolanteImpressao';
import { CARTELAS_STORAGE_KEY } from '@/components/BotaoImprimirCartelas';
import type { JogoExportCompleto } from '@/lib/export';
import { Printer } from 'lucide-react';

export default function ImprimirCartelasPage() {
  const [dados, setDados] = useState<{
    jogos: JogoExportCompleto[];
    titulo: string;
    disclaimer: string;
  } | null>(null);

  useEffect(() => {
    try {
      const raw = sessionStorage.getItem(CARTELAS_STORAGE_KEY);
      if (!raw) return;
      setDados(JSON.parse(raw) as { jogos: JogoExportCompleto[]; titulo: string; disclaimer: string });
    } catch {
      /* ignore */
    }
  }, []);

  if (!dados?.jogos?.length) {
    return (
      <div className="mx-auto max-w-lg p-8 text-center text-slate-600">
        <p className="text-lg font-medium">Nenhuma cartela para imprimir</p>
        <p className="mt-2 text-sm">
          Gere jogos no <strong>Gerador</strong> ou <strong>Fechamento</strong> e use o botão &quot;Imprimir
          cartelas&quot;.
        </p>
      </div>
    );
  }

  const { jogos, titulo, disclaimer } = dados;

  return (
    <div className="imprimir-cartelas-root min-h-screen bg-white text-black">
      <header className="no-print sticky top-0 z-10 border-b border-slate-200 bg-white px-4 py-3 shadow-sm">
        <div className="mx-auto flex max-w-3xl flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-lg font-bold text-slate-900">{titulo}</h1>
            <p className="text-xs text-slate-600">{jogos.length} aposta(s)</p>
          </div>
          <button
            type="button"
            onClick={() => window.print()}
            className="inline-flex items-center gap-2 rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-500"
          >
            <Printer className="h-4 w-4" />
            Imprimir / Salvar PDF
          </button>
        </div>
      </header>

      <main className="mx-auto max-w-3xl px-4 py-6 print:max-w-none print:px-0">
        <p className="mb-6 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-xs text-amber-950 print:mb-4 print:text-[10px]">
          {disclaimer}
        </p>
        <p className="mb-4 text-sm text-slate-700 print:text-xs">
          Marque <strong>Transcrito</strong> (caneta na caixa ☐ do PDF, ou ticando abaixo na tela) conforme for
          preenchendo cada volante oficial na lotérica.
        </p>

        <div className="grid gap-6 print:gap-4">
          {jogos.map((j, i) => (
            <CartelaVolanteImpressao
              key={i}
              dezenas={j.dezenas}
              numero={i + 1}
              total={jogos.length}
              qtdDezenas={j.numerosPorAposta ?? j.dezenas.length}
              valor={j.valorAposta}
              score={j.scoreEstatistico}
            />
          ))}
        </div>
      </main>
    </div>
  );
}
