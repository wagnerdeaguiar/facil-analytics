import { getServerSession } from 'next-auth';
import { NextResponse } from 'next/server';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { isPremiumStatus } from '@/lib/subscription';
import type { Session } from 'next-auth';

type AuthResult =
  | { session: Session; response: null }
  | { session: null; response: NextResponse };

const MSG_ACESSO_NEGADO = 'Acesso negado.';
const MSG_CONTA_SUSPENSA = 'Conta suspensa. Entre em contato com o suporte.';
const MSG_LOGIN = 'Faça login para continuar.';

/** Revalida bloqueio e papel no banco (evita token desatualizado). */
async function carregarUsuarioSeguro(userId: string) {
  return prisma.user.findUnique({
    where: { id: userId },
    select: { id: true, role: true, isBlocked: true, subscriptionStatus: true },
  });
}

/** Exige usuário logado, ativo e não bloqueado. */
export async function requireSession(): Promise<AuthResult> {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return {
      session: null,
      response: NextResponse.json({ error: MSG_LOGIN }, { status: 401 }),
    };
  }

  const dbUser = await carregarUsuarioSeguro(session.user.id);
  if (!dbUser || dbUser.isBlocked) {
    return {
      session: null,
      response: NextResponse.json({ error: MSG_CONTA_SUSPENSA }, { status: 403 }),
    };
  }

  session.user.role = dbUser.role;
  session.user.subscriptionStatus = dbUser.subscriptionStatus;
  session.user.isBlocked = false;

  return { session, response: null };
}

/** Exige plano Premium ativo ou trial. */
export async function requirePremium(): Promise<AuthResult> {
  const auth = await requireSession();
  if (auth.response) return auth;
  if (!isPremiumStatus(auth.session.user.subscriptionStatus)) {
    return {
      session: null,
      response: NextResponse.json(
        { error: 'Esta funcionalidade faz parte do Plano Premium.' },
        { status: 403 },
      ),
    };
  }
  return auth;
}

/** Exige papel admin (validado no banco). */
export async function requireAdmin(): Promise<AuthResult> {
  const auth = await requireSession();
  if (auth.response) return auth;
  if (auth.session.user.role !== 'admin') {
    return {
      session: null,
      response: NextResponse.json({ error: 'Acesso restrito a administradores.' }, { status: 403 }),
    };
  }
  return auth;
}

/** Impede acesso a recurso de outro usuário (LGPD). */
export function denyIfNotOwner(
  sessionUserId: string,
  resourceUserId: string | null | undefined,
): NextResponse | null {
  if (!resourceUserId || resourceUserId === sessionUserId) return null;
  return NextResponse.json({ error: MSG_ACESSO_NEGADO }, { status: 403 });
}
