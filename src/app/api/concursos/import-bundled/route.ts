import { readFileSync } from 'fs';
import { join } from 'path';
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { parseTxtMazuSoft, concursoToDbFields } from '@/lib/lotofacil/import';
import { recalcularEstatisticasGlobais } from '@/lib/services/analytics';
import { analisarRepetidasGeral } from '@/lib/lotofacil/sequencia-atraso';
import { extrairDezenasConcurso } from '@/lib/lotofacil/metrics';

export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => ({}));
    const substituir = body.substituir !== false;

    const filePath = join(process.cwd(), 'data', 'lotofacil-resultados-3442-3542.txt');
    const text = readFileSync(filePath, 'utf-8');
    const importados = parseTxtMazuSoft(text);

    if (!importados.length) {
      return NextResponse.json({ error: 'Arquivo sem concursos válidos' }, { status: 400 });
    }

    if (substituir) {
      await prisma.concurso.deleteMany({});
    }

    importados.sort((a, b) => a.numeroConcurso - b.numeroConcurso);
    let anterior: number[] | null = null;
    let inseridos = 0;

    for (const c of importados) {
      if (!substituir) {
        const existe = await prisma.concurso.findUnique({
          where: { numeroConcurso: c.numeroConcurso },
        });
        if (existe) {
          anterior = c.dezenas;
          continue;
        }
      }
      await prisma.concurso.create({ data: concursoToDbFields(c, anterior) });
      anterior = c.dezenas;
      inseridos++;
    }

    const stats = await recalcularEstatisticasGlobais();
    const concursos = await prisma.concurso.findMany({ orderBy: { numeroConcurso: 'asc' } });
    const dezenasList = concursos.map((c) => extrairDezenasConcurso(c));
    const repetidas = analisarRepetidasGeral(dezenasList);

    return NextResponse.json({
      inseridos,
      total: concursos.length,
      periodo: {
        de: importados[0].numeroConcurso,
        ate: importados[importados.length - 1].numeroConcurso,
      },
      repetidasGeral: {
        media: repetidas.media,
        mediana: repetidas.mediana,
        faixas: repetidas.faixas,
      },
      mediaSoma: stats.mediaSoma,
      fonte: 'data/lotofacil-resultados-3442-3542.txt',
    });
  } catch (e) {
    console.error(e);
    return NextResponse.json(
      { error: 'Falha ao importar. Verifique PostgreSQL e DATABASE_URL.' },
      { status: 500 },
    );
  }
}
