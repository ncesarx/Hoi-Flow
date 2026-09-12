import {
  Prisma,
  SelectionType,
} from "@prisma/client";

import {
  NextResponse,
} from "next/server";

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
  createOptionGroupForTenant,
  listOptionGroupsForTenant,
} from "@/lib/data/option-groups";

import {
  assertSameOrigin,
} from "@/lib/security/same-origin";

function validateRules(
  selectionType: SelectionType,
  minSelections: number,
  maxSelections: number,
  required: boolean,
) {
  if (
    !Number.isInteger(minSelections) ||
    !Number.isInteger(maxSelections) ||
    minSelections < 0 ||
    maxSelections < 1 ||
    minSelections > maxSelections
  ) {
    return false;
  }

  if (
    selectionType ===
    SelectionType.SINGLE
  ) {
    if (
      maxSelections !== 1 ||
      minSelections > 1
    ) {
      return false;
    }
  }

  if (
    required &&
    minSelections < 1
  ) {
    return false;
  }

  return true;
}

export async function GET() {
  try {
    const {
      tenantId,
    } =
      await requireTenantPermission(
        Permissions.CATALOG_READ,
      );

    const groups =
      await listOptionGroupsForTenant(
        tenantId,
      );

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
      "Erro ao listar grupos de opções:",
      error,
    );

    return NextResponse.json(
      {
        error:
          "Não foi possível listar os grupos de opções.",
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

    const {
      tenantId,
    } =
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

    const selectionType =
      body.selectionType ===
        SelectionType.MULTIPLE
        ? SelectionType.MULTIPLE
        : body.selectionType ===
            SelectionType.SINGLE
          ? SelectionType.SINGLE
          : null;

    const required =
      body.required === true;

    const minSelections =
      Number(body.minSelections);

    const maxSelections =
      Number(body.maxSelections);

    const position =
      body.position === undefined
        ? 0
        : Number(body.position);

    if (
      !name ||
      !slug ||
      !selectionType
    ) {
      return NextResponse.json(
        {
          error:
            "Nome, slug e tipo de seleção são obrigatórios.",
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

    if (
      !Number.isInteger(position) ||
      position < 0
    ) {
      return NextResponse.json(
        {
          error:
            "Posição inválida.",
        },
        {
          status: 400,
        },
      );
    }

    if (
      !validateRules(
        selectionType,
        minSelections,
        maxSelections,
        required,
      )
    ) {
      return NextResponse.json(
        {
          error:
            "Regras de seleção inválidas.",
        },
        {
          status: 400,
        },
      );
    }

    const group =
      await createOptionGroupForTenant(
        tenantId,
        {
          name,
          slug,
          selectionType,
          minSelections,
          maxSelections,
          required,
          position,

          active:
            typeof body.active ===
            "boolean"
              ? body.active
              : true,
        },
      );

    return NextResponse.json(
      {
        data: group,
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
            "Já existe um grupo com este slug.",
        },
        {
          status: 409,
        },
      );
    }

    console.error(
      "Erro ao criar grupo de opções:",
      error,
    );

    return NextResponse.json(
      {
        error:
          "Não foi possível criar o grupo de opções.",
      },
      {
        status: 500,
      },
    );
  }
}
