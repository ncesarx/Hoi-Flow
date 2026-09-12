# XeroFlow — Sprint 1 / S1.1 a S1.4

## Escopo desta entrega

- S1.1: bootstrap do projeto Next.js/TypeScript
- S1.2: PostgreSQL local via Docker Compose
- S1.3: schema Prisma multi-tenant inicial
- S1.4: seed do Restaurante Xero Verde como tenant piloto

## Decisões de arquitetura

1. XeroFlow é o produto SaaS; Xero Verde é tenant, nunca regra hard-coded.
2. Todas as entidades de negócio carregam tenantId sempre que aplicável.
3. Catálogo suporta grupos de escolha reutilizáveis.
4. Valores monetários ficam no backend/banco; IA futura não será autoridade de preço.
5. Auditoria nasce na fundação do produto.

## Dados do piloto

O cardápio real anexado foi modelado como um produto piloto "Marmitex do Dia" com três grupos:

- Mistura: escolha única obrigatória
- Acompanhamento: múltipla escolha
- Salada: múltipla escolha

Os limites exatos de acompanhamentos/saladas ainda precisam ser confirmados operacionalmente antes da Sprint 2. O seed usa limites permissivos para não impor uma regra ainda não validada.

## Próximas atividades

- S1.5: autenticação
- S1.6: resolução segura de tenant
- S1.7: RBAC
- S1.8: shell/layout administrativo
- S1.9+: CRUDs reais do catálogo
