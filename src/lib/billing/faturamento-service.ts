import { prisma } from '@/lib/db';

export async function getFaturamentoResumo() {
  const [totalRecebido, totalPendente, totalAtrasado, assinaturasAtivas, assinaturasInadimplentes] =
    await Promise.all([
      prisma.payment.aggregate({
        where: { status: { in: ['confirmed', 'received'] } },
        _sum: { valor: true },
        _count: true,
      }),
      prisma.payment.aggregate({
        where: { status: 'pending' },
        _sum: { valor: true },
        _count: true,
      }),
      prisma.payment.aggregate({
        where: { status: 'overdue' },
        _sum: { valor: true },
        _count: true,
      }),
      prisma.user.count({ where: { subscriptionStatus: 'active' } }),
      prisma.user.count({ where: { subscriptionStatus: 'past_due' } }),
    ]);

  const mrrPlanos = await prisma.subscription.findMany({
    where: { status: 'active', periodicidade: 'monthly' },
    select: { valor: true },
  });
  const mrrEstimado = mrrPlanos.reduce((s, x) => s + x.valor, 0);

  return {
    totalRecebido: totalRecebido._sum.valor ?? 0,
    qtdRecebidos: totalRecebido._count,
    totalPendente: totalPendente._sum.valor ?? 0,
    qtdPendentes: totalPendente._count,
    totalAtrasado: totalAtrasado._sum.valor ?? 0,
    qtdAtrasados: totalAtrasado._count,
    assinaturasAtivas,
    assinaturasInadimplentes,
    mrrEstimado,
  };
}

export async function listarPagamentos(opts: {
  status?: string;
  userId?: string;
  limit?: number;
  offset?: number;
}) {
  const limit = Math.min(opts.limit ?? 50, 200);
  const offset = opts.offset ?? 0;

  const [items, total] = await Promise.all([
    prisma.payment.findMany({
      where: {
        ...(opts.status ? { status: opts.status } : {}),
        ...(opts.userId ? { userId: opts.userId } : {}),
      },
      include: {
        user: { select: { id: true, name: true, email: true } },
        plano: { select: { slug: true, nome: true } },
      },
      orderBy: { createdAt: 'desc' },
      take: limit,
      skip: offset,
    }),
    prisma.payment.count({
      where: {
        ...(opts.status ? { status: opts.status } : {}),
        ...(opts.userId ? { userId: opts.userId } : {}),
      },
    }),
  ]);

  return { items, total, limit, offset };
}

export async function listarPagamentosUsuario(userId: string) {
  return prisma.payment.findMany({
    where: { userId },
    include: { plano: { select: { nome: true, slug: true } } },
    orderBy: { createdAt: 'desc' },
    take: 24,
  });
}
