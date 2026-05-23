import { NextResponse } from 'next/server';
import { requirePremium } from '@/lib/api-auth';
import { caminhoLotofacilXlsx } from '@/lib/lotofacil/excel-path';
import {
  importarConcursosLista,
  parsearXlsxArquivo,
  parsearXlsxBuffer,
  resumoXlsx,
} from '@/lib/services/import-concursos-xlsx';

const DEFAULT_PATH = caminhoLotofacilXlsx();

export async function POST(request: Request) {
  const auth = await requirePremium();
  if (auth.response) return auth.response;

  try {
    const body = await request.json().catch(() => ({}));
    const substituir = body.substituir !== false;
    const concursoDe = body.concursoDe ? Number(body.concursoDe) : undefined;
    const concursoAte = body.concursoAte ? Number(body.concursoAte) : undefined;
    const caminho = (body.caminho as string) || DEFAULT_PATH;

    const importados = body.base64
      ? parsearXlsxBuffer(Buffer.from(body.base64 as string, 'base64'), { concursoDe, concursoAte })
      : parsearXlsxArquivo(caminho, { concursoDe, concursoAte });

    const resultado = await importarConcursosLista(importados, substituir);
    const resumo = body.base64 ? null : resumoXlsx(caminho);

    return NextResponse.json({
      ...resultado,
      resumo,
      fonte: caminho,
    });
  } catch (e) {
    console.error(e);
    return NextResponse.json(
      {
        error:
          e instanceof Error
            ? e.message
            : 'Falha ao importar Excel. Baixe Lotofácil.xlsx do site da Caixa.',
      },
      { status: 500 },
    );
  }
}

export async function GET() {
  return NextResponse.json(
    { error: 'Importação disponível apenas no Plano Premium.' },
    { status: 403 },
  );
}
