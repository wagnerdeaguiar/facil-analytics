import { NextResponse } from 'next/server';
import { getConcursosOrdenados } from '@/lib/services/analytics';
import { extrairDezenasConcurso } from '@/lib/lotofacil/metrics';
import { analiseCompletaSequenciaAtraso } from '@/lib/lotofacil/sequencia-atraso';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const de = searchParams.get('de') ? Number(searchParams.get('de')) : undefined;
    const ate = searchParams.get('ate') ? Number(searchParams.get('ate')) : undefined;

    let concursos = await getConcursosOrdenados();
    if (de) concursos = concursos.filter((c) => c.numeroConcurso >= de);
    if (ate) concursos = concursos.filter((c) => c.numeroConcurso <= ate);

    const dezenasList = concursos.map((c) => extrairDezenasConcurso(c));
    const ultimo = concursos[concursos.length - 1];

    const analise = analiseCompletaSequenciaAtraso(
      dezenasList,
      ultimo?.numeroConcurso,
    );

    return NextResponse.json({
      periodo: {
        de: concursos[0]?.numeroConcurso,
        ate: ultimo?.numeroConcurso,
        total: concursos.length,
      },
      analise,
    });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: 'Erro ao analisar sequências e atrasos' }, { status: 500 });
  }
}
