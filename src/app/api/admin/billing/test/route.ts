export { dynamic } from '@/lib/route-config';

import { NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/api-auth';
import { isAsaasConfigured, testarConexaoAsaas } from '@/lib/billing/asaas-client';

export async function GET() {
  try {
    const auth = await requireAdmin();
    if (auth.response) return auth.response;

    if (!isAsaasConfigured()) {
      return NextResponse.json({
        ok: false,
        configured: false,
        message: 'ASAAS_API_KEY não configurada.',
      });
    }

    const test = await testarConexaoAsaas();
    const webhookConfigured = Boolean(process.env.ASAAS_WEBHOOK_TOKEN?.trim());

    return NextResponse.json({
      ...test,
      configured: true,
      webhookConfigured,
      webhookUrl: `${process.env.NEXTAUTH_URL?.replace(/\/$/, '') ?? 'https://sortefacil.pro'}/api/asaas/webhook`,
    });
  } catch (e) {
    console.error(e);
    return NextResponse.json(
      {
        ok: false,
        configured: isAsaasConfigured(),
        error: e instanceof Error ? e.message : 'Falha ao conectar ao Asaas',
      },
      { status: 502 },
    );
  }
}
