import * as XLSX from 'xlsx';
import type { ConcursoImportado } from './import';

function fixSheetRange(ws: XLSX.WorkSheet): void {
  let maxR = 0;
  let maxC = 0;
  for (const k of Object.keys(ws)) {
    if (k.startsWith('!')) continue;
    const d = XLSX.utils.decode_cell(k);
    if (d.r > maxR) maxR = d.r;
    if (d.c > maxC) maxC = d.c;
  }
  ws['!ref'] = XLSX.utils.encode_range({ s: { r: 0, c: 0 }, e: { r: maxR, c: maxC } });
}

function parseDataBr(val: unknown): Date | null {
  if (val instanceof Date) return val;
  if (typeof val !== 'string' && typeof val !== 'number') return null;
  const s = String(val).trim();
  const m = s.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (m) return new Date(parseInt(m[3], 10), parseInt(m[2], 10) - 1, parseInt(m[1], 10));
  return null;
}

function toDezena(v: unknown): number | null {
  const n = typeof v === 'number' ? v : parseInt(String(v).trim(), 10);
  if (Number.isNaN(n) || n < 1 || n > 25) return null;
  return n;
}

export interface ParseXlsxOptions {
  concursoDe?: number;
  concursoAte?: number;
  sheetName?: string;
}

export function parseXlsxLotofacil(
  filePathOrBuffer: string | Buffer,
  options: ParseXlsxOptions = {},
): ConcursoImportado[] {
  const wb =
    typeof filePathOrBuffer === 'string'
      ? XLSX.readFile(filePathOrBuffer, { cellDates: true })
      : XLSX.read(readBuffer(filePathOrBuffer), { type: 'buffer', cellDates: true });

  const sheetName = options.sheetName ?? wb.SheetNames.find((n) => /lotof/i.test(n)) ?? wb.SheetNames[0];
  const ws = wb.Sheets[sheetName];
  if (!ws) return [];

  fixSheetRange(ws);
  const rows = XLSX.utils.sheet_to_json<unknown[]>(ws, { header: 1, defval: '' });
  if (rows.length < 2) return [];

  const header = (rows[0] as unknown[]).map((h) => String(h).toLowerCase().trim());
  const idxConcurso = header.findIndex((h) => h.includes('concurso'));
  const idxData = header.findIndex((h) => h.includes('data'));
  const bolaCols: number[] = [];
  for (let i = 0; i < header.length; i++) {
    if (/^bola\s*\d+$/i.test(header[i]) || /^bola\d+$/i.test(header[i].replace(/\s/g, ''))) {
      bolaCols.push(i);
    }
  }
  if (bolaCols.length < 15) {
    for (let b = 1; b <= 15; b++) {
      const idx = header.findIndex((h) => h === `bola${b}` || h === `bola ${b}`);
      if (idx >= 0 && !bolaCols.includes(idx)) bolaCols.push(idx);
    }
  }
  if (bolaCols.length < 15) {
    const start = idxData >= 0 ? idxData + 1 : idxConcurso >= 0 ? idxConcurso + 1 : 2;
    for (let i = 0; i < 15; i++) bolaCols.push(start + i);
  }

  const result: ConcursoImportado[] = [];

  for (let r = 1; r < rows.length; r++) {
    const row = rows[r] as unknown[];
    const numero = parseInt(String(row[idxConcurso >= 0 ? idxConcurso : 0]), 10);
    if (Number.isNaN(numero) || numero <= 0) continue;

    if (options.concursoDe && numero < options.concursoDe) continue;
    if (options.concursoAte && numero > options.concursoAte) continue;

    const dezenas: number[] = [];
    for (const col of bolaCols.slice(0, 15)) {
      const d = toDezena(row[col]);
      if (d !== null) dezenas.push(d);
    }
    if (dezenas.length !== 15) continue;

    const dataSorteio = idxData >= 0 ? parseDataBr(row[idxData]) : null;

    result.push({
      numeroConcurso: numero,
      dataSorteio,
      dezenas: [...new Set(dezenas)].sort((a, b) => a - b),
    });
  }

  return result.sort((a, b) => a.numeroConcurso - b.numeroConcurso);
}

function readBuffer(buf: Buffer): Buffer {
  return buf;
}

export function resumoXlsx(filePath: string): {
  sheetName: string;
  totalLinhas: number;
  primeiro: number | null;
  ultimo: number | null;
} {
  const wb = XLSX.readFile(filePath, { cellDates: true });
  const sheetName = wb.SheetNames.find((n) => /lotof/i.test(n)) ?? wb.SheetNames[0];
  const concursos = parseXlsxLotofacil(filePath, { sheetName });
  return {
    sheetName,
    totalLinhas: concursos.length,
    primeiro: concursos[0]?.numeroConcurso ?? null,
    ultimo: concursos[concursos.length - 1]?.numeroConcurso ?? null,
  };
}
