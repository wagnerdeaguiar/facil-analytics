import type { NextAuthOptions } from 'next-auth';
import GoogleProvider from 'next-auth/providers/google';
import CredentialsProvider from 'next-auth/providers/credentials';
import { PrismaAdapter } from '@next-auth/prisma-adapter';
import { prisma } from '@/lib/db';
import { getDevAuthEmail, isDevAuthEnabled, isGoogleAuthConfigured } from '@/lib/auth-config';

const adminEmails = (process.env.ADMIN_EMAIL ?? '')
  .split(',')
  .map((e) => e.trim().toLowerCase())
  .filter(Boolean);

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

          const isAdmin = adminEmails.includes(email);
          const premium = process.env.AUTH_DEV_PREMIUM === 'true';
          const subscriptionStatus = premium ? 'active' : 'free';

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
              valor: premium ? 4.99 : 0,
            },
            update: premium ? { status: 'active', plano: 'premium' } : {},
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
      const isAdmin = adminEmails.includes((user.email ?? '').toLowerCase());
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
            account?.provider === 'dev' ? 'Login modo desenvolvimento' : 'Login realizado via Google',
        },
      });
    },
    async createUser({ user }) {
      const isAdmin = adminEmails.includes((user.email ?? '').toLowerCase());
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
    // Credentials (modo dev) exige JWT; Google funciona com adapter em ambos
    strategy: isDevAuthEnabled() ? 'jwt' : 'database',
    maxAge: 30 * 24 * 60 * 60,
  },
  secret: process.env.NEXTAUTH_SECRET,
};

export { isPremiumStatus } from './subscription';

export async function getSessionUser() {
  const { getServerSession } = await import('next-auth');
  return getServerSession(authOptions);
}
