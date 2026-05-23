import { redirect } from 'next/navigation';

/** Importação e manutenção de dados foram movidas para Resultados. */
export default function ConfiguracoesPage() {
  redirect('/resultados#importacao');
}
