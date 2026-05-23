export { dynamic } from '@/lib/route-config';

import { NextResponse } from 'next/server';
import { requirePremium } from '@/lib/api-auth';
import { prisma } from '@/lib/db';
import { getTabelaAposta, infoApostaComTabela } from '@/lib/lotofacil/aposta-config';
import { gerarFechamentoCombinatorio } from '@/lib/lotofacil/fechamento-combinatorio';
import { aplicarConfigEfetivaParaGeracao } from '@/lib/lotofacil/ajustar-config-geracao';
import { prepararPoolGeracao } from '@/lib/lotofacil/generator';
import { CONFIG_PADRAO, type ConfigGeracao } from '@/lib/lotofacil/scoring';
import { extrairDezenasConcurso } from '@/lib/lotofacil/metrics';
import { getConcursosOrdenados } from '@/lib/services/analytics';
import {
  analisarSequenciaAtrasoPorDezena,
  mapaDezenas,
  REGRAS_SEQUENCIA_ATRASO_PREMIUM,
} from '@/lib/lotofacil/sequencia-atraso';
import { uiToConfigGeracao, type ConfigGeracaoUI } from '@/lib/config-geracao-ui';

export async function POST(request: Request) {
  try {
    const auth = await requirePremium();
    if (auth.response) return auth.response;
    const session = auth.session;

    const body = await request.json();
    const pool = (body.pool as number[]) ?? [];
    const garantia = Number(body.garantia) || 14;
    const condicao = Number(body.condicao) || 15;
    const percentualCobertura = Number(body.percentualCobertura) || 100;
    const maxBilhetes = Math.min(Number(body.maxBilhetes) || 400, 800);
    const dezenasFixas = (body.dezenasFixas as number[]) ?? [];
    const dezenasExcluidas = (body.dezenasExcluidas as number[]) ?? [];
    const aplicarFiltros = body.aplicarFiltrosEstatisticos === true;
    const origemBase = body.origemBase as string | undefined;

    let poolBase = [...new Set(pool)].filter((d) => d >= 1 && d <= 25).sort((a, b) => a - b);

    if (poolBase.length < 16 && origemBase) {
      const bases = await prisma.basePareto.findMany();
      const map: Record<string, number[]> = {};
      for (const b of bases) map[b.tipo] = b.dezenas;
      if (origemBase === '18D' && map['18D']) poolBase = map['18D'];
      else if (origemBase === '19D' && map['19D']) poolBase = map['19D'];
      else if (origemBase === '20D' && map['20D']) poolBase = map['20D'];
    }

    const concursos = await getConcursosOrdenados();
    const ultimo = concursos[concursos.length - 1];
    const ultimoDezenas = ultimo ? extrairDezenasConcurso(ultimo) : null;
    const dezenasList = concursos.map((c) => extrairDezenasConcurso(c));
    const mapaSeq = mapaDezenas(analisarSequenciaAtrasoPorDezena(dezenasList));

    const prepCheck = prepararPoolGeracao(poolBase, dezenasFixas, dezenasExcluidas, 15);
    if (!prepCheck.valido) {
      return NextResponse.json({ error: prepCheck.motivoInvalido }, { status: 400 });
    }

    let configEstatistica: ConfigGeracao | undefined;
    if (aplicarFiltros) {
      let config: ConfigGeracao;
      if (body.configUI) {
        config = uiToConfigGeracao(body.configUI as ConfigGeracaoUI);
      } else if (body.config?.repetidas) {
        config = body.config as ConfigGeracao;
      } else {
        config = CONFIG_PADRAO;
      }
      config = {
        ...config,
        mapaSequenciaAtraso: mapaSeq,
        regrasSequenciaAtraso: {
          ...REGRAS_SEQUENCIA_ATRASO_PREMIUM,
          ...config.regrasSequenciaAtraso,
        },
        usarSequenciaAtraso: body.usarSequenciaAtraso !== false,
      };
      configEstatistica = aplicarConfigEfetivaParaGeracao(
        config,
        prepCheck.poolEfetivo,
        prepCheck.fixas,
        15,
        ultimoDezenas,
      );
    }

    const tabelaAposta = await getTabelaAposta();
    const precoBilhete = infoApostaComTabela(15, tabelaAposta).preco;

    const resultado = gerarFechamentoCombinatorio({
      pool: poolBase,
      garantia,
      condicao,
      dezenasFixas,
      dezenasExcluidas,
      percentualCobertura,
      maxBilhetes,
      precoBilhete,
      configEstatistica,
      ultimoConcurso: ultimoDezenas,
    });

    if (resultado.bilhetes.length) {
      await prisma.auditLog.create({
        data: {
          userId: session.user.id,
          eventType: 'fechamento_combinatorio',
          description: `Fechamento ${resultado.poolEfetivo.length}D → garantia ${garantia} · ${resultado.totalBilhetes} bilhetes`,
          metadata: {
            cobertura: resultado.coberturaPercentual,
            custo: resultado.custoEstimado,
          },
        },
      });
    }

    return NextResponse.json({
      ...resultado,
      pool: resultado.poolEfetivo,
      ultimoConcurso: ultimo?.numeroConcurso,
      configEstatisticaUsada: configEstatistica,
    });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: 'Erro ao gerar fechamento' }, { status: 500 });
  }
}
