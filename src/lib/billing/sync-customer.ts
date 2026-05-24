import { prisma } from '@/lib/db';
import { atualizarClienteAsaas, isAsaasConfigured } from './asaas-client';

/** Sincroniza CPF/telefone do usuário com o cliente Asaas (se existir). */
export async function syncAsaasCustomerForUser(userId: string) {
  if (!isAsaasConfigured()) return;

  const user = await prisma.user.findUnique({ where: { id: userId } });
  const sub = await prisma.subscription.findUnique({ where: { userId } });
  if (!user || !sub?.gatewayCustomerId || sub.gateway !== 'asaas') return;

  const cpf = user.cpf?.replace(/\D/g, '');
  if (!cpf || cpf.length !== 11) return;

  await atualizarClienteAsaas(sub.gatewayCustomerId, {
    name: user.name ?? user.email.split('@')[0],
    email: user.email,
    cpfCnpj: cpf,
    mobilePhone: user.telefone ?? undefined,
  });
}
