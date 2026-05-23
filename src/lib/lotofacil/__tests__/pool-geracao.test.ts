import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { prepararPoolGeracao } from '../generator';

const BASE_20 = Array.from({ length: 20 }, (_, i) => i + 1);

describe('prepararPoolGeracao', () => {
  it('aceita pool válido sem fixas nem excluídas', () => {
    const r = prepararPoolGeracao(BASE_20, [], [], 15);
    assert.equal(r.valido, true);
    assert.equal(r.poolEfetivo.length, 20);
    assert.deepEqual(r.contradicoes, []);
  });

  it('rejeita mesma dezena fixa e indesejada', () => {
    const r = prepararPoolGeracao(BASE_20, [5], [5], 15);
    assert.equal(r.valido, false);
    assert.match(r.motivoInvalido ?? '', /Contradição/);
    assert.deepEqual(r.contradicoes, [5]);
  });

  it('rejeita várias contradições', () => {
    const r = prepararPoolGeracao(BASE_20, [1, 5, 10], [5, 10], 15);
    assert.equal(r.valido, false);
    assert.deepEqual(r.contradicoes.sort((a, b) => a - b), [5, 10]);
  });

  it('rejeita fixas >= numerosPorAposta', () => {
    const fixas = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15];
    const r = prepararPoolGeracao(BASE_20, fixas, [], 15);
    assert.equal(r.valido, false);
    assert.match(r.motivoInvalido ?? '', /15 dezenas fixas/);
  });

  it('rejeita pool insuficiente após excluídas', () => {
    const excl = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11];
    const r = prepararPoolGeracao(BASE_20, [], excl, 15);
    assert.equal(r.valido, false);
    assert.match(r.motivoInvalido ?? '', /Pool insuficiente/);
  });

  it('amplia pool com fixas fora da base Pareto', () => {
    const r = prepararPoolGeracao(BASE_20, [21, 22], [], 15);
    assert.equal(r.valido, true);
    assert.deepEqual(r.fixasForaDaBase, [21, 22]);
    assert.equal(r.poolEfetivo.length, 22);
    assert.ok(r.poolEfetivo.includes(21));
  });

  it('deduplica fixas e excluídas', () => {
    const r = prepararPoolGeracao(BASE_20, [3, 3, 7], [20, 20], 15);
    assert.equal(r.valido, true);
    assert.deepEqual(r.fixas, [3, 7]);
    assert.deepEqual(r.excluidas, [20]);
    assert.equal(r.poolEfetivo.length, 19);
  });

  it('ignora dezenas fora do intervalo 1–25', () => {
    const r = prepararPoolGeracao(BASE_20, [0, 26, 5], [99], 15);
    assert.equal(r.valido, true);
    assert.deepEqual(r.fixas, [5]);
    assert.deepEqual(r.excluidas, []);
  });

  it('permite 14 fixas em aposta de 15', () => {
    const fixas = [1, 2, 3, 4, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15];
    const r = prepararPoolGeracao(BASE_20, fixas, [], 15);
    assert.equal(r.valido, true);
    assert.equal(r.fixas.length, 14);
  });
});
