export { dynamic } from '@/lib/route-config';

import { NextResponse } from 'next/server';
import { getConcursosOrdenados } from '@/lib/services/analytics';
import { buildConcursosMetricas, analisarCriteriosFortes } from '@/lib/lotofacil/recurrence';
import { configPadraoUI, configPremiumUI } from '@/lib/config-geracao-ui';

export async function GET() {
  try {
    const concursos = await getConcursosOrdenados();
    const metricas = buildConcursosMetricas(concursos);
    const analise = analisarCriteriosFortes(metricas);

    const sugestoes = analise.amplas.map((a) => ({
      criterio: a.criterio,
      min: a.min,
      max: a.max,
      percentual: a.percentual,
    }));

    return NextResponse.json({
      mediaSoma: analise.mediaSoma,
      totalConcursos: concursos.length,
      ultimoConcurso: concursos[concursos.length - 1]?.numeroConcurso,
      configPadrao: configPadraoUI(),
      configPremium: configPremiumUI(analise.mediaSoma),
      sugestoesFortes: sugestoes,
    });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: 'Erro ao carregar configuração' }, { status: 500 });
  }
}
