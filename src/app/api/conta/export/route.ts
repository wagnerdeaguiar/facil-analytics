export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import { requireSession } from '@/lib/api-auth';
import { prisma } from '@/lib/db';

/** Exportação de dados pessoais (LGPD — portabilidade). */
export async function GET() {
  const auth = await requireSession();
  if (auth.response) return auth.response;
  const userId = auth.session.user.id;

  const [user, subscription, payments, jogos, perfis, simulacoes, auditLogs] =
    await Promise.all([
      prisma.user.findUnique({
        where: { id: userId },
        select: {
          id: true,
          name: true,
          email: true,
          cpf: true,
          telefone: true,
          role: true,
          subscriptionStatus: true,
          createdAt: true,
          updatedAt: true,
          lastLoginAt: true,
        },
      }),
      prisma.subscription.findUnique({ where: { userId } }),
      prisma.payment.findMany({
        where: { userId },
        orderBy: { createdAt: 'desc' },
        select: {
          id: true,
          valor: true,
          status: true,
          metodo: true,
          dueDate: true,
          paidAt: true,
          createdAt: true,
          planoId: true,
        },
      }),
      prisma.jogoGerado.findMany({
        where: { userId },
        orderBy: { createdAt: 'desc' },
        take: 500,
        select: { id: true, dezenas: true, createdAt: true },
      }),
      prisma.perfilGeracao.findMany({
        where: { userId },
        select: { id: true, nomePerfil: true, createdAt: true, updatedAt: true },
      }),
      prisma.simulacao.findMany({
        where: { userId },
        orderBy: { createdAt: 'desc' },
        take: 100,
        select: {
          id: true,
          concursoTestado: true,
          acertos: true,
          dezenasJogo: true,
          createdAt: true,
        },
      }),
      prisma.auditLog.findMany({
        where: { userId },
        orderBy: { createdAt: 'desc' },
        take: 200,
        select: { eventType: true, description: true, createdAt: true },
      }),
    ]);

  const exportadoEm = new Date().toISOString();

  return NextResponse.json({
    exportadoEm,
    usuario: user,
    assinatura: subscription,
    pagamentos: payments,
    jogosGerados: jogos,
    perfis,
    simulacoes,
    historicoConta: auditLogs,
  });
}
