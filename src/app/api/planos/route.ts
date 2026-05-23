export { dynamic } from '@/lib/route-config';

import { NextResponse } from 'next/server';
import { getPlanosAtivos, seedPlanosPadrao } from '@/lib/billing/plan-service';

export async function GET() {
  let planos = await getPlanosAtivos();
  if (!planos.length) {
    await seedPlanosPadrao();
    planos = await getPlanosAtivos();
  }
  return NextResponse.json({ planos });
}
