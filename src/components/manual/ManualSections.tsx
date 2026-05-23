import Link from 'next/link';
import { Badge } from './ManualBadges';
import {
  Activity,
  BarChart3,
  BookOpen,
  Crown,
  Download,
  FlaskConical,
  Layers,
  ListOrdered,
  Rows3,
  Settings,
  Sparkles,
  Target,
  User,
} from 'lucide-react';

function Section({
  id,
  title,
  icon: Icon,
  children,
}: {
  id: string;
  title: string;
  icon: React.ComponentType<{ className?: string }>;
  children: React.ReactNode;
}) {
  return (
    <section id={id} className="scroll-mt-24">
      <div className="mb-4 flex items-center gap-3 border-b border-slate-700/60 pb-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand-600/15 text-brand-400">
          <Icon className="h-5 w-5" />
        </div>
        <h2 className="text-xl font-bold text-white">{title}</h2>
      </div>
      <div className="prose-manual space-y-4 text-sm leading-relaxed text-slate-300">{children}</div>
    </section>
  );
}

function Step({ n, title, children }: { n: number; title: string; children: React.ReactNode }) {
  return (
    <div className="flex gap-4 rounded-xl border border-slate-700/50 bg-slate-800/30 p-4">
      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-brand-600 text-sm font-bold text-white">
        {n}
      </div>
      <div>
        <h4 className="font-semibold text-slate-100">{title}</h4>
        <div className="mt-1 text-slate-400">{children}</div>
      </div>
    </div>
  );
}

function FeatureCard({
  title,
  href,
  badge,
  children,
}: {
  title: string;
  href: string;
  badge: 'free' | 'premium' | 'admin';
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-xl border border-slate-700/50 bg-slate-900/40 p-4">
      <div className="mb-2 flex flex-wrap items-center gap-2">
        <h4 className="font-semibold text-brand-300">{title}</h4>
        <Badge variant={badge}>{badge === 'free' ? 'Gratuito' : badge === 'premium' ? 'Premium' : 'Admin'}</Badge>
      </div>
      <p className="text-sm text-slate-400">{children}</p>
      <Link href={href} className="mt-3 inline-block text-xs font-medium text-brand-400 hover:underline">
        Abrir tela →
      </Link>
    </div>
  );
}

