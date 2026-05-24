/**
 * Promove usuário a admin e/ou Premium no banco (Neon/produção ou local).
 * Uso:
 *   npx tsx scripts/promote-admin.ts wagdeaguiar@gmail.com
 *   npx tsx scripts/promote-admin.ts wagdeaguiar@gmail.com --premium
 *   npx tsx scripts/promote-admin.ts wagdeaguiar@gmail.com --admin --premium
 */
import { existsSync, readFileSync } from 'fs';
import { join } from 'path';
import { PrismaClient } from '@prisma/client';

function loadEnvFile(name: string) {
  const path = join(process.cwd(), name);
  if (!existsSync(path)) return;
  for (const line of readFileSync(path, 'utf8').split('\n')) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const eq = trimmed.indexOf('=');
    if (eq <= 0) continue;
    const key = trimmed.slice(0, eq).trim();
    if (process.env[key]) continue;
    let val = trimmed.slice(eq + 1).trim();
    if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
      val = val.slice(1, -1);
    }
    process.env[key] = val;
  }
}

loadEnvFile('.env');
loadEnvFile('.env.vercel');

const args = process.argv.slice(2).filter((a) => !a.startsWith('--'));
const flags = new Set(process.argv.slice(2).filter((a) => a.startsWith('--')));

const email = (args[0] ?? '').trim().toLowerCase();
const asAdmin = flags.has('--admin') || flags.size === 0 || (!flags.has('--premium-only') && !flags.has('--premium'));
const asPremium = flags.has('--premium') || flags.has('--premium-only');

if (!email) {
  console.error('Uso: npx tsx scripts/promote-admin.ts seu@email.com [--admin] [--premium]');
  process.exit(1);
}

const prisma = new PrismaClient();

async function main() {
  const user = await prisma.user.findUnique({ where: { email } });
  if (!user) {
    console.error(`Usuário não encontrado: ${email}`);
    process.exit(1);
  }

  const changes: string[] = [];

  if (asAdmin) {
    await prisma.user.update({
      where: { id: user.id },
      data: { role: 'admin' },
    });
    await prisma.auditLog.create({
      data: {
        userId: user.id,
        eventType: 'admin_promoted',
        description: 'Promovido a administrador via script promote-admin',
      },
    });
    changes.push('admin');
  }

  if (asPremium) {
    const plano =
      (await prisma.plano.findFirst({ where: { slug: 'premium', ativo: true } })) ??
      (await prisma.plano.findFirst({ where: { ativo: true, slug: { not: 'free' } }, orderBy: { ordem: 'desc' } }));

    const renovacao = new Date();
    renovacao.setFullYear(renovacao.getFullYear() + 10);

    await prisma.subscription.upsert({
      where: { userId: user.id },
      create: {
        userId: user.id,
        status: 'active',
        plano: plano?.slug ?? 'premium',
        planoId: plano?.id ?? null,
        valor: plano?.valor ?? 0,
        periodicidade: plano?.periodicidade ?? 'monthly',
        gateway: 'manual',
        dataInicio: new Date(),
        dataRenovacao: renovacao,
        currentPeriodEnd: renovacao,
        dataCancelamento: null,
      },
      update: {
        status: 'active',
        plano: plano?.slug ?? 'premium',
        planoId: plano?.id ?? null,
        valor: plano?.valor ?? 0,
        periodicidade: plano?.periodicidade ?? 'monthly',
        gateway: 'manual',
        dataRenovacao: renovacao,
        currentPeriodEnd: renovacao,
        dataCancelamento: null,
      },
    });

    await prisma.user.update({
      where: { id: user.id },
      data: { subscriptionStatus: 'active' },
    });

    await prisma.auditLog.create({
      data: {
        userId: user.id,
        eventType: 'payment_approved',
        description: `Premium manual ativado via script (${plano?.slug ?? 'premium'})`,
        metadata: { gateway: 'manual', adminGrant: true },
      },
    });
    changes.push('premium');
  }

  console.log(`OK — ${email}: ${changes.join(' + ') || 'nenhuma alteração'} (id: ${user.id})`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
