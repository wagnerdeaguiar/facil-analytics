import type { ConcursoImportado } from './import';

/** API comunitária: https://github.com/guto-alves/loterias-api */
const BASE_URL =
  process.env.LOTERIAS_API_URL?.trim() || 'https://loteriascaixa-api.herokuapp.com/api';

export interface LoteriasApiResponse {
  loteria: string;
  concurso: number;
  data: string;
  dezenas: string[];
  dezenasOrdemSorteio?: string[];
}

function parseDataBr(data: string): string | undefined {
  const m = data.match(/(\d{2})\/(\d{2})\/(\d{4})/);
  if (!m) return undefined;
  return `${m[3]}-${m[2]}-${m[1]}`;
}

function mapResponse(json: LoteriasApiResponse): ConcursoImportado | null {
  if (!json?.concurso || !Array.isArray(json.dezenas) || json.dezenas.length !== 15) {
    return null;
  }
  const dezenas = json.dezenas.map((d) => parseInt(String(d), 10)).sort((a, b) => a - b);
  if (dezenas.some((n) => Number.isNaN(n) || n < 1 || n > 25)) return null;

  return {
    numeroConcurso: json.concurso,
    dataSorteio: parseDataBr(json.data),
    dezenas,
  };
}

export async function fetchConcursoLoteriasApi(numero: number): Promise<ConcursoImportado | null> {
  try {
    const res = await fetch(`${BASE_URL}/lotofacil/${numero}`, {
      next: { revalidate: 300 },
    });
    if (!res.ok) return null;
    const json = (await res.json()) as LoteriasApiResponse;
    return mapResponse(json);
  } catch {
    return null;
  }
}

export async function fetchUltimoLoteriasApi(): Promise<ConcursoImportado | null> {
  try {
    const res = await fetch(`${BASE_URL}/lotofacil/latest`, {
      next: { revalidate: 300 },
    });
    if (!res.ok) return null;
    const json = (await res.json()) as LoteriasApiResponse;
    return mapResponse(json);
  } catch {
    return null;
  }
}

/** Lista completa (histórico) — uma requisição */
export async function fetchHistoricoLoteriasApi(): Promise<ConcursoImportado[]> {
  try {
    const res = await fetch(`${BASE_URL}/lotofacil`, {
      next: { revalidate: 3600 },
    });
    if (!res.ok) return [];
    const json = (await res.json()) as LoteriasApiResponse[];
    if (!Array.isArray(json)) return [];
    return json
      .map(mapResponse)
      .filter((c): c is ConcursoImportado => c !== null)
      .sort((a, b) => a.numeroConcurso - b.numeroConcurso);
  } catch {
    return [];
  }
}

/** Busca todos os concursos faltantes entre o último no banco e o mais recente na API */
export async function fetchNovosConcursosLoteriasApi(
  ultimoNoBanco: number,
): Promise<ConcursoImportado[]> {
  const latest = await fetchUltimoLoteriasApi();
  if (!latest) return [];

  const alvo = latest.numeroConcurso;
  if (alvo <= ultimoNoBanco) return [];

  const gap = alvo - ultimoNoBanco;

  if (gap > 12) {
    const historico = await fetchHistoricoLoteriasApi();
    const filtrados = historico.filter((c) => c.numeroConcurso > ultimoNoBanco);
    if (filtrados.length) return filtrados;
  }

  const result: ConcursoImportado[] = [];
  for (let n = ultimoNoBanco + 1; n <= alvo; n++) {
    if (n === alvo) {
      result.push(latest);
      continue;
    }
    const c = await fetchConcursoLoteriasApi(n);
    if (c) result.push(c);
  }

  return result.sort((a, b) => a.numeroConcurso - b.numeroConcurso);
}
