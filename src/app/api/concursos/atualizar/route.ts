import { NextResponse } from 'next/server';
import { fetchConcursosCaixa, concursoToDbFields } from '@/lib/lotofacil/import';
import { prisma } from '@/lib/db';
import { recalcularEstatisticasGlobais } from '@/lib/services/analytics';
import { extrairDezenasConcurso } from '@/lib/lotofacil/metrics';

export async function POST() {
  try {
    const novos = await fetchConcursosCaixa();
    if (!novos.length) {
      return NextResponse.json({
        message: 'API da Caixa indisponível ou sem dados. Importe manualmente via CSV.',
        inseridos: 0,
      });
    }

    let inseridos = 0;
    for (const c of novos) {
      const existe = await prisma.concurso.findUnique({
        where: { numeroConcurso: c.numeroConcurso },
      });
      if (existe) continue;

      const anterior = await prisma.concurso.findFirst({
        where: { numeroConcurso: c.numeroConcurso - 1 },
      });
      const antDezenas = anterior ? extrairDezenasConcurso(anterior) : null;
      await prisma.concurso.create({ data: concursoToDbFields(c, antDezenas) });
      inseridos++;
    }

    if (inseridos > 0) await recalcularEstatisticasGlobais();

    return NextResponse.json({ inseridos, fonte: 'caixa' });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: 'Erro ao atualizar' }, { status: 500 });
  }
}

