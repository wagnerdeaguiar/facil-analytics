export { dynamic } from '@/lib/route-config';

import { NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/api-auth';
import { recalcularEstatisticasGlobais } from '@/lib/services/analytics';

export async function POST() {
  const auth = await requireAdmin();
  if (auth.response) return auth.response;

  try {
    const stats = await recalcularEstatisticasGlobais();
    return NextResponse.json(stats);
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: 'Erro ao recalcular' }, { status: 500 });
  }
}

