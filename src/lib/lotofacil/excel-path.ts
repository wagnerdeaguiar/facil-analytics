import { join } from 'path';

/** Nome do arquivo exportado pelo site da Caixa. */
export const NOME_ARQUIVO_LOTOFACIL = 'Lotofácil.xlsx';

/** Caminho exibido na interface e no manual (pasta Downloads do Windows). */
export const CAMINHO_EXIBICAO_XLSX = `C:\\Downloads\\${NOME_ARQUIVO_LOTOFACIL}`;

/** URL oficial para baixar o histórico em Excel. */
export const URL_CEF_LOTOFACIL = 'https://loterias.caixa.gov.br/Paginas/Lotofacil.aspx';

/** Resolve o caminho real do Excel na pasta Downloads do usuário atual. */
export function caminhoLotofacilXlsx(): string {
  const home = process.env.USERPROFILE || process.env.HOME;
  if (home) return join(home, 'Downloads', NOME_ARQUIVO_LOTOFACIL);
  return join('C:', 'Downloads', NOME_ARQUIVO_LOTOFACIL);
}
