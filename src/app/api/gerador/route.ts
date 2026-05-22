import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { isPremiumStatus } from '@/lib/subscription';
import { prisma } from '@/lib/db';
import {
  gerarJogos,
  diagnosticarGeracao,
  configFromPerfilPremium,
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
  ajustarRegrasSequenciaParaPool,
} from '@/lib/lotofacil/sequencia-atraso';

export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id || !isPremiumStatus(session.user.subscriptionStatus)) {
      return NextResponse.json(
        { error: 'Esta funcionalidade faz parte do Plano Premium.' },
        { status: 403 },
      );
    }

    const body = await request.json();
    const quantidade = Math.min(Number(body.quantidade) || 10, 500);
    const origemBase = (body.origemBase || '20D') as OrigemBase;
    const perfil = body.perfil as string | undefined;
    const maxDezenasIguais = Number(body.maxDezenasIguais) || 13;
    const salvar = body.salvar !== false;

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
    const poolGeracao =
      baseDezenas ??
      (origemBase === 'Livre' ? Array.from({ length: 25 }, (_, i) => i + 1) : undefined);
    const regrasSeq = ajustarRegrasSequenciaParaPool(
      poolGeracao ?? Array.from({ length: 25 }, (_, i) => i + 1),
      mapaSeq,
      {
        ...REGRAS_SEQUENCIA_ATRASO_PREMIUM,
        ...config.regrasSequenciaAtraso,
        ...(body.regrasSequenciaAtraso ?? {}),
      },
    );
    config = {
      ...config,
      mapaSequenciaAtraso: mapaSeq,
      regrasSequenciaAtraso: regrasSeq,
      usarSequenciaAtraso: body.usarSequenciaAtraso !== false,
    };

    const jogos = gerarJogos({
      quantidade,
      origemBase,
      baseDezenas,
      ultimoConcurso: ultimoDezenas,
      config,
      maxDezenasIguais,
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
      });
    }

    return NextResponse.json({
      jogos,
      ultimoConcurso: ultimo?.numeroConcurso,
      configUsada: config,
      diagnostico,
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

