import { metricasParaConcurso } from './metrics';
import { fetchNovosConcursosLoteriasApi, fetchUltimoLoteriasApi } from './loterias-api';

export interface ConcursoImportado {
  numeroConcurso: number;
  dataSorteio?: string | Date | null;
  dezenas: number[];
}

export function parseDezenasLine(line: string): number[] | null {
  const nums = line
    .replace(/[;|]/g, ',')
    .split(/[\s,]+/)
    .map((s) => parseInt(s.trim(), 10))
    .filter((n) => !Number.isNaN(n) && n >= 1 && n <= 25);

  const unique = [...new Set(nums)];
  if (unique.length !== 15) return null;
  return unique.sort((a, b) => a - b);
}

/** Formato MazuSoft: "3542 - 01,02,05,...,25" */
export function parseTxtMazuSoft(text: string): ConcursoImportado[] {
  const result: ConcursoImportado[] = [];
  const lines = text.trim().split(/\r?\n/);

  for (const raw of lines) {
    const line = raw.trim();
    if (!line || line.startsWith('http')) continue;

    const match = line.match(/^(\d{1,5})\s*[-–]\s*(.+)$/);
    if (match) {
      const numero = parseInt(match[1], 10);
      const dezenas = parseDezenasLine(match[2]);
      if (dezenas) result.push({ numeroConcurso: numero, dezenas });
      continue;
    }

    const dezenas = parseDezenasLine(line);
    if (dezenas) result.push({ numeroConcurso: result.length + 1, dezenas });
  }

  return result.sort((a, b) => a.numeroConcurso - b.numeroConcurso);
}

export function parseCSVConcursos(text: string): ConcursoImportado[] {
  if (/\d+\s*[-–]\s*\d/.test(text)) {
    return parseTxtMazuSoft(text);
  }

  const lines = text.trim().split(/\r?\n/).filter(Boolean);
  const result: ConcursoImportado[] = [];

  for (const line of lines) {
    const parts = line.split(/[;,|]/).map((p) => p.trim());
    if (parts.length < 2) continue;

    const numero = parseInt(parts[0], 10);
    if (Number.isNaN(numero)) {
      const dezenas = parseDezenasLine(line);
      if (dezenas) {
        result.push({ numeroConcurso: result.length + 1, dezenas });
      }
      continue;
    }

    const rest = parts.slice(1).join(',');
    const dezenas = parseDezenasLine(rest) ?? parseDezenasLine(parts.slice(1).join(' '));
    if (!dezenas) continue;

    let data: Date | undefined;
    if (parts[1] && parts[1].includes('/')) {
      const [d, m, y] = parts[1].split('/');
      data = new Date(parseInt(y, 10), parseInt(m, 10) - 1, parseInt(d, 10));
    }

    result.push({
      numeroConcurso: numero,
      dataSorteio: data,
      dezenas,
    });
  }

  return result.sort((a, b) => a.numeroConcurso - b.numeroConcurso);
}

export function parseJSONConcursos(data: unknown): ConcursoImportado[] {
  const arr = Array.isArray(data) ? data : (data as { data?: unknown[] })?.data ?? [];
  const result: ConcursoImportado[] = [];

  for (const item of arr) {
    const row = item as Record<string, unknown>;
    const numero =
      Number(row.concurso ?? row.numero ?? row.numeroConcurso ?? row.loteria ?? 0) || 0;
    let dezenas: number[] | null = null;

    if (Array.isArray(row.dezenas)) {
      dezenas = (row.dezenas as number[]).map(Number).filter((n) => n >= 1 && n <= 25).sort((a, b) => a - b);
    } else if (Array.isArray(row.listaDezenas)) {
      dezenas = (row.listaDezenas as number[]).map(Number).sort((a, b) => a - b);
    } else {
      const keys = Object.keys(row).filter((k) => /^d?\d{1,2}$/i.test(k) || k.startsWith('bola'));
      if (keys.length >= 15) {
        dezenas = keys
          .slice(0, 15)
          .map((k) => Number(row[k]))
          .filter((n) => n >= 1 && n <= 25)
          .sort((a, b) => a - b);
      }
    }

    if (!dezenas || dezenas.length !== 15) continue;
    result.push({
      numeroConcurso: numero || result.length + 1,
      dataSorteio: row.dataApuracao as string | undefined,
      dezenas,
    });
  }

  return result.sort((a, b) => a.numeroConcurso - b.numeroConcurso);
}

