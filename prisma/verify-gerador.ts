import { PrismaClient } from '@prisma/client';
import { extrairDezenasConcurso } from '../src/lib/lotofacil/metrics';
import { gerarJogos, configFromPerfilPremium } from '../src/lib/lotofacil/generator';
import { avaliarJogo, CONFIG_PADRAO } from '../src/lib/lotofacil/scoring';
import { calcularMetricas } from '../src/lib/lotofacil/metrics';
import { configPadraoUI, configPremiumUI, uiToConfigGeracao } from '../src/lib/config-geracao-ui';
import { analisarSequenciaAtrasoPorDezena, mapaDezenas } from '../src/lib/lotofacil/sequencia-atraso';

const prisma = new PrismaClient();

async function main() {
  const cs = await prisma.concurso.findMany({ orderBy: { numeroConcurso: 'asc' } });
  const list = cs.map((c) => extrairDezenasConcurso(c));
  const ultimo = list[list.length - 1];
  const bases = await prisma.basePareto.findMany();
  const b20 = bases.find((b) => b.tipo === '20D')?.dezenas;
  const map = mapaDezenas(analisarSequenciaAtrasoPorDezena(list));

  const cfgP = configFromPerfilPremium(196);
  cfgP.mapaSequenciaAtraso = map;
  const j1 = gerarJogos({
    quantidade: 10,
    origemBase: '20D',
    baseDezenas: b20,
    ultimoConcurso: ultimo,
    config: cfgP,
  });

  const ui = configPremiumUI(196);
  const cfgUi = uiToConfigGeracao(ui);
  cfgUi.mapaSequenciaAtraso = map;
  cfgUi.usarSequenciaAtraso = true;
  const j2 = gerarJogos({
    quantidade: 10,
    origemBase: '20D',
    baseDezenas: b20,
    ultimoConcurso: ultimo,
    config: cfgUi,
  });

  cfgUi.usarSequenciaAtraso = false;
  const j3b = gerarJogos({
    quantidade: 10,
    origemBase: '20D',
    baseDezenas: b20,
    ultimoConcurso: ultimo,
    config: cfgUi,
  });

  cfgUi.usarSequenciaAtraso = false;
  cfgUi.scoreMinimo = 0;
  const j3 = gerarJogos({
    quantidade: 10,
    origemBase: '20D',
    baseDezenas: b20,
    ultimoConcurso: ultimo,
    config: cfgUi,
  });

  console.log('premium perfil (score 80 + seq + pareto):', j1.length);
  console.log('premium UI + seq:', j2.length);
  console.log('premium UI sem seq score 80:', j3b.length);
  console.log('premium UI sem seq score 0:', j3.length);

  const pad = uiToConfigGeracao(configPadraoUI());
  pad.usarSequenciaAtraso = false;
  const j4 = gerarJogos({
    quantidade: 10,
    origemBase: '20D',
    baseDezenas: b20,
    ultimoConcurso: ultimo,
    config: pad,
  });
  console.log('padrao faixas score 0:', j4.length);

  const cfg = { ...CONFIG_PADRAO, usarSequenciaAtraso: false, scoreMinimo: 0 };
  let pass = 0;
  let maxScore = 0;
  const scores: number[] = [];
  function comb15(dezenas: number[]) {
    const result: number[][] = [];
    const n = dezenas.length;
    function back(start: number, picked: number[]) {
      if (picked.length === 15) {
        result.push([...picked].sort((a, b) => a - b));
        return;
      }
      const need = 15 - picked.length;
      if (n - start < need) return;
      for (let i = start; i < n; i++) {
        picked.push(dezenas[i]);
        back(i + 1, picked);
        picked.pop();
      }
    }
    back(0, []);
    return result;
  }
  for (const d of comb15(b20!)) {
    const m = calcularMetricas(d, ultimo, b20);
    const av = avaliarJogo(m, cfg);
    if (av.valido) {
      pass++;
      scores.push(av.score);
      if (av.score > maxScore) maxScore = av.score;
    }
  }
  scores.sort((a, b) => b - a);
  const acima80 = scores.filter((s) => s >= 80).length;
  console.log('validos faixa padrao:', pass, 'com score>=80:', acima80, 'maxScore', maxScore);
}

main()
  .finally(() => prisma.$disconnect());
