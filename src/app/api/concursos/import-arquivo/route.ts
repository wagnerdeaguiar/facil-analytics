import { readFileSync } from 'fs';
import { NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/api-auth';
import { parseTxtMazuSoft } from '@/lib/lotofacil/import';

/** Lê arquivo externo (caminho absoluto) — apenas em desenvolvimento local */
export async function POST(request: Request) {
  if (process.env.NODE_ENV === 'production') {
    return NextResponse.json({ error: 'Rota disponível apenas em desenvolvimento.' }, { status: 403 });
  }
  const auth = await requireAdmin();
  if (auth.response) return auth.response;

  try {
    const body = await request.json();
    const caminho = body.caminho as string | undefined;
    if (!caminho) {
      return NextResponse.json({ error: 'Informe caminho absoluto do .txt' }, { status: 400 });
    }

    const text = readFileSync(caminho, 'utf-8');
    const concursos = parseTxtMazuSoft(text);

    return NextResponse.json({
      preview: true,
      total: concursos.length,
      primeiro: concursos[0]?.numeroConcurso,
      ultimo: concursos[concursos.length - 1]?.numeroConcurso,
      conteudo: concursos
        .slice(0, 3)
        .map((c) => `${c.numeroConcurso} - ${c.dezenas.join(',')}`)
        .join('\n'),
      instrucao: 'Use POST /api/concursos com { formato: "csv", conteudo: <texto> } ou import-bundled',
    });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: 'Não foi possível ler o arquivo' }, { status: 500 });
  }
}
