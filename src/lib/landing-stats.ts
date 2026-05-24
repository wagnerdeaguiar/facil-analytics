import { prisma } from '@/lib/db';
import { extrairDezenasConcurso } from '@/lib/lotofacil/metrics';
import { calcularFrequencias, type DezenaFreq } from '@/lib/lotofacil/pareto';

export type LandingStats = {
  hasData: boolean;
  totalConcursos: number;
  criteriosFortes: number;
  ultimo: {
    numero: number;
    data: string | null;
    dezenas: number[];
    pares: number;
    impares: number;
    soma: number;
  } | null;
  topQuentes: Pick<DezenaFreq, 'dezena' | 'percentual' | 'atrasoAtual' | 'classificacao'>[];
  topAtrasadas: Pick<DezenaFreq, 'dezena' | 'atrasoAtual' | 'percentual'>[];
};

const empty: LandingStats = {
  hasData: false,
  totalConcursos: 0,
  criteriosFortes: 0,
  ultimo: null,
  topQuentes: [],
  topAtrasadas: [],
};

export async function loadLandingStats(): Promise<LandingStats> {
  try {
    const [totalConcursos, ultimoRow, criteriosFortes] = await Promise.all([
      prisma.concurso.count(),
      prisma.concurso.findFirst({ orderBy: { numeroConcurso: 'desc' } }),
      prisma.criterioEstatistico.count({ where: { acima80Porcento: true } }),
    ]);

    if (!totalConcursos || !ultimoRow) {
      return { ...empty, totalConcursos, criteriosFortes };
    }

    const sampleSize = Math.min(totalConcursos, 800);
    const amostra = await prisma.concurso.findMany({
      orderBy: { numeroConcurso: 'desc' },
      take: sampleSize,
    });
    const ordenada = [...amostra].reverse();
    const freqs = calcularFrequencias(ordenada.map((c) => extrairDezenasConcurso(c)));

    const topQuentes = freqs
      .filter((f) => f.classificacao === 'Quente')
      .slice(0, 6)
      .map((f) => ({
        dezena: f.dezena,
        percentual: f.percentual,
        atrasoAtual: f.atrasoAtual,
        classificacao: f.classificacao,
      }));

    const topAtrasadas = [...freqs]
      .sort((a, b) => b.atrasoAtual - a.atrasoAtual)
      .slice(0, 5)
      .map((f) => ({
        dezena: f.dezena,
        atrasoAtual: f.atrasoAtual,
        percentual: f.percentual,
      }));

    const dataSorteio = ultimoRow.dataSorteio
      ? ultimoRow.dataSorteio.toLocaleDateString('pt-BR', {
          day: '2-digit',
          month: 'short',
          year: 'numeric',
        })
      : null;

    return {
      hasData: true,
      totalConcursos,
      criteriosFortes,
      ultimo: {
        numero: ultimoRow.numeroConcurso,
        data: dataSorteio,
        dezenas: extrairDezenasConcurso(ultimoRow),
        pares: ultimoRow.pares,
        impares: ultimoRow.impares,
        soma: ultimoRow.soma,
      },
      topQuentes,
      topAtrasadas,
    };
  } catch {
    return empty;
  }
}
