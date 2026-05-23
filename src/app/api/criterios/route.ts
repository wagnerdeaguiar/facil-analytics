export { dynamic } from '@/lib/route-config';

import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getConcursosOrdenados } from '@/lib/services/analytics';
import { buildConcursosMetricas, analisarCriteriosFortes, labelStatus } from '@/lib/lotofacil/recurrence';

export async function GET() {
  try {
    const concursos = await getConcursosOrdenados();
    const metricas = buildConcursosMetricas(concursos);
    const analise = analisarCriteriosFortes(metricas);
    const salvos = await prisma.criterioEstatistico.findMany({ orderBy: { percentualOcorrencia: 'desc' } });

    const tabela = analise.criterios.map((c) => ({
      ...c,
      statusLabel: labelStatus(c.status),
    }));

    return NextResponse.json({
      tabela,
      amplas: analise.amplas,
      ideais: analise.ideais,
      mediaSoma: analise.mediaSoma,
      salvos,
      totalConcursos: concursos.length,
    });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: 'Erro' }, { status: 500 });
  }
}

