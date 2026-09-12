import { prisma } from "@/lib/db/prisma";

export async function listUnitsForTenant(
  tenantId: string,
) {
  return prisma.unit.findMany({
    where: {
      tenantId,
    },
    orderBy: {
      name: "asc",
    },
  });
}

export async function getUnitForTenant(
  tenantId: string,
  unitId: string,
) {
  return prisma.unit.findFirst({
    where: {
      id: unitId,
      tenantId,
    },
  });
}
