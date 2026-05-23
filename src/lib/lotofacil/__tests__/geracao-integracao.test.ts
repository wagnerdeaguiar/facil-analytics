import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  diagnosticarGeracao,
  gerarJogos,
  prepararPoolGeracao,
} from '../generator';
import { CONFIG_PADRAO, type ConfigGeracao } from '../scoring';
import {
  REGRAS_SEQUENCIA_ATRASO_PREMIUM,
  ajustarRegrasSequenciaParaGeracao,
  contarSequenciaAtrasoNoJogo,
  validarRegrasSequenciaAtraso,
} from '../sequencia-atraso';
import { analisarViabilidadeGeracao, mapaSintetico } from '../viabilidade-geracao';

const BASE_20 = Array.from({ length: 20 }, (_, i) => i + 1);

/** Foco no bug seq/atraso — faixas estruturais abertas para isolar a camada corrigida. */
function configFocoSeqAtraso(mapa: ReturnType<typeof mapaSintetico>, fixas: number[]): ConfigGeracao {
  const regras = ajustarRegrasSequenciaParaGeracao(BASE_20, fixas, mapa, {
    ...REGRAS_SEQUENCIA_ATRASO_PREMIUM,
  }, 15);
  return {
    ...CONFIG_PADRAO,
    scoreMinimo: 0,
    mapaSequenciaAtraso: mapa,
    regrasSequenciaAtraso: regras,
    usarSequenciaAtraso: true,
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
}

describe('geração integrada — fixas, excluídas, seq/atraso', () => {
  it('reproduz bug: fixas com atraso 4 violam teto padrão antes do ajuste', () => {
    const mapa = mapaSintetico({
      1: { sequenciaAtual: 0, atrasoAtual: 4 },
      4: { sequenciaAtual: 0, atrasoAtual: 4 },
      17: { sequenciaAtual: 0, atrasoAtual: 4 },
    });
    const fixas = [1, 4, 17];
    const cf = contarSequenciaAtrasoNoJogo(fixas, mapa);
    const semAjuste = validarRegrasSequenciaAtraso(cf, { ...REGRAS_SEQUENCIA_ATRASO_PREMIUM });
    assert.equal(semAjuste.valido, false);
    assert.ok(semAjuste.motivos.some((m) => m.includes('Atraso ≥3')));
  });

  it('bug reportado: fixas 1,4,17 + excluir 5 gera candidatos após ajuste', () => {
    const mapa = mapaSintetico({
      1: { sequenciaAtual: 0, atrasoAtual: 4 },
      4: { sequenciaAtual: 0, atrasoAtual: 4 },
      17: { sequenciaAtual: 0, atrasoAtual: 4 },
    });
    const fixas = [1, 4, 17];
    const config = configFocoSeqAtraso(mapa, fixas);

    const diag = diagnosticarGeracao({
      origemBase: '20D',
      baseDezenas: BASE_20,
      config,
      numerosPorAposta: 15,
      dezenasFixas: fixas,
      dezenasExcluidas: [5],
    });

    assert.ok(diag.candidatosValidos > 0, `esperava candidatos, obteve ${diag.candidatosValidos}`);
    assert.ok(diag.scoreMaximo > 0);
  });

  it('gerarJogos produz apostas com fixas e sem excluídas', () => {
    const mapa = mapaSintetico({
      1: { sequenciaAtual: 0, atrasoAtual: 4 },
      4: { sequenciaAtual: 0, atrasoAtual: 4 },
      17: { sequenciaAtual: 0, atrasoAtual: 4 },
    });
    const fixas = [1, 4, 17];
    const config = configFocoSeqAtraso(mapa, fixas);

    const jogos = gerarJogos({
      quantidade: 3,
      origemBase: '20D',
      baseDezenas: BASE_20,
      config,
      numerosPorAposta: 15,
      dezenasFixas: fixas,
      dezenasExcluidas: [5],
      maxDezenasIguais: 15,
    });

    assert.ok(jogos.length > 0);
    for (const j of jogos) {
      assert.ok(fixas.every((f) => j.dezenas.includes(f)));
      assert.ok(!j.dezenas.includes(5));
      assert.equal(j.dezenas.length, 15);
    }
  });

  it('analisarViabilidadeGeracao bloqueia contradição fixa/indesejada', () => {
    const v = analisarViabilidadeGeracao({
      poolBase: BASE_20,
      dezenasFixas: [7],
      dezenasExcluidas: [7],
      numerosPorAposta: 15,
      config: CONFIG_PADRAO,
    });
    assert.equal(v.viavel, false);
    assert.ok(v.bloqueios.some((b) => b.includes('Contradição')));
  });

  it('analisarViabilidadeGeracao detecta pool insuficiente', () => {
    const excl = Array.from({ length: 11 }, (_, i) => i + 1);
    const v = analisarViabilidadeGeracao({
      poolBase: BASE_20,
      dezenasExcluidas: excl,
      numerosPorAposta: 15,
      config: CONFIG_PADRAO,
    });
    assert.equal(v.viavel, false);
    assert.ok(v.bloqueios.some((b) => b.includes('insuficiente')));
  });

  it('analisarViabilidadeGeracao viável para fixas 1,4,17 excluir 5 (seq/atraso)', () => {
    const mapa = mapaSintetico({
      1: { sequenciaAtual: 0, atrasoAtual: 4 },
      4: { sequenciaAtual: 0, atrasoAtual: 4 },
      17: { sequenciaAtual: 0, atrasoAtual: 4 },
    });
    const fixas = [1, 4, 17];
    const v = analisarViabilidadeGeracao({
      poolBase: BASE_20,
      dezenasFixas: fixas,
      dezenasExcluidas: [5],
      numerosPorAposta: 15,
      config: configFocoSeqAtraso(mapa, fixas),
      origemBase: '20D',
    });
    assert.equal(v.viavel, true, v.bloqueios.join('; '));
  });

  it('prepararPool + gerar respeita fixas fora da base', () => {
    const prep = prepararPoolGeracao(BASE_20, [21], [], 15);
    assert.equal(prep.valido, true);
    const jogos = gerarJogos({
      quantidade: 2,
      origemBase: '20D',
      baseDezenas: BASE_20,
      config: { ...CONFIG_PADRAO, scoreMinimo: 0, usarSequenciaAtraso: false, pareto: undefined },
      dezenasFixas: [21],
      maxDezenasIguais: 15,
    });
    assert.ok(jogos.every((j) => j.dezenas.includes(21)));
  });
});

describe('geração — combinações enumeráveis', () => {
  it('pool mínimo exato (15 dezenas, 0 fixas) gera 1 combinação', () => {
    const pool15 = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15];
    const diag = diagnosticarGeracao({
      origemBase: '20D',
      baseDezenas: pool15,
      config: {
        ...CONFIG_PADRAO,
        scoreMinimo: 0,
        usarSequenciaAtraso: false,
        repetidas: { ...CONFIG_PADRAO.repetidas, min: 0, max: 15 },
        pares: { ...CONFIG_PADRAO.pares, min: 0, max: 15 },
        impares: { ...CONFIG_PADRAO.impares, min: 0, max: 15 },
        soma: { ...CONFIG_PADRAO.soma, min: 0, max: 999 },
        moldura: { ...CONFIG_PADRAO.moldura, min: 0, max: 15 },
        centro: { ...CONFIG_PADRAO.centro, min: 0, max: 15 },
        primos: { ...CONFIG_PADRAO.primos, min: 0, max: 15 },
        fibonacci: { ...CONFIG_PADRAO.fibonacci, min: 0, max: 15 },
        maiorSeqSorteada: { ...CONFIG_PADRAO.maiorSeqSorteada!, min: 0, max: 15 },
        maiorSeqAusente: { ...CONFIG_PADRAO.maiorSeqAusente!, min: 0, max: 15 },
        pareto: undefined,
      },
      numerosPorAposta: 15,
    });
    assert.equal(diag.candidatosValidos, 1);
  });
});
