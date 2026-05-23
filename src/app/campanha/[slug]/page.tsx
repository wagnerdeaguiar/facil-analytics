import Link from 'next/link';
import { notFound } from 'next/navigation';
import { getPaginaCampanhaPorSlug } from '@/lib/site-banners';
import { BotaoEntrarApp } from '@/components/BotaoEntrarApp';

export default async function CampanhaPage({ params }: { params: { slug: string } }) {
  const pagina = await getPaginaCampanhaPorSlug(params.slug);
  if (!pagina) notFound();

  const paragrafos = pagina.corpo.split(/\n\s*\n/).filter(Boolean);

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950 text-slate-100">
      <header className="border-b border-slate-800/80 px-4 py-4">
        <div className="mx-auto flex max-w-3xl items-center justify-between">
          <Link href="/" className="text-sm text-brand-400 hover:underline">
            ← Fácil Analytics
          </Link>
          <BotaoEntrarApp className="btn-primary text-sm">Entrar</BotaoEntrarApp>
        </div>
      </header>

      <main className="mx-auto max-w-3xl space-y-6 px-4 py-10">
        <header className="space-y-2">
          <h1 className="text-3xl font-bold text-white">{pagina.titulo}</h1>
          {pagina.resumo && <p className="text-lg text-slate-300">{pagina.resumo}</p>}
        </header>

        <article className="card space-y-4 text-slate-300 leading-relaxed">
          {paragrafos.map((p, i) => (
            <p key={i}>{p.trim()}</p>
          ))}
        </article>

        <div className="flex flex-wrap gap-3">
          {pagina.ctaTexto && pagina.ctaUrl && (
            pagina.ctaUrl.startsWith('http') ? (
              <a href={pagina.ctaUrl} target="_blank" rel="noopener noreferrer" className="btn-primary">
                {pagina.ctaTexto}
              </a>
            ) : (
              <Link href={pagina.ctaUrl} className="btn-primary">
                {pagina.ctaTexto}
              </Link>
            )
          )}
          <Link href="/precos" className="btn-secondary">
            Ver planos
          </Link>
        </div>
      </main>
    </div>
  );
}
