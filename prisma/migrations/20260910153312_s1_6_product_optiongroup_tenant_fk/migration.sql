/*
  S1.6 - Secure Multi-Tenancy
  Hardening de ProductOptionGroup.

  Estratégia:
  1. Remove as FKs simples antigas.
  2. Adiciona tenantId temporariamente nullable.
  3. Preenche tenantId a partir do Product.
  4. Valida a consistência Product x OptionGroup.
  5. Torna tenantId obrigatório.
  6. Cria constraints compostas no PostgreSQL.
*/

-- DropForeignKey
ALTER TABLE "ProductOptionGroup"
DROP CONSTRAINT "ProductOptionGroup_optionGroupId_fkey";

-- DropForeignKey
ALTER TABLE "ProductOptionGroup"
DROP CONSTRAINT "ProductOptionGroup_productId_fkey";


-- ============================================================
-- 1. Adiciona tenantId inicialmente como nullable
-- ============================================================

ALTER TABLE "ProductOptionGroup"
ADD COLUMN "tenantId" TEXT;


-- ============================================================
-- 2. Backfill usando o tenant proprietário do Product
-- ============================================================

UPDATE "ProductOptionGroup" AS pog
SET "tenantId" = p."tenantId"
FROM "Product" AS p
WHERE p.id = pog."productId";


-- ============================================================
-- 3. Valida se algum registro ficou sem tenantId
-- ============================================================

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM "ProductOptionGroup"
    WHERE "tenantId" IS NULL
  ) THEN
    RAISE EXCEPTION
      'S1.6 migration abortada: existem ProductOptionGroup sem tenantId após o backfill.';
  END IF;
END
$$;


-- ============================================================
-- 4. Valida se Product e OptionGroup pertencem ao mesmo tenant
-- ============================================================

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM "ProductOptionGroup" pog
    INNER JOIN "Product" p
      ON p.id = pog."productId"
    INNER JOIN "OptionGroup" og
      ON og.id = pog."optionGroupId"
    WHERE p."tenantId" <> og."tenantId"
       OR pog."tenantId" <> p."tenantId"
       OR pog."tenantId" <> og."tenantId"
  ) THEN
    RAISE EXCEPTION
      'S1.6 migration abortada: relação ProductOptionGroup cross-tenant detectada.';
  END IF;
END
$$;


-- ============================================================
-- 5. tenantId passa a ser obrigatório
-- ============================================================

ALTER TABLE "ProductOptionGroup"
ALTER COLUMN "tenantId" SET NOT NULL;


-- ============================================================
-- 6. Índices necessários para as FKs compostas
-- ============================================================

CREATE UNIQUE INDEX "Product_id_tenantId_key"
ON "Product"("id", "tenantId");

CREATE INDEX "ProductOptionGroup_tenantId_idx"
ON "ProductOptionGroup"("tenantId");


-- ============================================================
-- 7. FK composta Product + Tenant
-- ============================================================

ALTER TABLE "ProductOptionGroup"
ADD CONSTRAINT "ProductOptionGroup_productId_tenantId_fkey"
FOREIGN KEY ("productId", "tenantId")
REFERENCES "Product"("id", "tenantId")
ON DELETE CASCADE
ON UPDATE CASCADE;


-- ============================================================
-- 8. FK composta OptionGroup + Tenant
-- ============================================================

ALTER TABLE "ProductOptionGroup"
ADD CONSTRAINT "ProductOptionGroup_optionGroupId_tenantId_fkey"
FOREIGN KEY ("optionGroupId", "tenantId")
REFERENCES "OptionGroup"("id", "tenantId")
ON DELETE CASCADE
ON UPDATE CASCADE;
