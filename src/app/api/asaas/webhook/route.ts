export { dynamic } from '@/lib/route-config';

import { NextResponse } from 'next/server';
import { handleAsaasWebhook } from '@/lib/billing/webhook-asaas';

export async function POST(request: Request) {
  try {
    const rawBody = await request.text();
    const token = request.headers.get('asaas-access-token');
    const result = await handleAsaasWebhook(rawBody, token);
    return NextResponse.json({ ok: true, ...result });
  } catch (e) {
    console.error('[asaas webhook]', e);
    const msg = e instanceof Error ? e.message : 'Webhook error';
    const isAuth = /token|webhook|autentica/i.test(msg);
    return NextResponse.json({ error: msg }, { status: isAuth ? 401 : 400 });
  }
}
