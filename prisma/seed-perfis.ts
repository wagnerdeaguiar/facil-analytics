import { PrismaClient } from '@prisma/client';
import { PERFIS_GERACAO } from '../src/lib/lotofacil/perfis';

const prisma = new PrismaClient();

async function main() {
  await prisma.perfilGeracao.deleteMany({ where: { isSystem: true } });

  for (const p of Object.values(PERFIS_GERACAO)) {
    await prisma.perfilGeracao.create({
      data: {
        id: p.id,
        nomePerfil: p.nome,
        descricao: p.descricao,
        basePadrao: p.basePadrao,
        criteriosAtivos: JSON.parse(JSON.stringify(p.config)),
        pesos: {},
        faixas: {
          scoreMinimo: p.scoreMinimo,
          maxDezenasIguais: p.maxDezenasIguais,
        },
        obrigatorios: {},
        isSystem: true,
      },
    });
  }
  console.log(`Perfis de geração: ${Object.keys(PERFIS_GERACAO).length} sincronizados.`);
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
