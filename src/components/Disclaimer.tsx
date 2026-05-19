import { AlertTriangle } from 'lucide-react';

export function Disclaimer({ compact }: { compact?: boolean }) {
  return (
    <div
      className={`flex gap-3 rounded-lg border border-amber-700/40 bg-amber-950/30 ${
        compact ? 'p-2 text-xs' : 'p-3 text-sm'
      }`}
    >
      <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-400" />
      <p className="text-amber-100/90">
        Este app utiliza estatística histórica para montar jogos com maior aderência a padrões
        passados. Isso não garante resultados futuros, pois a Lotofácil é um jogo de azar.
      </p>
    </div>
  );
}


