import type { Metadata } from 'next';
import { SITE_NAME } from '@/lib/site-identity';

export const metadata: Metadata = {
  title: `Manual do Usuário | ${SITE_NAME}`,
  description: `Guia completo do ${SITE_NAME}: análise Lotofácil, gerador de apostas, perfis, simulador e exportação.`,
};
export default function ManualLayout({ children }: { children: React.ReactNode }) {
  return children;
}
