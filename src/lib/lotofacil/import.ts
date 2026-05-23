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

