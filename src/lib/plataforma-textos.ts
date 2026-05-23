import { getConfigApp, setConfigApp } from '@/lib/services/config-app';

export const CHAVE_TEXTOS_PLATAFORMA = 'textos_plataforma';

export interface TextosPlataforma {
  avisoValorTitulo: string;
  avisoValorTexto: string;
  avisoValorTextoCurto: string;
  landingPlanosRotulo: string;
  landingPlanosTitulo: string;
  landingPlanosSubtitulo: string;
  precosIntro: string;
  planoBotaoGratis: string;
  planoBotaoPago: string;
}

export const TEXTOS_PLATAFORMA_VAZIOS: TextosPlataforma = {
  avisoValorTitulo: '',
  avisoValorTexto: '',
  avisoValorTextoCurto: '',
  landingPlanosRotulo: '',
  landingPlanosTitulo: '',
  landingPlanosSubtitulo: '',
  precosIntro: '',
  planoBotaoGratis: '',
  planoBotaoPago: '',
};

export function normalizarTextosPlataforma(raw: unknown): TextosPlataforma {
  if (!raw || typeof raw !== 'object') return { ...TEXTOS_PLATAFORMA_VAZIOS };
  const o = raw as Record<string, unknown>;
  return {
    avisoValorTitulo: String(o.avisoValorTitulo ?? '').trim(),
    avisoValorTexto: String(o.avisoValorTexto ?? '').trim(),
    avisoValorTextoCurto: String(o.avisoValorTextoCurto ?? '').trim(),
    landingPlanosRotulo: String(o.landingPlanosRotulo ?? '').trim(),
    landingPlanosTitulo: String(o.landingPlanosTitulo ?? '').trim(),
    landingPlanosSubtitulo: String(o.landingPlanosSubtitulo ?? '').trim(),
    precosIntro: String(o.precosIntro ?? '').trim(),
    planoBotaoGratis: String(o.planoBotaoGratis ?? '').trim(),
    planoBotaoPago: String(o.planoBotaoPago ?? '').trim(),
  };
}

export async function getTextosPlataforma(): Promise<TextosPlataforma> {
  const salvo = await getConfigApp<unknown>(CHAVE_TEXTOS_PLATAFORMA);
  return normalizarTextosPlataforma(salvo);
}

export async function salvarTextosPlataforma(textos: TextosPlataforma): Promise<TextosPlataforma> {
  const norm = normalizarTextosPlataforma(textos);
  await setConfigApp(CHAVE_TEXTOS_PLATAFORMA, norm);
  return norm;
}