export function ManualSections() {
  return (
    <div className="space-y-14">
      <Section id="introducao" title="Introdução" icon={BookOpen}>
        <p>
          O <strong className="text-slate-100">Fácil Analytics</strong> é uma plataforma de apoio à decisão para a
          Lotofácil. Ele analisa o histórico de concursos, identifica padrões estatísticos recorrentes e ajuda você a
          montar apostas com critérios transparentes — sempre com um <strong>score de aderência</strong> (0 a 100) que
          mede o quanto cada jogo se aproxima do padrão histórico.
        </p>
        <div className="rounded-xl border border-amber-500/30 bg-amber-950/20 p-4 text-amber-100/90">
          <p className="font-medium">Aviso importante</p>
          <p className="mt-1 text-sm text-amber-200/80">
            Este sistema utiliza estatística histórica. Nenhum resultado passado garante resultado futuro. Trata-se de
            ferramenta analítica, não de promessa de prêmio.
          </p>
        </div>
        <p>O que você pode fazer:</p>
        <ul className="list-inside list-disc space-y-1 text-slate-400">
          <li>Consultar concursos, critérios fortes e bases Pareto (sem pagar)</li>
          <li>Visualizar sequências, atrasos e estrutura horizontal da cartela</li>
          <li>Gerar apostas filtradas com 15 a 20 dezenas (Premium)</li>
          <li>Simular jogos contra concursos passados (Premium)</li>
          <li>Exportar em CSV, Excel e PDF (Premium)</li>
        </ul>
      </Section>

      <Section id="planos" title="Planos e acesso" icon={Crown}>
        <div className="overflow-x-auto rounded-xl border border-slate-700/50">
          <table className="w-full min-w-[520px] text-left text-sm">
            <thead className="bg-slate-800/80 text-xs uppercase text-slate-400">
              <tr>
                <th className="px-4 py-3">Recurso</th>
                <th className="px-4 py-3">Gratuito</th>
                <th className="px-4 py-3">Premium</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800 text-slate-300">
              {[
                ['Landing, demo e manual', 'Sim', 'Sim'],
                ['Resultados, critérios, bases, sequências, estrutura', 'Sim', 'Sim'],
                ['Dashboard e Minha Conta (com login)', 'Sim', 'Sim'],
                ['Gerador — até 5 jogos de 15 dezenas + imprimir', 'Sim', 'Sim'],
                ['Gerador completo (16–20 dezenas, até 500 jogos)', 'Não', 'Sim'],
                ['Fechamento combinatório', 'Não', 'Sim'],
                ['Simulador retroativo', 'Não', 'Sim'],
                ['Exportação CSV / Excel / PDF', 'Não', 'Sim'],
                ['Importação e manutenção de dados', 'Não', 'Sim'],
                ['Perfis de geração (página dedicada)', 'Não', 'Sim'],
              ].map(([recurso, free, prem]) => (
                <tr key={recurso} className="hover:bg-slate-800/30">
                  <td className="px-4 py-2.5">{recurso}</td>
                  <td className="px-4 py-2.5">{free}</td>
                  <td className="px-4 py-2.5 text-brand-300">{prem}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p>
          O Premium é cobrado mensalmente via <strong className="text-slate-100">Asaas</strong> (PIX, boleto ou
          cartão). Telas Premium exibem um
          ícone de coroa no menu. Sem assinatura, você é direcionado à página de preços ao tentar acessá-las.
        </p>
        <p>
          <Badge variant="free">Local</Badge> No modo desenvolvimento, o login simplificado e o Premium podem estar
          liberados automaticamente (variáveis <code className="text-brand-300">AUTH_DEV_MODE</code> e{' '}
          <code className="text-brand-300">AUTH_DEV_PREMIUM</code> no arquivo <code>.env</code>).
        </p>
      </Section>

      <Section id="primeiros-passos" title="Primeiros passos" icon={Settings}>
        <h3 className="text-base font-semibold text-slate-200">Uso local (seu computador)</h3>
        <div className="space-y-3">
          <Step n={1} title="Iniciar o sistema">
            Dê dois cliques em <strong>INICIAR-FACIL-ANALYTICS.bat</strong> na pasta do projeto. O script sobe o
            banco PostgreSQL (Docker, porta 5433), prepara o schema e abre o app em{' '}
            <strong>http://localhost:3010</strong>.
          </Step>
          <Step n={2} title="Entrar no app">
            Clique em <strong>Abrir Fácil Analytics</strong> na landing ou use <strong>/comecar</strong> para login
            automático em modo dev.
          </Step>
          <Step n={3} title="Importar concursos (Premium)">
            Vá em <Link href="/resultados#importacao">Resultados</Link>, baixe o Excel no site da Caixa, salve em{' '}
            <code className="text-brand-300">C:\Downloads\Lotofácil.xlsx</code> e importe o histórico completo. Depois
            clique em <strong>Recalcular tudo</strong> para atualizar critérios e bases Pareto.
          </Step>
          <Step n={4} title="Explorar e gerar">
            Use o Dashboard e as telas analíticas. Com Premium, escolha um perfil em{' '}
            <Link href="/perfis">Perfis</Link> e gere apostas em <Link href="/gerador">Gerador</Link>.
          </Step>
        </div>
        <h3 className="mt-6 text-base font-semibold text-slate-200">Scripts úteis (Windows)</h3>
        <ul className="grid gap-2 sm:grid-cols-2">
          {[
            ['INICIAR-FACIL-ANALYTICS.bat', 'Inicia tudo e abre o app'],
            ['SUBIR-DOCKER.bat', 'Só sobe o PostgreSQL'],
            ['PUBLICAR-FACIL-ANALYTICS.bat', 'Assistente de publicação online'],
          ].map(([nome, desc]) => (
            <li key={nome} className="rounded-lg bg-slate-800/40 px-3 py-2 text-xs">
              <span className="font-mono text-brand-300">{nome}</span>
              <span className="mt-0.5 block text-slate-500">{desc}</span>
            </li>
          ))}
        </ul>
      </Section>

      <Section id="navegacao" title="Navegação" icon={ListOrdered}>
        <p>
          Após entrar no app, o <strong className="text-slate-100">menu lateral</strong> concentra todas as telas. Em
          celular, use o ícone ☰ no canto superior esquerdo.
        </p>
        <ol className="list-inside list-decimal space-y-1 text-slate-400">
          <li>Dashboard — visão geral</li>
          <li>Resultados — histórico, importação e cadastro manual</li>
          <li>Critérios Fortes — faixas com recorrência ≥ 80%</li>
          <li>Bases Pareto — conjuntos 18D, 19D e 20D</li>
          <li>Seq. e Atrasos — comportamento por dezena</li>
          <li>Estrutura Horizontal — blocos na cartela</li>
          <li>Gerador (free: 5×15 + imprimir) · Fechamento, Simulador, Exportação, Perfis — Premium</li>
        </ol>
        <p>
          Rodapé do menu: <strong>Minha Conta</strong>, <strong>Sair</strong> e link para assinar Premium.
        </p>
      </Section>

      <Section id="analise" title="Análise estatística" icon={BarChart3}>
        <p className="mb-4 text-slate-400">
          Disponível para visitantes e assinantes. Ideal para entender o histórico antes de gerar jogos.
        </p>
        <div className="grid gap-4 md:grid-cols-2">
          <FeatureCard title="Dashboard" href="/dashboard" badge="free">
            Resumo do último concurso, médias históricas, top dezenas quentes/frias, gráficos e critérios fortes em
            destaque. Requer login.
          </FeatureCard>
          <FeatureCard title="Resultados" href="/resultados" badge="free">
            Lista de concursos com filtro por intervalo. Cadastre concurso manual (login). Importação do Excel da Caixa,
            atualização do último sorteio e recálculo estatístico (Premium). Exibe soma, pares e repetidas.
          </FeatureCard>
          <FeatureCard title="Critérios Fortes" href="/criterios" badge="free">
            Faixas estatísticas (repetidas, soma, pares, moldura etc.) que ocorreram em ≥ 80% dos concursos. Faixa
            premium = mais restritiva. Link direto para o gerador.
          </FeatureCard>
          <FeatureCard title="Bases Pareto" href="/bases" badge="free">
            Três bases fixas (18, 19 e 20 dezenas) com maior frequência histórica. Mostra cobertura retroativa (% de
            concursos com 11, 12, 13+ acertos dentro da base).
          </FeatureCard>
          <FeatureCard title="Seq. e Atrasos" href="/sequencias" badge="free">
            Por dezena (01–25): sequência atual, atraso, peso para o gerador. Padrão: últimos 10 concursos. Duas
            camadas: repetidas gerais e análise individual.
          </FeatureCard>
          <FeatureCard title="Estrutura Horizontal" href="/estrutura-horizontal" badge="free">
            Maior sequência sorteada e ausente na cartela, combinações frequentes e blocos por concurso (últimos 50).
          </FeatureCard>
        </div>
      </Section>

      <Section id="resultados-dados" title="Resultados e importação" icon={ListOrdered}>
        <Badge variant="premium">Importação Premium</Badge>
        <p className="mt-2">
          A tela <Link href="/resultados">Resultados</Link> concentra o histórico de concursos e a manutenção da base.
          Sem dados importados, o Dashboard e o Gerador ficam vazios ou imprecisos.
        </p>
        <h3 className="font-semibold text-slate-200">Importar Lotofácil.xlsx (Downloads)</h3>
        <ol className="list-inside list-decimal space-y-1 text-slate-400">
          <li>
            Baixe o histórico em Excel no{' '}
            <a
              href="https://loterias.caixa.gov.br/Paginas/Lotofacil.aspx"
              target="_blank"
              rel="noopener noreferrer"
              className="text-brand-400 underline"
            >
              site da Caixa (Lotofácil)
            </a>
            .
          </li>
          <li>
            Salve o arquivo em <code className="text-brand-300">C:\Downloads\Lotofácil.xlsx</code> (pasta Downloads).
          </li>
          <li>
            Em <Link href="/resultados#importacao">Resultados → Importação</Link>, clique em{' '}
            <strong>Importar histórico completo (Excel)</strong>.
          </li>
        </ol>
        <h3 className="mt-4 font-semibold text-slate-200">Atualizar e recalcular</h3>
        <ul className="list-inside list-disc space-y-1 text-slate-400">
          <li>
            <strong>Atualizar último concurso</strong> — força a sincronização do sorteio mais recente (também ocorre
            automaticamente ao abrir o app).
          </li>
          <li>
            <strong>Recalcular tudo</strong> — regenera critérios fortes, bases Pareto e estatísticas globais após
            importação.
          </li>
        </ul>
        <p className="text-xs text-slate-500">
          Cadastro manual de um concurso (login) permanece disponível na mesma tela para correções pontuais.
        </p>
      </Section>

      <Section id="perfis" title="Perfis de geração" icon={Target}>
        <Badge variant="premium">Premium</Badge>
        <p className="mt-2">
          Perfis são &quot;receitas prontas&quot; de filtros. Cada um define base Pareto, score mínimo, faixas
          estatísticas, critérios estruturais e limite de dezenas iguais entre apostas.
        </p>
        <div className="overflow-x-auto rounded-xl border border-slate-700/50">
          <table className="w-full min-w-[640px] text-left text-xs">
            <thead className="bg-slate-800/80 uppercase text-slate-400">
              <tr>
                <th className="px-3 py-2">Perfil</th>
                <th className="px-3 py-2">Base</th>
                <th className="px-3 py-2">Score mín.</th>
                <th className="px-3 py-2">Perfil de uso</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800 text-slate-300">
              {[
                ['Conservador', '20D', '75', 'Faixas moderadas, foco repetidas/soma'],
                ['Premium Estatístico', '20D', '80', 'Padrão recomendado — equilíbrio histórico'],
                ['Premium Estrutural', '20D', '85', 'Mais rigor em sequências na cartela'],
                ['Amplo', '20D', '70', 'Mais jogos passam nos filtros'],
                ['Agressivo', '18D', '72', 'Mais repetidas, base menor'],
                ['Ruptura', 'Livre', '65', 'Menos repetidas, mais atrasos'],
                ['Personalizado', '20D', '0', 'Você ajusta tudo manualmente'],
              ].map(([nome, base, score, uso]) => (
                <tr key={nome}>
                  <td className="px-3 py-2 font-medium text-brand-300">{nome}</td>
                  <td className="px-3 py-2">{base}</td>
                  <td className="px-3 py-2">{score}</td>
                  <td className="px-3 py-2 text-slate-400">{uso}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p>
          Em <Link href="/perfis">Perfis</Link>, clique em <strong>Usar este perfil</strong>. No{' '}
          <Link href="/gerador">Gerador → Parâmetros</Link>, os mesmos 7 botões aplicam a configuração completa (base,
          score e faixas). Editar um critério manualmente transforma a configuração em personalizada.
        </p>
      </Section>

      <Section id="gerador" title="Gerador de apostas" icon={Sparkles}>
        <Badge variant="premium">Premium</Badge>
        <p className="mt-2">
          Gera apostas filtradas por score e critérios estatísticos. Duas abas: <strong>Gerar jogos</strong> (quantidade,
          dezenas, base) e <strong>Parâmetros</strong> (faixas detalhadas).
        </p>

        <h3 className="font-semibold text-slate-200">Apostas com 15 a 20 dezenas (regras Caixa)</h3>
        <div className="overflow-x-auto rounded-xl border border-slate-700/50">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-800/80 text-xs uppercase text-slate-400">
              <tr>
                <th className="px-4 py-2">Dezenas marcadas</th>
                <th className="px-4 py-2">Jogos de 15 gerados</th>
                <th className="px-4 py-2">Preço oficial</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800 text-slate-300">
              {[
                ['15', '1', 'R$ 3,50'],
                ['16', '16', 'R$ 56,00'],
                ['17', '136', 'R$ 476,00'],
                ['18', '816', 'R$ 2.856,00'],
                ['19', '3.876', 'R$ 13.566,00'],
                ['20', '15.504', 'R$ 54.264,00'],
              ].map(([d, comb, preco]) => (
                <tr key={d}>
                  <td className="px-4 py-2">{d}</td>
                  <td className="px-4 py-2">{comb}</td>
                  <td className="px-4 py-2 text-brand-300">{preco}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <h3 className="font-semibold text-slate-200">Parâmetros principais</h3>
        <ul className="list-inside list-disc space-y-1 text-slate-400">
          <li>
            <strong>Quantidade de apostas</strong> — até 200 na interface (500 na API)
          </li>
          <li>
            <strong>Base Pareto</strong> — 18D, 19D, 20D ou Livre (1–25). Limita quantas dezenas você pode marcar
          </li>
          <li>
            <strong>Score mínimo</strong> — 0 a 100; jogos abaixo são descartados
          </li>
          <li>
            <strong>Máx. dezenas iguais</strong> — evita apostas muito parecidas; ajustado automaticamente para 16–20
            dezenas
          </li>
          <li>
            <strong>Dezenas fixas / indesejadas</strong> — primeiro critério (mesmo peso): fixas obrigatórias,
            indesejadas proibidas; depois aplicam-se perfil, score e filtros estatísticos
          </li>
        </ul>

        <h3 className="font-semibold text-slate-200">Critérios editáveis (aba Parâmetros)</h3>
        <p className="text-slate-400">
          Repetidas, pares, ímpares, soma, moldura, centro, primos, fibonacci, sequência sorteada/ausente na cartela,
          distribuição por linhas/colunas do volante 5×5 (opcional), regras de sequência/atraso por dezena. Cada critério
          tem mínimo, máximo, alvo, Ativo e Obrigatório.
        </p>

        <div className="rounded-xl border border-slate-700/50 bg-slate-900/40 p-4">
          <p className="font-medium text-slate-200">Dicas se nenhum jogo passar nos filtros</p>
          <ul className="mt-2 list-inside list-disc text-sm text-slate-400">
            <li>Reduza o score mínimo (ex.: 75 em vez de 80)</li>
            <li>Use perfil <strong>Amplo</strong> ou <strong>Conservador</strong></li>
            <li>Comece com 15–16 dezenas antes de 17–20</li>
            <li>Afrouxe faixas de repetidas ou desative critérios não essenciais</li>
          </ul>
        </div>

        <p>
          Resultados: copiar, CSV, Excel ou <strong>Imprimir cartelas / PDF cartelas</strong> (grade 5×5 para
          transcrever no volante oficial). Os jogos ficam salvos na sessão para Simulador e Exportação. Para fechamento
          combinatório (menos bilhetes, cobertura condicional), use <Link href="/fechamento">Fechamento</Link>.
        </p>
      </Section>

      <Section id="fechamento" title="Fechamento combinatório" icon={Layers}>
        <Badge variant="premium">Premium</Badge>
        <p className="mt-2">
          Complementa o gerador estatístico: monta bilhetes de <strong>15 dezenas</strong> a partir de um universo
          (16–25 números), buscando <strong>cobertura combinatória</strong> com menos cartões que o desdobramento
          completo.
        </p>
        <div className="my-4 rounded-xl border border-amber-700/30 bg-amber-950/20 p-4 text-sm text-amber-100/90">
          <p className="font-medium text-amber-200">Sem garantia de prêmio futuro</p>
          <p className="mt-1 text-xs">
            A &quot;garantia&quot; aqui é matemática e <strong>condicional</strong>: só vale se o sorteio cumprir a
            condição (ex.: as 15 dezenas sorteadas estiverem no seu universo). Não prevê resultados nem elimina o
            acaso.
          </p>
        </div>
        <h3 className="font-semibold text-slate-200">Parâmetros</h3>
        <ul className="list-inside list-disc space-y-1 text-slate-400">
          <li>
            <strong>Universo (cercar)</strong> — dezenas candidatas; pode carregar base Pareto 18D/19D/20D
          </li>
          <li>
            <strong>Dezenas fixas</strong> — entram em todos os bilhetes
          </li>
          <li>
            <strong>Garantia</strong> — pontos mínimos (11–14) em ao menos um bilhete, se a condição for satisfeita
          </li>
          <li>
            <strong>Condição</strong> — quantas dezenas sorteadas devem estar no universo (tipicamente 15)
          </li>
          <li>
            <strong>Cobertura %</strong> — 100% exige cobrir todos os cenários; abaixo de 100% reduz bilhetes com
            margem de risco
          </li>
        </ul>
        <p className="mt-3">
          Após gerar, valide no <Link href="/simulador">Simulador retroativo</Link> e exporte via{' '}
          <Link href="/exportacao">Exportação</Link>. O sistema não preenche volantes no site da Caixa — você registra
          as apostas manualmente.
        </p>
      </Section>

      <Section id="simulador" title="Simulador retroativo" icon={FlaskConical}>
        <Badge variant="premium">Premium</Badge>
        <p className="mt-2">
          Testa jogos de <strong>15 dezenas</strong> contra concursos passados. Cole uma linha por jogo ou use{' '}
          <strong>Colar últimos jogos gerados</strong> após gerar no Gerador.
        </p>
        <ul className="list-inside list-disc space-y-1 text-slate-400">
          <li>Distribuição de acertos (11 a 15 pontos)</li>
          <li>Ranking dos melhores jogos (top 30)</li>
          <li>Critérios médios nos jogos com 13+ acertos</li>
          <li>Filtro opcional por intervalo de concursos</li>
        </ul>
      </Section>

      <Section id="exportacao" title="Exportação" icon={Download}>
        <Badge variant="premium">Premium</Badge>
        <p className="mt-2">
          Exporta jogos em <strong>CSV</strong>, <strong>Excel</strong> ou <strong>PDF</strong> com colunas D1–D20,
          métricas (soma, pares, moldura), score, valor da aposta e status. Use{' '}
          <strong>Colar jogos do gerador</strong> para trazer a última geração.
        </p>
      </Section>

      <Section id="conta" title="Conta e assinatura" icon={User}>
        <p>
          Em <Link href="/conta">Minha Conta</Link> você vê plano atual, status da assinatura e botão para
          assinar. Login em produção: <strong>Google</strong>. Local: login de desenvolvimento sem senha.
        </p>
        <p>
          Assinatura Premium: <Link href="/precos">/precos</Link> — valores conforme plano cadastrado no admin.
          Status{' '}
          <code className="text-brand-300">active</code> ou <code className="text-brand-300">trial</code> libera
          recursos Premium.
        </p>
      </Section>

      <Section id="glossario" title="Glossário" icon={Layers}>
        <dl className="grid gap-3 sm:grid-cols-2">
          {[
            ['Score', 'Nota 0–100 de aderência ao padrão histórico configurado. Não é probabilidade de prêmio.'],
            ['Repetidas', 'Quantas dezenas do jogo também saíram no concurso imediatamente anterior.'],
            ['Moldura / Centro', 'Dezenas nas bordas vs. miolo da cartela 5×5 (01–25).'],
            ['Base Pareto', 'Subconjunto das dezenas mais frequentes (18, 19 ou 20 números).'],
            ['Sequência (dezena)', 'Quantos concursos seguidos a dezena foi sorteada ou ficou ausente.'],
            ['Atraso', 'Concursos desde a última vez que a dezena saiu.'],
            ['Critério forte', 'Faixa estatística que se repetiu em ≥ 80% do histórico analisado.'],
            ['Estrutura horizontal', 'Maior bloco contíguo de dezenas sorteadas ou ausentes na cartela.'],
          ].map(([termo, def]) => (
            <div key={termo} className="rounded-lg bg-slate-800/30 p-3">
              <dt className="font-semibold text-brand-300">{termo}</dt>
              <dd className="mt-1 text-xs text-slate-400">{def}</dd>
            </div>
          ))}
        </dl>
      </Section>

      <Section id="faq" title="Perguntas frequentes" icon={Activity}>
        <div className="space-y-4">
          {[
            {
              q: 'Preciso pagar para ver estatísticas?',
              a: 'Não. Resultados, critérios, bases, sequências e estrutura horizontal são gratuitos. Gerador, simulador e exportação exigem Premium.',
            },
            {
              q: 'O app garante que vou ganhar?',
              a: 'Não. O Fácil Analytics mostra padrões passados e filtra jogos por aderência estatística. Sorteios são aleatórios por natureza.',
            },
            {
              q: 'Por que pedi 10 apostas e recebi menos?',
              a: 'Filtros de score, diversidade (dezenas iguais) ou poucas combinações válidas na base — comum em 19–20 dezenas na base 20D.',
            },
            {
              q: 'Como uso os números na lotérica?',
              a: 'Transcreva as dezenas no volante ou terminal. Informe quantas dezenas deseja marcar (15–20); o valor segue a tabela oficial da Caixa.',
            },
            {
              q: 'Onde ficam meus parâmetros salvos?',
              a: 'No navegador (localStorage), ao clicar em Salvar parâmetros no Gerador. Perfis aplicados também guardam base e max. iguais.',
            },
          ].map(({ q, a }) => (
            <details key={q} className="group rounded-xl border border-slate-700/50 bg-slate-900/30">
              <summary className="cursor-pointer px-4 py-3 font-medium text-slate-200 marker:content-none group-open:text-brand-300">
                {q}
              </summary>
              <p className="border-t border-slate-800 px-4 py-3 text-sm text-slate-400">{a}</p>
            </details>
          ))}
        </div>
      </Section>

      <Section id="legal" title="Informações legais" icon={Rows3}>
        <p>
          Consulte <Link href="/privacidade">Privacidade e LGPD</Link> para tratamento de dados. O Fácil Analytics não
          é site oficial da Caixa Econômica Federal. Marcas Lotofácil pertencem aos respectivos titulares.
        </p>
        <p className="text-xs text-slate-500">
          Manual do usuário — Fácil Analytics. Versão do sistema: documentação alinhada às funcionalidades atuais da
          plataforma.
        </p>
      </Section>
    </div>
  );
}
