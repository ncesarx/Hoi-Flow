import {
  ProductStatus,
} from "@prisma/client";

import { prisma } from "@/lib/db/prisma";
import {
  AuditActions,
  AuditEntityTypes,
} from "@/lib/audit/actions";
import { createAuditLog } from "@/lib/audit/audit";
import { buildProductAuditSnapshot } from "@/lib/audit/product-snapshot";

type ProductAuditContext = {
  actorUserId?: string | null;
  ipAddress?: string | null;
};

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
  auditContext: ProductAuditContext = {},
) {
  return prisma.$transaction(async (tx) => {
    const category =
      await tx.category.findFirst({
        where: {
          id: data.categoryId,
          tenantId,
        },
      });

    if (!category) {
      return null;
    }

    const product = await tx.product.create({
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

    await createAuditLog(
      {
        tenantId,
        actorUserId: auditContext.actorUserId,
        action: AuditActions.PRODUCT_CREATED,
        entityType: AuditEntityTypes.PRODUCT,
        entityId: product.id,
        metadata: {
          after: buildProductAuditSnapshot(product),
        },
        ipAddress: auditContext.ipAddress,
      },
      tx,
    );

    return product;
  });
}

export async function updateProductForTenant(
  tenantId: string,
  productId: string,
  data: ProductWriteData,
  auditContext: ProductAuditContext = {},
) {
  return prisma.$transaction(async (tx) => {
    const product =
      await tx.product.findFirst({
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
        await tx.category.findFirst({
          where: {
            id: data.categoryId,
            tenantId,
          },
        });

      if (!category) {
        return null;
      }
    }

    const updatedProduct = await tx.product.update({
      where: {
        id: product.id,
      },
      data,
      include: {
        category: true,
      },
    });

    await createAuditLog(
      {
        tenantId,
        actorUserId: auditContext.actorUserId,
        action: AuditActions.PRODUCT_UPDATED,
        entityType: AuditEntityTypes.PRODUCT,
        entityId: updatedProduct.id,
        metadata: {
          before: buildProductAuditSnapshot(product),
          after: buildProductAuditSnapshot(updatedProduct),
        },
        ipAddress: auditContext.ipAddress,
      },
      tx,
    );

    return updatedProduct;
  });
}
