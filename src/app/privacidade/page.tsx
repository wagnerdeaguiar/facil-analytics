import Link from 'next/link';
import { getSiteResponsavel, formatarCpf, formatarTelefoneBr } from '@/lib/site-config';

export default async function PrivacidadePage() {
  const responsavel = await getSiteResponsavel();

  return (
    <div className="mx-auto max-w-2xl space-y-6 px-4 py-12 text-slate-300">
      <h1 className="text-2xl font-bold text-white">Privacidade e LGPD</h1>
      <section className="space-y-3 text-sm leading-relaxed">
        <h2 className="font-semibold text-white">Responsável pela plataforma</h2>
        <p>
          {responsavel.nome} · CPF {formatarCpf(responsavel.cpf)} ·{' '}
          {formatarTelefoneBr(responsavel.telefone)} ·{' '}
          <a href={`mailto:${responsavel.email}`} className="text-brand-400 hover:underline">
            {responsavel.email}
          </a>
        </p>
        <h2 className="font-semibold text-white">Dados coletados</h2>
        <p>
          Nome, e-mail e foto do perfil via login Google; CPF e telefone para cobrança de planos pagos;
          dados de uso do app (jogos gerados, simulações, exportações); dados de assinatura processados
          pelo gateway Asaas (PIX, boleto ou cartão).
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
          Em Minha Conta você pode solicitar exclusão. O administrador pode ser contatado em{' '}
          <a href={`mailto:${responsavel.email}`} className="text-brand-400 hover:underline">
            {responsavel.email}
          </a>
          .
        </p>
      </section>
      <Link href="/" className="text-brand-400 hover:underline">
        Voltar
      </Link>
    </div>
  );
}
