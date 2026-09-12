import { prisma } from "@/lib/db/prisma";
import {
  AuditActions,
  AuditEntityTypes,
} from "@/lib/audit/actions";
import { createAuditLog } from "@/lib/audit/audit";
import { buildOptionAuditSnapshot } from "@/lib/audit/option-snapshot";

type OptionAuditContext = {
  actorUserId?: string | null;
  ipAddress?: string | null;
};

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
  auditContext: OptionAuditContext = {},
) {
  return prisma.$transaction(async (tx) => {
    const optionGroup =
      await tx.optionGroup.findFirst({
        where: {
          id: data.optionGroupId,
          tenantId,
        },
      });

    if (!optionGroup) {
      return null;
    }

    const option = await tx.option.create({
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

    await createAuditLog(
      {
        tenantId,
        actorUserId: auditContext.actorUserId,
        action: AuditActions.OPTION_CREATED,
        entityType: AuditEntityTypes.OPTION,
        entityId: option.id,
        metadata: {
          after: buildOptionAuditSnapshot(option),
        },
        ipAddress: auditContext.ipAddress,
      },
      tx,
    );

    return option;
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
  auditContext: OptionAuditContext = {},
) {
  return prisma.$transaction(async (tx) => {
    const option = await tx.option.findFirst({
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
        await tx.optionGroup.findFirst({
          where: {
            id: data.optionGroupId,
            tenantId,
          },
        });

      if (!optionGroup) {
        return null;
      }
    }

    const updatedOption = await tx.option.update({
      where: {
        id: option.id,
      },
      data,
      include: {
        optionGroup: true,
      },
    });

    await createAuditLog(
      {
        tenantId,
        actorUserId: auditContext.actorUserId,
        action: AuditActions.OPTION_UPDATED,
        entityType: AuditEntityTypes.OPTION,
        entityId: updatedOption.id,
        metadata: {
          before: buildOptionAuditSnapshot(option),
          after: buildOptionAuditSnapshot(updatedOption),
        },
        ipAddress: auditContext.ipAddress,
      },
      tx,
    );

    return updatedOption;
  });
}

export async function deleteOptionForTenant(
  tenantId: string,
  optionId: string,
  auditContext: OptionAuditContext = {},
) {
  return prisma.$transaction(async (tx) => {
    const option = await tx.option.findFirst({
      where: {
        id: optionId,
        tenantId,
      },
    });

    if (!option) {
      return null;
    }

    const deletedOption = await tx.option.delete({
      where: {
        id: option.id,
      },
    });

    await createAuditLog(
      {
        tenantId,
        actorUserId: auditContext.actorUserId,
        action: AuditActions.OPTION_DELETED,
        entityType: AuditEntityTypes.OPTION,
        entityId: deletedOption.id,
        metadata: {
          before: buildOptionAuditSnapshot(deletedOption),
        },
        ipAddress: auditContext.ipAddress,
      },
      tx,
    );

    return deletedOption;
  });
}
