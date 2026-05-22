import { readFileSync } from 'fs';
import { NextResponse } from 'next/server';
import { requireSession } from '@/lib/api-auth';
import { prisma } from '@/lib/db';
import { concursoToDbFields } from '@/lib/lotofacil/import';
import { parseXlsxLotofacil, resumoXlsx } from '@/lib/lotofacil/import-xlsx';
import { recalcularEstatisticasGlobais } from '@/lib/services/analytics';
import { analisarRepetidasGeral } from '@/lib/lotofacil/sequencia-atraso';
import { extrairDezenasConcurso } from '@/lib/lotofacil/metrics';

const DEFAULT_PATH = 'C:\\Users\\KAPAM\\Downloads\\Lotofácil.xlsx';

export async function POST(request: Request) {
  const auth = await requireSession();
  if (auth.response) return auth.response;

  try {
    const body = await request.json().catch(() => ({}));
    const substituir = body.substituir !== false;
    const concursoDe = body.concursoDe ? Number(body.concursoDe) : undefined;
    const concursoAte = body.concursoAte ? Number(body.concursoAte) : undefined;
    const caminho = (body.caminho as string) || DEFAULT_PATH;

    let importados;
    if (body.base64) {
      const buf = Buffer.from(body.base64 as string, 'base64');
      importados = parseXlsxLotofacil(buf, { concursoDe, concursoAte });
    } else {
      importados = parseXlsxLotofacil(caminho, { concursoDe, concursoAte });
    }

    if (!importados.length) {
      return NextResponse.json({ error: 'Nenhum concurso no Excel' }, { status: 400 });
    }

    const resumo = body.base64 ? null : resumoXlsx(caminho);

    if (substituir) await prisma.concurso.deleteMany({});

    importados.sort((a, b) => a.numeroConcurso - b.numeroConcurso);
    let anterior: number[] | null = null;
    let inseridos = 0;

    for (const c of importados) {
      if (!substituir) {
        const ex = await prisma.concurso.findUnique({ where: { numeroConcurso: c.numeroConcurso } });
        if (ex) {
          anterior = c.dezenas;
          continue;
        }
      }
      await prisma.concurso.create({ data: concursoToDbFields(c, anterior) });
      anterior = c.dezenas;
      inseridos++;
    }

    await recalcularEstatisticasGlobais();
    const concursos = await prisma.concurso.findMany({ orderBy: { numeroConcurso: 'asc' } });
    const repetidas = analisarRepetidasGeral(concursos.map((c) => extrairDezenasConcurso(c)));

    return NextResponse.json({
      inseridos,
      total: concursos.length,
      resumo,
      periodo: {
        de: importados[0].numeroConcurso,
        ate: importados[importados.length - 1].numeroConcurso,
      },
      repetidasGeral: { media: repetidas.media, mediana: repetidas.mediana },
      fonte: caminho,
    });
  } catch (e) {
    console.error(e);
    return NextResponse.json(
      {
        error:
          'Falha ao importar Excel. Verifique o caminho (padrão: Downloads/Lotofácil.xlsx) e o PostgreSQL.',
      },
      { status: 500 },
    );
  }
}

export async function GET() {
  try {
    const caminho = DEFAULT_PATH;
    const resumo = resumoXlsx(caminho);
    const amostra = parseXlsxLotofacil(caminho, { concursoDe: 3540, concursoAte: 3542 });
    return NextResponse.json({ caminho, resumo, amostra3540_3542: amostra });
  } catch (e) {
    return NextResponse.json({ error: 'Arquivo não encontrado ou inválido' }, { status: 404 });
  }
}
