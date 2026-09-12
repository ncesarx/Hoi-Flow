import {
  SelectionType,
} from "@prisma/client";

import {
  prisma,
} from "@/lib/db/prisma";
import {
  AuditActions,
  AuditEntityTypes,
} from "@/lib/audit/actions";
import { createAuditLog } from "@/lib/audit/audit";
import { buildOptionGroupAuditSnapshot } from "@/lib/audit/option-group-snapshot";

type OptionGroupAuditContext = {
  actorUserId?: string | null;
  ipAddress?: string | null;
};

type OptionGroupWriteData = {
  name?: string;
  slug?: string;
  selectionType?: SelectionType;
  minSelections?: number;
  maxSelections?: number;
  required?: boolean;
  position?: number;
  active?: boolean;
};

export async function listOptionGroupsForTenant(
  tenantId: string,
) {
  return prisma.optionGroup.findMany({
    where: {
      tenantId,
    },

    include: {
      options: {
        orderBy: [
          {
            position: "asc",
          },
          {
            name: "asc",
          },
        ],
      },

      _count: {
        select: {
          products: true,
        },
      },
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

export async function getOptionGroupForTenant(
  tenantId: string,
  optionGroupId: string,
) {
  return prisma.optionGroup.findFirst({
    where: {
      id: optionGroupId,
      tenantId,
    },

    include: {
      options: {
        orderBy: [
          {
            position: "asc",
          },
          {
            name: "asc",
          },
        ],
      },

      _count: {
        select: {
          products: true,
        },
      },
    },
  });
}

export async function createOptionGroupForTenant(
  tenantId: string,
  data: {
    name: string;
    slug: string;
    selectionType: SelectionType;
    minSelections: number;
    maxSelections: number;
    required: boolean;
    position?: number;
    active?: boolean;
  },
  auditContext: OptionGroupAuditContext = {},
) {
  return prisma.$transaction(async (tx) => {
    const group = await tx.optionGroup.create({
      data: {
        tenantId,

        name:
          data.name,

        slug:
          data.slug,

        selectionType:
          data.selectionType,

        minSelections:
          data.minSelections,

        maxSelections:
          data.maxSelections,

        required:
          data.required,

        position:
          data.position ?? 0,

        active:
          data.active ?? true,
      },

      include: {
        options: {
          orderBy: {
            position: "asc",
          },
        },
        _count: {
          select: {
            products: true,
          },
        },
      },
    });

    await createAuditLog(
      {
        tenantId,
        actorUserId: auditContext.actorUserId,
        action: AuditActions.OPTION_GROUP_CREATED,
        entityType: AuditEntityTypes.OPTION_GROUP,
        entityId: group.id,
        metadata: {
          after: buildOptionGroupAuditSnapshot(group),
        },
        ipAddress: auditContext.ipAddress,
      },
      tx,
    );

    return group;
  });
}

export async function updateOptionGroupForTenant(
  tenantId: string,
  optionGroupId: string,
  data: OptionGroupWriteData,
  auditContext: OptionGroupAuditContext = {},
) {
  return prisma.$transaction(async (tx) => {
    const group =
      await tx.optionGroup.findFirst({
        where: {
          id: optionGroupId,
          tenantId,
        },
      });

    if (!group) {
      return null;
    }

    const updatedGroup = await tx.optionGroup.update({
      where: {
        id: group.id,
      },

      data,

      include: {
        options: {
          orderBy: {
            position: "asc",
          },
        },

        _count: {
          select: {
            products: true,
          },
        },
      },
    });

    await createAuditLog(
      {
        tenantId,
        actorUserId: auditContext.actorUserId,
        action: AuditActions.OPTION_GROUP_UPDATED,
        entityType: AuditEntityTypes.OPTION_GROUP,
        entityId: updatedGroup.id,
        metadata: {
          before: buildOptionGroupAuditSnapshot(group),
          after: buildOptionGroupAuditSnapshot(updatedGroup),
        },
        ipAddress: auditContext.ipAddress,
      },
      tx,
    );

    return updatedGroup;
  });
}
