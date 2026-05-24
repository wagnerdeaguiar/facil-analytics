/** Verifica se o login Google está configurado no .env */
export function isGoogleAuthConfigured(): boolean {
  const id = process.env.GOOGLE_CLIENT_ID?.trim();
  const secret = process.env.GOOGLE_CLIENT_SECRET?.trim();
  return Boolean(id && secret);
}

export function isDevAuthEnabled(): boolean {
  return process.env.AUTH_DEV_MODE === 'true' && process.env.NODE_ENV !== 'production';
}

export function getDevAuthEmail(): string | null {
  const email = process.env.AUTH_DEV_EMAIL?.trim().toLowerCase();
  return email || null;
}

/** E-mails com acesso admin (separados por vírgula em ADMIN_EMAIL). */
export function getAdminEmails(): string[] {
  return (process.env.ADMIN_EMAIL ?? '')
    .split(',')
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean);
}

export function isAdminEmail(email: string): boolean {
  return getAdminEmails().includes(email.trim().toLowerCase());
}
