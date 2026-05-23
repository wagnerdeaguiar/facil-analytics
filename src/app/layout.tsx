import type { Metadata, Viewport } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';
import { Providers } from '@/components/Providers';
import { AppShell } from '@/components/AppShell';
import { getSiteUrl, SITE_EMAIL, SITE_NAME, SITE_TAGLINE } from '@/lib/site-identity';

const inter = Inter({ subsets: ['latin'] });

const siteUrl = getSiteUrl();

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    default: `${SITE_NAME} — Lotofácil`,
    template: `%s | ${SITE_NAME}`,
  },
  description: `${SITE_TAGLINE}. Análise estatística, geração de jogos e simulação retroativa com transparência histórica.`,
  applicationName: SITE_NAME,
  authors: [{ name: SITE_NAME, url: siteUrl }],
  creator: SITE_NAME,
  openGraph: {
    type: 'website',
    locale: 'pt_BR',
    url: siteUrl,
    siteName: SITE_NAME,
    title: `${SITE_NAME} — Lotofácil`,
    description: SITE_TAGLINE,
  },
  alternates: {
    canonical: siteUrl,
  },
  robots: {
    index: true,
    follow: true,
  },
  other: {
    'contact:email': SITE_EMAIL,
    'contact:website': siteUrl,
  },
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  themeColor: '#0b1220',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR">
      <body className={`${inter.className} antialiased`}>
        <Providers>
          <AppShell>{children}</AppShell>
        </Providers>
      </body>
    </html>
  );
}
