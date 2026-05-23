import { NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/api-auth';
import { prisma } from '@/lib/db';
import {
  importarConcursosLista,
  parsearXlsxBuffer,
} from '@/lib/services/import-concursos-xlsx';

export async function POST(request: Request) {
  const auth = await requireAdmin();
  if (auth.response) return auth.response;

  try {
    const contentType = request.headers.get('content-type') ?? '';
    let buffer: Buffer;
    let substituir = true;
    let concursoDe: number | undefined;
    let concursoAte: number | undefined;
    let nomeArquivo = 'upload.xlsx';

    if (contentType.includes('multipart/form-data')) {
      const form = await request.formData();
      const file = form.get('arquivo');
      if (!file || !(file instanceof Blob)) {
        return NextResponse.json({ error: 'Envie o arquivo Excel (.xlsx) da Caixa no campo arquivo.' }, { status: 400 });
      }
      nomeArquivo = file instanceof File ? file.name : nomeArquivo;
      const ab = await file.arrayBuffer();
      buffer = Buffer.from(ab);
      substituir = form.get('substituir') !== 'false';
      const de = form.get('concursoDe');
      const ate = form.get('concursoAte');
      if (de) concursoDe = Number(de);
      if (ate) concursoAte = Number(ate);
    } else {
      const body = await request.json();
      if (!body.base64) {
        return NextResponse.json({ error: 'Envie multipart/form-data com arquivo ou JSON com base64.' }, { status: 400 });
      }
      buffer = Buffer.from(body.base64 as string, 'base64');
      substituir = body.substituir !== false;
      concursoDe = body.concursoDe ? Number(body.concursoDe) : undefined;
      concursoAte = body.concursoAte ? Number(body.concursoAte) : undefined;
      nomeArquivo = (body.nomeArquivo as string) || nomeArquivo;
    }

    const importados = parsearXlsxBuffer(buffer, { concursoDe, concursoAte });
    const resultado = await importarConcursosLista(importados, substituir);

    await prisma.auditLog.create({
      data: {
        userId: auth.session.user.id,
        eventType: 'admin_import_xlsx',
        description: `Importação CEF: ${resultado.inseridos} concursos (${substituir ? 'substituir' : 'incremental'})`,
        metadata: {
          arquivo: nomeArquivo,
          ...resultado,
        },
      },
    });

    return NextResponse.json({
      ok: true,
      arquivo: nomeArquivo,
      substituir,
      ...resultado,
    });
  } catch (e) {
    console.error(e);
    return NextResponse.json(
      {
        error:
          e instanceof Error
            ? e.message
            : 'Falha ao importar. Use o Excel baixado do site da Caixa (Lotofácil.xlsx).',
      },
      { status: 500 },
    );
  }
}
