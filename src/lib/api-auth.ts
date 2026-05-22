import { getServerSession } from 'next-auth';
import { NextResponse } from 'next/server';
import { authOptions } from '@/lib/auth';
import { isPremiumStatus } from '@/lib/subscription';
import type { Session } from 'next-auth';

type AuthResult =
  | { session: Session; response: null }
  | { session: null; response: NextResponse };

/** Exige usuário logado (produção e dev). */
export async function requireSession(): Promise<AuthResult> {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return {
      session: null,
      response: NextResponse.json({ error: 'Faça login para continuar.' }, { status: 401 }),
    };
  }
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

/** Exige papel admin. */
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
