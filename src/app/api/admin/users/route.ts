import { NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/api-auth';
import { getPlanoBySlug } from '@/lib/billing/plan-service';
import { syncSubscriptionAccess } from '@/lib/billing/sync-access';
import { prisma } from '@/lib/db';

export async function GET(request: Request) {
  const auth = await requireAdmin();
  if (auth.response) return auth.response;

  const { searchParams } = new URL(request.url);
  const q = searchParams.get('q')?.trim();
  const status = searchParams.get('status');

  const users = await prisma.user.findMany({
    where: {
      ...(q
        ? {
            OR: [
              { email: { contains: q, mode: 'insensitive' } },
              { name: { contains: q, mode: 'insensitive' } },
            ],
          }
        : {}),
      ...(status ? { subscriptionStatus: status } : {}),
    },
    orderBy: { createdAt: 'desc' },
    take: 100,
    include: {
      subscription: true,
      _count: { select: { jogos: true } },
    },
  });

  return NextResponse.json({ users });
}

export async function PATCH(request: Request) {
  const auth = await requireAdmin();
  if (auth.response) return auth.response;
  const session = auth.session;

  const body = await request.json();
  const userId = body.userId as string;
  if (!userId) {
    return NextResponse.json({ error: 'userId obrigatório' }, { status: 400 });
  }

  const data: {
    subscriptionStatus?: string;
    role?: string;
    isBlocked?: boolean;
  } = {};

  if (body.subscriptionStatus) data.subscriptionStatus = body.subscriptionStatus;
  if (body.role) data.role = body.role;
  if (typeof body.isBlocked === 'boolean') data.isBlocked = body.isBlocked;

  const user = await prisma.user.update({
    where: { id: userId },
    data,
  });

  if (body.subscriptionStatus) {
    const status = body.subscriptionStatus as string;
    const premiumPlano = await getPlanoBySlug('premium');
    const freePlano = await getPlanoBySlug('free');
    const isPaid = status === 'active' || status === 'trial';

    await syncSubscriptionAccess({
      userId,
      status: status as 'free' | 'active' | 'trial' | 'past_due' | 'canceled' | 'failed' | 'expired' | 'pending',
      planoSlug: isPaid ? 'premium' : 'free',
      planoId: isPaid ? premiumPlano?.id : freePlano?.id,
      valor: isPaid ? (premiumPlano?.valor ?? 0) : 0,
      periodicidade: isPaid ? (premiumPlano?.periodicidade ?? 'monthly') : 'none',
      gateway: 'manual',
    });
  }

  await prisma.auditLog.create({
    data: {
      userId: session.user.id,
      eventType: 'admin_user_update',
      description: `Admin alterou usuário ${user.email}`,
      metadata: body,
    },
  });

  return NextResponse.json({ user });
}
