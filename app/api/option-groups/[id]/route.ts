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
  getOptionGroupForTenant,
  updateOptionGroupForTenant,
} from "@/lib/data/option-groups";

import {
  assertSameOrigin,
} from "@/lib/security/same-origin";
import { getRequestIp } from "@/lib/audit/audit";

type RouteContext = {
  params: Promise<{
    id: string;
  }>;
};

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
      SelectionType.SINGLE &&
    (
      maxSelections !== 1 ||
      minSelections > 1
    )
  ) {
    return false;
  }

  if (
    required &&
    minSelections < 1
  ) {
    return false;
  }

  return true;
}

export async function GET(
  _request: Request,
  context: RouteContext,
) {
  try {
    const {
      tenantId,
    } =
      await requireTenantPermission(
        Permissions.CATALOG_READ,
      );

    const {
      id,
    } =
      await context.params;

    const group =
      await getOptionGroupForTenant(
        tenantId,
        id,
      );

    if (!group) {
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

    return NextResponse.json({
      data: group,
    });
  } catch (error) {
    const authResponse =
      authErrorResponse(error);

    if (authResponse) {
      return authResponse;
    }

    console.error(
      "Erro ao consultar grupo de opções:",
      error,
    );

    return NextResponse.json(
      {
        error:
          "Não foi possível consultar o grupo de opções.",
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

    const {
      tenantId,
      userId,
    } =
      await requireTenantPermission(
        Permissions.CATALOG_WRITE,
      );

    const {
      id,
    } =
      await context.params;

    const existing =
      await getOptionGroupForTenant(
        tenantId,
        id,
      );

    if (!existing) {
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

    const body =
      await request.json();

    const name =
      body.name === undefined
        ? existing.name
        : typeof body.name ===
            "string"
          ? body.name.trim()
          : "";

    const slug =
      body.slug === undefined
        ? existing.slug
        : typeof body.slug ===
            "string"
          ? body.slug
              .trim()
              .toLowerCase()
          : "";

    const selectionType =
      body.selectionType === undefined
        ? existing.selectionType
        : body.selectionType ===
            SelectionType.SINGLE
          ? SelectionType.SINGLE
          : body.selectionType ===
              SelectionType.MULTIPLE
            ? SelectionType.MULTIPLE
            : null;

    const required =
      body.required === undefined
        ? existing.required
        : body.required === true;

    const minSelections =
      body.minSelections === undefined
        ? existing.minSelections
        : Number(
            body.minSelections,
          );

    const maxSelections =
      body.maxSelections === undefined
        ? existing.maxSelections
        : Number(
            body.maxSelections,
          );

    const position =
      body.position === undefined
        ? existing.position
        : Number(body.position);

    const active =
      body.active === undefined
        ? existing.active
        : body.active === true;

    if (
      !name ||
      !slug ||
      !selectionType
    ) {
      return NextResponse.json(
        {
          error:
            "Dados do grupo inválidos.",
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
      await updateOptionGroupForTenant(
        tenantId,
        id,
        {
          name,
          slug,
          selectionType,
          minSelections,
          maxSelections,
          required,
          position,
          active,
        },
        {
          actorUserId: userId,
          ipAddress: getRequestIp(request),
        },
      );

    return NextResponse.json({
      data: group,
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
            "Já existe um grupo com este slug.",
        },
        {
          status: 409,
        },
      );
    }

    console.error(
      "Erro ao atualizar grupo de opções:",
      error,
    );

    return NextResponse.json(
      {
        error:
          "Não foi possível atualizar o grupo de opções.",
      },
      {
        status: 500,
      },
    );
  }
}
