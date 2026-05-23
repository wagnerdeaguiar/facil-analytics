'use client';

import { useEffect, useState } from 'react';
import {
  TABELA_APOSTA_PADRAO,
  type TabelaAposta,
} from '@/lib/lotofacil/aposta-config';

export function useTabelaAposta(): TabelaAposta {
  const [tabela, setTabela] = useState<TabelaAposta>(TABELA_APOSTA_PADRAO);

  useEffect(() => {
    fetch('/api/config/apostas')
      .then((r) => r.json())
      .then((d) => {
        if (d.tabela) setTabela(d.tabela);
      })
      .catch(() => {});
  }, []);

  return tabela;
}
