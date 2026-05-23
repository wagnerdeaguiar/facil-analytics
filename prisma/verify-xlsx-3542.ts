import { parseXlsxLotofacil } from '../src/lib/lotofacil/import-xlsx';
import { caminhoLotofacilXlsx } from '../src/lib/lotofacil/excel-path';

const path = caminhoLotofacilXlsx();
const c3542 = parseXlsxLotofacil(path, { concursoDe: 3542, concursoAte: 3542 })[0];
const esperado = [1, 2, 5, 8, 11, 12, 13, 15, 18, 19, 21, 22, 23, 24, 25];

console.log('3542 Excel:', c3542.dezenas.join(','));
console.log('3542 TXT:  ', esperado.join(','));
console.log('Match:', c3542.dezenas.join(',') === esperado.join(','));
