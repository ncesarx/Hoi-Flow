import { NextResponse } from "next/server";

import {
  deleteOptionForTenant,
  getOptionForTenant,
  updateOptionForTenant,
} from "@/lib/data/options";

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

    const { id } = await context.params;

    const option =
      await getOptionForTenant(
        tenantId,
        id,
      );

    if (!option) {
      return NextResponse.json(
        {
          error: "Opção não encontrada.",
        },
        {
          status: 404,
        },
      );
    }

    return NextResponse.json({
      data: option,
    });
  } catch (error) {
    const authResponse =
      authErrorResponse(error);

    if (authResponse) {
      return authResponse;
    }

    console.error(
      "Erro ao consultar opção:",
      error,
    );

    return NextResponse.json(
      {
        error:
          "Não foi possível consultar a opção.",
      },
      {
        status: 500,
      },
    );
  }
}

export async function PATCH(
  request: Request,
  context: RouteContext,
) {
  try {
    assertSameOrigin(request);

    const { tenantId, userId } =
      await requireTenantPermission(
        Permissions.CATALOG_WRITE,
      );

    const { id } = await context.params;
    const body = await request.json();

    const data: {
      optionGroupId?: string;
      name?: string;
      position?: number;
      active?: boolean;
      priceDelta?: number;
    } = {};

    if (
      typeof body.optionGroupId === "string"
    ) {
      data.optionGroupId =
        body.optionGroupId;
    }

    if (typeof body.name === "string") {
      const name = body.name.trim();

      if (!name) {
        return NextResponse.json(
          {
            error: "Nome inválido.",
          },
          {
            status: 400,
          },
        );
      }

      data.name = name;
    }

    if (
      typeof body.position === "number"
    ) {
      data.position = body.position;
    }

    if (
      typeof body.active === "boolean"
    ) {
      data.active = body.active;
    }

    if (
      typeof body.priceDelta === "number"
    ) {
      data.priceDelta =
        body.priceDelta;
    }

    const option =
      await updateOptionForTenant(
        tenantId,
        id,
        data,
        {
          actorUserId: userId,
          ipAddress: getRequestIp(request),
        },
      );

    if (!option) {
      return NextResponse.json(
        {
          error:
            "Opção ou grupo de opções não encontrados.",
        },
        {
          status: 404,
        },
      );
    }

    return NextResponse.json({
      data: option,
    });
  } catch (error) {
    const authResponse =
      authErrorResponse(error);

    if (authResponse) {
      return authResponse;
    }

    console.error(
      "Erro ao atualizar opção:",
      error,
    );

    return NextResponse.json(
      {
        error:
          "Não foi possível atualizar a opção.",
      },
      {
        status: 500,
      },
    );
  }
}

export async function DELETE(
  request: Request,
  context: RouteContext,
) {
  try {
    assertSameOrigin(request);

    const { tenantId, userId } =
      await requireTenantPermission(
        Permissions.CATALOG_WRITE,
      );

    const { id } = await context.params;

    const option =
      await deleteOptionForTenant(
        tenantId,
        id,
        {
          actorUserId: userId,
          ipAddress: getRequestIp(request),
        },
      );

    if (!option) {
      return NextResponse.json(
        {
          error:
            "Opção não encontrada.",
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
      "Erro ao excluir opção:",
      error,
    );

    return NextResponse.json(
      {
        error:
          "Não foi possível excluir a opção.",
      },
      {
        status: 500,
      },
    );
  }
}
