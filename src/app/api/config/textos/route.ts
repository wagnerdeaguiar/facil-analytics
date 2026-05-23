export { dynamic } from '@/lib/route-config';

import { NextResponse } from 'next/server';
import { getTextosPlataforma } from '@/lib/plataforma-textos';

export async function GET() {
  const textos = await getTextosPlataforma();
  return NextResponse.json({ textos });
}
