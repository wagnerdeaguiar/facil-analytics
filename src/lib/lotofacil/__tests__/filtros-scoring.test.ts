import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { calcularMetricas } from '../metrics';
import { CONFIG_PADRAO, avaliarJogo, validarCriterios } from '../scoring';
import { mapaSintetico } from '../viabilidade-geracao';

const ULTIMO = [1, 3, 5, 7, 9, 11, 13, 15, 17, 19, 21, 22, 23, 24, 25];

describe('scoring — validarCriterios e avaliarJogo', () => {
  it('calcularMetricas usa tamanho real do jogo para ímpares', () => {
    const m = calcularMetricas([1, 4, 17], ULTIMO);
    assert.equal(m.pares, 1);
    assert.equal(m.impares, 2);
  });

  it('validarCriterios aprova quando valor está na faixa', () => {
    const config = {
      ...CONFIG_PADRAO,
      repetidas: { ...CONFIG_PADRAO.repetidas, ativo: false },
      pares: { ...CONFIG_PADRAO.pares, ativo: false },
      impares: { ...CONFIG_PADRAO.impares, ativo: false },
      soma: { ...CONFIG_PADRAO.soma, ativo: false },
      moldura: { ...CONFIG_PADRAO.moldura, ativo: false },
      centro: { ...CONFIG_PADRAO.centro, ativo: false },
      primos: { ...CONFIG_PADRAO.primos, ativo: false },
      maiorSeqSorteada: { ...CONFIG_PADRAO.maiorSeqSorteada!, ativo: false },
      maiorSeqAusente: { ...CONFIG_PADRAO.maiorSeqAusente!, ativo: false },
      fibonacci: { nome: 'fibonacci', min: 3, max: 6, obrigatorio: true, ativo: true },
    };
    const m = calcularMetricas([1, 2, 3, 5, 8, 13, 6, 7, 9, 10, 11, 12, 14, 15, 16], ULTIMO);
    const v = validarCriterios(m, config);
    assert.equal(v.valido, true, v.motivos.join('; '));
  });

  it('reprova pares abaixo do mínimo', () => {
    const config = {
      ...CONFIG_PADRAO,
      repetidas: { ...CONFIG_PADRAO.repetidas, ativo: false },
      impares: { ...CONFIG_PADRAO.impares, ativo: false },
      soma: { ...CONFIG_PADRAO.soma, ativo: false },
      moldura: { ...CONFIG_PADRAO.moldura, ativo: false },
      centro: { ...CONFIG_PADRAO.centro, ativo: false },
      primos: { ...CONFIG_PADRAO.primos, ativo: false },
      fibonacci: { ...CONFIG_PADRAO.fibonacci, ativo: false },
      maiorSeqSorteada: { ...CONFIG_PADRAO.maiorSeqSorteada!, ativo: false },
      maiorSeqAusente: { ...CONFIG_PADRAO.maiorSeqAusente!, ativo: false },
      pares: { ...CONFIG_PADRAO.pares, min: 8, max: 10, obrigatorio: true, ativo: true },
    };
    const dezenas = [2, 4, 6, 8, 10, 12, 1, 3, 5, 7, 9, 11, 13, 15, 17];
    const m = calcularMetricas(dezenas, ULTIMO);
    const v = validarCriterios(m, config);
    assert.equal(v.valido, false);
    assert.ok(v.motivos.some((x) => x.includes('pares')));
  });

  it('critério inativo não bloqueia', () => {
    const config = {
      ...CONFIG_PADRAO,
      fibonacci: { ...CONFIG_PADRAO.fibonacci, ativo: false, min: 99 },
      repetidas: { ...CONFIG_PADRAO.repetidas, ativo: false },
      pares: { ...CONFIG_PADRAO.pares, ativo: false },
      impares: { ...CONFIG_PADRAO.impares, ativo: false },
      soma: { ...CONFIG_PADRAO.soma, ativo: false },
      moldura: { ...CONFIG_PADRAO.moldura, ativo: false },
      centro: { ...CONFIG_PADRAO.centro, ativo: false },
      primos: { ...CONFIG_PADRAO.primos, ativo: false },
      maiorSeqSorteada: { ...CONFIG_PADRAO.maiorSeqSorteada!, ativo: false },
      maiorSeqAusente: { ...CONFIG_PADRAO.maiorSeqAusente!, ativo: false },
    };
    const m = calcularMetricas([1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15], ULTIMO);
    const v = validarCriterios(m, config);
    assert.equal(v.valido, true);
  });

  it('avaliarJogo retorna score > 0 para jogo válido', () => {
    const dezenas = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15];
    const m = calcularMetricas(dezenas, ULTIMO);
    const config = {
      ...CONFIG_PADRAO,
      mapaSequenciaAtraso: mapaSintetico({}),
      usarSequenciaAtraso: false,
      scoreMinimo: 0,
      repetidas: { ...CONFIG_PADRAO.repetidas, min: 0, max: 15 },
      pares: { ...CONFIG_PADRAO.pares, min: 0, max: 15 },
      impares: { ...CONFIG_PADRAO.impares, min: 0, max: 15 },
      soma: { ...CONFIG_PADRAO.soma, min: 0, max: 999 },
      moldura: { ...CONFIG_PADRAO.moldura, min: 0, max: 15 },
      centro: { ...CONFIG_PADRAO.centro, min: 0, max: 15 },
      primos: { ...CONFIG_PADRAO.primos, min: 0, max: 15 },
      fibonacci: { ...CONFIG_PADRAO.fibonacci, min: 0, max: 15 },
      maiorSeqSorteada: { ...CONFIG_PADRAO.maiorSeqSorteada!, ativo: false },
      maiorSeqAusente: { ...CONFIG_PADRAO.maiorSeqAusente!, ativo: false },
      pareto: undefined,
    };
    const r = avaliarJogo(m, config);
    assert.equal(r.valido, true);
    assert.ok(r.score > 0);
  });

  it('score mínimo afeta validade final mas não critérios estruturais', () => {
    const dezenas = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15];
    const m = calcularMetricas(dezenas, ULTIMO);
    const config = {
      ...CONFIG_PADRAO,
      scoreMinimo: 999,
      usarSequenciaAtraso: false,
      repetidas: { ...CONFIG_PADRAO.repetidas, min: 0, max: 15 },
      pares: { ...CONFIG_PADRAO.pares, min: 0, max: 15 },
      impares: { ...CONFIG_PADRAO.impares, min: 0, max: 15 },
      soma: { ...CONFIG_PADRAO.soma, min: 0, max: 999 },
      moldura: { ...CONFIG_PADRAO.moldura, min: 0, max: 15 },
      centro: { ...CONFIG_PADRAO.centro, min: 0, max: 15 },
      primos: { ...CONFIG_PADRAO.primos, min: 0, max: 15 },
      fibonacci: { ...CONFIG_PADRAO.fibonacci, min: 0, max: 15 },
      maiorSeqSorteada: { ...CONFIG_PADRAO.maiorSeqSorteada!, ativo: false },
      maiorSeqAusente: { ...CONFIG_PADRAO.maiorSeqAusente!, ativo: false },
      pareto: undefined,
    };
    const estrutural = validarCriterios(m, config);
    const r = avaliarJogo(m, config);
    assert.equal(estrutural.valido, true);
    assert.ok(r.score < 999);
    assert.equal(r.valido, false);
  });
});
