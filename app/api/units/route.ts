import { NextResponse } from "next/server";

import { authErrorResponse } from "@/lib/auth/api-error";
import { Permissions } from "@/lib/auth/rbac";
import { requireTenantPermission } from "@/lib/tenant/authorized-context";
import { listUnitsForTenant } from "@/lib/data/units";

export async function GET() {
  try {
    const { tenantId } =
      await requireTenantPermission(
        Permissions.UNIT_READ,
      );

    const units =
      await listUnitsForTenant(
        tenantId,
      );

    return NextResponse.json({
      data: units,
    });
  } catch (error) {
    const authResponse =
      authErrorResponse(error);

    if (authResponse) {
      return authResponse;
    }

    console.error(
      "Erro ao listar unidades:",
      error,
    );

    return NextResponse.json(
      {
        error:
          "Não foi possível listar as unidades.",
      },
      {
        status: 500,
      },
    );
  }
}
