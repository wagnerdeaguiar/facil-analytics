import { isAdminEmail } from '@/lib/auth-config';
import { prisma } from '@/lib/db';
import { hashPassword, normalizeEmail, validatePasswordStrength } from '@/lib/password';

export type RegisterInput = {
  name?: string;
  email: string;
  password: string;
};

export type RegisterResult =
  | { ok: true; userId: string }
  | { ok: false; error: string; code: 'EMAIL_EXISTS' | 'GOOGLE_ACCOUNT' | 'VALIDATION' };

export async function registerUserWithPassword(input: RegisterInput): Promise<RegisterResult> {
  const email = normalizeEmail(input.email);
  const name = input.name?.trim() || email.split('@')[0];

  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return { ok: false, error: 'Informe um e-mail válido.', code: 'VALIDATION' };
  }

  const pwdError = validatePasswordStrength(input.password);
  if (pwdError) return { ok: false, error: pwdError, code: 'VALIDATION' };

  const existing = await prisma.user.findUnique({
    where: { email },
    include: { accounts: { select: { provider: true } } },
  });

  if (existing?.passwordHash) {
    return { ok: false, error: 'Este e-mail já possui cadastro. Faça login ou recupere a senha.', code: 'EMAIL_EXISTS' };
  }

  if (existing?.accounts.some((a) => a.provider === 'google')) {
    return {
      ok: false,
      error: 'Este e-mail já está vinculado ao Google. Use “Entrar com Google”.',
      code: 'GOOGLE_ACCOUNT',
    };
  }

  const isAdmin = isAdminEmail(email);
  const passwordHash = await hashPassword(input.password);

  const user = existing
    ? await prisma.user.update({
        where: { id: existing.id },
        data: { name, passwordHash, role: isAdmin ? 'admin' : existing.role },
      })
    : await prisma.user.create({
        data: {
          email,
          name,
          passwordHash,
          role: isAdmin ? 'admin' : 'user',
          subscriptionStatus: 'free',
        },
      });

  await prisma.subscription.upsert({
    where: { userId: user.id },
    create: { userId: user.id, status: 'free', plano: 'free' },
    update: {},
  });

  await prisma.auditLog.create({
    data: {
      userId: user.id,
      eventType: 'account_created',
      description: 'Conta criada com e-mail e senha',
    },
  });

  return { ok: true, userId: user.id };
}
