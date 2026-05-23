'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { ManualSections } from '@/components/manual/ManualSections';
import { BookOpen, ChevronRight, Printer } from 'lucide-react';
import clsx from 'clsx';

const TOC = [
  { id: 'introducao', label: 'Introdução' },
  { id: 'planos', label: 'Planos e acesso' },
  { id: 'primeiros-passos', label: 'Primeiros passos' },
  { id: 'navegacao', label: 'Navegação' },
  { id: 'analise', label: 'Análise estatística' },
  { id: 'resultados-dados', label: 'Resultados e importação' },
  { id: 'perfis', label: 'Perfis de geração' },
  { id: 'gerador', label: 'Gerador de apostas' },
  { id: 'fechamento', label: 'Fechamento combinatório' },
  { id: 'simulador', label: 'Simulador retroativo' },
  { id: 'exportacao', label: 'Exportação' },
  { id: 'conta', label: 'Conta e assinatura' },
  { id: 'glossario', label: 'Glossário' },
  { id: 'faq', label: 'Perguntas frequentes' },
  { id: 'legal', label: 'Informações legais' },
];

export default function ManualPage() {
  const [active, setActive] = useState(TOC[0].id);

  useEffect(() => {
    const obs = new IntersectionObserver(
      (entries) => {
        const visible = entries.filter((e) => e.isIntersecting).sort((a, b) => b.intersectionRatio - a.intersectionRatio);
        if (visible[0]?.target.id) setActive(visible[0].target.id);
      },
      { rootMargin: '-20% 0px -60% 0px', threshold: [0, 0.25, 0.5] },
    );
    TOC.forEach(({ id }) => {
      const el = document.getElementById(id);
      if (el) obs.observe(el);
    });
    return () => obs.disconnect();
  }, []);

  return (
    <div className="space-y-8">
      <header className="relative overflow-hidden rounded-2xl border border-brand-500/20 bg-gradient-to-br from-brand-950/80 via-slate-900 to-slate-950 p-6 md:p-10">
        <div className="relative z-10 max-w-2xl">
          <div className="mb-3 inline-flex items-center gap-2 rounded-full bg-brand-600/20 px-3 py-1 text-xs font-medium text-brand-300">
            <BookOpen className="h-3.5 w-3.5" />
            Documentação oficial
          </div>
          <h1 className="text-3xl font-bold tracking-tight text-white md:text-4xl">Manual do Usuário</h1>
          <p className="mt-3 text-base text-slate-300">
            Guia completo do <strong className="text-brand-300">Fácil Analytics</strong>: o que cada tela faz, como
            configurar, gerar apostas e interpretar resultados. Acesso livre para todos os usuários.
          </p>
          <div className="mt-6 flex flex-wrap gap-3">
            <Link href="/gerador" className="btn-primary inline-flex items-center gap-1 text-sm">
              Ir ao Gerador <ChevronRight className="h-4 w-4" />
            </Link>
            <Link href="/precos" className="btn-secondary text-sm">
              Ver plano Premium
            </Link>
            <button
              type="button"
              onClick={() => window.print()}
              className="btn-secondary inline-flex items-center gap-1 text-sm"
            >
              <Printer className="h-4 w-4" />
              Imprimir / PDF
            </button>
          </div>
        </div>
        <div className="pointer-events-none absolute -right-8 -top-8 h-48 w-48 rounded-full bg-brand-500/10 blur-3xl" />
      </header>

      <div className="flex flex-col gap-8 lg:flex-row lg:items-start">
        <nav
          aria-label="Índice do manual"
          className="no-print shrink-0 lg:sticky lg:top-8 lg:w-56 lg:self-start"
        >
          <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-slate-500">Índice</p>
          <ul className="max-h-[70vh] space-y-0.5 overflow-y-auto rounded-xl border border-slate-800 bg-slate-900/50 p-2 text-sm">
            {TOC.map(({ id, label }) => (
              <li key={id}>
                <a
                  href={`#${id}`}
                  className={clsx(
                    'block rounded-lg px-3 py-2 transition',
                    active === id
                      ? 'bg-brand-600/20 font-medium text-brand-300'
                      : 'text-slate-400 hover:bg-slate-800 hover:text-slate-200',
                  )}
                >
                  {label}
                </a>
              </li>
            ))}
          </ul>
        </nav>

        <article className="min-w-0 flex-1 rounded-2xl border border-slate-800/80 bg-slate-950/40 p-6 md:p-8">
          <ManualSections />
        </article>
      </div>
    </div>
  );
}
