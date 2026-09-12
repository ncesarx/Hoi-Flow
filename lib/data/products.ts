import {
  ProductStatus,
} from "@prisma/client";

import { prisma } from "@/lib/db/prisma";

type ProductWriteData = {
  categoryId?: string | null;
  name?: string;
  slug?: string;
  description?: string | null;
  basePrice?: string | number | null;
  status?: ProductStatus;
  imageUrl?: string | null;
};

export async function listProductsForTenant(
  tenantId: string,
) {
  return prisma.product.findMany({
    where: {
      tenantId,
    },
    include: {
      category: true,
    },
    orderBy: [
      {
        status: "asc",
      },
      {
        name: "asc",
      },
    ],
  });
}

export async function getProductForTenant(
  tenantId: string,
  productId: string,
) {
  return prisma.product.findFirst({
    where: {
      id: productId,
      tenantId,
    },
    include: {
      category: true,
    },
  });
}

export async function createProductForTenant(
  tenantId: string,
  data: {
    categoryId: string;
    name: string;
    slug: string;
    description?: string | null;
    basePrice?: string | number | null;
    status?: ProductStatus;
    imageUrl?: string | null;
  },
) {
  const category =
    await prisma.category.findFirst({
      where: {
        id: data.categoryId,
        tenantId,
      },
    });

  if (!category) {
    return null;
  }

  return prisma.product.create({
    data: {
      tenantId,
      categoryId: category.id,
      name: data.name,
      slug: data.slug,
      description:
        data.description ?? null,
      basePrice:
        data.basePrice ?? null,
      status:
        data.status ??
        ProductStatus.ACTIVE,
      imageUrl:
        data.imageUrl ?? null,
    },
    include: {
      category: true,
    },
  });
}

export async function updateProductForTenant(
  tenantId: string,
  productId: string,
  data: ProductWriteData,
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

  if (
    data.categoryId !== undefined &&
    data.categoryId !== null
  ) {
    const category =
      await prisma.category.findFirst({
        where: {
          id: data.categoryId,
          tenantId,
        },
      });

    if (!category) {
      return null;
    }
  }

  return prisma.product.update({
    where: {
      id: product.id,
    },
    data,
    include: {
      category: true,
    },
  });
}
