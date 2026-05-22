# Checklist de publicação — Fácil Analytics

Use este guia **na ordem**. O atalho `PUBLICAR-FACIL-ANALYTICS.bat` automatiza parte dos passos.

Repositório: https://github.com/wagnerdeaguiar/facil-analytics

---

## Fase 1 — Antes de publicar (local)

- [ ] `docker compose up -d` — Postgres na porta **5433**
- [ ] `npm run build` — deve concluir sem erro
- [ ] Testar login e gerador em http://localhost:3010
- [ ] Commit e push para o GitHub (`git push origin main`)

---

## Fase 2 — Banco na nuvem (Neon)

1. Acesse https://neon.tech e crie um projeto (região próxima ao Brasil, ex. `aws-us-east-1` ou `sa-east-1` se disponível).
2. Copie a **Connection string** (modo `Pooled` recomendado para Vercel).
3. Anote o formato:
   ```
   postgresql://usuario:senha@host/neondb?sslmode=require
   ```

- [ ] Projeto Neon criado
- [ ] Connection string copiada

---

## Fase 3 — Google OAuth (obrigatório em produção)

1. https://console.cloud.google.com/apis/credentials
2. Criar **ID do cliente OAuth** → Aplicativo da Web
3. **URIs de redirecionamento autorizados** (substitua `SEU-DOMINIO`):
   ```
   https://SEU-DOMINIO.vercel.app/api/auth/callback/google
   ```
4. Copiar **Client ID** e **Client Secret**

- [ ] OAuth criado
- [ ] Redirect URI com URL final do Vercel

---

## Fase 4 — Vercel (hospedagem)

1. https://vercel.com/new/import → repositório `facil-analytics`
2. Framework: **Next.js** (detectado automaticamente)
3. Em **Settings → Environment Variables**, adicione:

| Variável | Valor | Ambiente |
|----------|--------|----------|
| `DATABASE_URL` | Connection string do Neon | Production |
| `NEXTAUTH_URL` | `https://SEU-APP.vercel.app` (URL exata, com https) | Production |
| `NEXTAUTH_SECRET` | string aleatória longa (`openssl rand -base64 32`) | Production |
| `GOOGLE_CLIENT_ID` | do Google Console | Production |
| `GOOGLE_CLIENT_SECRET` | do Google Console | Production |
| `ADMIN_EMAIL` | seu e-mail admin | Production |
| `AUTH_DEV_MODE` | **`false`** | Production |
| `STRIPE_SECRET_KEY` | (opcional, se cobrar Premium) | Production |
| `STRIPE_WEBHOOK_SECRET` | (opcional) | Production |
| `STRIPE_PRICE_ID` | (opcional) | Production |

4. Deploy → aguarde build verde

- [ ] Deploy concluído
- [ ] `AUTH_DEV_MODE=false` em produção
- [ ] `NEXTAUTH_URL` = URL real do site

---

## Fase 5 — Banco em produção

No seu PC (com `DATABASE_URL` do Neon no terminal ou `.env` temporário):

```bash
npx prisma db push
npm run db:seed
npm run db:seed-perfis
npm run db:import-xlsx
```

Ou pelo site: login → **Configurações** → importar planilha.

- [ ] Tabelas criadas no Neon
- [ ] Histórico importado (milhares de concursos)
- [ ] Bases Pareto recalculadas

---

## Fase 6 — Stripe (opcional — cobrança Premium)

1. Criar produto/preço mensal no Stripe
2. Webhook: `https://SEU-APP.vercel.app/api/stripe/webhook`
3. Eventos: `checkout.session.completed`, `customer.subscription.updated`, etc.
4. Colar `STRIPE_WEBHOOK_SECRET` na Vercel

- [ ] Stripe configurado (se for monetizar)

---

## Fase 7 — Validação pós-deploy

- [ ] Site abre sem erro
- [ ] Login com Google funciona
- [ ] Dashboard carrega concursos
- [ ] Gerador Premium gera jogos
- [ ] Seq. e Atrasos mostra últimos 10 concursos
- [ ] `/api/health` retorna `ok` (sem expor segredos)

---

## Segurança — conferir após publicar

| Item | Status esperado |
|------|-----------------|
| `.env` local não está no Git | ✓ (`.gitignore`) |
| `AUTH_DEV_MODE` desligado em produção | `false` |
| Login dev só em `NODE_ENV !== production` | automático no código |
| APIs de escrita exigem login | sync, import, manual, bases PUT |
| Gerador/export/simulador exigem Premium | middleware + API |
| Webhook Stripe valida assinatura | implementado |

---

## Problemas comuns

| Sintoma | Solução |
|---------|---------|
| Login falha | Conferir `NEXTAUTH_URL` e redirect URI do Google |
| Banco vazio | `db push` + importar xlsx no Neon |
| Gerador 403 | Assinar Premium ou ativar trial/Stripe |
| Build falha na Vercel | Rodar `npm run build` local e corrigir erros |

---

## Links rápidos

- Import Vercel: https://vercel.com/new/import?s=https://github.com/wagnerdeaguiar/facil-analytics
- Neon: https://neon.tech
- Google OAuth: https://console.cloud.google.com/apis/credentials
