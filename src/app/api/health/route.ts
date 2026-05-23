export { dynamic } from '@/lib/route-config';

import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { isDevAuthEnabled } from '@/lib/auth-config';

export async function GET() {
  let database = false;
  let concursos = 0;
  let dbError: string | undefined;

  try {
    concursos = await prisma.concurso.count();
    database = true;
  } catch (e) {
    dbError = e instanceof Error ? e.message : 'Erro de conexão';
  }

  return NextResponse.json({
    ok: database,
    database,
    concursos,
    devAuth: isDevAuthEnabled(),
    dbError,
    expectedPort: '3010',
  });
}
