import { NextResponse } from "next/server";

import { OrderStatus } from "@prisma/client";

import { getRequestIp } from "@/lib/audit/audit";
import { authErrorResponse } from "@/lib/auth/api-error";
import { Permissions } from "@/lib/auth/rbac";
import {
  getOrderForTenant,
  updateOrderStatusForTenant,
} from "@/lib/data/orders";
import { assertSameOrigin } from "@/lib/security/same-origin";
import { requireTenantPermission } from "@/lib/tenant/authorized-context";

type RouteContext = {
  params: Promise<{ id: string }>;
};

function isOrderStatus(value: unknown): value is OrderStatus {
  return (
    typeof value === "string" &&
    Object.values(OrderStatus).includes(value as OrderStatus)
  );
}

export async function GET(
  _request: Request,
  context: RouteContext,
) {
  try {
    const { tenantId } = await requireTenantPermission(
      Permissions.ORDER_READ,
    );
    const { id } = await context.params;
    const order = await getOrderForTenant(tenantId, id);

    return order
      ? NextResponse.json({ data: order })
      : NextResponse.json(
          { error: "Pedido não encontrado." },
          { status: 404 },
        );
  } catch (error) {
    const authResponse = authErrorResponse(error);
    if (authResponse) return authResponse;

    const errorId = crypto.randomUUID();
    console.error("Erro ao consultar pedido", { errorId, error });
    return NextResponse.json(
      { error: "Não foi possível consultar o pedido.", errorId },
      { status: 500 },
    );
  }
}

export async function PATCH(
  request: Request,
  context: RouteContext,
) {
  try {
    assertSameOrigin(request);
    const { tenantId, userId } = await requireTenantPermission(
      Permissions.ORDER_WRITE,
    );
    const { id } = await context.params;
    const body = await request.json();
    if (!isOrderStatus(body.status)) {
      return NextResponse.json(
        { error: "Status de pedido inválido." },
        { status: 400 },
      );
    }

    const order = await updateOrderStatusForTenant(
      tenantId,
      id,
      body.status,
      {
        actorUserId: userId,
        ipAddress: getRequestIp(request),
      },
    );

    return order
      ? NextResponse.json({ data: order })
      : NextResponse.json(
          { error: "Pedido não encontrado ou transição não permitida." },
          { status: 409 },
        );
  } catch (error) {
    const authResponse = authErrorResponse(error);
    if (authResponse) return authResponse;

    const errorId = crypto.randomUUID();
    console.error("Erro ao atualizar pedido", { errorId, error });
    return NextResponse.json(
      { error: "Não foi possível atualizar o pedido.", errorId },
      { status: 500 },
    );
  }
}
