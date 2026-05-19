import { withAuth } from 'next-auth/middleware';
import { NextResponse } from 'next/server';

const PREMIUM_PATHS = [
  '/gerador',
  '/simulador',
  '/exportacao',
  '/configuracoes',
  '/perfis',
  '/meus-jogos',
  '/minhas-simulacoes',
  '/relatorios-completos',
];

const AUTH_PATHS = ['/dashboard', '/conta'];

export default withAuth(
  function middleware(req) {
    const token = req.nextauth.token;
    const path = req.nextUrl.pathname;

    if (path.startsWith('/admin')) {
      if (token?.role !== 'admin') {
        return NextResponse.redirect(new URL('/', req.url));
      }
    }

    const needsPremium = PREMIUM_PATHS.some((p) => path === p || path.startsWith(`${p}/`));
    if (needsPremium) {
      const status = token?.subscriptionStatus as string | undefined;
      if (status !== 'active' && status !== 'trial') {
        const url = new URL('/precos', req.url);
        url.searchParams.set('premium', path);
        return NextResponse.redirect(url);
      }
    }

    return NextResponse.next();
  },
  {
    callbacks: {
      authorized: ({ token, req }) => {
        const path = req.nextUrl.pathname;

        if (path.startsWith('/admin')) return !!token;
        if (AUTH_PATHS.some((p) => path === p || path.startsWith(`${p}/`))) return !!token;
        if (PREMIUM_PATHS.some((p) => path === p || path.startsWith(`${p}/`))) return !!token;

        return true;
      },
    },
  },
);

export const config = {
  matcher: [
    '/dashboard/:path*',
    '/gerador/:path*',
    '/simulador/:path*',
    '/exportacao/:path*',
    '/configuracoes/:path*',
    '/perfis/:path*',
    '/conta/:path*',
    '/admin/:path*',
    '/meus-jogos/:path*',
    '/minhas-simulacoes/:path*',
    '/relatorios-completos/:path*',
  ],
};
