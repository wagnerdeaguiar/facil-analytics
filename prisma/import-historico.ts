/**
 * Importa data/lotofacil-resultados-3442-3542.txt (formato MazuSoft)
 * Uso: npx tsx prisma/import-historico.ts
 * Opcional: npx tsx prisma/import-historico.ts "C:\caminho\arquivo.txt"
 */
import { readFileSync } from 'fs';
import { join } from 'path';
import { PrismaClient } from '@prisma/client';
import { parseTxtMazuSoft, concursoToDbFields } from '../src/lib/lotofacil/import';
import { recalcularEstatisticasGlobais } from '../src/lib/services/analytics';

const prisma = new PrismaClient();

async function main() {
  const argPath = process.argv[2];
  const defaultPath = join(process.cwd(), 'data', 'lotofacil-resultados-3442-3542.txt');
  const filePath = argPath ?? defaultPath;

  console.log('Lendo:', filePath);
  const text = readFileSync(filePath, 'utf-8');
  const importados = parseTxtMazuSoft(text);
  console.log(`Concursos no arquivo: ${importados.length}`);

  if (!importados.length) {
    console.error('Nenhum concurso válido.');
    process.exit(1);
  }

  await prisma.concurso.deleteMany({});
  console.log('Base limpa. Inserindo concursos…');

  importados.sort((a, b) => a.numeroConcurso - b.numeroConcurso);
  let anterior: number[] | null = null;

  for (const c of importados) {
    const fields = concursoToDbFields(c, anterior);
    await prisma.concurso.create({ data: fields });
    anterior = c.dezenas;
  }

  console.log(`Inseridos ${importados.length} concursos (${importados[0].numeroConcurso} – ${importados[importados.length - 1].numeroConcurso})`);

  const stats = await recalcularEstatisticasGlobais();
  console.log('Estatísticas recalculadas.');
  console.log('Média soma:', stats.mediaSoma);
  console.log('Média soma histórica:', stats.mediaSoma);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
