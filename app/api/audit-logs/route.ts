import {
  NextResponse,
} from "next/server";

import {
  authErrorResponse,
} from "@/lib/auth/api-error";

import {
  Permissions,
} from "@/lib/auth/rbac";

import {
  requireTenantPermission,
} from "@/lib/tenant/authorized-context";

import {
  listAuditLogsForTenant,
} from "@/lib/data/audit-logs";

export async function GET(
  request: Request,
) {
  try {
    /*
     * Nesta primeira versão,
     * auditoria fica disponível
     * para quem possui gestão
     * administrativa do tenant.
     *
     * OWNER já possui
     * TENANT_MANAGE.
     */
    const {
      tenantId,
    } =
      await requireTenantPermission(
        Permissions.TENANT_MANAGE,
      );

    const url =
      new URL(request.url);

    const requestedLimit =
      Number(
        url.searchParams.get(
          "limit",
        ) ?? "100",
      );

    const limit =
      Number.isInteger(
        requestedLimit,
      )
        ? requestedLimit
        : 100;

    const logs =
      await listAuditLogsForTenant(
        tenantId,
        limit,
      );

    return NextResponse.json({
      data: logs,
    });
  } catch (error) {
    const authResponse =
      authErrorResponse(error);

    if (authResponse) {
      return authResponse;
    }

    console.error(
      "Erro ao listar auditoria:",
      error,
    );

    return NextResponse.json(
      {
        error:
          "Não foi possível consultar a auditoria.",
      },
      {
        status: 500,
      },
    );
  }
}
