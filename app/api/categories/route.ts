import { NextResponse } from "next/server";

import {
  createCategoryForTenant,
  listCategoriesForTenant,
} from "@/lib/data/categories";

import { authErrorResponse } from "@/lib/auth/api-error";
import {
  Permissions,
} from "@/lib/auth/rbac";
import {
  requireTenantPermission,
} from "@/lib/tenant/authorized-context";
import { assertSameOrigin } from "@/lib/security/same-origin";

export async function GET() {
  try {
    const { tenantId } =
      await requireTenantPermission(
        Permissions.CATALOG_READ,
      );

    const categories =
      await listCategoriesForTenant(
        tenantId,
      );

    return NextResponse.json({
      data: categories,
    });
  } catch (error) {
    const authResponse =
      authErrorResponse(error);

    if (authResponse) {
      return authResponse;
    }

    console.error(
      "Erro ao listar categorias:",
      error,
    );

    return NextResponse.json(
      {
        error:
          "Não foi possível listar as categorias.",
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

    const { tenantId } =
      await requireTenantPermission(
        Permissions.CATALOG_WRITE,
      );

    const body = await request.json();

    const name =
      typeof body.name === "string"
        ? body.name.trim()
        : "";

    const slug =
      typeof body.slug === "string"
        ? body.slug.trim().toLowerCase()
        : "";

    if (!name || !slug) {
      return NextResponse.json(
        {
          error:
            "Nome e slug são obrigatórios.",
        },
        {
          status: 400,
        },
      );
    }

    const category =
      await createCategoryForTenant(
        tenantId,
        {
          name,
          slug,
          position:
            typeof body.position === "number"
              ? body.position
              : 0,
          active:
            typeof body.active === "boolean"
              ? body.active
              : true,
        },
      );

    return NextResponse.json(
      {
        data: category,
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
      "Erro ao criar categoria:",
      error,
    );

    return NextResponse.json(
      {
        error:
          "Não foi possível criar a categoria.",
      },
      {
        status: 500,
      },
    );
  }
}