export function concursoToDbFields(
  c: ConcursoImportado,
  anterior?: number[] | null,
) {
  const m = metricasParaConcurso(c.dezenas, anterior ?? null);
  const [d1, d2, d3, d4, d5, d6, d7, d8, d9, d10, d11, d12, d13, d14, d15] = c.dezenas;

  return {
    numeroConcurso: c.numeroConcurso,
    dataSorteio: c.dataSorteio ? new Date(c.dataSorteio) : null,
    d1, d2, d3, d4, d5, d6, d7, d8, d9, d10, d11, d12, d13, d14, d15,
    soma: m.soma,
    pares: m.pares,
    impares: m.impares,
    primos: m.primos,
    fibonacci: m.fibonacci,
    moldura: m.moldura,
    centro: m.centro,
    repetidasConcursoAnterior: m.repetidasConcursoAnterior,
    ausentes: m.ausentes,
    grupo1_5: m.grupo1_5,
    grupo6_10: m.grupo6_10,
    grupo11_15: m.grupo11_15,
    grupo16_20: m.grupo16_20,
    grupo21_25: m.grupo21_25,
    sequencias: m.sequencias,
    blocosSorteados: m.blocosSorteados ?? [],
    maiorSequenciaSorteada: m.maiorSequenciaSorteada,
    blocosAusentes: m.blocosAusentes ?? [],
    maiorSequenciaAusente: m.maiorSequenciaAusente,
  };
}

/**
 * Atualização do último resultado: tenta loterias-api (Heroku) e depois API Caixa.
 * @see https://github.com/guto-alves/loterias-api
 */
export async function fetchConcursosParaAtualizar(
  ultimoNoBanco: number,
): Promise<{ concursos: ConcursoImportado[]; fonte: string }> {
  const novos = await fetchNovosConcursosLoteriasApi(ultimoNoBanco);
  if (novos.length) {
    return { concursos: novos, fonte: 'loterias-api' };
  }

  const ultimo = await fetchUltimoLoteriasApi();
  if (ultimo && ultimo.numeroConcurso > ultimoNoBanco) {
    return { concursos: [ultimo], fonte: 'loterias-api' };
  }

  const caixa = await fetchConcursosCaixa();
  if (caixa.length) {
    return { concursos: caixa.filter((c) => c.numeroConcurso > ultimoNoBanco), fonte: 'caixa' };
  }

  return { concursos: [], fonte: 'nenhuma' };
}

/** Formato simplificado Caixa-like */
export async function fetchConcursosCaixa(limit = 100): Promise<ConcursoImportado[]> {
  try {
    const url = `https://servicebus2.caixa.gov.br/portaldeloterias/api/lotofacil`;
    const res = await fetch(url, { next: { revalidate: 3600 } });
    if (!res.ok) return [];
    const ultimo = await res.json();
    const result: ConcursoImportado[] = [];

    if (ultimo?.listaDezenas || ultimo?.dezenasSorteadasOrdemSorteio) {
      const raw = ultimo.listaDezenas ?? ultimo.dezenasSorteadasOrdemSorteio;
      const dezenas = raw.map((n: string | number) => Number(n)).sort((a: number, b: number) => a - b);
      result.push({
        numeroConcurso: Number(ultimo.numero),
        dataSorteio: ultimo.dataApuracao,
        dezenas,
      });
    }

    return result;
  } catch {
    return [];
  }
}

