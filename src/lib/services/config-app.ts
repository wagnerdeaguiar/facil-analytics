import { prisma } from '@/lib/db';

export async function getConfigApp<T>(chave: string): Promise<T | null> {
  const row = await prisma.configuracaoApp.findUnique({ where: { chave } });
  if (!row) return null;
  return row.valor as T;
}

export async function setConfigApp(chave: string, valor: unknown): Promise<void> {
  await prisma.configuracaoApp.upsert({
    where: { chave },
    create: { chave, valor: valor as object },
    update: { valor: valor as object },
  });
}
