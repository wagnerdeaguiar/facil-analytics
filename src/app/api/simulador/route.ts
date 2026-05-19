import { NextResponse } from 'next/server';
import { parseDezenasLine } from '@/lib/lotofacil/import';
import { simularJogos } from '@/lib/lotofacil/simulator';
import { analisarCriteriosJogosVencedores } from '@/lib/lotofacil/simulador-criterios';
import { getConcursosOrdenados } from '@/lib/services/analytics';
import { extrairDezenasConcurso } from '@/lib/lotofacil/metrics';
import { prisma } from '@/lib/db';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const concursoInicio = body.concursoInicio ? Number(body.concursoInicio) : undefined;
    const concursoFim = body.concursoFim ? Number(body.concursoFim) : undefined;

    let jogos: { dezenas: number[] }[] = body.jogos ?? [];
    if (body.textoJogos) {
      const linhas = String(body.textoJogos).split(/\r?\n/).filter(Boolean);
      jogos = linhas
        .map((l: string) => parseDezenasLine(l))
        .filter((d): d is number[] => d !== null)
        .map((dezenas) => ({ dezenas }));
    }

    if (!jogos.length) {
      return NextResponse.json({ error: 'Informe ao menos um jogo válido (15 dezenas)' }, { status: 400 });
    }

    const concursos = await getConcursosOrdenados();
    const lista = concursos.map((c) => ({
      numeroConcurso: c.numeroConcurso,
      dezenas: extrairDezenasConcurso(c),
    }));

    const resultado = simularJogos(jogos, lista, concursoInicio, concursoFim);

    const concursosMap = new Map(lista.map((c) => [c.numeroConcurso, c.dezenas]));
    const analiseCriterios = analisarCriteriosJogosVencedores(resultado.ranking, concursosMap);

    const loteId = `sim_${Date.now()}`;
    if (body.salvar) {
      const filtrados = lista.filter((c) => {
        if (concursoInicio && c.numeroConcurso < concursoInicio) return false;
        if (concursoFim && c.numeroConcurso > concursoFim) return false;
        return true;
      });
      const amostra = resultado.porJogo.slice(0, 20);
      await prisma.simulacao.createMany({
        data: amostra.flatMap((j) =>
          filtrados.slice(-50).map((c) => ({
            dezenasJogo: j.dezenas,
            concursoTestado: c.numeroConcurso,
            acertos: j.dezenas.filter((d) => c.dezenas.includes(d)).length,
            loteId,
          })),
        ),
      });
    }

    return NextResponse.json({ ...resultado, loteId, analiseCriterios });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: 'Erro na simulação' }, { status: 500 });
  }
}

