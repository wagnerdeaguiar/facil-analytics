'use client';

import type { ConfigGeracaoUI, CriterioUI } from '@/lib/config-geracao-ui';

function CriterioEditor({
  c,
  onChange,
}: {
  c: CriterioUI;
  onChange: (c: CriterioUI) => void;
}) {
  return (
    <div className="rounded-lg border border-slate-700/60 bg-slate-800/40 p-3">
      <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
        <span className="text-sm font-medium text-slate-200">{c.label}</span>
        <div className="flex gap-3 text-xs">
          <label className="flex items-center gap-1 text-slate-400">
            <input
              type="checkbox"
              checked={c.ativo}
              onChange={(e) => onChange({ ...c, ativo: e.target.checked })}
            />
            Ativo
          </label>
          <label className="flex items-center gap-1 text-slate-400">
            <input
              type="checkbox"
              checked={c.obrigatorio}
              onChange={(e) => onChange({ ...c, obrigatorio: e.target.checked })}
            />
            Obrigatório
          </label>
        </div>
      </div>
      <div className="grid grid-cols-3 gap-2">
        <label className="text-xs text-slate-400">
          Mín
          <input
            type="number"
            value={c.min}
            onChange={(e) => onChange({ ...c, min: Number(e.target.value) })}
            className="input mt-0.5"
          />
        </label>
        <label className="text-xs text-slate-400">
          Máx
          <input
            type="number"
            value={c.max}
            onChange={(e) => onChange({ ...c, max: Number(e.target.value) })}
            className="input mt-0.5"
          />
        </label>
        <label className="text-xs text-slate-400">
          Alvo
          <input
            type="number"
            value={c.alvo}
            onChange={(e) => onChange({ ...c, alvo: Number(e.target.value) })}
            className="input mt-0.5"
          />
        </label>
      </div>
    </div>
  );
}

export function ParametrosGeracao({
  config,
  onChange,
}: {
  config: ConfigGeracaoUI;
  onChange: (c: ConfigGeracaoUI) => void;
}) {
  const updateCriterio = (idx: number, c: CriterioUI) => {
    const criterios = [...config.criterios];
    criterios[idx] = c;
    onChange({ ...config, criterios, perfilId: null });
  };

  const r = config.regrasSequencia;

  return (
    <div className="space-y-4">
      <article className="card">
        <h3 className="mb-3 text-sm font-semibold text-brand-300">Critérios estatísticos</h3>
        <div className="grid gap-3 md:grid-cols-2">
          {config.criterios.map((c, i) => (
            <CriterioEditor key={c.nome} c={c} onChange={(nc) => updateCriterio(i, nc)} />
          ))}
        </div>
      </article>

      {(config.maiorSeqSorteada || config.maiorSeqAusente || config.volanteLinhas || config.volanteColunas) && (
        <article className="card">
          <h3 className="mb-3 text-sm font-semibold text-brand-300">
            Critérios estruturais (cartela horizontal e volante)
          </h3>
          <p className="mb-3 text-xs text-slate-500">
            Linhas/colunas: mín. 1 e máx. 4 por faixa evitam cartelas com linha vazia ou com 5 dezenas (padrão
            histórico raro).
          </p>
          <div className="grid gap-3 md:grid-cols-2">
            {config.maiorSeqSorteada && (
              <CriterioEditor
                c={config.maiorSeqSorteada}
                onChange={(c) => onChange({ ...config, maiorSeqSorteada: c, perfilId: null })}
              />
            )}
            {config.maiorSeqAusente && (
              <CriterioEditor
                c={config.maiorSeqAusente}
                onChange={(c) => onChange({ ...config, maiorSeqAusente: c, perfilId: null })}
              />
            )}
            {config.volanteLinhas && (
              <CriterioEditor
                c={config.volanteLinhas}
                onChange={(c) => onChange({ ...config, volanteLinhas: c, perfilId: null })}
              />
            )}
            {config.volanteColunas && (
              <CriterioEditor
                c={config.volanteColunas}
                onChange={(c) => onChange({ ...config, volanteColunas: c, perfilId: null })}
              />
            )}
          </div>
        </article>
      )}

      <article className="card">
        <h3 className="mb-3 text-sm font-semibold text-brand-300">Sequência e atraso (por dezena)</h3>
        <label className="mb-3 flex items-center gap-2 text-sm text-slate-300">
          <input
            type="checkbox"
            checked={config.usarSequenciaAtraso}
            onChange={(e) => onChange({ ...config, usarSequenciaAtraso: e.target.checked, perfilId: null })}
          />
          Aplicar regras de sequência/atraso no filtro
        </label>
        <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
          {(
            [
              ['maxDezenasSequenciaGte4', 'Máx. seq. ≥4'],
              ['maxDezenasSequenciaGte5', 'Máx. seq. ≥5'],
              ['maxDezenasSequenciaGte6', 'Máx. seq. ≥6'],
              ['minDezenasAtrasoGte2', 'Mín. atraso ≥2'],
              ['maxDezenasAtrasoGte2', 'Máx. atraso ≥2'],
              ['minDezenasAtrasoGte3', 'Mín. atraso ≥3'],
              ['maxDezenasAtrasoGte3', 'Máx. atraso ≥3'],
            ] as const
          ).map(([key, label]) => (
            <label key={key} className="text-xs text-slate-400">
              {label}
              <input
                type="number"
                value={r[key]}
                onChange={(e) =>
                  onChange({
                    ...config,
                    regrasSequencia: { ...r, [key]: Number(e.target.value) },
                    perfilId: null,
                  })
                }
                className="input mt-0.5"
              />
            </label>
          ))}
        </div>
      </article>

      <article className="card">
        <label className="text-sm text-slate-300">
          Score mínimo para aprovar jogo (0–100)
          <input
            type="number"
            min={0}
            max={100}
            value={config.scoreMinimo}
            onChange={(e) => onChange({ ...config, scoreMinimo: Number(e.target.value), perfilId: null })}
            className="input mt-1 max-w-[120px]"
          />
        </label>
      </article>
    </div>
  );
}

