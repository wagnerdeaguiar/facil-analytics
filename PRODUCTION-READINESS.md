# Sorte Fácil — Prontidão para produção

Auditoria executiva (CEO) + correções aplicadas no código. Use este documento como checklist final antes de receber pagamentos reais.

---

## Status geral

| Área | Status | Notas |
|------|--------|-------|
| Auth / sessão | ✅ Pronto | `requireSession` revalida bloqueio e status no DB |
| Billing Asaas | ⚠️ Config | Código pronto; **chave API válida na Vercel** é obrigatória |
| Webhook | ✅ Pronto | Idempotência, token obrigatório se Asaas ativo |
| LGPD | ✅ MVP | Exportação JSON + exclusão de conta em `/conta` |
| Concursos / analytics | ✅ Pronto | 3695+ concursos; sync só admin |
| Segurança APIs | ✅ Melhorado | Bases Pareto só admin; planos sem seed público |

---

## Correções implementadas nesta auditoria

### Billing (P0)
- **Cancelamento com carência:** webhook `SUBSCRIPTION_DELETED` não rebaixa se `dataCancelamento` + `currentPeriodEnd` ainda válidos
- **Sync após estorno:** só reativa premium se status `pending` ou `past_due` (não ressuscita `free` após refund)
- **Webhook idempotente:** grava `BillingEvent` antes de processar (evita dupla ativação)
- **Inadimplência:** `gracePeriodUntil` +3 dias em `PAYMENT_OVERDUE`
- **lockUserToFree:** limpa `planoId`, `gatewaySubscriptionId`, carência
- **Checkout duplicado:** bloqueia nova assinatura se já existe cobrança `pending`
- **Webhook auth:** token obrigatório sempre que `ASAAS_API_KEY` existe

### Segurança / LGPD (P0)
- **PUT /api/bases:** apenas admin (antes: qualquer premium alterava bases globais)
- **GET /api/planos:** somente leitura; seed só via admin/`db:seed-planos`
- **GET /api/conta/export:** portabilidade LGPD
- **DELETE /api/conta:** exclusão com confirmação `EXCLUIR`
- **GET /api/health:** resposta mínima pública; detalhes em `?detailed=1`

### UX
- **Preços:** polling trata erro HTTP do sync
- **Conta:** botões exportar dados e excluir conta

---

## Checklist Vercel (obrigatório)

| Variável | Valor |
|----------|--------|
| `DATABASE_URL` | Neon pooled + SSL |
| `NEXTAUTH_URL` | `https://sortefacil.pro` (e redirect www → apex) |
| `NEXTAUTH_SECRET` | string aleatória 32+ chars |
| `GOOGLE_CLIENT_ID` / `SECRET` | OAuth com URLs apex + www |
| `ADMIN_EMAIL` | e-mail corporativo único |
| `AUTH_DEV_MODE` | `false` |
| `AUTH_DEV_PREMIUM` | `false` |
| `ASAAS_API_KEY` | `$aact_prod_...` (produção) |
| `ASAAS_WEBHOOK_TOKEN` | igual ao painel Asaas |
| `ASAAS_ENV` | `production` |
| `CRON_SECRET` | aleatório |

**Validar:** `https://sortefacil.pro/api/health?detailed=1` → `asaasApiOk: true`

---

## Checklist Asaas

1. Conta **aprovada** para cobrança
2. Chave API **produção** (`$aact_prod_`)
3. Webhook: `https://sortefacil.pro/api/asaas/webhook`
4. Eventos: `PAYMENT_CONFIRMED`, `PAYMENT_RECEIVED`, `PAYMENT_OVERDUE`, `PAYMENT_REFUNDED`, `SUBSCRIPTION_DELETED`
5. Teste PIX R$ 4,99 em `/precos` com CPF válido em `/conta`

---

## Checklist banco (uma vez)

```bash
npx prisma db push
npm run db:seed-planos
npm run db:seed-perfis
npm run db:import-xlsx
```

Não rodar `db:seed` (demo) em produção.

---

## Testes manuais antes do go-live

- [ ] Login Google
- [ ] Gerador free (limites) e premium (após pagamento)
- [ ] Checkout PIX → premium ativo
- [ ] Webhook ou “Já paguei” ativa premium
- [ ] Cancelar plano → mantém premium até fim do período
- [ ] Admin `/admin` só para `ADMIN_EMAIL`
- [ ] Exportar dados em `/conta`
- [ ] Health público sem vazar secrets

---

## Pendências P2 (pós-lançamento)

- Rate limit em `/api/auth/register` e billing
- Recuperação de senha (ou desabilitar cadastro e-mail em prod)
- `error.tsx` global
- Transações Prisma em ativação premium
- Monitoramento (Sentry) para webhooks `user_not_found`

---

## Contato operacional

- Domínio: https://sortefacil.pro
- Repo: `wagnerdeaguiar/facil-analytics`
- Doc deploy: `PRODUCAO-SORTEFACIL.md`
