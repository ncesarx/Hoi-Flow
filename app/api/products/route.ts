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
  createProductForTenant,
  listProductsForTenant,
} from "@/lib/data/products";

import {
  assertSameOrigin,
} from "@/lib/security/same-origin";

function isValidStatus(
  value: unknown,
): value is ProductStatus {
  return (
    value === ProductStatus.ACTIVE ||
    value === ProductStatus.INACTIVE ||
    value === ProductStatus.ARCHIVED
  );
}

function parseBasePrice(
  value: unknown,
):
  | { valid: true; value: string | null }
  | { valid: false } {
  if (
    value === null ||
    value === undefined ||
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

function normalizeOptionalText(
  value: unknown,
) {
  if (typeof value !== "string") {
    return null;
  }

  const normalized = value.trim();

  return normalized || null;
}

export async function GET() {
  try {
    const { tenantId } =
      await requireTenantPermission(
        Permissions.CATALOG_READ,
      );

    const products =
      await listProductsForTenant(
        tenantId,
      );

    return NextResponse.json({
      data: products,
    });
  } catch (error) {
    const authResponse =
      authErrorResponse(error);

    if (authResponse) {
      return authResponse;
    }

    console.error(
      "Erro ao listar produtos:",
      error,
    );

    return NextResponse.json(
      {
        error:
          "Não foi possível listar os produtos.",
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

    const body =
      await request.json();

    const name =
      typeof body.name === "string"
        ? body.name.trim()
        : "";

    const slug =
      typeof body.slug === "string"
        ? body.slug
            .trim()
            .toLowerCase()
        : "";

    const categoryId =
      typeof body.categoryId ===
        "string"
        ? body.categoryId.trim()
        : "";

    if (
      !name ||
      !slug ||
      !categoryId
    ) {
      return NextResponse.json(
        {
          error:
            "Nome, slug e categoria são obrigatórios.",
        },
        {
          status: 400,
        },
      );
    }

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

    const status =
      body.status === undefined
        ? ProductStatus.ACTIVE
        : body.status;

    if (!isValidStatus(status)) {
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

    const product =
      await createProductForTenant(
        tenantId,
        {
          categoryId,
          name,
          slug,
          description:
            normalizeOptionalText(
              body.description,
            ),
          basePrice:
            price.value,
          status,
          imageUrl,
        },
      );

    if (!product) {
      return NextResponse.json(
        {
          error:
            "Categoria não encontrada para este restaurante.",
        },
        {
          status: 400,
        },
      );
    }

    return NextResponse.json(
      {
        data: product,
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
      "Erro ao criar produto:",
      error,
    );

    return NextResponse.json(
      {
        error:
          "Não foi possível criar o produto.",
      },
      {
        status: 500,
      },
    );
  }
}
