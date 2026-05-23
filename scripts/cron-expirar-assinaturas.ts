/**
 * Executa localmente o job de expiração de assinaturas.
 * Uso: npm run cron:expirar-assinaturas
 */
import { expirarAssinaturasVencidas } from '../src/lib/billing/expirar-assinaturas';

async function main() {
  const result = await expirarAssinaturasVencidas();
  console.log(JSON.stringify(result, null, 2));
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => process.exit(0));
