import { NextResponse } from "next/server";

import {
  deleteCategoryForTenant,
  getCategoryForTenant,
  updateCategoryForTenant,
} from "@/lib/data/categories";

import { authErrorResponse } from "@/lib/auth/api-error";
import { Permissions } from "@/lib/auth/rbac";
import { requireTenantPermission } from "@/lib/tenant/authorized-context";
import { assertSameOrigin } from "@/lib/security/same-origin";

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
        Permissions.CATALOG_READ,
      );

    const { id } = await context.params;

    const category =
      await getCategoryForTenant(
        tenantId,
        id,
      );

    if (!category) {
      return NextResponse.json(
        {
          error:
            "Categoria não encontrada.",
        },
        {
          status: 404,
        },
      );
    }

    return NextResponse.json({
      data: category,
    });
  } catch (error) {
    const authResponse =
      authErrorResponse(error);

    if (authResponse) {
      return authResponse;
    }

    console.error(
      "Erro ao consultar categoria:",
      error,
    );

    return NextResponse.json(
      {
        error:
          "Não foi possível consultar a categoria.",
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

    const { tenantId } =
      await requireTenantPermission(
        Permissions.CATALOG_WRITE,
      );

    const { id } = await context.params;
    const body = await request.json();

    const data: {
      name?: string;
      slug?: string;
      position?: number;
      active?: boolean;
    } = {};

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

    if (typeof body.slug === "string") {
      const slug =
        body.slug.trim().toLowerCase();

      if (!slug) {
        return NextResponse.json(
          {
            error: "Slug inválido.",
          },
          {
            status: 400,
          },
        );
      }

      data.slug = slug;
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

    const category =
      await updateCategoryForTenant(
        tenantId,
        id,
        data,
      );

    if (!category) {
      return NextResponse.json(
        {
          error:
            "Categoria não encontrada.",
        },
        {
          status: 404,
        },
      );
    }

    return NextResponse.json({
      data: category,
    });
  } catch (error) {
    const authResponse =
      authErrorResponse(error);

    if (authResponse) {
      return authResponse;
    }

    console.error(
      "Erro ao atualizar categoria:",
      error,
    );

    return NextResponse.json(
      {
        error:
          "Não foi possível atualizar a categoria.",
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

    const { tenantId } =
      await requireTenantPermission(
        Permissions.CATALOG_WRITE,
      );

    const { id } = await context.params;

    const category =
      await deleteCategoryForTenant(
        tenantId,
        id,
      );

    if (!category) {
      return NextResponse.json(
        {
          error:
            "Categoria não encontrada.",
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
      "Erro ao excluir categoria:",
      error,
    );

    return NextResponse.json(
      {
        error:
          "Não foi possível excluir a categoria.",
      },
      {
        status: 500,
      },
    );
  }
}
