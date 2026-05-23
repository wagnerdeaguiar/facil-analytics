import { BannersPublicidade } from '@/components/BannersPublicidade';
import { PlanosSection } from '@/components/PlanosSection';
import Link from 'next/link';
import { Disclaimer } from '@/components/Disclaimer';
import { BotaoEntrarApp } from '@/components/BotaoEntrarApp';
import { isDevAuthEnabled } from '@/lib/auth-config';
import { SITE_EMAIL, SITE_NAME, SITE_TAGLINE } from '@/lib/site-identity';
import { BarChart3, Shield, Sparkles, Target } from 'lucide-react';

export const dynamic = 'force-dynamic';

export default function LandingPage() {
  const devAuth = isDevAuthEnabled();

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950 text-slate-100">
      <header className="border-b border-slate-800/80 px-4 py-4">
        <div className="mx-auto flex max-w-6xl items-center justify-between">
          <div>
            <h1 className="text-xl font-bold text-brand-400">{SITE_NAME}</h1>
            <p className="text-xs text-slate-400">{SITE_TAGLINE}</p>
          </div>
          <nav className="flex items-center gap-3">
            <BotaoEntrarApp className="btn-primary text-sm" grande devAuth={devAuth} irParaEntrar={!devAuth}>
              Entrar
            </BotaoEntrarApp>
          </nav>
        </div>
      </header>

      <main className="mx-auto max-w-6xl space-y-12 px-4 py-12">
        <section className="space-y-6 text-center">
          <p className="text-sm uppercase tracking-widest text-brand-400">Padrão histórico · Score de aderência</p>
          <h2 className="text-4xl font-bold leading-tight md:text-5xl">
            Análise estatística transparente para a Lotofácil
          </h2>
          <p className="mx-auto max-w-2xl text-lg text-slate-300">
            {devAuth
              ? 'Clique no botão abaixo para abrir o app. Tudo já está configurado no seu computador — sem Google, sem cadastro complicado.'
              : `Entre com Google ou crie sua conta com e-mail e senha. Gerador, simulações e planos Premium.`}
          </p>
          <div className="flex flex-col items-center gap-3">
            <BotaoEntrarApp
              className="btn-primary px-10 py-4 text-lg font-semibold shadow-lg shadow-brand-900/40"
              grande
              devAuth={devAuth}
              irParaEntrar={!devAuth}
            >
              {devAuth ? `Abrir ${SITE_NAME}` : 'Entrar ou criar conta'}
            </BotaoEntrarApp>
            {!devAuth && (
              <Link href="/cadastro" className="text-sm text-brand-400 hover:underline">
                Criar conta com e-mail
              </Link>
            )}
            {devAuth && (
              <p className="text-xs text-slate-500">
                Ou dê dois cliques em{' '}
                <strong className="text-slate-400">INICIAR-FACIL-ANALYTICS.bat</strong> na pasta do projeto
              </p>
            )}
          </div>
        </section>

        <Disclaimer />

        <section className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
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
        </section>

        <section className="card text-center">
          <h3 className="text-lg font-semibold text-white">Explorar sem entrar</h3>
          <p className="mt-2 text-sm text-slate-400">Telas de análise abertas no modo visitante</p>
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
