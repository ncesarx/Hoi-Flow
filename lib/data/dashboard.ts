import { prisma } from "@/lib/db/prisma";

type DashboardOptions = {
  includeUsers?: boolean;
};

export type DashboardMetrics = {
  activeProducts: number;
  activeCategories: number;
  activeUnits: number;
  activeUsers: number | null;
};

export async function getDashboardMetricsForTenant(
  tenantId: string,
  options: DashboardOptions = {},
): Promise<DashboardMetrics> {
  const {
    includeUsers = false,
  } = options;

  const [
    activeProducts,
    activeCategories,
    activeUnits,
    activeUsers,
  ] = await Promise.all([
    prisma.product.count({
      where: {
        tenantId,
        status: "ACTIVE",
      },
    }),

    prisma.category.count({
      where: {
        tenantId,
        active: true,
      },
    }),

    prisma.unit.count({
      where: {
        tenantId,
        status: "ACTIVE",
      },
    }),

    includeUsers
      ? prisma.user.count({
          where: {
            tenantId,
            status: "ACTIVE",
          },
        })
      : Promise.resolve(null),
  ]);

  return {
    activeProducts,
    activeCategories,
    activeUnits,
    activeUsers,
  };
}
