import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getConcursosOrdenados } from '@/lib/services/analytics';
import { extrairDezenasConcurso } from '@/lib/lotofacil/metrics';
import {
  calcularFrequencias,
  coberturaHistoricaBases,
  estatisticasBase,
  montarBasesPareto,
} from '@/lib/lotofacil/pareto';

export async function GET() {
  try {
    const concursos = await getConcursosOrdenados();
    const dezenasList = concursos.map((c) => extrairDezenasConcurso(c));
    const freqs = calcularFrequencias(dezenasList);
    const { base18, base19, base20, ranking } = montarBasesPareto(freqs);

    const basesDb = await prisma.basePareto.findMany();
    const bases =
      basesDb.length >= 3
        ? basesDb
        : [
            { tipo: '18D', dezenas: base18 },
            { tipo: '19D', dezenas: base19 },
            { tipo: '20D', dezenas: base20 },
          ];

    const cobertura = coberturaHistoricaBases(
      dezenasList,
      bases.map((b) => ({ tipo: b.tipo, dezenas: b.dezenas })),
    );

    const stats = bases.map((b) => ({
      tipo: b.tipo,
      dezenas: b.dezenas,
      estatisticas: estatisticasBase(b.dezenas),
    }));

    const ultimo = concursos[concursos.length - 1];
    const ultimoDezenas = ultimo ? extrairDezenasConcurso(ultimo) : null;

    return NextResponse.json({
      ranking,
      bases: stats,
      cobertura,
      ultimoConcurso: ultimo
        ? { numero: ultimo.numeroConcurso, dezenas: ultimoDezenas }
        : null,
    });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: 'Erro' }, { status: 500 });
  }
}

export async function PUT(request: Request) {
  try {
    const body = await request.json();
    const { tipo, dezenas } = body as { tipo: string; dezenas: number[] };
    if (!tipo || !Array.isArray(dezenas) || dezenas.length < 15) {
      return NextResponse.json({ error: 'Base inválida' }, { status: 400 });
    }
    const sorted = [...new Set(dezenas)].sort((a, b) => a - b);
    await prisma.basePareto.upsert({
      where: { tipo },
      create: { tipo, dezenas: sorted },
      update: { dezenas: sorted },
    });
    return NextResponse.json({ ok: true, dezenas: sorted });
  } catch (e) {
    return NextResponse.json({ error: 'Erro ao salvar' }, { status: 500 });
  }
}

