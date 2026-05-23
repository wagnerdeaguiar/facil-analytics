/** Tabela oficial Lotofácil — quantidade de números x preço (Caixa). */
export const TABELA_APOSTA_LOTOFACIL = {
  15: { combinacoes: 1, preco: 3.5 },
  16: { combinacoes: 16, preco: 56 },
  17: { combinacoes: 136, preco: 476 },
  18: { combinacoes: 816, preco: 2856 },
  19: { combinacoes: 3876, preco: 13566 },
  20: { combinacoes: 15504, preco: 54264 },
} as const;

export type NumerosPorAposta = keyof typeof TABELA_APOSTA_LOTOFACIL;

export function isNumerosPorAposta(n: number): n is NumerosPorAposta {
  return n >= 15 && n <= 20;
}

export function infoAposta(numeros: number) {
  const n = Math.min(20, Math.max(15, numeros)) as NumerosPorAposta;
  return { numeros: n, ...TABELA_APOSTA_LOTOFACIL[n] };
}

export function formatarPrecoAposta(valor: number): string {
  return valor.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

export function combinacoes15deN(n: number): number {
  return infoAposta(n).combinacoes;
}

/** Score minimo ajustado: apostas maiores diluem a media das sub-combinacoes de 15. */
export function scoreMinimoEfetivo(scoreMinimo: number, qtdDezenas: number): number {
  if (qtdDezenas <= 16) return scoreMinimo;
  const reducao = (qtdDezenas - 16) * 2;
  return Math.max(65, scoreMinimo - reducao);
}
