import { extrairDezenasConcurso } from '@/lib/lotofacil/metrics';
import {
  analisarCriteriosFortes,
  buildConcursosMetricas,
} from '@/lib/lotofacil/recurrence';
import {
  calcularFrequencias,
  coberturaHistoricaBases,
  montarBasesPareto,
} from '@/lib/lotofacil/pareto';
import { prisma } from '@/lib/db';

export async function getConcursosOrdenados() {
  return prisma.concurso.findMany({ orderBy: { numeroConcurso: 'asc' } });
}

export async function recalcularEstatisticasGlobais() {
  const concursos = await getConcursosOrdenados();
  const dezenasList = concursos.map((c) => extrairDezenasConcurso(c));
  const freqs = calcularFrequencias(dezenasList);
  const { base18, base19, base20 } = montarBasesPareto(freqs);

  for (const f of freqs) {
    await prisma.dezenaEstatistica.upsert({
      where: { dezena: f.dezena },
      create: {
        dezena: f.dezena,
        frequenciaTotal: f.frequencia,
        percentualFrequencia: f.percentual,
        rankingFrequencia: f.rankingPareto,
        classificacaoTemperatura: f.classificacao,
        atrasoAtual: f.atrasoAtual,
        atrasoMedio: f.atrasoMedio,
        atrasoMaximo: f.maiorAtraso,
        sequenciaAtual: f.sequenciaAtual,
        sequenciaMaxima: f.maiorSequencia,
        statusSequencia: f.statusSequencia,
        statusAtraso: f.statusAtraso,
      },
      update: {
        frequenciaTotal: f.frequencia,
        percentualFrequencia: f.percentual,
        rankingFrequencia: f.rankingPareto,
        classificacaoTemperatura: f.classificacao,
        atrasoAtual: f.atrasoAtual,
        atrasoMedio: f.atrasoMedio,
        atrasoMaximo: f.maiorAtraso,
        sequenciaAtual: f.sequenciaAtual,
        sequenciaMaxima: f.maiorSequencia,
        statusSequencia: f.statusSequencia,
        statusAtraso: f.statusAtraso,
      },
    });
  }

  const bases = [
    { tipo: '18D', nome: 'Base 18D', tamanho: 18, dezenas: base18 },
    { tipo: '19D', nome: 'Base 19D', tamanho: 19, dezenas: base19 },
    { tipo: '20D', nome: 'Base 20D', tamanho: 20, dezenas: base20 },
  ];

  for (const b of bases) {
    await prisma.basePareto.upsert({
      where: { tipo: b.tipo },
      create: { tipo: b.tipo, nomeBase: b.nome, tamanhoBase: b.tamanho, dezenas: b.dezenas, metadata: {} },
      update: { dezenas: b.dezenas, nomeBase: b.nome, tamanhoBase: b.tamanho },
    });
  }

  const metricasConcursos = buildConcursosMetricas(concursos);
  const analise = analisarCriteriosFortes(metricasConcursos);

  for (const faixa of [...analise.amplas, ...analise.ideais]) {
    const tipo = faixa.tipoFaixa === 'ideal' ? 'ideal' : 'ampla';
    const slug = faixa.criterio.toLowerCase().replace(/\s+/g, '_');
    await prisma.criterioEstatistico.upsert({
      where: { nomeCriterio_tipoFaixa: { nomeCriterio: faixa.criterio, tipoFaixa: tipo } },
      create: {
        nomeCriterio: faixa.criterio,
        faixaMinima: faixa.min,
        faixaMaxima: faixa.max,
        percentualOcorrencia: faixa.percentual,
        acima80Porcento: faixa.acima80,
        pesoPadrao: 10,
        ativoNoGerador: faixa.acima80,
        statusForca: faixa.status,
        tipoFaixa: tipo,
        alvo: Math.round((faixa.min + faixa.max) / 2),
      },
      update: {
        faixaMinima: faixa.min,
        faixaMaxima: faixa.max,
        percentualOcorrencia: faixa.percentual,
        acima80Porcento: faixa.acima80,
        ativoNoGerador: faixa.acima80,
        statusForca: faixa.status,
        alvo: Math.round((faixa.min + faixa.max) / 2),
      },
    });
  }

  const cobertura = coberturaHistoricaBases(dezenasList, bases);

  return {
    totalConcursos: concursos.length,
    ultimo: concursos[concursos.length - 1] ?? null,
    freqs,
    bases: { base18, base19, base20 },
    analise,
    cobertura,
    mediaSoma: analise.mediaSoma,
  };
}

export async function getDashboardData() {
  const concursos = await getConcursosOrdenados();
  const dezenasList = concursos.map((c) => extrairDezenasConcurso(c));
  const freqs = calcularFrequencias(dezenasList);
  const metricas = buildConcursosMetricas(concursos);
  const analise = analisarCriteriosFortes(metricas);
  const basesDb = await prisma.basePareto.findMany();
  const { base18, base19, base20 } = montarBasesPareto(freqs);

  return {
    totalConcursos: concursos.length,
    ultimo: concursos[concursos.length - 1] ?? null,
    topQuentes: freqs.slice(0, 10),
    criteriosFortes: analise.criterios.filter((c) => c.acima80),
    analise,
    bases: basesDb.length
      ? basesDb
      : [
          { tipo: '18D', dezenas: base18 },
          { tipo: '19D', dezenas: base19 },
          { tipo: '20D', dezenas: base20 },
        ],
  };
}

