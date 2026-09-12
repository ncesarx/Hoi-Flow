import { prisma } from "@/lib/db/prisma";

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
) {
  return prisma.category.create({
    data: {
      tenantId,
      name: data.name,
      slug: data.slug,
      position: data.position ?? 0,
      active: data.active ?? true,
    },
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
) {
  const existing =
    await getCategoryForTenant(
      tenantId,
      categoryId,
    );

  if (!existing) {
    return null;
  }

  return prisma.category.update({
    where: {
      id: existing.id,
    },
    data,
  });
}

export async function deleteCategoryForTenant(
  tenantId: string,
  categoryId: string,
) {
  const existing =
    await getCategoryForTenant(
      tenantId,
      categoryId,
    );

  if (!existing) {
    return null;
  }

  return prisma.category.delete({
    where: {
      id: existing.id,
    },
  });
}
