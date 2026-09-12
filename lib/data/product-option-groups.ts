import { prisma } from "@/lib/db/prisma";

export async function listProductOptionGroupsForTenant(
  tenantId: string,
  productId: string,
) {
  const product =
    await prisma.product.findFirst({
      where: {
        id: productId,
        tenantId,
      },
    });

  if (!product) {
    return null;
  }

  return prisma.productOptionGroup.findMany({
    where: {
      productId: product.id,
      optionGroup: {
        tenantId,
      },
    },
    include: {
      optionGroup: {
        include: {
          options: {
            orderBy: {
              position: "asc",
            },
          },
        },
      },
    },
    orderBy: {
      position: "asc",
    },
  });
}

export async function attachOptionGroupToProductForTenant(
  tenantId: string,
  productId: string,
  optionGroupId: string,
  position: number,
) {
  const [product, optionGroup] =
    await Promise.all([
      prisma.product.findFirst({
        where: {
          id: productId,
          tenantId,
        },
      }),

      prisma.optionGroup.findFirst({
        where: {
          id: optionGroupId,
          tenantId,
        },
      }),
    ]);

  if (!product || !optionGroup) {
    return null;
  }

  return prisma.productOptionGroup.upsert({
    where: {
      productId_optionGroupId: {
        productId: product.id,
        optionGroupId: optionGroup.id,
      },
    },
    update: {
      position,
    },
      create: {
      tenantId,
      productId: product.id,
      optionGroupId: optionGroup.id,
      position,
    },         
    include: {
      optionGroup: true,
    },
  });
}

export async function detachOptionGroupFromProductForTenant(
  tenantId: string,
  productId: string,
  optionGroupId: string,
) {
  const [product, optionGroup] =
    await Promise.all([
      prisma.product.findFirst({
        where: {
          id: productId,
          tenantId,
        },
      }),

      prisma.optionGroup.findFirst({
        where: {
          id: optionGroupId,
          tenantId,
        },
      }),
    ]);

  if (!product || !optionGroup) {
    return null;
  }

  const relation =
    await prisma.productOptionGroup.findUnique({
      where: {
        productId_optionGroupId: {
          productId: product.id,
          optionGroupId: optionGroup.id,
        },
      },
    });

  if (!relation) {
    return null;
  }

  return prisma.productOptionGroup.delete({
    where: {
      productId_optionGroupId: {
        productId: product.id,
        optionGroupId: optionGroup.id,
      },
    },
  });
}
