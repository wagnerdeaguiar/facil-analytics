/** Atualiza campos de estrutura horizontal nos concursos existentes */
import { PrismaClient } from '@prisma/client';
import { extrairDezenasConcurso } from '../src/lib/lotofacil/metrics';
import { analisarEstruturaHorizontal } from '../src/lib/lotofacil/estrutura-horizontal';

const prisma = new PrismaClient();

async function main() {
  const concursos = await prisma.concurso.findMany({ orderBy: { numeroConcurso: 'asc' } });
  let n = 0;
  for (const c of concursos) {
    const dezenas = extrairDezenasConcurso(c);
    const est = analisarEstruturaHorizontal(dezenas);
    await prisma.concurso.update({
      where: { id: c.id },
      data: {
        maiorSequenciaSorteada: est.maiorSequenciaSorteada,
        maiorSequenciaAusente: est.maiorSequenciaAusente,
        blocosSorteados: est.blocosSorteados,
        blocosAusentes: est.blocosAusentes,
      },
    });
    n++;
    if (n % 500 === 0) console.log(`${n}/${concursos.length}`);
  }
  console.log(`Atualizados ${n} concursos.`);
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
