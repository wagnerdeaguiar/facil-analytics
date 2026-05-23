import type { JogoExportCompleto } from '@/lib/export';
import { infoAposta } from '@/lib/lotofacil/aposta';
import { infoApostaComTabela, type TabelaAposta } from '@/lib/lotofacil/aposta-config';

const DISCLAIMER =
  'Material de referência Fácil Analytics — NÃO é volante oficial Caixa. Transcreva manualmente no volante ou terminal da lotérica.';

function dezenasOrdenadas(j: JogoExportCompleto): number[] {
  return [...j.dezenas].sort((a, b) => a - b);
}

function drawCheckbox(doc: import('jspdf').jsPDF, x: number, y: number, size: number) {
  doc.setDrawColor(40);
  doc.setLineWidth(0.3);
  doc.rect(x, y, size, size);
}

function drawVolante(
  doc: import('jspdf').jsPDF,
  x: number,
  y: number,
  size: number,
  selecionadas: Set<number>,
) {
  const cell = size / 5;
  doc.setDrawColor(80);
  doc.setLineWidth(0.15);

  for (let i = 0; i < 25; i++) {
    const n = i + 1;
    const row = Math.floor(i / 5);
    const col = i % 5;
    const cx = x + col * cell;
    const cy = y + row * cell;
    const marked = selecionadas.has(n);

    if (marked) {
      doc.setFillColor(20, 20, 20);
      doc.rect(cx, cy, cell, cell, 'FD');
    } else {
      doc.setFillColor(255, 255, 255);
      doc.rect(cx, cy, cell, cell, 'D');
    }

    doc.setFont('helvetica', marked ? 'bold' : 'normal');
    doc.setFontSize(marked ? 9 : 8);
    doc.setTextColor(marked ? 255 : 30);
    const label = String(n).padStart(2, '0');
    doc.text(label, cx + cell / 2, cy + cell * 0.62, { align: 'center' });
  }
}

function drawCartela(
  doc: import('jspdf').jsPDF,
  jogo: JogoExportCompleto,
  index: number,
  total: number,
  x: number,
  y: number,
  width: number,
  tabela?: TabelaAposta,
) {
  const dezenas = dezenasOrdenadas(jogo);
  const qtd = jogo.numerosPorAposta ?? dezenas.length;
  const aposta = tabela ? infoApostaComTabela(qtd, tabela) : infoAposta(qtd);
  const hCheck = 5;

  drawCheckbox(doc, x, y, hCheck);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(60);
  doc.text('Transcrito no volante oficial', x + hCheck + 2, y + 3.8);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.setTextColor(0);
  doc.text(`Aposta ${index + 1} de ${total}`, x + width * 0.42, y + 4);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(40);
  const valor = jogo.valorAposta ?? aposta.preco;
  doc.text(`${qtd} dezenas · R$ ${valor.toFixed(2).replace('.', ',')}`, x + width * 0.72, y + 4);

  const listY = y + 10;
  doc.setFont('courier', 'bold');
  doc.setFontSize(10);
  doc.setTextColor(0);
  const lista = dezenas.map((d) => String(d).padStart(2, '0')).join('  ');
  doc.text(lista, x, listY, { maxWidth: width });

  const gridY = listY + 8;
  const gridSize = Math.min(width * 0.55, 52);
  drawVolante(doc, x, gridY, gridSize, new Set(dezenas));

  const infoX = x + gridSize + 6;
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(50);
  const linhas = [
    jogo.scoreEstatistico != null ? `Score: ${jogo.scoreEstatistico.toFixed(1)}` : null,
    jogo.soma != null ? `Soma: ${jogo.soma}` : null,
    jogo.origemBase ? `Base: ${jogo.origemBase}` : null,
  ].filter(Boolean) as string[];
  linhas.forEach((ln, i) => doc.text(ln, infoX, gridY + 4 + i * 4));

  doc.setDrawColor(200);
  doc.setLineWidth(0.2);
  doc.line(x, y + 78, x + width, y + 78);
}

/** PDF com cartelas 5×5 para transcrição manual no volante oficial. */
export async function jogosToCartelasPDFBuffer(
  jogos: JogoExportCompleto[],
  titulo: string,
  tabela?: TabelaAposta,
): Promise<Buffer> {
  const { jsPDF } = await import('jspdf');
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });

  const pageW = 210;
  const margin = 12;
  const contentW = pageW - margin * 2;
  const cartelaH = 82;
  const perPage = 3;

  let cartelaIndex = 0;

  const addHeader = (first: boolean) => {
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(13);
    doc.setTextColor(0);
    doc.text(titulo, margin, 14);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7.5);
    doc.setTextColor(80);
    doc.text(DISCLAIMER, margin, 19, { maxWidth: contentW });
    if (first) {
      doc.text(`${jogos.length} aposta(s) · Marque ☐ após transcrever cada uma`, margin, 24);
    }
  };

  addHeader(true);
  let y = 28;

  for (let i = 0; i < jogos.length; i++) {
    if (cartelaIndex > 0 && cartelaIndex % perPage === 0) {
      doc.addPage();
      addHeader(false);
      y = 18;
    }

    drawCartela(doc, jogos[i], i, jogos.length, margin, y, contentW, tabela);
    y += cartelaH;
    cartelaIndex++;
  }

  const totalPages = doc.getNumberOfPages();
  for (let p = 1; p <= totalPages; p++) {
    doc.setPage(p);
    doc.setFontSize(7);
    doc.setTextColor(120);
    doc.text(`Fácil Analytics · Página ${p}/${totalPages}`, pageW - margin, 290, { align: 'right' });
  }

  return Buffer.from(doc.output('arraybuffer'));
}

export { DISCLAIMER as CARTELAS_DISCLAIMER };
