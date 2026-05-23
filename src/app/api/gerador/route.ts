export { dynamic } from '@/lib/route-config';

import { NextResponse } from 'next/server';
import { isNumerosPorAposta } from '@/lib/lotofacil/aposta';
import { requireSession } from '@/lib/api-auth';
import { isPremiumStatus } from '@/lib/subscription';
import { resolvePlanLimitsForUser } from '@/lib/billing/plan-service';
import { FREE_MAX_DEZENAS, FREE_MAX_JOGOS } from '@/lib/plan-limits';
import { prisma } from '@/lib/db';
import { getTabelaAposta } from '@/lib/lotofacil/aposta-config';
import {
  gerarJogos,
  diagnosticarGeracao,
  configFromPerfilPremium,
  prepararPoolGeracao,
  type OrigemBase,
} from '@/lib/lotofacil/generator';
import { CONFIG_PADRAO, type ConfigGeracao } from '@/lib/lotofacil/scoring';
import { getPerfilConfig, type PerfilId } from '@/lib/lotofacil/perfis';
import { calcularMetricas } from '@/lib/lotofacil/metrics';
import { getConcursosOrdenados } from '@/lib/services/analytics';
import { extrairDezenasConcurso } from '@/lib/lotofacil/metrics';
import { recalcularEstatisticasGlobais } from '@/lib/services/analytics';
import {
  analisarSequenciaAtrasoPorDezena,
  mapaDezenas,
  analisarRepetidasGeral,
  REGRAS_SEQUENCIA_ATRASO_PREMIUM,
} from '@/lib/lotofacil/sequencia-atraso';
import { aplicarConfigEfetivaParaGeracao } from '@/lib/lotofacil/ajustar-config-geracao';
import { analisarViabilidadeGeracao } from '@/lib/lotofacil/viabilidade-geracao';

