/** Reexporta limites de plano — preferir `@/lib/billing/plan-service` em código server-side. */
export {
  LIMITES_FREE,
  LIMITES_PREMIUM,
  type PlanLimits,
} from '@/lib/billing/types';

export { resolvePlanLimitsForUser } from '@/lib/billing/plan-service';

import { LIMITES_FREE } from '@/lib/billing/types';

export const FREE_MAX_JOGOS = LIMITES_FREE.maxJogos;
export const FREE_MAX_DEZENAS = LIMITES_FREE.maxDezenas;
