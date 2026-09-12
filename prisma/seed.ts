import { RoleCode, SelectionType } from "@prisma/client";
import { prisma } from "../lib/db/prisma";

async function main() {
  const tenant = await prisma.tenant.upsert({
    where: { slug: "xero-verde" },
    update: {
      name: "Restaurante Xero Verde",
      status: "ACTIVE",
      phone: "+5512992579217",
    },
    create: {
      name: "Restaurante Xero Verde",
      slug: "xero-verde",
      status: "ACTIVE",
      phone: "+5512992579217",
      timezone: "America/Sao_Paulo",
      currency: "BRL",
    },
  });

  await prisma.unit.upsert({
    where: { tenantId_slug: { tenantId: tenant.id, slug: "matriz" } },
    update: { name: "Matriz" },
    create: {
      tenantId: tenant.id,
      name: "Matriz",
      slug: "matriz",
    },
  });

  await prisma.user.upsert({
    where: { email: "owner@xeroflow.local" },
    update: { tenantId: tenant.id, role: RoleCode.OWNER, status: "INVITED" },
    create: {
      tenantId: tenant.id,
      name: "Proprietário Xero Verde",
      email: "owner@xeroflow.local",
      role: RoleCode.OWNER,
      status: "INVITED",
    },
  });

  const category = await prisma.category.upsert({
    where: { tenantId_slug: { tenantId: tenant.id, slug: "refeicoes" } },
    update: { name: "Refeições", active: true },
    create: {
      tenantId: tenant.id,
      name: "Refeições",
      slug: "refeicoes",
      position: 1,
    },
  });

  const product = await prisma.product.upsert({
    where: { tenantId_slug: { tenantId: tenant.id, slug: "marmitex-do-dia" } },
    update: { name: "Marmitex do Dia", categoryId: category.id },
    create: {
      tenantId: tenant.id,
      categoryId: category.id,
      name: "Marmitex do Dia",
      slug: "marmitex-do-dia",
      description: "Produto piloto para modelar as escolhas reais do cardápio do Xero Verde. Preço será definido na etapa de parametrização comercial.",
      basePrice: null,
    },
  });

  const groups = [
    {
      name: "Mistura",
      slug: "mistura",
      required: true,
      minSelections: 1,
      maxSelections: 1,
      selectionType: SelectionType.SINGLE,
      position: 1,
      options: ["Lombo", "Frango assado", "Lagarto recheado", "Filé de peixe empanado", "Empanadinho de frango"],
    },
    {
      name: "Acompanhamento",
      slug: "acompanhamento",
      required: false,
      minSelections: 0,
      maxSelections: 3,
      selectionType: SelectionType.MULTIPLE,
      position: 2,
      options: ["Macarrão bolonhesa", "Farofa de mandioca", "Purê de batata"],
    },
    {
      name: "Salada",
      slug: "salada",
      required: false,
      minSelections: 0,
      maxSelections: 4,
      selectionType: SelectionType.MULTIPLE,
      position: 3,
      options: ["Alface", "Tomate", "Pepino", "Abobrinha"],
    },
  ];

  for (const groupData of groups) {
    const group = await prisma.optionGroup.upsert({
      where: { tenantId_slug: { tenantId: tenant.id, slug: groupData.slug } },
      update: {
        name: groupData.name,
        required: groupData.required,
        minSelections: groupData.minSelections,
        maxSelections: groupData.maxSelections,
        selectionType: groupData.selectionType,
        position: groupData.position,
        active: true,
      },
      create: {
        tenantId: tenant.id,
        name: groupData.name,
        slug: groupData.slug,
        required: groupData.required,
        minSelections: groupData.minSelections,
        maxSelections: groupData.maxSelections,
        selectionType: groupData.selectionType,
        position: groupData.position,
      },
    });

    await prisma.productOptionGroup.upsert({
      where: { productId_optionGroupId: { productId: product.id, optionGroupId: group.id } },
      update: { position: groupData.position },
      create: { tenantId: tenant.id, productId: product.id, optionGroupId: group.id, position: groupData.position, }, });

    for (const [index, optionName] of groupData.options.entries()) {
      await prisma.option.upsert({
        where: { optionGroupId_name: { optionGroupId: group.id, name: optionName } },
        update: { active: true, position: index + 1 },
        create: {
          tenantId: tenant.id,
          optionGroupId: group.id,
          name: optionName,
          position: index + 1,
        },
      });
    }
  }

  const existingSeedAudit =
  await prisma.auditLog.findFirst({
    where: {
      tenantId: tenant.id,
      action:
        "SEED_INITIALIZED",
      entityType:
        "Tenant",
      entityId:
        tenant.id,
    },
  });

if (!existingSeedAudit) {
  await prisma.auditLog.create({
    data: {
      tenantId:
        tenant.id,

      action:
        "SEED_INITIALIZED",

      entityType:
        "Tenant",

      entityId:
        tenant.id,

      metadata: {
        sprint:
          "S1.1-S1.4",

        source:
          "cardapio-real-xero-verde",
      },
    },
  });
}

  console.log(`✅ Seed concluído: ${tenant.name} (${tenant.slug})`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
