import {
  Prisma,
  ProductStatus,
} from "@prisma/client";

import { NextResponse } from "next/server";

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
  getProductForTenant,
  updateProductForTenant,
} from "@/lib/data/products";

import {
  assertSameOrigin,
} from "@/lib/security/same-origin";
import { getRequestIp } from "@/lib/audit/audit";

type RouteContext = {
  params: Promise<{
    id: string;
  }>;
};

function isValidStatus(
  value: unknown,
): value is ProductStatus {
  return (
    value === ProductStatus.ACTIVE ||
    value === ProductStatus.INACTIVE ||
    value === ProductStatus.ARCHIVED
  );
}

function normalizeOptionalText(
  value: unknown,
) {
  if (typeof value !== "string") {
    return null;
  }

  const normalized =
    value.trim();

  return normalized || null;
}

function parseBasePrice(
  value: unknown,
):
  | { valid: true; value: string | null }
  | { valid: false } {
  if (
    value === null ||
    value === ""
  ) {
    return {
      valid: true,
      value: null,
    };
  }

  if (
    typeof value !== "string" &&
    typeof value !== "number"
  ) {
    return {
      valid: false,
    };
  }

  const normalized =
    String(value)
      .trim()
      .replace(",", ".");

  if (
    !/^\d{1,8}(\.\d{1,2})?$/.test(
      normalized,
    )
  ) {
    return {
      valid: false,
    };
  }

  return {
    valid: true,
    value:
      Number(normalized).toFixed(2),
  };
}

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

    const product =
      await getProductForTenant(
        tenantId,
        id,
      );

    if (!product) {
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
      data: product,
    });
  } catch (error) {
    const authResponse =
      authErrorResponse(error);

    if (authResponse) {
      return authResponse;
    }

    console.error(
      "Erro ao consultar produto:",
      error,
    );

    return NextResponse.json(
      {
        error:
          "Não foi possível consultar o produto.",
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

    const { id } =
      await context.params;

    const existing =
      await getProductForTenant(
        tenantId,
        id,
      );

    if (!existing) {
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

    const body =
      await request.json();

    const data: {
      categoryId?: string;
      name?: string;
      slug?: string;
      description?: string | null;
      basePrice?: string | null;
      status?: ProductStatus;
      imageUrl?: string | null;
    } = {};

    if (
      body.name !== undefined
    ) {
      if (
        typeof body.name !==
          "string" ||
        !body.name.trim()
      ) {
        return NextResponse.json(
          {
            error:
              "Nome inválido.",
          },
          {
            status: 400,
          },
        );
      }

      data.name =
        body.name.trim();
    }

    if (
      body.slug !== undefined
    ) {
      if (
        typeof body.slug !==
        "string"
      ) {
        return NextResponse.json(
          {
            error:
              "Slug inválido.",
          },
          {
            status: 400,
          },
        );
      }

      const slug =
        body.slug
          .trim()
          .toLowerCase();

      if (
        !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(
          slug,
        )
      ) {
        return NextResponse.json(
          {
            error:
              "Slug inválido.",
          },
          {
            status: 400,
          },
        );
      }

      data.slug = slug;
    }

    if (
      body.categoryId !==
      undefined
    ) {
      if (
        typeof body.categoryId !==
          "string" ||
        !body.categoryId.trim()
      ) {
        return NextResponse.json(
          {
            error:
              "Categoria inválida.",
          },
          {
            status: 400,
          },
        );
      }

      data.categoryId =
        body.categoryId.trim();
    }

    if (
      body.description !==
      undefined
    ) {
      data.description =
        normalizeOptionalText(
          body.description,
        );
    }

    if (
      body.basePrice !==
      undefined
    ) {
      const price =
        parseBasePrice(
          body.basePrice,
        );

      if (!price.valid) {
        return NextResponse.json(
          {
            error:
              "Preço inválido. Use no máximo duas casas decimais.",
          },
          {
            status: 400,
          },
        );
      }

      data.basePrice =
        price.value;
    }

    if (
      body.status !== undefined
    ) {
      if (
        !isValidStatus(
          body.status,
        )
      ) {
        return NextResponse.json(
          {
            error:
              "Status de produto inválido.",
          },
          {
            status: 400,
          },
        );
      }

      data.status =
        body.status;
    }

    if (
      body.imageUrl !==
      undefined
    ) {
      const imageUrl =
        normalizeOptionalText(
          body.imageUrl,
        );

      if (imageUrl) {
        try {
          new URL(imageUrl);
        } catch {
          return NextResponse.json(
            {
              error:
                "URL da imagem inválida.",
            },
            {
              status: 400,
            },
          );
        }
      }

      data.imageUrl =
        imageUrl;
    }

    const product =
      await updateProductForTenant(
        tenantId,
        id,
        data,
        {
          actorUserId: userId,
          ipAddress: getRequestIp(request),
        },
      );

    if (!product) {
      return NextResponse.json(
        {
          error:
            "Produto ou categoria não disponível para este restaurante.",
        },
        {
          status: 400,
        },
      );
    }

    return NextResponse.json({
      data: product,
    });
  } catch (error) {
    const authResponse =
      authErrorResponse(error);

    if (authResponse) {
      return authResponse;
    }

    if (
      error instanceof
        Prisma.PrismaClientKnownRequestError &&
      error.code === "P2002"
    ) {
      return NextResponse.json(
        {
          error:
            "Já existe um produto com este slug.",
        },
        {
          status: 409,
        },
      );
    }

    console.error(
      "Erro ao atualizar produto:",
      error,
    );

    return NextResponse.json(
      {
        error:
          "Não foi possível atualizar o produto.",
      },
      {
        status: 500,
      },
    );
  }
}
