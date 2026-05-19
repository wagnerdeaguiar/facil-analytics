import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/db';

async function requireAdmin() {
  const session = await getServerSession(authOptions);
  if (session?.user?.role !== 'admin') {
    return null;
  }
  return session;
}

export async function GET(request: Request) {
  if (!(await requireAdmin())) {
    return NextResponse.json({ error: 'Acesso negado' }, { status: 403 });
  }

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
  const session = await requireAdmin();
  if (!session) {
    return NextResponse.json({ error: 'Acesso negado' }, { status: 403 });
  }

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
    await prisma.subscription.upsert({
      where: { userId },
      create: {
        userId,
        status: body.subscriptionStatus,
        plano: body.subscriptionStatus === 'active' ? 'premium' : 'free',
      },
      update: { status: body.subscriptionStatus },
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
