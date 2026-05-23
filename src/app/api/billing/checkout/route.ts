import { NextResponse } from 'next/server';
import { requireSession } from '@/lib/api-auth';
import { createBillingCheckout } from '@/lib/billing/checkout';
import type { MetodoPagamento } from '@/lib/billing/types';

export async function POST(request: Request) {
  try {
    const auth = await requireSession();
    if (auth.response) return auth.response;

    const body = await request.json();
    const planoId = (body.planoId ?? body.planoSlug ?? 'premium') as string;
    const metodo = (body.metodo ?? 'pix') as MetodoPagamento;

    const result = await createBillingCheckout(auth.session.user.id, planoId, metodo);
    return NextResponse.json(result);
  } catch (e) {
    console.error(e);
    return NextResponse.json(
      { error: e instanceof Error ? e.message : 'Erro ao iniciar checkout' },
      { status: 400 },
    );
  }
}
