import { PrismaClient } from '@prisma/client';
import { seedPlanosPadrao } from '../src/lib/billing/plan-service';

const prisma = new PrismaClient();

async function main() {
  await seedPlanosPadrao();
  const planos = await prisma.plano.findMany({ orderBy: { ordem: 'asc' } });
  console.log(`Planos seed: ${planos.map((p) => p.slug).join(', ')}`);
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
