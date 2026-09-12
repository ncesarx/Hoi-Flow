import { prisma } from "@/lib/db/prisma";

export async function listAuditLogsForTenant(
  tenantId: string,
  limit = 100,
) {
  const safeLimit =
    Math.min(
      Math.max(limit, 1),
      200,
    );

  return prisma.auditLog.findMany({
    where: {
      tenantId,
    },

    include: {
      actor: {
        select: {
          id: true,
          name: true,
          email: true,
          role: true,
        },
      },
    },

    orderBy: {
      createdAt: "desc",
    },

    take: safeLimit,
  });
}

export async function getAuditLogForTenant(
  tenantId: string,
  auditLogId: string,
) {
  return prisma.auditLog.findFirst({
    where: {
      id: auditLogId,
      tenantId,
    },

    include: {
      actor: {
        select: {
          id: true,
          name: true,
          email: true,
          role: true,
        },
      },
    },
  });
}
