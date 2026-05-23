import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { ajustarCriteriosEstruturaisParaGeracao } from '../ajustar-config-geracao';
import { gerarFechamentoCombinatorio } from '../fechamento-combinatorio';
import { CONFIG_PADRAO } from '../scoring';

const BASE_20 = Array.from({ length: 20 }, (_, i) => i + 1);
const ULTIMO = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15];

describe('ajustarCriteriosEstruturaisParaGeracao', () => {
  it('relaxa repetidas quando pool+fixas não permitem mínimo 8', () => {
    const pool25 = Array.from({ length: 25 }, (_, i) => i + 1);
    const fixas = [16, 17, 18, 19, 20, 21, 22, 23, 24, 25];
    const cfg = ajustarCriteriosEstruturaisParaGeracao(
      CONFIG_PADRAO,
      pool25,
      fixas,
      15,
      ULTIMO,
    );
    assert.ok((cfg.repetidas.min ?? 99) <= 5);
    assert.ok((cfg.repetidas.max ?? 0) >= 5);
  });

  it('expande teto de pares quando fixas já têm muitos pares', () => {
    const fixas = [2, 4, 6, 8, 10];
    const cfg = ajustarCriteriosEstruturaisParaGeracao(
      { ...CONFIG_PADRAO, pares: { ...CONFIG_PADRAO.pares, max: 7 } },
      BASE_20,
      fixas,
      15,
      ULTIMO,
    );
    assert.ok((cfg.pares.max ?? 0) >= 5);
  });
});

describe('fechamento combinatório — alinhado ao gerador', () => {
  const pool16 = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16];

  it('amplia universo com fixas fora do pool inicial', () => {
    const r = gerarFechamentoCombinatorio({
      pool: pool16,
      garantia: 11,
      dezenasFixas: [21],
      percentualCobertura: 90,
      maxBilhetes: 50,
    });
    assert.ok(r.poolEfetivo.includes(21));
    assert.deepEqual(r.fixasAplicadas, [21]);
    assert.ok(r.fixasForaDaBase.includes(21));
  });

  it('respeita dezenasExcluidas', () => {
    const r = gerarFechamentoCombinatorio({
      pool: pool16,
      garantia: 11,
      dezenasExcluidas: [16],
      percentualCobertura: 90,
      maxBilhetes: 50,
    });
    assert.ok(!r.poolEfetivo.includes(16));
    assert.ok(r.excluidasAplicadas.includes(16));
    for (const b of r.bilhetes) {
      assert.ok(!b.includes(16));
    }
  });

  it('rejeita contradição fixa + indesejada', () => {
    const r = gerarFechamentoCombinatorio({
      pool: pool16,
      garantia: 11,
      dezenasFixas: [5],
      dezenasExcluidas: [5],
    });
    assert.equal(r.bilhetes.length, 0);
    assert.deepEqual(r.contradicoes, [5]);
  });

  it('fixas entram em todos os bilhetes gerados', () => {
    const r = gerarFechamentoCombinatorio({
      pool: pool16,
      garantia: 11,
      dezenasFixas: [1, 2],
      percentualCobertura: 85,
      maxBilhetes: 30,
    });
    if (r.bilhetes.length) {
      for (const b of r.bilhetes) {
        assert.ok(b.includes(1) && b.includes(2));
      }
    }
  });
});
