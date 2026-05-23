import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  REGRAS_SEQUENCIA_ATRASO_PREMIUM,
  ajustarRegrasSequenciaParaFixas,
  ajustarRegrasSequenciaParaGeracao,
  ajustarRegrasSequenciaParaPool,
  contarSequenciaAtrasoNoJogo,
  validarRegrasSequenciaAtraso,
} from '../sequencia-atraso';
import { mapaSintetico } from '../viabilidade-geracao';

const POOL_20 = Array.from({ length: 20 }, (_, i) => i + 1);

describe('sequência e atraso — ajustes de regras', () => {
  it('contarSequenciaAtrasoNoJogo agrega corretamente', () => {
    const mapa = mapaSintetico({
      1: { sequenciaAtual: 5, atrasoAtual: 0 },
      2: { sequenciaAtual: 4, atrasoAtual: 3 },
      3: { sequenciaAtual: 0, atrasoAtual: 5 },
    });
    const c = contarSequenciaAtrasoNoJogo([1, 2, 3], mapa);
    assert.equal(c.seqGte5, 1);
    assert.equal(c.seqGte4, 2);
    assert.equal(c.atrasoGte3, 2);
    assert.equal(c.atrasoGte5, 1);
  });

  it('ajustarRegrasSequenciaParaFixas eleva tetos quando fixas excedem padrão', () => {
    const mapa = mapaSintetico({
      1: { sequenciaAtual: 0, atrasoAtual: 4 },
      4: { sequenciaAtual: 0, atrasoAtual: 4 },
      17: { sequenciaAtual: 0, atrasoAtual: 4 },
    });
    const fixas = [1, 4, 17];
    const regras = ajustarRegrasSequenciaParaFixas(fixas, mapa, { ...REGRAS_SEQUENCIA_ATRASO_PREMIUM });
    assert.ok(regras.maxDezenasAtrasoGte3 >= 3);
    const cf = contarSequenciaAtrasoNoJogo(fixas, mapa);
    const val = validarRegrasSequenciaAtraso(cf, regras);
    assert.equal(val.valido, true);
  });

  it('ajustarRegrasSequenciaParaPool reduz mínimos impossíveis sem dezenas atrasadas', () => {
    const mapa = mapaSintetico(
      Object.fromEntries(POOL_20.map((d) => [d, { sequenciaAtual: 2, atrasoAtual: 0 }])),
    );
    const regras = ajustarRegrasSequenciaParaPool(POOL_20, mapa, { ...REGRAS_SEQUENCIA_ATRASO_PREMIUM });
    assert.equal(regras.minDezenasAtrasoGte3, 0);
    assert.equal(regras.minDezenasAtrasoGte2, 0);
  });

  it('ajustarRegrasSequenciaParaPool considera slots restantes após fixas', () => {
    const mapa = mapaSintetico({
      1: { sequenciaAtual: 0, atrasoAtual: 4 },
      2: { sequenciaAtual: 0, atrasoAtual: 0 },
      3: { sequenciaAtual: 0, atrasoAtual: 0 },
    });
    for (let d = 4; d <= 20; d++) {
      mapa.set(d, { ...mapa.get(d)!, atrasoAtual: 0, sequenciaAtual: 1 });
    }
    const fixas = [1];
    const pool = POOL_20;
    const semFixas = ajustarRegrasSequenciaParaPool(pool, mapa, { ...REGRAS_SEQUENCIA_ATRASO_PREMIUM }, [], 15);
    const comFixas = ajustarRegrasSequenciaParaPool(pool, mapa, { ...REGRAS_SEQUENCIA_ATRASO_PREMIUM }, fixas, 15);
    assert.ok(comFixas.minDezenasAtrasoGte3 <= semFixas.minDezenasAtrasoGte3);
  });

  it('ajustarRegrasSequenciaParaGeracao combina pool + fixas (idempotente)', () => {
    const mapa = mapaSintetico({
      1: { sequenciaAtual: 0, atrasoAtual: 4 },
      4: { sequenciaAtual: 0, atrasoAtual: 4 },
      17: { sequenciaAtual: 0, atrasoAtual: 4 },
    });
    const fixas = [1, 4, 17];
    const r1 = ajustarRegrasSequenciaParaGeracao(POOL_20, fixas, mapa, { ...REGRAS_SEQUENCIA_ATRASO_PREMIUM }, 15);
    const r2 = ajustarRegrasSequenciaParaGeracao(POOL_20, fixas, mapa, r1, 15);
    assert.deepEqual(r1, r2);
    assert.ok(r1.maxDezenasAtrasoGte3 >= 3);
  });

  it('validarRegrasSequenciaAtraso reprova teto de seq ≥4', () => {
    const mapa = mapaSintetico({
      1: { sequenciaAtual: 6, atrasoAtual: 0 },
      2: { sequenciaAtual: 6, atrasoAtual: 0 },
    });
    const c = contarSequenciaAtrasoNoJogo([1, 2], mapa);
    const val = validarRegrasSequenciaAtraso(c, { ...REGRAS_SEQUENCIA_ATRASO_PREMIUM });
    assert.equal(val.valido, false);
    assert.ok(val.motivos.some((m) => m.includes('Sequência')));
  });
});
