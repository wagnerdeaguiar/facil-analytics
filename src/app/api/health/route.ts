export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { isDevAuthEnabled } from '@/lib/auth-config';
import {
  getAsaasKeyDiagnostics,
  isAsaasConfigured,
  testarConexaoAsaas,
} from '@/lib/billing/asaas-client';

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

  const asaasKey = getAsaasKeyDiagnostics();
  let asaasApiOk = false;
  let asaasApiError: string | undefined;

  if (isAsaasConfigured() && !asaasKey.envMismatch) {
    try {
      await testarConexaoAsaas();
      asaasApiOk = true;
    } catch (e) {
      asaasApiError = e instanceof Error ? e.message : 'Falha ao conectar ao Asaas';
    }
  } else if (asaasKey.envMismatch) {
    asaasApiError = `Chave ${asaasKey.keyType} com ASAAS_ENV=${asaasKey.env}`;
  }

  return NextResponse.json({
    ok: database && (!isAsaasConfigured() || asaasApiOk),
    database,
    concursos,
    devAuth: isDevAuthEnabled(),
    asaasConfigured: isAsaasConfigured(),
    asaasApiOk,
    asaasApiError,
    asaasKeyType: asaasKey.keyType,
    asaasEnvMismatch: asaasKey.envMismatch,
    asaasEnv: asaasKey.env,
    webhookConfigured: Boolean(process.env.ASAAS_WEBHOOK_TOKEN?.trim()),
    deployCommit: process.env.VERCEL_GIT_COMMIT_SHA?.slice(0, 7) ?? null,
    dbError,
    expectedPort: '3010',
  });
}
