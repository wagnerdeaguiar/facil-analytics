import { PrismaClient } from '@prisma/client';
import { concursoToDbFields } from '../src/lib/lotofacil/import';

const prisma = new PrismaClient();

/** Gera concursos pseudoaleatórios para demonstração (não são resultados oficiais) */
function gerarConcursoDemo(numero: number, anterior: number[] | null): number[] {
  const pool = Array.from({ length: 25 }, (_, i) => i + 1);
  const picked: number[] = [];

  if (anterior?.length === 15) {
    const rep = 7 + Math.floor(Math.random() * 4);
    const shuffled = [...anterior].sort(() => Math.random() - 0.5);
    picked.push(...shuffled.slice(0, rep));
  }

  while (picked.length < 15) {
    const i = Math.floor(Math.random() * pool.length);
    const n = pool.splice(i, 1)[0];
    if (!picked.includes(n)) picked.push(n);
  }

  return picked.sort((a, b) => a - b);
}

async function main() {
  const count = await prisma.concurso.count();
  if (count > 0) {
    console.log(`Já existem ${count} concursos. Seed ignorado.`);
    return;
  }

  const total = 250;
  let anterior: number[] | null = null;

  for (let n = 1; n <= total; n++) {
    const dezenas = gerarConcursoDemo(n, anterior);
    const fields = concursoToDbFields(
      { numeroConcurso: n, dataSorteio: new Date(2020, 0, n), dezenas },
      anterior,
    );
    await prisma.concurso.create({
      data: {
        ...fields,
        d1: dezenas[0],
        d2: dezenas[1],
        d3: dezenas[2],
        d4: dezenas[3],
        d5: dezenas[4],
        d6: dezenas[5],
        d7: dezenas[6],
        d8: dezenas[7],
        d9: dezenas[8],
        d10: dezenas[9],
        d11: dezenas[10],
        d12: dezenas[11],
        d13: dezenas[12],
        d14: dezenas[13],
        d15: dezenas[14],
      },
    });
    anterior = dezenas;
  }

  console.log(`Seed: ${total} concursos demo inseridos.`);
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
