'use client';

import { useState } from 'react';
import { Printer, FileDown } from 'lucide-react';
import type { JogoExportCompleto } from '@/lib/export';
import { CARTELAS_DISCLAIMER } from '@/lib/lotofacil/cartelas-pdf';

const STORAGE_KEY = 'lotofacil-cartelas-impressao';

export type JogoParaCartela = Pick<
  JogoExportCompleto,
  'dezenas' | 'numerosPorAposta' | 'valorAposta' | 'scoreEstatistico' | 'origemBase' | 'soma'
>;

function normalizarJogos(jogos: JogoParaCartela[]): JogoExportCompleto[] {
  return jogos.map((j) => ({
    dezenas: [...j.dezenas],
    numerosPorAposta: j.numerosPorAposta ?? j.dezenas.length,
    valorAposta: j.valorAposta,
    scoreEstatistico: j.scoreEstatistico,
    origemBase: j.origemBase,
    soma: j.soma,
  }));
}

export function BotaoImprimirCartelas({
  jogos,
  titulo = 'Fácil Analytics — Cartelas para transcrição',
  disabled,
  className = '',
  allowPdfDownload = true,
}: {
  jogos: JogoParaCartela[];
  titulo?: string;
  disabled?: boolean;
  className?: string;
  allowPdfDownload?: boolean;
}) {
  const [loading, setLoading] = useState(false);
  const [erro, setErro] = useState('');

  if (!jogos.length) return null;

  function abrirVisualizacao() {
    sessionStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({ jogos: normalizarJogos(jogos), titulo, disclaimer: CARTELAS_DISCLAIMER }),
    );
    window.open('/imprimir-cartelas', '_blank', 'noopener,noreferrer');
  }

  async function baixarPdf() {
    setLoading(true);
    setErro('');
    try {
      const res = await fetch('/api/export', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          formato: 'cartelas-pdf',
          jogos: normalizarJogos(jogos),
          titulo,
        }),
      });
      if (!res.ok) {
        const d = await res.json().catch(() => ({}));
        setErro(d.error ?? 'Erro ao gerar PDF');
        return;
      }
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'cartelas-lotofacil.pdf';
      a.click();
      URL.revokeObjectURL(url);
    } catch {
      setErro('Falha ao baixar PDF');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className={className}>
      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => abrirVisualizacao()}
          disabled={disabled || loading}
          className="btn-primary flex items-center gap-1 text-sm"
          title="Abre página para imprimir ou salvar como PDF pelo navegador"
        >
          <Printer className="h-4 w-4" />
          Imprimir cartelas
        </button>
        {allowPdfDownload && (
          <button
            type="button"
            onClick={() => void baixarPdf()}
            disabled={disabled || loading}
            className="btn-secondary flex items-center gap-1 text-sm"
          >
            <FileDown className="h-4 w-4" />
            {loading ? 'Gerando…' : 'PDF cartelas'}
          </button>
        )}
      </div>
      {erro && <p className="mt-1 text-xs text-red-400">{erro}</p>}
    </div>
  );
}

export { STORAGE_KEY as CARTELAS_STORAGE_KEY };
