import clsx from 'clsx';

const MOLDURA = new Set([1, 2, 3, 4, 5, 6, 10, 11, 15, 16, 20, 21, 22, 23, 24, 25]);

export function DezenasGrid({
  dezenas,
  highlight,
  size = 'md',
}: {
  dezenas: number[];
  highlight?: Set<number>;
  size?: 'sm' | 'md';
}) {
  const sorted = [...dezenas].sort((a, b) => a - b);
  return (
    <div className="flex flex-wrap gap-1.5">
      {sorted.map((d) => (
        <span
          key={d}
          className={clsx(
            'inline-flex items-center justify-center rounded-full font-mono font-semibold',
            size === 'sm' ? 'h-7 w-7 text-xs' : 'h-8 w-8 text-sm',
            highlight?.has(d)
              ? 'bg-brand-500 text-white'
              : 'bg-slate-700 text-slate-100',
          )}
        >
          {String(d).padStart(2, '0')}
        </span>
      ))}
    </div>
  );
}

export function MatrizLotofacil({
  selecionadas,
  onToggle,
  maxSelecao,
  estiloSelecao = 'fixa',
  bloqueadas,
}: {
  selecionadas: Set<number>;
  onToggle?: (n: number) => void;
  maxSelecao?: number;
  estiloSelecao?: 'fixa' | 'excluida';
  /** Números não clicáveis (ex.: já marcados no outro conjunto) */
  bloqueadas?: Set<number>;
}) {
  return (
    <div className="grid grid-cols-5 gap-1">
      {Array.from({ length: 25 }, (_, i) => {
        const n = i + 1;
        const moldura = MOLDURA.has(n);
        const sel = selecionadas.has(n);
        const bloqueado = bloqueadas?.has(n);
        const disabled =
          bloqueado || (!sel && maxSelecao != null && selecionadas.size >= maxSelecao);
        const Tag = onToggle ? 'button' : 'div';
        return (
          <Tag
            key={n}
            type={onToggle ? 'button' : undefined}
            disabled={onToggle ? disabled : undefined}
            onClick={onToggle && !bloqueado ? () => onToggle(n) : undefined}
            className={clsx(
              'flex h-9 items-center justify-center rounded text-xs font-mono transition',
              onToggle && !bloqueado && 'cursor-pointer hover:ring-1',
              onToggle && estiloSelecao === 'fixa' && !bloqueado && 'hover:ring-brand-500/50',
              onToggle && estiloSelecao === 'excluida' && !bloqueado && 'hover:ring-red-500/50',
              disabled && 'cursor-not-allowed opacity-40',
              sel && estiloSelecao === 'fixa' && 'bg-brand-600 text-white',
              sel && estiloSelecao === 'excluida' && 'bg-red-600 text-white line-through',
              !sel && bloqueado && 'bg-slate-950 text-slate-600',
              !sel &&
                !bloqueado &&
                (moldura
                  ? 'bg-slate-800 text-slate-400 ring-1 ring-slate-600'
                  : 'bg-slate-900 text-slate-500'),
            )}
          >
            {String(n).padStart(2, '0')}
          </Tag>
        );
      })}
    </div>
  );
}


