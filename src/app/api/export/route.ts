import { NextResponse } from 'next/server';
import { requirePremium } from '@/lib/api-auth';
import { enrichJogosParaExport, jogosToCSV, jogosToXLSXBuffer, jogosToPDFBuffer } from '@/lib/export';
import { prisma } from '@/lib/db';
import { extrairDezenasConcurso } from '@/lib/lotofacil/metrics';

export async function POST(request: Request) {
  const auth = await requirePremium();
  if (auth.response) return auth.response;

  try {
    const body = await request.json();
    const formato = (body.formato || 'csv') as 'csv' | 'xlsx' | 'pdf';
    let jogos = body.jogos ?? [];
    const titulo = body.titulo || 'Fácil Analytics — Exportação';

    if (!jogos.length) {
      return NextResponse.json({ error: 'Sem jogos para exportar' }, { status: 400 });
    }

    const ultimo = await prisma.concurso.findFirst({ orderBy: { numeroConcurso: 'desc' } });
    const anterior = ultimo ? extrairDezenasConcurso(ultimo) : null;
    jogos = enrichJogosParaExport(jogos, anterior);

    if (formato === 'csv') {
      const csv = jogosToCSV(jogos);
      return new NextResponse(csv, {
        headers: {
          'Content-Type': 'text/csv; charset=utf-8',
          'Content-Disposition': 'attachment; filename="jogos.csv"',
        },
      });
    }

    if (formato === 'xlsx') {
      const buf = jogosToXLSXBuffer(jogos);
      return new NextResponse(new Uint8Array(buf), {
        headers: {
          'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
          'Content-Disposition': 'attachment; filename="jogos.xlsx"',
        },
      });
    }

    const pdf = await jogosToPDFBuffer(jogos, titulo);
    return new NextResponse(new Uint8Array(pdf), {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': 'attachment; filename="jogos.pdf"',
      },
    });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: 'Erro na exportação' }, { status: 500 });
  }
}

