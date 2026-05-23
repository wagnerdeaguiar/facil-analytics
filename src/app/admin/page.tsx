import { redirect } from 'next/navigation';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { AdminPainel } from '@/components/AdminPainel';
import { AdminConfiguracoes } from '@/components/AdminConfiguracoes';
import { AdminPlanos } from '@/components/AdminPlanos';
import { AdminFaturamento } from '@/components/AdminFaturamento';
import { AdminPublicidade } from '@/components/AdminPublicidade';
import { AdminTextosInstitucionais } from '@/components/AdminTextosInstitucionais';
import { getSiteResponsavel, formatarCpf, formatarTelefoneBr } from '@/lib/site-config';
import { getFaturamentoResumo } from '@/lib/billing/faturamento-service';

export default async function AdminPage() {
  const session = await getServerSession(authOptions);
  if (session?.user?.role !== 'admin') redirect('/dashboard');

  const [
    totalUsers,
    premiumActive,
    totalJogos,
    totalSimulacoes,
    faturamento,
  ] = await Promise.all([
    prisma.user.count(),
    prisma.user.count({ where: { subscriptionStatus: 'active' } }),
    prisma.jogoGerado.count(),
    prisma.simulacao.count(),
    getFaturamentoResumo(),
  ]);

  const receitaEstimada = faturamento.mrrEstimado;
  const responsavel = await getSiteResponsavel();

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-bold text-white">Painel Administrativo</h1>
        <p className="mt-1 text-xs text-slate-500">
          Responsável: {responsavel.nome} · CPF {formatarCpf(responsavel.cpf)} ·{' '}
          {formatarTelefoneBr(responsavel.telefone)} · {responsavel.email}
        </p>
      </header>
      <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="card">
          <p className="text-xs text-slate-400">Usuários</p>
          <p className="text-2xl font-bold">{totalUsers}</p>
        </div>
        <div className="card">
          <p className="text-xs text-slate-400">Premium ativos</p>
          <p className="text-2xl font-bold text-emerald-400">{premiumActive}</p>
        </div>
        <div className="card">
          <p className="text-xs text-slate-400">Jogos gerados</p>
          <p className="text-2xl font-bold">{totalJogos}</p>
        </div>
        <div className="card">
          <p className="text-xs text-slate-400">Receita mensal est.</p>
          <p className="text-2xl font-bold">R$ {receitaEstimada.toFixed(2)}</p>
          <p className="text-[11px] text-slate-500">
            Recebido: R$ {faturamento.totalRecebido.toFixed(2)}
          </p>
        </div>
      </section>
      <AdminFaturamento />
      <AdminTextosInstitucionais />
      <AdminPublicidade />
      <AdminPlanos />
      <AdminConfiguracoes />
      <AdminPainel />
      <p className="text-xs text-slate-500">Simulações totais: {totalSimulacoes}</p>
    </div>
  );
}
