import "dotenv/config";

import assert from "node:assert/strict";
import {
  after,
  before,
  describe,
  test,
} from "node:test";

import { SelectionType } from "@prisma/client";

import { prisma } from "../lib/db/prisma";

import {
  createOptionForTenant,
  getOptionForTenant,
  updateOptionForTenant,
} from "../lib/data/options";

import {
  attachOptionGroupToProductForTenant,
  listProductOptionGroupsForTenant,
} from "../lib/data/product-option-groups";

import {
  createProductForTenant,
  getProductForTenant,
  updateProductForTenant,
} from "../lib/data/products";

const runId = `${Date.now()}-${Math.random()
  .toString(36)
  .slice(2, 8)}`;

let tenantAId = "";
let tenantBId = "";

let categoryAId = "";
let categoryBId = "";

let productAId = "";
let productBId = "";

let groupAId = "";
let groupBId = "";

let optionAId = "";

describe("S1.6 - isolamento multi-tenant", () => {
  before(async () => {
    const tenantA = await prisma.tenant.create({
      data: {
        name: `S1.6 Tenant A ${runId}`,
        slug: `s16-a-${runId}`,
        status: "ACTIVE",
        timezone: "America/Sao_Paulo",
        currency: "BRL",
      },
    });

    const tenantB = await prisma.tenant.create({
      data: {
        name: `S1.6 Tenant B ${runId}`,
        slug: `s16-b-${runId}`,
        status: "ACTIVE",
        timezone: "America/Sao_Paulo",
        currency: "BRL",
      },
    });

    tenantAId = tenantA.id;
    tenantBId = tenantB.id;

    const categoryA = await prisma.category.create({
      data: {
        tenantId: tenantAId,
        name: "Categoria Tenant A",
        slug: `categoria-a-${runId}`,
        position: 1,
        active: true,
      },
    });

    const categoryB = await prisma.category.create({
      data: {
        tenantId: tenantBId,
        name: "Categoria Tenant B",
        slug: `categoria-b-${runId}`,
        position: 1,
        active: true,
      },
    });

    categoryAId = categoryA.id;
    categoryBId = categoryB.id;

    const productA = await prisma.product.create({
      data: {
        tenantId: tenantAId,
        categoryId: categoryAId,
        name: "Produto Tenant A",
        slug: `produto-a-${runId}`,
        description: "Fixture automática S1.6",
        basePrice: null,
      },
    });

    const productB = await prisma.product.create({
      data: {
        tenantId: tenantBId,
        categoryId: categoryBId,
        name: "Produto Tenant B",
        slug: `produto-b-${runId}`,
        description: "Fixture automática S1.6",
        basePrice: null,
      },
    });

    productAId = productA.id;
    productBId = productB.id;

    const groupA = await prisma.optionGroup.create({
      data: {
        tenantId: tenantAId,
        name: "Grupo Tenant A",
        slug: `grupo-a-${runId}`,
        required: false,
        minSelections: 0,
        maxSelections: 1,
        selectionType: SelectionType.SINGLE,
        position: 1,
        active: true,
      },
    });

    const groupB = await prisma.optionGroup.create({
      data: {
        tenantId: tenantBId,
        name: "Grupo Tenant B",
        slug: `grupo-b-${runId}`,
        required: false,
        minSelections: 0,
        maxSelections: 1,
        selectionType: SelectionType.SINGLE,
        position: 1,
        active: true,
      },
    });

    groupAId = groupA.id;
    groupBId = groupB.id;

    const optionA = await prisma.option.create({
      data: {
        tenantId: tenantAId,
        optionGroupId: groupAId,
        name: "Opção Tenant A",
        position: 1,
        active: true,
        priceDelta: 0,
      },
    });

    optionAId = optionA.id;
  });

  after(async () => {
    /*
     * Apagamos pelos tenants.
     * Como os relacionamentos possuem cascatas no schema,
     * os fixtures associados também devem desaparecer.
     */
    if (tenantAId || tenantBId) {
      await prisma.tenant.deleteMany({
        where: {
          id: {
            in: [tenantAId, tenantBId].filter(Boolean),
          },
        },
      });
    }

    await prisma.$disconnect();
  });

  test("controle positivo: Tenant A consegue acessar sua própria Option", async () => {
    const option = await getOptionForTenant(
      tenantAId,
      optionAId,
    );

    assert.ok(option);
    assert.equal(option.id, optionAId);
    assert.equal(option.tenantId, tenantAId);
  });

  test("GET por ID de outro tenant deve ser bloqueado", async () => {
    const option = await getOptionForTenant(
      tenantBId,
      optionAId,
    );

    assert.equal(option, null);
  });

  test("Option -> OptionGroup do mesmo tenant deve ser permitido", async () => {
    const option = await createOptionForTenant(
      tenantAId,
      {
        optionGroupId: groupAId,
        name: "Opção válida A",
        position: 2,
        active: true,
        priceDelta: 0,
      },
    );

    assert.ok(option);
    assert.equal(option.tenantId, tenantAId);
    assert.equal(option.optionGroupId, groupAId);
  });

  test("Option Tenant A -> OptionGroup Tenant B deve ser bloqueado", async () => {
    const option = await createOptionForTenant(
      tenantAId,
      {
        optionGroupId: groupBId,
        name: "Tentativa Cross Tenant",
        position: 99,
        active: true,
        priceDelta: 0,
      },
    );

    assert.equal(option, null);

    const leakedOption =
      await prisma.option.findFirst({
        where: {
          tenantId: tenantAId,
          optionGroupId: groupBId,
        },
      });

    assert.equal(leakedOption, null);
  });

  test("PATCH não pode mover Option Tenant A para OptionGroup Tenant B", async () => {
    const result = await updateOptionForTenant(
      tenantAId,
      optionAId,
      {
        optionGroupId: groupBId,
      },
    );

    assert.equal(result, null);

    const persisted =
      await prisma.option.findUnique({
        where: {
          id: optionAId,
        },
      });

    assert.ok(persisted);
    assert.equal(
      persisted.optionGroupId,
      groupAId,
    );
  });

  test("Product A -> OptionGroup A deve ser permitido", async () => {
    const relation =
      await attachOptionGroupToProductForTenant(
        tenantAId,
        productAId,
        groupAId,
        1,
      );

    assert.ok(relation);
    assert.equal(
      relation.productId,
      productAId,
    );
    assert.equal(
      relation.optionGroupId,
      groupAId,
    );
  });

  test("Product Tenant A -> OptionGroup Tenant B deve ser bloqueado", async () => {
    const relation =
      await attachOptionGroupToProductForTenant(
        tenantAId,
        productAId,
        groupBId,
        99,
      );

    assert.equal(relation, null);

    const persisted =
      await prisma.productOptionGroup.findUnique({
        where: {
          productId_optionGroupId: {
            productId: productAId,
            optionGroupId: groupBId,
          },
        },
      });

    assert.equal(persisted, null);
  });

  test("Product Tenant B -> OptionGroup Tenant A usando contexto A deve ser bloqueado", async () => {
    const relation =
      await attachOptionGroupToProductForTenant(
        tenantAId,
        productBId,
        groupAId,
        99,
      );

    assert.equal(relation, null);

    const persisted =
      await prisma.productOptionGroup.findUnique({
        where: {
          productId_optionGroupId: {
            productId: productBId,
            optionGroupId: groupAId,
          },
        },
      });

    assert.equal(persisted, null);
  });

  test("Tenant B não pode listar relações do Product Tenant A", async () => {
    const result =
      await listProductOptionGroupsForTenant(
        tenantBId,
        productAId,
      );

    assert.equal(result, null);
  });

test("Tenant A consegue acessar seu próprio Product", async () => {
  const product = await getProductForTenant(
    tenantAId,
    productAId,
  );

  assert.ok(product);
  assert.equal(product.id, productAId);
  assert.equal(product.tenantId, tenantAId);
  assert.equal(product.categoryId, categoryAId);
});

test("Tenant B não consegue acessar Product do Tenant A", async () => {
  const product = await getProductForTenant(
    tenantBId,
    productAId,
  );

  assert.equal(product, null);
});

test("Product -> Category do mesmo tenant deve ser permitido", async () => {
  const product = await createProductForTenant(
    tenantAId,
    {
      categoryId: categoryAId,
      name: "Produto válido S1.6",
      slug: `produto-valido-${runId}`,
      description: "Controle positivo S1.6",
      basePrice: null,
    },
  );

  assert.ok(product);
  assert.equal(product.tenantId, tenantAId);
  assert.equal(product.categoryId, categoryAId);
});

test("Product Tenant A -> Category Tenant B deve ser bloqueado na criação", async () => {
  const product = await createProductForTenant(
    tenantAId,
    {
      categoryId: categoryBId,
      name: "Produto Cross Tenant proibido",
      slug: `produto-cross-proibido-${runId}`,
      description: "Este registro nunca deve ser criado",
      basePrice: null,
    },
  );

  assert.equal(product, null);

  const persisted = await prisma.product.findFirst({
    where: {
      tenantId: tenantAId,
      categoryId: categoryBId,
    },
  });

  assert.equal(persisted, null);
});

test("PATCH Product Tenant A -> Category Tenant B deve ser bloqueado", async () => {
  const result = await updateProductForTenant(
    tenantAId,
    productAId,
    {
      categoryId: categoryBId,
    },
  );

  assert.equal(result, null);

  const persisted = await prisma.product.findUnique({
    where: {
      id: productAId,
    },
  });

  assert.ok(persisted);
  assert.equal(persisted.tenantId, tenantAId);
  assert.equal(persisted.categoryId, categoryAId);
});

test("Tenant B não pode atualizar Product do Tenant A", async () => {
  const result = await updateProductForTenant(
    tenantBId,
    productAId,
    {
      name: "Alteração indevida",
    },
  );

  assert.equal(result, null);

  const persisted = await prisma.product.findUnique({
    where: {
      id: productAId,
    },
  });

  assert.ok(persisted);
  assert.equal(persisted.name, "Produto Tenant A");
});

  test("PostgreSQL bloqueia ProductOptionGroup cross-tenant diretamente", async () => {
  await assert.rejects(
    async () => {
      await prisma.productOptionGroup.create({
        data: {
          tenantId: tenantAId,
          productId: productAId,
          optionGroupId: groupBId,
          position: 999,
        },
      });
    },
  );

  const leakedRelation = await prisma.productOptionGroup.findUnique({
    where: {
      productId_optionGroupId: {
        productId: productAId,
        optionGroupId: groupBId,
      },
    },
  });

  assert.equal(leakedRelation, null);
});

  test("invariante: nenhuma Option pode apontar para OptionGroup de outro tenant", async () => {
    const crossTenantRelations =
      await prisma.$queryRaw<
        Array<{ count: bigint }>
      >`
        SELECT COUNT(*)::bigint AS count
        FROM "Option" o
        INNER JOIN "OptionGroup" og
          ON og.id = o."optionGroupId"
        WHERE o."tenantId" <> og."tenantId"
      `;

    assert.equal(
      Number(crossTenantRelations[0].count),
      0,
    );
  });

  test("invariante: nenhum Product pode apontar para Category de outro tenant", async () => {
    const crossTenantRelations =
      await prisma.$queryRaw<
        Array<{ count: bigint }>
      >`
        SELECT COUNT(*)::bigint AS count
        FROM "Product" p
        INNER JOIN "Category" c
          ON c.id = p."categoryId"
        WHERE p."tenantId" <> c."tenantId"
      `;

    assert.equal(
      Number(crossTenantRelations[0].count),
      0,
    );
  });

  test("invariante: nenhum ProductOptionGroup pode cruzar tenants", async () => {
    const crossTenantRelations =
      await prisma.$queryRaw<
        Array<{ count: bigint }>
      >`
        SELECT COUNT(*)::bigint AS count
        FROM "ProductOptionGroup" pog
        INNER JOIN "Product" p
          ON p.id = pog."productId"
        INNER JOIN "OptionGroup" og
          ON og.id = pog."optionGroupId"
        WHERE p."tenantId" <> og."tenantId"
      `;

    assert.equal(
      Number(crossTenantRelations[0].count),
      0,
    );
  });
});
