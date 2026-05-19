import Link from 'next/link';

export default function PrivacidadePage() {
  return (
    <div className="mx-auto max-w-2xl space-y-6 px-4 py-12 text-slate-300">
      <h1 className="text-2xl font-bold text-white">Privacidade e LGPD</h1>
      <section className="space-y-3 text-sm leading-relaxed">
        <h2 className="font-semibold text-white">Dados coletados</h2>
        <p>
          Nome, e-mail e foto do perfil via login Google; dados de uso do app (jogos gerados,
          simulações, exportações); dados de assinatura processados pelo gateway de pagamento (Stripe).
        </p>
        <h2 className="font-semibold text-white">Finalidade</h2>
        <p>
          Autenticação, prestação do serviço estatístico, cobrança do Plano Premium e melhoria da
          plataforma.
        </p>
        <h2 className="font-semibold text-white">Pagamentos</h2>
        <p>
          Dados de cartão não são armazenados neste app — apenas no gateway externo certificado.
        </p>
        <h2 className="font-semibold text-white">Exclusão de conta</h2>
        <p>
          Em Minha Conta você pode solicitar exclusão. O administrador pode ser contatado pelo e-mail
          configurado em ADMIN_EMAIL.
        </p>
      </section>
      <Link href="/" className="text-brand-400 hover:underline">
        Voltar
      </Link>
    </div>
  );
}
