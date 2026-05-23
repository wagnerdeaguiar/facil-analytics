import * as XLSX from 'xlsx';
import { calcularMetricas } from '@/lib/lotofacil/metrics';
import { infoAposta } from '@/lib/lotofacil/aposta';
import { infoApostaComTabela, type TabelaAposta } from '@/lib/lotofacil/aposta-config';

/** Colunas completas conforme especificação Fácil Analytics */
export interface JogoExportCompleto {
  dezenas: number[];
  origemBase?: string;
  scoreEstatistico?: number;
  soma?: number;
  pares?: number;
  impares?: number;
  primos?: number;
  fibonacci?: number;
  moldura?: number;
  centro?: number;
  repetidasUltimoConcurso?: number;
  maiorSequenciaSorteada?: number;
  maiorSequenciaAusente?: number;
  statusValidacao?: string;
  numerosPorAposta?: number;
  combinacoesInternas?: number;
  valorAposta?: number;
}

export interface JogoExport extends JogoExportCompleto {}

/** Preenche métricas faltantes a partir das dezenas e do último concurso importado */
export function enrichJogosParaExport(
  jogos: JogoExportCompleto[],
  ultimoConcursoDezenas: number[] | null,
): JogoExportCompleto[] {
  return jogos.map((j) => {
    if (j.soma != null && j.pares != null) return j;
    const m = calcularMetricas(j.dezenas, ultimoConcursoDezenas);
    return {
      ...j,
      soma: j.soma ?? m.soma,
      pares: j.pares ?? m.pares,
      impares: j.impares ?? m.impares,
      primos: j.primos ?? m.primos,
      fibonacci: j.fibonacci ?? m.fibonacci,
      moldura: j.moldura ?? m.moldura,
      centro: j.centro ?? m.centro,
      repetidasUltimoConcurso: j.repetidasUltimoConcurso ?? m.repetidasUltimo,
      maiorSequenciaSorteada: j.maiorSequenciaSorteada ?? m.maiorSequenciaSorteada,
      maiorSequenciaAusente: j.maiorSequenciaAusente ?? m.maiorSequenciaAusente,
      statusValidacao: j.statusValidacao ?? '',
    };
  });
}

function rowFromJogo(j: JogoExportCompleto, index: number, tabela?: TabelaAposta) {
  const d = [...j.dezenas].sort((a, b) => a - b);
  while (d.length < 20) d.push(0);
  const dezenas = j.numerosPorAposta ?? j.dezenas.length;
  const aposta = tabela ? infoApostaComTabela(dezenas, tabela) : infoAposta(dezenas);
  return {
    Jogo: index + 1,
    Base: j.origemBase ?? '',
    Dezenas: dezenas,
    'Valor aposta': j.valorAposta ?? aposta.preco,
    Combinações: j.combinacoesInternas ?? aposta.combinacoes,
    Score: j.scoreEstatistico != null ? Number(j.scoreEstatistico.toFixed(2)) : '',
    D1: d[0],
    D2: d[1],
    D3: d[2],
    D4: d[3],
    D5: d[4],
    D6: d[5],
    D7: d[6],
    D8: d[7],
    D9: d[8],
    D10: d[9],
    D11: d[10],
    D12: d[11],
    D13: d[12],
    D14: d[13],
    D15: d[14],
    D16: d[15] || '',
    D17: d[16] || '',
    D18: d[17] || '',
    D19: d[18] || '',
    D20: d[19] || '',
    Soma: j.soma ?? '',
    Pares: j.pares ?? '',
    Ímpares: j.impares ?? '',
    Primos: j.primos ?? '',
    Fibonacci: j.fibonacci ?? '',
    Moldura: j.moldura ?? '',
    Centro: j.centro ?? '',
    Repetidas: j.repetidasUltimoConcurso ?? '',
    'Maior Seq. Sorteada': j.maiorSequenciaSorteada ?? '',
    'Maior Seq. Ausente': j.maiorSequenciaAusente ?? '',
    Status: j.statusValidacao ?? '',
  };
}

const CSV_HEADER =
  'Jogo;Base;Dezenas;Valor aposta;Combinações;Score;D1;D2;D3;D4;D5;D6;D7;D8;D9;D10;D11;D12;D13;D14;D15;D16;D17;D18;D19;D20;Soma;Pares;Ímpares;Primos;Fibonacci;Moldura;Centro;Repetidas;Maior Seq. Sorteada;Maior Seq. Ausente;Status';

export function jogosToCSV(jogos: JogoExportCompleto[], tabela?: TabelaAposta): string {
  const rows = jogos.map((j, i) => {
    const r = rowFromJogo(j, i, tabela);
    return [
      r.Jogo,
      r.Base,
      r.Dezenas,
      r['Valor aposta'],
      r.Combinações,
      r.Score,
      ...Array.from({ length: 20 }, (_, k) => {
        const val = (r as Record<string, unknown>)[`D${k + 1}`];
        if (val === '' || val == null) return '';
        return String(val).padStart(2, '0');
      }),
      r.Soma,
      r.Pares,
      r.Ímpares,
      r.Primos,
      r.Fibonacci,
      r.Moldura,
      r.Centro,
      r.Repetidas,
      r['Maior Seq. Sorteada'],
      r['Maior Seq. Ausente'],
      r.Status,
    ].join(';');
  });
  return [CSV_HEADER, ...rows].join('\n');
}

export function jogosToXLSXBuffer(jogos: JogoExportCompleto[], tabela?: TabelaAposta): Buffer {
  const data = jogos.map((j, i) => rowFromJogo(j, i, tabela));
  const ws = XLSX.utils.json_to_sheet(data);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Jogos');
  return Buffer.from(XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' }));
}

export async function jogosToPDFBuffer(jogos: JogoExportCompleto[], titulo: string): Promise<Buffer> {
  const { jsPDF } = await import('jspdf');
  await import('jspdf-autotable');

  const doc = new jsPDF({ orientation: 'landscape' });
  doc.setFontSize(12);
  doc.text(titulo, 14, 14);
  doc.setFontSize(8);
  doc.text('Estatística histórica — sem garantia de resultado futuro.', 14, 20);

  const head = [
    [
      '#',
      'Base',
      'Score',
      'Dezenas',
      'Soma',
      'P',
      'I',
      'Rep',
      'Seq.S',
      'Seq.A',
      'Status',
    ],
  ];

  const body = jogos.map((j, i) => [
    String(i + 1),
    j.origemBase ?? '',
    j.scoreEstatistico?.toFixed(1) ?? '-',
    j.dezenas.map((d) => String(d).padStart(2, '0')).join(' '),
    String(j.soma ?? '-'),
    String(j.pares ?? '-'),
    String(j.impares ?? '-'),
    String(j.repetidasUltimoConcurso ?? '-'),
    String(j.maiorSequenciaSorteada ?? '-'),
    String(j.maiorSequenciaAusente ?? '-'),
    j.statusValidacao ?? '-',
  ]);

  // @ts-expect-error autotable plugin
  doc.autoTable({
    startY: 24,
    head,
    body,
    styles: { fontSize: 7 },
    headStyles: { fillColor: [16, 185, 129] },
  });

  return Buffer.from(doc.output('arraybuffer'));
}
