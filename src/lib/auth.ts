import type { NextAuthOptions } from 'next-auth';
import GoogleProvider from 'next-auth/providers/google';
import CredentialsProvider from 'next-auth/providers/credentials';
import { PrismaAdapter } from '@next-auth/prisma-adapter';
import { prisma } from '@/lib/db';
import { getDevAuthEmail, isAdminEmail, isDevAuthEnabled, isGoogleAuthConfigured } from '@/lib/auth-config';
import { getPlanoBySlug } from '@/lib/billing/plan-service';
import { normalizeEmail, verifyPassword } from '@/lib/password';

function buildProviders(): NonNullable<NextAuthOptions['providers']> {
  const providers: NonNullable<NextAuthOptions['providers']> = [];

  if (isGoogleAuthConfigured()) {
    providers.push(
      GoogleProvider({
        clientId: process.env.GOOGLE_CLIENT_ID!,
        clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
      }),
    );
  }

  if (isDevAuthEnabled()) {
    const devEmail = getDevAuthEmail();
    providers.push(
      CredentialsProvider({
        id: 'dev',
        name: 'Desenvolvimento',
        credentials: {
          email: { label: 'E-mail', type: 'email', placeholder: devEmail ?? 'dev@local.test' },
        },
        async authorize(credentials) {
          const email = (credentials?.email || devEmail || '').trim().toLowerCase();
          if (!email) return null;

          const isAdmin = isAdminEmail(email);
          const premium = process.env.AUTH_DEV_PREMIUM === 'true';
          const subscriptionStatus = premium ? 'active' : 'free';
          const premiumPlano = premium ? await getPlanoBySlug('premium') : null;

          const user = await prisma.user.upsert({
            where: { email },
            create: {
              email,
              name: email.split('@')[0],
              role: isAdmin ? 'admin' : 'user',
              subscriptionStatus,
            },
            update: {
              lastLoginAt: new Date(),
              role: isAdmin ? 'admin' : undefined,
              subscriptionStatus: premium ? 'active' : undefined,
            },
          });

          await prisma.subscription.upsert({
            where: { userId: user.id },
            create: {
              userId: user.id,
              status: subscriptionStatus,
              plano: premium ? 'premium' : 'free',
              planoId: premiumPlano?.id,
              valor: premiumPlano?.valor ?? 0,
              periodicidade: premium ? (premiumPlano?.periodicidade ?? 'monthly') : 'none',
              gateway: premium ? 'manual' : undefined,
            },
            update: premium
              ? {
                  status: 'active',
                  plano: 'premium',
                  planoId: premiumPlano?.id,
                  valor: premiumPlano?.valor ?? 0,
                }
              : {},
          });

          return {
            id: user.id,
            email: user.email,
            name: user.name,
            image: user.image,
            role: user.role,
            subscriptionStatus: user.subscriptionStatus,
            isBlocked: user.isBlocked,
          };
        },
      }),
    );
  }

  if (!isDevAuthEnabled()) {
    providers.push(
      CredentialsProvider({
        id: 'credentials',
        name: 'E-mail e senha',
        credentials: {
          email: { label: 'E-mail', type: 'email' },
          password: { label: 'Senha', type: 'password' },
        },
        async authorize(credentials) {
          const email = normalizeEmail(credentials?.email ?? '');
          const password = credentials?.password ?? '';
          if (!email || !password) return null;

          const user = await prisma.user.findUnique({ where: { email } });
          if (!user?.passwordHash || user.isBlocked) return null;

          const valid = await verifyPassword(password, user.passwordHash);
          if (!valid) return null;

          return {
            id: user.id,
            email: user.email,
            name: user.name,
            image: user.image,
            role: user.role,
            subscriptionStatus: user.subscriptionStatus,
            isBlocked: user.isBlocked,
          };
        },
      }),
    );
  }

  return providers;
}

export const authOptions: NextAuthOptions = {
  adapter: PrismaAdapter(prisma),
  providers: buildProviders(),
  pages: {
    signIn: '/entrar',
    error: '/entrar',
  },
  callbacks: {
    async session({ session, user, token }) {
      const userId = user?.id ?? token?.sub;
      if (!userId) return session;

      const dbUser = await prisma.user.findUnique({
        where: { id: userId },
        select: { role: true, subscriptionStatus: true, isBlocked: true },
      });

      if (session.user) {
        session.user.id = userId;
        session.user.role = dbUser?.role ?? 'user';
        session.user.subscriptionStatus = dbUser?.subscriptionStatus ?? 'free';
        session.user.isBlocked = dbUser?.isBlocked ?? false;
      }
      return session;
    },
    async signIn({ user, account }) {
      if (account?.provider === 'dev') {
        if (!isDevAuthEnabled()) return false;
        return true;
      }

      if (account?.provider === 'credentials') {
        if (user.isBlocked) return false;
        return true;
      }

      if (!user.email) return false;

      const blocked = await prisma.user.findUnique({
        where: { email: user.email },
        select: { isBlocked: true },
      });
      if (blocked?.isBlocked) return false;
      return true;
    },
    async jwt({ token, user }) {
      if (user?.id) {
        token.sub = user.id;
      }
      if (token.sub) {
        const dbUser = await prisma.user.findUnique({
          where: { id: token.sub },
          select: { subscriptionStatus: true, role: true, isBlocked: true },
        });
        token.subscriptionStatus = dbUser?.subscriptionStatus ?? 'free';
        token.role = dbUser?.role ?? 'user';
        token.isBlocked = dbUser?.isBlocked ?? false;
      }
      return token;
    },
  },
  events: {
    async signIn({ user, account }) {
      if (!user.id) return;
      const isAdmin = isAdminEmail(user.email ?? '');
      await prisma.user.update({
        where: { id: user.id },
        data: {
          lastLoginAt: new Date(),
          ...(isAdmin ? { role: 'admin' } : {}),
        },
      });
      await prisma.auditLog.create({
        data: {
          userId: user.id,
          eventType: 'login',
          description:
            account?.provider === 'dev'
              ? 'Login modo desenvolvimento'
              : account?.provider === 'credentials'
                ? 'Login com e-mail e senha'
                : 'Login realizado via Google',
        },
      });
    },
    async createUser({ user }) {
      const isAdmin = isAdminEmail(user.email ?? '');
      await prisma.user.update({
        where: { id: user.id },
        data: {
          role: isAdmin ? 'admin' : 'user',
          subscriptionStatus: 'free',
        },
      });
      await prisma.subscription.upsert({
        where: { userId: user.id },
        create: { userId: user.id, status: 'free' },
        update: {},
      });
      await prisma.auditLog.create({
        data: {
          userId: user.id,
          eventType: 'account_created',
          description: 'Conta criada',
        },
      });
    },
  },
  session: {
    // JWT necessário para login com e-mail/senha (Credentials) e modo dev
    strategy: 'jwt',
    maxAge: 30 * 24 * 60 * 60,
  },
  secret: process.env.NEXTAUTH_SECRET,
};

export { isPremiumStatus } from './subscription';

export async function getSessionUser() {
  const { getServerSession } = await import('next-auth');
  return getServerSession(authOptions);
}
