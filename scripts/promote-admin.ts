/**
 * Promove um usuário a admin no banco (Neon/produção ou local).
 * Uso: npx tsx scripts/promote-admin.ts wagdeaguiar@gmail.com
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

const email = (process.argv[2] ?? '').trim().toLowerCase();
if (!email) {
  console.error('Uso: npx tsx scripts/promote-admin.ts seu@email.com');
  process.exit(1);
}

const prisma = new PrismaClient();

async function main() {
  const user = await prisma.user.findUnique({ where: { email } });
  if (!user) {
    console.error(`Usuário não encontrado: ${email}`);
    process.exit(1);
  }

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

  console.log(`OK — ${email} agora é admin (id: ${user.id})`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
