import { NextResponse } from 'next/server';
import { getTabelaAposta, TABELA_APOSTA_PADRAO } from '@/lib/lotofacil/aposta-config';

/** Tabela de preços Lotofácil (15–20 dezenas) — leitura pública para a UI. */
export async function GET() {
  try {
    const tabela = await getTabelaAposta();
    return NextResponse.json({ tabela, padrao: TABELA_APOSTA_PADRAO });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ tabela: TABELA_APOSTA_PADRAO, padrao: TABELA_APOSTA_PADRAO });
  }
}
