export { dynamic } from '@/lib/route-config';

import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

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

