import { prisma } from "@/lib/db/prisma";

export async function listOptionsForTenant(
  tenantId: string,
) {
  return prisma.option.findMany({
    where: {
      tenantId,
    },
    include: {
      optionGroup: true,
    },
    orderBy: [
      {
        optionGroupId: "asc",
      },
      {
        position: "asc",
      },
    ],
  });
}

export async function getOptionForTenant(
  tenantId: string,
  optionId: string,
) {
  return prisma.option.findFirst({
    where: {
      id: optionId,
      tenantId,
    },
    include: {
      optionGroup: true,
    },
  });
}

export async function createOptionForTenant(
  tenantId: string,
  data: {
    optionGroupId: string;
    name: string;
    position?: number;
    active?: boolean;
    priceDelta?: number;
  },
) {
  const optionGroup =
    await prisma.optionGroup.findFirst({
      where: {
        id: data.optionGroupId,
        tenantId,
      },
    });

  if (!optionGroup) {
    return null;
  }

  return prisma.option.create({
    data: {
      tenantId,
      optionGroupId: optionGroup.id,
      name: data.name,
      position: data.position ?? 0,
      active: data.active ?? true,
      priceDelta: data.priceDelta ?? 0,
    },
    include: {
      optionGroup: true,
    },
  });
}

export async function updateOptionForTenant(
  tenantId: string,
  optionId: string,
  data: {
    optionGroupId?: string;
    name?: string;
    position?: number;
    active?: boolean;
    priceDelta?: number;
  },
) {
  const option = await prisma.option.findFirst({
    where: {
      id: optionId,
      tenantId,
    },
  });

  if (!option) {
    return null;
  }

  if (data.optionGroupId) {
    const optionGroup =
      await prisma.optionGroup.findFirst({
        where: {
          id: data.optionGroupId,
          tenantId,
        },
      });

    if (!optionGroup) {
      return null;
    }
  }

  return prisma.option.update({
    where: {
      id: option.id,
    },
    data,
    include: {
      optionGroup: true,
    },
  });
}

export async function deleteOptionForTenant(
  tenantId: string,
  optionId: string,
) {
  const option = await prisma.option.findFirst({
    where: {
      id: optionId,
      tenantId,
    },
  });

  if (!option) {
    return null;
  }

  return prisma.option.delete({
    where: {
      id: option.id,
    },
  });
}
