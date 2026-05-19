import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { createCheckoutSession } from '@/lib/stripe';

export async function POST() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id || !session.user.email) {
    return NextResponse.json({ error: 'Faça login para assinar.' }, { status: 401 });
  }

  try {
    const checkout = await createCheckoutSession(session.user.id, session.user.email);
    return NextResponse.json({ url: checkout.url });
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Erro ao criar checkout';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
