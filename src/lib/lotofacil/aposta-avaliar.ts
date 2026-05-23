import { calcularMetricas } from './metrics';
import { avaliarJogo, type ConfigGeracao } from './scoring';
import { combinar15 } from './combinatoria';
import { scoreMinimoEfetivo } from './aposta';

const MAX_SUBS_EXATOS = 16000;

function minPctSubsValidas(qtdDezenas: number): number {
  if (qtdDezenas <= 15) return 1;
  if (qtdDezenas === 16) return 0.35;
  if (qtdDezenas === 17) return 0.22;
  if (qtdDezenas === 18) return 0.14;
  if (qtdDezenas === 19) return 0.09;
  return 0.07;
}

function amostrarSub15(dezenas: number[], amostras: number): number[][] {
  const n = dezenas.length;
  if (n === 15) return [[...dezenas].sort((a, b) => a - b)];
  const out: number[][] = [];
  const vistos = new Set<string>();
  const max = Math.min(amostras, 300);
  while (out.length < max && vistos.size < max * 3) {
    const copy = [...dezenas];
    const picked: number[] = [];
    while (picked.length < 15) {
      const i = Math.floor(Math.random() * copy.length);
      picked.push(copy.splice(i, 1)[0]);
    }
    const sorted = picked.sort((a, b) => a - b);
    const key = sorted.join(',');
    if (vistos.has(key)) continue;
    vistos.add(key);
    out.push(sorted);
  }
  return out;
}

function subconjuntos15(dezenas: number[]): number[][] {
  if (dezenas.length === 15) return [[...dezenas].sort((a, b) => a - b)];
  const todos = combinar15(dezenas);
  if (todos.length <= MAX_SUBS_EXATOS) return todos;
  return amostrarSub15(dezenas, 200);
}

export interface ResultadoConjuntoAposta {
  valido: boolean;
  score: number;
  detalhes: Record<string, number>;
  status: string;
  motivos: string[];
  subsValidas: number;
  subsTotal: number;
  soma: number;
  pares: number;
  impares: number;
  primos: number;
  fibonacci: number;
  moldura: number;
  centro: number;
  repetidasUltimoConcurso: number;
}

/** Avalia aposta com 15–20 dezenas (score = media das combinacoes de 15). */
export function avaliarConjuntoAposta(
  dezenas: number[],
  config: ConfigGeracao,
  ultimoConcurso?: number[] | null,
  basePareto?: number[] | null,
): ResultadoConjuntoAposta {
  const subs = subconjuntos15(dezenas);
  let somaScore = 0;
  let subsValidas = 0;
  const motivos: string[] = [];
  let melhorScore = 0;
  let melhorDetalhes: Record<string, number> = {};

  for (const sub of subs) {
    const m = calcularMetricas(sub, ultimoConcurso, basePareto);
    const av = avaliarJogo(m, config);
    somaScore += av.score;
    if (av.valido) subsValidas++;
    else if (motivos.length < 3) motivos.push(...av.motivos.slice(0, 1));
    if (av.score > melhorScore) {
      melhorScore = av.score;
      melhorDetalhes = av.detalhes;
    }
  }

  const score = subs.length ? somaScore / subs.length : 0;
  const minScore = scoreMinimoEfetivo(config.scoreMinimo ?? 0, dezenas.length);
  const pctValidas = subs.length ? subsValidas / subs.length : 0;
  const minPct = minPctSubsValidas(dezenas.length);

  const valido = score >= minScore && pctValidas >= minPct;
  if (score < minScore) {
    motivos.push(`Score medio ${score.toFixed(1)} abaixo do minimo ${minScore}.`);
  }
  if (pctValidas < minPct) {
    motivos.push(
      `Apenas ${Math.round(pctValidas * 100)}% das combinacoes internas passaram (minimo ${Math.round(minPct * 100)}%).`,
    );
  }

  let status = 'Reprovado';
  if (valido) {
    if (score >= 90) status = 'Excelente';
    else if (score >= minScore + 5) status = 'Aprovado';
    else status = 'Atencao';
  }

  const mFull = calcularMetricas(dezenas, ultimoConcurso, basePareto);

  return {
    valido,
    score: Math.round(score * 100) / 100,
    detalhes: melhorDetalhes,
    status,
    motivos,
    subsValidas,
    subsTotal: subs.length,
    soma: mFull.soma,
    pares: mFull.pares,
    impares: mFull.impares,
    primos: mFull.primos,
    fibonacci: mFull.fibonacci,
    moldura: mFull.moldura,
    centro: mFull.centro,
    repetidasUltimoConcurso: mFull.repetidasUltimo,
  };
}
