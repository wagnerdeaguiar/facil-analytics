# Deploy em produção — sortefacil.pro

Guia rápido para publicar o **Sorte Fácil** em `https://sortefacil.pro`.

Contato oficial: **contato@sortefacil.pro**

---

## 1. Pré-requisitos

- [ ] Código no GitHub (push da branch `main`)
- [ ] Domínio **sortefacil.pro** apontando para a Vercel (DNS)
- [ ] Conta [Neon](https://neon.tech) (PostgreSQL)
- [ ] Conta [Google Cloud](https://console.cloud.google.com) (OAuth)
- [ ] Conta [Asaas](https://www.asaas.com) (cobrança — produção)
- [ ] Conta [Vercel](https://vercel.com)

---

## 2. Variáveis na Vercel (Production)

| Variável | Valor |
|----------|--------|
| `DATABASE_URL` | Connection string Neon (Pooled + `sslmode=require`) |
| `NEXTAUTH_URL` | `https://sortefacil.pro` |
| `NEXTAUTH_SECRET` | `openssl rand -base64 32` |
| `GOOGLE_CLIENT_ID` | Google Console |
| `GOOGLE_CLIENT_SECRET` | Google Console |
| `ADMIN_EMAIL` | `contato@sortefacil.pro` |
| `AUTH_DEV_MODE` | `false` |
| `AUTH_DEV_PREMIUM` | `false` |
| `ASAAS_API_KEY` | Chave API Asaas **produção** (começa com `$aact_prod_`) |
| `ASAAS_WEBHOOK_TOKEN` | Token definido no webhook Asaas |
| `ASAAS_ENV` | `production` |

**Asaas — erro “chave inválida”:** gere uma chave nova em [Asaas → Integrações → API](https://www.asaas.com/customerConfigIntegrations), cole em **Vercel → Settings → Environment Variables → Production** (sem aspas nem espaços no início/fim), confira `ASAAS_ENV=production`, salve e faça **Redeploy**. `/api/health` deve retornar `asaasApiOk: true`.
| `CRON_SECRET` | String aleatória (Vercel Cron envia `Authorization: Bearer …`) |

Template local: `.env.vercel.template`

---

## 3. Google OAuth

Em [Google Cloud → Credentials](https://console.cloud.google.com/apis/credentials):

**Origens JavaScript autorizadas:**
```
https://sortefacil.pro
https://www.sortefacil.pro
```

**URIs de redirecionamento:**
```
https://sortefacil.pro/api/auth/callback/google
https://www.sortefacil.pro/api/auth/callback/google
```

Use **apenas um** domínio canônico (com ou sem `www`) e redirecione o outro na Vercel.

---

## 4. Domínio na Vercel

1. Project → **Settings → Domains**
2. Adicionar `sortefacil.pro` e `www.sortefacil.pro` (se usar)
3. Configurar DNS no registrador conforme instruções da Vercel
4. Aguardar certificado SSL (automático)

---

## 5. Asaas (webhook)

URL do webhook:
```
https://sortefacil.pro/api/asaas/webhook
```

Eventos recomendados: `PAYMENT_CONFIRMED`, `PAYMENT_RECEIVED`, `PAYMENT_OVERDUE`, `SUBSCRIPTION_DELETED`.

O token do webhook = variável `ASAAS_WEBHOOK_TOKEN` na Vercel.

---

## 6. Banco de dados (Neon)

No PC, com `DATABASE_URL` do Neon:

```bash
npx prisma db push
npm run db:seed-planos
npm run db:seed-perfis
npm run db:import-xlsx
```

Não rode `db:seed` (demo) em produção — use a planilha real de concursos.

---

## 7. Admin e textos

1. Login com Google usando **contato@sortefacil.pro** (definido em `ADMIN_EMAIL`)
2. Acesse `/admin`
3. Preencha **Textos institucionais**, **Planos**, **Publicidade** e **Responsável** (privacidade/LGPD)

E-mail padrão do responsável: `contato@sortefacil.pro` (editável no admin).

---

## 8. Validação pós-deploy

| Teste | URL |
|-------|-----|
| Home | https://sortefacil.pro |
| Health | https://sortefacil.pro/api/health |
| Login Google | https://sortefacil.pro/entrar |
| Planos | https://sortefacil.pro/precos |
| Admin | https://sortefacil.pro/admin |
| Sitemap | https://sortefacil.pro/sitemap.xml |
| Robots | https://sortefacil.pro/robots.txt |

- [ ] Login Google funciona
- [ ] Dashboard carrega concursos
- [ ] Checkout Asaas (sandbox ou prod conforme `ASAAS_ENV`)
- [ ] Cron de assinaturas (Vercel → Cron Jobs → `/api/cron/expirar-assinaturas`)

---

## 9. Segurança

| Item | Produção |
|------|----------|
| `AUTH_DEV_MODE` | `false` |
| Login dev (credenciais) | Desligado automaticamente |
| `.env` / `.env.vercel` | Nunca commitar |
| Webhook Asaas | Valida `asaas-access-token` |

---

## Script guiado (Windows)

```powershell
.\scripts\publicar.ps1
```

Usa por padrão `https://sortefacil.pro` e `contato@sortefacil.pro`.

Checklist detalhado: `CHECKLIST-PUBLICACAO.md`
