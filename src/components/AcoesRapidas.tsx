import Link from 'next/link';
import { Sparkles, Settings2, FlaskConical, Target } from 'lucide-react';

const acoes = [
  {
    href: '/gerador',
    titulo: 'Gerar jogos',
    desc: 'Montar combinações com filtros e score',
    icon: Sparkles,
    cor: 'border-brand-600/50 bg-brand-950/30',
  },
  {
    href: '/gerador#parametros',
    titulo: 'Ajustar parâmetros',
    desc: 'Faixas de repetidas, soma, Pareto…',
    icon: Settings2,
    cor: 'border-slate-600 bg-slate-800/50',
  },
  {
    href: '/simulador',
    titulo: 'Simular jogos',
    desc: 'Testar contra concursos passados',
    icon: FlaskConical,
    cor: 'border-slate-600 bg-slate-800/50',
  },
  {
    href: '/criterios',
    titulo: 'Critérios fortes',
    desc: 'Faixas com recorrência ≥ 80%',
    icon: Target,
    cor: 'border-slate-600 bg-slate-800/50',
  },
];

export function AcoesRapidas() {
  return (
    <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
      {acoes.map(({ href, titulo, desc, icon: Icon, cor }) => (
        <Link
          key={titulo}
          href={href}
          className={`card block transition hover:border-brand-500/60 ${cor}`}
        >
          <Icon className="mb-2 h-6 w-6 text-brand-400" />
          <h3 className="font-semibold text-white">{titulo}</h3>
          <p className="mt-1 text-xs text-slate-400">{desc}</p>
        </Link>
      ))}
    </section>
  );
}
