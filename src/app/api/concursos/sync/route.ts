import { NextResponse } from 'next/server';
import { requirePremium } from '@/lib/api-auth';
import { sincronizarConcursosDesdeUltimo } from '@/lib/services/sync-concursos';

/** Sincroniza concursos novos a partir do último gravado no banco */
export async function POST() {
  const auth = await requirePremium();
  if (auth.response) return auth.response;

  try {
    const result = await sincronizarConcursosDesdeUltimo();
    return NextResponse.json(result);
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: 'Erro ao sincronizar concursos' }, { status: 500 });
  }
}

export async function GET() {
  return POST();
}
