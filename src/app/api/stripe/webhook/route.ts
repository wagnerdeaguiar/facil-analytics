import { NextResponse } from 'next/server';
import { handleStripeWebhook } from '@/lib/stripe';

export async function POST(request: Request) {
  const signature = request.headers.get('stripe-signature');
  if (!signature) {
    return NextResponse.json({ error: 'Assinatura ausente' }, { status: 400 });
  }

  const rawBody = await request.text();
  try {
    await handleStripeWebhook(rawBody, signature);
    return NextResponse.json({ received: true });
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Webhook inválido';
    return NextResponse.json({ error: msg }, { status: 400 });
  }
}
