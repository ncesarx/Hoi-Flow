import { NextResponse } from "next/server";

import {
  detachOptionGroupFromProductForTenant,
} from "@/lib/data/product-option-groups";

import { authErrorResponse } from "@/lib/auth/api-error";
import { Permissions } from "@/lib/auth/rbac";
import { requireTenantPermission } from "@/lib/tenant/authorized-context";
import { assertSameOrigin } from "@/lib/security/same-origin";

type RouteContext = {
  params: Promise<{
    id: string;
    optionGroupId: string;
  }>;
};

export async function DELETE(
  request: Request,
  context: RouteContext,
) {
  try {
    assertSameOrigin(request);

    const { tenantId } =
      await requireTenantPermission(
        Permissions.CATALOG_WRITE,
      );

    const {
      id,
      optionGroupId,
    } = await context.params;

    const relation =
      await detachOptionGroupFromProductForTenant(
        tenantId,
        id,
        optionGroupId,
      );

    if (!relation) {
      return NextResponse.json(
        {
          error:
            "Vínculo não encontrado.",
        },
        {
          status: 404,
        },
      );
    }

    return NextResponse.json({
      ok: true,
    });
  } catch (error) {
    const authResponse =
      authErrorResponse(error);

    if (authResponse) {
      return authResponse;
    }

    console.error(
      "Erro ao remover grupo do produto:",
      error,
    );

    return NextResponse.json(
      {
        error:
          "Não foi possível remover o vínculo.",
      },
      {
        status: 500,
      },
    );
  }
}
