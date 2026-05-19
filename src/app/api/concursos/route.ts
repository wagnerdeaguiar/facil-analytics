import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { parseCSVConcursos, parseJSONConcursos, concursoToDbFields } from '@/lib/lotofacil/import';
import { recalcularEstatisticasGlobais } from '@/lib/services/analytics';
import { extrairDezenasConcurso } from '@/lib/lotofacil/metrics';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const de = searchParams.get('de');
  const ate = searchParams.get('ate');

  const where: { numeroConcurso?: { gte?: number; lte?: number } } = {};
  if (de) where.numeroConcurso = { ...where.numeroConcurso, gte: parseInt(de, 10) };
  if (ate) where.numeroConcurso = { ...where.numeroConcurso, lte: parseInt(ate, 10) };

  const concursos = await prisma.concurso.findMany({
    where: Object.keys(where).length ? where : undefined,
    orderBy: { numeroConcurso: 'desc' },
    take: searchParams.get('limit') ? parseInt(searchParams.get('limit')!, 10) : undefined,
  });

  return NextResponse.json({ concursos, total: concursos.length });
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const formato = body.formato as 'csv' | 'json';
    const conteudo = body.conteudo as string;
    const jsonData = body.data;

    let importados =
      formato === 'csv'
        ? parseCSVConcursos(conteudo)
        : parseJSONConcursos(jsonData ?? JSON.parse(conteudo));

    if (!importados.length) {
      return NextResponse.json({ error: 'Nenhum concurso válido encontrado' }, { status: 400 });
    }

    const existentes = await prisma.concurso.findMany({
      select: { numeroConcurso: true },
    });
    const setExistentes = new Set(existentes.map((e) => e.numeroConcurso));

    importados = importados.filter((c) => !setExistentes.has(c.numeroConcurso));
    importados.sort((a, b) => a.numeroConcurso - b.numeroConcurso);

    const todosOrdenados = await prisma.concurso.findMany({ orderBy: { numeroConcurso: 'asc' } });
    let anterior: number[] | null =
      todosOrdenados.length > 0
        ? extrairDezenasConcurso(todosOrdenados[todosOrdenados.length - 1])
        : null;

    const mapAnteriores = new Map<number, number[]>();
    for (const c of todosOrdenados) {
      mapAnteriores.set(c.numeroConcurso, extrairDezenasConcurso(c));
    }
    for (const c of importados) {
      const ant = mapAnteriores.get(c.numeroConcurso - 1);
      if (ant) anterior = ant;
    }

    let inseridos = 0;
    for (const c of importados) {
      const ant =
        mapAnteriores.get(c.numeroConcurso - 1) ??
        (c.numeroConcurso > 1 ? mapAnteriores.get(c.numeroConcurso - 1) : null) ??
        anterior;
      const fields = concursoToDbFields(c, ant);
      await prisma.concurso.create({ data: fields });
      mapAnteriores.set(c.numeroConcurso, c.dezenas);
      inseridos++;
    }

    const stats = await recalcularEstatisticasGlobais();

    return NextResponse.json({
      inseridos,
      ignorados: setExistentes.size,
      total: stats.totalConcursos,
    });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: 'Falha na importação' }, { status: 500 });
  }
}

