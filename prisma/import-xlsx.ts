/**
 * Importa Lotofácil.xlsx (aba LOTOFÁCIL)
 * Uso:
 *   npx tsx prisma/import-xlsx.ts
 *   npx tsx prisma/import-xlsx.ts "C:\Users\KAPAM\Downloads\Lotofácil.xlsx"
 *   npx tsx prisma/import-xlsx.ts --de 3442 --ate 3542
 *   npx tsx prisma/import-xlsx.ts --append  (não apaga base)
 */
import { PrismaClient } from '@prisma/client';
import { concursoToDbFields } from '../src/lib/lotofacil/import';
import { parseXlsxLotofacil, resumoXlsx } from '../src/lib/lotofacil/import-xlsx';
import { recalcularEstatisticasGlobais } from '../src/lib/services/analytics';

const prisma = new PrismaClient();

function parseArgs() {
  const args = process.argv.slice(2);
  let path = 'C:\\Users\\KAPAM\\Downloads\\Lotofácil.xlsx';
  let de: number | undefined;
  let ate: number | undefined;
  let substituir = true;

  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--de') de = parseInt(args[++i], 10);
    else if (args[i] === '--ate') ate = parseInt(args[++i], 10);
    else if (args[i] === '--append') substituir = false;
    else if (!args[i].startsWith('--')) path = args[i];
  }
  return { path, de, ate, substituir };
}

async function main() {
  const { path, de, ate, substituir } = parseArgs();
  console.log('Arquivo:', path);
  console.log('Resumo:', resumoXlsx(path));

  const importados = parseXlsxLotofacil(path, { concursoDe: de, concursoAte: ate });
  console.log(`Concursos: ${importados.length}`);

  if (!importados.length) process.exit(1);

  if (substituir) {
    await prisma.concurso.deleteMany({});
    console.log('Base limpa.');
  }

  importados.sort((a, b) => a.numeroConcurso - b.numeroConcurso);
  let anterior: number[] | null = null;

  if (!substituir) {
    const antesDoPrimeiro = importados[0].numeroConcurso - 1;
    const prev = await prisma.concurso.findUnique({
      where: { numeroConcurso: antesDoPrimeiro },
    });
    if (prev) {
      anterior = [
        prev.d1, prev.d2, prev.d3, prev.d4, prev.d5, prev.d6, prev.d7, prev.d8, prev.d9, prev.d10,
        prev.d11, prev.d12, prev.d13, prev.d14, prev.d15,
      ].sort((a, b) => a - b);
    }
  }

  let inseridos = 0;
  for (const c of importados) {
    if (!substituir) {
      const ex = await prisma.concurso.findUnique({ where: { numeroConcurso: c.numeroConcurso } });
      if (ex) {
        anterior = c.dezenas;
        continue;
      }
    }
    await prisma.concurso.create({ data: concursoToDbFields(c, anterior) });
    anterior = c.dezenas;
    inseridos++;
    if (inseridos % 500 === 0) console.log('…', inseridos);
  }

  console.log(
    `Inseridos ${inseridos} (${importados[0].numeroConcurso} – ${importados[importados.length - 1].numeroConcurso})`,
  );
  await recalcularEstatisticasGlobais();
  console.log('OK.');
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
