import { prisma } from "@/lib/db/prisma";
import {
  AuditActions,
  AuditEntityTypes,
} from "@/lib/audit/actions";
import { createAuditLog } from "@/lib/audit/audit";
import { buildCategoryAuditSnapshot } from "@/lib/audit/category-snapshot";

type CategoryAuditContext = {
  actorUserId?: string | null;
  ipAddress?: string | null;
};

export async function listCategoriesForTenant(
  tenantId: string,
) {
  return prisma.category.findMany({
    where: {
      tenantId,
    },
    orderBy: [
      {
        position: "asc",
      },
      {
        name: "asc",
      },
    ],
  });
}

export async function getCategoryForTenant(
  tenantId: string,
  categoryId: string,
) {
  return prisma.category.findFirst({
    where: {
      id: categoryId,
      tenantId,
    },
  });
}

export async function createCategoryForTenant(
  tenantId: string,
  data: {
    name: string;
    slug: string;
    position?: number;
    active?: boolean;
  },
  auditContext: CategoryAuditContext = {},
) {
  return prisma.$transaction(async (tx) => {
    const category = await tx.category.create({
      data: {
        tenantId,
        name: data.name,
        slug: data.slug,
        position: data.position ?? 0,
        active: data.active ?? true,
      },
    });

    await createAuditLog(
      {
        tenantId,
        actorUserId: auditContext.actorUserId,
        action: AuditActions.CATEGORY_CREATED,
        entityType: AuditEntityTypes.CATEGORY,
        entityId: category.id,
        metadata: {
          after: buildCategoryAuditSnapshot(category),
        },
        ipAddress: auditContext.ipAddress,
      },
      tx,
    );

    return category;
  });
}

export async function updateCategoryForTenant(
  tenantId: string,
  categoryId: string,
  data: {
    name?: string;
    slug?: string;
    position?: number;
    active?: boolean;
  },
  auditContext: CategoryAuditContext = {},
) {
  return prisma.$transaction(async (tx) => {
    const existing =
      await tx.category.findFirst({
        where: {
          id: categoryId,
          tenantId,
        },
      });

    if (!existing) {
      return null;
    }

    const category = await tx.category.update({
      where: {
        id: existing.id,
      },
      data,
    });

    await createAuditLog(
      {
        tenantId,
        actorUserId: auditContext.actorUserId,
        action: AuditActions.CATEGORY_UPDATED,
        entityType: AuditEntityTypes.CATEGORY,
        entityId: category.id,
        metadata: {
          before: buildCategoryAuditSnapshot(existing),
          after: buildCategoryAuditSnapshot(category),
        },
        ipAddress: auditContext.ipAddress,
      },
      tx,
    );

    return category;
  });
}

export async function deleteCategoryForTenant(
  tenantId: string,
  categoryId: string,
  auditContext: CategoryAuditContext = {},
) {
  return prisma.$transaction(async (tx) => {
    const existing =
      await tx.category.findFirst({
        where: {
          id: categoryId,
          tenantId,
        },
      });

    if (!existing) {
      return null;
    }

    const category = await tx.category.delete({
      where: {
        id: existing.id,
      },
    });

    await createAuditLog(
      {
        tenantId,
        actorUserId: auditContext.actorUserId,
        action: AuditActions.CATEGORY_DELETED,
        entityType: AuditEntityTypes.CATEGORY,
        entityId: category.id,
        metadata: {
          before: buildCategoryAuditSnapshot(category),
        },
        ipAddress: auditContext.ipAddress,
      },
      tx,
    );

    return category;
  });
}
