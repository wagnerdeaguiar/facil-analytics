export { dynamic } from '@/lib/route-config';

import { NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/api-auth';
import { getFaturamentoResumo, listarPagamentos } from '@/lib/billing/faturamento-service';

export async function GET(request: Request) {
  const auth = await requireAdmin();
  if (auth.response) return auth.response;

  const { searchParams } = new URL(request.url);
  const status = searchParams.get('status') ?? undefined;
  const userId = searchParams.get('userId') ?? undefined;
  const limit = searchParams.get('limit') ? Number(searchParams.get('limit')) : 50;
  const offset = searchParams.get('offset') ? Number(searchParams.get('offset')) : 0;

  const [resumo, pagamentos] = await Promise.all([
    getFaturamentoResumo(),
    listarPagamentos({ status, userId, limit, offset }),
  ]);

  return NextResponse.json({ resumo, pagamentos });
}
