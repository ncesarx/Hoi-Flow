import type {
  Prisma,
} from "@prisma/client";

import { prisma } from "@/lib/db/prisma";

type AuditDatabase = Pick<
  typeof prisma,
  "auditLog"
>;

export type AuditEntry = {
  tenantId: string;
  actorUserId?: string | null;

  action: string;
  entityType: string;
  entityId?: string | null;

  metadata?: Prisma.InputJsonValue | null;
  ipAddress?: string | null;
};

export function getRequestIp(
  request: Request,
) {
  const forwarded =
    request.headers.get(
      "x-forwarded-for",
    );

  if (forwarded) {
    return (
      forwarded
        .split(",")[0]
        ?.trim() || null
    );
  }

  return (
    request.headers.get(
      "x-real-ip",
    ) || null
  );
}

export async function createAuditLog(
  entry: AuditEntry,
  db: AuditDatabase = prisma,
) {
  return db.auditLog.create({
    data: {
      tenantId:
        entry.tenantId,

      actorUserId:
        entry.actorUserId ??
        null,

      action:
        entry.action,

      entityType:
        entry.entityType,

      entityId:
        entry.entityId ??
        null,

      metadata:
        entry.metadata ??
        undefined,

      ipAddress:
        entry.ipAddress ??
        null,
    },
  });
}
