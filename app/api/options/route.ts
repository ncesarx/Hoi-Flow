import { NextResponse } from "next/server";

import {
  createOptionForTenant,
  listOptionsForTenant,
} from "@/lib/data/options";

import { authErrorResponse } from "@/lib/auth/api-error";
import { Permissions } from "@/lib/auth/rbac";
import { requireTenantPermission } from "@/lib/tenant/authorized-context";
import { assertSameOrigin } from "@/lib/security/same-origin";
import { getRequestIp } from "@/lib/audit/audit";

export async function GET() {
  try {
    const { tenantId } =
      await requireTenantPermission(
        Permissions.CATALOG_READ,
      );

    const options =
      await listOptionsForTenant(tenantId);

    return NextResponse.json({
      data: options,
    });
  } catch (error) {
    const authResponse =
      authErrorResponse(error);

    if (authResponse) {
      return authResponse;
    }

    console.error(
      "Erro ao listar opções:",
      error,
    );

    return NextResponse.json(
      {
        error:
          "Não foi possível listar as opções.",
      },
      {
        status: 500,
      },
    );
  }
}

export async function POST(
  request: Request,
) {
  try {
    assertSameOrigin(request);

    const { tenantId, userId } =
      await requireTenantPermission(
        Permissions.CATALOG_WRITE,
      );

    const body = await request.json();

    const name =
      typeof body.name === "string"
        ? body.name.trim()
        : "";

    const optionGroupId =
      typeof body.optionGroupId === "string"
        ? body.optionGroupId
        : "";

    if (!name || !optionGroupId) {
      return NextResponse.json(
        {
          error:
            "Nome e optionGroupId são obrigatórios.",
        },
        {
          status: 400,
        },
      );
    }

    const option =
      await createOptionForTenant(
        tenantId,
        {
          optionGroupId,
          name,
          position:
            typeof body.position === "number"
              ? body.position
              : 0,
          active:
            typeof body.active === "boolean"
              ? body.active
              : true,
          priceDelta:
            typeof body.priceDelta === "number"
              ? body.priceDelta
              : 0,
        },
        {
          actorUserId: userId,
          ipAddress: getRequestIp(request),
        },
      );

    if (!option) {
      return NextResponse.json(
        {
          error:
            "Grupo de opções não encontrado.",
        },
        {
          status: 404,
        },
      );
    }

    return NextResponse.json(
      {
        data: option,
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
      "Erro ao criar opção:",
      error,
    );

    return NextResponse.json(
      {
        error:
          "Não foi possível criar a opção.",
      },
      {
        status: 500,
      },
    );
  }
}
