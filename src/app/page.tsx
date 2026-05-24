import { BannersPublicidade } from '@/components/BannersPublicidade';
import { PlanosSection } from '@/components/PlanosSection';
import Link from 'next/link';
import { Disclaimer } from '@/components/Disclaimer';
import { DezenasGrid } from '@/components/DezenasGrid';
import { isDevAuthEnabled } from '@/lib/auth-config';
import { getSessionUser } from '@/lib/auth';
import { loadLandingStats } from '@/lib/landing-stats';
import { SITE_EMAIL, SITE_NAME, SITE_TAGLINE } from '@/lib/site-identity';
import {
  BarChart3,
  Calendar,
  Flame,
  Hash,
  Shield,
  Sparkles,
  Target,
  Timer,
  TrendingUp,
  Users,
} from 'lucide-react';

export const dynamic = 'force-dynamic';

function fmtPct(n: number) {
  return `${n.toFixed(1)}%`;
}

export default async function LandingPage() {
  const devAuth = isDevAuthEnabled();
  const session = await getSessionUser();
  const stats = await loadLandingStats();

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950 text-slate-100">
      <header className="sticky top-0 z-20 border-b border-slate-800/80 bg-slate-950/90 backdrop-blur-md">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-4">
          <div>
            <Link href="/" className="text-xl font-bold text-brand-400 hover:text-brand-300">
              {SITE_NAME}
            </Link>
            <p className="text-xs text-slate-400">{SITE_TAGLINE}</p>
          </div>
          <nav className="flex items-center gap-2 sm:gap-3">
            {session?.user ? (
              <Link href="/dashboard" className="btn-primary text-sm">
                Meu painel
              </Link>
            ) : devAuth ? (
              <Link href="/comecar" className="btn-primary text-sm">
                Abrir app
              </Link>
            ) : (
              <>
                <Link href="/entrar" className="btn-secondary hidden text-sm sm:inline-flex">
                  Entrar
                </Link>
                <Link href="/cadastro" className="btn-primary text-sm">
                  Criar conta
                </Link>
              </>
            )}
          </nav>
        </div>
      </header>

      <main className="mx-auto max-w-6xl space-y-14 px-4 py-10 md:py-14">
        {/* Hero */}
        <section className="grid items-center gap-10 lg:grid-cols-2 lg:gap-12">
          <div className="space-y-6">
            <p className="text-sm uppercase tracking-widest text-brand-400">
              Lotofácil · {stats.totalConcursos.toLocaleString('pt-BR')} concursos analisados
            </p>
            <h1 className="text-4xl font-bold leading-tight md:text-5xl">
              Estatística clara para montar seus jogos
            </h1>
            <p className="text-lg text-slate-300">
              Veja padrões históricos, dezenas quentes e atrasadas, critérios fortes e gere combinações com
              score de aderência — sem prometer ganho, com transparência total.
            </p>

            {!devAuth && !session?.user && (
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
                <Link
                  href="/cadastro"
                  className="btn-primary px-8 py-3.5 text-center text-base font-semibold shadow-lg shadow-brand-900/30"
                >
                  Criar conta grátis
                </Link>
                <Link href="/entrar" className="btn-secondary px-8 py-3.5 text-center text-base">
                  Já tenho conta
                </Link>
              </div>
            )}
            {!devAuth && !session?.user && (
              <p className="text-sm text-slate-500">
                Cadastro com <strong className="font-normal text-slate-400">e-mail e senha</strong> ou{' '}
                <strong className="font-normal text-slate-400">Google</strong> — você escolhe.
              </p>
            )}
            {devAuth && (
              <Link href="/comecar" className="btn-primary inline-block px-8 py-3.5">
                Abrir {SITE_NAME} (local)
              </Link>
            )}
          </div>

          {/* Painel estatístico ao vivo */}
          {stats.ultimo ? (
            <div className="card space-y-4 border-brand-900/40 bg-slate-900/60">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-xs uppercase tracking-wider text-brand-400">Último sorteio</p>
                  <p className="text-2xl font-bold text-white">Concurso {stats.ultimo.numero}</p>
                  {stats.ultimo.data && (
                    <p className="text-sm text-slate-400">{stats.ultimo.data}</p>
                  )}
                </div>
                <Link href="/resultados" className="text-xs text-brand-400 hover:underline">
                  Ver histórico →
                </Link>
              </div>
              <DezenasGrid dezenas={stats.ultimo.dezenas} size="sm" />
              <div className="grid grid-cols-3 gap-2 text-center text-xs">
                <div className="rounded-lg bg-slate-800/80 px-2 py-2">
                  <p className="text-slate-500">Pares</p>
                  <p className="font-semibold text-white">{stats.ultimo.pares}</p>
                </div>
                <div className="rounded-lg bg-slate-800/80 px-2 py-2">
                  <p className="text-slate-500">Ímpares</p>
                  <p className="font-semibold text-white">{stats.ultimo.impares}</p>
                </div>
                <div className="rounded-lg bg-slate-800/80 px-2 py-2">
                  <p className="text-slate-500">Soma</p>
                  <p className="font-semibold text-white">{stats.ultimo.soma}</p>
                </div>
              </div>
            </div>
          ) : (
            <div className="card text-center text-slate-400">
              <p>Histórico em atualização. Faça login para importar concursos.</p>
            </div>
          )}
        </section>

        {/* Números de impacto */}
        {stats.hasData && (
          <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {[
              {
                icon: Hash,
                label: 'Concursos no banco',
                value: stats.totalConcursos.toLocaleString('pt-BR'),
              },
              {
                icon: TrendingUp,
                label: 'Critérios ≥ 80%',
                value: String(stats.criteriosFortes),
              },
              {
                icon: Calendar,
                label: 'Sorteios',
                value: '6× por semana',
              },
              {
                icon: Users,
                label: 'Formato',
                value: '15 de 25 dezenas',
              },
            ].map(({ icon: Icon, label, value }) => (
              <div key={label} className="card flex items-center gap-3 py-4">
                <Icon className="h-8 w-8 shrink-0 text-brand-400" />
                <div>
                  <p className="text-xs text-slate-500">{label}</p>
                  <p className="text-lg font-semibold text-white">{value}</p>
                </div>
              </div>
            ))}
          </section>
        )}

        <Disclaimer />

        {/* Dezenas quentes e atrasadas */}
        {stats.hasData && (stats.topQuentes.length > 0 || stats.topAtrasadas.length > 0) && (
          <section className="grid gap-6 md:grid-cols-2">
            {stats.topQuentes.length > 0 && (
              <div className="card">
                <div className="mb-4 flex items-center gap-2">
                  <Flame className="h-5 w-5 text-orange-400" />
                  <h2 className="font-semibold text-white">Dezenas mais frequentes</h2>
                </div>
                <p className="mb-3 text-xs text-slate-500">
                  Amostra dos últimos {Math.min(stats.totalConcursos, 800)} concursos — recorrência histórica.
                </p>
                <ul className="space-y-2">
                  {stats.topQuentes.map((f) => (
                    <li
                      key={f.dezena}
                      className="flex items-center justify-between rounded-lg bg-slate-800/50 px-3 py-2 text-sm"
                    >
                      <span className="font-mono font-semibold text-brand-300">
                        {String(f.dezena).padStart(2, '0')}
                      </span>
                      <span className="text-slate-400">{fmtPct(f.percentual)} nos sorteios</span>
                      <span className="text-xs text-slate-500">atraso {f.atrasoAtual}</span>
                    </li>
                  ))}
                </ul>
                <Link href="/bases" className="mt-4 inline-block text-sm text-brand-400 hover:underline">
                  Ver bases Pareto →
                </Link>
              </div>
            )}
            {stats.topAtrasadas.length > 0 && (
              <div className="card">
                <div className="mb-4 flex items-center gap-2">
                  <Timer className="h-5 w-5 text-sky-400" />
                  <h2 className="font-semibold text-white">Maiores atrasos hoje</h2>
                </div>
                <p className="mb-3 text-xs text-slate-500">
                  Quantos concursos se passaram desde a última aparição de cada dezena.
                </p>
                <ul className="space-y-2">
                  {stats.topAtrasadas.map((f) => (
                    <li
                      key={f.dezena}
                      className="flex items-center justify-between rounded-lg bg-slate-800/50 px-3 py-2 text-sm"
                    >
                      <span className="font-mono font-semibold text-sky-300">
                        {String(f.dezena).padStart(2, '0')}
                      </span>
                      <span className="text-slate-300">{f.atrasoAtual} concursos sem sair</span>
                      <span className="text-xs text-slate-500">{fmtPct(f.percentual)} hist.</span>
                    </li>
                  ))}
                </ul>
                <Link href="/sequencias" className="mt-4 inline-block text-sm text-brand-400 hover:underline">
                  Seq. e atrasos →
                </Link>
              </div>
            )}
          </section>
        )}

        {/* O que é a Lotofácil */}
        <section className="card bg-gradient-to-br from-slate-900 to-slate-900/50">
          <h2 className="text-xl font-semibold text-white">Como funciona a Lotofácil?</h2>
          <div className="mt-4 grid gap-4 sm:grid-cols-3">
            {[
              {
                title: '15 dezenas',
                text: 'Você marca 15 números entre 01 e 25. Acertou 11, 12, 13, 14 ou 15? Ganha prêmio.',
              },
              {
                title: 'Sorteios frequentes',
                text: 'Seis concursos por semana (segunda a sábado). Histórico rico para análise estatística.',
              },
              {
                title: 'Milhões de combinações',
                text: 'São 3,2 milhões de combinações possíveis. Estatística ajuda a filtrar — não garante acerto.',
              },
            ].map(({ title, text }) => (
              <div key={title} className="rounded-lg border border-slate-800 bg-slate-950/50 p-4">
                <h3 className="font-medium text-brand-300">{title}</h3>
                <p className="mt-2 text-sm text-slate-400">{text}</p>
              </div>
            ))}
          </div>
        </section>

        {/* Ferramentas */}
        <section>
          <h2 className="mb-6 text-center text-xl font-semibold text-white">O que você encontra no {SITE_NAME}</h2>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            {[
              { icon: BarChart3, title: 'Recorrência estatística', desc: 'Critérios com histórico ≥ 80%.' },
              { icon: Target, title: 'Estrutura horizontal', desc: 'Sequências sorteadas e ausentes.' },
              { icon: Sparkles, title: 'Gerador com score', desc: 'Perfis estatísticos configuráveis.' },
              { icon: Shield, title: 'Simulação retroativa', desc: 'Teste contra concursos passados.' },
            ].map(({ icon: Icon, title, desc }) => (
              <div key={title} className="card">
                <Icon className="mb-2 h-8 w-8 text-brand-400" />
                <h3 className="font-semibold text-white">{title}</h3>
                <p className="mt-1 text-sm text-slate-400">{desc}</p>
              </div>
            ))}
          </div>
        </section>

        {/* Explorar sem login */}
        <section className="card text-center">
          <h3 className="text-lg font-semibold text-white">Explorar sem cadastro</h3>
          <p className="mt-2 text-sm text-slate-400">Parte das telas abertas para visitantes</p>
          <div className="mt-4 flex flex-wrap justify-center gap-3">
            <Link href="/demo" className="btn-secondary">
              Demonstração
            </Link>
            <Link href="/criterios" className="btn-secondary">
              Critérios fortes
            </Link>
            <Link href="/bases" className="btn-secondary">
              Bases Pareto
            </Link>
            <Link href="/resultados" className="btn-secondary">
              Resultados
            </Link>
          </div>
        </section>

        {/* CTA final */}
        {!session?.user && !devAuth && (
          <section className="rounded-2xl border border-brand-800/50 bg-brand-950/20 px-6 py-10 text-center">
            <h2 className="text-2xl font-bold text-white">Pronto para analisar seus jogos?</h2>
            <p className="mx-auto mt-2 max-w-lg text-slate-400">
              Crie sua conta em segundos ou entre com Google. Plano gratuito para começar.
            </p>
            <div className="mt-6 flex flex-col justify-center gap-3 sm:flex-row">
              <Link href="/cadastro" className="btn-primary px-10 py-3.5 text-base">
                Criar conta grátis
              </Link>
              <Link href="/entrar" className="btn-secondary px-10 py-3.5 text-base">
                Entrar
              </Link>
            </div>
          </section>
        )}

        <section className="border-t border-slate-800/60 pt-10">
          <PlanosSection modo="landing" />
        </section>

        <section className="border-t border-slate-800/60 pt-10">
          <p className="mb-5 text-center text-xs uppercase tracking-widest text-slate-500">Destaques</p>
          <BannersPublicidade />
        </section>
      </main>

      <footer className="border-t border-slate-800 px-4 py-6 text-center text-xs text-slate-500">
        {SITE_NAME} — ferramenta de apoio à decisão, não lotérica oficial.{' '}
        <a href={`mailto:${SITE_EMAIL}`} className="text-slate-400 hover:underline">
          {SITE_EMAIL}
        </a>
        {' · '}
        <Link href="/manual" className="text-brand-400 hover:underline">
          Manual do usuário
        </Link>
        {' · '}
        <Link href="/privacidade" className="text-slate-400 hover:underline">
          Privacidade
        </Link>
      </footer>
    </div>
  );
}
