import { prisma } from '@/lib/db';
import { concursoToDbFields, fetchConcursosParaAtualizar } from '@/lib/lotofacil/import';
import { extrairDezenasConcurso } from '@/lib/lotofacil/metrics';
import { recalcularEstatisticasGlobais } from '@/lib/services/analytics';

export interface SyncConcursosResult {
  ultimoNoBanco: number;
  ultimoApi: number | null;
  inseridos: number;
  concursos: number[];
  fonte: string;
  message: string;
}

/** Sincroniza todos os concursos faltantes a partir do último gravado no banco. */
export async function sincronizarConcursosDesdeUltimo(): Promise<SyncConcursosResult> {
  const ultimoDb = await prisma.concurso.findFirst({
    orderBy: { numeroConcurso: 'desc' },
    select: { numeroConcurso: true },
  });
  const ultimoNoBanco = ultimoDb?.numeroConcurso ?? 0;

  const { concursos: novos, fonte } = await fetchConcursosParaAtualizar(ultimoNoBanco);
  const ultimoApi = novos.length ? novos[novos.length - 1].numeroConcurso : null;

  if (!novos.length) {
    return {
      ultimoNoBanco,
      ultimoApi,
      inseridos: 0,
      concursos: [],
      fonte,
      message:
        fonte === 'nenhuma'
          ? 'APIs indisponíveis. Importe via Excel em Resultados.'
          : `Base atualizada. Último concurso: #${ultimoNoBanco}.`,
    };
  }

  const ordenados = [...novos].sort((a, b) => a.numeroConcurso - b.numeroConcurso);
  const inseridosNumeros: number[] = [];

  for (const c of ordenados) {
    const existe = await prisma.concurso.findUnique({
      where: { numeroConcurso: c.numeroConcurso },
    });
    if (existe) continue;

    const anterior = await prisma.concurso.findFirst({
      where: { numeroConcurso: c.numeroConcurso - 1 },
    });
    const antDezenas = anterior ? extrairDezenasConcurso(anterior) : null;
    await prisma.concurso.create({ data: concursoToDbFields(c, antDezenas) });
    inseridosNumeros.push(c.numeroConcurso);
  }

  if (inseridosNumeros.length > 0) {
    await recalcularEstatisticasGlobais();
  }

  const ultimoAgora = inseridosNumeros.length
    ? inseridosNumeros[inseridosNumeros.length - 1]
    : ultimoNoBanco;

  return {
    ultimoNoBanco,
    ultimoApi: ultimoAgora,
    inseridos: inseridosNumeros.length,
    concursos: inseridosNumeros,
    fonte,
    message:
      inseridosNumeros.length > 0
        ? `Atualizado: concurso(s) ${inseridosNumeros.join(', ')} (#${ultimoNoBanco} → #${ultimoAgora}).`
        : `Nenhum concurso novo após verificação (#${ultimoNoBanco}).`,
  };
}