export async function POST(request: Request) {
  try {
    const auth = await requireSession();
    if (auth.response) return auth.response;
    const session = auth.session;
    const premium = isPremiumStatus(session.user.subscriptionStatus);
    const limites = await resolvePlanLimitsForUser(session.user.id, session.user.subscriptionStatus);

    const body = await request.json();
    const maxJogos = premium ? limites.maxJogos : Math.min(limites.maxJogos, FREE_MAX_JOGOS);
    let quantidade = Math.min(Number(body.quantidade) || 10, maxJogos);
    const origemBase = (body.origemBase || '20D') as OrigemBase;
    const perfil = body.perfil as string | undefined;
    const maxDezenasIguais = Number(body.maxDezenasIguais) || 13;
    let salvar = body.salvar !== false;
    let numerosPorAposta = isNumerosPorAposta(Number(body.numerosPorAposta))
      ? Number(body.numerosPorAposta)
      : 15;

    if (!premium) {
      quantidade = Math.min(quantidade, limites.maxJogos);
      numerosPorAposta = Math.min(limites.maxDezenas, FREE_MAX_DEZENAS);
      salvar = false;
    } else if (!limites.salvarJogos) {
      salvar = false;
    }

    const concursos = await getConcursosOrdenados();
    const ultimo = concursos[concursos.length - 1];
    const ultimoDezenas = ultimo ? extrairDezenasConcurso(ultimo) : null;

    const bases = await prisma.basePareto.findMany();
    const baseMap: Record<string, number[]> = {};
    for (const b of bases) baseMap[b.tipo] = b.dezenas;

    let baseDezenas: number[] | undefined;
    if (origemBase === '18D') baseDezenas = baseMap['18D'];
    else if (origemBase === '19D') baseDezenas = baseMap['19D'];
    else if (origemBase === '20D') baseDezenas = baseMap['20D'];
    else baseDezenas = undefined;

    let config: ConfigGeracao = CONFIG_PADRAO;
    if (body.config && body.config.repetidas) {
      config = body.config as ConfigGeracao;
    } else if (perfil && perfil !== 'personalizado') {
      const p = getPerfilConfig(perfil as PerfilId);
      config = { ...p.config, scoreMinimo: p.scoreMinimo };
    } else if (perfil === 'premium' || perfil === 'premium_estatistico') {
      const stats = await recalcularEstatisticasGlobais().catch(() => null);
      config = configFromPerfilPremium(stats?.mediaSoma);
    }

    const dezenasList = concursos.map((c) => extrairDezenasConcurso(c));
    const analiseSeq = analisarSequenciaAtrasoPorDezena(dezenasList);
    const mapaSeq = mapaDezenas(analiseSeq);

    const dezenasFixas = Array.isArray(body.dezenasFixas)
      ? (body.dezenasFixas as number[]).filter((d) => d >= 1 && d <= 25)
      : [];
    const dezenasExcluidas = Array.isArray(body.dezenasExcluidas)
      ? (body.dezenasExcluidas as number[]).filter((d) => d >= 1 && d <= 25)
      : [];

    const poolBase =
      origemBase === 'Livre'
        ? Array.from({ length: 25 }, (_, i) => i + 1)
        : (baseDezenas ?? []);
    const prep = prepararPoolGeracao(poolBase, dezenasFixas, dezenasExcluidas, numerosPorAposta);
    if (!prep.valido) {
      return NextResponse.json({ error: prep.motivoInvalido }, { status: 400 });
    }

    config = {
      ...config,
      mapaSequenciaAtraso: mapaSeq,
      regrasSequenciaAtraso: {
        ...REGRAS_SEQUENCIA_ATRASO_PREMIUM,
        ...config.regrasSequenciaAtraso,
        ...(body.regrasSequenciaAtraso ?? {}),
      },
      usarSequenciaAtraso: body.usarSequenciaAtraso !== false,
    };
    config = aplicarConfigEfetivaParaGeracao(
      config,
      prep.poolEfetivo,
      prep.fixas,
      numerosPorAposta,
      ultimoDezenas,
    );

    const viabilidade = analisarViabilidadeGeracao({
      poolBase,
      dezenasFixas,
      dezenasExcluidas,
      numerosPorAposta,
      ultimoConcurso: ultimoDezenas,
      config,
      origemBase,
    });
    if (!viabilidade.viavel) {
      return NextResponse.json(
        {
          error: viabilidade.bloqueios[0] ?? 'Configuração inviável para geração.',
          viabilidade: {
            bloqueios: viabilidade.bloqueios,
            avisos: viabilidade.avisos,
            diagnostico: viabilidade.diagnostico,
          },
          prioridadeManual: {
            fixas: {
              solicitadas: dezenasFixas,
              aplicadas: prep.fixas,
              foraDaBase: prep.fixasForaDaBase,
            },
            excluidas: {
              solicitadas: dezenasExcluidas,
              aplicadas: prep.excluidas,
            },
            contradicoes: prep.contradicoes,
            poolEfetivo: prep.poolEfetivo.length,
          },
        },
        { status: 400 },
      );
    }

    const tabelaAposta = await getTabelaAposta();

    const jogos = gerarJogos({
      quantidade,
      origemBase,
      baseDezenas,
      ultimoConcurso: ultimoDezenas,
      config,
      maxDezenasIguais,
      numerosPorAposta,
      dezenasFixas,
      dezenasExcluidas,
      tabelaAposta,
    });

    if (salvar && jogos.length) {
      await prisma.jogoGerado.createMany({
        data: jogos.map((j) => {
          const m = calcularMetricas(j.dezenas, ultimoDezenas, baseDezenas);
          return {
            userId: session.user.id,
            origemBase,
            dezenas: j.dezenas,
            soma: j.soma,
            pares: j.pares,
            impares: j.impares,
            primos: j.primos,
            fibonacci: j.fibonacci,
            moldura: j.moldura,
            centro: j.centro,
            repetidasUltimoConcurso: j.repetidasUltimoConcurso,
            dezenasRepetidas: m.dezenasRepetidas ?? [],
            dezenasNovas: m.dezenasNovas ?? [],
            maiorSequenciaSorteada: m.maiorSequenciaSorteada,
            maiorSequenciaAusente: m.maiorSequenciaAusente,
            blocosSorteados: m.blocosSorteados ?? [],
            blocosAusentes: m.blocosAusentes ?? [],
            scoreEstatistico: j.scoreEstatistico,
            statusValidacao: j.statusValidacao,
            perfilUtilizado: perfil ?? 'premium_estrutural',
            detalheScore: j.detalheScore,
          };
        }),
      });
      await prisma.auditLog.create({
        data: {
          userId: session.user.id,
          eventType: 'game_generation',
          description: `Gerados ${jogos.length} jogos`,
          metadata: { origemBase, perfil },
        },
      });
    }

    const repetidasGeral = analisarRepetidasGeral(dezenasList);

    let diagnostico: ReturnType<typeof diagnosticarGeracao> | undefined;
    if (!jogos.length) {
      diagnostico = diagnosticarGeracao({
        origemBase,
        baseDezenas,
        ultimoConcurso: ultimoDezenas,
        config,
        numerosPorAposta,
        dezenasFixas,
        dezenasExcluidas,
      });
    }

    return NextResponse.json({
      jogos,
      plano: premium ? 'premium' : 'free',
      limites: {
        maxJogos: limites.maxJogos,
        maxDezenas: limites.maxDezenas,
      },
      ultimoConcurso: ultimo?.numeroConcurso,
      configUsada: config,
      diagnostico,
      viabilidade: viabilidade.avisos.length
        ? { avisos: viabilidade.avisos }
        : undefined,
      prioridadeManual: {
        fixas: {
          solicitadas: dezenasFixas,
          aplicadas: prep.fixas,
          foraDaBase: prep.fixasForaDaBase,
        },
        excluidas: {
          solicitadas: dezenasExcluidas,
          aplicadas: prep.excluidas,
        },
        contradicoes: prep.contradicoes,
        poolEfetivo: prep.poolEfetivo.length,
      },
      repetidasGeral: {
        media: repetidasGeral.media,
        mediana: repetidasGeral.mediana,
        faixas: repetidasGeral.faixas,
      },
      dezenasSequenciaAtraso: analiseSeq,
    });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: 'Erro ao gerar jogos' }, { status: 500 });
  }
}

