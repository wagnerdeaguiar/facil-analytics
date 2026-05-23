/** Combinações C(n, k) para Lotofácil. */
export function combinarK(dezenas: number[], k: number): number[][] {
  if (dezenas.length < k) return [];
  if (dezenas.length === k) return [[...dezenas].sort((a, b) => a - b)];

  const result: number[][] = [];
  const n = dezenas.length;

  function backtrack(start: number, picked: number[]) {
    if (picked.length === k) {
      result.push([...picked].sort((a, b) => a - b));
      return;
    }
    const need = k - picked.length;
    if (n - start < need) return;
    for (let i = start; i < n; i++) {
      picked.push(dezenas[i]);
      backtrack(i + 1, picked);
      picked.pop();
    }
  }

  backtrack(0, []);
  return result;
}

export function combinar15(dezenas: number[]): number[][] {
  return combinarK(dezenas, 15);
}

export function escolherAleatorio(pool: number[], k: number): number[] {
  const copy = [...pool];
  const picked: number[] = [];
  while (picked.length < k && copy.length) {
    const i = Math.floor(Math.random() * copy.length);
    picked.push(copy.splice(i, 1)[0]);
  }
  return picked.sort((a, b) => a - b);
}

export function binomial(n: number, k: number): number {
  if (k < 0 || k > n) return 0;
  k = Math.min(k, n - k);
  let r = 1;
  for (let i = 1; i <= k; i++) r = (r * (n - k + i)) / i;
  return Math.round(r);
}
