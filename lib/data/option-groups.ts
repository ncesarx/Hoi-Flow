import {
  SelectionType,
} from "@prisma/client";

import {
  prisma,
} from "@/lib/db/prisma";

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
) {
  return prisma.optionGroup.create({
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
}

export async function updateOptionGroupForTenant(
  tenantId: string,
  optionGroupId: string,
  data: OptionGroupWriteData,
) {
  const group =
    await prisma.optionGroup.findFirst({
      where: {
        id: optionGroupId,
        tenantId,
      },
    });

  if (!group) {
    return null;
  }

  return prisma.optionGroup.update({
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
}
