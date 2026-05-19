import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/db';

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Não autenticado' }, { status: 401 });
  }

  const sub = await prisma.subscription.findUnique({
    where: { userId: session.user.id },
  });

  return NextResponse.json({
    status: sub?.status ?? session.user.subscriptionStatus ?? 'free',
    dataInicio: sub?.dataInicio,
    dataRenovacao: sub?.dataRenovacao,
    valor: sub?.valor,
  });
}
