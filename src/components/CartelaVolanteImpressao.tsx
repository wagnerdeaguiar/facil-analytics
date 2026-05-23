/** Cartela 5×5 para impressão / visualização (referência, não volante oficial). */
export function CartelaVolanteImpressao({
  dezenas,
  numero,
  total,
  qtdDezenas,
  valor,
  score,
  showCheckbox = true,
}: {
  dezenas: number[];
  numero: number;
  total: number;
  qtdDezenas?: number;
  valor?: number;
  score?: number;
  showCheckbox?: boolean;
}) {
  const sel = new Set(dezenas);
  const ordenadas = [...dezenas].sort((a, b) => a - b);
  const qtd = qtdDezenas ?? dezenas.length;

  return (
    <article className="cartela-impressao break-inside-avoid rounded-lg border-2 border-slate-300 bg-white p-4 text-black shadow-none">
      <header className="mb-3 flex flex-wrap items-center justify-between gap-2 border-b border-slate-200 pb-2">
        <label className="flex cursor-pointer items-center gap-2 text-sm font-medium text-slate-800">
          {showCheckbox && (
            <>
              <input
                type="checkbox"
                className="h-5 w-5 rounded border-2 border-slate-600 print:hidden"
                aria-label={`Aposta ${numero} transcrita`}
              />
              <span className="hidden h-5 w-5 shrink-0 border-2 border-black print:inline-block" aria-hidden />
            </>
          )}
          Transcrito no volante oficial
        </label>
        <span className="text-sm font-bold text-slate-900">
          Aposta {numero} de {total}
        </span>
        <span className="text-xs text-slate-600">
          {qtd} dezenas
          {valor != null && ` · R$ ${valor.toFixed(2).replace('.', ',')}`}
          {score != null && ` · Score ${score.toFixed(1)}`}
        </span>
      </header>

      <p className="mb-3 font-mono text-base font-bold tracking-wide text-slate-900">
        {ordenadas.map((d) => String(d).padStart(2, '0')).join(' · ')}
      </p>

      <div className="inline-grid grid-cols-5 gap-0 border-2 border-slate-400">
        {Array.from({ length: 25 }, (_, i) => {
          const n = i + 1;
          const marked = sel.has(n);
          return (
            <div
              key={n}
              className={`flex h-11 w-11 items-center justify-center border border-slate-300 text-sm font-bold sm:h-12 sm:w-12 ${
                marked ? 'bg-slate-900 text-white print:bg-black print:text-white' : 'bg-white text-slate-800'
              }`}
            >
              {String(n).padStart(2, '0')}
            </div>
          );
        })}
      </div>
    </article>
  );
}
