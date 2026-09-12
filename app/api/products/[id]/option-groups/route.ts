import { NextResponse } from "next/server";

import {
  attachOptionGroupToProductForTenant,
  listProductOptionGroupsForTenant,
} from "@/lib/data/product-option-groups";

import { authErrorResponse } from "@/lib/auth/api-error";
import { Permissions } from "@/lib/auth/rbac";
import { requireTenantPermission } from "@/lib/tenant/authorized-context";
import { assertSameOrigin } from "@/lib/security/same-origin";
import { getRequestIp } from "@/lib/audit/audit";

type RouteContext = {
  params: Promise<{
    id: string;
  }>;
};

export async function GET(
  _request: Request,
  context: RouteContext,
) {
  try {
    const { tenantId } =
      await requireTenantPermission(
        Permissions.CATALOG_READ,
      );

    const { id } =
      await context.params;

    const groups =
      await listProductOptionGroupsForTenant(
        tenantId,
        id,
      );

    if (!groups) {
      return NextResponse.json(
        {
          error:
            "Produto não encontrado.",
        },
        {
          status: 404,
        },
      );
    }

    return NextResponse.json({
      data: groups,
    });
  } catch (error) {
    const authResponse =
      authErrorResponse(error);

    if (authResponse) {
      return authResponse;
    }

    console.error(
      "Erro ao listar grupos do produto:",
      error,
    );

    return NextResponse.json(
      {
        error:
          "Não foi possível listar os grupos do produto.",
      },
      {
        status: 500,
      },
    );
  }
}

export async function POST(
  request: Request,
  context: RouteContext,
) {
  try {
    assertSameOrigin(request);

    const { tenantId, userId } =
      await requireTenantPermission(
        Permissions.CATALOG_WRITE,
      );

    const { id } =
      await context.params;

    const body =
      await request.json();

    const optionGroupId =
      typeof body.optionGroupId === "string"
        ? body.optionGroupId
        : "";

    if (!optionGroupId) {
      return NextResponse.json(
        {
          error:
            "optionGroupId é obrigatório.",
        },
        {
          status: 400,
        },
      );
    }

    const relation =
      await attachOptionGroupToProductForTenant(
        tenantId,
        id,
        optionGroupId,
        typeof body.position === "number"
          ? body.position
          : 0,
        {
          actorUserId: userId,
          ipAddress: getRequestIp(request),
        },
      );

    if (!relation) {
      return NextResponse.json(
        {
          error:
            "Produto ou grupo de opções não encontrados.",
        },
        {
          status: 404,
        },
      );
    }

    return NextResponse.json(
      {
        data: relation,
      },
      {
        status: 201,
      },
    );
  } catch (error) {
    const authResponse =
      authErrorResponse(error);

    if (authResponse) {
      return authResponse;
    }

    console.error(
      "Erro ao vincular grupo ao produto:",
      error,
    );

    return NextResponse.json(
      {
        error:
          "Não foi possível vincular o grupo ao produto.",
      },
      {
        status: 500,
      },
    );
  }
}
