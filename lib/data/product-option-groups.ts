import { prisma } from "@/lib/db/prisma";
import {
  AuditActions,
  AuditEntityTypes,
} from "@/lib/audit/actions";
import { createAuditLog } from "@/lib/audit/audit";
import {
  buildProductOptionGroupAuditSnapshot,
  productOptionGroupEntityId,
} from "@/lib/audit/product-option-group-snapshot";

type ProductOptionGroupAuditContext = {
  actorUserId?: string | null;
  ipAddress?: string | null;
};

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
  auditContext: ProductOptionGroupAuditContext = {},
) {
  return prisma.$transaction(async (tx) => {
    const [product, optionGroup] =
      await Promise.all([
        tx.product.findFirst({
          where: {
            id: productId,
            tenantId,
          },
        }),

        tx.optionGroup.findFirst({
          where: {
            id: optionGroupId,
            tenantId,
          },
        }),
      ]);

    if (!product || !optionGroup) {
      return null;
    }

    const relation = await tx.productOptionGroup.upsert({
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

    await createAuditLog(
      {
        tenantId,
        actorUserId: auditContext.actorUserId,
        action: AuditActions.PRODUCT_OPTION_GROUP_ATTACHED,
        entityType: AuditEntityTypes.PRODUCT_OPTION_GROUP,
        entityId: productOptionGroupEntityId(relation),
        metadata: {
          after: buildProductOptionGroupAuditSnapshot(relation),
        },
        ipAddress: auditContext.ipAddress,
      },
      tx,
    );

    return relation;
  });
}

export async function detachOptionGroupFromProductForTenant(
  tenantId: string,
  productId: string,
  optionGroupId: string,
  auditContext: ProductOptionGroupAuditContext = {},
) {
  return prisma.$transaction(async (tx) => {
    const [product, optionGroup] =
      await Promise.all([
        tx.product.findFirst({
          where: {
            id: productId,
            tenantId,
          },
        }),

        tx.optionGroup.findFirst({
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
      await tx.productOptionGroup.findUnique({
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

    const deletedRelation = await tx.productOptionGroup.delete({
      where: {
        productId_optionGroupId: {
          productId: product.id,
          optionGroupId: optionGroup.id,
        },
      },
    });

    await createAuditLog(
      {
        tenantId,
        actorUserId: auditContext.actorUserId,
        action: AuditActions.PRODUCT_OPTION_GROUP_DETACHED,
        entityType: AuditEntityTypes.PRODUCT_OPTION_GROUP,
        entityId: productOptionGroupEntityId(deletedRelation),
        metadata: {
          before: buildProductOptionGroupAuditSnapshot(deletedRelation),
        },
        ipAddress: auditContext.ipAddress,
      },
      tx,
    );

    return deletedRelation;
  });
}
