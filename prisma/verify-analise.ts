import { PrismaClient } from '@prisma/client';
import { extrairDezenasConcurso } from '../src/lib/lotofacil/metrics';
import { analiseCompletaSequenciaAtraso } from '../src/lib/lotofacil/sequencia-atraso';

const prisma = new PrismaClient();

async function main() {
  const c = await prisma.concurso.findMany({ orderBy: { numeroConcurso: 'asc' } });
  const list = c.map((x) => extrairDezenasConcurso(x));
  const a = analiseCompletaSequenciaAtraso(list, c[c.length - 1].numeroConcurso);

  console.log('Total concursos:', c.length);
  console.log('Repetidas média:', a.repetidasGeral.media, '| mediana:', a.repetidasGeral.mediana);
  console.log('Faixas repetidas:');
  a.repetidasGeral.faixas.forEach((f) => console.log(`  ${f.faixa}: ${f.percentual}%`));
  console.log('Distribuição repetidas:');
  a.repetidasGeral.distribuicao.forEach((d) =>
    console.log(`  ${d.valor} repetidas: ${d.quantidade}x (${d.percentual}%)`),
  );

  for (const n of [2, 13, 7, 20]) {
    const d = a.dezenas.find((x) => x.dezena === n)!;
    console.log(
      `Dezena ${String(n).padStart(2, '0')}: seq=${d.sequenciaAtual} atr=${d.atrasoAtual} (${d.statusSequencia}/${d.statusAtraso})`,
    );
  }
}

main().finally(() => prisma.$disconnect());
