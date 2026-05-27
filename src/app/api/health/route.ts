export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { isAsaasConfigured, testarConexaoAsaas, getAsaasKeyDiagnostics } from '@/lib/billing/asaas-client';

export async function GET(request: Request) {
  let database = false;
  let concursos = 0;

  try {
    concursos = await prisma.concurso.count();
    database = true;
  } catch {
    database = false;
  }

  const publicPayload = {
    ok: database,
    database,
    deployCommit: process.env.VERCEL_GIT_COMMIT_SHA?.slice(0, 7) ?? null,
  };

  const detailed = new URL(request.url).searchParams.get('detailed') === '1';
  if (!detailed) {
    return NextResponse.json(publicPayload);
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
    ...publicPayload,
    concursos,
    asaasConfigured: isAsaasConfigured(),
    asaasApiOk,
    asaasApiError,
    asaasKeyType: asaasKey.keyType,
    asaasEnvMismatch: asaasKey.envMismatch,
    asaasEnv: asaasKey.env,
    webhookConfigured: Boolean(process.env.ASAAS_WEBHOOK_TOKEN?.trim()),
  });
}
