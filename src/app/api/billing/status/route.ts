export { dynamic } from '@/lib/route-config';

import { NextResponse } from 'next/server';
import { requireSession } from '@/lib/api-auth';
import { syncUserBillingFromAsaas } from '@/lib/billing/sync-payment';

export async function GET() {
  try {
    const auth = await requireSession();
    if (auth.response) return auth.response;

    const result = await syncUserBillingFromAsaas(auth.session.user.id);
    return NextResponse.json(result);
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: 'Erro ao consultar cobrança.' }, { status: 500 });
  }
}
