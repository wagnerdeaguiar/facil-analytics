export { dynamic } from '@/lib/route-config';

import { NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/api-auth';
import { prisma } from '@/lib/db';
import { concursoToDbFields } from '@/lib/lotofacil/import';
import { recalcularEstatisticasGlobais } from '@/lib/services/analytics';
import { extrairDezenasConcurso } from '@/lib/lotofacil/metrics';

export async function POST(request: Request) {
  const auth = await requireAdmin();
  if (auth.response) return auth.response;

  try {
    const body = await request.json();
    const numeroConcurso = Number(body.numeroConcurso);
    let dezenas = (body.dezenas as number[])?.map(Number).filter((n) => n >= 1 && n <= 25);

    if (!numeroConcurso || numeroConcurso < 1) {
      return NextResponse.json({ error: 'Informe o número do concurso.' }, { status: 400 });
    }

    if (!dezenas || dezenas.length !== 15) {
      return NextResponse.json(
        { error: 'Informe exatamente 15 dezenas entre 1 e 25, sem repetir.' },
        { status: 400 },
      );
    }

    dezenas = [...new Set(dezenas)].sort((a, b) => a - b);
    if (dezenas.length !== 15) {
      return NextResponse.json({ error: 'Há dezenas duplicadas.' }, { status: 400 });
    }

    const existente = await prisma.concurso.findUnique({ where: { numeroConcurso } });
    if (existente) {
      return NextResponse.json({ error: `Concurso ${numeroConcurso} já existe.` }, { status: 409 });
    }

    const anteriorRow = await prisma.concurso.findFirst({
      where: { numeroConcurso: { lt: numeroConcurso } },
      orderBy: { numeroConcurso: 'desc' },
    });
    const anterior = anteriorRow ? extrairDezenasConcurso(anteriorRow) : null;

    const fields = concursoToDbFields(
      {
        numeroConcurso,
        dataSorteio: body.dataSorteio ? String(body.dataSorteio) : undefined,
        dezenas,
      },
      anterior,
    );

    const criado = await prisma.concurso.create({ data: fields });
    await recalcularEstatisticasGlobais();

    return NextResponse.json({
      ok: true,
      concurso: criado,
      mensagem: `Concurso ${numeroConcurso} cadastrado com sucesso.`,
    });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: 'Erro ao cadastrar concurso.' }, { status: 500 });
  }
}
