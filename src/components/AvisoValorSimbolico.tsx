'use client';

import { useEffect, useState } from 'react';
import { Info } from 'lucide-react';
import type { TextosPlataforma } from '@/lib/plataforma-textos';
import { TEXTOS_PLATAFORMA_VAZIOS } from '@/lib/plataforma-textos';

type Props = {
  compact?: boolean;
  className?: string;
  textos?: TextosPlataforma | null;
};

export function AvisoValorSimbolico({ compact, className = '', textos: textosProp }: Props) {
  const [textos, setTextos] = useState<TextosPlataforma | null>(textosProp ?? null);

  useEffect(() => {
    if (textosProp) {
      setTextos(textosProp);
      return;
    }
    fetch('/api/config/textos')
      .then((r) => r.json())
      .then((d) => setTextos(d.textos ?? TEXTOS_PLATAFORMA_VAZIOS))
      .catch(() => setTextos(TEXTOS_PLATAFORMA_VAZIOS));
  }, [textosProp]);

  if (!textos?.avisoValorTitulo) return null;

  return (
    <aside
      className={`rounded-xl border border-brand-700/30 bg-brand-950/25 px-4 py-3 ${className}`}
      role="note"
    >
      <div className="flex gap-3">
        <Info className="mt-0.5 h-4 w-4 shrink-0 text-brand-400" aria-hidden />
        <div>
          <p className="text-sm font-semibold text-brand-300">{textos.avisoValorTitulo}</p>
          {!compact && textos.avisoValorTexto && (
            <p className="mt-1 text-xs leading-relaxed text-slate-400">{textos.avisoValorTexto}</p>
          )}
        </div>
      </div>
    </aside>
  );
}
