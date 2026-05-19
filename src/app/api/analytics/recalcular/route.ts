import { NextResponse } from 'next/server';
import { recalcularEstatisticasGlobais } from '@/lib/services/analytics';

export async function POST() {
  try {
    const stats = await recalcularEstatisticasGlobais();
    return NextResponse.json(stats);
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: 'Erro ao recalcular' }, { status: 500 });
  }
}

