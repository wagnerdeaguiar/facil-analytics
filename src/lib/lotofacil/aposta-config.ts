import { TABELA_APOSTA_LOTOFACIL, type NumerosPorAposta } from './aposta';
import { getConfigApp, setConfigApp } from '@/lib/services/config-app';

export const CHAVE_TABELA_APOSTA = 'tabela_aposta_lotofacil';

export type LinhaAposta = { combinacoes: number; preco: number };
export type TabelaAposta = Record<NumerosPorAposta, LinhaAposta>;

export const TABELA_APOSTA_PADRAO: TabelaAposta = {
  15: { ...TABELA_APOSTA_LOTOFACIL[15] },
  16: { ...TABELA_APOSTA_LOTOFACIL[16] },
  17: { ...TABELA_APOSTA_LOTOFACIL[17] },
  18: { ...TABELA_APOSTA_LOTOFACIL[18] },
  19: { ...TABELA_APOSTA_LOTOFACIL[19] },
  20: { ...TABELA_APOSTA_LOTOFACIL[20] },
};

const NUMEROS_VALIDOS: NumerosPorAposta[] = [15, 16, 17, 18, 19, 20];

function parseLinha(raw: unknown): LinhaAposta | null {
  if (!raw || typeof raw !== 'object') return null;
  const o = raw as Record<string, unknown>;
  const combinacoes = Number(o.combinacoes);
  const preco = Number(o.preco);
  if (!Number.isFinite(combinacoes) || combinacoes < 1) return null;
  if (!Number.isFinite(preco) || preco <= 0) return null;
  return { combinacoes: Math.round(combinacoes), preco };
}

export function normalizarTabelaAposta(raw: unknown): TabelaAposta | null {
  if (!raw || typeof raw !== 'object') return null;
  const o = raw as Record<string, unknown>;
  const out = {} as TabelaAposta;
  for (const n of NUMEROS_VALIDOS) {
    const linha = parseLinha(o[String(n)] ?? o[n]);
    if (!linha) return null;
    out[n] = linha;
  }
  return out;
}

export async function getTabelaAposta(): Promise<TabelaAposta> {
  const salva = await getConfigApp<unknown>(CHAVE_TABELA_APOSTA);
  return normalizarTabelaAposta(salva) ?? TABELA_APOSTA_PADRAO;
}

export async function salvarTabelaAposta(tabela: TabelaAposta): Promise<TabelaAposta> {
  const norm = normalizarTabelaAposta(tabela);
  if (!norm) throw new Error('Tabela de apostas inválida.');
  await setConfigApp(CHAVE_TABELA_APOSTA, norm);
  return norm;
}

/** Recalcula preços 16–20 a partir do preço unitário de 15 dezenas (Caixa: comb × preço base). */
export function tabelaPorPrecoBase15(preco15: number, tabelaBase = TABELA_APOSTA_PADRAO): TabelaAposta {
  if (!Number.isFinite(preco15) || preco15 <= 0) {
    throw new Error('Preço de 15 dezenas inválido.');
  }
  const out = {} as TabelaAposta;
  for (const n of NUMEROS_VALIDOS) {
    out[n] = {
      combinacoes: tabelaBase[n].combinacoes,
      preco: Math.round(tabelaBase[n].combinacoes * preco15 * 100) / 100,
    };
  }
  return out;
}

export function infoApostaComTabela(numeros: number, tabela: TabelaAposta) {
  const n = Math.min(20, Math.max(15, numeros)) as NumerosPorAposta;
  return { numeros: n, ...tabela[n] };
}
