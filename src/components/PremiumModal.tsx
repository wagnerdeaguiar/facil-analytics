'use client';

import Link from 'next/link';
import { X } from 'lucide-react';

interface PremiumModalProps {
  open: boolean;
  onClose: () => void;
  feature?: string;
}

export function PremiumModal({ open, onClose, feature }: PremiumModalProps) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
      <div className="card max-w-md w-full space-y-4">
        <div className="flex items-start justify-between">
          <h2 className="text-lg font-bold text-white">Recurso Premium</h2>
          <button type="button" onClick={onClose} className="text-slate-400 hover:text-white">
            <X className="h-5 w-5" />
          </button>
        </div>
        <p className="text-sm text-slate-300">
          {feature
            ? `Para usar ${feature}, assine o Plano Premium por apenas R$ 4,99/mês.`
            : 'Para usar o Gerador de Jogos, Simulador Retroativo, Exportações e Configurações avançadas, assine o Plano Premium por apenas R$ 4,99.'}
        </p>
        <p className="text-xs text-slate-500">
          Este app utiliza estatística histórica — não garante resultados futuros.
        </p>
        <div className="flex gap-2">
          <Link href="/precos" className="btn-primary flex-1 text-center">
            Assinar agora
          </Link>
          <button type="button" onClick={onClose} className="btn-secondary flex-1">
            Voltar
          </button>
        </div>
      </div>
    </div>
  );
}
