import { isDevAuthEnabled } from '@/lib/auth-config';
import { EntrarClient } from './EntrarClient';

export const dynamic = 'force-dynamic';

export default function EntrarPage() {
  return <EntrarClient devAuth={isDevAuthEnabled()} />;
}
