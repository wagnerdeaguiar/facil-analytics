import { redirect } from 'next/navigation';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { AdminPainel } from '@/components/AdminPainel';

export default async function AdminPage() {
  const session = await getServerSession(authOptions);
  if (session?.user?.role !== 'admin') redirect('/dashboard');

  const [
    totalUsers,
    premiumActive,
    totalJogos,
    totalSimulacoes,
  ] = await Promise.all([
    prisma.user.count(),
    prisma.user.count({ where: { subscriptionStatus: 'active' } }),
    prisma.jogoGerado.count(),
    prisma.simulacao.count(),
  ]);

  const receitaEstimada = premiumActive * 4.99;

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-white">Painel Administrativo</h1>
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
        </div>
      </section>
      <AdminPainel />
      <p className="text-xs text-slate-500">Simulações totais: {totalSimulacoes}</p>
    </div>
  );
}
