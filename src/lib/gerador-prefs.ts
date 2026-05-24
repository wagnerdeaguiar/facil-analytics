import { getConfigApp, setConfigApp } from '@/lib/services/config-app';
import { normalizarConfigGeracaoUI, type GeradorPrefsSalvas } from '@/lib/config-geracao-ui';

function chaveUsuario(userId: string) {
  return `gerador_prefs_${userId}`;
}

export function normalizarGeradorPrefs(raw: unknown): GeradorPrefsSalvas | null {
  if (!raw || typeof raw !== 'object') return null;
  const r = raw as Partial<GeradorPrefsSalvas>;
  if (!r.config) return null;
  return {
    config: normalizarConfigGeracaoUI(r.config),
    origemBase: typeof r.origemBase === 'string' ? r.origemBase : '20D',
    maxDezenasIguais: typeof r.maxDezenasIguais === 'number' ? r.maxDezenasIguais : 13,
    quantidade: typeof r.quantidade === 'number' ? r.quantidade : undefined,
    numerosPorAposta: typeof r.numerosPorAposta === 'number' ? r.numerosPorAposta : undefined,
    updatedAt: typeof r.updatedAt === 'string' ? r.updatedAt : undefined,
  };
}

export async function getGeradorPrefsUsuario(userId: string): Promise<GeradorPrefsSalvas | null> {
  const raw = await getConfigApp<unknown>(chaveUsuario(userId));
  return normalizarGeradorPrefs(raw);
}

export async function saveGeradorPrefsUsuario(userId: string, prefs: GeradorPrefsSalvas): Promise<GeradorPrefsSalvas> {
  const payload: GeradorPrefsSalvas = {
    ...prefs,
    config: normalizarConfigGeracaoUI(prefs.config),
    updatedAt: new Date().toISOString(),
  };
  await setConfigApp(chaveUsuario(userId), payload);
  return payload;
}
