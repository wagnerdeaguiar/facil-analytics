/** Estrutura horizontal: blocos consecutivos sorteados e ausentes (universo 01-25) */

const UNIVERSO = Array.from({ length: 25 }, (_, i) => i + 1);

export function formatNumber(n: number): string {
  return String(n).padStart(2, '0');
}

export function validateGame(numbers: number[]): { valid: boolean; errors: string[] } {
  const errors: string[] = [];
  if (numbers.length !== 15) errors.push('O jogo deve ter exatamente 15 dezenas.');
  const set = new Set(numbers);
  if (set.size !== 15) errors.push('Não pode haver dezenas duplicadas.');
  for (const n of numbers) {
    if (n < 1 || n > 25) errors.push(`Dezena inválida: ${n}`);
  }
  return { valid: errors.length === 0, errors };
}

/** Blocos consecutivos presentes no jogo */
export function getDrawnBlocks(numbers: number[]): string[] {
  const set = new Set(numbers);
  const blocks: string[] = [];
  let start: number | null = null;
  let prev: number | null = null;

  for (const n of UNIVERSO) {
    if (set.has(n)) {
      if (start === null) start = n;
      prev = n;
    } else if (start !== null && prev !== null) {
      blocks.push(start === prev ? formatNumber(start) : `${formatNumber(start)}-${formatNumber(prev)}`);
      start = null;
      prev = null;
    }
  }
  if (start !== null && prev !== null) {
    blocks.push(start === prev ? formatNumber(start) : `${formatNumber(start)}-${formatNumber(prev)}`);
  }
  return blocks;
}

/** Blocos consecutivos ausentes (não sorteados) */
export function getMissingBlocks(numbers: number[]): string[] {
  const set = new Set(numbers);
  const missing = UNIVERSO.filter((n) => !set.has(n));
  const blocks: string[] = [];
  if (!missing.length) return blocks;

  let start = missing[0];
  let prev = missing[0];
  for (let i = 1; i < missing.length; i++) {
    if (missing[i] === prev + 1) {
      prev = missing[i];
    } else {
      blocks.push(start === prev ? formatNumber(start) : `${formatNumber(start)}-${formatNumber(prev)}`);
      start = missing[i];
      prev = missing[i];
    }
  }
  blocks.push(start === prev ? formatNumber(start) : `${formatNumber(start)}-${formatNumber(prev)}`);
  return blocks;
}

export function calculateMaxDrawnSequence(numbers: number[]): number {
  const blocks = getDrawnBlocks(numbers);
  if (!blocks.length) return 0;
  return Math.max(
    ...blocks.map((b) => {
      if (!b.includes('-')) return 1;
      const [a, c] = b.split('-').map((x) => parseInt(x, 10));
      return c - a + 1;
    }),
  );
}

export function calculateMaxMissingSequence(numbers: number[]): number {
  const blocks = getMissingBlocks(numbers);
  if (!blocks.length) return 0;
  return Math.max(
    ...blocks.map((b) => {
      if (!b.includes('-')) return 1;
      const [a, c] = b.split('-').map((x) => parseInt(x, 10));
      return c - a + 1;
    }),
  );
}

export interface EstruturaHorizontalResult {
  blocosSorteados: string[];
  maiorSequenciaSorteada: number;
  blocosAusentes: string[];
  maiorSequenciaAusente: number;
}

export function analisarEstruturaHorizontal(numbers: number[]): EstruturaHorizontalResult {
  return {
    blocosSorteados: getDrawnBlocks(numbers),
    maiorSequenciaSorteada: calculateMaxDrawnSequence(numbers),
    blocosAusentes: getMissingBlocks(numbers),
    maiorSequenciaAusente: calculateMaxMissingSequence(numbers),
  };
}
