import * as XLSX from 'xlsx';
import { join } from 'path';

const path =
  process.argv[2] ??
  join('C:', 'Users', 'KAPAM', 'Downloads', 'Lotofácil.xlsx');

const wb = XLSX.readFile(path, { cellDates: true });
console.log('Arquivo:', path);
console.log('Abas:', wb.SheetNames.join(' | '));

for (const name of wb.SheetNames) {
  const ws = wb.Sheets[name];
  let maxR = 0;
  let maxC = 0;
  for (const k of Object.keys(ws)) {
    if (k.startsWith('!')) continue;
    const d = XLSX.utils.decode_cell(k);
    if (d.r > maxR) maxR = d.r;
    if (d.c > maxC) maxC = d.c;
  }
  ws['!ref'] = XLSX.utils.encode_range({ s: { r: 0, c: 0 }, e: { r: maxR, c: maxC } });
  const data = XLSX.utils.sheet_to_json<unknown[]>(ws, { header: 1, defval: '' });
  console.log(`\n=== ${name} | linhas=${data.length} cols=${maxC + 1} ===`);
  console.log('Header:', (data[0] as unknown[])?.slice(0, 20).join(' | '));
  for (let i = 1; i < Math.min(5, data.length); i++) {
    const row = data[i] as unknown[];
    console.log(`Row${i}:`, row.slice(0, 18).join(' | '));
  }
  console.log('Última linha:', (data[data.length - 1] as unknown[])?.slice(0, 18).join(' | '));
}
