/** Valida chamadas de cron (Vercel Cron ou agendador externo). */
export function validateCronRequest(request: Request): { ok: boolean; motivo?: string } {
  const secret = process.env.CRON_SECRET?.trim();

  if (!secret) {
    if (process.env.NODE_ENV === 'production') {
      return { ok: false, motivo: 'CRON_SECRET não configurado em produção.' };
    }
    return { ok: true };
  }

  const auth = request.headers.get('authorization');
  if (auth === `Bearer ${secret}`) return { ok: true };

  const header = request.headers.get('x-cron-secret');
  if (header === secret) return { ok: true };

  return { ok: false, motivo: 'Token de cron inválido.' };
}
