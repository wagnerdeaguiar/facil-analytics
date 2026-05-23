/** Formata preço a partir do valor cadastrado no plano (admin). */
export function formatarPrecoPlano(valor: number, periodicidade: string) {
  if (valor <= 0) return 'R$ 0';
  const valorFmt = valor.toFixed(2).replace('.', ',');
  const sufixo = periodicidade === 'yearly' ? '/ano' : periodicidade === 'monthly' ? '/mês' : '';
  return sufixo ? `R$ ${valorFmt}${sufixo}` : `R$ ${valorFmt}`;
}

export function formatarValorPlano(valor: number) {
  if (valor <= 0) return 'R$ 0';
  return `R$ ${valor.toFixed(2).replace('.', ',')}`;
}

export function sufixoPeriodicidadePlano(periodicidade: string) {
  if (periodicidade === 'yearly') return '/ano';
  if (periodicidade === 'monthly') return '/mês';
  return '';
}
