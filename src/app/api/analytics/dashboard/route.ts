import { NextResponse } from 'next/server';
import { getDashboardData } from '@/lib/services/analytics';

export async function GET() {
  try {
    const data = await getDashboardData();
    return NextResponse.json(data);
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: 'Erro ao carregar dashboard' }, { status: 500 });
  }
}

