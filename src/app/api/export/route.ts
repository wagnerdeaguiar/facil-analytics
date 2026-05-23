import { NextResponse } from 'next/server';
import { requirePremium, requireSession } from '@/lib/api-auth';
import { enrichJogosParaExport, jogosToCSV, jogosToXLSXBuffer, jogosToPDFBuffer } from '@/lib/export';
import { jogosToCartelasPDFBuffer } from '@/lib/lotofacil/cartelas-pdf';
import { getTabelaAposta } from '@/lib/lotofacil/aposta-config';
import { prisma } from '@/lib/db';
import { extrairDezenasConcurso } from '@/lib/lotofacil/metrics';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const formato = (body.formato || 'csv') as 'csv' | 'xlsx' | 'pdf' | 'cartelas-pdf';

    const auth =
      formato === 'cartelas-pdf' ? await requireSession() : await requirePremium();
    if (auth.response) return auth.response;

    let jogos = body.jogos ?? [];
    const titulo = body.titulo || 'Fácil Analytics — Exportação';

    if (!jogos.length) {
      return NextResponse.json({ error: 'Sem jogos para exportar' }, { status: 400 });
    }

    const ultimo = await prisma.concurso.findFirst({ orderBy: { numeroConcurso: 'desc' } });
    const anterior = ultimo ? extrairDezenasConcurso(ultimo) : null;
    const tabelaAposta = await getTabelaAposta();
    jogos = enrichJogosParaExport(jogos, anterior);

    if (formato === 'csv') {
      const csv = jogosToCSV(jogos, tabelaAposta);
      return new NextResponse(csv, {
        headers: {
          'Content-Type': 'text/csv; charset=utf-8',
          'Content-Disposition': 'attachment; filename="jogos.csv"',
        },
      });
    }

    if (formato === 'xlsx') {
      const buf = jogosToXLSXBuffer(jogos, tabelaAposta);
      return new NextResponse(new Uint8Array(buf), {
        headers: {
          'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
          'Content-Disposition': 'attachment; filename="jogos.xlsx"',
        },
      });
    }

    if (formato === 'cartelas-pdf') {
      const pdf = await jogosToCartelasPDFBuffer(jogos, titulo, tabelaAposta);
      return new NextResponse(new Uint8Array(pdf), {
        headers: {
          'Content-Type': 'application/pdf',
          'Content-Disposition': 'attachment; filename="cartelas-lotofacil.pdf"',
        },
      });
    }

    if (formato === 'pdf') {
      const pdf = await jogosToPDFBuffer(jogos, titulo);
      return new NextResponse(new Uint8Array(pdf), {
        headers: {
          'Content-Type': 'application/pdf',
          'Content-Disposition': 'attachment; filename="jogos.pdf"',
        },
      });
    }

    return NextResponse.json({ error: 'Formato inválido' }, { status: 400 });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: 'Erro na exportação' }, { status: 500 });
  }
}

