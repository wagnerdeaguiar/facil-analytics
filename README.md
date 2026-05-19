# Lotofácil Analytics

Aplicativo web para **análise estatística**, **geração filtrada**, **bases Pareto** e **simulação retroativa** de jogos da Lotofácil.

> Este projeto usa padrões históricos e score de aderência. **Não há garantia de acerto** — a Lotofácil é um jogo de azar.

## Funcionalidades

- Importação de histórico (CSV / JSON / API Caixa)
- Cálculo automático de métricas por concurso
- Critérios Fortes: faixas com recorrência ≥ 80% no histórico importado
- Bases 18D, 19D e 20D (Pareto) com cobertura histórica
- Gerador de jogos com filtros, score 0–100 e diversidade entre jogos
- Perfil **Premium Estatístico**
- Simulador retroativo (11–15 acertos)
- Exportação CSV, Excel e PDF

## Stack

- **Next.js 14** + React + Tailwind
- **PostgreSQL** + Prisma
- Motor estatístico em **TypeScript**

## Início rápido

### 1. Banco de dados

```bash
docker compose up -d
cp .env.example .env
```

### 2. Dependências e schema

```bash
npm install
npx prisma db push
npm run db:seed
```

### 3. Desenvolvimento

```bash
npm run dev
```

Abra [http://localhost:3010](http://localhost:3010).

> **Importante:** a porta **3000** pode estar em uso por outro projeto seu (ex.: Sistema de Previdência). Este app usa a porta **3010** por padrão.

## Importar resultados reais

### Lotofácil.xlsx (Downloads)

Planilha com **3.687 concursos** (aba `LOTOFÁCIL`): Concurso, Data Sorteio, Bola1–Bola15.

```bash
# Histórico completo
npm run db:import-xlsx

# Apenas recorte MazuSoft
npm run db:import-xlsx -- --de 3442 --ate 3542
```

Na interface: **Configurações → Importar Lotofácil.xlsx**

### TXT / CSV

Em **Configurações**, cole um CSV:

```text
3500;18/05/2026;01 03 04 05 07 08 09 10 12 14 16 18 20 22 24
3501;19/05/2026;02 03 05 06 08 09 11 12 13 15 17 19 21 23 25
```

Ou use **Atualizar último concurso** (API pública da Caixa, quando disponível).

## Estrutura do banco

- `concursos` — resultados e métricas derivadas
- `dezenas_estatisticas` — frequência, atraso, temperatura
- `criterios_estatisticos` — faixas e % de ocorrência
- `jogos_gerados` — jogos com score
- `simulacoes` — resultados de simulação
- `bases_pareto` — bases 18D/19D/20D

## Honestidade estatística

O app exibe percentuais **calculados no histórico importado**, critérios fortes auditáveis e detalhamento do score por critério. Termos evitados: “garantido”, “certeiro”, “previsão exata”.

## Scripts

| Comando | Descrição |
|---------|-----------|
| `npm run dev` | Servidor de desenvolvimento |
| `npm run build` | Build de produção |
| `npm run db:push` | Aplicar schema |
| `npm run db:seed` | Dados demo (250 concursos) |
| `npm run db:studio` | Prisma Studio |

## Licença

Uso educacional / pessoal. Não afiliado à Caixa Econômica Federal.
