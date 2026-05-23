export { dynamic } from '@/lib/route-config';

import { NextResponse } from 'next/server';
import { requireSession } from '@/lib/api-auth';
import { cancelUserSubscription } from '@/lib/billing/subscription-change';

export async function POST() {
  try {
    const auth = await requireSession();
    if (auth.response) return auth.response;

    const result = await cancelUserSubscription(auth.session.user.id);
    return NextResponse.json({ ok: true, ...result });
  } catch (e) {
    console.error(e);
    return NextResponse.json(
      { error: e instanceof Error ? e.message : 'Erro ao cancelar assinatura' },
      { status: 400 },
    );
  }
}
