# XeroFlow

Fundação do SaaS de atendimento e pedidos para restaurantes.

## Sprint atual

**Sprint 1 — S1.1 a S1.4**

- Next.js + TypeScript
- PostgreSQL via Docker Compose
- Prisma ORM 7.10
- modelo multi-tenant
- Restaurante Xero Verde como tenant piloto
- seed inicial do cardápio real
- endpoint `/api/health`
- dashboard visual provisório em `/admin`

## Requisitos

- Node.js 20.12+ (recomendado Node 24 LTS)
- npm
- Docker + Docker Compose

## Subir localmente

```bash
cp .env.example .env
docker compose up -d
npm install
npm run db:generate
npm run db:migrate -- --name init
npm run db:seed
npm run dev
```

Abra:

- http://localhost:3000/admin
- http://localhost:3000/api/health

## Ver banco

```bash
npm run db:studio
```

## Observação sobre senha

O usuário seed `owner@xeroflow.local` é criado como `INVITED` e sem senha. Isso é intencional: autenticação e credenciais serão implementadas na S1.5, evitando inserir mecanismo provisório/inseguro nesta etapa.
