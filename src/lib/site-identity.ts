/** Identidade pública do site em produção (sortefacil.pro). */
export const SITE_DOMAIN = 'sortefacil.pro';
export const SITE_EMAIL = 'contato@sortefacil.pro';
export const SITE_NAME = 'Sorte Fácil';
export const SITE_TAGLINE = 'Plataforma estatística Lotofácil';

/** URL canônica — usa NEXTAUTH_URL em produção (obrigatório na Vercel). */
export function getSiteUrl(): string {
  const fromEnv = process.env.NEXTAUTH_URL?.trim().replace(/\/$/, '');
  if (fromEnv) return fromEnv;
  if (process.env.VERCEL_URL) return `https://${process.env.VERCEL_URL}`;
  return `https://${SITE_DOMAIN}`;
}
