import "dotenv/config";

import { SelectionType } from "@prisma/client";
import { prisma } from "../lib/db/prisma";

async function main() {
  const tenant = await prisma.tenant.upsert({
    where: {
      slug: "cross-tenant-test",
    },
    update: {
      name: "Tenant Cross Test",
      status: "ACTIVE",
    },
    create: {
      name: "Tenant Cross Test",
      slug: "cross-tenant-test",
      status: "ACTIVE",
      timezone: "America/Sao_Paulo",
      currency: "BRL",
    },
  });

  const category = await prisma.category.upsert({
    where: {
      tenantId_slug: {
        tenantId: tenant.id,
        slug: "categoria-cross-test",
      },
    },
    update: {
      name: "Categoria Cross Test",
      active: true,
    },
    create: {
      tenantId: tenant.id,
      name: "Categoria Cross Test",
      slug: "categoria-cross-test",
      active: true,
      position: 1,
    },
  });

  const product = await prisma.product.upsert({
    where: {
      tenantId_slug: {
        tenantId: tenant.id,
        slug: "produto-cross-test",
      },
    },
    update: {
      name: "Produto Cross Test",
      categoryId: category.id,
    },
    create: {
      tenantId: tenant.id,
      categoryId: category.id,
      name: "Produto Cross Test",
      slug: "produto-cross-test",
      description: "Produto temporário para testes de isolamento multi-tenant.",
      basePrice: null,
    },
  });

  const optionGroup = await prisma.optionGroup.upsert({
    where: {
      tenantId_slug: {
        tenantId: tenant.id,
        slug: "grupo-cross-test",
      },
    },
    update: {
      name: "Grupo Cross Test",
      active: true,
      required: false,
      minSelections: 0,
      maxSelections: 1,
      selectionType: SelectionType.SINGLE,
      position: 1,
    },
    create: {
      tenantId: tenant.id,
      name: "Grupo Cross Test",
      slug: "grupo-cross-test",
      active: true,
      required: false,
      minSelections: 0,
      maxSelections: 1,
      selectionType: SelectionType.SINGLE,
      position: 1,
    },
  });

  console.log("Fixture cross-tenant criada com sucesso.");
  console.log({
    tenantId: tenant.id,
    tenantSlug: tenant.slug,
    categoryId: category.id,
    productId: product.id,
    optionGroupId: optionGroup.id,
  });
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
