import { NextResponse } from "next/server";

import { authErrorResponse } from "@/lib/auth/api-error";
import { Permissions } from "@/lib/auth/rbac";
import { requireTenantPermission } from "@/lib/tenant/authorized-context";
import { getUnitForTenant } from "@/lib/data/units";

type RouteContext = {
  params: Promise<{
    id: string;
  }>;
};

export async function GET(
  request: Request,
  context: RouteContext,
) {
  try {
    const { tenantId } =
      await requireTenantPermission(
        Permissions.UNIT_READ,
      );

    const { id } =
      await context.params;

    const unit =
      await getUnitForTenant(
        tenantId,
        id,
      );

    if (!unit) {
      return NextResponse.json(
        {
          error:
            "Unidade não encontrada.",
        },
        {
          status: 404,
        },
      );
    }

    return NextResponse.json({
      data: unit,
    });
  } catch (error) {
    const authResponse =
      authErrorResponse(error);

    if (authResponse) {
      return authResponse;
    }

    console.error(
      "Erro ao consultar unidade:",
      error,
    );

    return NextResponse.json(
      {
        error:
          "Não foi possível consultar a unidade.",
      },
      {
        status: 500,
      },
    );
  }
}
