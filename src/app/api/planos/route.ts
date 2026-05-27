export { dynamic } from '@/lib/route-config';

import { NextResponse } from 'next/server';
import { getPlanosAtivos } from '@/lib/billing/plan-service';

export async function GET() {
  const planos = await getPlanosAtivos();
  return NextResponse.json({
    planos,
    ...(planos.length === 0
      ? { aviso: 'Planos não configurados. Admin: acesse /admin → Planos ou rode npm run db:seed-planos.' }
      : {}),
  });
}
