import { NextResponse } from 'next/server';
import { validateCronRequest } from '@/lib/billing/cron-auth';
import { expirarAssinaturasVencidas } from '@/lib/billing/expirar-assinaturas';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

/** Job diário — expira assinaturas vencidas sem pagamento (Vercel Cron ou cron externo). */
export async function GET(request: Request) {
  const auth = validateCronRequest(request);
  if (!auth.ok) {
    return NextResponse.json({ error: auth.motivo ?? 'Não autorizado' }, { status: 401 });
  }

  try {
    const result = await expirarAssinaturasVencidas();
    return NextResponse.json({ ok: true, ...result });
  } catch (e) {
    console.error('[cron expirar-assinaturas]', e);
    return NextResponse.json(
      { error: e instanceof Error ? e.message : 'Erro no job' },
      { status: 500 },
    );
  }
}

export async function POST(request: Request) {
  return GET(request);
}
