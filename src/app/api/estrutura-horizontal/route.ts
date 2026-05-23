export { dynamic } from '@/lib/route-config';

import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { extrairDezenasConcurso } from '@/lib/lotofacil/metrics';
import { analisarEstruturaHorizontal } from '@/lib/lotofacil/estrutura-horizontal';

export async function GET() {
  try {
    const concursos = await prisma.concurso.findMany({
      orderBy: { numeroConcurso: 'asc' },
      select: {
        numeroConcurso: true,
        maiorSequenciaSorteada: true,
        maiorSequenciaAusente: true,
        blocosSorteados: true,
        blocosAusentes: true,
        d1: true, d2: true, d3: true, d4: true, d5: true,
        d6: true, d7: true, d8: true, d9: true, d10: true,
        d11: true, d12: true, d13: true, d14: true, d15: true,
      },
    });

    const result = concursos.map((c) => {
      let maiorSequenciaSorteada = c.maiorSequenciaSorteada;
      let maiorSequenciaAusente = c.maiorSequenciaAusente;
      let blocosSorteados = (c.blocosSorteados as string[]) ?? [];
      let blocosAusentes = (c.blocosAusentes as string[]) ?? [];

      if (!maiorSequenciaSorteada) {
        const dezenas = extrairDezenasConcurso(c);
        const est = analisarEstruturaHorizontal(dezenas);
        maiorSequenciaSorteada = est.maiorSequenciaSorteada;
        maiorSequenciaAusente = est.maiorSequenciaAusente;
        blocosSorteados = est.blocosSorteados;
        blocosAusentes = est.blocosAusentes;
      }

      return {
        numeroConcurso: c.numeroConcurso,
        maiorSequenciaSorteada,
        maiorSequenciaAusente,
        blocosSorteados,
        blocosAusentes,
      };
    });

    return NextResponse.json({ concursos: result });
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Erro';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
