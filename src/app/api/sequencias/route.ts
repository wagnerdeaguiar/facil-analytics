export { dynamic } from '@/lib/route-config';

import { NextResponse } from 'next/server';
import { getConcursosOrdenados } from '@/lib/services/analytics';
import { extrairDezenasConcurso } from '@/lib/lotofacil/metrics';
import { analiseCompletaSequenciaAtraso } from '@/lib/lotofacil/sequencia-atraso';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const deParam = searchParams.get('de');
    const ateParam = searchParams.get('ate');
    const usarUltimos10 = !deParam && !ateParam;

    let concursos = await getConcursosOrdenados();
    if (usarUltimos10) {
      concursos = concursos.slice(-10);
    } else {
      if (deParam) {
        const de = Number(deParam);
        concursos = concursos.filter((c) => c.numeroConcurso >= de);
      }
      if (ateParam) {
        const ate = Number(ateParam);
        concursos = concursos.filter((c) => c.numeroConcurso <= ate);
      }
    }

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
