import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { configPadraoUI, configToUI, uiToConfigGeracao } from '../../config-geracao-ui';
import { CONFIG_PADRAO } from '../scoring';
import { REGRAS_SEQUENCIA_ATRASO_PREMIUM } from '../sequencia-atraso';

describe('config-geracao-ui — ida e volta', () => {
  it('configToUI preserva regras customizadas de seq/atraso', () => {
    const custom = {
      ...CONFIG_PADRAO,
      regrasSequenciaAtraso: {
        ...REGRAS_SEQUENCIA_ATRASO_PREMIUM,
        maxDezenasAtrasoGte3: 5,
        minDezenasAtrasoGte3: 0,
      },
    };
    const ui = configToUI(custom, 80);
    assert.equal(ui.regrasSequencia.maxDezenasAtrasoGte3, 5);
    assert.equal(ui.regrasSequencia.minDezenasAtrasoGte3, 0);
    assert.equal(ui.scoreMinimo, 80);
  });

  it('uiToConfigGeracao inclui regrasSequenciaAtraso', () => {
    const ui = configPadraoUI();
    ui.regrasSequencia.maxDezenasSequenciaGte4 = 6;
    ui.regrasSequencia.minDezenasAtrasoGte2 = 1;
    const cfg = uiToConfigGeracao(ui);
    assert.equal(cfg.regrasSequenciaAtraso?.maxDezenasSequenciaGte4, 6);
    assert.equal(cfg.regrasSequenciaAtraso?.minDezenasAtrasoGte2, 1);
  });

  it('roundtrip mantém critérios e regras', () => {
    const ui0 = configPadraoUI();
    ui0.criterios.find((c) => c.nome === 'soma')!.max = 210;
    ui0.regrasSequencia.maxDezenasSequenciaGte5 = 3;
    const cfg = uiToConfigGeracao(ui0);
    const ui1 = configToUI(cfg, ui0.scoreMinimo);
    assert.equal(ui1.criterios.find((c) => c.nome === 'soma')?.max, 210);
    assert.equal(ui1.regrasSequencia.maxDezenasSequenciaGte5, 3);
  });
});
