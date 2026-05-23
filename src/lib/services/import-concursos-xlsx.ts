import { prisma } from '@/lib/db';
import { concursoToDbFields } from '@/lib/lotofacil/import';
import { parseXlsxLotofacil, resumoXlsx } from '@/lib/lotofacil/import-xlsx';
import type { ConcursoImportado } from '@/lib/lotofacil/import';
import { recalcularEstatisticasGlobais } from '@/lib/services/analytics';
import { analisarRepetidasGeral } from '@/lib/lotofacil/sequencia-atraso';
import { extrairDezenasConcurso } from '@/lib/lotofacil/metrics';

export interface ImportConcursosOptions {
  substituir?: boolean;
  concursoDe?: number;
  concursoAte?: number;
}

export interface ImportConcursosResult {
  inseridos: number;
  ignorados: number;
  total: number;
  periodo: { de: number; ate: number };
  repetidasGeral: { media: number; mediana: number };
}

export function parsearXlsxBuffer(
  buffer: Buffer,
  opts: ImportConcursosOptions = {},
): ConcursoImportado[] {
  return parseXlsxLotofacil(buffer, {
    concursoDe: opts.concursoDe,
    concursoAte: opts.concursoAte,
  });
}

export function parsearXlsxArquivo(
  caminho: string,
  opts: ImportConcursosOptions = {},
): ConcursoImportado[] {
  return parseXlsxLotofacil(caminho, {
    concursoDe: opts.concursoDe,
    concursoAte: opts.concursoAte,
  });
}

export async function importarConcursosLista(
  importados: ConcursoImportado[],
  substituir = true,
): Promise<ImportConcursosResult> {
  if (!importados.length) {
    throw new Error('Nenhum concurso encontrado no arquivo.');
  }

  if (substituir) await prisma.concurso.deleteMany({});

  importados.sort((a, b) => a.numeroConcurso - b.numeroConcurso);
  let anterior: number[] | null = null;
  let inseridos = 0;
  let ignorados = 0;

  for (const c of importados) {
    if (!substituir) {
      const ex = await prisma.concurso.findUnique({ where: { numeroConcurso: c.numeroConcurso } });
      if (ex) {
        anterior = c.dezenas;
        ignorados++;
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

  return {
    inseridos,
    ignorados,
    total: concursos.length,
    periodo: {
      de: importados[0].numeroConcurso,
      ate: importados[importados.length - 1].numeroConcurso,
    },
    repetidasGeral: { media: repetidas.media, mediana: repetidas.mediana },
  };
}

export { resumoXlsx };
