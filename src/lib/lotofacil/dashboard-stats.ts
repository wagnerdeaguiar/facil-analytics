import { extrairDezenasConcurso } from './metrics';
import { calcularFrequencias } from './pareto';

export function histograma(valores: number[], buckets?: number[]): { label: string; qtd: number }[] {
  if (!valores.length) return [];
  if (buckets?.length) {
    const map = new Map<string, number>();
    for (const b of buckets) map.set(String(b), 0);
    for (const v of valores) {
      const key = String(v);
      map.set(key, (map.get(key) ?? 0) + 1);
    }
    return Array.from(map.entries())
      .map(([label, qtd]) => ({ label, qtd }))
      .sort((a, b) => Number(a.label) - Number(b.label));
  }
  const min = Math.min(...valores);
  const max = Math.max(...valores);
  const step = Math.max(1, Math.ceil((max - min + 1) / 12));
  const map = new Map<string, number>();
  for (const v of valores) {
    const bucket = Math.floor((v - min) / step) * step + min;
    const label = `${bucket}-${bucket + step - 1}`;
    map.set(label, (map.get(label) ?? 0) + 1);
  }
  return Array.from(map.entries()).map(([label, qtd]) => ({ label, qtd }));
}

export function buildDashboardChartData(concursos: Array<{
  d1: number; d2: number; d3: number; d4: number; d5: number;
  d6: number; d7: number; d8: number; d9: number; d10: number;
  d11: number; d12: number; d13: number; d14: number; d15: number;
  pares: number;
  impares: number;
  soma: number;
  repetidasConcursoAnterior: number;
  maiorSequenciaSorteada: number;
  maiorSequenciaAusente: number;
}>) {
  const dezenasList = concursos.map((c) => extrairDezenasConcurso(c));
  const freqs = calcularFrequencias(dezenasList);

  return {
    frequenciaDezenas: freqs.map((f) => ({
      dezena: String(f.dezena).padStart(2, '0'),
      qtd: f.frequencia,
      pct: f.percentual,
    })),
    pares: histograma(concursos.map((c) => c.pares)),
    impares: histograma(concursos.map((c) => c.impares)),
    soma: histograma(concursos.map((c) => c.soma)),
    repetidas: histograma(concursos.map((c) => c.repetidasConcursoAnterior)),
    seqSorteada: histograma(concursos.map((c) => c.maiorSequenciaSorteada)),
    seqAusente: histograma(concursos.map((c) => c.maiorSequenciaAusente)),
  };
}
